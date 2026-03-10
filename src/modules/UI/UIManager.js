import DBManager from '../Database/DBManager.js';
import ChatChannel from './ChatChannel.js';
import EventBus from '../Events/EventBus.js';
import intentRouter from '../AI/IntentRouter.js';
import localLLM from '../AI/LocalLLM.js';
import embeddingGemma from '../AI/EmbeddingGemma.js';
import { MercenaryClasses, Characters, PetStats, scaleStats, StructureStats, Skins, MonsterClasses, StageConfigs, calculateExpToNextLevel, calculateTotalStats } from '../Core/EntityStats.js';
// partyManager will be accessed via this.scene.game.partyManager
import ItemManager, { ITEM_TYPES } from '../Core/ItemManager.js';
import CharmManager from '../Core/CharmManager.js';
import ShopManager from './ShopManager.js';
import npcManager from '../Core/NPCManager.js';
import buildingManager, { BUILDING_TYPES } from '../Core/BuildingManager.js';
import equipmentManager from '../Core/EquipmentManager.js';
import foodManager, { FOOD_RECIPES } from '../Core/FoodManager.js';
import fishingManager from '../Core/FishingManager.js';


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
        this.difficultyMenu = document.getElementById('difficulty-toggle-menu');
        this.lastRoundText = '';
        this.currentDifficulty = 'NORMAL';

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
        this.btnDiscardItem = document.getElementById('btn-discard-item');
        this.btnCloseDetail = document.getElementById('btn-close-detail');
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

        if (this.btnDiscardItem) {
            this.btnDiscardItem.onclick = () => {
                if (this.selectedItemId) {
                    this.handleDiscardItem(this.selectedItemId);
                }
            };
        }

        if (this.btnCloseDetail) {
            this.btnCloseDetail.onclick = (e) => {
                e.stopPropagation();
                this.deselectItem();
            };
        }

        // --- Difficulty Toggle Logic ---
        if (this.roundDisplay) {
            this.roundDisplay.addEventListener('click', (e) => {
                // Ignore if clicking buttons inside the menu
                if (e.target.closest('.diff-btn')) return;
                this.toggleDifficultyMenu();
            });
        }

        if (this.difficultyMenu) {
            this.difficultyMenu.querySelectorAll('.diff-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    e.stopPropagation();
                    const diff = btn.dataset.diff;
                    await this.handleDifficultyChange(diff);
                };
            });
        }

        // Close menu when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (this.difficultyMenu && !this.roundDisplay.contains(e.target)) {
                this.difficultyMenu.classList.add('difficulty-menu-hidden');
                this.difficultyMenu.classList.remove('difficulty-menu-visible');
            }
        });

        EventBus.on('EQUIPMENT_CHANGED', (payload) => {
            console.log('[UIManager] EQUIPMENT_CHANGED received:', payload);
            // 1. Refresh Formation Detail Card if open for this character
            if (this._formationDetailChannel && this._formationDetailChannel.characterId === payload.charId) {
                const charId = payload.charId;
                const charConfig = Object.values(Characters).find(c => c && (c.id === charId || c.id === charId.toLowerCase()));
                if (charConfig) {
                    this.showFormationUnitDetail(charConfig);
                }
            }
        });
    }

    toggleDifficultyMenu() {
        if (!this.difficultyMenu) return;
        const isHidden = this.difficultyMenu.classList.contains('difficulty-menu-hidden');
        if (isHidden) {
            this.difficultyMenu.classList.remove('difficulty-menu-hidden');
            this.difficultyMenu.classList.add('difficulty-menu-visible');

            // For UI feedback, use the scene's dungeon type if available, otherwise global
            const dungeonId = this.scene?.dungeonType || 'GLOBAL';
            this.refreshDifficultyUI(dungeonId);
        } else {
            this.difficultyMenu.classList.add('difficulty-menu-hidden');
            this.difficultyMenu.classList.remove('difficulty-menu-visible');
        }
    }

    async refreshDifficultyUI(dungeonId = 'GLOBAL') {
        const difficulty = await DBManager.getSelectedDifficulty(dungeonId);
        this.currentDifficulty = difficulty;

        if (this.difficultyMenu) {
            this.difficultyMenu.querySelectorAll('.diff-btn').forEach(btn => {
                if (btn.dataset.diff === difficulty) {
                    btn.classList.add('selected');
                } else {
                    btn.classList.remove('selected');
                }
            });
        }

        // Update Round HUD color
        if (this.roundDisplay) {
            this.roundDisplay.classList.remove('normal', 'nightmare', 'hell');
            this.roundDisplay.classList.add(difficulty.toLowerCase());
        }
    }

    async handleDifficultyChange(difficulty) {
        // Use current dungeon context if available
        const dungeonId = this.scene?.dungeonType || 'GLOBAL';

        const prevDiff = await DBManager.getSelectedDifficulty(dungeonId);
        if (prevDiff === difficulty) {
            this.toggleDifficultyMenu();
            return;
        }

        await DBManager.saveSelectedDifficulty(difficulty, dungeonId);
        this.currentDifficulty = difficulty;
        this.refreshDifficultyUI(dungeonId);
        this.toggleDifficultyMenu();

        // Restart Dungeon if we are in one
        const sceneKey = this.scene?.scene?.key || this.scene?.sys?.settings?.key;
        if (sceneKey === 'DungeonScene') {
            this.showToast(`${difficulty} 난이도로 던전을 재시작합니다.`);
            // Restart with same params, DungeonScene.init will reload difficulty from DB
            this.scene.scene.restart({ dungeonType: this.scene.dungeonType, startRound: 1 });
        }

        // Refresh Best Rounds display (all dungeons)
        await this.updateBestRounds();
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
        if (tabMaterials) tabMaterials.onclick = () => {
            this.deselectItem();
            this.switchInventoryTab('materials');
        };
        if (tabGear) tabGear.onclick = () => {
            this.deselectItem();
            this.switchInventoryTab('gear');
        };

        // Container clicks for deselection
        if (this.materialList) {
            this.materialList.onclick = () => this.deselectItem();
        }
        if (this.gearList) {
            this.gearList.onclick = () => this.deselectItem();
        }

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
                this.buildingGrid.style.display = showGrid ? 'flex' : 'none';
            }

            // Toggle Food HUD: Only on DungeonScene
            const foodHud = document.getElementById('food-hud');
            if (foodHud) {
                foodHud.style.display = (currentSceneKey === 'DungeonScene') ? 'flex' : 'none';
            }
        };
    }

    setEmojiFilter(filter) {
        this.emojiFilter = filter;
        this.deselectItem(); // Clear selection when filter changes
        this.refreshInventory();

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
        this.deselectItem(); // Clear selection when filter changes
        this.refreshInventory();

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

    showPopup(typeOrHtml, isWide = false) {
        if (!this.popupOverlay || !this.popupInner) return;
        this.clearPopupSafe();

        const content = document.getElementById('popup-content');
        if (content) {
            if (isWide) content.classList.add('wide');
            else content.classList.remove('wide');
        }

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
                    
                    <div class="owned-equipment-area" style="display: flex; flex-direction: column; gap: 10px;">
                        <div style="font-size: 14px; font-weight: bold; color: #a78bfa;">[보유 중인 성장 장비]</div>
                        <div id="owned-equip-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 10px; max-height: 280px; overflow-y: auto; padding: 5px; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                            <!-- Owned instances go here -->
                        </div>
                        
                        <!-- NEW: Selection Control Area -->
                        <div id="selected-equip-controls" style="margin-top: 5px; padding: 12px; background: rgba(124, 58, 237, 0.1); border: 1px dashed #7c3aed; border-radius: 8px; display: none; flex-direction: column; gap: 10px;">
                            <div id="selected-equip-info" style="font-size: 12px; color: #fff; font-weight: bold;">선택된 장비 없음</div>
                            <div style="display: flex; gap: 10px;">
                                <button id="btn-equip-detail" class="shop-buy-btn" style="flex: 1; height: 32px; font-size: 11px; background: #4f46e5;">상세 정보 보기</button>
                                <button id="btn-equip-destroy" class="shop-buy-btn" style="flex: 1; height: 32px; font-size: 11px; background: #dc2626; border-color: #ef4444;">장비 파괴</button>
                            </div>
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
        const herb = await DBManager.getInventoryItem('emoji_herb');

        materialDisplay.innerHTML = `
            <div style="display:flex; align-items:center; gap:5px; color: #fff; font-weight: bold;"><img src="assets/emojis/1fab5.svg" style="width:20px; height:20px;"> ${wood ? wood.amount : 0}</div>
            <div style="display:flex; align-items:center; gap:5px; color: #fff; font-weight: bold;"><img src="assets/emojis/1f9b4.svg" style="width:20px; height:20px;"> ${bone ? bone.amount : 0}</div>
            <div style="display:flex; align-items:center; gap:5px; color: #fff; font-weight: bold;"><img src="assets/emojis/1f33f.svg" style="width:20px; height:20px;"> ${herb ? herb.amount : 0}</div>
        `;

        if (!this.currentDefenseFilter) this.currentDefenseFilter = 'turret_bowgun';

        // 2. Recipes
        const recipes = [
            { id: 'turret_bowgun', req: { emoji_wood: 2000, emoji_bone: 1000 } },
            { id: 'healing_turret', req: { emoji_wood: 1000, emoji_herb: 800 } }
        ];

        let recipeHtml = '';
        for (const r of recipes) {
            const item = ItemManager.getItem(r.id);
            const isSelected = this.currentDefenseFilter === r.id;

            // Check materials
            const hasWood = wood && wood.amount >= (r.req.emoji_wood || 0);
            const hasBone = bone && bone.amount >= (r.req.emoji_bone || 0);
            const hasHerb = herb && herb.amount >= (r.req.emoji_herb || 0);
            const canCraft = hasWood && hasBone && hasHerb;

            const iconUrl = item.customAsset || 'assets/emojis/' + ItemManager.getSVGFilename(r.id);

            recipeHtml += `
                <div class="craft-card defense-recipe-card ${isSelected ? 'selected' : ''}" data-id="${r.id}" 
                     style="background: ${isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0,0,0,0.3)'}; 
                            border: 2px solid ${isSelected ? '#34d399' : '#059669'}; 
                            box-shadow: ${isSelected ? '0 0 15px rgba(52, 211, 153, 0.4)' : 'none'};
                            border-radius: 12px; padding: 12px; display: flex; align-items: center; gap: 15px; 
                            position: relative; overflow: hidden; cursor: pointer; transition: all 0.2s ease;">
                    <div class="retro-scanline-overlay" style="pointer-events: none;"></div>
                    <img src="${iconUrl}" style="width: 48px; height: 48px; object-fit: contain; image-rendering: pixelated; background: rgba(255,255,255,0.05); border-radius: 8px; padding: 4px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="flex: 1;">
                        <div style="font-weight: bold; font-size: 14px; color: #fff;">${item.name}</div>
                        <div style="font-size: 10px; color: #34d399; margin-bottom: 4px;">${item.description}</div>
                        <div style="font-size: 11px; color: #d1d5db; display: flex; align-items: center; gap: 8px;">
                            ${r.req.emoji_wood ? `<span style="display:flex; align-items:center; gap:2px; color: ${hasWood ? '#fff' : '#ef4444'}"><img src="assets/emojis/1fab5.svg" style="width:12px; height:12px;"> ${r.req.emoji_wood}</span>` : ''}
                            ${r.req.emoji_bone ? `<span style="display:flex; align-items:center; gap:2px; color: ${hasBone ? '#fff' : '#ef4444'}"><img src="assets/emojis/1f9b4.svg" style="width:12px; height:12px;"> ${r.req.emoji_bone}</span>` : ''}
                            ${r.req.emoji_herb ? `<span style="display:flex; align-items:center; gap:2px; color: ${hasHerb ? '#fff' : '#ef4444'}"><img src="assets/emojis/1f33f.svg" style="width:12px; height:12px;"> ${r.req.emoji_herb}</span>` : ''}
                        </div>
                    </div>
                    <button class="shop-buy-btn defense-craft-btn" data-id="${r.id}" ${canCraft ? '' : 'disabled'} 
                            style="padding: 8px 15px; font-size: 12px; height: auto; background: ${canCraft ? 'linear-gradient(to bottom, #10b981, #059669)' : '#333'}; opacity: ${canCraft ? 1 : 0.5}; cursor: ${canCraft ? 'pointer' : 'not-allowed'}; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); color: #fff; font-weight: bold;">제작</button>
                    ${isSelected ? '<div style="position: absolute; top: 5px; right: 5px; color: #34d399; font-size: 10px;">★</div>' : ''}
                </div>
            `;
        }
        recipeList.innerHTML = recipeHtml;

        // Bind recipe card selection & craft buttons
        recipeList.querySelectorAll('.defense-recipe-card').forEach(card => {
            card.onclick = (e) => {
                if (e.target.classList.contains('defense-craft-btn')) return;
                const id = card.dataset.id;
                this.currentDefenseFilter = id;
                this.refreshDefenseManagement();
            };

            const btn = card.querySelector('.defense-craft-btn');
            if (btn) {
                btn.onclick = async (e) => {
                    const itemId = btn.dataset.id;
                    const recipe = recipes.find(r => r.id === itemId);

                    // Deduct materials
                    const curWood = await DBManager.getInventoryItem('emoji_wood');
                    const curBone = await DBManager.getInventoryItem('emoji_bone');
                    const curHerb = await DBManager.getInventoryItem('emoji_herb');

                    const reqWood = recipe.req.emoji_wood || 0;
                    const reqBone = recipe.req.emoji_bone || 0;
                    const reqHerb = recipe.req.emoji_herb || 0;

                    if ((!reqWood || (curWood && curWood.amount >= reqWood)) &&
                        (!reqBone || (curBone && curBone.amount >= reqBone)) &&
                        (!reqHerb || (curHerb && curHerb.amount >= reqHerb))) {

                        if (reqWood) await DBManager.saveInventoryItem('emoji_wood', curWood.amount - reqWood);
                        if (reqBone) await DBManager.saveInventoryItem('emoji_bone', curBone.amount - reqBone);
                        if (reqHerb) await DBManager.saveInventoryItem('emoji_herb', curHerb.amount - reqHerb);

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
            }
        });

        // 3. Owned Structures (Fetch from structure_instances table) filtered by current filter
        const allStructures = await DBManager.getAllStructureInstances();
        const structures = allStructures.filter(s => s.baseId === this.currentDefenseFilter);

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
                const isSelected = this.selectedStructureInstanceId === s.id;

                let statusBadge = '';
                let cardStyle = 'background: rgba(255,255,255,0.05); border: 1px solid rgba(16, 185, 129, 0.3);';
                let btnText = isInstalled ? 'CURRENT' : 'DEPLOY ▶';
                let btnColor = isInstalled ? '#10b981' : '#f59e0b';
                let btnStyle = isSelected ? 'border: 2px solid #fff; box-shadow: 0 0 10px #fff;' : '';

                if (isInstalled) {
                    statusBadge = `<div style="position: absolute; bottom: 5px; right: 5px; background: #3b82f6; color: #fff; font-size: 6px; font-weight: bold; padding: 1px 3px; border-radius: 2px;">${s.dungeonId.replace('_', ' ')}</div>`;
                    cardStyle = 'background: rgba(59, 130, 246, 0.1); border: 1px solid #3b82f6; opacity: 0.9;';
                }

                ownedHtml += `
                    <div class="owned-equip-card structure-instance-card" data-instance-id="${s.id}"
                         style="${cardStyle} border-radius: 8px; padding: 10px; display: flex; flex-direction: row; align-items: center; gap: 15px; position: relative; cursor: pointer; transition: all 0.2s;" 
                         title="${base.name}\n${isInstalled ? 'INSTALLED: ' + s.dungeonId : 'IN INVENTORY'}">
                        
                        <div style="background: rgba(0,0,0,0.5); border-radius: 6px; padding: 8px; border: 1px solid rgba(255,255,255,0.1);">
                            <img src="${iconUrl}" style="width: 32px; height: 32px; object-fit: contain; image-rendering: pixelated; filter: drop-shadow(0 0 5px rgba(16, 185, 129, 0.3));">
                        </div>

                        <div style="flex: 1;">
                            <div style="font-size: 11px; color: #fff; font-weight: bold;">${base.name}</div>
                            <div style="font-size: 8px; color: #34d399; opacity: 0.6;">SERIAL: #${shortId}</div>
                            <div style="font-size: 8px; color: #fbbf24;">STATUS: HP ${s.currentHp || s.maxHp || 1000} / ${s.maxHp || 1000}</div>
                        </div>

                        <div class="deploy-unit-btn" data-instance-id="${s.id}" 
                             style="font-size: 9px; font-weight: bold; color: ${btnColor}; ${btnStyle} transition: transform 0.1s;">
                            ${btnText}
                        </div>

                        ${statusBadge}
                    </div>
                `;
            }
        }
        ownedList.innerHTML = ownedHtml;

        // Bind Deployment Buttons
        ownedList.querySelectorAll('.structure-instance-card').forEach(card => {
            card.onclick = () => {
                const instanceId = card.dataset.instanceId;
                const inst = structures.find(s => s.id === instanceId);

                // If we are in DungeonScene, trigger deployment
                if (this.scene && this.scene.constructor.name === 'DungeonScene') {
                    if (inst.dungeonId) {
                        this.showToast('이미 설치된 시설물입니다!');
                        return;
                    }

                    this.hideDefenseManagement();
                    this.scene.startConstructionMode(instanceId);
                } else {
                    this.showToast('던전 안에서만 설치가 가능합니다!');
                }
            };
        });
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

                const isSelected = this.currentEquipSelection === inst.id;
                ownedHtml += `
                    <div class="owned-equip-card ${isSelected ? 'selected' : ''}" data-instance-id="${inst.id}" 
                        style="background: ${isSelected ? 'rgba(124, 58, 237, 0.3)' : 'rgba(255,255,255,0.05)'}; 
                               border: ${isSelected ? '2px solid #fbbf24' : '1px solid rgba(167, 139, 250, 0.3)'}; 
                               box-shadow: ${isSelected ? '0 0 10px rgba(251, 191, 36, 0.3)' : 'none'};
                               border-radius: 8px; padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer; position: relative;" title="${base.name} LV.${inst.level}">
                        <div style="position: absolute; top: -5px; right: -5px; background: #7c3aed; color: #fff; font-size: 8px; font-weight: bold; padding: 2px 5px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.3);">LV.${inst.level}</div>
                        <img src="${iconUrl}" style="width: 32px; height: 32px; object-fit: contain; image-rendering: pixelated; filter: drop-shadow(0 0 5px rgba(124, 58, 237, 0.5));">
                        <div style="font-size: 9px; color: #fff; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; font-weight: bold;">${base.name}</div>
                        ${ownerLabel}
                    </div>
                `;
            }
        }
        ownedList.innerHTML = ownedHtml;

        // 4. Bind Selection & Controls
        const controlArea = document.getElementById('selected-equip-controls');
        const infoDisplay = document.getElementById('selected-equip-info');
        const detailBtn = document.getElementById('btn-equip-detail');
        const destroyBtn = document.getElementById('btn-equip-destroy');

        // Handle selection clicks
        ownedList.querySelectorAll('.owned-equip-card').forEach(card => {
            card.onclick = () => {
                const instId = card.dataset.instanceId;
                if (this.currentEquipSelection === instId) {
                    this.currentEquipSelection = null;
                } else {
                    this.currentEquipSelection = instId;
                }
                this.refreshEquipmentCrafting();
            };
        });

        // Update control area visibility
        if (this.currentEquipSelection) {
            const selectedInst = instances.find(inst => inst.id === this.currentEquipSelection);
            if (selectedInst) {
                const base = ItemManager.getItem(selectedInst.itemId);
                controlArea.style.display = 'flex';
                infoDisplay.innerHTML = `[선택됨] ${base.name} (LV.${selectedInst.level})`;

                // Detail Button
                detailBtn.onclick = () => {
                    const info = equipmentManager.getDisplayInfo(selectedInst);
                    const iconUrl = base.customAsset || 'assets/emojis/' + ItemManager.getSVGFilename(selectedInst.itemId);

                    const html = `
                        <div class="item-detail-popup" style="padding: 25px; color: #fff; font-family: 'VT323', monospace;">
                            <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px; border-bottom: 2px solid rgba(124, 58, 237, 0.4); padding-bottom: 15px;">
                                <img src="${iconUrl}" style="width: 64px; height: 64px; image-rendering: pixelated; background: rgba(0,0,0,0.3); border-radius: 12px; padding: 10px; border: 2px solid #7c3aed;">
                                <div>
                                    <div style="font-size: 24px; color: #fbbf24; text-shadow: 0 0 10px rgba(251, 191, 36, 0.5);">${info.name}</div>
                                    <div style="font-size: 14px; color: #a78bfa; opacity: 0.8;">Unique Growth Equipment</div>
                                </div>
                            </div>
                            <div style="font-size: 16px; line-height: 1.6; white-space: pre-wrap; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">${info.description}</div>
                            <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #666;">* 이 장비는 전투를 통해 성장하며 추가 옵션이 개방됩니다.</div>
                        </div>
                    `;
                    this.showPopup(html);
                };

                // Destroy Button
                destroyBtn.onclick = () => {
                    this.showConfirm(`장비 [${base.name} LV.${selectedInst.level}]을 파괴하시겠습니까?<br><span style="color: #ef4444; font-size: 11px;">* 이 작업은 되돌릴 수 없습니다.</span>`, async () => {
                        // 1. Unequip if needed
                        if (selectedInst.ownerId) {
                            const ownerId = selectedInst.ownerId;
                            // Find which slot it occupies in the owner's state
                            const ownerState = partyManager.getState(ownerId);
                            if (ownerState && ownerState.equipment) {
                                let foundSlot = null;
                                for (const [slot, item] of Object.entries(ownerState.equipment)) {
                                    if (item && item.instanceId === selectedInst.id) {
                                        foundSlot = slot;
                                        break;
                                    }
                                }
                                if (foundSlot) {
                                    console.log(`[UIManager] Auto-unequipping ${selectedInst.id} from ${ownerId} slot ${foundSlot}`);
                                    await partyManager.unequipItem(ownerId, foundSlot);
                                }
                            }
                        }

                        // 2. Delete from DB
                        await DBManager.deleteEquipmentInstance(selectedInst.id);
                        this.showToast(`${base.name} 파괴 완료. 💥`);

                        // 3. Reset selection and refresh
                        this.currentEquipSelection = null;
                        this.refreshEquipmentCrafting();
                    });
                };
            } else {
                this.currentEquipSelection = null;
                controlArea.style.display = 'none';
            }
        } else {
            controlArea.style.display = 'none';
        }
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
                
                <div class="shop-body" style="padding: 20px; display: flex; flex-direction: column; gap: 20px; max-height: 60vh; overflow-y: auto;">
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

    // --- Cooking & Food Buffs ---

    async showCooking() {
        if (this.cookingOverlay) return;

        const overlay = document.createElement('div');
        overlay.id = 'cooking-overlay';
        overlay.className = 'shop-overlay retro-scanline-overlay cooking-overlay';
        this.cookingOverlay = overlay;

        overlay.innerHTML = `
            <div class="shop-container cooking-container" style="max-width: 850px; width: 92vw;">
                <div class="shop-header" style="background: linear-gradient(to right, #fb7185, #e11d48);">
                    <div class="shop-title">🍳 KITCHEN (요리실: 버프 제작)</div>
                    <button class="shop-close-btn" id="cooking-close">✕</button>
                </div>
                
                <div class="shop-body" style="padding: 20px; display: flex; flex-direction: column; gap: 15px; max-height: 60vh; overflow-y: auto;">
                    <div style="font-size: 11px; color: #fb7185; text-align: center; padding: 8px; background: rgba(251, 113, 133, 0.1); border: 1px dashed rgba(251, 113, 133, 0.4); border-radius: 8px; font-weight: bold;">
                        💡 초코 파르페와 딸기 케이크는 상점(ROYAL SHOP)에서도 구매 가능합니다!
                    </div>
                    <div id="food-recipe-list" style="display: flex; flex-direction: column; gap: 15px;">
                        <!-- Food recipes here -->
                    </div>
                </div>
                
                <div class="shop-footer" style="display: flex; justify-content: space-between; align-items: center; padding: 15px;">
                    <div class="shop-currency" id="cooking-material-display" style="display:flex; align-items:center; gap:20px;">
                        <!-- Materials: Meat & Herb -->
                    </div>
                </div>
            </div>
        `;

        document.getElementById('app-container').appendChild(overlay);

        document.getElementById('cooking-close').onclick = () => this.hideCooking();
        overlay.onclick = (e) => { if (e.target === overlay) this.hideCooking(); };

        await this.refreshCooking();
    }

    async refreshCooking() {
        const listContainer = document.getElementById('food-recipe-list');
        if (!listContainer) return;

        const ownedFood = await foodManager.getOwnedFood();
        const materialDisplay = document.getElementById('cooking-material-display');

        // Update Materials
        const meat = await DBManager.getInventoryItem('emoji_meat');
        const herb = await DBManager.getInventoryItem('emoji_herb');

        if (materialDisplay) {
            materialDisplay.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:20px;">🍖</span>
                    <span style="color:#fff; font-weight:bold;">${meat ? meat.amount : 0}</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:20px;">🌿</span>
                    <span style="color:#fff; font-weight:bold;">${herb ? herb.amount : 0}</span>
                </div>
            `;
        }

        let html = '';
        for (const [id, recipe] of Object.entries(FOOD_RECIPES)) {
            const count = ownedFood[id] || 0;
            const canCraft = (meat && meat.amount >= recipe.requirements.emoji_meat) &&
                (herb && herb.amount >= recipe.requirements.emoji_herb);

            html += `
                <div class="shop-item-row" style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(251, 113, 133, 0.3); border-radius: 12px; padding: 15px; display: flex; align-items: center; gap: 15px;">
                    <div style="width: 60px; height: 60px; background: rgba(0,0,0,0.3); border-radius: 10px; display: flex; align-items: center; justify-content: center; position: relative;">
                        <img src="${recipe.asset}" style="width: 45px; height: 45px; object-fit: contain;">
                        <div style="position: absolute; bottom: -5px; right: -5px; background: #fb7185; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold; border: 1px solid #fff;">보유: ${count}</div>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 16px; font-weight: bold; color: #fff;">${recipe.name}</div>
                        <div style="font-size: 12px; color: #fecdd3; margin-top: 4px;">${recipe.description}</div>
                        <div style="font-size: 11px; color: #fb7185; margin-top: 6px; display: flex; gap: 10px;">
                            <span>🍖 ${recipe.requirements.emoji_meat}</span>
                            <span>🌿 ${recipe.requirements.emoji_herb}</span>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <button class="craft-btn" data-id="${id}" data-amount="1" ${!canCraft ? 'disabled' : ''} style="padding: 6px 15px; background: #fb7185; border: none; border-radius: 6px; color: #fff; font-weight: bold; cursor: ${canCraft ? 'pointer' : 'not-allowed'}; opacity: ${canCraft ? 1 : 0.5}; font-size: 12px;">제작</button>
                        <div style="display: flex; gap: 4px;">
                            <button class="craft-btn" data-id="${id}" data-amount="10" ${!canCraft ? 'disabled' : ''} style="padding: 4px 8px; background: #e11d48; border: none; border-radius: 4px; color: #fff; font-size: 10px; cursor: pointer; opacity: 0.9;">x10</button>
                            <button class="craft-btn" data-id="${id}" data-amount="100" ${!canCraft ? 'disabled' : ''} style="padding: 4px 8px; background: #9f1239; border: none; border-radius: 4px; color: #fff; font-size: 10px; cursor: pointer; opacity: 0.9;">x100</button>
                        </div>
                    </div>
                </div>
            `;
        }
        listContainer.innerHTML = html;

        // Attach events
        listContainer.querySelectorAll('.craft-btn').forEach(btn => {
            btn.onclick = async () => {
                const id = btn.dataset.id;
                const amount = parseInt(btn.dataset.amount);
                const result = await foodManager.craftFood(id, amount);
                if (result.success) {
                    this.showToast(result.message);
                    this.refreshCooking();
                } else {
                    this.showToast(result.message);
                }
            };
        });
    }

    async showFishingManagement() {
        if (this.fishingOverlay) return;

        const overlay = document.createElement('div');
        overlay.id = 'fishing-overlay';
        overlay.className = 'shop-overlay retro-scanline-overlay fishing-overlay';
        this.fishingOverlay = overlay;

        overlay.innerHTML = `
            <div class="shop-container fishing-container" style="max-width: 900px; width: 95vw; background: #0f172a; border: 3px solid #3b82f6; box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); border-radius: 0;">
                <div class="shop-header" style="background: #1e293b; border-bottom: 3px solid #3b82f6; padding: 15px 20px;">
                    <div class="shop-title" style="font-family: var(--font-pixel); color: #60a5fa; text-shadow: 0 0 10px #3b82f6; font-size: 14px;">🎣 FISHING MANAGEMENT</div>
                    <button class="shop-close-btn" id="fishing-close" style="background: #1e293b; border: 2px solid #3b82f6; color: #3b82f6; font-family: var(--font-pixel); cursor: pointer;">✕</button>
                </div>
                
                <div style="display: flex; background: #0f172a; padding: 10px; gap: 10px; border-bottom: 1px solid #1e293b;">
                    <button class="fishing-tab-btn active" data-tab="fisherman" style="flex: 1; padding: 12px; font-family: var(--font-pixel); font-size: 10px; background: #1e293b; border: 2px solid #3b82f6; color: #3b82f6; cursor: pointer; transition: all 0.2s;">👤 낚시꾼</button>
                    <button class="fishing-tab-btn" data-tab="rod" style="flex: 1; padding: 12px; font-family: var(--font-pixel); font-size: 10px; background: #1e293b; border: 2px solid #1e293b; color: #64748b; cursor: pointer; transition: all 0.2s;">🎣 낚시대</button>
                    <button class="fishing-tab-btn" data-tab="spot" style="flex: 1; padding: 12px; font-family: var(--font-pixel); font-size: 10px; background: #1e293b; border: 2px solid #1e293b; color: #64748b; cursor: pointer; transition: all 0.2s;">🌊 낚시터</button>
                </div>

                <div class="shop-body" id="fishing-content" style="padding: 25px; min-height: 400px; max-height: 70vh; overflow-y: auto; background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);">
                    <!-- Content dynamic -->
                </div>
            </div>
        `;

        document.getElementById('app-container').appendChild(overlay);

        document.getElementById('fishing-close').onclick = () => this.hideFishingManagement();
        overlay.onclick = (e) => { if (e.target === overlay) this.hideFishingManagement(); };

        const tabs = overlay.querySelectorAll('.fishing-tab-btn');
        tabs.forEach(tab => {
            tab.onclick = () => {
                tabs.forEach(t => {
                    t.classList.remove('active');
                    t.style.borderColor = '#1e293b';
                    t.style.color = '#64748b';
                });
                tab.classList.add('active');
                tab.style.borderColor = '#3b82f6';
                tab.style.color = '#3b82f6';
                this.renderFishingTab(tab.dataset.tab);
            };
        });

        await this.renderFishingTab('fisherman');
    }

    async renderFishingTab(tabId) {
        const content = document.getElementById('fishing-content');
        if (!content) return;

        if (tabId === 'fisherman') {
            const stats = fishingManager.getStats();
            const fData = fishingManager.fishermen[fishingManager.state.activeFishermanId];
            const expPercent = Math.min(100, (stats.exp / stats.nextLevelExp) * 100);
            const staminaPercent = Math.min(100, (stats.currentStamina / stats.maxStamina) * 100);

            content.innerHTML = `
                <div style="display: flex; gap: 30px; align-items: flex-start; animation: slideInUp 0.3s ease-out;">
                    <div style="width: 250px; text-align: center; background: rgba(0,0,0,0.3); padding: 20px; border-radius: 15px; border: 1px solid rgba(59, 130, 246, 0.2);">
                        <div style="width: 210px; height: 210px; background: #0f172a; border: 2px solid #3b82f6; border-radius: 10px; display: flex; align-items: center; justify-content: center; overflow: hidden; margin: 0 auto 15px auto; box-shadow: inset 0 0 20px rgba(59, 130, 246, 0.3);">
                            <img src="${fData.icon}" style="width: 180px; height: 180px; object-fit: contain; image-rendering: pixelated;">
                        </div>
                        <div style="font-family: var(--font-pixel); font-size: 16px; color: #fff; margin-bottom: 10px;">Lv.${stats.level} ${fData.name}</div>
                        <div style="font-family: var(--font-vt); font-size: 18px; color: #94a3b8; line-height: 1.4;">${fData.description}</div>
                    </div>

                    <div style="flex: 1; display: flex; flex-direction: column; gap: 20px;">
                        <div style="background: rgba(15, 23, 42, 0.6); padding: 20px; border-radius: 12px; border: 1px solid rgba(59, 130, 246, 0.3);">
                            <div style="margin-bottom: 20px;">
                                <div style="display: flex; justify-content: space-between; font-family: var(--font-pixel); font-size: 10px; margin-bottom: 8px;">
                                    <span style="color: #60a5fa;">⚡ STAMINA</span>
                                    <span style="color: #fff;">${Math.floor(stats.currentStamina)} / ${stats.maxStamina}</span>
                                </div>
                                <div style="width: 100%; height: 12px; background: #0f172a; border: 1px solid #3b82f6; overflow: hidden;">
                                    <div id="fishing-stamina-bar" style="width: ${staminaPercent}%; height: 100%; background: linear-gradient(90deg, #3b82f6, #60a5fa); box-shadow: 0 0 10px #3b82f6;"></div>
                                </div>
                            </div>
                            <div>
                                <div style="display: flex; justify-content: space-between; font-family: var(--font-pixel); font-size: 10px; margin-bottom: 8px;">
                                    <span style="color: #a78bfa;">✨ EXPERIENCE</span>
                                    <span style="color: #fff;">${stats.exp} / ${stats.nextLevelExp}</span>
                                </div>
                                <div style="width: 100%; height: 12px; background: #0f172a; border: 1px solid #7c3aed; overflow: hidden;">
                                    <div style="width: ${expPercent}%; height: 100%; background: linear-gradient(90deg, #7c3aed, #a78bfa); box-shadow: 0 0 10px #7c3aed;"></div>
                                </div>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div class="fishing-stat-row">
                                <span style="font-family: var(--font-pixel); font-size: 9px; color: #94a3b8;">🎣 FISHING SPEED</span>
                                <span style="font-family: var(--font-pixel); font-size: 11px; color: #fff;">${stats.stats.fishingSpeed.toFixed(1)}/s</span>
                            </div>
                            <div class="fishing-stat-row">
                                <span style="font-family: var(--font-pixel); font-size: 9px; color: #94a3b8;">🎯 SUCCESS RATE</span>
                                <span style="font-family: var(--font-pixel); font-size: 11px; color: #fff;">${(stats.stats.fishingSuccessRate * 100).toFixed(0)}%</span>
                            </div>
                            <div class="fishing-stat-row">
                                <span style="font-family: var(--font-pixel); font-size: 9px; color: #94a3b8;">🐟 CATCH RATE</span>
                                <span style="font-family: var(--font-pixel); font-size: 11px; color: #fff;">x${stats.stats.fishingCatchRate.toFixed(1)}</span>
                            </div>
                            <div class="fishing-stat-row">
                                <span style="font-family: var(--font-pixel); font-size: 9px; color: #94a3b8;">❤️ RECOVERY (H/m)</span>
                                <span style="font-family: var(--font-pixel); font-size: 11px; color: #fff;">${(stats.stats.health * 0.05).toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else if (tabId === 'rod') {
            const rodId = 'bamboo_fishing_rod';
            const rodData = ItemManager.getItem(rodId);
            const wood = await DBManager.getInventoryItem('emoji_wood');
            const clover = await DBManager.getInventoryItem('emoji_clover');
            const ownedRod = await DBManager.getInventoryItem(rodId);
            const ownedCount = ownedRod ? ownedRod.amount : 0;

            const canCraft = (wood && wood.amount >= 3000) && (clover && clover.amount >= 1000);

            content.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 20px; animation: slideInUp 0.3s ease-out;">
                    <div style="background: rgba(15, 23, 42, 0.6); padding: 25px; border-radius: 12px; border: 2px solid #3b82f6; display: flex; gap: 25px; align-items: center;">
                        <div style="width: 120px; height: 120px; background: #0f172a; border: 2px solid #3b82f6; border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(59, 130, 246, 0.2);">
                            <img src="assets/item/bamboo_fishing_rod.png" style="width: 90px; height: 90px; object-fit: contain;">
                        </div>
                        <div style="flex: 1;">
                            <div style="font-family: var(--font-pixel); font-size: 18px; color: #fff; margin-bottom: 8px;">${rodData.name}</div>
                            <div style="font-family: var(--font-vt); font-size: 18px; color: #94a3b8; margin-bottom: 15px;">
                                ${rodData.description}<br>
                                <span style="color: #60a5fa;">내구도: 500</span> | <span style="color: #fbbf24;">확률적 추가 소모 (30%)</span>
                            </div>
                            <div style="display: flex; gap: 15px; align-items: center;">
                                <div style="display: flex; gap: 8px; font-family: var(--font-pixel); font-size: 10px;">
                                    <span style="color: #94a3b8;">🪵 ${wood ? wood.amount : 0}/3000</span>
                                    <span style="color: #94a3b8;">☘️ ${clover ? clover.amount : 0}/1000</span>
                                </div>
                                <button class="fishing-craft-rod-btn" data-id="${rodId}" ${!canCraft ? 'disabled' : ''} style="padding: 10px 20px; background: #3b82f6; border: none; border-radius: 5px; color: #fff; font-family: var(--font-pixel); font-size: 10px; cursor: pointer; opacity: ${canCraft ? 1 : 0.5};">제작하기</button>
                            </div>
                        </div>
                        <div style="text-align: center; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; min-width: 100px;">
                            <div style="font-family: var(--font-pixel); font-size: 9px; color: #60a5fa; margin-bottom: 5px;">현재 보유</div>
                            <div style="font-family: var(--font-pixel); font-size: 20px; color: #fff;">${ownedCount}</div>
                        </div>
                    </div>
                    
                    <div style="background: rgba(15, 23, 42, 0.4); padding: 15px; border-radius: 10px; font-family: var(--font-vt); font-size: 16px; color: #64748b; border-left: 4px solid #3b82f6;">
                        ℹ️ 낚시대는 로얄 상점에서도 20,000 골드로 구매할 수 있습니다.
                    </div>
                </div>
            `;

            content.querySelector('.fishing-craft-rod-btn').onclick = async () => {
                const result = await fishingManager.craftRod(rodId);
                this.showToast(result.message);
                if (result.success) {
                    this.renderFishingTab('rod');
                }
            };

        } else if (tabId === 'spot') {
            content.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 20px; animation: slideInUp 0.3s ease-out;">
                    <div style="background: rgba(15, 23, 42, 0.6); padding: 0; border-radius: 15px; border: 2px solid #3b82f6; overflow: hidden; position: relative;">
                        <img src="assets/location/lake.png" style="width: 100%; height: 200px; object-fit: cover; opacity: 0.7;">
                        <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 20px; background: linear-gradient(to top, rgba(15, 23, 42, 0.9), transparent);">
                            <div style="font-family: var(--font-pixel); font-size: 18px; color: #fff;">호숫가 (Lakeside)</div>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div style="font-family: var(--font-pixel); font-size: 10px; color: #60a5fa; padding-left: 5px;">🐟 획득 가능 물고기</div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                            <div style="background: rgba(15, 23, 42, 0.5); padding: 15px; border-radius: 12px; border: 1px solid rgba(59, 130, 246, 0.2); text-align: center;">
                                <img src="assets/fish/mackerel.png" style="width: 60px; height: 60px; object-fit: contain; margin-bottom: 10px;">
                                <div style="font-family: var(--font-pixel); font-size: 11px; color: #fff; margin-bottom: 5px;">고등어</div>
                                <div style="font-family: var(--font-vt); font-size: 14px; color: #60a5fa;">몬스터 출현량 +30%</div>
                            </div>
                            <div style="background: rgba(15, 23, 42, 0.5); padding: 15px; border-radius: 12px; border: 1px solid rgba(59, 130, 246, 0.2); text-align: center;">
                                <img src="assets/fish/herring.png" style="width: 60px; height: 60px; object-fit: contain; margin-bottom: 10px;">
                                <div style="font-family: var(--font-pixel); font-size: 11px; color: #fff; margin-bottom: 5px;">청어</div>
                                <div style="font-family: var(--font-vt); font-size: 14px; color: #60a5fa;">몬스터 레벨 +1</div>
                            </div>
                            <div style="background: rgba(15, 23, 42, 0.5); padding: 15px; border-radius: 12px; border: 1px solid rgba(59, 130, 246, 0.2); text-align: center;">
                                <img src="assets/fish/squid.png" style="width: 60px; height: 60px; object-fit: contain; margin-bottom: 10px;">
                                <div style="font-family: var(--font-pixel); font-size: 11px; color: #fff; margin-bottom: 5px;">오징어</div>
                                <div style="font-family: var(--font-vt); font-size: 14px; color: #60a5fa;">엘리트 출현율 +30%</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Initializes the Right NPC HUD in Dungeon Scene.
     */
    initRightNPCHUD() {
        let container = document.getElementById('right-npc-hud');
        if (!container) {
            container = document.createElement('div');
            container.id = 'right-npc-hud';
            container.className = 'right-npc-hud';
            document.getElementById('app-container').appendChild(container);
        }
        this.updateRightNPCHUD();
    }

    /**
     * Updates the content of the Right NPC HUD.
     */
    async updateRightNPCHUD() {
        const container = document.getElementById('right-npc-hud');
        if (!container) return;

        const stats = fishingManager.getStats();
        const fData = fishingManager.fishermen[fishingManager.state.activeFishermanId];
        const staminaPercent = Math.min(100, (stats.currentStamina / stats.maxStamina) * 100);
        const durabilityPercent = Math.min(100, (fishingManager.state.rodDurability / 500) * 100);
        const isAuto = fishingManager.state.autoConsume;

        container.innerHTML = `
            <div class="npc-hud-item fishing-hud" id="fishing-hud-item">
                <div class="npc-hud-portrait" id="fishing-hud-portrait" style="cursor: pointer;" title="낚시통 열기">
                    <img src="${fData.icon}" alt="fisherman">
                    <div class="npc-hud-level">Lv.${stats.level}</div>
                </div>
                <div class="npc-hud-bars">
                    <div class="npc-hud-bar-wrap">
                        <div class="npc-hud-bar-fill stamina" style="width: ${staminaPercent}%" title="STAMINA: ${Math.floor(stats.currentStamina)}/${stats.maxStamina}"></div>
                    </div>
                    <div class="npc-hud-bar-wrap">
                        <div class="npc-hud-bar-fill durability" style="width: ${durabilityPercent}%" title="ROD DURABILITY: ${fishingManager.state.rodDurability}/500"></div>
                    </div>
                </div>
                <button class="npc-hud-toggle ${isAuto ? 'active' : ''}" id="fishing-auto-toggle">
                    ${isAuto ? 'AUTO' : 'MANU'}
                </button>
                <div class="fishing-bubble" id="fishing-bubble"></div>
            </div>
        `;

        const toggleBtn = document.getElementById('fishing-auto-toggle');
        if (toggleBtn) {
            toggleBtn.onclick = (e) => {
                e.stopPropagation();
                const newState = fishingManager.toggleAutoConsume();
                toggleBtn.classList.toggle('active', newState);
                toggleBtn.innerText = newState ? 'AUTO' : 'MANU';
                this.showToast(`자동 소모: ${newState ? 'ON' : 'OFF'}`);
                this.updateFishHUD(); // Immediately update top HUD
            };
        }

        const portrait = document.getElementById('fishing-hud-portrait');
        if (portrait) {
            portrait.onclick = () => this.showFishingBucket();
        }
    }

    /**
     * Shows a floating animation for fishing results.
     */
    showFishingResultNotification(result) {
        const bubble = document.getElementById('fishing-bubble');
        if (!bubble) return;

        bubble.innerHTML = '';
        bubble.className = 'fishing-bubble active';

        if (result.success) {
            bubble.innerHTML = `
                <img src="${result.asset}" style="width: 20px; height: 20px;">
                <span>+${result.amount}</span>
            `;
            bubble.style.color = '#60a5fa';
        } else {
            bubble.innerHTML = `<span>MISS</span>`;
            bubble.style.color = '#94a3b8';
        }

        // Auto remove class after animation
        setTimeout(() => {
            bubble.classList.remove('active');
        }, 2000);
    }

    /**
    * Updates the status of the fishing HUD during dungeon combat.
    */
    updateFishingHUDStatus() {
        const stats = fishingManager.getStats();
        const staminaBar = document.querySelector('.npc-hud-bar-fill.stamina');
        const durabilityBar = document.querySelector('.npc-hud-bar-fill.durability');

        if (staminaBar) {
            const staminaPercent = Math.min(100, (stats.currentStamina / stats.maxStamina) * 100);
            staminaBar.style.width = `${staminaPercent}%`;
        }
        if (durabilityBar) {
            const durabilityPercent = Math.min(100, (fishingManager.state.rodDurability / 500) * 100);
            durabilityBar.style.width = `${durabilityPercent}%`;
        }
    }

    _renderFishingStat(label, value, color) {
        return `
            <div style="background: rgba(0,0,0,0.3); padding: 10px 15px; border-radius: 8px; border-left: 3px solid ${color}; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; color: #94a3b8;">${label}</span>
                <span style="font-size: 14px; font-weight: bold; color: ${color};">${value}</span>
            </div>
        `;
    }

    hideFishingManagement() {
        if (this.fishingOverlay) {
            this.fishingOverlay.remove();
            this.fishingOverlay = null;
        }
    }

    hideCooking() {
        if (!this.cookingOverlay) return;
        this.cookingOverlay.classList.add('fade-out');
        setTimeout(() => {
            if (this.cookingOverlay) {
                this.cookingOverlay.remove();
                this.cookingOverlay = null;
            }
        }, 300);
    }

    async updateFoodHUD() {
        const hud = document.getElementById('food-hud');
        if (!hud) return;

        // Only show if we are in DungeonScene
        const currentSceneKey = this.scene?.scene?.key;
        if (currentSceneKey !== 'DungeonScene') {
            hud.style.display = 'none';
            return;
        }

        const ownedFood = await foodManager.getOwnedFood();
        let html = '';

        for (const [id, count] of Object.entries(ownedFood)) {
            if (count > 0) {
                const recipe = FOOD_RECIPES[id];
                html += `
                    <div class="food-buff-icon" title="${recipe.name}: ${recipe.description}">
                        <img src="${recipe.asset}" alt="${recipe.name}">
                        <div class="food-buff-count">${count}</div>
                    </div>
                `;
            }
        }

        hud.innerHTML = html;
        hud.style.display = html ? 'flex' : 'none';

        // Also update fish HUD if present
        this.updateFishHUD();
    }

    async updateFishHUD() {
        let fishHud = document.getElementById('fish-hud');
        if (!fishHud) {
            fishHud = document.createElement('div');
            fishHud.id = 'fish-hud';
            fishHud.className = 'fish-hud';
            document.getElementById('food-hud')?.parentElement?.appendChild(fishHud);
        }

        const currentSceneKey = this.scene?.scene?.key;
        if (currentSceneKey !== 'DungeonScene') {
            fishHud.style.display = 'none';
            return;
        }

        const spot = fishingManager.state.activeSpotId || 'lake';
        const spotData = fishingManager.spots ? fishingManager.spots[spot] : { fishList: ['mackerel', 'herring', 'squid'] }; // Fallback

        let html = '';
        const fishList = Object.keys(fishingManager.fishData || {});

        for (const fishId of fishList) {
            const inventory = await DBManager.getInventoryItem(fishId);
            if (inventory && inventory.amount > 0) {
                const fishData = fishingManager.fishData ? fishingManager.fishData[fishId] : null;
                const asset = `assets/fish/${fishId}.png`;
                const name = fishId.toUpperCase();
                const isActive = fishingManager.state.activeFishBuffs[fishData?.buffType]?.id === fishId;
                const activeClass = isActive ? 'active' : '';

                html += `
                    <div class="fish-icon ${activeClass}" title="${name}: ${fishData?.buffDescription || ''}">
                        <img src="${asset}" alt="${fishId}">
                        <div class="fish-count">${inventory.amount}</div>
                    </div>
                `;
            }
        }

        fishHud.innerHTML = html;
        fishHud.style.display = html ? 'flex' : 'none';
    }

    async showFishingBucket() {
        if (this.fishingBucketOverlay) return;

        const overlay = document.createElement('div');
        overlay.id = 'fishing-bucket-overlay';
        overlay.className = 'shop-overlay fishing-bucket-overlay retro-scanline-overlay';
        this.fishingBucketOverlay = overlay;

        const fishList = Object.keys(fishingManager.fishData || {});
        let gridHtml = '';

        for (const fishId of fishList) {
            const inventory = await DBManager.getInventoryItem(fishId);
            const count = inventory ? inventory.amount : 0;
            const fishData = fishingManager.fishData ? fishingManager.fishData[fishId] : { name: fishId, buffDescription: '미지의 물고기' };
            const asset = `assets/fish/${fishId}.png`;

            gridHtml += `
                <div class="fishing-bucket-item">
                    <div class="count">${count}</div>
                    <img src="${asset}" alt="${fishId}">
                    <div class="name">${fishData.name || fishId.toUpperCase()}</div>
                    <div class="buff">${fishData.buffDescription || ''}</div>
                </div>
            `;
        }

        overlay.innerHTML = `
            <div class="shop-container" style="max-width: 500px; width: 90vw; border-color: #3b82f6;">
                <div class="shop-header" style="background: #1e3a8a;">
                    <div class="shop-title">📦 FISHING BUCKET (낚시통)</div>
                    <button class="shop-close-btn" id="bucket-close">✕</button>
                </div>
                <div class="fishing-bucket-container">
                    <div class="fishing-bucket-grid">
                        ${gridHtml}
                    </div>
                    <div style="margin-top: 15px; font-family: var(--font-vt); color: #94a3b8; font-size: 14px; text-align: center;">
                        * 낚시로 획득한 물고기 보관함입니다. 자동 소모 시 여기서 1개씩 사라집니다.
                    </div>
                </div>
            </div>
        `;

        document.getElementById('app-container').appendChild(overlay);

        document.getElementById('bucket-close').onclick = () => this.hideFishingBucket();
        overlay.onclick = (e) => { if (e.target === overlay) this.hideFishingBucket(); };
    }

    hideFishingBucket() {
        if (this.fishingBucketOverlay) {
            this.fishingBucketOverlay.remove();
            this.fishingBucketOverlay = null;
        }
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
        const requiredExp = stats.level * 100;
        const expPct = Math.min(100, Math.floor((stats.exp / requiredExp) * 100));
        statsList.innerHTML = `
            <div style="display:flex; justify-content:space-between; color:#fbbf24;"><span>LEVEL</span><span>${stats.level}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>ATK</span><span>${stats.atk}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>M.ATK</span><span>${stats.mAtk}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>DEF</span><span>${stats.def}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>CAST SPD</span><span>${stats.castSpd}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>ACC</span><span>${stats.acc}</span></div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px;"><span>CRIT</span><span>${stats.crit}%</span></div>
            <div style="margin-top:10px;">
                <div style="display:flex; justify-content:space-between; font-size:10px; color:#fbbf24; margin-bottom:4px; font-family:var(--font-pixel);">
                    <span>✨ EXP</span><span>${stats.exp} / ${requiredExp}</span>
                </div>
                <div style="background:rgba(0,0,0,0.5); border:1px solid rgba(251,191,36,0.4); border-radius:4px; height:10px; overflow:hidden;">
                    <div style="width:${expPct}%; height:100%; background:linear-gradient(to right,#92400e,#fbbf24); box-shadow:0 0 6px rgba(251,191,36,0.5); transition:width 0.3s ease;"></div>
                </div>
                <div style="text-align:right; font-size:9px; color:#94a3b8; margin-top:2px; font-family:var(--font-pixel);">NEXT LEVEL: ${requiredExp - stats.exp} EXP</div>
            </div>
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

    // ─── Achievements UI ───────────────────────────────────────────────────────
    async showAchievementsUI() {
        if (this.achievementsOverlay) return;

        // Current tab state
        this.currentAchievementTab = 'DUNGEON';

        const overlay = document.createElement('div');
        overlay.id = 'achievements-overlay';
        overlay.className = 'shop-overlay retro-scanline-overlay';
        this.achievementsOverlay = overlay;

        overlay.innerHTML = `
            <div class="shop-container achievements-container" style="max-width: 600px; width: 95vw; border-color: #ef4444; box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);">
                <div class="shop-header" style="background: linear-gradient(to right, #450a0a, #7f1d1d, #450a0a); border-bottom: 2px solid #ef4444;">
                    <div class="shop-title" style="color: #fca5a5; text-shadow: 0 0 10px rgba(252, 165, 165, 0.8);">🏆 ACHIEVEMENTS (업적)</div>
                    <button class="shop-close-btn" id="achievements-close" style="color: #fca5a5;">✕</button>
                </div>
                
                <div class="shop-body" style="padding: 10px 20px 20px 20px; display: flex; flex-direction: column;">
                    <!-- Tabs -->
                    <div style="display: flex; gap: 10px; margin-bottom: 15px; border-bottom: 1px solid rgba(239,68,68,0.3); padding-bottom: 5px;">
                        <button id="achieve-tab-dungeon" class="retro-btn achievement-tab-btn active" style="flex: 1; font-size: 11px; padding: 6px; background: rgba(239,68,68,0.3); border-color: #ef4444;">던전 업적</button>
                        <button id="achieve-tab-monster" class="retro-btn achievement-tab-btn" style="flex: 1; font-size: 11px; padding: 6px; border-color: rgba(239,68,68,0.3);">몬스터 업적</button>
                    </div>

                    <div style="font-family: var(--font-pixel); color: #fca5a5; font-size: 11px; margin-bottom: 15px; text-align: center;">
                        목표 달성 시 메시아 경험치(✨)를 획득하여 권능을 강화하세요!
                    </div>
                    <div id="achievements-list" style="display: flex; flex-direction: column; gap: 12px; max-height: 50vh; overflow-y: auto; padding-right: 5px;">
                        <!-- Achievements injected here -->
                    </div>
                </div>
            </div>
        `;

        document.getElementById('app-container').appendChild(overlay);

        document.getElementById('achievements-close').onclick = () => this.hideAchievementsUI();
        overlay.onclick = (e) => { if (e.target === overlay) this.hideAchievementsUI(); };

        // Tab Events
        const dungeonTab = document.getElementById('achieve-tab-dungeon');
        const monsterTab = document.getElementById('achieve-tab-monster');

        dungeonTab.onclick = () => {
            if (this.currentAchievementTab === 'DUNGEON') return;
            this.currentAchievementTab = 'DUNGEON';
            dungeonTab.classList.add('active');
            dungeonTab.style.background = 'rgba(239,68,68,0.3)';
            dungeonTab.style.borderColor = '#ef4444';
            monsterTab.classList.remove('active');
            monsterTab.style.background = 'transparent';
            monsterTab.style.borderColor = 'rgba(239,68,68,0.3)';
            this.refreshAchievements();
        };

        monsterTab.onclick = () => {
            if (this.currentAchievementTab === 'MONSTER') return;
            this.currentAchievementTab = 'MONSTER';
            monsterTab.classList.add('active');
            monsterTab.style.background = 'rgba(239,68,68,0.3)';
            monsterTab.style.borderColor = '#ef4444';
            dungeonTab.classList.remove('active');
            dungeonTab.style.background = 'transparent';
            dungeonTab.style.borderColor = 'rgba(239,68,68,0.3)';
            this.refreshAchievements();
        };

        await this.refreshAchievements();
    }

    hideAchievementsUI() {
        if (!this.achievementsOverlay) return;
        this.achievementsOverlay.classList.add('fade-out');
        setTimeout(() => {
            if (this.achievementsOverlay) {
                this.achievementsOverlay.remove();
                this.achievementsOverlay = null;
            }
        }, 300);
    }

    async showMonsterCodex() {
        if (this.monsterCodexOverlay) return;

        const overlay = document.createElement('div');
        overlay.id = 'monster-codex-overlay';
        overlay.className = 'retro-menu-overlay fade-in';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.9); z-index: 30000;
            display: flex; justify-content: center; align-items: center;
            backdrop-filter: blur(8px); font-family: var(--font-pixel);
            padding: 10px; box-sizing: border-box;
        `;

        this.monsterCodexOverlay = overlay;
        this.currentCodexCategory = 'CURSED_FOREST';

        overlay.innerHTML = `
            <div class="retro-container" style="width: 100%; max-width: 800px; height: 95%; background: #0f172a; border: 2px solid #4ade80; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; position: relative; box-shadow: 0 0 30px rgba(0,0,0,1);">
                <!-- Header -->
                <div style="background: #1e293b; padding: 12px 15px; border-bottom: 2px solid #4ade80; display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0; color: #4ade80; font-size: 16px; text-shadow: 0 0 10px rgba(74,222,128,0.5);">👾 몬스터 도감</h2>
                    <button id="close-codex" class="retro-btn" style="background: transparent; border: none; color: #ef4444; font-size: 20px; cursor: pointer; padding: 0 5px;">✕</button>
                </div>
                
                <div id="codex-main-body" style="display: flex; flex: 1; overflow: hidden; flex-direction: row;">
                    <!-- Sidebar -->
                    <div id="codex-sidebar" style="width: 120px; background: #1e293b; border-right: 1px solid rgba(74,222,128,0.2); display: flex; flex-direction: column; gap: 4px; padding: 8px; overflow-y: auto;">
                        <button class="codex-tab active" data-cat="CURSED_FOREST" style="padding: 8px; background: rgba(74,222,128,0.2); border: 1px solid #4ade80; color: #fff; text-align: left; border-radius: 4px; font-size: 10px;">🌲 저주받은 숲</button>
                        <button class="codex-tab" data-cat="UNDEAD_GRAVEYARD" style="padding: 8px; background: transparent; border: 1px solid rgba(74,222,128,0.2); color: #94a3b8; text-align: left; border-radius: 4px; font-size: 10px;">🪦 언데드 묘지</button>
                        <button class="codex-tab" data-cat="SWAMPLAND" style="padding: 8px; background: transparent; border: 1px solid rgba(74,222,128,0.2); color: #94a3b8; text-align: left; border-radius: 4px; font-size: 10px;">🐸 늪지대</button>
                        <button class="codex-tab" data-cat="LAVA_FIELD" style="padding: 8px; background: transparent; border: 1px solid rgba(74,222,128,0.2); color: #94a3b8; text-align: left; border-radius: 4px; font-size: 10px;">🌋 용암 지대</button>
                        <button class="codex-tab" data-cat="WINTER_LAND" style="padding: 8px; background: transparent; border: 1px solid rgba(74,222,128,0.2); color: #94a3b8; text-align: left; border-radius: 4px; font-size: 10px;">❄️ 겨울의 나라</button>
                    </div>
                    
                    <!-- Content -->
                    <div id="codex-content" style="flex: 1; padding: 12px; overflow-y: auto; background: #0f172a; display: flex; flex-direction: column; gap: 15px;">
                        <!-- Monster Cards go here -->
                    </div>
                </div>
                
                <!-- Footer Info -->
                <div style="background: #1e293b; padding: 10px 20px; border-top: 1px solid rgba(74,222,128,0.2); font-size: 11px; color: #64748b; display: flex; justify-content: space-between;">
                    <span>* 모든 능력치는 1층(Level 1) 기준 기본 스탯입니다.</span>
                    <span>Antigravity Codex System v1.0</span>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Bind Close
        overlay.querySelector('#close-codex').onclick = () => this.hideMonsterCodex();

        // Bind Tabs
        const tabs = overlay.querySelectorAll('.codex-tab');
        tabs.forEach(tab => {
            tab.onclick = () => {
                tabs.forEach(t => {
                    t.classList.remove('active');
                    t.style.background = 'transparent';
                    t.style.borderColor = 'rgba(74,222,128,0.2)';
                    t.style.color = '#94a3b8';
                });
                tab.classList.add('active');
                tab.style.background = 'rgba(74,222,128,0.2)';
                tab.style.borderColor = '#4ade80';
                tab.style.color = '#fff';
                this.currentCodexCategory = tab.dataset.cat;
                this.refreshMonsterCodex();
            };
        });

        this.refreshMonsterCodex();
    }

    hideMonsterCodex() {
        if (!this.monsterCodexOverlay) return;
        this.monsterCodexOverlay.classList.add('fade-out');
        setTimeout(() => {
            if (this.monsterCodexOverlay) {
                this.monsterCodexOverlay.remove();
                this.monsterCodexOverlay = null;
            }
        }, 300);
    }

    refreshMonsterCodex() {
        if (!this.monsterCodexOverlay) return;
        const content = document.getElementById('codex-content');
        if (!content) return;

        const stageConfig = StageConfigs[this.currentCodexCategory];
        if (!stageConfig) {
            content.innerHTML = '<div style="color: #64748b; text-align: center; padding: 40px;">데이터가 존재하지 않습니다.</div>';
            return;
        }

        // Pool logic: Cursed Forest is special in DungeonScene.js (Goblin, Shaman, Orc)
        let monsterPool = stageConfig.monsterPool || [];

        if (monsterPool.length === 0) {
            content.innerHTML = '<div style="color: #64748b; text-align: center; padding: 40px;">등록된 몬스터 정보가 없습니다.</div>';
            return;
        }

        content.innerHTML = monsterPool.map(mId => this._renderMonsterCard(mId)).join('');
    }

    _renderMonsterCard(monsterId) {
        const config = MonsterClasses[monsterId.toUpperCase()];
        if (!config) return '';

        const stage = StageConfigs[this.currentCodexCategory]?.name || 'Unknown';

        // Stats to display
        const displayStats = [
            { label: 'HP', val: config.maxHp, icon: '❤️' },
            { label: 'ATK', val: config.atk, icon: '⚔️' },
            { label: 'M.ATK', val: config.mAtk, icon: '🔮' },
            { label: 'DEF', val: config.def, icon: '🛡️' },
            { label: 'M.DEF', val: config.mDef, icon: '✨' },
            { label: 'SPD', val: config.speed, icon: '👟' },
            { label: 'ACC', val: config.acc, icon: '🎯' },
            { label: 'EVA', val: config.eva, icon: '💨' },
            { label: 'CRIT', val: config.crit + '%', icon: '💥' }
        ];

        const secondaryStats = [
            { label: 'AtkSpd', val: (config.atkSpd / 1000).toFixed(1) + 's', icon: '⏱️' },
            { label: 'Range', val: config.atkRange, icon: '📏' },
            { label: 'FireRes', val: (config.fireRes || 0) + '%', icon: '🔥' },
            { label: 'IceRes', val: (config.iceRes || 0) + '%', icon: '❄️' },
            { label: 'LightRes', val: (config.lightningRes || 0) + '%', icon: '⚡' }
        ];

        const isEpic = config.id?.startsWith('epic_');
        const isSkeleton = config.id?.includes('skeleton');
        const baseExpReward = config.expReward || 25;
        const lv50ExpReward = Math.floor(baseExpReward * (1 + (50 - 1) * 0.1));

        // Build EXP variant string
        // - 일반 몬스터는 그림자 용병이 될 수 없으므로 "그림자 x5" 배지는 표시하지 않음
        const expVariants = [];
        if (isSkeleton && !isEpic) expVariants.push('스켈레톤 x1.5');
        expVariants.push('엘리트 x3');

        return `
            <div class="monster-card" style="background: rgba(30,41,59,0.5); border: 1px solid rgba(74,222,128,0.3); border-radius: 8px; padding: 12px; display: flex; flex-wrap: wrap; gap: 15px;">
                <!-- Left/Top: Sprite & Identity -->
                <div style="width: 100px; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                    <div style="width: 70px; height: 70px; background: rgba(0,0,0,0.3); border: 1px solid rgba(74,222,128,0.5); border-radius: 8px; display: flex; justify-content: center; align-items: center; position: relative; overflow: hidden;">
                        <div class="retro-scanline-overlay" style="position: absolute; inset: 0; pointer-events: none; opacity: 0.1;"></div>
                        <img src="assets/characters/enemies/${config.sprite || 'goblin_sprite'}.png" style="width: 56px; height: 56px; object-fit: contain; image-rendering: pixelated; position: relative; z-index: 1;">
                    </div>
                    <div style="text-align: center;">
                        <div style="color: #4ade80; font-size: 11px; font-weight: bold; white-space: nowrap;">${config.name}</div>
                        <div style="color: #64748b; font-size: 9px; margin-top: 1px;">📍 ${stage}</div>
                    </div>
                </div>
                
                <!-- Right/Bottom: Stats Grid -->
                <div style="flex: 1; min-width: 160px; display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(65px, 1fr)); gap: 5px;">
                        ${displayStats.map(s => `
                            <div style="background: rgba(15,23,42,0.8); padding: 4px 6px; border-radius: 4px; border: 1px solid rgba(148,163,184,0.15); display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 9px; color: #94a3b8;">${s.icon} ${s.label}</span>
                                <span style="font-size: 10px; color: #f1f5f9; font-weight: bold;">${s.val}</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; border-top: 1px solid rgba(74,222,128,0.15); padding-top: 6px;">
                        ${secondaryStats.map(s => `
                            <div style="display: flex; align-items: center; gap: 3px; background: rgba(0,0,0,0.2); padding: 2px 5px; border-radius: 3px;">
                                <span style="font-size: 9px; color: #64748b;">${s.icon}${s.label}:</span>
                                <span style="font-size: 9px; color: #94a3b8; font-weight: bold;">${s.val}</span>
                            </div>
                        `).join('')}
                    </div>

                    <!-- EXP Reward Section -->
                    <div style="border: 1px solid rgba(250,204,21,0.3); background: rgba(250,204,21,0.05); border-radius: 5px; padding: 5px 8px;">
                        <div style="font-size: 9px; color: #fbbf24; font-weight: bold; margin-bottom: 4px;">⭐ EXP 보상</div>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <span style="font-size: 9px; color: #64748b;">Lv.1:</span>
                                <span style="font-size: 10px; color: #fde68a; font-weight: bold;">${baseExpReward} EXP</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 4px;">
                                <span style="font-size: 9px; color: #64748b;">Lv.50:</span>
                                <span style="font-size: 10px; color: #fde68a; font-weight: bold;">~${lv50ExpReward} EXP</span>
                            </div>
                        </div>
                        <div style="margin-top: 4px; display: flex; gap: 5px; flex-wrap: wrap;">
                            ${expVariants.map(v => `<span style="font-size: 8px; background: rgba(250,204,21,0.15); border: 1px solid rgba(250,204,21,0.3); border-radius: 3px; padding: 1px 4px; color: #fbbf24;">${v}</span>`).join('')}
                        </div>
                    </div>

                    ${config.skillName ? `
                    <div style="margin-top: 4px; border: 1px dashed rgba(255,170,0,0.4); background: rgba(255,170,0,0.05); padding: 5px 8px; border-radius: 5px; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 10px; color: #ffaa00; font-weight: bold;">🌟 특수 기술:</span>
                        <span style="font-size: 11px; color: #fff; text-shadow: 0 0 5px rgba(255,170,0,0.5);">${config.skillName}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    async refreshAchievements() {
        if (!this.achievementsOverlay) return;
        const listContainer = document.getElementById('achievements-list');
        if (!listContainer) return;

        listContainer.innerHTML = '<div style="text-align: center; color: #94a3b8; font-size: 14px; padding: 20px;">불러오는 중...</div>';

        if (this.currentAchievementTab === 'DUNGEON') {
            await this._renderDungeonAchievements(listContainer);
        } else {
            await this._renderMonsterAchievements(listContainer);
        }
    }

    async _renderDungeonAchievements(container) {
        const claimed = await DBManager.getClaimedAchievements();
        const targets = [
            { id: 'CURSED_FOREST', name: '저주받은 숲', icon: '🌲' },
            { id: 'UNDEAD_GRAVEYARD', name: '언데드 묘지', icon: '🪦' },
            { id: 'SWAMPLAND', name: '늪지대', icon: '🐸' },
            { id: 'LAVA_FIELD', name: '용암 지대', icon: '🌋' },
            { id: 'WINTER_LAND', name: '겨울의 나라', icon: '❄️' }
        ];

        let html = '';
        for (const t of targets) {
            const bestRound = await DBManager.getBestRound(t.id);
            const currentClaimed = claimed[t.id] || 0;
            const targetRound = currentClaimed + 10;
            const canClaim = bestRound >= targetRound;

            html += `
                <div class="achievement-card" style="background: rgba(0,0,0,0.4); border: 1px solid ${canClaim ? '#ef4444' : 'rgba(239,68,68,0.2)'}; border-radius: 8px; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <div style="color: #fca5a5; font-size: 14px; font-weight: bold; font-family: var(--font-pixel);">
                            ${t.icon} ${t.name} <span style="color:#fbbf24; font-size: 12px;">(${targetRound}라운드 달성)</span>
                        </div>
                        <div style="color: #cbd5e1; font-size: 11px;">보상: 메시아 경험치 ✨ 100</div>
                    </div>
                    <div>
                        ${canClaim ?
                    `<button class="achieve-claim-btn retro-btn" data-type="DUNGEON" data-id="${t.id}" data-target="${targetRound}" style="background: #ef4444; border-color: #fca5a5; color: #fff; padding: 5px 15px; font-size: 11px;">[보상 수령]</button>` :
                    `<div style="color: #94a3b8; font-size: 12px; font-family: var(--font-pixel);">진행도: ${bestRound} / ${targetRound}</div>`
                }
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
        this._bindAchievementClaimButtons(container);
    }

    async _renderMonsterAchievements(container) {
        const kills = await DBManager.getMonsterKills();
        const claimed = await DBManager.getClaimedMonsterAchievements();

        // Dynamically include all monsters from MonsterClasses
        const targets = Object.keys(MonsterClasses).map(key => {
            const m = MonsterClasses[key];
            let icon = '👺'; // Default
            if (m.id.includes('shaman')) icon = '🧙‍♂️';
            if (m.id.includes('orc')) icon = '🏹';
            if (m.id.includes('skeleton')) icon = '💀';
            if (m.id.includes('crocodile')) icon = '🐊';
            if (m.id.includes('spirit')) icon = '🔥';
            if (m.id.includes('ice')) icon = '❄️';
            if (m.id.includes('boss')) icon = '👑';

            return { id: m.id.toUpperCase(), name: m.name.split('(')[0].trim(), icon: icon };
        });

        let html = '';
        for (const t of targets) {
            const currentKills = kills[t.id] || 0;
            const currentClaimed = claimed[t.id] || 0;

            // Tiers: 100, 1000, 10000...
            let nextMilestone = 100;
            if (currentClaimed >= 100) nextMilestone = 1000;
            if (currentClaimed >= 1000) nextMilestone = 10000;
            if (currentClaimed >= 10000) nextMilestone = currentClaimed + 10000; // Future proof

            const canClaim = currentKills >= nextMilestone;

            html += `
                <div class="achievement-card" style="background: rgba(0,0,0,0.4); border: 1px solid ${canClaim ? '#ef4444' : 'rgba(239,68,68,0.2)'}; border-radius: 8px; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <div style="color: #fca5a5; font-size: 14px; font-weight: bold; font-family: var(--font-pixel);">
                            ${t.icon} ${t.name} 처치 <span style="color:#fbbf24; font-size: 12px;">(${nextMilestone}마리 달성)</span>
                        </div>
                        <div style="color: #cbd5e1; font-size: 11px;">보상: 메시아 경험치 ✨ 150</div>
                    </div>
                    <div>
                        ${canClaim ?
                    `<button class="achieve-claim-btn retro-btn" data-type="MONSTER" data-id="${t.id}" data-target="${nextMilestone}" style="background: #ef4444; border-color: #fca5a5; color: #fff; padding: 5px 15px; font-size: 11px;">[보상 수령]</button>` :
                    `<div style="color: #94a3b8; font-size: 12px; font-family: var(--font-pixel);">진행도: ${currentKills} / ${nextMilestone}</div>`
                }
                    </div>
                </div>
            `;
        }
        container.innerHTML = html || '<div style="text-align: center; color: #94a3b8; font-size: 14px; padding: 20px;">아직 처치 기록이 없습니다.</div>';
        this._bindAchievementClaimButtons(container);
    }

    _bindAchievementClaimButtons(container) {
        const btns = container.querySelectorAll('.achieve-claim-btn');
        btns.forEach(btn => {
            btn.onclick = async () => {
                const type = btn.dataset.type;
                const id = btn.dataset.id;
                const targetReached = parseInt(btn.dataset.target);
                const game = this.scene.game || (this.scene.scene && this.scene.scene.game);
                const mm = game?.messiahManager;

                if (type === 'DUNGEON') {
                    const latestClaimed = await DBManager.getClaimedAchievements();
                    latestClaimed[id] = targetReached;
                    await DBManager.saveClaimedAchievements(latestClaimed);
                    if (mm) mm.addExp(100);
                } else {
                    const latestClaimed = await DBManager.getClaimedMonsterAchievements();
                    latestClaimed[id] = targetReached;
                    await DBManager.saveClaimedMonsterAchievements(latestClaimed);
                    if (mm) mm.addExp(150);
                }

                this.showToast(`✨ 업적 달성! 메시아 경험치 수령!`);
                btn.innerText = '수령 완료!';
                btn.style.background = '#10b981';
                btn.style.borderColor = '#34d399';
                btn.disabled = true;

                setTimeout(() => this.refreshAchievements(), 800);
            };
        });
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
            { id: 'SWAMPLAND', ticketId: 'swampland_ticket' },
            { id: 'LAVA_FIELD', ticketId: 'lava_field_ticket' },
            { id: 'WINTER_LAND', ticketId: 'winter_land_ticket' }
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

            // Fetch specific difficulty for THIS dungeon
            const difficulty = await DBManager.getSelectedDifficulty(dungeonType);
            const bestRound = await DBManager.getBestRound(dungeonType, difficulty);

            let badge = item.querySelector('.best-round-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'best-round-badge';
                item.prepend(badge);
            }

            // Update badge color based on THIS dungeon's setting
            badge.classList.remove('normal', 'nightmare', 'hell');
            badge.classList.add(difficulty.toLowerCase());

            if (bestRound > 0) {
                badge.innerText = `🚩 R${bestRound}`;
                badge.style.display = 'inline-block';
            } else {
                badge.innerText = `🚩 R0`;
                badge.style.display = 'inline-block';
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

                    // Class Emoji Icon
                    const classIcons = {
                        'warrior': '2694.svg',
                        'wizard': '1fa84.svg',
                        'archer': '1f3f9.svg',
                        'healer': '1f496.svg',
                        'bard': '1f3b6.svg'
                    };
                    const classSvg = classIcons[char.classId];
                    const classHtml = classSvg ? `<div class="merc-class-badge"><img src="assets/emojis/${classSvg}"></div>` : '';

                    const skinData = partyManager.getMercenarySkin(char.id) || { equippedSkin: null };
                    let spriteSrc = `assets/characters/party/${char.sprite}.png`;
                    if (skinData.equippedSkin) {
                        const skin = Object.values(Skins).find(s => s.id === skinData.equippedSkin);
                        if (skin) spriteSrc = `assets/characters/skin/${skin.sprite}.png`;
                    }
                    candidatesHtml += `
                        <div class="mercenary-card ${isSelected ? 'selected' : ''}" draggable="true" data-id="${char.id}" style="position:relative;">
                            ${starHtml}
                            ${levelHtml}
                            ${classHtml}
                            <img src="${spriteSrc}" alt="${char.name}">
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
                card.onclick = (e) => {
                    const id = card.dataset.id;
                    if (this.partyViewState === 'MERCE') {
                        // Show retro context menu instead of immediately deploying
                        const deployAction = () => {
                            if (currentSlots.includes(id)) return;
                            let emptyIndex = currentSlots.indexOf(null);
                            if (emptyIndex !== -1) {
                                currentSlots[emptyIndex] = id;
                                updateSlotUI(emptyIndex);
                                updateUI();
                            }
                        };
                        this.showFormationUnitContext(id, card, currentSlots, deployAction);
                    } else {
                        // Switch Pet (keep original behavior)
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
                    <div class="party-slot npc-slot" id="formation-npc-slot" style="width: 60px; height: 60px; border-style: solid; border-color: #fbbf24; cursor: pointer;">N</div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; gap: 5px;">
                    <div style="font-family: var(--font-pixel); font-size: 7px; color: #fff;">MESSIAH</div>
                    <div class="party-slot messiah-slot" id="formation-messiah-slot" style="width: 60px; height: 60px; border-style: solid; border-color: #fff; cursor: pointer;">M</div>
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

        const slotEls = overlay.querySelectorAll('.party-slots .party-slot');
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
                const skinData = partyManager.getMercenarySkin(char.id) || { equippedSkin: null };
                let spriteSrc = `assets/characters/party/${char.sprite}.png`;
                if (skinData.equippedSkin) {
                    const skin = Object.values(Skins).find(s => s.id === skinData.equippedSkin);
                    if (skin) spriteSrc = `assets/characters/skin/${skin.sprite}.png`;
                }

                slotEl.style.position = 'relative';
                slotEl.innerHTML = `
                    ${starHtml}
                    ${levelHtml}
                    <img src="${spriteSrc}" alt="${char.name}">
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

        // Support Slot Click Handlers
        overlay.querySelector('#formation-npc-slot').onclick = () => {
            this.showNPCHire();
        };
        overlay.querySelector('#formation-messiah-slot').onclick = () => {
            this.showMessiahManagement();
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

    /**
     * 편성 탭 유닛 카드 클릭 시 레트로 컨텍스트 팝업 표시.
     * "상세 정보 보기"와 "파티 편성" 두 버튼을 제공.
     */
    showFormationUnitContext(charId, cardEl, currentSlots, deployAction) {
        // 기존 컨텍스트 팝업 제거
        document.querySelectorAll('.formation-unit-ctx').forEach(e => e.remove());

        const charConfig = Characters[charId.toUpperCase()];
        if (!charConfig) return;

        const isInParty = currentSlots.includes(charId);
        const charName = charConfig.name.split(' (')[0];

        const ctx = document.createElement('div');
        ctx.className = 'formation-unit-ctx';

        // 카드 위치 기반 배치
        const rect = cardEl.getBoundingClientRect();
        const scrollY = window.scrollY || 0;
        const scrollX = window.scrollX || 0;
        ctx.style.top = (rect.bottom + scrollY + 4) + 'px';
        ctx.style.left = (rect.left + scrollX) + 'px';

        ctx.innerHTML = `
            <div class="fuc-title">${charName}</div>
            <button class="fuc-btn fuc-detail">[ 상세 정보 보기 ]</button>
            <button class="fuc-btn fuc-deploy${isInParty ? ' fuc-disabled' : ''}">[ 파티 편성 ]</button>
        `;

        document.body.appendChild(ctx);
        console.log(`[UIManager] showFormationUnitContext: ${charId}, inParty=${isInParty}`);

        // 상세 정보 버튼
        ctx.querySelector('.fuc-detail').onclick = (e) => {
            e.stopPropagation();
            ctx.remove();
            this.showFormationUnitDetail(charId);
        };

        // 파티 편성 버튼
        const deployBtn = ctx.querySelector('.fuc-deploy');
        if (!isInParty) {
            deployBtn.onclick = (e) => {
                e.stopPropagation();
                ctx.remove();
                deployAction();
            };
        }

        // 외부 클릭 시 팝업 닫기
        const closeHandler = (e) => {
            if (!ctx.contains(e.target)) {
                ctx.remove();
                document.removeEventListener('click', closeHandler, true);
            }
        };
        // 다음 tick에 등록 (현재 클릭 이벤트 버블링 방지)
        setTimeout(() => document.addEventListener('click', closeHandler, true), 0);
    }

    /**
     * 편성 탭에서 특정 용병의 ChatChannel 상세 패널을 팝업으로 표시.
     * PartyManager에서 현재 레벨/장비/그리모어를 가져와 완전히 동기화.
     */
    async showFormationUnitDetail(charId) {
        console.log(`[UIManager] showFormationUnitDetail: ${charId}`);

        const charConfig = Characters[charId.toUpperCase()];
        if (!charConfig) {
            console.warn(`[UIManager] showFormationUnitDetail: charConfig not found for ${charId}`);
            return;
        }

        const game = this.scene?.game || (this.scene?.scene && this.scene.scene.game);
        const partyManager = game?.partyManager;
        if (!partyManager) {
            console.error('[UIManager] showFormationUnitDetail: partyManager not found');
            return;
        }

        const state = partyManager.getState(charId) || partyManager.getState(charId.toLowerCase());
        const level = state?.level || 1;
        const exp = state?.exp || 0;
        const expToNextLevel = calculateExpToNextLevel(level);
        const star = partyManager.getHighestStar(charId) || partyManager.getHighestStar(charId.toLowerCase()) || 1;

        // scaleStats로 기초 성장 스탯 계산
        const classConfig = MercenaryClasses[charConfig.classId?.toUpperCase()];
        const baseConfig = {
            ...(classConfig || {}),
            ...charConfig,
            star,
            level
        };
        const scaled = scaleStats(baseConfig, level, 'NORMAL');

        // 현재 장비/그리모어 (state에서 직접)
        const equipment = state?.equipment || { weapon: null, armor: null, necklace: null, ring: null };
        const grimoire = state?.grimoire || null;

        // 펫 보너스 가져오기
        const petAtkMult = partyManager.getGlobalPetBonus ? partyManager.getGlobalPetBonus('atkMult') : 0;
        const petMAtkMult = partyManager.getGlobalPetBonus ? partyManager.getGlobalPetBonus('mAtkMult') : 0;
        const petBonuses = { atkMult: petAtkMult, mAtkMult: petMAtkMult };

        // 중앙화된 함수로 장비/그리모어/펫이 합산된 최종 스탯 계산
        const totalStats = calculateTotalStats(scaled, equipment, grimoire, petBonuses);

        // 스킨 처리
        const skinData = partyManager.getMercenarySkin(charId) || partyManager.getMercenarySkin(charId.toLowerCase()) || { equippedSkin: null };
        let spriteSrc = `assets/characters/party/${charConfig.sprite}.png`;
        if (skinData.equippedSkin) {
            const skin = Object.values(Skins).find(s => s.id === skinData.equippedSkin);
            if (skin) spriteSrc = `assets/characters/skin/${skin.sprite}.png`;
        }

        // 임시 채널 생성 또는 재활용
        if (!this._formationDetailChannel) {
            const tempContainer = document.createElement('div');
            tempContainer.style.display = 'none';
            document.body.appendChild(tempContainer);
            this._formationDetailChannel = new ChatChannel(
                'formation-detail',
                charConfig.classId,
                [],
                charConfig.name.split(' (')[0],
                spriteSrc,
                tempContainer,
                () => { },
                () => { },
                this
            );
        }

        const channel = this._formationDetailChannel;

        // 캐릭터 변경 시 캐시 초기화 (다른 캐릭터로 전환 시 dirty 블록 방지)
        if (channel.characterId !== charId) {
            channel.lastState = { stats: {}, equipment: {}, statuses: '', ultProgress: -1, narrativeKey: '' };
            channel.domCache = { stats: {}, gear: {}, perks: null, skill: {} };
        }


        // 캐릭터 데이터 바인딩
        channel.bindUnit(
            `preview-${charId}`,
            charConfig.name.split(' (')[0],
            spriteSrc,
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
            charId
        );

        // 서사: 실제 레벨로 덮어씌움
        if (charConfig.narrativeUnlocks) {
            channel.updateNarrative(charConfig.narrativeUnlocks, level);
        }

        // 현재 스탯 주입 (합산된 totalStats 사용)
        channel.updateStats({
            level,
            exp,
            expToNextLevel,
            hp: totalStats.hp,
            maxHp: totalStats.maxHp,
            atk: totalStats.atk,
            mAtk: totalStats.mAtk,
            def: totalStats.def,
            mDef: totalStats.mDef,
            speed: totalStats.speed,
            atkSpd: totalStats.atkSpd,
            atkRange: totalStats.atkRange,
            rangeMin: totalStats.rangeMin,
            rangeMax: totalStats.rangeMax,
            castSpd: totalStats.castSpd,
            acc: totalStats.acc,
            eva: totalStats.eva,
            crit: totalStats.crit,
            ultChargeSpeed: totalStats.ultChargeSpeed || 1.0,
            fireRes: totalStats.fireRes || 0,
            iceRes: totalStats.iceRes || 0,
            lightningRes: totalStats.lightningRes || 0,
            classId: charConfig.classId,
            characterId: charId
        });

        // 장비/그리모어 주입
        channel.updateEquipment(equipment, grimoire);
        console.log(`[UIManager] showFormationUnitDetail equipment:`, equipment, 'grimoire:', grimoire ? 'exists' : 'null');

        // 모든 pendingData를 channel.update()로 한 번에 flush
        // (stats, equipment, skill, narrative 전부 처리)
        channel.dirty = true;
        channel.update();

        // 그리모어 그리드(차트)는 update()에 포함되어 있지 않으므로 별도 호출
        if (grimoire) channel.updateGrimoireGrid(grimoire);

        console.log(`[UIManager] showFormationUnitDetail loaded: ${charId} Lv.${level} ★${star}, atk=${scaled.atk}, maxHp=${scaled.maxHp}`);

        // 편성 탭에서 열었다는 플래그 설정 → hidePopup이 partyFormationOverlay를 삭제하지 않음
        // popupOverlay 배경을 투명하게 설정 → 뒤에 편성 오버레이가 보이도록
        this._fromFormation = true;
        if (this.popupOverlay) this.popupOverlay.style.background = 'transparent';
        this.showCharacterDetail(channel);
    }


    hidePopup() {
        // 편성 탭에서 열린 ChatChannel 패널을 닫을 때:
        // partyFormationOverlay를 삭제하지 않고 팝업만 숨긴다.
        if (this._fromFormation && this.partyFormationOverlay) {
            console.log('[UIManager] hidePopup: Returning to formation overlay (not destroying it)');
            this._fromFormation = false;
            this.detailChannel = null;
            this.clearPopupSafe();
            this.hideTooltip();
            this.popupOverlay.style.display = 'none';
            this.popupOverlay.style.background = ''; // 배경 복원
            // partyFormationOverlay는 살아있으므로 그냥 둠
            return;
        }

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

        // --- BUGBASH: Clean up any stray DOM badges escaping container restrictions ---
        const strayBadges = document.querySelectorAll('.item-lv-tag');
        strayBadges.forEach(badge => {
            if (!badge.closest('#sidebar-right') && !badge.closest('.chat-channel')) {
                badge.remove();
            }
        });

        // Clean up sidebar-attached class if present
        if (this.popupOverlay) {
            this.popupOverlay.classList.remove('sidebar-attached');
        }
        const content = document.getElementById('popup-content');
        if (content) {
            content.classList.remove('wide');
            content.classList.remove('sidebar-attached');
        }
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
                let spriteSrc = `assets/characters/party/${charConfig.sprite}.png`;
                const partyManager = this.scene?.game?.partyManager;
                if (partyManager && merc.characterId) {
                    const skinData = partyManager.getMercenarySkin(merc.characterId);
                    if (skinData && skinData.equippedSkin) {
                        const skin = Object.values(Skins).find(s => s.id === skinData.equippedSkin);
                        if (skin) spriteSrc = `assets/characters/skin/${skin.sprite}.png`;
                    }
                }

                portrait.innerHTML = `
                    <div class="portrait-img-box">
                        <img src="${spriteSrc}" alt="${merc.unitName}">
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

        const content = document.getElementById('popup-content');
        if (content) {
            content.classList.add('sidebar-attached');
        }
        if (this.popupOverlay) {
            this.popupOverlay.classList.add('sidebar-attached');
        }

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

            // --- 3. Unique Charm Instances ---
            const charmInstances = await DBManager.getAllCharmInstances();

            // Only show in materials tab if filter is ALL or ACTIVE (since these are Chapter A charms)
            if (this.emojiFilter === 'ALL' || this.emojiFilter === 'ACTIVE') {
                charmInstances.filter(inst => !inst.ownerId).forEach(inst => {
                    const itemData = ItemManager.getItem(inst.id);
                    if (!itemData) return;

                    const filename = ItemManager.getSVGFilename(inst.id);
                    const div = document.createElement('div');
                    div.className = 'inv-item is-charm';
                    div.draggable = true;

                    // Equipped items no longer appear here, so it is always unequipped
                    const isEquipped = false;

                    div.innerHTML = `
                        <img class="inv-icon" src="assets/emojis/${filename}" alt="${inst.instanceId}" draggable="false">
                        <div class="item-lv-tag" style="position:absolute; bottom:0; right:0; background:#fbbf24; color:#000; font-size:8px; padding:1px 3px; border-radius:3px; z-index:1;">${inst.value}%</div>
                    `;

                    div.ondragstart = (e) => {
                        e.dataTransfer.setData('itemId', inst.instanceId);
                        e.dataTransfer.effectAllowed = 'copyMove';
                    };

                    div.onclick = (e) => {
                        e.stopPropagation();
                        this.handleItemClick(inst.instanceId, isEquipped);
                    };

                    this.materialList.appendChild(div);
                });
            }
        } catch (e) {
            console.error('[UIManager] Error refreshing inventory UI:', e);
        } finally {
            this.isRefreshing = false;
        }
    }

    handleItemClick(itemId, isAlreadyEquipped = false) {
        if (this.tooltipEl) this.tooltipEl.style.display = 'none'; // Kill legacy tooltip

        // --- Toggle Logic: Deselect if clicking the same item again ---
        if (this.selectedItemId === itemId) {
            // Exceptions: Do not toggle if we are in a pending equip flow
            if (!this.pendingGrimoireSlot && !this.pendingGearSlot) {
                this.deselectItem();
                return;
            }
        }

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

    /**
     * Resets current item selection and hides detail panel.
     */
    deselectItem() {
        console.log('[UIManager] deselectItem');
        this.selectedItemId = null;
        this.viewingInstanceId = null;
        if (this.detailPanel) {
            this.detailPanel.style.display = 'none';
        }
        // Clear highlights if any were added via CSS
    }

    async showItemDetail(itemId, isAlreadyEquipped = false) {
        let item = ItemManager.getItem(itemId);
        let instance = null;

        // If it's a unique equipment instance
        if (itemId.startsWith('eq_')) {
            instance = await DBManager.getEquipmentInstance(itemId);
            if (instance) {
                item = ItemManager.getItem(instance.itemId);
            }
        }
        // If it's a unique charm instance
        else if (itemId.startsWith('charm_')) {
            instance = await DBManager.getCharmInstance(itemId);
            if (instance) {
                item = ItemManager.getItem(instance.id);
            }
        }

        const charmIdLookup = (instance && itemId.startsWith('charm_')) ? instance.id : (item?.id || itemId);
        const charm = CharmManager.getCharm(charmIdLookup);

        // Prioritize charm data because it's richer for charms (it has description)
        const targetItem = charm || item;

        console.log(`[UIManager] showItemDetail: itemId=${itemId}, autoEquip=${isAlreadyEquipped}`, { hasItem: !!item, hasCharm: !!charm });

        if (!targetItem || !this.detailPanel) return;

        this.selectedItemId = itemId;

        const title = (instance && !itemId.startsWith('charm_')) ? `${targetItem.name} LV.${instance.level}` : targetItem.name;
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

            if (instance && itemId.startsWith('eq_')) {
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
            } else if (instance && itemId.startsWith('charm_')) {
                this.viewingInstanceId = instance.instanceId;
                const statName = {
                    'maxHp': '최대 체력',
                    'fireRes': '화염 저항',
                    'iceRes': '냉기 저항',
                    'lightningRes': '번개 저항'
                }[instance.stat] || instance.stat;

                descContent = `<div class="charm-stat-row">
                    <span style="color:#fbbf24; font-weight:bold;">${statName}</span>
                    <span style="color:#00ffcc; margin-left:10px;">+${instance.value}%</span>
                </div>
                <div style="margin-top:10px; font-size:11px; color:#94a3b8;">${targetItem.description || ''}</div>`; // Added || ''
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
        const item = ItemManager.getItem(itemId.startsWith('charm_') ? itemId.substring(0, itemId.indexOf('_', 6) > 0 ? itemId.indexOf('_', 6) : itemId.length) : itemId);
        // Wait, standard charm ID logic. If it starts with charm_, we need to fetch the instance to find the base ID.
        // But executeEquip is sync. Let's simplify: ItemManager.getItem() handles the base emoji_ IDs.

        let baseId = itemId;
        if (itemId.startsWith('charm_')) {
            // This is brittle if we don't know the base ID from the instanceId.
            // However, we can use a heuristic or just pass the baseId if we had it.
            // In refreshInventory, we set alt="${inst.instanceId}".
            // Let's assume most charms start with emoji_... 
            // Better: just check for charm type via CharmManager if it's not a growth gear.
        }

        const charm = CharmManager.getCharm(itemId) || (itemId.startsWith('charm_') ? true : null);

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

    async handleDiscardItem(itemId) {
        if (!itemId) return;

        const item = ItemManager.getItem(itemId);
        const name = item ? item.name : itemId;

        this.showConfirm(`정말로 [${name}] 아이템을 버리시겠습니까?`, async () => {
            try {
                if (itemId.startsWith('eq_')) {
                    await DBManager.deleteEquipmentInstance(itemId);
                    console.log(`[UIManager] Discarded gear instance: ${itemId}`);
                } else if (itemId.startsWith('charm_')) {
                    await DBManager.deleteCharmInstance(itemId);
                    console.log(`[UIManager] Discarded charm instance: ${itemId}`);
                } else {
                    // Stackable item from inventory
                    await DBManager.deleteInventoryItem(itemId);
                    console.log(`[UIManager] Discarded stackable item: ${itemId}`);
                }

                this.showToast(`[${name}] 아이템을 버렸습니다.`);
                this.selectedItemId = null;
                if (this.detailPanel) this.detailPanel.style.display = 'none';
                this.inventoryDirty = true;
            } catch (err) {
                console.error('[UIManager] Error discarding item:', err);
                this.showToast('아이템 버리기 실패');
            }
        });
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
    showUltimateCutscene(unitOrId, skillName, duration = 3000) {
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
                    left: 50%;
                    transform: translateX(-50%) scale(0.8);
                    width: 600px;
                    height: 600px;
                    background-size: contain;
                    background-repeat: no-repeat;
                    background-position: bottom;
                    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s;
                    filter: drop-shadow(0 0 10px rgba(255, 204, 0, 0.5));
                    opacity: 0;
                `;

                const text = document.createElement('div');
                text.className = 'cutscene-text';
                text.style.cssText = `
                    position: absolute;
                    bottom: 450px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 100%;
                    text-align: center;
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
            let unitId = typeof unitOrId === 'string' ? unitOrId : unitOrId.characterId;
            let spriteAsset = unitId + '_cutscene';

            // Check for skin config directly on the unit object
            if (typeof unitOrId === 'object' && unitOrId.skinConfig && unitOrId.skinConfig.cutscene) {
                spriteAsset = unitOrId.skinConfig.cutscene;
            }

            // Reset positions / content
            let assetPath = `assets/characters/party/${spriteAsset}.png`;
            if (spriteAsset.includes('fox') || spriteAsset.includes('idol')) {
                assetPath = `assets/characters/skin/${spriteAsset}.png`;
            }
            ui.sprite.style.background = `url('${assetPath}')`;
            ui.sprite.style.backgroundSize = 'contain';
            ui.sprite.style.backgroundRepeat = 'no-repeat';
            ui.sprite.style.backgroundPosition = 'bottom';
            ui.sprite.style.opacity = '0';
            ui.sprite.style.transform = 'translateX(-50%) scale(0.8)';

            ui.text.innerText = `[ ${skillName} ]`;
            ui.text.style.opacity = '0';

            ui.flash.style.opacity = '0';
            ui.flash.style.transition = 'none';

            ui.container.style.display = 'block';
            ui.container.style.opacity = '0';

            // Request Animation Frame for Snappier Transitions (Phase 1)
            requestAnimationFrame(() => {
                ui.container.style.transition = 'opacity 0.2s ease-out';
                ui.container.style.opacity = '1';
                ui.sprite.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s';
                ui.sprite.style.opacity = '1';
                ui.sprite.style.transform = 'translateX(-50%) scale(1)';
                ui.text.style.transition = 'opacity 0.2s ease-out 0.1s';
                ui.text.style.opacity = '1';
            });

            // Phase 2: Relative Flash effect (Rule #3: ~35% into the duration)
            const flashDelay = duration * 0.35;
            setTimeout(() => {
                ui.flash.style.transition = 'opacity 0.05s';
                ui.flash.style.opacity = '1';
                setTimeout(() => {
                    ui.flash.style.transition = 'opacity 0.15s';
                    ui.flash.style.opacity = '0';
                }, 80);
            }, flashDelay);

            // Phase 3: Cleanup (Relative to duration)
            const fadeOutTime = 400;
            setTimeout(() => {
                ui.container.style.transition = `opacity ${fadeOutTime / 1000}s ease-in`;
                ui.container.style.opacity = '0';
                setTimeout(() => {
                    ui.container.style.display = 'none';
                    resolve();
                }, fadeOutTime);
            }, duration - fadeOutTime);
        });
    }

    async showMercenaryRoster() {
        if (!this.popupOverlay) return;

        const rosterData = await DBManager.getMercenaryRoster();
        const mercsToShow = [Characters.NICKLE, Characters.NANA];
        this.currentRosterSelection = mercsToShow[0].id;

        const renderStat = (label, value) => `
            <div class="merc-stat-item">
                <span class="stat-label">${label}</span>
                <span class="stat-value">${value}</span>
            </div>
        `;

        const renderMercDetail = (m) => {
            const rosterItem = rosterData[m.id] || rosterData[m.id.toUpperCase()] || { stars: {}, total: 0 };
            const totalPulls = rosterItem.total || 0;
            const classConfig = MercenaryClasses[m.classId.toUpperCase()];

            // Stats mapping
            const stats = [
                { label: 'HP', val: classConfig.maxHp },
                { label: 'ATK', val: m.atk || classConfig.atk },
                { label: 'M.ATK', val: m.mAtk || classConfig.mAtk },
                { label: 'DEF', val: m.def || classConfig.def },
                { label: 'M.DEF', val: m.mDef || classConfig.mDef },
                { label: 'SPD', val: m.speed || classConfig.speed },
                { label: 'ATK.SPD', val: m.atkSpd || classConfig.atkSpd },
                { label: 'RANGE', val: m.atkRange || classConfig.atkRange },
                { label: 'CAST', val: m.castSpd || classConfig.castSpd },
                { label: 'ACC', val: m.acc || classConfig.acc },
                { label: 'EVA', val: m.eva || classConfig.eva },
                { label: 'CRIT', val: (m.crit || classConfig.crit) + '%' }
            ];

            return `
                <div class="merc-detail-view" id="merc-detail-${m.id}">
                    <div class="merc-detail-header">
                        <div class="merc-detail-left-col">
                            <div class="merc-detail-sprite-wrap">
                                <img src="assets/characters/party/${m.sprite}.png" class="merc-detail-sprite">
                            </div>
                            <button class="theme-skin-btn active-btn" onclick="window.uiManager.openSkinSelector('${m.id}')">[테마 스킨 교체]</button>
                        </div>
                        <div class="merc-detail-title-info">
                            <div class="merc-detail-name-row">
                                <span class="merc-detail-name">${m.name}</span>
                                <span class="merc-detail-count">보유: ${totalPulls}</span>
                            </div>
                            <div class="merc-detail-desc">${m.personality}</div>
                        </div>
                    </div>
                    
                    <div class="merc-detail-columns">
                        <div class="merc-stats-section">
                            <div class="section-title">DETAILED STATISTICS</div>
                            <div class="merc-stats-grid">
                                ${stats.map(s => renderStat(s.label, s.val)).join('')}
                            </div>
                        </div>

                        <div class="merc-skills-section">
                            <div class="section-title">SKILLS & ULTIMATE</div>
                            <div class="merc-skills-grid">
                                <div class="merc-skill-card">
                                    <div class="skill-header">
                                        <span class="skill-emoji">${m.skillEmoji}</span>
                                        <span class="skill-name">${m.skillName}</span>
                                    </div>
                                    <div class="skill-desc">${m.skillDescription}</div>
                                </div>
                                <div class="merc-skill-card ultimate">
                                    <div class="skill-header">
                                        <span class="skill-emoji">✨</span>
                                        <span class="skill-name">${m.ultimateName}</span>
                                    </div>
                                    <div class="skill-desc">${m.ultimateDescription}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        };

        const rosterHtml = `
            <div class="mercenary-roster-v2">
                <style>
                    .mercenary-roster-v2 {
                        display: flex;
                        width: 100%;
                        height: 100%;
                        background: #0f172a;
                        color: #e2e8f0;
                        font-family: 'Outfit', sans-serif;
                        overflow: hidden;
                    }
                    /* Sidebar */
                    .roster-sidebar {
                        width: 100px;
                        background: rgba(30, 41, 59, 0.8);
                        border-right: 2px solid #334155;
                        display: flex;
                        flex-direction: column;
                        padding: 10px;
                        gap: 10px;
                        overflow-y: auto;
                        flex-shrink: 0;
                    }
                    .sidebar-item {
                        width: 70px;
                        height: 70px;
                        background: #1e293b;
                        border: 2px solid #475569;
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        flex-shrink: 0;
                        position: relative;
                    }
                    .sidebar-item:hover { transform: scale(1.05); border-color: #94a3b8; }
                    .sidebar-item.active { border-color: #fbbf24; background: #334155; box-shadow: 0 0 10px rgba(251, 191, 36, 0.3); }
                    .sidebar-thumb { width: 48px; height: 48px; image-rendering: pixelated; }

                    /* Content */
                    .roster-content {
                        flex: 1;
                        min-width: 0;
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                        overflow: hidden;
                    }
                    .merc-detail-view {
                        flex: 1;
                        padding: 24px;
                        overflow-y: auto;
                        display: flex;
                        flex-direction: column;
                        gap: 20px;
                        min-width: 0;
                    }
                    .section-title {
                        font-family: 'Press Start 2P', cursive;
                        font-size: 10px;
                        color: #64748b;
                        margin-bottom: 10px;
                        letter-spacing: 1px;
                        border-left: 3px solid #fbbf24;
                        padding-left: 8px;
                    }

                    /* Detail Header */
                    .merc-detail-header { display: flex; gap: 15px; align-items: flex-start; flex-wrap: wrap; }
                    .merc-detail-left-col { display: flex; flex-direction: column; gap: 12px; width: 110px; align-items: center; flex-shrink: 0; }
                    .merc-detail-sprite-wrap {
                        width: 100%; height: 110px;
                        background: radial-gradient(circle, #334155 0%, #0f172a 100%);
                        border: 2px solid #475569;
                        border-radius: 12px;
                        display: flex; align-items: center; justify-content: center;
                    }
                    .merc-detail-sprite { width: 90px; height: 90px; image-rendering: pixelated; }
                    .merc-detail-title-info { flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 150px; }
                    .merc-detail-name-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 5px; }
                    .merc-detail-name { font-size: 24px; font-weight: 900; color: #fbbf24; text-shadow: 0 2px 4px rgba(0,0,0,0.5); word-break: keep-all; }
                    .merc-detail-count { background: #7c3aed; padding: 2px 6px; border-radius: 6px; font-size: 11px; font-weight: bold; white-space: nowrap; }
                    .merc-detail-desc { 
                        font-size: 13px; color: #cbd5e1; line-height: 1.5; font-style: italic; 
                        max-height: 100px; overflow-y: auto; padding-right: 5px;
                        word-break: break-word;
                    }
                    .merc-detail-desc::-webkit-scrollbar { width: 4px; }
                    .merc-detail-desc::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }

                    /* Stats Grid */
                    .merc-stats-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(50px, 1fr));
                        gap: 8px;
                        background: rgba(30, 41, 59, 0.5);
                        padding: 12px;
                        border-radius: 12px;
                        border: 1px solid #334155;
                    }
                    .merc-stat-item { display: flex; flex-direction: column; gap: 4px; align-items: center; text-align: center; }
                    .stat-label { font-size: 9px; color: #94a3b8; font-weight: bold; }
                    .stat-value { color: #f8fafc; font-weight: 800; font-family: 'Press Start 2P', cursive; font-size: 9px; }

                    /* Skills */
                    .merc-skills-section { display: flex; flex-direction: column; gap: 10px; }
                    .merc-skills-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
                    .merc-skill-card {
                        background: #1e293b;
                        border: 1px solid #334155;
                        border-radius: 10px;
                        padding: 12px;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }
                    .merc-skill-card.ultimate { border-color: #fbbf24; background: rgba(251, 191, 36, 0.05); }
                    .skill-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
                    .skill-emoji { font-size: 18px; }
                    .skill-name { font-size: 15px; font-weight: bold; color: #fbbf24; }
                    .skill-desc { font-size: 12px; color: #cbd5e1; line-height: 1.5; }

                    /* Desktop Columns */
                    .merc-detail-columns {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                        margin-top: 10px;
                    }
                    @media (max-width: 800px) {
                        .merc-detail-columns {
                            grid-template-columns: 1fr;
                        }
                    }

                    .theme-skin-btn {
                        background: #1e293b; border: 1px solid #fbbf24; border-radius: 6px;
                        color: #fbbf24; padding: 8px 4px; cursor: pointer; font-weight: bold;
                        transition: all 0.2s; font-family: 'Press Start 2P', cursive; font-size: 8px;
                        width: 100%; text-align: center; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    }
                    .theme-skin-btn.active-btn { border-color: #fbbf24; color: #fbbf24; background: rgba(251, 191, 36, 0.1); box-shadow: 0 0 10px rgba(251, 191, 36, 0.15); }
                    .theme-skin-btn.active-btn:hover { background: #fbbf24; color: #0f172a; box-shadow: 0 0 15px rgba(251, 191, 36, 0.4); transform: translateY(-2px); }

                    /* Skin Selector Modal */
                    .skin-selector-overlay {
                        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                        background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 30000;
                        backdrop-filter: blur(8px);
                    }
                    .skin-selector-card {
                        background: #1e293b; border: 2px solid #fbbf24; border-radius: 16px;
                        width: 500px; padding: 25px; display: flex; flex-direction: column; gap: 20px;
                        box-shadow: 0 0 30px rgba(251, 191, 36, 0.2);
                    }
                    .skin-selector-header { display: flex; justify-content: space-between; align-items: center; }
                    .skin-selector-title { font-size: 20px; color: #fbbf24; font-weight: bold; }
                    .skin-selector-close { cursor: pointer; color: #94a3b8; font-size: 24px; }
                    
                    .skin-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
                    .skin-item {
                        border: 2px solid #334155; border-radius: 12px; padding: 10px;
                        display: flex; flex-direction: column; align-items: center; gap: 10px;
                        transition: all 0.2s; cursor: pointer; background: rgba(15, 23, 42, 0.5);
                    }
                    .skin-item:hover { transform: translateY(-5px); border-color: #475569; }
                    .skin-item.owned { border-color: #fbbf24; }
                    .skin-item.equipped { background: rgba(251, 191, 36, 0.1); border-color: #fbbf24; box-shadow: 0 0 10px rgba(251, 191, 36, 0.2); }
                    
                    .skin-thumb { width: 80px; height: 80px; image-rendering: pixelated; }
                    .skin-name { font-size: 14px; font-weight: bold; color: #f8fafc; text-align: center; }
                    .skin-price { color: #fbbf24; font-size: 12px; font-weight: bold; display: flex; align-items: center; gap: 4px; }
                    .skin-equipped-tag { font-size: 10px; color: #fbbf24; font-weight: bold; }
                    .skin-bonus { font-size: 11px; color: #94a3b8; text-align: center; font-style: italic; }
                </style>

                <div class="roster-sidebar">
                    ${mercsToShow.map(m => `
                        <div class="sidebar-item ${m.id === this.currentRosterSelection ? 'active' : ''}" 
                             id="roster-item-${m.id}" 
                             onclick="window.uiManager.switchRosterSelection('${m.id}')">
                            <img src="assets/characters/party/${m.sprite}.png" class="sidebar-thumb">
                        </div>
                    `).join('')}
                </div>

                <div class="roster-content" id="roster-detail-container">
                    ${renderMercDetail(mercsToShow.find(m => m.id === this.currentRosterSelection))}
                </div>
            </div>
        `;

        // We need a global way to handle the switch since the HTML is static
        window.uiManager = this;
        this.switchRosterSelection = (id) => {
            const m = mercsToShow.find(merc => merc.id === id);
            if (!m) return;

            this.currentRosterSelection = id;

            // Update sidebar active state
            document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
            const activeItem = document.getElementById(`roster-item-${id}`);
            if (activeItem) activeItem.classList.add('active');

            // Update content
            const container = document.getElementById('roster-detail-container');
            if (container) {
                container.innerHTML = renderMercDetail(m);
            }
        };

        this.openSkinSelector = async (charId) => {
            const skinData = await DBManager.getMercenarySkinData(charId);
            const availableSkins = Object.values(Skins).filter(s => s.characterId === charId);

            const modal = document.createElement('div');
            modal.className = 'skin-selector-overlay';

            modal.innerHTML = `
                <div class="skin-selector-card">
                    <div class="skin-selector-header">
                        <span class="skin-selector-title">스킨 선택 - ${charId.toUpperCase()}</span>
                        <span class="skin-selector-close" onclick="this.closest('.skin-selector-overlay').remove()">×</span>
                    </div>
                    <div class="skin-list">
                        <!-- Default Skin -->
                        <div class="skin-item ${!skinData.equippedSkin ? 'equipped owned' : 'owned'}" 
                             onclick="window.uiManager.handleSkinAction('${charId}', 'default')">
                            <img src="assets/characters/party/${charId}_sprite.png" class="skin-thumb">
                            <span class="skin-name">기본 외형</span>
                            ${!skinData.equippedSkin ? '<span class="skin-equipped-tag">[착용 중]</span>' : ''}
                        </div>
                        
                        ${availableSkins.map(s => {
                const isOwned = skinData.ownedSkins.includes(s.id);
                const isEquipped = skinData.equippedSkin === s.id;
                return `
                                <div class="skin-item ${isOwned ? 'owned' : ''} ${isEquipped ? 'equipped' : ''}"
                                     onclick="window.uiManager.handleSkinAction('${charId}', '${s.id}')">
                                    <img src="assets/characters/skin/${s.sprite}.png" class="skin-thumb">
                                    <span class="skin-name">${s.name}</span>
                                    <span class="skin-bonus">${s.abilityBonus.bonusText}</span>
                                    ${isEquipped ? '<span class="skin-equipped-tag">[착용 중]</span>' :
                        isOwned ? '<span class="skin-price">보유 중</span>' :
                            `<span class="skin-price">💎 ${s.price.toLocaleString()}</span>`}
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
        };

        this.handleSkinAction = async (charId, skinId) => {
            const skinData = await DBManager.getMercenarySkinData(charId);
            const skin = Object.values(Skins).find(s => s.id === skinId);

            if (skinId === 'default') {
                await DBManager.setEquippedSkin(charId, null);
                this.updateSkinUI(charId, null);
            } else if (skinData.ownedSkins.includes(skinId)) {
                await DBManager.setEquippedSkin(charId, skinId);
                this.updateSkinUI(charId, skinId);
            } else {
                // Buy logic
                this.showConfirm(`${skin.name} 스킨을 ${skin.price.toLocaleString()}다이아에 구매하시겠습니까?`, async () => {
                    const result = await DBManager.buySkin(charId, skinId, skin.price);
                    if (result.success) {
                        this.showToast('구매 완료!', 'success');
                        await DBManager.setEquippedSkin(charId, skinId);
                        EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);
                        this.updateSkinUI(charId, skinId);
                    } else {
                        this.showToast(result.message, 'error');
                    }
                });
                return; // Wait for callback
            }
        };

        this.updateSkinUI = async (charId, skinId) => {
            // Update PartyManager cache immediately if possible
            if (window._partyManagerInstance) {
                await window._partyManagerInstance.loadSkinData(charId);
            }

            // Refresh
            document.querySelector('.skin-selector-overlay')?.remove();
            await this.showMercenaryRoster();

            // Notify game to update sprites if in scene
            EventBus.emit('SKIN_CHANGED', { charId, skinId });
        };

        this.showPopup(rosterHtml, true);
    }
}
