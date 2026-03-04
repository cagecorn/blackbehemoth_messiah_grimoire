import DBManager from '../Database/DBManager.js';
import ChatChannel from './ChatChannel.js';
import EventBus from '../Events/EventBus.js';
import intentRouter from '../AI/IntentRouter.js';
import localLLM from '../AI/LocalLLM.js';
import embeddingGemma from '../AI/EmbeddingGemma.js';
import { MercenaryClasses, Characters } from '../Core/EntityStats.js';
// partyManager will be accessed via this.scene.game.partyManager
import ItemManager from '../Core/ItemManager.js';
import CharmManager from '../Core/CharmManager.js';

export default class UIManager {
    constructor() {
        this.materialList = document.getElementById('material-list');
        this.gearList = document.getElementById('gear-list');
        this.chatContainer = document.getElementById('chat-container');
        this.channels = []; // Fixed array of 5 channels
        this.unitToChannel = {}; // unitId -> ChatChannel instance
        this.resizeObserver = null;
        this.inventoryDirty = true; // initially dirty to load first time
        this.isRefreshing = false;
        this.detailChannel = null; // Track currently focused detail channel
        this.portraits = {}; // unitId -> { element, statusKey, hp, ult }
        this.lastGold = -1;
        this.lastGem = -1;

        // Dirty Flags for Performance (Replacing Polling)
        this.hudDirty = true;
        this.portraitsDirty = true;

        // Mobile HUD Elements
        this.hudGold = document.getElementById('hud-gold');
        this.hudGem = document.getElementById('hud-gem');
        this.portraitBar = document.getElementById('portrait-bar');


        // --- Popup / Overlay Management ---
        this.popupOverlay = document.getElementById('popup-overlay');
        this.popupInner = document.getElementById('popup-inner');

        // Confirm Modal Elements
        this.confirmOverlay = document.getElementById('confirm-overlay');
        this.confirmMessage = document.getElementById('confirm-message');
        this.btnConfirmYes = document.getElementById('btn-confirm-yes');
        this.btnConfirmNo = document.getElementById('btn-confirm-no');
        this.confirmCallback = null;
        this.popupClose = document.getElementById('popup-close');
        this.btnInventory = document.getElementById('btn-inventory');
        this.btnParty = document.getElementById('btn-party');
        this.btnFullscreen = document.getElementById('btn-fullscreen');
        this.btnSettings = document.getElementById('btn-settings');
        this.btnExit = document.getElementById('btn-exit');

        // Item Detail Panel
        this.detailPanel = document.getElementById('item-detail-panel');
        this.detailName = document.getElementById('detail-name');
        this.detailType = document.getElementById('detail-type');
        this.detailDesc = document.getElementById('detail-description');
        this.btnEquipItem = document.getElementById('btn-equip-item');
        this.selectedItemId = null;
        this.pendingGrimoireSlot = null;
        this.pendingGearSlot = null; // Track gear slot clicked in ChatChannel
        this.emojiFilter = 'ALL'; // Filter for Emoji Inventory

        // Bind the RAF loop
        this.rafLoop = this.rafLoop.bind(this);
    }

    init() {
        console.log('[UIManager] Initialized DOM Overlay');

        this.createTooltip();
        this.setupChatChannels();
        this.setupMobileEvents();
        this.setupSettingsEvents();
        this.setupNavigationEvents();
        this.injectTestItems();

        // Listen for combat and loot events
        EventBus.on(EventBus.EVENTS.MONSTER_KILLED, this.handleMonsterKilled, this);
        EventBus.on(EventBus.EVENTS.ITEM_COLLECTED, this.handleItemCollected, this);
        EventBus.on(EventBus.EVENTS.INVENTORY_UPDATED, () => {
            this.inventoryDirty = true;
        });
        EventBus.on(EventBus.EVENTS.STATUS_UPDATED, (payload) => {
            // Signal portraits update
            this.portraitsDirty = true;

            const channel = this.unitToChannel[payload.agentId];
            if (channel) {
                if (payload.statuses) {
                    channel.updateStatuses(payload.statuses);
                }
                if (payload.equipment) {
                    channel.updateEquipment(payload.equipment, payload.grimoire);
                }
                if (payload.stats) {
                    channel.updateStats(payload.stats);
                    // Handle narrative and ult gauge if they are in stats
                    if (payload.stats.level !== undefined) {
                        channel.lastLevel = payload.stats.level;
                        const charConfig = Object.values(Characters).find(c => c && c.id === channel.characterId);
                        if (charConfig && charConfig.narrativeUnlocks) {
                            channel.updateNarrative(charConfig.narrativeUnlocks, payload.stats.level);
                        }
                    }
                    if (payload.stats.ultGauge !== undefined) {
                        channel.updateUltGauge(payload.stats.ultGauge);
                    }
                }
            }
        });

        EventBus.on(EventBus.EVENTS.PARTY_DEPLOYED, (payload) => {
            if (payload.scene) {
                this.scene = payload.scene; // Store scene reference
            }

            const sceneKey = this.scene?.scene?.key || this.scene?.sys?.settings?.key;
            console.log(`[UIManager] Party deployed in scene: ${sceneKey}`);

            // Sync navigation bar highlight
            if (this.updateActiveNav) this.updateActiveNav();

            // Manage portrait bar visibility without overriding display: grid 
            if (this.portraitBar) {
                if (sceneKey === 'TerritoryScene' || sceneKey === 'GachaScene') {
                    this.portraitBar.classList.add('hidden');
                    this.portraitBar.classList.remove('active');
                    if (this.btnExit) this.btnExit.style.display = 'none';
                } else {
                    this.portraitBar.classList.remove('hidden');
                    this.portraitBar.classList.add('active');
                    if (this.btnExit) this.btnExit.style.display = 'block';
                }
            }

            // payload: { mercenaries: [{ id, name, sprite, classId, ... }] }
            this.unitToChannel = {}; // Reset mapping

            const visibleMercs = payload.mercenaries.filter(m => !m.hideInUI);

            visibleMercs.forEach((merc, i) => {
                if (i < this.channels.length) {
                    const channel = this.channels[i];
                    // Link unit to channel EARLY so we can update it
                    this.unitToChannel[merc.id] = channel;

                    const charConfig = Object.values(Characters).find(c => c.id === merc.characterId) || merc;

                    // Store classId on the channel for dropdown population and swaps
                    channel.classId = merc.classId || charConfig.classId;

                    channel.bindUnit(
                        merc.id,
                        merc.unitName || merc.name,
                        `assets/characters/party/${charConfig.sprite}.png`,
                        {
                            name: charConfig.skillName,
                            emoji: charConfig.skillEmoji,
                            description: charConfig.skillDescription,
                            passiveName: charConfig.passiveName,
                            passiveEmoji: charConfig.passiveEmoji,
                            passiveDescription: charConfig.passiveDescription,
                            ultimateName: charConfig.ultimateName,
                            ultimateDescription: charConfig.ultimateDescription
                        },
                        charConfig.narrativeUnlocks,
                        merc.characterId
                    );

                    this.unitToChannel[merc.id] = channel;
                }
            });

            this.portraitsDirty = true;
        });
        EventBus.on(EventBus.EVENTS.DEBUG_SWAP_CHARACTER, (payload) => {
            const { classId, characterId, unitId } = payload;
            const charConfig = Characters[characterId.toUpperCase()];
            if (!charConfig) return;

            const channel = unitId ? this.unitToChannel[unitId] : this.channels.find(c => c.classId === classId);
            if (!channel) return;

            channel.updateVisuals(
                charConfig.name,
                `assets/characters/party/${charConfig.sprite}.png`,
                characterId
            );

            channel.updateSkill({
                name: charConfig.skillName,
                emoji: charConfig.skillEmoji,
                description: charConfig.skillDescription,
                passiveName: charConfig.passiveName,
                passiveEmoji: charConfig.passiveEmoji,
                passiveDescription: charConfig.passiveDescription,
                ultimateName: charConfig.ultimateName,
                ultimateDescription: charConfig.ultimateDescription
            });

            if (charConfig.narrativeUnlocks) {
                channel.updateNarrative(charConfig.narrativeUnlocks, 1);
            }
        });

        EventBus.on(EventBus.EVENTS.UNIT_BARK, (payload) => {
            const { agentId, text, unitName } = payload;
            const channel = this.unitToChannel[agentId];
            if (channel) {
                channel.addLog(`[${unitName}] ${text}`, '#00ffcc');
            }
        });

        // Start render loop
        requestAnimationFrame(this.rafLoop);

        // Listen for Drag & Drop UI Assignment
        EventBus.on('UI_SLOT_ASSIGNED', (payload) => {
            this.handleSlotAssigned(payload.slotId, payload.characterId);
        });

        // Listen for UI_REFRESH_INVENTORY
        EventBus.on('UI_REFRESH_INVENTORY', () => {
            this.inventoryDirty = true;
        });

        // Initial HUD sync
        this.updateMobileHUD();
        this.updatePortraitBar();

        // Also update currency immediately on inventory changes
        EventBus.on(EventBus.EVENTS.INVENTORY_UPDATED, () => {
            this.hudDirty = true;
        });
    }

