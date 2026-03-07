import DBManager from '../Database/DBManager.js';
import ChatChannel from './ChatChannel.js';
import EventBus from '../Events/EventBus.js';
import intentRouter from '../AI/IntentRouter.js';
import localLLM from '../AI/LocalLLM.js';
import embeddingGemma from '../AI/EmbeddingGemma.js';
import { MercenaryClasses, Characters, PetStats, scaleStats, StructureStats } from '../Core/EntityStats.js';
// partyManager will be accessed via this.scene.game.partyManager
import ItemManager, { ITEM_TYPES } from '../Core/ItemManager.js';
import CharmManager from '../Core/CharmManager.js';
import ShopManager from './ShopManager.js';
import npcManager from '../Core/NPCManager.js';
import buildingManager, { BUILDING_TYPES } from '../Core/BuildingManager.js';
import equipmentManager from '../Core/EquipmentManager.js';

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
        this.npcHud = null;
        this.npcHudIcon = null;
        this.npcHudStacks = null;
        this.lastGold = -1;
        this.lastGem = -1;
        this.lastNpcId = null;
        this.lastNpcStacks = -1;
        this.lastMessiahPowerId = null;
        this.lastMessiahStacks = -1;
        this.lastMessiahAuto = null;

        // Dirty Flags for Performance (Replacing Polling)
        this.hudDirty = true;
        this.portraitsDirty = true;

        // Mobile HUD Elements
        this.hudGold = document.getElementById('hud-gold');
        this.hudGem = document.getElementById('hud-gem');
        this.npcHud = document.getElementById('npc-hud');
        this.npcHudIcon = document.getElementById('npc-hud-icon');
        this.npcHudStacks = document.getElementById('npc-hud-stacks');

        // Messiah HUD Elements
        this.messiahHud = document.getElementById('messiah-hud');
        this.messiahHudIcon = document.getElementById('messiah-hud-icon');
        this.messiahHudStacks = document.getElementById('messiah-hud-stacks');
        this.messiahCooldownFill = document.getElementById('messiah-cooldown-fill');
        this.messiahAutoBtn = document.getElementById('messiah-auto-btn');

        // Round Display Elements
        this.roundDisplay = document.getElementById('hud-round-display');
        this.roundText = document.getElementById('hud-round-text');
        this.lastRoundText = '';

        // Defense HUD Elements
        this.defenseHud = document.getElementById('defense-hud');
        this.defenseDeploymentPanel = document.getElementById('defense-deployment-panel');
        this.defenseDeploymentList = document.getElementById('defense-deployment-list');
        this.btnDefenseClose = document.getElementById('defense-panel-close');

        // Construction Overlay Elements
        this.constructionOverlay = document.getElementById('construction-overlay');
        this.btnExitConstruction = document.getElementById('btn-exit-construction');

        this.buildingGrid = document.getElementById('building-grid');
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
        this.viewingInstanceId = null; // Track which unique item is being viewed for real-time updates
        this.currentCraftFilter = null; // Filter for equipment crafting UI
        this.equipFilter = 'ALL'; // Filter for Equipment Inventory

        this.shopManager = new ShopManager(this);

        // Bind the RAF loop
        this.rafLoop = this.rafLoop.bind(this);

        this.initEventListeners();
        this.particlePool = []; // For resource-pop-anim recycling
        this.showProductionAnim = true; // Default setting
    }

    init() {
        console.log('[UIManager] Initialized DOM Overlay');

        this.createTooltip();
        this.setupChatChannels();
        this.setupMobileEvents();
        this.setupNavigationEvents();
        this.setupDefenseEvents();
        this.injectTestItems();

        // Load Settings
        this.loadSettings();

        if (buildingManager) {
            buildingManager.init();
            this.setupBuildingEvents();
        }

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
            this.updateDungeonTickets();
        });

        // Initial Tickets Update
        this.updateDungeonTickets();

        // New: Best Round Tracking Update
        this.updateBestRounds();
        EventBus.on('BEST_ROUND_UPDATED', () => this.updateBestRounds());

        // New: Building System Events
        EventBus.on('BUILDINGS_UPDATED', () => this.updateBuildingGrid());

        // Real-time Equipment EXP
        EventBus.on('EQUIPMENT_EXP_UPDATED', (payload) => this.handleEquipmentExpUpdated(payload));

    }

    setupBuildingEvents() {
        this.updateBuildingGrid();

        if (this.buildingGrid) {
            this.buildingGrid.addEventListener('click', (e) => {
                const slotEl = e.target.closest('.building-slot');
                if (!slotEl) return;

                const index = parseInt(slotEl.dataset.index);
                this.handleBuildingClick(index);
            });
        }
    }

    handleBuildingClick(index) {
        const slot = buildingManager.slots[index];
        if (slot) {
            this.showBuildingInfo(index);
        } else {
            this.showBuildingSelection(index);
        }
    }

    showBuildingInfo(slotIndex) {
        const slot = buildingManager.slots[slotIndex];
        if (!slot) return;

        const config = BUILDING_TYPES[slot.typeId.toUpperCase()];
        const upgradeGold = Math.floor(100 * Math.pow(1.5, slot.level - 1));
        const upgradeBrick = Math.floor(20 * Math.pow(1.5, slot.level - 1));

        const resIcon = ItemManager.getSVGFilename(config.resource);
        const resName = ItemManager.getItem(config.resource)?.name || config.resource;
        const bIcon = ItemManager.getSVGFilename(config.iconId);

        const kNames = {
            'bank': '은행',
            'factory': '공장',
            'church': '성당',
            'camp': '캠프',
            'tree': '나무',
            'castle': '성'
        };

        const imgStyle = `width:16px; height:16px; vertical-align:middle; image-rendering:pixelated; margin-right:4px;`;
        const largeImgStyle = `width:40px; height:40px; image-rendering:pixelated;`;
        const coinIcon = ItemManager.getSVGFilename('emoji_coin');
        const brickIcon = ItemManager.getSVGFilename('emoji_brick');

        const menuHtml = `
            <div class="building-info-card">
                <div class="info-header">
                    <div class="info-emoji-box">
                        <img src="assets/emojis/${bIcon}" style="${largeImgStyle}">
                    </div>
                    <div class="info-title-box">
                        <div class="info-name">${kNames[slot.typeId] || slot.typeId}</div>
                        <div class="info-level">Lv.${slot.level}</div>
                    </div>
                </div>

                <div class="info-stats-container">
                    <div class="info-stat-row">
                        <span style="color:var(--retro-amber); font-size: 11px;">[ 지원 주기: ${config.cooldown}초 ]</span>
                    </div>
                    <div class="info-stat-row" style="margin-top:4px; line-height: 1.4;">
                        <span style="color:#e2e8f0; font-size: 10px;">
                            ${slot.typeId === 'tree'
                ? `하늘에서 <strong style="color:var(--retro-green);">치유의 과일 🍎</strong>을 떨어뜨려 무작위 아군 1명의 체력을 ${15 + (slot.level - 1) * 5} 회복시킵니다.`
                : slot.typeId === 'factory'
                    ? `하늘에서 <strong style="color:var(--retro-red);">로켓 🚀</strong>을 발사하여 무작위 적 1명에게 ${10 + (slot.level - 1) * 4}의 물리 피해를 입힙니다.`
                    : slot.typeId === 'bank'
                        ? `하늘에서 <strong style="color:var(--retro-amber);">골드(Gold) 🪙</strong>를 떨어뜨려 전장에 ${50 + (slot.level - 1) * 25} 골드를 드랍합니다. (직접 획득 가능)`
                        : slot.typeId === 'church'
                            ? `아군 1명에게 성스러운 빛을 내려 모든 <strong style="color:var(--retro-amber);">상태이상 및 디버프를 정화</strong>합니다.`
                            : slot.typeId === 'camp'
                                ? `하늘에서 <strong style="color:white;">바위 🪨</strong>를 떨어뜨려 적에게 ${10 + (slot.level - 1) * 3}의 피해를 입히고 <strong style="color:var(--retro-red);">기절(Stun)</strong>시킵니다. (레이드 제외)`
                                : slot.typeId === 'castle'
                                    ? `매우 긴 주기마다 하늘에서 희귀한 <strong style="color:var(--retro-blue);">다이아(Diamond) 💎</strong>를 ${1 + Math.floor((slot.level - 1) / 5)}개 떨어뜨려 드랍합니다.`
                                    : '[ 전투 지원 기능 준비 중 ]'}
                        </span>
                    </div>
                </div>

                <div class="info-actions">
                    <button class="retro-btn-premium upgrade" id="btn-upgrade">
                        강화 (<img src="assets/emojis/${coinIcon}" style="${imgStyle}"> ${upgradeGold}, <img src="assets/emojis/${brickIcon}" style="${imgStyle}"> ${upgradeBrick})
                    </button>
                    <button class="retro-btn-premium demolish" id="btn-demolish">
                        철거
                    </button>
                </div>
                <div class="info-upgrade-section" style="margin-top:15px; font-size:12px;">
                    * 콤팩트 그리드 최적화 (슬롯 12칸)
                </div>
            </div>
        `;

        this.showPopup(menuHtml);

        const popup = this.popupInner;
        popup.querySelector('#btn-upgrade').onclick = async () => {
            const res = await buildingManager.upgradeBuilding(slotIndex);
            if (res.success) {
                this.showToast('건물을 강화했습니다! ✨');
                this.showBuildingInfo(slotIndex); // Refresh
            } else {
                this.showToast(res.reason || '강화 실패');
            }
        };

        popup.querySelector('#btn-demolish').onclick = () => {
            this.showConfirm(`${config.emoji} 건물을 철거하시겠습니까? 🔨`, async () => {
                await buildingManager.removeBuilding(slotIndex);
                this.showToast('건물을 철거했습니다. 💨');
                this.hidePopup();
            });
        };
    }

    showBuildingSelection(slotIndex) {
        const kData = {
            'bank': { name: '은행', desc: '[ 지원 주기: 10초 ] 하늘에서 <strong style="color:var(--retro-amber);">골드(Gold) 🪙</strong>를 떨어뜨려 전장에 드랍합니다.' },
            'factory': { name: '공장', desc: '[ 지원 주기: 20초 ] 하늘에서 <strong style="color:var(--retro-red);">로켓 🚀</strong>을 발사하여 무작위 적 1명을 물리 공격합니다.' },
            'church': { name: '성당', desc: '[ 지원 주기: 60초 ] 아군 1명에게 성스러운 빛을 내려 모든 <strong style="color:var(--retro-amber);">상태이상 및 디버프를 정화</strong>합니다.' },
            'camp': { name: '캠프', desc: '[ 지원 주기: 30초 ] 하늘에서 <strong style="color:white;">바위 🪨</strong>를 떨어뜨려 적에게 피해를 입히고 <strong style="color:var(--retro-red);">기절(Stun)</strong>시킵니다.' },
            'tree': { name: '나무', desc: '[ 지원 주기: 15초 ] 하늘에서 <strong style="color:var(--retro-green);">치유의 과일 🍎</strong>을 떨어뜨려 무작위 아군 1명을 회복시킵니다.' },
            'castle': { name: '성', desc: '[ 지원 주기: 300초 ] 매우 긴 주기마다 하늘에서 희귀한 <strong style="color:var(--retro-blue);">다이아(Diamond) 💎</strong>를 떨어뜨려 드랍합니다.' }
        };

        const options = Object.values(BUILDING_TYPES).map(type => {
            const data = kData[type.id] || { name: type.id, desc: '' };
            const bIcon = ItemManager.getSVGFilename(type.iconId);

            // Just use the raw description string, avoiding the broken unicode regex replacement
            const descWithIcon = data.desc;

            return `
                <div class="build-premium-card" data-type="${type.id}">
                    <div class="build-card-top">
                        <img src="assets/emojis/${bIcon}" style="width:24px; height:24px; image-rendering:pixelated; margin-right:8px;">
                        <span class="build-card-name">${data.name}</span>
                    </div>
                    <div class="build-card-desc">${descWithIcon}</div>
                </div>
            `;
        }).join('');

        const menuHtml = `
            <div class="building-selection-menu">
                <h3 style="margin-top:0; color:var(--retro-amber); text-align:center; font-family:var(--font-pixel); font-size:14px; margin-bottom:15px;">
                    신규 건축 (슬롯 #${slotIndex + 1})
                </h3>
                <div class="build-grid-container">
                    ${options}
                </div>
            </div>
        `;

        this.showPopup(menuHtml);

        // Bind buttons
        const popup = this.popupInner;
        const cards = popup.querySelectorAll('.build-premium-card');
        cards.forEach(card => {
            card.onclick = async () => {
                const typeId = card.dataset.type;
                await buildingManager.addBuilding(typeId, slotIndex);
                this.showToast(`${BUILDING_TYPES[typeId.toUpperCase()].emoji} 건물을 건설했습니다! ✨`);
                this.hidePopup();
            };
        });
    }

    updateBuildingGrid() {
        if (!this.buildingGrid || !buildingManager.slots) return;

        this.buildingGrid.innerHTML = buildingManager.slots.map((slot, i) => {
            if (slot) {
                const config = BUILDING_TYPES[slot.typeId.toUpperCase()];
                const svgName = ItemManager.getSVGFilename(config.iconId);
                return `<div class="building-slot" data-index="${i}" title="Lv.${slot.level}">
                    <div class="building-cooldown-overlay" id="b-cd-${i}"></div>
                    <img src="assets/emojis/${svgName}" draggable="false">
                </div>`;
            } else {
                return `<div class="building-slot empty" data-index="${i}">+</div>`;
            }
        }).join('');
    }

    updateBuildingCooldowns(progresses) {
        if (!this.buildingGrid) return;

        progresses.forEach((p, i) => {
            const overlay = document.getElementById(`b-cd-${i}`);
            if (overlay) {
                // Use height for bottom-to-top filling effect
                const heightVal = Math.floor(p * 100);
                overlay.style.height = `${heightVal}%`;

                // Optionally add a 'ready' state to the parent slot
                if (p >= 0.98) {
                    overlay.parentElement.classList.add('ready');
                } else {
                    overlay.parentElement.classList.remove('ready');
                }
            }
        });
    }

    initEventListeners() {
        EventBus.on('NPC_STACK_UPDATED', () => this.updateNPCHUD());
        EventBus.on('NPC_HIRED', () => this.updateNPCHUD());
        EventBus.on('BUILDING_COOLDOWN_UPDATE', (data) => this.updateBuildingCooldowns(data.progresses));

        EventBus.on('BUILDING_ACTION_TRIGGERED', (data) => {
            const slot = this.buildingGrid?.querySelector(`.building-slot[data-index="${data.slotIndex}"]`);
            if (slot) {
                slot.classList.add('activated');
                setTimeout(() => slot.classList.remove('activated'), 600);
            }
        });

        // Listen for scene changes to show/hide NPC HUD
        EventBus.on(EventBus.EVENTS.SCENE_CHANGED, (sceneKey) => {
            console.log(`[UIManager] SCENE_CHANGED: ${sceneKey}`);
            const isCombat = (sceneKey === 'DungeonScene' || sceneKey === 'RaidScene' || sceneKey === 'ArenaScene');
            const isArena = (sceneKey === 'ArenaScene');

            if (this.npcHud) {
                const npcDisplay = (isCombat && !isArena) ? 'flex' : 'none';
                console.log(`[UIManager] Setting NPC HUD display to: ${npcDisplay}`);
                this.npcHud.style.display = npcDisplay;
                if (isCombat && !isArena) this.updateNPCHUD();
            }

            // Hide Messiah HUD in Arena
            if (this.messiahHud) {
                this.messiahHud.style.display = (isCombat && !isArena) ? 'flex' : 'none';
            }

            // Show Building HUD in Territory, Dungeon, and Raid
            if (this.buildingGrid) {
                const showGrid = (sceneKey === 'TerritoryScene' || sceneKey === 'DungeonScene' || sceneKey === 'RaidScene');
                this.buildingGrid.style.display = showGrid ? 'flex' : 'none';
            }

            // Show/Hide Defense HUD in Dungeon (and others if needed)
            if (this.defenseHud) {
                const showDefense = (sceneKey === 'DungeonScene' || sceneKey === 'RaidScene');
                this.defenseHud.style.display = showDefense ? 'flex' : 'none';
            }

            // Hide Portrait Bar in Non-Combat scenes (like TerritoryScene)
            if (this.portraitBar) {
                if (sceneKey === 'TerritoryScene' || sceneKey === 'GachaScene') {
                    this.portraitBar.classList.add('hidden');
                    this.portraitBar.classList.remove('active');
                }
            }
        });

        if (this.messiahAutoBtn) {
            this.messiahAutoBtn.addEventListener('click', () => {
                const game = this.scene?.game || (this.scene?.scene && this.scene?.scene.game);
                if (game?.messiahManager) {
                    const isAuto = game.messiahManager.toggleAutoMode();
                    if (isAuto) {
                        this.messiahAutoBtn.classList.add('active');
                    } else {
                        this.messiahAutoBtn.classList.remove('active');
                    }
                }
            });
        }
    }

    updateNPCHUD() {
        if (!this.npcHud || !this.npcHudIcon || !this.npcHudStacks) {
            return;
        }

        // Hide NPC HUD in Arena
        const sceneKey = this.scene?.scene?.key || this.scene?.sys?.settings?.key;
        console.log(`[UIManager] updateNPCHUD called. Current Scene: ${sceneKey}`);
        if (sceneKey === 'ArenaScene') {
            console.log('[UIManager] Forcing NPC HUD hide (ArenaScene detected)');
            this.npcHud.style.display = 'none';
            return;
        }

        const hiredNPC = npcManager.getHiredNPC();
        if (hiredNPC) {
            this.npcHudIcon.style.display = 'block';
            this.npcHudIcon.src = hiredNPC.icon;
            this.npcHudStacks.innerText = hiredNPC.currentStacks;
            this.npcHudStacks.style.fontSize = '12px';
            this.npcHud.dataset.tooltip = `${hiredNPC.name} (${hiredNPC.currentStacks} 스택)\n${hiredNPC.description}`;
        } else {
            // Show NONE for empty state
            this.npcHudIcon.style.display = 'none';
            this.npcHudStacks.innerText = 'NONE';
            this.npcHudStacks.style.fontSize = '8px'; // Smaller for NONE text
            this.npcHud.dataset.tooltip = '고용된 NPC가 없습니다.';
        }
    }

    setupDefenseEvents() {
        if (this.defenseHud) {
            this.defenseHud.onclick = (e) => {
                e.stopPropagation();
                this.toggleDefenseDeploymentPanel();
            };
        }

        if (this.btnDefenseClose) {
            this.btnDefenseClose.onclick = () => this.toggleDefenseDeploymentPanel(false);
        }

        if (this.btnExitConstruction) {
            this.btnExitConstruction.onclick = () => {
                const sceneKey = this.scene?.scene?.key || this.scene?.sys?.settings?.key;
                if (sceneKey === 'DungeonScene' && this.scene.isConstructionMode) {
                    this.scene.toggleConstructionMode(null);
                }
            };
        }
    }

    toggleDefenseDeploymentPanel(force = null) {
        if (!this.defenseDeploymentPanel) return;
        const show = (force !== null) ? force : (this.defenseDeploymentPanel.style.display === 'none');

        if (show) {
            this.defenseDeploymentPanel.style.display = 'flex';
            this.refreshDefenseDeploymentPanel();
        } else {
            this.defenseDeploymentPanel.style.display = 'none';
        }
    }

    async refreshDefenseDeploymentPanel() {
        if (!this.defenseDeploymentList) return;
        this.defenseDeploymentList.innerHTML = '<div class="loading-retro">LOADING...</div>';

        const instances = await DBManager.getAllStructureInstances();
        // Filter out already placed ones (if desired) or show status
        // For now, only show those NOT in a dungeon, or allowing re-placement
        // User said: "Once set, the coordinates are saved. Entering again, it stays there."
        // So we only show those WITHOUT a dungeonId or at least those in the inventory.

        // Actually, let's show ALL and mark which ones are "Placed"
        const currentDungeon = this.scene?.dungeonId;

        if (instances.length === 0) {
            this.defenseDeploymentList.innerHTML = '<div class="empty-retro">보유 중인 시설이 없습니다.</div>';
            return;
        }

        this.defenseDeploymentList.innerHTML = instances.map(inst => {
            const baseIdUpper = inst.baseId.toUpperCase();
            const config = StructureStats[baseIdUpper] || Characters[baseIdUpper] || { name: inst.baseId };
            const isPlaced = !!inst.dungeonId;
            const isHere = inst.dungeonId === currentDungeon;

            // Resolve sprite - check StructureStats first, then Characters
            let spriteUrl = `assets/structures/${inst.baseId}_sprite.png`;

            // Specific overrides for known structures with mismatching IDs/Assets
            if (inst.baseId === 'turret_bowgun' || inst.baseId === 'bow_turret') {
                spriteUrl = 'assets/structures/bow_turret_sprite.png';
            }

            let statusTag = '';
            let cardStyle = '';
            if (isHere) {
                statusTag = '<span class="status-badge here">CURRENT</span>';
                cardStyle = 'border-color: #4ade80; background: rgba(74, 222, 128, 0.15);';
            } else if (isPlaced) {
                statusTag = `<span class="status-badge placed">${inst.dungeonId}</span>`;
                cardStyle = 'opacity: 0.7; filter: grayscale(0.8); pointer-events: none;';
            }

            return `
                <div class="deployment-card ${isPlaced ? 'is-placed' : ''}" data-id="${inst.id}" style="${cardStyle}">
                    <div class="deployment-card-image-wrap">
                        <img src="${spriteUrl}" class="deployment-card-icon" onerror="this.src='assets/emojis/1f3f9.svg'">
                    </div>
                    <div class="deployment-card-info">
                        <div class="deployment-card-name-row">
                            <span class="deployment-card-name">${config.name}</span>
                            ${statusTag}
                        </div>
                        <div class="deployment-card-id">SERIAL: #${inst.id.slice(-6).toUpperCase()}</div>
                        <div class="deployment-card-stats">STATUS: HP ${inst.currentHp || 1000} / 1000</div>
                    </div>
                    ${!isPlaced ? '<div class="deploy-prompt">DEPLOY ▶</div>' : ''}
                </div>
            `;
        }).join('');

        // Bind clicks
        this.defenseDeploymentList.querySelectorAll('.deployment-card').forEach(card => {
            card.onclick = () => {
                const id = card.dataset.id;
                const inst = instances.find(i => i.id === id);
                if (inst.dungeonId) {
                    this.showToast('이미 다른 곳에 배치된 시설입니다.');
                    return;
                }

                // Select and Enter Construction Mode
                const sceneKey = this.scene?.scene?.key || this.scene?.sys?.settings?.key;
                if (sceneKey === 'DungeonScene') {
                    this.toggleDefenseDeploymentPanel(false);
                    this.scene.toggleConstructionMode(id);
                }
            };
        });
    }

    showConstructionUI() {
        if (this.constructionOverlay) {
            this.constructionOverlay.style.display = 'block';
        }
        // Hide other HUDs to focus
        if (this.portraitBar) this.portraitBar.style.visibility = 'hidden';
        if (this.npcHud) this.npcHud.style.visibility = 'hidden';
        if (this.messiahHud) this.messiahHud.style.visibility = 'hidden';
        if (this.defenseHud) this.defenseHud.style.visibility = 'hidden';
    }

    hideConstructionUI() {
        if (this.constructionOverlay) {
            this.constructionOverlay.style.display = 'none';
        }
        // Restore HUDs
        if (this.portraitBar) this.portraitBar.style.visibility = 'visible';
        if (this.npcHud) this.npcHud.style.visibility = 'visible';
        if (this.messiahHud) this.messiahHud.style.visibility = 'visible';
        if (this.defenseHud) this.defenseHud.style.visibility = 'visible';
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
                this.resetPendingState(); // Start fresh for manual inventory click
                this.showPopup('inventory');
                this.switchInventoryTab('materials');
            };
        }
        if (this.btnParty) {
            this.btnParty.onclick = () => {
                this.resetPendingState(); // Start fresh for manual party click
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
        if (this.btnSettings) {
            this.btnSettings.onclick = () => this.showSettings();
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
        const filterButtons = document.querySelectorAll('.emoji-filter-bar:not(.equip-filter-bar) .filter-btn');
        filterButtons.forEach(btn => {
            btn.onclick = () => {
                const filter = btn.dataset.filter;
                this.setEmojiFilter(filter);
            };
        });

        // Equipment Filter Listeners
        const equipFilterButtons = document.querySelectorAll('.equip-filter-bar .filter-btn');
        equipFilterButtons.forEach(btn => {
            btn.onclick = () => {
                const filter = btn.dataset.equipFilter;
                this.setEquipFilter(filter);
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
                    this.resetPendingState(); // Start fresh for nav-bar popup clicks
                    // IF we are leaving combat for a popup (like Party), stop the combat first
                    if (combatScenes.includes(currentKey)) {
                        this.safeSceneStart('TerritoryScene');
                    }
                    this.showPopup(popupKey);
                }
            };
        });

        // --- NEW: Dungeon Dropdown Logic ---
        const dungeonBtn = document.getElementById('btn-dungeon-main');
        const dungeonDropdown = document.getElementById('dungeon-dropdown');
        const dropdownItems = document.querySelectorAll('.nav-dropdown-item');

        if (dungeonBtn && dungeonDropdown) {
            dungeonBtn.onclick = (e) => {
                e.stopPropagation();
                dungeonDropdown.classList.toggle('show');
            };

            // Close dropdown when clicking elsewhere
            window.addEventListener('click', () => {
                dungeonDropdown.classList.remove('show');
            });
        }

        dropdownItems.forEach(item => {
            item.onclick = (e) => {
                e.stopPropagation();
                const sceneKey = item.dataset.scene;
                const dungeonType = item.dataset.dungeon;
                const currentKey = getActiveKey();

                const partyManager = this.scene?.game?.partyManager;
                if (partyManager && !partyManager.isPartyFull()) {
                    this.showToast("6명의 용병을 편성해주세요");
                    this.showPartyFormation();
                    return;
                }

                if (combatScenes.includes(currentKey)) {
                    this.showConfirm("전투가 진행 중입니다. 정말로 나가시겠습니까?", () => {
                        this.safeSceneStart(sceneKey, { dungeonType });
                    });
                } else {
                    this.safeSceneStart(sceneKey, { dungeonType });
                }
                dungeonDropdown?.classList.remove('show');
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

            // Toggle Building Grid based on scene
            if (this.buildingGrid) {
                const showScenes = ['TerritoryScene', 'DungeonScene', 'RaidScene'];
                const showGrid = showScenes.includes(currentSceneKey);
                console.log(`[UIManager] updateActiveNav toggle visibility. Current: ${currentSceneKey}, showGrid: ${showGrid}`);
                this.buildingGrid.style.display = showGrid ? 'flex' : 'none';
            }
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

    setEquipFilter(filter) {
        this.equipFilter = filter || 'ALL';

        // Update button UI
        const filterButtons = document.querySelectorAll('.equip-filter-bar .filter-btn');
        filterButtons.forEach(btn => {
            if (btn.dataset.equipFilter === this.equipFilter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        this.inventoryDirty = true;
    }

    switchInventoryTab(tab, filter = null) {
        if (tab === 'materials') {
            if (filter) this.setEmojiFilter(filter);
            else this.setEmojiFilter('ALL');
        } else if (tab === 'gear') {
            if (filter) this.setEquipFilter(filter);
            else this.setEquipFilter('ALL');
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

    showPopup(typeOrHtml) {
        if (!this.popupOverlay || !this.popupInner) return;
        this.clearPopupSafe();

        if (typeOrHtml === 'inventory') {
            const invContent = document.getElementById('sidebar-right');
            if (invContent) {
                this.popupInner.appendChild(invContent);
                invContent.style.setProperty('display', 'flex', 'important');
                invContent.style.height = '100%';
                invContent.style.background = 'transparent';
                invContent.style.border = 'none';
                invContent.style.boxShadow = 'none';
            }
        } else if (typeOrHtml === 'party') {
            this.showPartyFormation();
            return;
        } else if (typeof typeOrHtml === 'string' && typeOrHtml.includes('<')) {
            // Literal HTML string
            this.popupInner.innerHTML = typeOrHtml;
        }

        this.popupOverlay.style.display = 'flex';
    }

    showShop() {
        if (this.shopManager) {
            this.shopManager.show();
        }
    }

    async showPetStorage() {
        if (this.petStorageOverlay) return;

        const overlay = document.createElement('div');
        overlay.id = 'pet-storage-overlay';
        overlay.className = 'shop-overlay retro-scanline-overlay pet-storage-overlay';
        this.petStorageOverlay = overlay;

        const partyManager = this.scene?.game?.partyManager;
        const petRoster = partyManager?.playerPetRoster || {};

        overlay.innerHTML = `
            <div class="shop-container pet-storage-container" style="max-width: 900px; width: 95vw;">
                <div class="shop-header" style="background: linear-gradient(to right, #059669, #10b981);">
                    <div class="shop-title">🐾 PET STORAGE (펫 보관함)</div>
                    <button class="shop-close-btn" id="pet-storage-close">✕</button>
                </div>
                
                <div class="shop-body pet-storage-body" id="pet-storage-body">
                    <div class="pet-list-area" id="pet-list-area">
                        <!-- Pet cards go here -->
                    </div>
                    
                    <div class="pet-detail-area" id="pet-detail-area">
                        <div class="pet-empty-detail">펫을<br>선택하세요</div>
                    </div>
                </div>
                
                <div class="shop-footer">
                   <div class="shop-currency" id="pet-meat-display" style="display:flex; align-items:center; gap:6px;"><img src="assets/emojis/1f356.svg" style="width:20px; height:20px;"> 0</div>
                </div>
            </div>
        `;

        document.getElementById('app-container').appendChild(overlay);

        // Close events
        document.getElementById('pet-storage-close').onclick = () => this.hidePetStorage();
        overlay.onclick = (e) => { if (e.target === overlay) this.hidePetStorage(); };

        await this.refreshPetStorage();
    }

    async refreshPetStorage() {
        if (!this.petStorageOverlay) return;

        const listArea = document.getElementById('pet-list-area');
        const partyManager = this.scene?.game?.partyManager;
        const petRoster = partyManager?.playerPetRoster || {};

        const meat = await DBManager.getInventoryItem('emoji_meat');
        const meatDisplay = document.getElementById('pet-meat-display');
        if (meatDisplay) meatDisplay.innerHTML = `<img src="assets/emojis/1f356.svg" style="width:20px; height:20px;"> ${meat ? meat.amount : 0}`;

        let html = '';
        Object.keys(PetStats).forEach(key => {
            const pet = PetStats[key];
            const starData = petRoster[pet.id];

            if (starData) {
                const highestStar = Math.max(...Object.keys(starData).map(Number));
                html += `
                    <div class="pet-card" data-id="${pet.id}" style="background: rgba(255,255,255,0.05); border: 2px solid var(--retro-border); border-radius: 12px; padding: 15px; cursor: pointer; text-align: center; position: relative; min-height: 110px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
                        <div style="position:absolute; top:5px; right:8px; color:#fbbf24; font-weight:bold; font-size:12px; text-shadow: 1px 1px 2px #000;">★${highestStar}</div>
                        <img src="assets/pet/${pet.sprite}.png" style="width: 64px; height: 64px; object-fit: contain; image-rendering: pixelated;">
                        <div style="font-size: 11px; font-weight: bold; color: #fff;">${pet.name}</div>
                    </div>
                `;
            }
        });

        listArea.innerHTML = html;

        // Attach card events
        listArea.querySelectorAll('.pet-card').forEach(card => {
            card.onclick = () => this._renderPetDetail(card.dataset.id);
        });
    }

    async _renderPetDetail(petId) {
        const detailArea = document.getElementById('pet-detail-area');
        const partyManager = this.scene?.game?.partyManager;
        const state = partyManager.getPetState(petId);
        const baseConfig = PetStats[petId.toUpperCase()];
        const highestStar = partyManager.getHighestPetStar(petId);
        const cost = partyManager.getPetLevelUpCost(petId, state.level);

        // Scale stats by level and star using centralized utility
        const scaledConfig = scaleStats({ ...baseConfig, star: highestStar }, state.level);

        const currentAtk = scaledConfig.atk;
        const currentMAtk = scaledConfig.mAtk;

        detailArea.innerHTML = `
            <div style="text-align: center; border-bottom: 2px solid rgba(255,255,255,0.1); padding-bottom: 12px; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                <div style="color: #fbbf24; font-size: 16px; font-weight: 900;">★${highestStar} ${baseConfig.name}</div>
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);">
                    <img src="assets/pet/${baseConfig.sprite}.png" style="width: 80px; height: 80px; object-fit: contain; image-rendering: pixelated;">
                </div>
                <div style="color: #6ee7b7; font-size: 13px; font-weight: bold;">LEVEL ${state.level}</div>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
                <div style="display: flex; justify-content: space-between;"><span>공격력</span><span style="color: #ef4444; font-weight: bold;">${currentAtk}</span></div>
                <div style="display: flex; justify-content: space-between;"><span>마법공격력</span><span style="color: #3b82f6; font-weight: bold;">${currentMAtk}</span></div>
                <div style="display: flex; justify-content: space-between;"><span>이동속도</span><span>${scaledConfig.speed}</span></div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px;"><span>공격속도</span><span>${scaledConfig.atkSpd}ms</span></div>
            </div>
            
            <div style="background: rgba(0,0,0,0.5); padding: 12px; border-radius: 8px; font-size: 11px; line-height: 1.5; border-left: 3px solid #10b981;">
                <div style="font-weight: bold; color: #10b981; margin-bottom: 4px;">[특수 패시브: ${baseConfig.passive.name}]</div>
                <div style="color: #d1d5db;">${baseConfig.passive.description}</div>
            </div>
            
            <button id="btn-feed-pet" class="shop-buy-btn" style="width: 100%; margin-top: auto; padding: 12px; height: auto; flex-direction: column; gap: 4px; border-radius: 8px;">
                <div style="font-size: 15px; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 6px;"><img src="assets/emojis/1f356.svg" style="width:18px; height:18px;"> 고기 먹이기</div>
                <div style="font-size: 10px; opacity: 0.9;">(소모: ${cost}개)</div>
            </button>
        `;

        const feedBtn = document.getElementById('btn-feed-pet');
        feedBtn.onclick = async () => {
            const meatItem = await DBManager.getInventoryItem('emoji_meat');
            if (!meatItem || meatItem.amount < cost) {
                this.showToast('몬스터 고기가 부족합니다! 🍖');
                return;
            }

            // Deduct meat
            await DBManager.saveInventoryItem('emoji_meat', meatItem.amount - cost);

            // Level Up
            await partyManager.feedPet(petId);
            this.showToast(`${baseConfig.name} 레벨 업! ✨`);

            // Refresh
            this.refreshPetStorage();
            this._renderPetDetail(petId);
        };
    }

    async showEquipmentCrafting() {
        if (this.equipmentCraftingOverlay) return;

        const overlay = document.createElement('div');
        overlay.id = 'equipment-crafting-overlay';
        overlay.className = 'shop-overlay retro-scanline-overlay equipment-crafting-overlay';
        this.equipmentCraftingOverlay = overlay;

        overlay.innerHTML = `
            <div class="shop-container equipment-crafting-container" style="max-width: 900px; width: 95vw;">
                <div class="shop-header" style="background: linear-gradient(to right, #7c3aed, #a855f7);">
                    <div class="shop-title">⚔️ EQUIPMENT CRAFTING (장비 제작)</div>
                    <button class="shop-close-btn" id="equip-craft-close">✕</button>
                </div>
                
                <div class="shop-body equipment-crafting-body" id="equip-craft-body" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 20px;">
                    <div class="craft-recipe-area" style="border-right: 1px solid rgba(255,255,255,0.1); padding-right: 15px;">
                        <div style="font-size: 14px; font-weight: bold; margin-bottom: 12px; color: #a78bfa;">[제작 가능 목록]</div>
                        <div id="craft-recipe-list" style="display: flex; flex-direction: column; gap: 10px;">
                            <!-- Recipes go here -->
                        </div>
                    </div>
                    
                    <div class="owned-equipment-area">
                        <div style="font-size: 14px; font-weight: bold; margin-bottom: 12px; color: #a78bfa;">[보유 중인 성장 장비]</div>
                        <div id="owned-equip-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 10px; max-height: 400px; overflow-y: auto; padding: 5px;">
                            <!-- Owned instances go here -->
                        </div>
                    </div>
                </div>
                
                <div class="shop-footer" style="display: flex; justify-content: space-between; align-items: center; padding: 15px;">
                    <div class="shop-currency" id="craft-material-display" style="display:flex; align-items:center; gap:10px;">
                        <!-- Materials like wood will be shown here -->
                    </div>
                    <div style="font-size: 11px; opacity: 0.7; color: #d1d5db;">* 무기는 데미지를 입힐 때, 방어구는 데미지를 받을 때 성장합니다.</div>
                </div>
            </div>
        `;

        const appContainer = document.getElementById('app-container') || document.body;
        appContainer.appendChild(overlay);

        // Close events
        const closeBtn = document.getElementById('equip-craft-close');
        if (closeBtn) closeBtn.onclick = () => this.hideEquipmentCrafting();
        overlay.onclick = (e) => { if (e.target === overlay) this.hideEquipmentCrafting(); };

        await this.refreshEquipmentCrafting();
    }

    hideEquipmentCrafting() {
        if (this.equipmentCraftingOverlay) {
            this.equipmentCraftingOverlay.remove();
            this.equipmentCraftingOverlay = null;
        }
    }

    async showDefenseManagement() {
        if (this.defenseManagementOverlay) return;

        const overlay = document.createElement('div');
        overlay.id = 'defense-management-overlay';
        overlay.className = 'shop-overlay retro-scanline-overlay defense-management-overlay';
        this.defenseManagementOverlay = overlay;

        overlay.innerHTML = `
            <div class="shop-container defense-management-container" style="max-width: 900px; width: 95vw;">
                <div class="shop-header" style="background: linear-gradient(to right, #10b981, #059669);">
                    <div class="shop-title">🛡️ DEFENSE STRUCTURES (방어 시설 관리)</div>
                    <button class="shop-close-btn" id="defense-manage-close">✕</button>
                </div>
                
                <div class="shop-body defense-management-body" id="defense-manage-body" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 20px;">
                    <div class="craft-recipe-area" style="border-right: 1px solid rgba(255,255,255,0.1); padding-right: 15px;">
                        <div style="font-size: 14px; font-weight: bold; margin-bottom: 12px; color: #34d399;">[설치 가능 시설물]</div>
                        <div id="defense-recipe-list" style="display: flex; flex-direction: column; gap: 10px;">
                            <!-- Recipes go here -->
                        </div>
                    </div>
                    
                    <div class="owned-defense-area">
                        <div style="font-size: 14px; font-weight: bold; margin-bottom: 12px; color: #34d399;">[보유 중인 시설물 인벤토리]</div>
                        <div id="owned-defense-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 10px; max-height: 400px; overflow-y: auto; padding: 5px;">
                            <!-- Owned items go here -->
                        </div>
                    </div>
                </div>
                
                <div class="shop-footer" style="display: flex; justify-content: space-between; align-items: center; padding: 15px;">
                    <div class="shop-currency" id="defense-material-display" style="display:flex; align-items:center; gap:15px;">
                        <!-- Materials like wood and bone will be shown here -->
                    </div>
                    <div style="font-size: 11px; opacity: 0.7; color: #d1d5db;">* 시설물은 던전에 입장한 후 원하는 위치에 고정하여 설치할 수 있습니다.</div>
                </div>
            </div>
        `;

        const appContainer = document.getElementById('app-container') || document.body;
        appContainer.appendChild(overlay);

        // Close events
        const closeBtn = document.getElementById('defense-manage-close');
        if (closeBtn) closeBtn.onclick = () => this.hideDefenseManagement();
        overlay.onclick = (e) => { if (e.target === overlay) this.hideDefenseManagement(); };

        await this.refreshDefenseManagement();
    }

    hideDefenseManagement() {
        if (this.defenseManagementOverlay) {
            this.defenseManagementOverlay.remove();
            this.defenseManagementOverlay = null;
        }
    }

    async refreshDefenseManagement() {
        if (!this.defenseManagementOverlay) return;

        const recipeList = document.getElementById('defense-recipe-list');
        const ownedList = document.getElementById('owned-defense-list');
        const materialDisplay = document.getElementById('defense-material-display');

        if (!recipeList || !ownedList || !materialDisplay) return;

        // 1. Materials
        const wood = await DBManager.getInventoryItem('emoji_wood');
        const bone = await DBManager.getInventoryItem('emoji_bone');
        materialDisplay.innerHTML = `
            <div style="display:flex; align-items:center; gap:5px; color: #fff; font-weight: bold;"><img src="assets/emojis/1fab5.svg" style="width:20px; height:20px;"> ${wood ? wood.amount : 0}</div>
            <div style="display:flex; align-items:center; gap:5px; color: #fff; font-weight: bold;"><img src="assets/emojis/1f9b4.svg" style="width:20px; height:20px;"> ${bone ? bone.amount : 0}</div>
        `;

        // 2. Recipes
        const recipes = [
            { id: 'turret_bowgun', req: { emoji_wood: 2000, emoji_bone: 1000 } }
        ];

        let recipeHtml = '';
        for (const r of recipes) {
            const item = ItemManager.getItem(r.id);
            const hasWood = wood && wood.amount >= r.req.emoji_wood;
            const hasBone = bone && bone.amount >= r.req.emoji_bone;
            const canCraft = hasWood && hasBone;
            const iconUrl = item.customAsset || 'assets/emojis/' + ItemManager.getSVGFilename(r.id);

            recipeHtml += `
                <div class="craft-card" data-id="${r.id}" 
                     style="background: rgba(0,0,0,0.3); border: 2px solid #059669; border-radius: 12px; padding: 12px; display: flex; align-items: center; gap: 15px; position: relative; overflow: hidden; transition: all 0.2s ease;">
                    <div class="retro-scanline-overlay" style="pointer-events: none;"></div>
                    <img src="${iconUrl}" style="width: 48px; height: 48px; object-fit: contain; image-rendering: pixelated; background: rgba(255,255,255,0.05); border-radius: 8px; padding: 4px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="flex: 1;">
                        <div style="font-weight: bold; font-size: 14px; color: #fff;">${item.name}</div>
                        <div style="font-size: 10px; color: #34d399; margin-bottom: 4px;">${item.description}</div>
                        <div style="font-size: 11px; color: #d1d5db; display: flex; align-items: center; gap: 8px;">
                            <span style="display:flex; align-items:center; gap:2px; color: ${hasWood ? '#fff' : '#ef4444'}"><img src="assets/emojis/1fab5.svg" style="width:12px; height:12px;"> ${r.req.emoji_wood}</span>
                            <span style="display:flex; align-items:center; gap:2px; color: ${hasBone ? '#fff' : '#ef4444'}"><img src="assets/emojis/1f9b4.svg" style="width:12px; height:12px;"> ${r.req.emoji_bone}</span>
                        </div>
                    </div>
                    <button class="shop-buy-btn defense-craft-btn" data-id="${r.id}" ${canCraft ? '' : 'disabled'} 
                            style="padding: 8px 15px; font-size: 12px; height: auto; background: ${canCraft ? 'linear-gradient(to bottom, #10b981, #059669)' : '#333'}; opacity: ${canCraft ? 1 : 0.5}; cursor: ${canCraft ? 'pointer' : 'not-allowed'}; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); color: #fff; font-weight: bold;">제작</button>
                </div>
            `;
        }
        recipeList.innerHTML = recipeHtml;

        // Bind craft buttons
        recipeList.querySelectorAll('.defense-craft-btn').forEach(btn => {
            btn.onclick = async (e) => {
                const itemId = btn.dataset.id;
                const recipe = recipes.find(r => r.id === itemId);

                // Deduct materials
                const currentWood = await DBManager.getInventoryItem('emoji_wood');
                const currentBone = await DBManager.getInventoryItem('emoji_bone');

                if (currentWood && currentWood.amount >= recipe.req.emoji_wood &&
                    currentBone && currentBone.amount >= recipe.req.emoji_bone) {
                    await DBManager.saveInventoryItem('emoji_wood', currentWood.amount - recipe.req.emoji_wood);
                    await DBManager.saveInventoryItem('emoji_bone', currentBone.amount - recipe.req.emoji_bone);

                    // Create UNIQUE structure instance
                    const instanceId = `str_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                    await DBManager.saveStructureInstance({
                        id: instanceId,
                        baseId: itemId,
                        level: 1,
                        createdAt: Date.now()
                    });

                    this.showToast(`${ItemManager.getItem(itemId).name} 제작 성공! 🛡️`);
                    await this.refreshDefenseManagement();
                    if (this.refreshInventory) this.refreshInventory();
                } else {
                    this.showToast('재료가 부족합니다!');
                }
            };
        });

        // 3. Owned Structures (Fetch from structure_instances table)
        const structures = await DBManager.getAllStructureInstances();

        let ownedHtml = '';
        if (structures.length === 0) {
            ownedHtml = `<div style="grid-column: 1/-1; text-align: center; opacity: 0.4; padding: 40px; font-size: 12px; color: #fff;">보유 중인 시설물이 없습니다.</div>`;
        } else {
            // Sort by newest first
            structures.sort((a, b) => b.createdAt - a.createdAt);

            for (const s of structures) {
                const base = ItemManager.getItem(s.baseId);
                if (!base) continue;

                const iconUrl = base.customAsset || 'assets/emojis/' + ItemManager.getSVGFilename(s.baseId);
                const shortId = s.id.split('_').pop();
                const isInstalled = !!s.dungeonId;

                let statusBadge = '';
                let cardStyle = 'background: rgba(255,255,255,0.05); border: 1px solid rgba(16, 185, 129, 0.3);';

                if (isInstalled) {
                    statusBadge = `<div style="position: absolute; bottom: 5px; right: 5px; background: #3b82f6; color: #fff; font-size: 6px; font-weight: bold; padding: 1px 3px; border-radius: 2px;">${s.dungeonId.replace('_', ' ')}</div>`;
                    cardStyle = 'background: rgba(59, 130, 246, 0.1); border: 1px solid #3b82f6; opacity: 0.9;';
                }

                ownedHtml += `
                    <div class="owned-equip-card structure-instance-card" data-instance-id="${s.id}"
                         style="${cardStyle} border-radius: 8px; padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 5px; position: relative; cursor: pointer;" 
                         title="${base.name}\n${isInstalled ? 'INSTALLED: ' + s.dungeonId : 'IN INVENTORY'}">
                        <div style="position: absolute; top: -5px; right: -5px; background: #10b981; color: #fff; font-size: 7px; font-weight: bold; padding: 1px 4px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.2);">X1</div>
                        <img src="${iconUrl}" style="width: 32px; height: 32px; object-fit: contain; image-rendering: pixelated; filter: drop-shadow(0 0 5px rgba(16, 185, 129, 0.3));">
                        <div style="font-size: 9px; color: #fff; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; font-weight: bold;">${base.name}</div>
                        <div style="font-size: 7px; color: #34d399; opacity: 0.6;">#${shortId}</div>
                        ${statusBadge}
                    </div>
                `;
            }
        }
        ownedList.innerHTML = ownedHtml;
    }

    async refreshEquipmentCrafting() {
        if (!this.equipmentCraftingOverlay) return;

        const recipeList = document.getElementById('craft-recipe-list');
        const ownedList = document.getElementById('owned-equip-list');
        const materialDisplay = document.getElementById('craft-material-display');

        if (!recipeList || !ownedList || !materialDisplay) return;

        // 1. Materials
        const wood = await DBManager.getInventoryItem('emoji_wood');
        materialDisplay.innerHTML = `<div style="display:flex; align-items:center; gap:5px; color: #fff; font-weight: bold;"><img src="assets/emojis/1fab5.svg" style="width:20px; height:20px;"> ${wood ? wood.amount : 0}</div>`;

        // 2. Recipes (Dynamic from ItemManager)
        const allItems = ItemManager.getAllItems();
        const recipes = [];
        for (const id in allItems) {
            if (allItems[id].type === ITEM_TYPES.EQUIPMENT) {
                recipes.push({ id, req: { emoji_wood: 500 } });
            }
        }

        // Set default filter if none selected
        if (!this.currentCraftFilter && recipes.length > 0) {
            this.currentCraftFilter = recipes[0].id;
        }

        let recipeHtml = '';
        for (const r of recipes) {
            const item = ItemManager.getItem(r.id);
            const canCraft = wood && wood.amount >= r.req.emoji_wood;
            const iconUrl = item.customAsset || 'assets/emojis/' + ItemManager.getSVGFilename(r.id);
            const isSelected = this.currentCraftFilter === r.id;

            recipeHtml += `
                <div class="craft-card ${isSelected ? 'selected' : ''}" data-id="${r.id}" 
                     style="background: ${isSelected ? 'rgba(124, 58, 237, 0.2)' : 'rgba(0,0,0,0.3)'}; 
                            border: 2px solid ${isSelected ? '#a78bfa' : '#5b21b6'}; 
                            box-shadow: ${isSelected ? '0 0 15px rgba(167, 139, 250, 0.4)' : 'none'};
                            border-radius: 12px; padding: 12px; display: flex; align-items: center; gap: 15px; 
                            position: relative; overflow: hidden; cursor: pointer; transition: all 0.2s ease;">
                    <div class="retro-scanline-overlay" style="pointer-events: none;"></div>
                    <img src="${iconUrl}" style="width: 48px; height: 48px; object-fit: contain; image-rendering: pixelated; background: rgba(255,255,255,0.05); border-radius: 8px; padding: 4px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="flex: 1;">
                        <div style="font-weight: bold; font-size: 14px; color: #fff;">${item.name}</div>
                        <div style="font-size: 11px; color: #a78bfa; display: flex; align-items: center; gap: 4px;">재료: <img src="assets/emojis/1fab5.svg" style="width:14px; height:14px;"> ${r.req.emoji_wood}</div>
                    </div>
                    <button class="shop-buy-btn craft-btn" data-id="${r.id}" ${canCraft ? '' : 'disabled'} style="padding: 8px 15px; font-size: 12px; height: auto; background: ${canCraft ? 'linear-gradient(to bottom, #7c3aed, #5b21b6)' : '#333'}; opacity: ${canCraft ? 1 : 0.5}; cursor: ${canCraft ? 'pointer' : 'not-allowed'}; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); color: #fff; font-weight: bold;">제작</button>
                    ${isSelected ? '<div style="position: absolute; top: 5px; right: 5px; color: #a78bfa; font-size: 10px;">★</div>' : ''}
                </div>
            `;
        }
        recipeList.innerHTML = recipeHtml;

        // Bind recipe card selection & craft buttons
        recipeList.querySelectorAll('.craft-card').forEach(card => {
            card.onclick = (e) => {
                // If button was clicked, don't trigger filter (craftItem handled below)
                if (e.target.classList.contains('craft-btn')) return;

                const id = card.dataset.id;
                this.currentCraftFilter = id;
                this.refreshEquipmentCrafting();
            };

            const btn = card.querySelector('.craft-btn');
            btn.onclick = async (e) => {
                e.stopPropagation(); // Prevent card click
                const itemId = btn.dataset.id;
                const result = await equipmentManager.craftItem(itemId);
                if (result.success) {
                    this.showToast(`${ItemManager.getItem(itemId).name} 제작 성공! ✨`);
                    this.refreshEquipmentCrafting();
                } else {
                    this.showToast(result.reason);
                }
            };
        });

        // 3. Owned Instances (Filtered by selection)
        let instances = await DBManager.getAllEquipmentInstances();

        // Apply filter if exists
        if (this.currentCraftFilter) {
            instances = instances.filter(inst => inst.itemId === this.currentCraftFilter);
        }

        let ownedHtml = '';
        if (instances.length === 0) {
            ownedHtml = `<div style="grid-column: 1/-1; text-align: center; opacity: 0.4; padding: 40px; font-size: 12px; color: #fff;">
                ${this.currentCraftFilter ? ItemManager.getItem(this.currentCraftFilter).name + ' ' : ''}보유 인벤토리가 비어있습니다.
            </div>`;
        } else {
            // Sort by level descending
            instances.sort((a, b) => b.level - a.level);

            for (const inst of instances) {
                const base = ItemManager.getItem(inst.itemId);
                const iconUrl = base.customAsset || 'assets/emojis/' + ItemManager.getSVGFilename(inst.itemId);

                // Show ownership label
                const ownerLabel = inst.ownerId ?
                    `<div style="font-size: 8px; color: #fbbf24; margin-top: 2px; font-weight: bold; border: 1px solid rgba(251, 191, 36, 0.5); padding: 1px 3px; border-radius: 3px; background: rgba(0,0,0,0.3); display: inline-block;">장착 중: ${inst.ownerId}</div>` :
                    `<div style="font-size: 8px; color: #10b981; margin-top: 2px; font-weight: bold;">[보유 중]</div>`;

                ownedHtml += `
                    <div class="owned-equip-card" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(167, 139, 250, 0.3); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: help; position: relative;" title="${base.name} LV.${inst.level}">
                        <div style="position: absolute; top: -5px; right: -5px; background: #7c3aed; color: #fff; font-size: 8px; font-weight: bold; padding: 2px 5px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.3);">LV.${inst.level}</div>
                        <img src="${iconUrl}" style="width: 32px; height: 32px; object-fit: contain; image-rendering: pixelated; filter: drop-shadow(0 0 5px rgba(124, 58, 237, 0.5));">
                        <div style="font-size: 9px; color: #fff; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; font-weight: bold;">${base.name}</div>
                        ${ownerLabel}
                    </div>
                `;
            }
        }
        ownedList.innerHTML = ownedHtml;
    }

    async showNPCHire() {
        if (this.npcHireOverlay) return;

        const overlay = document.createElement('div');
        overlay.id = 'npc-hire-overlay';
        overlay.className = 'shop-overlay retro-scanline-overlay npc-hire-overlay';
        this.npcHireOverlay = overlay;

        overlay.innerHTML = `
            <div class="shop-container npc-hire-container" style="max-width: 800px; width: 90vw;">
                <div class="shop-header" style="background: linear-gradient(to right, #7c3aed, #8b5cf6);">
                    <div class="shop-title">🤝 NPC RECRUITMENT (NPC 고용)</div>
                    <button class="shop-close-btn" id="npc-hire-close">✕</button>
                </div>
                
                <div class="shop-body" style="padding: 20px; display: flex; flex-direction: column; gap: 20px;">
                    <div id="npc-hire-list" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                        <!-- NPC cards will be injected here -->
                    </div>
                </div>
                
                <div class="shop-footer">
                    <div class="shop-currency" id="npc-hire-gold-display" style="display:flex; align-items:center; gap:6px;"><img src="assets/emojis/1fa99.svg" style="width:20px; height:20px;"> 0</div>
                </div>
            </div>
        `;

        document.getElementById('app-container').appendChild(overlay);

        document.getElementById('npc-hire-close').onclick = () => this.hideNPCHire();
        overlay.onclick = (e) => { if (e.target === overlay) this.hideNPCHire(); };

        this.refreshNPCHire();
    }

    async refreshNPCHire() {
        const listContainer = document.getElementById('npc-hire-list');
        const goldDisplay = document.getElementById('npc-hire-gold-display');
        if (!listContainer) return;

        const goldItem = await DBManager.getInventoryItem('emoji_coin');
        if (goldDisplay) goldDisplay.innerHTML = `<img src="assets/emojis/1fa99.svg" style="width:20px; height:20px;"> ${goldItem ? goldItem.amount.toLocaleString() : 0}`;

        const roster = npcManager.roster;
        const activeNPCId = npcManager.activeNPCId;
        let html = '';

        Object.values(npcManager.NPC_DATA).forEach(npc => {
            const ownedNPC = roster[npc.id];
            const isActive = (npc.id === activeNPCId);

            let statusText = '';
            if (ownedNPC) {
                statusText = `<div style="color: #6ee7b7; font-weight: bold; font-size: 11px; margin-top: 4px;">
                    [보유 중: ${ownedNPC.stacks} 스택] ${isActive ? '✅ 활동 중' : ''}
                </div>`;
            }

            html += `
                <div class="npc-hire-card" style="background: rgba(255,255,255,0.05); border: 2px solid ${isActive ? '#fbbf24' : (ownedNPC ? '#6ee7b7' : 'var(--retro-border)')}; border-radius: 12px; padding: 18px; display: flex; gap: 18px; align-items: center; position: relative; transition: all 0.2s;">
                    <div style="background: rgba(0,0,0,0.4); padding: 8px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;">
                        <img src="assets/npc/${npc.sprite}.png" style="width: 70px; height: 70px; object-fit: contain; image-rendering: pixelated;">
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                        <div style="font-size: 15px; font-weight: bold; color: #fbbf24; display: flex; align-items: center; gap: 8px;">
                            ${npc.name}
                            ${isActive ? '<span style="font-size: 9px; background: #fbbf24; color: #000; padding: 1px 4px; border-radius: 3px;">ACTIVE</span>' : ''}
                        </div>
                        <div style="font-size: 10.5px; color: #d1d5db; line-height: 1.4; min-height: 30px;">${npc.description}</div>
                        ${statusText}
                        
                        <div style="display: flex; gap: 8px; margin-top: 8px;">
                            <button class="shop-buy-btn npc-hire-btn" data-id="${npc.id}" style="flex: 2; height: 36px; font-size: 11px;">
                                ${ownedNPC ? `스택 추가 (${npc.cost.toLocaleString()}G)` : `고용하기 (${npc.cost.toLocaleString()}G)`}
                            </button>
                            ${(ownedNPC && !isActive) ? `
                                <button class="shop-buy-btn npc-select-btn" data-id="${npc.id}" style="flex: 1; height: 36px; font-size: 11px; background: #3b82f6; border-color: #60a5fa;">
                                    선택
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        listContainer.innerHTML = html;

        // Hire/Stack Events
        listContainer.querySelectorAll('.npc-hire-btn').forEach(btn => {
            btn.onclick = async () => {
                const npcId = btn.dataset.id;
                const result = await npcManager.hireNPC(npcId);
                this.showToast(result.message);
                if (result.success) {
                    this.refreshNPCHire(); // Refresh UI to show accumulated stacks
                    this.updateNPCHUD();
                    if (this.partyFormationOverlay) this._updateNPCFormationSlot();
                }
            };
        });

        // Select Events
        listContainer.querySelectorAll('.npc-select-btn').forEach(btn => {
            btn.onclick = () => {
                const npcId = btn.dataset.id;
                if (npcManager.selectNPC(npcId)) {
                    this.refreshNPCHire();
                    this.updateNPCHUD();
                    if (this.partyFormationOverlay) this._updateNPCFormationSlot();
                    this.showToast(`${npcManager.NPC_DATA[npcId].name}(을)를 활성화했습니다.`);
                }
            };
        });
    }

    hideNPCHire() {
        if (!this.npcHireOverlay) return;
        this.npcHireOverlay.classList.add('fade-out');
        setTimeout(() => {
            if (this.npcHireOverlay) {
                this.npcHireOverlay.remove();
                this.npcHireOverlay = null;
            }
        }, 300);
    }

    async showMessiahManagement() {
        if (this.messiahOverlay) return;

        const overlay = document.createElement('div');
        overlay.id = 'messiah-overlay';
        overlay.className = 'shop-overlay messiah-overlay retro-scanline-overlay';
        this.messiahOverlay = overlay;

        overlay.innerHTML = `
            <div class="shop-container messiah-container" style="max-width: 900px; width: 95vw; border-color: #fff; box-shadow: 0 0 20px rgba(255,255,255,0.2);">
                <div class="shop-header" style="background: linear-gradient(to right, #334155, #475569, #334155); border-bottom: 2px solid #fff;">
                    <div class="shop-title" style="color: #fff; text-shadow: 0 0 10px rgba(255,255,255,0.8);">✨ MESSIAH POWERS (메시아의 권능)</div>
                    <button class="shop-close-btn" id="messiah-close">✕</button>
                </div>
                
                <div class="shop-body" style="padding: 20px; display: grid; grid-template-columns: 1fr 1.5fr; gap: 20px;">
                    <!-- Messiah Stats -->
                    <div class="messiah-stats-panel" style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 15px;">
                        <div style="font-family: var(--font-pixel); color: #fff; margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">[ MESSIAH STATUS ]</div>
                        <div id="messiah-stats-list" style="display: flex; flex-direction: column; gap: 8px; font-size: 13px;">
                            <!-- Stats injected here -->
                        </div>
                    </div>

                    <!-- Powers List -->
                    <div class="messiah-powers-panel" style="display: flex; flex-direction: column; gap: 15px;">
                        <div id="messiah-powers-list" style="display: flex; flex-direction: column; gap: 10px;">
                            <!-- Powers injected here -->
                        </div>
                    </div>
                </div>
                
                <div class="shop-footer" style="background: rgba(0,0,0,0.6);">
                    <div class="shop-currency" id="messiah-essence-display">✨ 0</div>
                </div>
            </div>
        `;

        document.getElementById('app-container').appendChild(overlay);

        document.getElementById('messiah-close').onclick = () => this.hideMessiahManagement();
        overlay.onclick = (e) => { if (e.target === overlay) this.hideMessiahManagement(); };

        this.refreshMessiahManagement();
    }

    async refreshMessiahManagement() {
        if (!this.messiahOverlay) return;

        const game = this.scene.game || (this.scene.scene && this.scene.scene.game);
        const mm = game?.messiahManager;
        if (!mm) return;

        // Stats Display
        const statsList = document.getElementById('messiah-stats-list');
        const stats = mm.getStats();
        statsList.innerHTML = `
            <div style="display:flex; justify-content:space-between; color:#fbbf24;"><span>LEVEL</span><span>${stats.level}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>ATK</span><span>${stats.atk}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>M.ATK</span><span>${stats.mAtk}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>DEF</span><span>${stats.def}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>CAST SPD</span><span>${stats.castSpd}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>ACC</span><span>${stats.acc}</span></div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px;"><span>CRIT</span><span>${stats.crit}%</span></div>
            <div style="margin-top:10px; font-size:11px; color:#94a3b8; line-height:1.4;">신성한 권능은 메시아의 스탯에 비례하여 위력이 강화됩니다.</div>
        `;

        // Essence Display (using emoji_divine_essence - Divine Essence)
        const essence = await DBManager.getInventoryItem('emoji_divine_essence');
        const essenceDisplay = document.getElementById('messiah-essence-display');
        if (essenceDisplay) essenceDisplay.innerText = `✨ ${essence ? essence.amount : 0}`;

        // Powers List
        const powersList = document.getElementById('messiah-powers-list');
        let powersHtml = '';
        Object.values(mm.powers).forEach(power => {
            const isActive = mm.activePowerId === power.id;
            const upgradeCost = 5 + (power.level - 1) * 3;

            powersHtml += `
                <div class="messiah-power-card ${isActive ? 'active' : ''}" style="background: ${isActive ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.3)'}; border: 1px solid ${isActive ? '#fff' : 'rgba(255,255,255,0.1)'}; border-radius: 8px; padding: 12px; display: flex; align-items: center; justify-content: space-between; gap: 15px;">
                    <div style="font-size: 24px;">${power.emoji}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: bold; font-size: 13px;">${power.name}</div>
                        <div style="font-size: 11px; color: #94a3b8;">Lv.${power.level} | Max Stacks: ${10 + (power.level - 1) * 2}</div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <button class="messiah-select-btn" data-id="${power.id}" style="padding: 4px 8px; font-size: 10px; background: ${isActive ? '#fbbf24' : '#475569'}; border: none; color: #000; border-radius: 4px; cursor: pointer;">
                            ${isActive ? '사용 중' : '선택'}
                        </button>
                        <button class="messiah-upgrade-btn" data-id="${power.id}" style="padding: 4px 8px; font-size: 10px; background: #10b981; border: none; color: #fff; border-radius: 4px; cursor: pointer;">
                            강화 (✨${upgradeCost})
                        </button>
                    </div>
                </div>
            `;
        });
        powersList.innerHTML = powersHtml;

        // Button Events
        powersList.querySelectorAll('.messiah-select-btn').forEach(btn => {
            btn.onclick = () => {
                mm.setActivePower(btn.dataset.id);
                this.refreshMessiahManagement();
                this.showToast(`${mm.powers[btn.dataset.id].name} 선택됨!`);
                this._updateMessiahFormationSlot(); // Update formation slot if open
            };
        });

        powersList.querySelectorAll('.messiah-upgrade-btn').forEach(btn => {
            btn.onclick = async () => {
                const powerId = btn.dataset.id;
                const power = mm.powers[powerId];
                const cost = 5 + (power.level - 1) * 3;

                const essenceItem = await DBManager.getInventoryItem('emoji_divine_essence');
                if (!essenceItem || essenceItem.amount < cost) {
                    this.showToast('전능의 정수가 부족합니다! ✨');
                    return;
                }

                await DBManager.saveInventoryItem('emoji_divine_essence', essenceItem.amount - cost);
                await mm.upgradePower(powerId);
                this.showToast(`${power.name} 강화 완료! ✨`);
                this.refreshMessiahManagement();
                this._updateMessiahFormationSlot(); // Update formation slot if open
            };
        });
    }

    hideMessiahManagement() {
        if (!this.messiahOverlay) return;
        this.messiahOverlay.classList.add('fade-out');
        setTimeout(() => {
            if (this.messiahOverlay) {
                this.messiahOverlay.remove();
                this.messiahOverlay = null;
            }
        }, 300);
    }

    _updateNPCFormationSlot() {
        const npcSlotEl = document.getElementById('formation-npc-slot');
        if (!npcSlotEl) return;

        const activeNPC = npcManager.getActiveNPC();
        if (activeNPC) {
            const npcData = npcManager.getNPCInfo(activeNPC.id);
            const stacksHtml = `<div style="position:absolute; bottom:2px; right:4px; font-size:10px; font-weight:bold; color:#fff; text-shadow:0 1px 2px #000; z-index:10; background:rgba(0,0,0,0.5); padding:0 2px; border-radius:2px;">${activeNPC.stacks}회</div>`;

            npcSlotEl.style.position = 'relative';
            npcSlotEl.innerHTML = `
                ${stacksHtml}
                <img src="assets/npc/${npcData.sprite}.png" style="width: 80%; height: 80%; object-fit: contain;">
            `;
            npcSlotEl.classList.add('filled');
        } else {
            npcSlotEl.innerHTML = 'N';
            npcSlotEl.classList.remove('filled');
        }
    }

    hidePetStorage() {
        if (!this.petStorageOverlay) return;
        this.petStorageOverlay.classList.add('fade-out');
        setTimeout(() => {
            if (this.petStorageOverlay) {
                this.petStorageOverlay.remove();
                this.petStorageOverlay = null;
            }
        }, 300);
    }

    /**
     * Safer scene transition that stops all active scenes to prevent overlapping.
     */
    safeSceneStart(sceneKey, data = null) {
        if (!this.scene) return;

        console.log(`[UIManager] Safe start scene: ${sceneKey}`, data);

        // Robust game/sceneManager access
        const game = this.scene.game || (this.scene.scene && this.scene.scene.game);
        if (!game || !game.scene) {
            console.warn(`[UIManager] Game or SceneManager not found. Direct start.`);
            if (this.scene.scene) this.scene.scene.start(sceneKey, data);
            else if (this.scene.start) this.scene.start(sceneKey, data);
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

        // Scene-aware Building Grid visibility
        if (this.buildingGrid) {
            const showScenes = ['TerritoryScene', 'DungeonScene', 'RaidScene'];
            const showGrid = showScenes.includes(sceneKey);
            console.log(`[UIManager] navigateToScene toggle visibility for ${sceneKey}: ${showGrid}`);
            this.buildingGrid.style.display = showGrid ? 'flex' : 'none';
            if (showGrid) this.updateBuildingGrid(); // Force refresh on entry
        }

        // Start the target scene with data
        game.scene.start(sceneKey, data);

        // Ensure any popups are hidden
        this.hidePopup();

        // Sync nav bar
        if (this.updateActiveNav) setTimeout(() => this.updateActiveNav(), 100);

        // Emit event for UI systems to react to scene changes
        EventBus.emit(EventBus.EVENTS.SCENE_CHANGED, sceneKey);
    }

    async updateDungeonTickets() {
        const ticketInfo = [
            { id: 'UNDEAD_GRAVEYARD', ticketId: 'emoji_ticket' },
            { id: 'SWAMPLAND', ticketId: 'swampland_ticket' }
        ];

        const dropdownItems = document.querySelectorAll('.nav-dropdown-item');
        for (const info of ticketInfo) {
            const ticket = await DBManager.getInventoryItem(info.ticketId);
            const count = ticket ? ticket.amount : 0;

            dropdownItems.forEach(item => {
                if (item.dataset.dungeon === info.id) {
                    let badge = item.querySelector('.dungeon-ticket-badge');
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'dungeon-ticket-badge';
                        item.appendChild(badge);
                    }
                    badge.innerText = `🎫 ${count}`;
                    item.style.opacity = count <= 0 ? '0.5' : '1';
                }
            });
        }
    }

    async updateBestRounds() {
        const dropdownItems = document.querySelectorAll('.nav-dropdown-item');
        for (const item of dropdownItems) {
            const dungeonType = item.dataset.dungeon;
            if (!dungeonType) continue;

            const bestRound = await DBManager.getBestRound(dungeonType);
            if (bestRound > 0) {
                let badge = item.querySelector('.best-round-badge');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'best-round-badge';
                    // Insert before the label (the text node)
                    item.prepend(badge);
                }
                badge.innerText = `🚩 R${bestRound}`;
            }
        }
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
        this.partyViewState = 'MERCE'; // Initial view

        const currentSlots = [...partyManager.getActiveParty()];
        let currentPet = partyManager.getActivePet();

        const renderCandidates = (type) => {
            let candidatesHtml = '';
            if (type === 'MERCE') {
                Object.values(Characters).forEach(char => {
                    const star = partyManager.getHighestStar(char.id);
                    if (star === 0) return; // Not owned
                    const isSelected = currentSlots.includes(char.id);

                    const state = partyManager.getState(char.id);
                    const level = state ? state.level : 1;
                    const starHtml = `<div style="position:absolute; top:4px; right:4px; font-size:10px; font-weight:bold; color:#fbbf24; text-shadow:0 1px 2px #000;">★${star}</div>`;
                    const levelHtml = `<div style="position:absolute; top:4px; left:4px; font-size:10px; font-weight:bold; color:#fff; text-shadow:0 1px 2px #000; background:rgba(0,0,0,0.5); padding:0 2px; border-radius:2px;">Lv.${level}</div>`;
                    candidatesHtml += `
                        <div class="mercenary-card ${isSelected ? 'selected' : ''}" draggable="true" data-id="${char.id}" style="position:relative;">
                            ${starHtml}
                            ${levelHtml}
                            <img src="assets/characters/party/${char.sprite}.png" alt="${char.name}">
                            <div class="merc-name">${char.name.split(' (')[0]}</div>
                        </div>
                    `;
                });
            } else {
                // PET View
                Object.values(PetStats).forEach(pet => {
                    const star = partyManager.getHighestPetStar(pet.id);
                    if (star === 0) return; // Not owned, skip rendering

                    const isSelected = currentPet === pet.id;
                    const petState = partyManager.getPetState(pet.id);
                    const level = petState ? petState.level : 1;
                    const starHtml = `<div style="position:absolute; top:4px; right:4px; font-size:10px; font-weight:bold; color:#fbbf24; text-shadow:0 1px 2px #000;">★${star}</div>`;
                    const levelHtml = `<div style="position:absolute; top:4px; left:4px; font-size:10px; font-weight:bold; color:#fff; text-shadow:0 1px 2px #000; background:rgba(0,0,0,0.5); padding:0 2px; border-radius:2px;">Lv.${level}</div>`;

                    candidatesHtml += `
                        <div class="mercenary-card ${isSelected ? 'selected' : ''}" draggable="true" data-id="${pet.id}" style="position:relative;">
                            ${starHtml}
                            ${levelHtml}
                            <img src="assets/pet/${pet.sprite}.png" alt="${pet.name}">
                            <div class="merc-name">${pet.name}</div>
                        </div>
                    `;
                });
            }
            return candidatesHtml;
        };

        const updateUI = () => {
            const container = overlay.querySelector('.mercenary-candidates');
            container.innerHTML = renderCandidates(this.partyViewState);

            // Re-bind events to cards
            const cards = container.querySelectorAll('.mercenary-card');
            cards.forEach(card => {
                card.addEventListener('dragstart', (e) => e.dataTransfer.setData('sourceId', card.dataset.id));
                card.onclick = () => {
                    const id = card.dataset.id;
                    if (this.partyViewState === 'MERCE') {
                        if (currentSlots.includes(id)) return;
                        let emptyIndex = currentSlots.indexOf(null);
                        if (emptyIndex !== -1) {
                            currentSlots[emptyIndex] = id;
                            updateSlotUI(emptyIndex);
                            updateUI();
                        }
                    } else {
                        // Switch Pet
                        currentPet = id;
                        updatePetSlotUI();
                        updateUI();
                    }
                };
            });

            // Update Toggle Style
            overlay.querySelector('#btn-toggle-merce').classList.toggle('active', this.partyViewState === 'MERCE');
            overlay.querySelector('#btn-toggle-pet').classList.toggle('active', this.partyViewState === 'PET');
        };

        overlay.innerHTML = `
            <div class="party-selection-header" style="width: 100%; display: flex; justify-content: center; gap: 20px; margin-bottom: 20px;">
                <button id="btn-toggle-merce" class="tab-btn active" style="flex: 1; max-width: 150px; font-size: 11px;">[ 용병 ]</button>
                <button id="btn-toggle-pet" class="tab-btn" style="flex: 1; max-width: 150px; font-size: 11px;">[ 펫 ]</button>
            </div>
            
            <div class="party-slots">
                <div class="party-slot" data-slot="0">1</div>
                <div class="party-slot" data-slot="1">2</div>
                <div class="party-slot" data-slot="2">3</div>
                <div class="party-slot" data-slot="3">4</div>
                <div class="party-slot" data-slot="4">5</div>
                <div class="party-slot" data-slot="5">6</div>
            </div>

            <div class="pet-slots-container" style="display: flex; justify-content: center; gap: 15px; margin-bottom: 30px; border: 1px solid var(--retro-border); padding: 10px; background: rgba(0,0,0,0.3); width: 95%; max-width: 500px; position:relative;">
                <div style="position:absolute; top:-10px; left:10px; background:var(--retro-bg); padding:0 5px; font-family:var(--font-pixel); font-size:8px; color:var(--retro-amber);">SUPPORT SLOTS</div>
                <div style="display: flex; flex-direction: column; align-items: center; gap: 5px;">
                    <div style="font-family: var(--font-pixel); font-size: 7px; color: var(--retro-cyan);">PET</div>
                    <div class="party-slot pet-slot" data-type="pet" style="width: 60px; height: 60px; border-style: solid; border-color: var(--retro-cyan);">P</div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; gap: 5px;">
                    <div style="font-family: var(--font-pixel); font-size: 7px; color: #fbbf24;">NPC</div>
                    <div class="party-slot npc-slot" id="formation-npc-slot" style="width: 60px; height: 60px; border-style: solid; border-color: #fbbf24;">N</div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; gap: 5px;">
                    <div style="font-family: var(--font-pixel); font-size: 7px; color: #fff;">MESSIAH</div>
                    <div class="party-slot messiah-slot" id="formation-messiah-slot" style="width: 60px; height: 60px; border-style: solid; border-color: #fff;">M</div>
                </div>
            </div>

            <div class="mercenary-candidates">
                ${renderCandidates('MERCE')}
            </div>
            
            <div style="display: flex; gap: 10px; width: 100%; justify-content: center; margin-top: 10px;">
                <button class="party-confirm-btn" style="flex: 1;">편성 완료</button>
                <button class="party-cancel-btn" style="flex: 0.4; background: rgba(100, 100, 100, 0.6);">취소</button>
            </div>
        `;

        document.body.appendChild(overlay);

        const slotEls = overlay.querySelectorAll('.party-slot:not(.pet-slot)');
        const petSlotEl = overlay.querySelector('.pet-slot');

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
                const state = partyManager.getState(charId);
                const level = state ? state.level : 1;
                const starHtml = star > 0 ? `<div style="position:absolute; bottom:2px; right:4px; font-size:12px; font-weight:bold; color:#fbbf24; text-shadow:0 1px 2px #000; z-index:10;">★${star}</div>` : '';
                const levelHtml = `<div style="position:absolute; top:2px; left:4px; font-size:10px; font-weight:bold; color:#fff; text-shadow:0 1px 2px #000; z-index:10; background:rgba(0,0,0,0.5); padding:0 2px; border-radius:2px;">Lv.${level}</div>`;
                slotEl.style.position = 'relative';
                slotEl.innerHTML = `
                    ${starHtml}
                    ${levelHtml}
                    <img src="assets/characters/party/${char.sprite}.png" alt="${char.name}">
                `;
                slotEl.classList.add('filled');
            } else {
                slotEl.innerHTML = `${index + 1}`;
                slotEl.classList.remove('filled');
            }
        };

        const updatePetSlotUI = () => {
            if (currentPet) {
                const pet = Object.values(PetStats).find(p => p.id === currentPet);
                if (pet) {
                    const star = partyManager.getHighestPetStar(currentPet);
                    const petState = partyManager.getPetState(currentPet);
                    const level = petState ? petState.level : 1;
                    const starHtml = star > 0 ? `<div style="position:absolute; bottom:2px; right:4px; font-size:12px; font-weight:bold; color:#fbbf24; text-shadow:0 1px 2px #000; z-index:10;">★${star}</div>` : '';
                    const levelHtml = `<div style="position:absolute; top:2px; left:4px; font-size:10px; font-weight:bold; color:#fff; text-shadow:0 1px 2px #000; z-index:10; background:rgba(0,0,0,0.5); padding:0 2px; border-radius:2px;">Lv.${level}</div>`;

                    petSlotEl.style.position = 'relative';
                    petSlotEl.innerHTML = `
                        ${starHtml}
                        ${levelHtml}
                        <img src="assets/pet/${pet.sprite}.png" alt="${pet.name}" style="width: 80%; height: 80%;">
                    `;
                    petSlotEl.classList.add('filled');
                    return;
                }
            }
            petSlotEl.innerHTML = 'P';
            petSlotEl.classList.remove('filled');
        };

        // Toggle Listeners
        overlay.querySelector('#btn-toggle-merce').onclick = () => {
            this.partyViewState = 'MERCE';
            updateUI();
        };
        overlay.querySelector('#btn-toggle-pet').onclick = () => {
            this.partyViewState = 'PET';
            updateUI();
        };

        currentSlots.forEach((_, i) => updateSlotUI(i));
        updatePetSlotUI();
        this._updateNPCFormationSlot();
        this._updateMessiahFormationSlot();
        updateUI(); // Bind candidate events

        // Drag & Drop for Mercenary Slots
        slotEls.forEach((slot, i) => {
            slot.addEventListener('dragover', (e) => e.preventDefault());
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('sourceId');
                if (id && this.partyViewState === 'MERCE') {
                    const existingIndex = currentSlots.indexOf(id);
                    if (existingIndex !== -1 && existingIndex !== i) {
                        currentSlots[existingIndex] = null;
                        updateSlotUI(existingIndex);
                    }
                    currentSlots[i] = id;
                    updateSlotUI(i);
                    updateUI();
                }
            });
            slot.onclick = () => {
                currentSlots[i] = null;
                updateSlotUI(i);
                updateUI();
            };
        });

        // Drag & Drop for Pet Slot
        petSlotEl.addEventListener('dragover', (e) => e.preventDefault());
        petSlotEl.addEventListener('drop', (e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData('sourceId');
            if (id && this.partyViewState === 'PET') {
                currentPet = id;
                updatePetSlotUI();
                updateUI();
            }
        });
        petSlotEl.onclick = () => {
            // Can pets be unequipped? The requirement says DogPet is default.
            // Let's allow clearing it if needed, or just keep it.
            // Requirement says "DogPet is equipped by default", maybe we shouldn't allow null if we only have one pet.
            // For now, allow clearing.
            currentPet = null;
            updatePetSlotUI();
            updateUI();
        };

        const confirmBtn = overlay.querySelector('.party-confirm-btn');
        confirmBtn.onclick = async () => {
            currentSlots.forEach((id, i) => partyManager.setPartySlot(i, id));
            await partyManager.setActivePet(currentPet || 'dog_pet');

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

    _updateMessiahFormationSlot() {
        const slotEl = document.getElementById('formation-messiah-slot');
        const game = this.scene.game || (this.scene.scene && this.scene.scene.game);
        const mm = game?.messiahManager;
        if (!slotEl || !mm) return;

        const power = mm.getActivePower();
        const maxStacks = 10 + (power.level - 1) * 2;

        slotEl.style.position = 'relative';
        slotEl.style.display = 'flex';
        slotEl.style.flexDirection = 'column';
        slotEl.style.alignItems = 'center';
        slotEl.style.justifyContent = 'center';

        slotEl.innerHTML = `
            <div style="position:absolute; top:2px; left:4px; font-size:8px; font-weight:bold; color:#fff; text-shadow:0 1px 2px #000; z-index:10; background:rgba(0,0,0,0.5); padding:0 2px; border-radius:2px;">Lv.${power.level}</div>
            <div style="font-size: 28px;">${power.emoji}</div>
            <div style="position:absolute; bottom:2px; right:4px; font-size:8px; font-weight:bold; color:#fff; text-shadow:0 1px 2px #000; z-index:10;">${maxStacks}회</div>
        `;
        slotEl.classList.add('filled');
    }

    hidePopup() {
        if (this.partyFormationOverlay) {
            this.partyFormationOverlay.remove();
            this.partyFormationOverlay = null;
        }

        if (this.popupOverlay) {
            this.detailChannel = null;
            if (this.detailPanel) this.detailPanel.style.display = 'none';

            this.resetPendingState();
            this.viewingInstanceId = null; // Stop tracking real-time updates when closed
            this.clearPopupSafe();
            this.hideTooltip(); // Hide any floating item tooltips
            this.popupOverlay.style.display = 'none';
        }
    }

    isItemEquippedByAny(instanceId) {
        if (!this.channels) return false;
        for (const channel of this.channels) {
            if (channel.equipment) {
                for (const slot in channel.equipment) {
                    const item = channel.equipment[slot];
                    if (!item) continue;
                    const equippedId = (typeof item === 'string') ? item : (item.instanceId || item.id);
                    if (equippedId === instanceId) return true;
                }
            }
        }
        return false;
    }

    handleEquipmentExpUpdated(payload) {
        if (!this.viewingInstanceId || this.viewingInstanceId !== payload.instanceId) return;

        // If we are viewing this item, we should refresh the description area
        // We re-run showItemDetail logic for this item to update the EXP bar and text.
        // Important: Preserve the "isAlreadyEquipped" state so buttons don't flicker.
        const isEquipped = this.isItemEquippedByAny(this.viewingInstanceId);
        this.showItemDetail(this.viewingInstanceId, isEquipped);
    }

    resetPendingState() {
        if (this.pendingGearSlot) {
            if (this.pendingGearSlot.element) {
                this.pendingGearSlot.element.classList.remove('gear-slot-pending');
            }
            this.pendingGearSlot = null;
        }
        if (this.pendingGrimoireSlot) {
            if (this.pendingGrimoireSlot.element) {
                this.pendingGrimoireSlot.element.classList.remove('grim-slot-pending');
            }
            this.pendingGrimoireSlot = null;
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

    updateNPCHUD() {
        if (!this.npcHud || !this.npcHudIcon || !this.npcHudStacks) return;

        const hiredNPC = npcManager.getHiredNPC();
        if (hiredNPC && hiredNPC.currentStacks > 0) {
            // Check Dirty State
            if (this.lastNpcId !== hiredNPC.id || this.lastNpcStacks !== hiredNPC.currentStacks) {
                if (this.lastNpcId !== hiredNPC.id) {
                    this.npcHudIcon.src = hiredNPC.icon;
                    this.lastNpcId = hiredNPC.id;
                }
                this.npcHudStacks.innerText = hiredNPC.currentStacks;
                this.lastNpcStacks = hiredNPC.currentStacks;
                this.npcHud.dataset.tooltip = `${hiredNPC.name} (${hiredNPC.currentStacks} 스택)\n${hiredNPC.description}`;

                if (!this.npcHud.classList.contains('active')) {
                    this.npcHud.classList.add('active');
                }
            }
        } else {
            if (this.npcHud.classList.contains('active')) {
                this.npcHud.classList.remove('active');
                this.lastNpcId = null;
                this.lastNpcStacks = -1;
            }
        }
    }

    updateMessiahHUD() {
        if (!this.messiahHud || !this.messiahHudIcon || !this.messiahHudStacks || !this.messiahCooldownFill) return;

        // Only show in combat scenes (except Arena)
        const sceneKey = this.scene?.scene?.key || this.scene?.sys?.settings?.key;
        const isCombat = (sceneKey === 'DungeonScene' || sceneKey === 'RaidScene' || sceneKey === 'ArenaScene');
        const isArena = (sceneKey === 'ArenaScene');

        if (!isCombat || isArena) {
            if (this.messiahHud) {
                if (this.messiahHud.classList.contains('active')) this.messiahHud.classList.remove('active');
            }
            this.lastMessiahPowerId = null;
            this.lastMessiahStacks = -1;
            return;
        }

        const game = this.scene.game || (this.scene.scene && this.scene.scene.game);
        const mm = game?.messiahManager;
        if (!mm) return;

        const power = mm.getActivePower();
        if (!power) {
            if (this.messiahHud.classList.contains('active')) this.messiahHud.classList.remove('active');
            return;
        }

        if (!this.messiahHud.classList.contains('active')) {
            this.messiahHud.classList.add('active');
        }

        // 1. Power/Emoji/Stacks Dirty Check
        const stackStr = `${mm.stacks}/${mm.maxStacks}`;
        if (this.lastMessiahPowerId !== power.id || this.lastMessiahStacks !== mm.stacks) {
            if (this.lastMessiahPowerId !== power.id) {
                this.messiahHudIcon.innerText = power.emoji;
                this.lastMessiahPowerId = power.id;
            }
            this.messiahHudStacks.innerText = stackStr;
            this.lastMessiahStacks = mm.stacks;
        }

        // 2. Auto Mode Dirty Check
        if (this.lastMessiahAuto !== mm.isAutoMode) {
            if (mm.isAutoMode) {
                this.messiahAutoBtn.classList.add('active');
            } else {
                this.messiahAutoBtn.classList.remove('active');
            }
            this.lastMessiahAuto = mm.isAutoMode;
        }

        // 3. Cooldown Bar (Updates frequently, but only if change > threshold)
        if (mm.stacks >= mm.maxStacks) {
            if (this.lastMessiahCooldown !== 100) {
                this.messiahCooldownFill.style.width = '100%';
                this.lastMessiahCooldown = 100;
            }
        } else {
            const actualCooldown = mm.baseCooldown * (1000 / mm.stats.castSpd);
            const percentage = Math.min(100, Math.max(0, (mm.cooldownTimer / actualCooldown) * 100));

            // Only update DOM if percentage changed significantly (e.g. 0.5%)
            if (Math.abs((this.lastMessiahCooldown || 0) - percentage) > 0.5) {
                this.messiahCooldownFill.style.width = `${percentage.toFixed(1)}%`;
                this.lastMessiahCooldown = percentage;
            }
        }
    }

    updateRoundDisplay(text) {
        if (!this.roundDisplay || !this.roundText) return;

        if (!text) {
            if (this.roundDisplay.classList.contains('active')) {
                this.roundDisplay.classList.remove('active');
                this.lastRoundText = '';
            }
            return;
        }

        // Show if hidden
        if (!this.roundDisplay.classList.contains('active')) {
            this.roundDisplay.classList.add('active');
        }

        // Dirty Flag Check
        if (this.lastRoundText !== text) {
            // Set type attribute for specific styling (e.g., RAID scaling)
            if (text.startsWith('RAID:')) {
                this.roundDisplay.dataset.type = 'raid';
            } else {
                this.roundDisplay.dataset.type = '';
            }

            this.roundText.innerText = text;
            this.lastRoundText = text;

            // Pop Animation
            this.roundText.parentElement.classList.remove('round-pop');
            void this.roundText.parentElement.offsetWidth; // Trigger reflow
            this.roundText.parentElement.classList.add('round-pop');
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

                this.portraitBar.appendChild(portrait);
                cache = this.portraits[portraitKey] = {
                    element: portrait,
                    statusKey: '',
                    hp: -1,
                    ult: -1,
                    lastHpCount: -1,
                    lastHpClass: '',
                    isDead: null,
                    characterId: merc.characterId,
                    dom: {
                        segments: portrait.querySelectorAll('.portrait-hp-segment'),
                        ultFill: portrait.querySelector('.portrait-ult-fill'),
                        ultLabel: portrait.querySelector('.portrait-ult-label'),
                        statusRow: portrait.querySelector('.portrait-status-row'),
                    }
                };
                console.log(`[UIManager] Portrait created (retro-arcade): ${merc.unitName} key=${portraitKey}`);
            }

            // ── RE-BIND CLICK HANDLER EVERY SYNC (Fixes Closure Bug) ───────
            cache.element.onclick = (e) => {
                // Prevent detail popup if clicking the resurrection overlay or button
                if (e.target.closest('.portrait-dead-overlay') || e.target.closest('.portrait-resurrect-btn')) {
                    console.log('[UIManager] Click ignored (overlay/btn target)');
                    return;
                }
                // Prevent detail popup if unit is dead (merc.hp <= 0 or isGhost)
                if (merc.hp <= 0) {
                    console.log(`[UIManager] Click ignored (Unit ${merc.unitName} is dead)`);
                    return;
                }

                const channel = this.unitToChannel[merc.id];
                if (channel) this.showCharacterDetail(channel);
            };

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
                    overlay.onclick = (e) => e.stopPropagation(); // Stop overlay clicks from opening detail

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
                            if (btn.disabled) return;

                            btn.disabled = true;
                            btn.style.opacity = '0.5';
                            btn.style.cursor = 'not-allowed';
                            btn.innerHTML = `<span>부활 중...</span>`;

                            console.log(`[UIManager] Resurrect button clicked for ${merc.unitName} (Cost: ${currentCost}G)`);
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

        // Messiah Cooldown needs continuous update
        this.updateMessiahHUD();

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
            const equipmentInstances = await DBManager.getAllEquipmentInstances();

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

                // If Gear tab, respect the equip filter
                if (itemData.type === 'equipment') {
                    if (this.equipFilter === 'ALL') return true;
                    return itemData.slot === this.equipFilter;
                }

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

            // --- 2. Growth Equipment Instances ---
            const unequippedInstances = equipmentInstances.filter(inst => {
                if (inst.ownerId) return false;
                if (this.equipFilter === 'ALL') return true;
                const itemData = ItemManager.getItem(inst.itemId);
                return itemData && itemData.slot === this.equipFilter;
            });

            unequippedInstances.forEach(inst => {
                const itemData = ItemManager.getItem(inst.itemId);
                if (!itemData) return;

                const filename = ItemManager.getSVGFilename(inst.itemId);
                const div = document.createElement('div');
                div.className = 'inv-item is-gear growth-item';
                div.draggable = true;

                const isEquipped = (targetChannel && targetChannel.equipment && Object.values(targetChannel.equipment).some(e => e && e.instanceId === inst.id));
                if (isEquipped) div.classList.add('equipped');

                div.innerHTML = `
                    <img class="inv-icon" src="${itemData.customAsset || 'assets/emojis/' + filename}" alt="${inst.id}" draggable="false">
                    <div class="item-lv-tag" style="position:absolute; bottom:0; right:0; background:#7c3aed; color:#fff; font-size:8px; padding:1px 3px; border-radius:3px; z-index:1;">LV.${inst.level}</div>
                `;

                div.ondragstart = (e) => {
                    e.dataTransfer.setData('itemId', inst.id);
                    e.dataTransfer.effectAllowed = 'copyMove';
                };

                div.onclick = (e) => {
                    e.stopPropagation();
                    this.handleItemClick(inst.id, isEquipped);
                };

                this.gearList.appendChild(div);
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

    async showItemDetail(itemId, isAlreadyEquipped = false) {
        let item = ItemManager.getItem(itemId);
        let instance = null;

        // If it's a unique instance
        if (itemId.startsWith('eq_')) {
            instance = await DBManager.getEquipmentInstance(itemId);
            if (instance) {
                item = ItemManager.getItem(instance.itemId);
            }
        }

        const charm = CharmManager.getCharm(itemId);

        // Prioritize charm data because it's richer for charms (it has description)
        const targetItem = charm || item;

        console.log(`[UIManager] showItemDetail: itemId=${itemId}, autoEquip=${isAlreadyEquipped}`, { hasItem: !!item, hasCharm: !!charm });

        if (!targetItem || !this.detailPanel) return;

        this.selectedItemId = itemId;

        const title = instance ? `${targetItem.name} LV.${instance.level}` : targetItem.name;
        if (this.detailName) this.detailName.textContent = title;

        // Reset Equip Button State
        if (this.btnEquipItem) {
            if (isAlreadyEquipped) {
                this.btnEquipItem.innerText = '장착 해제';
                this.btnEquipItem.style.opacity = '1';
                this.btnEquipItem.style.pointerEvents = 'auto'; // Enable click for toggle unequip
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
            let descContent = targetItem.description || (item ? '재료 아이템입니다.' : '');
            if (instance) {
                this.viewingInstanceId = instance.id;
                const info = equipmentManager.getDisplayInfo(instance);

                // Add Visual EXP Bar
                const progress = (info.expInLevel / info.requiredExp) * 100;
                const expBarHtml = `
                    <div class="exp-section">
                        <div class="exp-bar-container">
                            <div class="exp-bar-fill" style="width: ${progress}%"></div>
                            <div class="exp-text">${info.expInLevel.toLocaleString()} / ${info.requiredExp.toLocaleString()}</div>
                        </div>
                    </div>
                `;

                descContent = info.description + expBarHtml;
            } else {
                this.viewingInstanceId = null;
                if (targetItem.type === 'equipment' && targetItem.stats) {
                    // For non-growth equipment (test weapons), show dummy stats
                    let dummyStats = '\n\n[장착 효과]';
                    Object.keys(targetItem.stats).forEach(k => {
                        dummyStats += `\n- ${k.toUpperCase()}: +${targetItem.stats[k]}`;
                    });
                    descContent += dummyStats;
                }
            }
            this.detailDesc.innerHTML = descContent + classReqText;
        }

        // Disable equip button if class mismatch OR if viewing from general inventory (no pending slot)
        const isBrowsingGeneral = !this.pendingGearSlot && !this.pendingGrimoireSlot;

        if (this.btnEquipItem) {
            if (isAlreadyEquipped) {
                // If already equipped, we allow "Unequip" only if we came from a slot click or if we want to allow unequip from anywhere
                // User asked to disable [장착] button in general inventory. Usually unequip is also part of that action button.
                if (isBrowsingGeneral) {
                    this.btnEquipItem.style.opacity = '0.3';
                    this.btnEquipItem.style.pointerEvents = 'none';
                } else {
                    this.btnEquipItem.style.opacity = '1';
                    this.btnEquipItem.style.pointerEvents = 'auto';
                }
            } else {
                if (!canEquip || isBrowsingGeneral) {
                    this.btnEquipItem.innerText = isBrowsingGeneral ? '장착 (슬롯 선택 필요)' : '장착 불가';
                    this.btnEquipItem.style.opacity = '0.3';
                    this.btnEquipItem.style.pointerEvents = 'none';
                } else {
                    this.btnEquipItem.innerText = '장착';
                    this.btnEquipItem.style.opacity = '1';
                    this.btnEquipItem.style.pointerEvents = 'auto';
                }
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

        const isGrowthGear = itemId && itemId.startsWith('eq_');

        if ((item && item.type === 'equipment') || isGrowthGear) {
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

    showStatusTooltip(status, targetEl) {
        if (!status || !targetEl) return;

        // 1. Create or reuse tooltip element
        let tooltip = document.getElementById('status-tooltip-popup');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'status-tooltip-popup';
            tooltip.className = 'status-popup-tab';
            document.getElementById('app-container').appendChild(tooltip);
        }

        // 2. Populate content
        tooltip.innerHTML = `
            <div class="status-popup-header">
                <span class="status-popup-emoji">${status.emoji || '✨'}</span>
                <span class="status-popup-title">${status.name}</span>
            </div>
            <div class="status-popup-desc">${status.description}</div>
        `;

        // 3. Position tooltip
        const rect = targetEl.getBoundingClientRect();
        const containerRect = document.getElementById('app-container').getBoundingClientRect();

        // Initial Position: Above the icon by default
        tooltip.style.display = 'block';
        tooltip.style.visibility = 'hidden'; // Hide while measuring

        // Measure tooltip
        const tooltipWidth = tooltip.offsetWidth;
        const tooltipHeight = tooltip.offsetHeight;

        // Base horizontal center
        let centerX = (rect.left - containerRect.left) + (rect.width / 2);
        // Base top (above icon)
        let baseY = (rect.top - containerRect.top) - 10;

        // Clamp Horizontal (Left/Right)
        let finalLeft = centerX - (tooltipWidth / 2);
        const minLeft = 10;
        const maxLeft = containerRect.width - tooltipWidth - 10;
        finalLeft = Math.max(minLeft, Math.min(maxLeft, finalLeft));

        // Clamp Vertical (Top) - If it goes off top, move it below the icon
        let finalTop = baseY - tooltipHeight;
        if (finalTop < 5) {
            // Move below the icon: rect.bottom + 10 padding
            finalTop = (rect.bottom - containerRect.top) + 10;
        }

        // Apply final coordinates WITHOUT transform translate
        tooltip.style.left = `${finalLeft}px`;
        tooltip.style.top = `${finalTop}px`;
        tooltip.style.transform = 'none'; // Clear any centering transform
        tooltip.style.visibility = 'visible';


        // 4. Auto-hide logic
        const hideTooltip = (e) => {
            if (e && e.target && (targetEl.contains(e.target) || tooltip.contains(e.target))) {
                return; // Don't hide if clicking the icon or the tooltip itself
            }
            tooltip.style.display = 'none';
            document.removeEventListener('mousedown', hideTooltip);
            document.removeEventListener('touchstart', hideTooltip);
        };

        // Delay attaching to avoid immediate closing from the same click
        setTimeout(() => {
            document.addEventListener('mousedown', hideTooltip);
            document.addEventListener('touchstart', hideTooltip);
        }, 10);

        console.log(`[UIManager] Showed status tooltip: ${status.name}`);
    }


    setupSettingsEvents() {
        if (this.btnSettings) {
            this.btnSettings.onclick = () => this.showSettings();
        }
    }

    showSettings() {
        if (!this.popupOverlay) return;

        import('../Core/SoundEffects.js').then(module => {
            const sfx = module.default;

            // Current BGM Volume (from Phaser)
            const currentBgmVol = (this.scene && this.scene.sound.volume) || 0.5;
            const currentSfxVol = sfx.sfxVolume;

            const modalHtml = `
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
                                <span class="slider round"></span>
                            </label>
                        </div>
                    </div>

                    <!-- Battery Saver -->
                    <div class="settings-row">
                        <div class="settings-label-row">
                            <span class="settings-label">방치 모드 (Battery Saver)</span>
                            <label class="switch">
                                <input type="checkbox" id="check-battery-saver" ${localStorage.getItem('batterySaver') === 'true' ? 'checked' : ''}>
                                <span class="slider round"></span>
                            </label>
                        </div>
                    </div>

                    <!-- Resource Animation Toggle -->
                    <div class="settings-row">
                        <div class="settings-label-row">
                            <span class="settings-label">자원 생산 애니메이션 효과</span>
                            <label class="switch">
                                <input type="checkbox" id="toggle-production-anim" ${this.showProductionAnim ? 'checked' : ''}>
                                <span class="slider round"></span>
                            </label>
                        </div>
                    </div>

                    <div style="margin-top: 20px; text-align: center; font-size: 9px; color: #666; font-family: 'Press Start 2P';">
                        VERSION 5.0.0
                    </div>
                </div>
            `;

            this.showPopup(modalHtml);

            // SFX Listeners
            const sfxSlider = document.getElementById('slider-sfx-vol');
            const sfxMuteBtn = document.getElementById('btn-mute-sfx');
            const sfxValText = document.getElementById('sfx-vol-val');

            if (sfxSlider) {
                sfxSlider.oninput = (e) => {
                    const vol = parseFloat(e.target.value);
                    sfx.setSFXVolume(vol);
                    sfxValText.innerText = `${Math.round(vol * 100)}%`;
                };
            }

            if (sfxMuteBtn) {
                sfxMuteBtn.onclick = () => {
                    const isMuted = !sfx.sfxMuted;
                    sfx.setSFXMuted(isMuted);
                    sfxMuteBtn.classList.toggle('active', isMuted);
                };
            }

            // BGM Listeners
            const bgmSlider = document.getElementById('slider-bgm-vol');
            const bgmMuteBtn = document.getElementById('btn-mute-bgm');
            const bgmValText = document.getElementById('bgm-vol-val');

            if (bgmSlider) {
                bgmSlider.oninput = (e) => {
                    const vol = parseFloat(e.target.value);
                    if (this.scene) {
                        this.scene.sound.setVolume(vol);
                        localStorage.setItem('bgmVolume', vol);
                    }
                    bgmValText.innerText = `${Math.round(vol * 100)}%`;
                };
            }

            if (bgmMuteBtn) {
                bgmMuteBtn.onclick = () => {
                    const isMuted = this.scene ? !this.scene.sound.mute : false;
                    if (this.scene) {
                        this.scene.sound.setMute(isMuted);
                        localStorage.setItem('bgmMuted', isMuted);
                    }
                    bgmMuteBtn.classList.toggle('active', isMuted);
                };
            }

            // Vibration Listener
            const vibCheck = document.getElementById('check-vibration');
            if (vibCheck) {
                vibCheck.onchange = (e) => {
                    sfx.setVibrationEnabled(e.target.checked);
                };
            }

            // Battery Saver Listener
            const batteryCheck = document.getElementById('check-battery-saver');
            if (batteryCheck) {
                batteryCheck.onchange = (e) => {
                    const enabled = e.target.checked;
                    localStorage.setItem('batterySaver', enabled);
                    EventBus.emit(EventBus.EVENTS.BATTERY_SAVER_TOGGLED, enabled);
                    if (this.showToast) {
                        this.showToast(enabled ? '방치 모드 활성화 (성능 우선) 🔋' : '방치 모드 비활성화 (품질 우선) ✨');
                    }
                };
            }

            // Animation Toggle Listener
            const animCheck = document.getElementById('toggle-production-anim');
            if (animCheck) {
                animCheck.onchange = (e) => {
                    this.showProductionAnim = e.target.checked;
                    this.saveSettings();
                    this.showToast(this.showProductionAnim ? '애니메이션 효과 활성화 ✨' : '애니메이션 효과 비활성화 💨');
                };
            }
        });
    }

    destroy() {
        this.destroyed = true;
    }

    async loadSettings() {
        try {
            const settings = await DBManager.get('settings', 'game_preferences');
            if (settings) {
                this.showProductionAnim = settings.showProductionAnim !== undefined ? settings.showProductionAnim : true;
                console.log('[UIManager] Settings loaded:', settings);
            }
        } catch (err) {
            console.error('[UIManager] Error loading settings:', err);
        }
    }

    async saveSettings() {
        try {
            await DBManager.save('settings', 'game_preferences', {
                showProductionAnim: this.showProductionAnim
            });
            console.log('[UIManager] Settings saved');
        } catch (err) {
            console.error('[UIManager] Error saving settings:', err);
        }
    }

    /**
     * Show a centered splash message (Victory, Defeat, etc.) using DOM
     */
    showSplashMessage(text, color = '#FFD700', duration = 3000) {
        const overlay = document.createElement('div');
        overlay.id = 'splash-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.5);
            pointer-events: none;
            z-index: 10000;
            color: ${color};
            font-family: 'Outfit', sans-serif;
            font-size: 80px;
            font-weight: 900;
            text-shadow: 0 0 10px rgba(0,0,0,0.5), 0 0 20px ${color};
            white-space: nowrap;
            opacity: 0;
            transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            text-transform: uppercase;
            letter-spacing: 5px;
        `;
        overlay.innerText = text;
        document.body.appendChild(overlay);

        // Animate in
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            overlay.style.transform = 'translate(-50%, -50%) scale(1)';
        });

        // Animate out
        setTimeout(() => {
            overlay.style.opacity = '0';
            overlay.style.transform = 'translate(-50%, -51%) scale(1.1)';
            setTimeout(() => overlay.remove(), 500);
        }, duration - 500);
    }

    /**
     * Shows a dramatic ultimate cutscene using the DOM to avoid Phaser camera issues.
     * Optimized with pooling to reuse the same elements.
     */
    showUltimateCutscene(unitId, skillName, duration = 3000) {
        return new Promise((resolve) => {
            // Lazy-initialize the cutscene UI elements (Pooling)
            if (!this.ultimateCutsceneUI) {
                const container = document.createElement('div');
                container.id = 'ultimate-cutscene-overlay';
                container.style.cssText = `
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.7);
                    z-index: 10000;
                    pointer-events: none;
                    overflow: hidden;
                    display: none;
                    opacity: 0;
                    transition: opacity 0.3s ease-out;
                `;

                const sprite = document.createElement('div');
                sprite.className = 'cutscene-sprite';
                sprite.style.cssText = `
                    position: absolute;
                    bottom: 120px;
                    left: -300px;
                    width: 500px;
                    height: 500px;
                    background-size: contain;
                    background-repeat: no-repeat;
                    background-position: bottom;
                    transition: left 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    filter: drop-shadow(0 0 10px rgba(255, 204, 0, 0.5));
                `;

                const text = document.createElement('div');
                text.className = 'cutscene-text';
                text.style.cssText = `
                    position: absolute;
                    bottom: 450px;
                    left: 30px;
                    font-family: 'Arial Black', sans-serif;
                    font-size: 48px;
                    font-weight: 900;
                    font-style: italic;
                    color: #ffcc00;
                    -webkit-text-stroke: 2px #000;
                    text-shadow: 4px 4px 0px #000;
                    opacity: 0;
                    transition: opacity 0.3s ease-out 0.2s;
                `;

                const flash = document.createElement('div');
                flash.className = 'cutscene-flash';
                flash.style.cssText = `
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: white;
                    opacity: 0;
                    z-index: 10001;
                    pointer-events: none;
                `;

                container.appendChild(sprite);
                container.appendChild(text);
                container.appendChild(flash);
                document.body.appendChild(container);

                this.ultimateCutsceneUI = { container, sprite, text, flash };
            }

            const ui = this.ultimateCutsceneUI;
            const spriteKey = unitId + '_cutscene';

            // Reset positions / content
            ui.sprite.style.background = `url('assets/characters/party/${spriteKey}.png')`;
            ui.sprite.style.backgroundSize = 'contain';
            ui.sprite.style.backgroundRepeat = 'no-repeat';
            ui.sprite.style.backgroundPosition = 'bottom';
            ui.sprite.style.left = '-300px';

            ui.text.innerText = `[ ${skillName} ]`;
            ui.text.style.opacity = '0';

            ui.flash.style.opacity = '0';
            ui.flash.style.transition = 'none';

            ui.container.style.display = 'block';
            ui.container.style.opacity = '0';

            // Phase 1: Fade In & Slide In
            requestAnimationFrame(() => {
                ui.container.style.opacity = '1';
                ui.sprite.style.left = '50px';
                ui.text.style.opacity = '1';
            });

            // Phase 2: Flash effect
            setTimeout(() => {
                ui.flash.style.transition = 'opacity 0.1s';
                ui.flash.style.opacity = '1';
                setTimeout(() => {
                    ui.flash.style.transition = 'opacity 0.2s';
                    ui.flash.style.opacity = '0';
                }, 100);
            }, 1000);

            // Phase 3: Cleanup (Hide but don't remove from DOM)
            setTimeout(() => {
                ui.container.style.transition = 'opacity 0.5s ease-in';
                ui.container.style.opacity = '0';
                setTimeout(() => {
                    ui.container.style.display = 'none';
                    resolve();
                }, 500);
            }, duration - 500);
        });
    }
}
