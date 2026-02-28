import DBManager from '../Database/DBManager.js';
import ChatChannel from './ChatChannel.js';
import EventBus from '../Events/EventBus.js';
import intentRouter from '../AI/IntentRouter.js';
import localLLM from '../AI/LocalLLM.js';
import embeddingGemma from '../AI/EmbeddingGemma.js';
import { MercenaryClasses, Characters } from '../Core/EntityStats.js';
import partyManager from '../Core/PartyManager.js';
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
        this.popupOverlay = document.getElementById('popup-overlay');
        this.popupInner = document.getElementById('popup-inner');
        this.popupClose = document.getElementById('popup-close');
        this.btnInventory = document.getElementById('btn-inventory');
        this.btnParty = document.getElementById('btn-party');
        this.btnFullscreen = document.getElementById('btn-fullscreen');

        // Item Detail Panel
        this.detailPanel = document.getElementById('item-detail-panel');
        this.detailName = document.getElementById('detail-name');
        this.detailType = document.getElementById('detail-type');
        this.detailDesc = document.getElementById('detail-description');
        this.btnEquipItem = document.getElementById('btn-equip-item');
        this.selectedItemId = null;

        // Bind the RAF loop
        this.rafLoop = this.rafLoop.bind(this);
    }

    init() {
        console.log('[UIManager] Initialized DOM Overlay');

        this.createTooltip();
        this.setupChatChannels();
        this.setupMobileEvents();
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
                    channel.updateEquipment(payload.equipment, payload.charms, payload.nodeCharms);
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

            // Manage portrait bar visibility without overriding display: grid 
            if (this.portraitBar) {
                if (sceneKey === 'TerritoryScene') {
                    this.portraitBar.classList.add('hidden');
                    this.portraitBar.classList.remove('active');
                } else {
                    this.portraitBar.classList.remove('hidden');
                    this.portraitBar.classList.add('active');
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
                            ultimateName: charConfig.ultimateName,
                            ultimateDescription: charConfig.ultimateDescription
                        },
                        charConfig.narrativeUnlocks,
                        merc.characterId
                    );

                    this.unitToChannel[merc.id] = channel;
                }
            });
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

    setupMobileEvents() {
        if (this.btnInventory) {
            this.btnInventory.onclick = () => {
                this.showPopup('inventory');
                this.switchInventoryTab('materials'); // Reset to materials on open
            };
        }
        if (this.btnParty) {
            this.btnParty.onclick = () => this.showPopup('party');
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
    }

    switchInventoryTab(tab) {
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
        } else if (type === 'party') {
            const chatContent = document.getElementById('chat-container');
            if (chatContent) {
                this.popupInner.appendChild(chatContent);
                chatContent.style.setProperty('display', 'flex', 'important');
                chatContent.style.height = '100%';
                chatContent.style.background = 'transparent';
            }
        }

        this.popupOverlay.style.display = 'flex';
    }

    hidePopup() {
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

        // Clean up portraits for units no longer active
        const activeIds = activeMercs.map(m => m.id);
        Object.keys(this.portraits).forEach(id => {
            if (!activeIds.includes(id)) {
                this.portraits[id].element.remove();
                delete this.portraits[id];
            }
        });

        activeMercs.forEach((merc, index) => {
            if (!merc) return;

            const hpPercent = (merc.hp / merc.maxHp) * 100;
            const ultPercent = (merc.ultGauge / merc.maxUltGauge) * 100;
            const statuses = (typeof merc.getStatuses === 'function') ? merc.getStatuses() : [];
            const statusKey = statuses.map(s => s.emoji).join(',');

            let cache = this.portraits[merc.id];

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
                const starLevel = partyManager.getHighestStar(merc.characterId);
                const starHtml = starLevel > 0 ? `<span style="color:#fbbf24; font-size:10px; margin-left:4px; text-shadow:0 1px 2px #000;">★${starLevel}</span>` : '';

                const HP_SEGMENTS = 10;
                let segmentsHtml = '';
                for (let i = 0; i < HP_SEGMENTS; i++) {
                    segmentsHtml += `<div class="portrait-hp-segment" data-seg="${i}"></div>`;
                }

                const portrait = document.createElement('div');
                portrait.className = 'unit-portrait';
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
                cache = this.portraits[merc.id] = {
                    element: portrait,
                    statusKey: '',
                    hp: -1,
                    ult: -1,
                    lastHpCount: -1,
                    lastHpClass: '',
                    isDead: null,
                    dom: {
                        segments: portrait.querySelectorAll('.portrait-hp-segment'),
                        ultFill: portrait.querySelector('.portrait-ult-fill'),
                        ultLabel: portrait.querySelector('.portrait-ult-label'),
                        statusRow: portrait.querySelector('.portrait-status-row'),
                    }
                };
                console.log(`[UIManager] Portrait created (retro-arcade): ${merc.unitName} id=${merc.id}`);
            }

            const { element, dom } = cache;
            const isDead = merc.hp <= 0;

            // ── 1. 사망/생존 처리 ──────────────────────────────────────────
            if (cache.isDead !== isDead) {
                cache.isDead = isDead;
                const existingOverlay = element.querySelector('.portrait-dead-overlay');
                if (existingOverlay) existingOverlay.remove();

                if (isDead) {
                    element.style.filter = 'grayscale(85%) brightness(0.45)';
                    const overlay = document.createElement('div');
                    overlay.className = 'portrait-dead-overlay';
                    overlay.innerHTML = '<span class="portrait-dead-label">DEAD</span>';
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

            // Ensure order matches activeMercs order
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

        // Save to PartyManager
        import('../Core/PartyManager.js').then(module => {
            const partyManager = module.default;
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
                    ultimateName: charConfig.ultimateName,
                    ultimateDescription: charConfig.ultimateDescription
                },
                charConfig.narrativeUnlocks,
                characterId
            );
            channel.element.classList.add('has-unit');
            channel.element.classList.remove('empty');
        });
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

                const activePartyIds = partyManager.getActiveParty().filter(id => id !== null);
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
        // removed global hiding of detailPanel here to prevent 0.1s vanishing bug
        try {
            const items = await DBManager.getAllInventory();

            if (!this.materialList) this.materialList = document.getElementById('material-list');
            if (!this.gearList) this.gearList = document.getElementById('gear-list');
            if (!this.materialList || !this.gearList) return;

            this.materialList.innerHTML = '';
            this.gearList.innerHTML = '';

            items.sort((a, b) => b.amount - a.amount);

            items.forEach(item => {
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

                if (itemData && itemData.type === 'equipment') {
                    div.classList.add('is-gear');
                    div.onclick = (e) => {
                        e.stopPropagation();
                        this.handleItemClick(item.id);
                    };
                    this.gearList.appendChild(div);
                } else if (CharmManager.getCharm(item.id) || itemData.type === 'node_charm') {
                    // It's a charm or tactical node! Add click handler for easy equipping
                    div.classList.add('is-charm');
                    div.onclick = (e) => {
                        e.stopPropagation();
                        this.handleItemClick(item.id);
                    };
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

    handleItemClick(itemId) {
        if (this.tooltipEl) this.tooltipEl.style.display = 'none'; // Kill legacy tooltip
        this.showItemDetail(itemId);
    }

    showItemDetail(itemId) {
        const item = ItemManager.getItem(itemId);
        const charm = CharmManager.getCharm(itemId);

        // Prioritize charm data because it's richer for charms (it has description)
        const targetItem = charm || item;

        console.log(`[UIManager] showItemDetail: itemId=${itemId}`, { hasItem: !!item, hasCharm: !!charm });

        if (!targetItem || !this.detailPanel) return;

        this.selectedItemId = itemId;
        if (this.detailName) this.detailName.textContent = targetItem.name;
        if (this.detailType) this.detailType.textContent = (targetItem.slot || (charm ? 'CHARM' : 'ITEM')).toUpperCase();
        if (this.detailDesc) this.detailDesc.textContent = targetItem.description || (item ? '재료 아이템입니다.' : '');

        this.detailPanel.style.display = 'flex';
    }

    executeEquip(itemId) {
        const item = ItemManager.getItem(itemId);
        const charm = CharmManager.getCharm(itemId);

        console.log(`[UIManager] executeEquip: itemId=${itemId}, isItem=${!!item}, isCharm=${!!charm}`);

        // Find the appropriate target channel
        // 1. Current detail view (mercenary info is open)
        // 2. Focused channel (last interacted)
        // 3. Fallback to first bound channel
        const targetChannel = this.detailChannel || this.channels.find(c => c.active) || this.channels.find(c => c.boundUnitId);

        if (!targetChannel || !targetChannel.linkedUnitId) {
            console.error('[UIManager] executeEquip FAILED: No target character found.', {
                detailChannel: !!this.detailChannel,
                anyActive: !!this.channels.find(c => c.active),
                anyBound: !!this.channels.find(c => c.boundUnitId),
                channels: this.channels.map(c => ({ id: c.id, unit: c.linkedUnitId }))
            });
            return;
        }

        console.log(`[UIManager] executeEquip SUCCESS: Targeting ${targetChannel.name} (${targetChannel.linkedUnitId})`);

        if (item && item.type === 'equipment') {
            console.log(`[UIManager] Equipping gear: ${itemId}`);
            EventBus.emit(EventBus.EVENTS.EQUIP_REQUEST, {
                unitId: targetChannel.linkedUnitId,
                itemId: itemId
            });
        } else if (item && item.type === 'node_charm') {
            // It's a Node Charm click! Find first empty tactical slot
            const emptySlot = targetChannel.findEmptyNodeCharmSlot();
            console.log(`[UIManager] Found empty node charm slot: ${emptySlot}`);
            if (emptySlot !== -1) {
                EventBus.emit('NODE_CHARM_REQUEST', {
                    unitId: targetChannel.linkedUnitId,
                    itemId: itemId,
                    index: emptySlot,
                    action: 'set'
                });
            } else {
                console.log('[UIManager] No empty node charm slots available for', targetChannel.name);
            }
        } else if (charm) {
            // It's a charm click! Find first empty slot
            const emptySlot = targetChannel.findEmptyCharmSlot();
            console.log(`[UIManager] Found empty charm slot: ${emptySlot}`);
            if (emptySlot !== -1) {
                EventBus.emit('CHARM_REQUEST', {
                    unitId: targetChannel.linkedUnitId,
                    itemId: itemId,
                    index: emptySlot,
                    action: 'set'
                });
            } else {
                console.log('[UIManager] No empty charm slots available for', targetChannel.name);
            }
        }
    }

    getSVGFilename(key) {
        return ItemManager.getSVGFilename(key);
    }

    showStatusTooltip(status, anchorEl) {
        if (!this.statusTooltip) {
            this.statusTooltip = document.createElement('div');
            this.statusTooltip.id = 'status-tooltip';
            this.statusTooltip.className = 'status-popup-tab';
            document.body.appendChild(this.statusTooltip);
        }

        const rect = anchorEl.getBoundingClientRect();

        this.statusTooltip.innerHTML = `
            <div class="status-popup-header">
                <span class="status-popup-emoji">${status.emoji}</span>
                <span class="status-popup-title">${status.name}</span>
            </div>
            <div class="status-popup-desc">${status.description}</div>
        `;

        this.statusTooltip.style.display = 'block';

        // Position above the icon
        const tooltipRect = this.statusTooltip.getBoundingClientRect();
        this.statusTooltip.style.left = Math.max(10, Math.min(window.innerWidth - tooltipRect.width - 10, rect.left + rect.width / 2 - tooltipRect.width / 2)) + 'px';
        this.statusTooltip.style.top = (rect.top - tooltipRect.height - 12) + 'px';

        // Auto-hide after 3 seconds
        if (this.statusTooltipTimer) clearTimeout(this.statusTooltipTimer);
        this.statusTooltipTimer = setTimeout(() => {
            this.statusTooltip.style.display = 'none';
        }, 3000);

        // Click anywhere to hide immediately
        const hideMe = () => {
            this.statusTooltip.style.display = 'none';
            document.removeEventListener('mousedown', hideMe);
        };
        setTimeout(() => document.addEventListener('mousedown', hideMe), 100);
    }

    destroy() {
        this.destroyed = true;
    }
}