    showConfirm(message, onConfirm, onCancel = null) {
        if (!this.confirmOverlay || !this.confirmMessage) return;

        this.confirmMessage.innerText = message;
        this.confirmOverlay.style.display = 'flex';

        this.btnConfirmYes.onclick = () => {
            this.confirmOverlay.style.display = 'none';
            if (onConfirm) onConfirm();
        };

        this.btnConfirmNo.onclick = () => {
            this.confirmOverlay.style.display = 'none';
            if (onCancel) onCancel();
            if (this.updateActiveNav) this.updateActiveNav();
        };
    }

    /**
     * Shows a brief floating message at the top of the screen.
     * Useful for warnings or quick feedback.
     */
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'ui-toast';
        toast.innerText = message;
        toast.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.85);
            color: #fff;
            padding: 12px 24px;
            border-radius: 30px;
            font-family: 'Press Start 2P', cursive;
            font-size: 10px;
            border: 2px solid #fbbf24;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            z-index: 10000;
            pointer-events: none;
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;

        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.top = '25%';
        });

        // Auto remove
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.top = '20%';
            setTimeout(() => toast.remove(), 300);
        }, 2200);
    }

    setupMobileEvents() {
        const combatScenes = ['DungeonScene', 'ArenaScene', 'RaidScene'];
        const getActiveKey = () => (this.scene?.scene?.key || this.scene?.sys?.settings?.key || "");

        if (this.btnInventory) {
            this.btnInventory.onclick = () => {
                this.showPopup('inventory');
                this.switchInventoryTab('materials');
            };
        }
        if (this.btnParty) {
            this.btnParty.onclick = () => {
                const currentKey = getActiveKey();
                if (combatScenes.includes(currentKey)) {
                    this.showConfirm("전투가 진행 중입니다. 정말로 나가시겠습니까?", () => {
                        this.safeSceneStart('TerritoryScene');
                        this.showPopup('party');
                    });
                    return;
                }
                this.showPopup('party');
            };
        }
        if (this.popupClose) {
            this.popupClose.onclick = () => this.hidePopup();
        }
        if (this.popupOverlay) {
            this.popupOverlay.onclick = (e) => {
                if (e.target === this.popupOverlay) this.hidePopup();
            };
        }
        if (this.btnFullscreen) {
            this.btnFullscreen.onclick = () => this.toggleFullscreen();
        }
        if (this.btnExit) {
            this.btnExit.onclick = () => {
                const currentKey = getActiveKey();
                if (combatScenes.includes(currentKey)) {
                    this.showConfirm("전투를 포기하고 나가시겠습니까?", () => {
                        this.safeSceneStart('TerritoryScene');
                    });
                    return;
                }
                this.safeSceneStart('TerritoryScene');
            };
        }

        if (this.btnEquipItem) {
            this.btnEquipItem.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[UIManager] EQUIP BUTTON CLICKED!', {
                    selectedId: this.selectedItemId,
                    detailChannel: this.detailChannel ? this.detailChannel.name : 'null',
                    activeChannels: this.channels.filter(c => c.active).length
                });

                if (this.selectedItemId) {
                    this.btnEquipItem.style.opacity = '0.5';
                    this.btnEquipItem.innerText = '장착 중...';

                    this.executeEquip(this.selectedItemId);

                    setTimeout(() => {
                        if (this.detailPanel) this.detailPanel.style.display = 'none';
                        this.btnEquipItem.style.opacity = '1';
                        this.btnEquipItem.innerText = '장착';
                        this.selectedItemId = null;
                    }, 200);
                }
            };
        }

        if (this.detailPanel) {
            this.detailPanel.onclick = (e) => {
                e.stopPropagation();
            };
        }

        // Inventory Tab Listeners
        const tabMaterials = document.getElementById('tab-materials');
        const tabGear = document.getElementById('tab-gear');
        if (tabMaterials) tabMaterials.onclick = () => this.switchInventoryTab('materials');
        if (tabGear) tabGear.onclick = () => this.switchInventoryTab('gear');

        // Emoji Filter Listeners
        const filterButtons = document.querySelectorAll('.emoji-filter-bar .filter-btn');
        filterButtons.forEach(btn => {
            btn.onclick = () => {
                const filter = btn.dataset.filter;
                this.setEmojiFilter(filter);
            };
        });
    }

    setupNavigationEvents() {
        const navButtons = document.querySelectorAll('#hud-scene-nav .nav-btn');
        const combatScenes = ['DungeonScene', 'ArenaScene', 'RaidScene'];
        const getActiveKey = () => (this.scene?.scene?.key || this.scene?.sys?.settings?.key || "");

        navButtons.forEach(btn => {
            btn.onclick = () => {
                const sceneKey = btn.dataset.scene;
                const popupKey = btn.dataset.popup;
                const currentKey = getActiveKey();

                const combatScenes = ['DungeonScene', 'ArenaScene', 'RaidScene'];
                const isCombatTarget = combatScenes.includes(sceneKey);

                // PARTY VALIDATION: Must have 6 members to enter combat
                if (isCombatTarget) {
                    const partyManager = this.scene?.game?.partyManager;
                    if (partyManager && !partyManager.isPartyFull()) {
                        this.showToast("6명의 용병을 편성해주세요");
                        this.showPartyFormation();
                        return;
                    }
                }

                // 2. Confirmation if in combat
                if (combatScenes.includes(currentKey)) {
                    this.showConfirm("전투가 진행 중입니다. 정말로 나가시겠습니까?", () => {
                        // Success Callback
                        navButtons.forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');

                        if (sceneKey) {
                            this.safeSceneStart(sceneKey);
                        } else if (popupKey) {
                            this.safeSceneStart('TerritoryScene');
                            this.showPopup(popupKey);
                        }
                    });
                    return;
                }

                // 3. Update UI highlights
                navButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                if (sceneKey) {
                    console.log(`[UIManager] Navigating to Scene: ${sceneKey}`);
                    this.safeSceneStart(sceneKey);
                } else if (popupKey) {
                    console.log(`[UIManager] Opening Nav Popup: ${popupKey}`);
                    // IF we are leaving combat for a popup (like Party), stop the combat first
                    if (combatScenes.includes(currentKey)) {
                        this.safeSceneStart('TerritoryScene');
                    }
                    this.showPopup(popupKey);
                }
            };
        });

        // Highlight active scene function
        this.updateActiveNav = () => {
            if (!this.scene || !this.scene.scene) return;
            const currentSceneKey = this.scene.scene.key;
            navButtons.forEach(btn => {
                if (btn.dataset.scene === currentSceneKey) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        };
    }

    setEmojiFilter(filter) {
        this.emojiFilter = filter;

        // Update button UI
        const filterButtons = document.querySelectorAll('.emoji-filter-bar .filter-btn');
        filterButtons.forEach(btn => {
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        this.inventoryDirty = true;
    }

    switchInventoryTab(tab, filter = null) {
        if (tab === 'materials' && filter) {
            this.setEmojiFilter(filter);
        } else if (tab === 'materials' && !filter) {
            this.setEmojiFilter('ALL');
        }

        const sectionMaterials = document.getElementById('section-materials');
        const sectionGear = document.getElementById('section-gear');
        const tabMaterials = document.getElementById('tab-materials');
        const tabGear = document.getElementById('tab-gear');

        if (tab === 'materials') {
            if (sectionMaterials) sectionMaterials.style.display = 'flex';
            if (sectionGear) sectionGear.style.display = 'none';
            if (tabMaterials) tabMaterials.classList.add('active');
            if (tabGear) tabGear.classList.remove('active');
        } else {
            if (sectionMaterials) sectionMaterials.style.display = 'none';
            if (sectionGear) sectionGear.style.display = 'flex';
            if (tabMaterials) tabMaterials.classList.remove('active');
            if (tabGear) tabGear.classList.add('active');
        }

        // Keep the detail panel visible unless manually closed
        // if (this.detailPanel) this.detailPanel.style.display = 'none';
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.warn(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    showPopup(type) {
        if (!this.popupOverlay || !this.popupInner) return;
        this.clearPopupSafe();

        if (type === 'inventory') {
            const invContent = document.getElementById('sidebar-right');
            if (invContent) {
                this.popupInner.appendChild(invContent);
                invContent.style.setProperty('display', 'flex', 'important');
                invContent.style.height = '100%';
                invContent.style.background = 'transparent';
                invContent.style.border = 'none';
                invContent.style.boxShadow = 'none';
            }
            this.popupOverlay.style.display = 'flex';
        } else if (type === 'party') {
            // "Party" now triggers the Mercenary Formation UI (previously in TerritoryScene)
            this.showPartyFormation();
            return; // showPartyFormation handles its own overlay or reuse popup-overlay
        }

        this.popupOverlay.style.display = 'flex';
    }

    /**
     * Safer scene transition that stops all active scenes to prevent overlapping.
     */
    safeSceneStart(sceneKey) {
        if (!this.scene) return;

        console.log(`[UIManager] Safe start scene: ${sceneKey}`);

        // Robust game/sceneManager access
        const game = this.scene.game || (this.scene.scene && this.scene.scene.game);
        if (!game || !game.scene) {
            console.warn(`[UIManager] Game or SceneManager not found. Direct start.`);
            if (this.scene.scene) this.scene.scene.start(sceneKey);
            else if (this.scene.start) this.scene.start(sceneKey);
            return;
        }

        // Stop all scenes effectively
        const activeScenes = game.scene.getScenes(true);
        activeScenes.forEach(s => {
            const key = s.scene?.key || s.sys?.settings?.key;
            if (key && key !== sceneKey) {
                console.log(`[UIManager] Stopping active scene: ${key}`);
                game.scene.stop(key);
            }
        });

        // Start the target scene
        game.scene.start(sceneKey);

        // Ensure any popups are hidden
        this.hidePopup();

        // Sync nav bar
        if (this.updateActiveNav) setTimeout(() => this.updateActiveNav(), 100);
    }

    /**
     * Global Party Formation UI (extracted and improved from TerritoryScene.js)
     */
    async showPartyFormation() {
        if (this.partyFormationOverlay || !this.scene) return;

        const game = this.scene.game || (this.scene.scene && this.scene.scene.game);
        const partyManager = game?.partyManager;
        if (!partyManager) {
            console.error('[UIManager] PartyManager not found.');
            return;
        }

        // Restore/Heal all members on opening
        if (partyManager) partyManager.healAll();
        // Reload roster to reflect any new gacha pulls
        await partyManager.reloadRoster();

        const overlay = document.createElement('div');
        overlay.id = 'party-formation-overlay';
        overlay.className = 'party-selection-overlay';
        this.partyFormationOverlay = overlay;

        let candidatesHtml = '';
        Object.values(Characters).forEach(char => {
            const star = partyManager.getHighestStar(char.id);
            if (star === 0) return; // Not owned

            const starHtml = `<div style="position:absolute; top:4px; right:4px; font-size:12px; font-weight:bold; color:#fbbf24; text-shadow:0 1px 2px #000;">★${star}</div>`;
            candidatesHtml += `
                <div class="mercenary-card" draggable="true" data-id="${char.id}" style="position:relative;">
                    ${starHtml}
                    <img src="assets/characters/party/${char.sprite}.png" alt="${char.name}">
                    <div class="merc-name">${char.name.split(' (')[0]}</div>
                </div>
            `;
        });

        overlay.innerHTML = `
            <div class="party-selection-title">원정대 편성 (슬롯에 드래그하거나 클릭하여 배치)</div>
            
            <div class="party-slots">
                <div class="party-slot" data-slot="0">1</div>
                <div class="party-slot" data-slot="1">2</div>
                <div class="party-slot" data-slot="2">3</div>
                <div class="party-slot" data-slot="3">4</div>
                <div class="party-slot" data-slot="4">5</div>
                <div class="party-slot" data-slot="5">6</div>
            </div>

            <div class="mercenary-candidates">
                ${candidatesHtml}
            </div>
            
            <div style="display: flex; gap: 10px; width: 100%; justify-content: center; margin-top: 10px;">
                <button class="party-confirm-btn" style="flex: 1;">편성 완료</button>
                <button class="party-cancel-btn" style="flex: 0.4; background: rgba(100, 100, 100, 0.6);">취소</button>
            </div>
        `;

        document.body.appendChild(overlay);

        const currentSlots = [...partyManager.getActiveParty()];
        const slotEls = overlay.querySelectorAll('.party-slot');
        const cards = overlay.querySelectorAll('.mercenary-card');

        const updateSlotUI = (index) => {
            const charId = currentSlots[index];
            const slotEl = slotEls[index];
            if (charId) {
                const char = Object.values(Characters).find(c => c.id.toLowerCase() === charId.toLowerCase());
                if (!char) {
                    slotEl.innerHTML = `${index + 1}`;
                    return;
                }
                const star = partyManager.getHighestStar(charId);
                const starHtml = star > 0 ? `<div style="position:absolute; bottom:2px; right:4px; font-size:14px; font-weight:bold; color:#fbbf24; text-shadow:0 1px 2px #000; z-index:10;">★${star}</div>` : '';
                slotEl.style.position = 'relative';
                slotEl.innerHTML = `
                    ${starHtml}
                    <img src="assets/characters/party/${char.sprite}.png" alt="${char.name}">
                `;
                slotEl.classList.add('filled');
            } else {
                slotEl.innerHTML = `${index + 1}`;
                slotEl.classList.remove('filled');
            }
        };

        currentSlots.forEach((_, i) => updateSlotUI(i));

        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => e.dataTransfer.setData('characterId', card.dataset.id));
            card.onclick = () => {
                const charId = card.dataset.id;
                if (currentSlots.includes(charId)) return;
                let emptyIndex = currentSlots.indexOf(null);
                if (emptyIndex !== -1) {
                    currentSlots[emptyIndex] = charId;
                    updateSlotUI(emptyIndex);
                }
            };
        });

        slotEls.forEach((slot, i) => {
            slot.addEventListener('dragover', (e) => e.preventDefault());
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                const charId = e.dataTransfer.getData('characterId');
                if (charId) {
                    const existingIndex = currentSlots.indexOf(charId);
                    if (existingIndex !== -1 && existingIndex !== i) {
                        currentSlots[existingIndex] = null;
                        updateSlotUI(existingIndex);
                    }
                    currentSlots[i] = charId;
                    updateSlotUI(i);
                }
            });
            slot.onclick = () => {
                currentSlots[i] = null;
                updateSlotUI(i);
            };
        });

        const confirmBtn = overlay.querySelector('.party-confirm-btn');
        confirmBtn.onclick = () => {
            currentSlots.forEach((id, i) => partyManager.setPartySlot(i, id));

            // Sync with Mobile HUD
            EventBus.emit(EventBus.EVENTS.PARTY_DEPLOYED, {
                scene: this.scene,
                mercenaries: currentSlots
                    .filter(id => id !== null)
                    .map(id => {
                        const char = Object.values(Characters).find(c => c.id === id);
                        return { id: `init-${id}`, characterId: id, unitName: char.name, sprite: char.sprite, hp: 100, maxHp: 100 };
                    })
            });

            overlay.remove();
            this.partyFormationOverlay = null;
        };

        const cancelBtn = overlay.querySelector('.party-cancel-btn');
        cancelBtn.onclick = () => {
            overlay.remove();
            this.partyFormationOverlay = null;
        };
    }

    hidePopup() {
        if (this.partyFormationOverlay) {
            this.partyFormationOverlay.remove();
            this.partyFormationOverlay = null;
        }

        if (this.popupOverlay) {
            this.detailChannel = null;
            if (this.detailPanel) this.detailPanel.style.display = 'none';
            this.clearPopupSafe();
            this.hideTooltip(); // Hide any floating item tooltips
            this.popupOverlay.style.display = 'none';
        }
    }

    clearPopupSafe() {
        if (!this.popupInner) return;
        // Move permanent UI elements back to app-container instead of destroying them
        while (this.popupInner.firstChild) {
            const child = this.popupInner.firstChild;
            if (child.id === 'sidebar-right' || child.id === 'chat-container') {
                child.style.setProperty('display', 'none', 'important');
                const appContainer = document.getElementById('app-container');
                if (appContainer) appContainer.appendChild(child);
            } else if (child.classList && (child.classList.contains('chat-channel') || child.classList.contains('has-unit'))) {
                // Individual channel view (showCharacterDetail)
                child.style.removeProperty('display');
                child.style.removeProperty('height');

                const chatContainer = document.getElementById('chat-container');
                if (chatContainer) chatContainer.appendChild(child);
            } else {
                this.popupInner.removeChild(child);
            }
        }
        this.popupInner.innerHTML = '';
    }

    updateMobileHUD() {
        // Update Gold/Gem from DBManager or similar
        if (this.hudGold) {
            DBManager.getInventoryItem('emoji_coin').then(item => {
                const amount = item ? item.amount : 0;
                if (this.lastGold !== amount) {
                    this.hudGold.textContent = amount;
                    this.lastGold = amount;
                }
            });
        }
        if (this.hudGem) {
            DBManager.getInventoryItem('emoji_gem').then(item => {
                const amount = item ? item.amount : 0;
                if (this.lastGem !== amount) {
                    this.hudGem.textContent = amount;
                    this.lastGem = amount;
                }
            });
        }
    }

    updatePortraitBar() {
        if (!this.portraitBar) return;

        let activeMercs = [];
        try {
            if (this.scene && this.scene.mercenaries && typeof this.scene.mercenaries.getChildren === 'function') {
                activeMercs = this.scene.mercenaries.getChildren().filter(m => m && !m.hideInUI);
            }
        } catch (e) {
            console.warn('[UIManager] Error getting active mercenaries:', e);
        }

        const sceneKey = this.scene?.scene?.key || this.scene?.sys?.settings?.key;
        const partyManager = this.scene?.game?.partyManager;

        // Clean up portraits for units no longer in the conceptual party 
        if (partyManager) {
            const currentParty = partyManager.getActiveParty();
            Object.keys(this.portraits).forEach(id => {
                const p = this.portraits[id];
                // If it's a temporary preview or part of active party, keep it. Otherwise remove.
                // We use characterId for party members, or internal ID for others.
                const key = p.characterId || id;
                if (!id.startsWith('preview-') && !currentParty.includes(p.characterId)) {
                    p.element.remove();
                    delete this.portraits[id];
                }
            });
        } else {
            const activeIds = activeMercs.map(m => m.id);
            const activeCharIds = activeMercs.map(m => m.characterId).filter(Boolean);
            Object.keys(this.portraits).forEach(id => {
                const p = this.portraits[id];
                if (!activeIds.includes(id) && !activeCharIds.includes(p.characterId)) {
                    this.portraits[id].element.remove();
                    delete this.portraits[id];
                }
            });
        }

        // We will now iterate by Party Slots if in DungeonScene, otherwise by activeMercs
        let displayList = activeMercs;
        if (sceneKey === 'DungeonScene' && partyManager) {
            displayList = partyManager.getActiveParty()
                .filter(charId => charId !== null)
                .map(charId => {
                    // Find if unit exists in scene
                    const unit = activeMercs.find(m => m.characterId === charId);
                    if (unit) return unit;

                    // If not found, create a "ghost" mock object for the UI
                    const state = partyManager.getState(charId);
                    const charConfig = Characters[charId.toUpperCase()];
                    return {
                        id: `dead-${charId}`,
                        characterId: charId,
                        unitName: charConfig?.name || charId,
                        hp: 0,
                        maxHp: state?.maxHp || 100,
                        ultGauge: 0,
                        maxUltGauge: 100,
                        className: charConfig?.classId || 'warrior',
                        getStatuses: () => [],
                        isGhost: true // flag to identify this is a dead placeholder
                    };
                });
        }

        displayList.forEach((merc, index) => {
            if (!merc) return;

            const portraitKey = merc.characterId || merc.id;
            let cache = this.portraits[portraitKey];

            if (!cache) {
                // ── 초상화 생성 ──────────────────────────────────────────────
                let charConfig = merc;
                try {
                    if (Characters && typeof Characters === 'object') {
                        charConfig = Object.values(Characters).find(c => c && c.id === merc.characterId) || merc;
                    }
                } catch (e) {
                    console.warn('[UIManager] Error finding character config:', e);
                }

                // Add star level UI
                let starHtml = '';
                if (merc.active && merc.characterId) {
                    const starLevel = this.scene.game.partyManager.getHighestStar(merc.characterId);
                    starHtml = starLevel > 0 ? `<span style="color:#fbbf24; font-size:10px; margin-left:4px; text-shadow:0 1px 2px #000;">★${starLevel}</span>` : '';
                }

                const HP_SEGMENTS = 10;
                let segmentsHtml = '';
                for (let i = 0; i < HP_SEGMENTS; i++) {
                    segmentsHtml += `<div class="portrait-hp-segment" data-seg="${i}"></div>`;
                }

                const portrait = document.createElement('div');
                portrait.className = 'unit-portrait';
                if (charConfig.rarity === 'BLACK_BEHEMOTH') {
                    portrait.classList.add('behemoth-portrait');
                }
                portrait.innerHTML = `
                    <div class="portrait-img-box">
                        <img src="assets/characters/party/${charConfig.sprite}.png" alt="${merc.unitName}">
                    </div>
                    <div class="portrait-info">
                        <div class="portrait-name-chip">${merc.unitName || merc.name || '???'}${starHtml}</div>
                        <div class="portrait-hp-bar">${segmentsHtml}</div>
                        <div class="portrait-ult-bar"><div class="portrait-ult-fill"></div></div>
                        <div class="portrait-ult-label">ULT 0%</div>
                        <div class="portrait-status-row"></div>
                    </div>
                `;

                portrait.onclick = () => {
                    const channel = this.unitToChannel[merc.id];
                    if (channel) this.showCharacterDetail(channel);
                };

                this.portraitBar.appendChild(portrait);
                cache = this.portraits[portraitKey] = {
                    element: portrait,
                    statusKey: '',
                    hp: -1,
                    ult: -1,
                    lastHpCount: -1,
                    lastHpClass: '',
                    isDead: null,
                    characterId: merc.characterId, // Store characterId in cache
                    dom: {
                        segments: portrait.querySelectorAll('.portrait-hp-segment'),
                        ultFill: portrait.querySelector('.portrait-ult-fill'),
                        ultLabel: portrait.querySelector('.portrait-ult-label'),
                        statusRow: portrait.querySelector('.portrait-status-row'),
                    }
                };
                console.log(`[UIManager] Portrait created (retro-arcade): ${merc.unitName} key=${portraitKey}`);
            }

            const hpPercent = (merc.hp / merc.maxHp) * 100;
            const ultPercent = (merc.ultGauge / merc.maxUltGauge) * 100;
            const statuses = (typeof merc.getStatuses === 'function') ? merc.getStatuses() : [];
            const statusKey = statuses.map(s => s.emoji).join(',');

            const { element, dom } = cache;
            const isDead = merc.hp <= 0;

            // ── 1. 사망/생존 처리 ──────────────────────────────────────────
            if (cache.isDead !== isDead) {
                cache.isDead = isDead;
                const existingOverlay = element.querySelector('.portrait-dead-overlay');
                if (existingOverlay) existingOverlay.remove();

                if (isDead) {
                    const overlay = document.createElement('div');
                    overlay.className = 'portrait-dead-overlay';

                    const deadLabel = document.createElement('span');
                    deadLabel.className = 'portrait-dead-label';
                    deadLabel.innerText = '사망';
                    overlay.appendChild(deadLabel);

                    // Add Resurrect Button if in DungeonScene
                    const sceneKey = this.scene?.scene?.key || this.scene?.sys?.settings?.key;
                    if (sceneKey === 'DungeonScene') {
                        const btn = document.createElement('button');
                        btn.className = 'portrait-resurrect-btn';

                        // Get cost from scene
                        const baseCost = 500;
                        const costMult = this.scene.resurrectionCosts ? (this.scene.resurrectionCosts[merc.characterId] || 0) : 0;
                        const currentCost = baseCost * Math.pow(2, costMult);

                        btn.innerHTML = `
                            <span>부활</span>
                            <span class="portrait-resurrect-cost">${currentCost}G</span>
                        `;

                        btn.onclick = (e) => {
                            e.stopPropagation();
                            EventBus.emit(EventBus.EVENTS.MERCENARY_RESURRECT, {
                                unitId: merc.id,
                                characterId: merc.characterId,
                                classId: merc.className,
                                cost: currentCost
                            });
                        };
                        overlay.appendChild(btn);
                    }

                    element.appendChild(overlay);
                    console.log(`[UIManager] Portrait DEAD: ${merc.unitName}`);
                } else {
                    element.style.filter = '';
                }
            }

            // ── 2. HP 세그먼트 업데이트 ──────────────────────────────────
            if (Math.abs(cache.hp - hpPercent) > 0.5 && dom.segments.length > 0) {
                const segCount = dom.segments.length;
                const activeCount = Math.round((hpPercent / 100) * segCount);

                let activeClass;
                if (hpPercent > 60) {
                    activeClass = 'active-hp';         // CRT 시안
                } else if (hpPercent > 30) {
                    activeClass = 'active-hp-warn';    // 오렌지 앤버
                } else {
                    activeClass = 'active-hp-danger';  // 빨간 점멸
                }

                if (cache.lastHpCount !== activeCount || cache.lastHpClass !== activeClass) {
                    dom.segments.forEach((seg, i) => {
                        seg.className = 'portrait-hp-segment';
                        if (i < activeCount) seg.classList.add(activeClass);
                    });
                    cache.lastHpCount = activeCount;
                    cache.lastHpClass = activeClass;
                }
                cache.hp = hpPercent;
            }

            // ── 3. ULT 바 업데이트 ────────────────────────────────────
            if (Math.abs(cache.ult - ultPercent) > 0.5 && dom.ultFill) {
                const clampedUlt = Math.min(100, Math.max(0, ultPercent));
                dom.ultFill.style.width = `${clampedUlt}%`;

                const isReady = clampedUlt >= 100;

                // 더티 플래그 캐싱 (클래스 토글 최소화)
                if (cache.lastUltReady !== isReady) {
                    dom.ultFill.classList.toggle('ult-ready', isReady);
                    if (dom.ultLabel) {
                        if (isReady) {
                            dom.ultLabel.textContent = 'READY!';
                            dom.ultLabel.classList.add('ult-ready-label');
                        } else {
                            dom.ultLabel.classList.remove('ult-ready-label');
                        }
                    }
                    cache.lastUltReady = isReady;
                }

                // 텍스트는 퍼센트 갱신 시에만 업데이트
                if (dom.ultLabel && !isReady) {
                    const ultText = `ULT ${Math.round(clampedUlt)}%`;
                    if (cache.lastUltText !== ultText) {
                        dom.ultLabel.textContent = ultText;
                        cache.lastUltText = ultText;
                    }
                }

                cache.ult = ultPercent;
            }

            // ── 4. 상태이상 아이콘 (변경 시에만) ─────────────────────────────
            if (cache.statusKey !== statusKey && dom.statusRow) {
                dom.statusRow.innerHTML = '';
                statuses.forEach((status) => {
                    const iconEl = document.createElement('span');
                    iconEl.className = 'portrait-status-mini';
                    iconEl.textContent = status.emoji;
                    iconEl.title = status.name || '';
                    iconEl.onclick = (e) => {
                        e.stopPropagation();
                        this.showStatusTooltip(status, iconEl);
                    };
                    dom.statusRow.appendChild(iconEl);
                });
                cache.statusKey = statusKey;
            }

            // Ensure order matches displayList order
            if (this.portraitBar.children[index] !== element) {
                this.portraitBar.insertBefore(element, this.portraitBar.children[index]);
            }
        });
    }

    getHPColor(percent) {
        if (percent > 60) return '#00ffcc';
        if (percent > 30) return '#ffcc00';
        return '#ff5555';
    }

    showCharacterDetail(channel) {
        if (!this.popupOverlay || !this.popupInner) return;
        this.detailChannel = channel;
        this.clearPopupSafe();
        this.popupInner.appendChild(channel.element);
        channel.element.style.display = 'flex';
        channel.element.style.height = '100%';
        channel.element.classList.add('has-unit');

        // Auto-switch to dashboard for easier mobile access
        if (channel.currentView === 'chat') {
            channel.toggleView('dashboard');
        }

        this.popupOverlay.style.display = 'flex';
    }

    handleSlotAssigned(slotId, characterId) {
        const charConfig = Characters[characterId.toUpperCase()];
        if (!charConfig) return;

        const slotIndex = parseInt(slotId.replace('slot', ''));
        const channel = this.channels[slotIndex];

        // Duplicate prevention: check if this character is already in another slot
        this.channels.forEach((ch, idx) => {
            if (idx !== slotIndex && ch.characterId === characterId) {
                console.log(`[UIManager] Moving ${characterId} from slot ${idx} to slot ${slotIndex}`);
                ch.clear(); // Clear the old slot UI
            }
        });

        // Save to PartyManager
        const partyManager = this.scene.game.partyManager;
        partyManager.setPartySlot(slotIndex, characterId);

        // Bind the UI slot immediately for feedback
        channel.classId = charConfig.classId;
        channel.bindUnit(
            `preview-${characterId}`, // Temporary ID for preview
            charConfig.name,
            `assets/characters/party/${charConfig.sprite}.png`,
            {
                name: charConfig.skillName,
                emoji: charConfig.skillEmoji,
                description: charConfig.skillDescription,
                passiveName: charConfig.passiveName,
                passiveEmoji: charConfig.passiveEmoji,
                passiveDescription: charConfig.passiveDescription,
                ultimateName: charConfig.ultimateName,
                ultimateDescription: charConfig.ultimateDescription
            },
            charConfig.narrativeUnlocks,
            characterId
        );
        channel.element.classList.add('has-unit');
        channel.element.classList.remove('empty');
    }

    rafLoop() {
        if (this.inventoryDirty && !this.isRefreshing) {
            this.inventoryDirty = false;
            this.refreshInventory();
        }

        if (this.hudDirty) {
            this.hudDirty = false;
            this.updateMobileHUD();
        }

        if (this.portraitsDirty) {
            this.portraitsDirty = false;
            this.updatePortraitBar();
        }

        // Batch update all channels at once per frame
        for (let i = 0; i < this.channels.length; i++) {
            this.channels[i].update();
        }

        // Only loop if not destroyed
        if (!this.destroyed) {
            requestAnimationFrame(this.rafLoop);
        }
    }

    setupChatChannels() {
        if (!this.chatContainer) return;

        // Create 6 fixed chat channels
        for (let i = 0; i < 6; i++) {
            const id = `slot${i}`;
            const channel = new ChatChannel(
                id,
                null, // classId
                [],   // characters
                `용병 ${i + 1}`,
                '',   // No sprite initially
                this.chatContainer,
                (text) => {
                    this.handlePlayerCommand(channel.linkedUnitId || id, text);
                },
                (swapClassId, newCharacterId) => {
                    import('../Events/EventBus.js').then(module => {
                        const EventBus = module.default;
                        EventBus.emit(EventBus.EVENTS.DEBUG_SWAP_CHARACTER, {
                            classId: channel.classId,
                            unitId: channel.linkedUnitId,
                            characterId: newCharacterId
                        });
                    });
                },
                this // Pass UIManager instance
            );
            channel.clear(); // Ensure it starts empty
            this.channels.push(channel);
        }

        this.addLog('slot0', 'Messiah Grimoire에 오신 것을 환영합니다!', '#00ffcc');
    }

    async handlePlayerCommand(agentId, text) {
        if (!intentRouter.isReady) {
            this.addLog(agentId, `[System] 지휘 시스템 준비 중...`, '#aaaaaa');
            return;
        }

        const result = await intentRouter.route(text);

        if (result.type === 'COMMAND') {
            this.addLog(agentId, `[System] 전술 지시 인식됨: ${result.intent}`, '#aaaaaa');

            // Emit the command event
            EventBus.emit(EventBus.EVENTS.AI_COMMAND, {
                agentId: agentId,
                command: result.action.name,
                args: result.action.arguments
            });

            const args = result.action.arguments || {};
            const actionDesc = result.action.name === 'attack_priority'
                ? `${args.role || 'target'} 우선 공격`
                : `${result.action.name}(${Object.entries(args).map(([key, value]) => `${key}: ${value}`).join(', ')})`;
            this.addLog(agentId, `[AI] 전술 행동: ${actionDesc}`, '#bb88ff');
        } else {
            this.addLog(agentId, `[System] 대화 모드 (맥락 분석 중...)`, '#aaaaaa');

            try {
                // Find character config based on the agentId
                const channel = this.unitToChannel[agentId] || this.channels.find(c => c.id === agentId);
                const charName = channel ? (channel.name || agentId) : agentId;
                const charId = channel ? channel.characterId : agentId;

                // Find character config by name or id
                let charConfig = null;
                if (Characters && typeof Characters === 'object') {
                    charConfig = Object.values(Characters).find(c =>
                        c && ((charId && c.id === charId.toLowerCase()) ||
                            c.name.includes(charName) ||
                            c.id === charName.toLowerCase())
                    );
                }

                if (!channel.chatHistory) channel.chatHistory = [];

                const memories = await embeddingGemma.searchMemory(text);

                // Construct a dynamic config if the unit exists in the scene
                const unit = this.scene && this.scene.mercenaries ? this.scene.mercenaries.getChildren().find(m => m.id === agentId) : null;
                const dynamicConfig = unit ? {
                    ...unit.config,
                    personality: unit.personality || unit.config.personality
                } : charConfig;

                const activePartyIds = this.scene.game.partyManager.getActiveParty().filter(id => id !== null);
                const response = await localLLM.generateResponse(dynamicConfig, text, memories, channel.chatHistory, channel.lastLevel || 1, activePartyIds);

                this.addLog(agentId, `[${charName}] ${response}`, '#00ffcc');

                // Update history (max 3 pairs)
                channel.chatHistory.push({ role: 'user', text: text });
                channel.chatHistory.push({ role: 'assistant', text: response });
                if (channel.chatHistory.length > 6) channel.chatHistory.splice(0, 2);

                // Let the specific mercenary "say" it in a speech bubble if needed
                EventBus.emit(EventBus.EVENTS.AI_RESPONSE, {
                    agentId: agentId,
                    text: response
                });
            } catch (err) {
                this.addLog(agentId, `[AI Error] ${err.message}`, '#ff5555');
            }
        }
    }

    handleItemCollected(payload) {
        const { emoji, collectorId } = payload;
        const name = collectorId || 'someone';

        // Suppressed chat log as per user request, keep console debug
        console.log(`[Item] ${name} (${collectorId}) collected: ${emoji}`);
    }

    handleMonsterKilled(payload) {
        const { monsterId, attackerId } = payload;
        const attackerName = attackerId || 'warrior';
        const monsterName = (monsterId === 'goblin_sprite') ? '고블린' : '적';

        // Suppressed chat log as per user request, keep console debug
        console.log(`[Combat] ${attackerName} killed ${monsterName} (${monsterId})`);
    }

    createTooltip() {
        if (document.getElementById('inv-tooltip')) return;
        this.tooltipEl = document.createElement('div');
        this.tooltipEl.id = 'inv-tooltip';
        this.tooltipEl.className = 'inv-tooltip';
        document.body.appendChild(this.tooltipEl);

        document.addEventListener('mousemove', (e) => {
            if (this.tooltipEl.style.display === 'flex') {
                const rect = this.tooltipEl.getBoundingClientRect();
                let left = e.clientX + 15; // Offset from cursor by 15px
                let top = e.clientY + 15;

                // Adjust if passing right edge
                if (left + rect.width > window.innerWidth) {
                    left = e.clientX - rect.width - 15;
                }
                // Adjust if passing bottom edge
                if (top + rect.height > window.innerHeight) {
                    top = e.clientY - rect.height - 15;
                }

                // Final safety clamp to prevent it from going off-screen entirely
                left = Math.max(0, Math.min(left, window.innerWidth - rect.width));
                top = Math.max(0, Math.min(top, window.innerHeight - rect.height));

                this.tooltipEl.style.left = left + 'px';
                this.tooltipEl.style.top = top + 'px';
            }
        });
    }

    showTooltip(itemId) {
        console.warn('[UIManager] showTooltip CALLED! (This should be disabled)', { itemId });
        const item = ItemManager.getItem(itemId);
        if (!item || !this.tooltipEl) return;

        let statsHtml = '';
        if (item && item.stats && typeof item.stats === 'object') {
            Object.entries(item.stats).forEach(([key, val]) => {
                const label = key.toUpperCase();
                statsHtml += `<div class="stat-line"><span class="stat-label">${label}</span><span class="stat-value">+${val}</span></div>`;
            });
        }

        this.tooltipEl.innerHTML = `
            <div class="item-name">${item.name}</div>
            <div class="item-type">${item.slot || 'ITEM'}</div>
            <div class="item-stats">
                ${statsHtml}
            </div>
            <div class="item-description">${item.description || ''}</div>
        `;
        this.tooltipEl.style.display = 'flex';
    }

    hideTooltip() {
        if (this.tooltipEl) {
            this.tooltipEl.style.display = 'none';
        }
    }

    addLog(agentId, text, color) {
        const channel = this.unitToChannel[agentId] || (this.channels.find(c => c.id === agentId));
        if (channel) {
            channel.addLog(text, color);
        }
    }

    async injectTestItems() {
        try {
            const testItems = [
                'test_sword_fire', 'test_sword_ice', 'test_sword_lightning',
                'test_staff_fire', 'test_staff_ice', 'test_staff_lightning',
                'emoji_burger' // Ensure burger is always there
            ];

            for (const id of testItems) {
                const item = await DBManager.getInventoryItem(id);
                if (!item || item.amount < 10) {
                    await DBManager.saveInventoryItem(id, 10);
                    console.log(`[UIManager] Injected/Fixed ${id} x10`);
                }
            }

            this.inventoryDirty = true;
        } catch (e) {
            console.error('[UIManager] Error injecting test items:', e);
        }
    }

    async refreshInventory() {
        this.isRefreshing = true;
        try {
            const items = await DBManager.getAllInventory();

            // Find the appropriate target channel for the "Equipped" check
            let targetChannel = this.detailChannel;
            if (!targetChannel && this.pendingGrimoireSlot) {
                targetChannel = this.channels.find(c => c.linkedUnitId === this.pendingGrimoireSlot.unitId);
            }
            if (!targetChannel && this.pendingGearSlot) {
                targetChannel = this.channels.find(c => c.linkedUnitId === this.pendingGearSlot.unitId);
            }
            if (!targetChannel) targetChannel = this.channels.find(c => c.active);

            if (!this.materialList) this.materialList = document.getElementById('material-list');
            if (!this.gearList) this.gearList = document.getElementById('gear-list');
            if (!this.materialList || !this.gearList) return;

            this.materialList.innerHTML = '';
            this.gearList.innerHTML = '';

            items.sort((a, b) => b.amount - a.amount);

            // Filter by Grimoire Chapter if active (for Emoji/Materials tab)
            const filteredItems = items.filter(item => {
                const itemData = ItemManager.getItem(item.id);
                if (!itemData) return false;

                // If Gear tab, show all gear
                if (itemData.type === 'equipment') return true;

                // If Emoji tab, respect the filter
                if (this.emojiFilter === 'ALL') return true;
                return ItemManager.getChapter(item.id) === this.emojiFilter;
            });

            filteredItems.forEach(item => {
                const itemData = ItemManager.getItem(item.id);
                if (!itemData) return;

                const filename = ItemManager.getSVGFilename(item.id);
                const div = document.createElement('div');
                div.className = 'inv-item';
                div.draggable = true;
                const elementalBadge = (itemData.prefix && itemData.prefix.emoji)
                    ? `<div class="item-element-badge">${itemData.prefix.emoji}</div>`
                    : '';

                div.innerHTML = `
                    <img class="inv-icon" src="assets/emojis/${filename}" alt="${item.id}" draggable="false">
                    <span class="inv-amount">${item.amount}</span>
                    ${elementalBadge}
                `;

                div.ondragstart = (e) => {
                    e.dataTransfer.setData('itemId', item.id);
                    e.dataTransfer.effectAllowed = 'copyMove';
                };

                const isEquipped = itemData.type === 'equipment' ?
                    (targetChannel && targetChannel.equipment && Object.values(targetChannel.equipment).some(e => e && e.id === item.id)) :
                    (targetChannel && targetChannel.grimoire && Object.values(targetChannel.grimoire).some(arr => arr && Array.isArray(arr) && arr.includes(item.id)));

                div.onclick = (e) => {
                    e.stopPropagation();
                    this.handleItemClick(item.id, isEquipped);
                };

                if (itemData && itemData.type === 'equipment') {
                    div.classList.add('is-gear');
                    if (isEquipped) div.classList.add('equipped');
                    this.gearList.appendChild(div);
                } else if (CharmManager.getCharm(item.id) ||
                    itemData.type === 'node_charm' ||
                    itemData.type === 'class_charm' ||
                    itemData.type === 'trans_charm') {
                    div.classList.add('is-charm');
                    if (isEquipped) div.classList.add('equipped');
                    this.materialList.appendChild(div);
                } else {
                    this.materialList.appendChild(div);
                }
            });
        } catch (e) {
            console.error('[UIManager] Error refreshing inventory UI:', e);
        } finally {
            this.isRefreshing = false;
        }
    }

    handleItemClick(itemId, isAlreadyEquipped = false) {
        if (this.tooltipEl) this.tooltipEl.style.display = 'none'; // Kill legacy tooltip

        let autoEquipped = false;

        // --- Improved UX: Two-Click System ---
        // 1. If we have a pending slot (Grimoire or Gear) AND this item is ALREADY selected (second click)
        if ((this.pendingGrimoireSlot || this.pendingGearSlot) && this.selectedItemId === itemId) {
            // This is the second click on the same item, proceed with equip
            if (!isAlreadyEquipped) {
                autoEquipped = this.executeEquip(itemId, false);
            }
        }

        // 2. Otherwise, just show the detail panel (first click or switching items)
        this.showItemDetail(itemId, isAlreadyEquipped || autoEquipped);
    }

    showItemDetail(itemId, isAlreadyEquipped = false) {
        const item = ItemManager.getItem(itemId);
        const charm = CharmManager.getCharm(itemId);

        // Prioritize charm data because it's richer for charms (it has description)
        const targetItem = charm || item;

        console.log(`[UIManager] showItemDetail: itemId=${itemId}, autoEquip=${isAlreadyEquipped}`, { hasItem: !!item, hasCharm: !!charm });

        if (!targetItem || !this.detailPanel) return;

        this.selectedItemId = itemId;
        if (this.detailName) this.detailName.textContent = targetItem.name;

        // Reset Equip Button State
        if (this.btnEquipItem) {
            if (isAlreadyEquipped) {
                this.btnEquipItem.innerText = '장착됨';
                this.btnEquipItem.style.opacity = '0.5';
                this.btnEquipItem.style.pointerEvents = 'none'; // Disable click
            } else {
                this.btnEquipItem.innerText = '장착';
                this.btnEquipItem.style.opacity = '1';
                this.btnEquipItem.style.pointerEvents = 'auto';
            }
        }

        // Map type enum to user-friendly label
        let typeLabel = 'ITEM';
        if (targetItem.slot) {
            typeLabel = targetItem.slot;
        } else if (item && item.type === 'class_charm') {
            typeLabel = 'CLASS CHARM';
        } else if (item && item.type === 'node_charm') {
            typeLabel = 'NODE CHARM';
        } else if (item && item.type === 'trans_charm') {
            typeLabel = 'TRANS CHARM';
        } else if (charm) {
            typeLabel = 'CHARM';
        }

        if (this.detailType) this.detailType.textContent = typeLabel.toUpperCase();

        // Class Requirement Text
        let classReqText = '';
        let canEquip = true;

        if (targetItem.type === 'class_charm' && targetItem.classId) {
            // Prioritize pending slot channel, then detail panel channel, then fallback to active
            let targetChannel = null;
            if (this.pendingGrimoireSlot) {
                targetChannel = this.channels.find(c => c.linkedUnitId === this.pendingGrimoireSlot.unitId);
            } else if (this.pendingGearSlot) {
                targetChannel = this.channels.find(c => c.linkedUnitId === this.pendingGearSlot.unitId);
            }

            if (!targetChannel) targetChannel = this.detailChannel;
            if (!targetChannel) targetChannel = this.channels.find(c => c.active);

            const currentClassName = targetChannel ? targetChannel.className : null;

            const isMatch = (currentClassName === targetItem.classId);
            const color = isMatch ? '#00ffcc' : '#ff4444';
            const classNameKr = {
                'warrior': '전사',
                'archer': '아처',
                'wizard': '마법사',
                'healer': '힐러',
                'bard': '바드'
            }[targetItem.classId] || targetItem.classId;

            classReqText = `<div style="color: ${color}; font-size: 10px; margin-top: 4px;">[전용: ${classNameKr}]</div>`;

            if (!isMatch) {
                canEquip = false;
            }
        }

        if (this.detailDesc) {
            this.detailDesc.innerHTML = (targetItem.description || (item ? '재료 아이템입니다.' : '')) + classReqText;
        }

        // Disable equip button if class mismatch
        if (this.btnEquipItem && !isAlreadyEquipped) {
            if (!canEquip) {
                this.btnEquipItem.innerText = '장착 불가';
                this.btnEquipItem.style.opacity = '0.3';
                this.btnEquipItem.style.pointerEvents = 'none';
            } else {
                this.btnEquipItem.innerText = '장착';
                this.btnEquipItem.style.opacity = '1';
                this.btnEquipItem.style.pointerEvents = 'auto';
            }
        }

        this.detailPanel.style.display = 'flex';
    }

    executeEquip(itemId, allowFallback = true) {
        const item = ItemManager.getItem(itemId);
        const charm = CharmManager.getCharm(itemId);

        console.log(`[UIManager] executeEquip: itemId=${itemId}, allowFallback=${allowFallback}`);

        // Find the appropriate target channel
        let targetChannel = this.detailChannel;
        if (!targetChannel && this.pendingGrimoireSlot) {
            targetChannel = this.channels.find(c => c.linkedUnitId === this.pendingGrimoireSlot.unitId);
        }
        if (!targetChannel && this.pendingGearSlot) {
            targetChannel = this.channels.find(c => c.linkedUnitId === this.pendingGearSlot.unitId);
        }
        if (!targetChannel) targetChannel = this.channels.find(c => c.active);

        if (!targetChannel || !targetChannel.linkedUnitId) {
            console.error('[UIManager] executeEquip FAILED: No target character found.');
            return false;
        }

        if (item && item.type === 'equipment') {
            let unitId = targetChannel ? targetChannel.linkedUnitId : null;

            // If we have a pending gear slot, override target
            if (this.pendingGearSlot) {
                unitId = this.pendingGearSlot.unitId;
                // Note: The slot type itself is handled by the server/logic based on the item,
                // but we could explicitly pass it if needed. For now, matching the unitId is key.

                // Clear highlight
                if (this.pendingGearSlot.element) {
                    this.pendingGearSlot.element.classList.remove('gear-slot-pending');
                }
                this.pendingGearSlot = null;
            }

            if (!unitId) {
                console.error('[UIManager] executeEquip FAILED: No target unitId.');
                return false;
            }

            EventBus.emit(EventBus.EVENTS.EQUIP_REQUEST, {
                unitId: unitId,
                itemId: itemId
            });
            return true;
        } else {
            // It's a charm/node click!
            let chapter = null;
            let index = -1;

            if (this.pendingGrimoireSlot) {
                // 1. Use manual pending slot if exists
                chapter = this.pendingGrimoireSlot.chapter;
                index = this.pendingGrimoireSlot.index;

                // Clear highlight
                if (this.pendingGrimoireSlot.element) {
                    this.pendingGrimoireSlot.element.classList.remove('grim-slot-pending');
                }
                this.pendingGrimoireSlot = null;
            } else if (allowFallback) {
                // 2. Fallback: Find first empty slot based on type
                if (item && item.type === 'node_charm') {
                    chapter = 'TACTICAL';
                    index = targetChannel.findEmptyNodeCharmSlot();
                } else if (item && item.type === 'class_charm') {
                    chapter = 'CLASS';
                    index = targetChannel.findEmptyGrimoireSlot('CLASS');
                } else if (item && item.type === 'trans_charm') {
                    chapter = 'TRANSFORMATION';
                    index = 0; // Trans only has 1 slot
                } else if (charm) {
                    chapter = 'ACTIVE';
                    index = targetChannel.findEmptyCharmSlot();
                }
            }

            if (chapter && index !== -1) {
                console.log(`[UIManager] Equipping charm: ${itemId} to ${chapter}[${index}] for ${targetChannel.name}`);
                EventBus.emit('GRIMOIRE_REQUEST', {
                    unitId: targetChannel.linkedUnitId,
                    itemId: itemId,
                    chapter: chapter,
                    index: index,
                    action: 'set'
                });

                // Optional: Play a sound or show short feedback
                if (window.soundEffects && window.soundEffects.playEquipSound) {
                    window.soundEffects.playEquipSound();
                }
                return true;
            } else {
                console.warn('[UIManager] No available slot found for equip request.', { itemId, chapter, index });
                return false;
            }
        }
    }

    getSVGFilename(key) {
        return ItemManager.getSVGFilename(key);
    }

    showStatusTooltip(status, anchorEl) {
        // ... (existing status tooltip code)
    }

    setupSettingsEvents() {
        if (this.btnSettings) {
            this.btnSettings.onclick = () => this.showSettingsPopup();
        }
    }

    showSettingsPopup() {
        if (!this.popupOverlay) return;

        import('../Core/SoundEffects.js').then(module => {
            const sfx = module.default;

            // Current BGM Volume (from Phaser)
            const currentBgmVol = (this.scene && this.scene.sound.volume) || 0.5;
            const currentSfxVol = sfx.sfxVolume;

            this.popupInner.innerHTML = `
                <div class="settings-menu">
                    <div class="settings-header">
                        <span>⚙️</span> SETTINGS
                    </div>

                    <!-- SFX Volume -->
                    <div class="settings-row">
                        <div class="settings-label-row">
                            <span class="settings-label">효과음 (SFX)</span>
                            <div class="settings-controls">
                                <button id="btn-mute-sfx" class="mute-btn ${sfx.sfxMuted ? 'active' : ''}">🔇</button>
                                <span id="sfx-vol-val">${Math.round(currentSfxVol * 100)}%</span>
                            </div>
                        </div>
                        <input type="range" id="slider-sfx-vol" class="settings-slider" min="0" max="1" step="0.01" value="${currentSfxVol}">
                    </div>

                    <!-- BGM Volume -->
                    <div class="settings-row">
                        <div class="settings-label-row">
                            <span class="settings-label">배경음 (BGM)</span>
                            <div class="settings-controls">
                                <button id="btn-mute-bgm" class="mute-btn ${(this.scene && this.scene.sound.mute) ? 'active' : ''}">🔇</button>
                                <span id="bgm-vol-val">${Math.round(currentBgmVol * 100)}%</span>
                            </div>
                        </div>
                        <input type="range" id="slider-bgm-vol" class="settings-slider" min="0" max="1" step="0.01" value="${currentBgmVol}">
                    </div>

                    <!-- Vibration -->
                    <div class="settings-row">
                        <div class="settings-label-row">
                            <span class="settings-label">진동 (Vibration)</span>
                            <label class="switch">
                                <input type="checkbox" id="check-vibration" ${sfx.vibrationEnabled ? 'checked' : ''}>
                                <span class="slider-toggle"></span>
                            </label>
                        </div>
                    </div>

                    <!-- Battery Saver (NEW) -->
                    <div class="settings-row">
                        <div class="settings-label-row">
                            <span class="settings-label">방치 모드 (Battery Saver)</span>
                            <label class="switch">
                                <input type="checkbox" id="check-battery-saver" ${localStorage.getItem('batterySaver') === 'true' ? 'checked' : ''}>
                                <span class="slider-toggle"></span>
                            </label>
                        </div>
                    </div>
                </div>
            `;

            this.popupOverlay.style.display = 'flex';

            // SFX Listeners
            const sfxSlider = document.getElementById('slider-sfx-vol');
            const sfxMuteBtn = document.getElementById('btn-mute-sfx');
            const sfxValText = document.getElementById('sfx-vol-val');

            sfxSlider.oninput = (e) => {
                const vol = parseFloat(e.target.value);
                sfx.setSFXVolume(vol);
                sfxValText.innerText = `${Math.round(vol * 100)}%`;
            };

            sfxMuteBtn.onclick = () => {
                const isMuted = !sfx.sfxMuted;
                sfx.setSFXMuted(isMuted);
                sfxMuteBtn.classList.toggle('active', isMuted);
            };

            // BGM Listeners
            const bgmSlider = document.getElementById('slider-bgm-vol');
            const bgmMuteBtn = document.getElementById('btn-mute-bgm');
            const bgmValText = document.getElementById('bgm-vol-val');

            bgmSlider.oninput = (e) => {
                const vol = parseFloat(e.target.value);
                if (this.scene) {
                    this.scene.sound.setVolume(vol);
                    localStorage.setItem('bgmVolume', vol);
                }
                bgmValText.innerText = `${Math.round(vol * 100)}%`;
            };

            bgmMuteBtn.onclick = () => {
                const isMuted = this.scene ? !this.scene.sound.mute : false;
                if (this.scene) {
                    this.scene.sound.setMute(isMuted);
                    localStorage.setItem('bgmMuted', isMuted);
                }
                bgmMuteBtn.classList.toggle('active', isMuted);
            };

            // Vibration Listener
            const vibCheck = document.getElementById('check-vibration');
            vibCheck.onchange = (e) => {
                sfx.setVibrationEnabled(e.target.checked);
            };

            // Battery Saver Listener
            const batteryCheck = document.getElementById('check-battery-saver');
            batteryCheck.onchange = (e) => {
                const enabled = e.target.checked;
                localStorage.setItem('batterySaver', enabled);
                EventBus.emit(EventBus.EVENTS.BATTERY_SAVER_TOGGLED, enabled);
                if (this.showToast) {
                    this.showToast(enabled ? '방치 모드 활성화 (성능 우선) 🔋' : '방치 모드 비활성화 (품질 우선) ✨');
                }
            };
        });
    }

    destroy() {
        this.destroyed = true;
    }
}
