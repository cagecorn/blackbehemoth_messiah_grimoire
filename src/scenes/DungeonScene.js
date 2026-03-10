import Phaser from 'phaser';
import DungeonManager from '../modules/Dungeon/DungeonManager.js';
import Warrior from '../modules/Player/Warrior.js';
import Goblin from '../modules/AI/Goblin.js';
import Orc from '../modules/AI/Orc.js';
import SkeletonWarrior from '../modules/AI/SkeletonWarrior.js';
import SkeletonWizard from '../modules/AI/SkeletonWizard.js';
import CrocodileWarrior from '../modules/AI/CrocodileWarrior.js';
import CrocodileArcher from '../modules/AI/CrocodileArcher.js';
import CrocodileHealer from '../modules/AI/CrocodileHealer.js';
import FireSpiritWarrior from '../modules/AI/FireSpiritWarrior.js';
import FireSpiritArcher from '../modules/AI/FireSpiritArcher.js';
import FireSpiritWizard from '../modules/AI/FireSpiritWizard.js';
import IceSpiritWarrior from '../modules/AI/IceSpiritWarrior.js';
import IceSpiritWizard from '../modules/AI/IceSpiritWizard.js';
import IceSpiritHealer from '../modules/AI/IceSpiritHealer.js';
import MonsterHealer from '../modules/AI/MonsterHealer.js';
import Archer from '../modules/Player/Archer.js';
import Healer from '../modules/Player/Healer.js';
import Wizard from '../modules/Player/Wizard.js';
import Aina from '../modules/Player/Aina.js';
import Bao from '../modules/Player/Bao.js';
import Bard from '../modules/Player/Bard.js';
import Nana from '../modules/Player/Nana.js';
import Nickle from '../modules/Player/Nickle.js';
import Noah from '../modules/Player/Noah.js';
import Noel from '../modules/Player/Noel.js';
import Wrinkle from '../modules/Player/Wrinkle.js';
import Veve from '../modules/Player/Veve.js';
import HiredWarrior from '../modules/Player/HiredWarrior.js';
import HiredArcher from '../modules/Player/HiredArcher.js';
import ProjectileManager from '../modules/Combat/ProjectileManager.js';
import ParticleManager from '../modules/Particles/ParticleManager.js';
import FXManager from '../modules/Combat/FXManager.js';
import UltimateManager from '../modules/Combat/UltimateManager.js';
import AoeManager from '../modules/Combat/AoeManager.js';
import CCManager from '../modules/Combat/CCManager.js';
import ShieldManager from '../modules/Combat/ShieldManager.js';
import LootManager from '../modules/Loot/LootManager.js';
import { MercenaryClasses, MonsterClasses, StageConfigs, Characters, scaleStats } from '../modules/Core/EntityStats.js';
import SeparationManager from '../modules/Core/SeparationManager.js';
import BuffManager from '../modules/Core/BuffManager.js';
import StageManager from '../modules/Environment/StageManager.js';
import WeatherManager from '../modules/Environment/WeatherManager.js';
import AmbientMoteManager from '../modules/Environment/AmbientMoteManager.js';
import DynamicCameraManager from '../modules/Core/DynamicCameraManager.js';
import EventBus from '../modules/Events/EventBus.js';
import BarkManager from '../modules/AI/BarkManager.js';
import PetManager from '../modules/Player/PetManager.js';
import DBManager from '../modules/Database/DBManager.js';
import buildingManager from '../modules/Core/BuildingManager.js';
import SupportActionManager from '../modules/Combat/SupportActionManager.js';
import npcManager from '../modules/Core/NPCManager.js';
import foodManager from '../modules/Core/FoodManager.js';
import GrimoireManager from '../modules/Core/GrimoireManager.js';
import equipmentManager from '../modules/Core/EquipmentManager.js';
import StructureManager from '../modules/Core/StructureManager.js';
import fishingManager from '../modules/Core/FishingManager.js';
import alchemyManager from '../modules/Core/AlchemyManager.js';

// partyManager will be accessed via this.game.partyManager


export default class DungeonScene extends Phaser.Scene {
    constructor() {
        super('DungeonScene');
        this.dungeonManager = null;
        this.lootManager = null;
        this.player = null; // Leader focus
        this.mercenaries = null;
        this.enemies = null;
        this.currentRound = 1;
        this.isResting = false;
        this.weatherManager = null;
        this.ambientMoteManager = null;
        this.supportActionManager = null;
        this.structureManager = null;
        this.foodManager = null;
        this.grimoireManager = null;

        // Construction Mode State
        this.isConstructionMode = false;
        this.selectedStructureId = null; // Instance ID to place

        // Reward values
        this.killExp = 25;
        this.roundClearExp = 500;
        this.activeFoodBuffs = { PARTY_EXP_BONUS: 0, EQUIP_EXP_BONUS: 0 };

    }

    init(data) {
        this.dungeonType = data?.dungeonType || 'CURSED_FOREST';
        this.dungeonId = this.dungeonType; // Crucial for Structure Persistence
        this.currentRound = data?.startRound || 1;

        console.log(`%c[Dungeon DEBUG] Scene Init - Type: ${this.dungeonType} | Round: ${this.currentRound}`, "background: #222; color: #ff00ff; font-weight: bold;");
        const cfg = StageConfigs[this.dungeonType];
        if (cfg) {
            console.log(`%c[Dungeon DEBUG] StageConfigs detected: ${cfg.name} | Pool: ${JSON.stringify(cfg.monsterPool)}`, "background: #222; color: #00ffff;");
            EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[입장] ${cfg.name}에 진입했습니다. (라운드 ${this.currentRound}) 🚩`);
        } else {
            console.error(`%c[Dungeon ERROR] StageConfigs for '${this.dungeonType}' is missing!`, "background: #f00; color: #fff;");
        }

        // Reset state on every entry
        this.isResting = false;
        this.isUltimateActive = false;
        this.isResetting = false;
        this.isInitializing = true;

        // Reset particle pools to avoid "sys" TypeErrors from dead objects
        this.resParticlePool = [];
        this.messiahTextPool = [];

        // Global Heal on Scene Entry
        if (this.game.partyManager) this.game.partyManager.healAll();
    }

    async create() {
        console.log('DungeonScene started');
        this.cameras.main.setBackgroundColor('#000000');
        this.isInitializing = true;

        // Create Groups immediately (Sync)
        this.mercenaries = this.physics.add.group();
        this.enemies = this.physics.add.group();

        // --- Messiah Effect Pooling ---
        this.messiahTextPool = [];
        this.messiahParticlePool = this.physics.add.group({
            classType: Phaser.GameObjects.Arc,
            maxSize: 100,
            runChildUpdate: false
        });

        // --- Monster Pooling ---
        this.monsterPool = {}; // Map of class names to arrays of pooled instances

        // --- UI Layer for Overlays ---
        this.uiLayer = this.add.container(0, 0).setScrollFactor(0).setDepth(40000);

        await this.initDungeon();
    }

    async initDungeon() {
        // --- 1. Foundational Logic: Set Dimensions & Bounds immediately ---
        // This prevents race conditions where physics runs with default bounds while we await tickets.
        // Background base 1536x1024 * 1.5 = 2304x1536
        // Tiles (32px): 2304/32 = 72, 1536/32 = 48 (Defined in DungeonManager)
        const worldWidth = 72 * 32;
        const worldHeight = 48 * 32;

        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

        // --- Viewport Constraint: Prevent UI overlap ---
        // Refined offsets based on visual feedback to minimize black bars.
        const topOffset = 60;
        const bottomOffset = 40;
        const gameHeight = this.scale.height;
        const visibleHeight = gameHeight - topOffset - bottomOffset;

        // Set the camera to render only in the central visible strip
        this.cameras.main.setViewport(0, topOffset, this.scale.width, visibleHeight);

        // --- 2. Emergency Camera Setup: Enable basic zoom/controls immediately ---
        // Create a temporary camera target at center so user can zoom/pan during ticket check
        this.cameraTarget = this.add.container(worldWidth / 2, worldHeight / 2);
        this.dynamicCamera = new DynamicCameraManager(this, this.cameras.main);
        this.dynamicCamera.setTarget(this.cameraTarget);

        console.log(`[Dungeon] Initializing World Bounds: ${worldWidth}x${worldHeight} | Viewport: ${this.scale.width}x${visibleHeight} @ y:${topOffset}`);

        // --- Difficulty Setup ---
        this.difficulty = await DBManager.getSelectedDifficulty(this.dungeonType);
        console.log(`%c[Dungeon] Difficulty selected for ${this.dungeonType}: ${this.difficulty}`, "background: #222; color: #fb7185; font-weight: bold;");

        const stageConfig = StageConfigs[this.dungeonType] || StageConfigs.CURSED_FOREST;
        this.difficultyCfg = stageConfig.difficulties ? stageConfig.difficulties[this.difficulty] : { levelOffset: 0, spawnMult: 1, epicChanceBase: 0 };

        try {
            // --- Ticket Check (Only on Round 1 Entry/Loop) ---
            if (this.dungeonType === 'UNDEAD_GRAVEYARD' && this.currentRound === 1) {
                const ticket = await DBManager.getInventoryItem('emoji_ticket');
                if (!ticket || ticket.amount <= 0) {
                    if (this.game.uiManager) this.game.uiManager.showToast('입장권이 소진되어 [저주받은 숲]으로 이동합니다! 🎫');
                    this.scene.start('DungeonScene', { dungeonType: 'CURSED_FOREST', startRound: 1 });
                    return;
                }
                // Deduct Ticket
                await DBManager.saveInventoryItem('emoji_ticket', ticket.amount - 1);
                EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);
                EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[입장] 언데드 묘지 입장권 1장을 소모했습니다. 🎫`);
            } else if (this.dungeonType === 'SWAMPLAND' && this.currentRound === 1) {
                const ticket = await DBManager.getInventoryItem('swampland_ticket');
                if (!ticket || ticket.amount <= 0) {
                    if (this.game.uiManager) this.game.uiManager.showToast('입장권이 소진되어 [저주받은 숲]으로 이동합니다! 🎫');
                    this.scene.start('DungeonScene', { dungeonType: 'CURSED_FOREST', startRound: 1 });
                    return;
                }
                // Deduct Ticket
                await DBManager.saveInventoryItem('swampland_ticket', ticket.amount - 1);
                EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);
                EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[입장] 늪지대 입장권 1장을 소모했습니다. 🎫`);
            } else if (this.dungeonType === 'LAVA_FIELD' && this.currentRound === 1) {
                const ticket = await DBManager.getInventoryItem('lava_field_ticket');
                if (!ticket || ticket.amount <= 0) {
                    if (this.game.uiManager) this.game.uiManager.showToast('입장권이 소진되어 [저주받은 숲]으로 이동합니다! 🎫');
                    this.scene.start('DungeonScene', { dungeonType: 'CURSED_FOREST', startRound: 1 });
                    return;
                }
                // Deduct Ticket
                await DBManager.saveInventoryItem('lava_field_ticket', ticket.amount - 1);
                EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);
                EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[입장] 용암 지대 입장권 1장을 소모했습니다. 🎫`);
            } else if (this.dungeonType === 'WINTER_LAND' && this.currentRound === 1) {
                const ticket = await DBManager.getInventoryItem('winter_land_ticket');
                if (!ticket || ticket.amount <= 0) {
                    if (this.game.uiManager) this.game.uiManager.showToast('입장권이 소진되어 [저주받은 숲]으로 이동합니다! 🎫');
                    this.scene.start('DungeonScene', { dungeonType: 'CURSED_FOREST', startRound: 1 });
                    return;
                }
                // Deduct Ticket
                await DBManager.saveInventoryItem('winter_land_ticket', ticket.amount - 1);
                EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);
                EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[입장] 겨울의 나라 입장권 1장을 소모했습니다. 🎫`);
            }

            if (this.game.uiManager) {
                this.game.uiManager.scene = this;
            }

            // Enable multi-touch for pinch zoom
            this.input.addPointer(1);

            // --- Support Action Manager Initialization ---
            this.supportActionManager = new SupportActionManager(this);
            this.events.once('shutdown', () => {
                if (this.supportActionManager) this.supportActionManager.destroy();
            });

            // --- Construction / Deployment Input ---
            this.input.on('pointerdown', this.handleConstructionPointer, this);
            this.input.on('pointermove', this.handleConstructionDrag, this);
            this.input.on('pointerup', this.handleConstructionUp, this);

            // --- Messiah Touch Interaction ---
            this.input.on('pointerdown', this.handleMessiahTouch, this);

            // Play Random BGM
            const bgms = ['main_battle_bgm_1', 'main_battle_bgm_2', 'main_battle_bgm_3'];
            const randomBgm = Phaser.Utils.Array.GetRandom(bgms);
            if (this.sound.get(randomBgm)) {
                // Already initialized
            }
            this.sound.stopAll();
            this.bgm = this.sound.add(randomBgm, { volume: 0.3, loop: true });
            this.bgm.play();

            // --- Retro Bitcrusher & Lowpass Filter for BGM ---
            if (this.sound.context && this.bgm.gainNode) {
                try {
                    const ctx = this.sound.context;
                    const bitCrusher = ctx.createWaveShaper();
                    const bitDepth = 4;
                    const step = Math.pow(0.5, bitDepth);
                    const size = 4096;
                    const curve = new Float32Array(size);
                    for (let i = 0; i < size; i++) {
                        const x = (i * 2 / size) - 1;
                        curve[i] = Math.round(x / step) * step;
                    }
                    bitCrusher.curve = curve;

                    const lowpass = ctx.createBiquadFilter();
                    lowpass.type = 'lowpass';
                    lowpass.frequency.value = 2000;

                    const distNode = ctx.createWaveShaper();
                    function makeDistortionCurve(amount) {
                        let k = typeof amount === 'number' ? amount : 50;
                        let n_samples = 44100;
                        let c = new Float32Array(n_samples);
                        let deg = Math.PI / 180;
                        for (let i = 0; i < n_samples; ++i) {
                            let x = i * 2 / n_samples - 1;
                            c[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
                        }
                        return c;
                    }
                    distNode.curve = makeDistortionCurve(20);
                    distNode.oversample = '4x';

                    this.bgm.gainNode.disconnect();
                    this.bgm.gainNode.connect(bitCrusher);
                    bitCrusher.connect(distNode);
                    distNode.connect(lowpass);
                    lowpass.connect(this.sound.destination);
                } catch (e) {
                    console.warn('[Audio] Failed to apply BGM Bitcrusher:', e);
                }
            }

            // --- Fishing System Integration ---
            if (this.game.uiManager) {
                this.game.uiManager.initRightNPCHUD();
            }

            // --- Initial Food & Fish Buff Consumption ---
            this.activeFoodBuffs = await foodManager.consumeForRound();
            await fishingManager.processAutoConsume(this.currentRound);

            fishingManager.lastTurnTime = 0; // Tracking for periodic fishing
            alchemyManager.lastTurnTime = 0; // Tracking for periodic alchemy

            // Initialize Managers
            this.dungeonManager = new DungeonManager(this);
            this.dungeonManager.generateDungeon();

            const stageConfig = StageConfigs[this.dungeonType] || StageConfigs.CURSED_FOREST;
            this.stageManager = new StageManager(this, stageConfig);
            this.stageManager.buildStage(worldWidth, worldHeight);

            const finalWidth = this.dungeonManager.dungeonInstance.width * 32;
            const finalHeight = this.dungeonManager.dungeonInstance.height * 32;
            this.cameras.main.setBounds(0, 0, finalWidth, finalHeight);
            this.physics.world.setBounds(0, 0, finalWidth, finalHeight);

            console.log(`[Dungeon] Stage Built: ${finalWidth}x${finalHeight}`);

            // --- Global Debug helper for user ---
            window.showWorldBounds = () => {
                console.log(`World Bounds: 0..${worldWidth}, 0..${worldHeight}`);
                console.log(`Camera Bounds: ${this.cameras.main._bounds.x}..${this.cameras.main._bounds.width}`);
                const bg = this.children.list.find(c => c.texture && c.texture.key.includes('bg'));
                if (bg) console.log(`BG: Pos(${bg.x},${bg.y}), Size(${bg.displayWidth},${bg.displayHeight})`);
            };

            // Initialize Managers (Continued)

            this.fxManager = new FXManager(this);
            this.ultimateManager = new UltimateManager(this);
            this.aoeManager = new AoeManager(this);
            this.lootManager = new LootManager(this);
            this.projectileManager = new ProjectileManager(this);
            this.particleManager = new ParticleManager(this);
            this.buffManager = new BuffManager(this);
            this.ccManager = new CCManager(this);
            this.shieldManager = new ShieldManager(this);
            this.barkManager = new BarkManager(this);
            this.petManager = new PetManager(this);
            // foodManager and grimoireManager are imported instances/classes, no need to 'new' if they aren't per-scene managers
            this.structureManager = new StructureManager(this);
            await this.structureManager.initDungeonStructures();


            // ⚔️ Premium Skill FX Layer (with Global Bloom)
            // This layer hosts all magical effects, projectiles, and skill visuals.
            // It sits above units but below the UI/HUD.
            this.skillFxLayer = this.add.container(0, 0);
            this.skillFxLayer.setDepth(15000); // Between units (~5000-10000) and Damage Text (~20000)

            if (this.skillFxLayer.postFX && localStorage.getItem('batterySaver') !== 'true') {
                const bloom = this.skillFxLayer.postFX.addBloom(0xffffff, 1, 1, 1.2, 3);
                console.log('[Visuals] Skill FX Bloom Pipeline Active! ✨ (Golden Glow enabled)');
            }

            if (this.game.uiManager) {
                this.game.uiManager.scene = this;
            }

            // --- Food Buff Initialization (Round 1) ---
            this.activeFoodBuffs = await foodManager.consumeForRound();
            if (this.game.uiManager) this.game.uiManager.updateFoodHUD();

            // Sync Equipment Multiplier (for Strawberry Cake)
            equipmentManager.expMultiplier = 1.0 + (this.activeFoodBuffs.EQUIP_EXP_BONUS || 0);

            // Listen for Character Swap

            this.handleDebugSwapListener = this.handleDebugSwap.bind(this);
            EventBus.on(EventBus.EVENTS.DEBUG_SWAP_CHARACTER, this.handleDebugSwapListener);

            // Global Combat Events for Rewards - Store as reference for cleanup
            this.handleMonsterKilledListener = (payload) => {
                if (this.mercenaries && this.mercenaries.active) {
                    const monsterLevel = payload.level || 1;
                    const monsterId = payload.id || '';
                    const isElite = payload.isElite || false;
                    const isShadow = (payload.monsterId && typeof payload.monsterId === 'string' && payload.monsterId.toLowerCase().includes('shadow'));

                    // Base XP Scaling: monsterExpReward * (1 + (level - 1) * 0.1)
                    // Uses per-monster expReward if available, falls back to global killExp
                    // Epic monsters already have a higher expReward baked in (no extra multiplier needed)
                    const baseExp = payload.expReward || this.killExp;
                    let calculatedExp = baseExp * (1 + (monsterLevel - 1) * 0.1);

                    // --- Food Buff: Party EXP Bonus ---
                    if (this.activeFoodBuffs.PARTY_EXP_BONUS > 0) {
                        calculatedExp *= (1 + this.activeFoodBuffs.PARTY_EXP_BONUS);
                    }

                    if (isShadow) {
                        calculatedExp *= 5.0;
                    } else if (isElite) {
                        calculatedExp *= 3.0;
                    }

                    calculatedExp = Math.floor(calculatedExp);

                    // Ensure a minimum of killExp
                    calculatedExp = Math.max(calculatedExp, this.killExp);

                    this.mercenaries.getChildren().forEach(merc => {
                        if (merc.active && merc.hp > 0 && typeof merc.addExp === 'function') {
                            merc.addExp(calculatedExp);
                        }
                    });
                }
            };
            EventBus.on(EventBus.EVENTS.MONSTER_KILLED, this.handleMonsterKilledListener);

            // Resurrection Listener
            this.pendingResurrections = new Set();
            this.handleResurrectionListener = this.handleResurrection.bind(this);
            EventBus.on(EventBus.EVENTS.MERCENARY_RESURRECT, this.handleResurrectionListener);

            // Cleanup on scene shutdown - CENTRALIZED CLEANUP
            this.events.once('shutdown', () => {
                EventBus.off(EventBus.EVENTS.BATTERY_SAVER_TOGGLED, this.onBatterySaverToggled, this);
                EventBus.off(EventBus.EVENTS.DEBUG_SWAP_CHARACTER, this.handleDebugSwapListener);
                EventBus.off(EventBus.EVENTS.MONSTER_KILLED, this.handleMonsterKilledListener);
                EventBus.off(EventBus.EVENTS.MERCENARY_RESURRECT, this.handleResurrectionListener);

                if (this.fxManager) this.fxManager.destroy();
                if (this.weatherManager) this.weatherManager.destroy();
                if (this.ambientMoteManager) this.ambientMoteManager.destroy();

                if (this.game.uiManager) this.game.uiManager.updateRoundDisplay(null);
                console.log('[DungeonScene] Total Shutdown: Removed EventBus listeners + Cleaned up Managers.');
            });

            // --- 3. Spawn Player Party (Dungeon Start) ---
            const activeParty = this.game.partyManager.getActiveParty();
            const startPos = { x: 400, y: 512 }; // Standard starting position
            let playerLeader = null;

            activeParty.forEach((charId, i) => {
                if (!charId) return;

                const charConfig = Object.values(Characters).find(c => c.id === charId);
                if (!charConfig) return;

                const star = this.game.partyManager.getHighestStar(charId);
                const state = this.game.partyManager.getState(charId) || { level: 1 };
                const level = state.level || 1;
                const skinData = this.game.partyManager.getMercenarySkin(charId);

                // Apply Level/Star Scaling
                const scaledConfig = scaleStats({ ...charConfig, star: star }, level);
                if (skinData && skinData.equippedSkin) {
                    scaledConfig.equippedSkin = skinData.equippedSkin;
                }

                const x = startPos.x - (i * 40);
                const y = startPos.y;
                let unit = null;

                if (charConfig.classId === 'warrior') {
                    unit = new Warrior(this, x, y, scaledConfig);
                    if (!playerLeader) {
                        playerLeader = unit;
                        this.player = unit;
                    }
                } else if (charId === 'wrinkle') {
                    unit = new Wrinkle(this, x, y, playerLeader, scaledConfig);
                } else if (charId === 'nickle') {
                    unit = new Nickle(this, x, y, playerLeader, scaledConfig);
                } else if (charConfig.classId === 'archer') {
                    unit = new Archer(this, x, y, playerLeader, scaledConfig);
                } else if (charConfig.classId === 'healer') {
                    unit = new Healer(this, x, y, playerLeader, scaledConfig);
                } else if (charConfig.classId === 'wizard') {
                    if (charId === 'bao') {
                        unit = new Bao(this, x, y, playerLeader, scaledConfig);
                    } else if (charId === 'aina') {
                        unit = new Aina(this, x, y, playerLeader, scaledConfig);
                    } else if (charId === 'veve') {
                        unit = new Veve(this, x, y, playerLeader, scaledConfig);
                    } else {
                        unit = new Wizard(this, x, y, playerLeader, scaledConfig);
                    }
                } else if (charConfig.classId === 'bard') {
                    if (charId === 'nana') {
                        unit = new Nana(this, x, y, playerLeader, scaledConfig);
                    } else if (charId === 'noah') {
                        unit = new Noah(this, x, y, playerLeader, scaledConfig);
                    } else if (charId === 'noel') {
                        unit = new Noel(this, x, y, playerLeader, scaledConfig);
                    } else {
                        unit = new Bard(this, x, y, playerLeader, scaledConfig);
                    }
                }

                if (unit) {
                    this.mercenaries.add(unit);
                }
            });

            // Initialize Camera Target (follows centroid of party if units exist)
            if (this.mercenaries.countActive(true) > 0) {
                this.cameraTarget.setPosition(startPos.x, startPos.y);
            }

            // If no leader was found (e.g. no warrior selected), just pick the first one
            if (!this.player && this.mercenaries.countActive(true) > 0) {
                this.player = this.mercenaries.getChildren()[0];
            }

            // Initialize Pet after party spawn
            this.initPet();

            // --- Spawn Hired Combatant NPC ---
            this.spawnHiredNPC(startPos, playerLeader);

            // First wave of monsters (Now that player is spawned)
            this.spawnWave();

            // Initialize Resurrection Costs (Reset on Scene Start or Party Wipe)
            this.resurrectionCosts = {};

            // Listen for Resurrection Clicked in HUD
            EventBus.on(EventBus.EVENTS.MERCENARY_RESURRECT, this.handleResurrection, this);

            this.events.once('shutdown', () => {
                EventBus.off(EventBus.EVENTS.MERCENARY_RESURRECT, this.handleResurrection, this);
            });

            // Sync UI after spawn
            this.time.delayedCall(500, () => {
                EventBus.emit(EventBus.EVENTS.PARTY_DEPLOYED, {
                    scene: this,
                    mercenaries: this.mercenaries.getChildren()
                        .filter(m => !m.config.hideInUI)
                        .map(m => m.getState())
                });
            });

            // ESC to return (or close popups)
            this.input.keyboard.on('keydown-ESC', () => {
                if (this.isConstructionMode) {
                    this.toggleConstructionMode(null);
                } else if (this.sys.game.uiManager && this.sys.game.uiManager.popupOverlay && this.sys.game.uiManager.popupOverlay.style.display === 'flex') {
                    this.sys.game.uiManager.hidePopup();
                } else {
                    this.scene.start('TerritoryScene');
                }
            });

            // UI Indicators (Now DOM-Based)
            if (this.game.uiManager) {
                this.game.uiManager.updateRoundDisplay(`DUNGEON ROUND ${this.currentRound}`);
            }

            // UI Indicators (Now DOM-Based via UIManager)
            if (this.game.uiManager) {
                this.game.uiManager.updateRoundDisplay(`DUNGEON ROUND ${this.currentRound}`);
            }

            // 1. Mercenaries collect Loot
            this.physics.add.overlap(this.mercenaries, this.lootManager.lootGroup, (mercenary, item) => {
                this.lootManager.collectLoot(mercenary, item);
            });

            // 1.1 Pet collects Loot (Uses group to prevent null crash)
            this.physics.add.overlap(this.petManager.pets, this.lootManager.lootGroup, (pet, item) => {
                this.lootManager.collectLoot(pet, item);
            });

            // 2. Unit Separation (Repulsion Logic to prevent stacking/spinning)
            this.physics.add.overlap(this.mercenaries, this.mercenaries, (u1, u2) => {
                if (u1 !== u2) SeparationManager.applyRepulsion(u1, u2, 40);
            });

            this.physics.add.overlap(this.enemies, this.enemies, (u1, u2) => {
                if (u1 !== u2) SeparationManager.applyRepulsion(u1, u2, 40);
            });

            this.physics.add.overlap(this.mercenaries, this.enemies, (u1, u2) => {
                SeparationManager.applyRepulsion(u1, u2, 60); // Stronger repulsion for enemies
            });

            // 3. Wall Collisions
            if (this.dungeonManager && this.dungeonManager.renderer && this.dungeonManager.renderer.wallLayer) {
                this.physics.add.collider(this.mercenaries, this.dungeonManager.renderer.wallLayer);
                this.physics.add.collider(this.enemies, this.dungeonManager.renderer.wallLayer);
            }

            // Sync UI with initial character names after a short delay to ensure UI is ready
            this.time.delayedCall(500, () => {
                // We no longer trigger hardcoded debug swaps here
            });

            // --- 'Fake Aesthetic'

            // ── 날씨 시스템 초기화 ────────────────────────────────
            this.weatherManager = new WeatherManager(this);
            // 씬 로드 후 2초 뒤 자연스럽게 비 시작 (현재 비활성화 처리)
            // this.time.delayedCall(2000, () => {
            //    this.weatherManager.setWeather('rain', { fadeDuration: 3000 });
            // });

            // ── 환경 부유 먼지 (3레이어 Parallax) ──
            this.ambientMoteManager = new AmbientMoteManager(this);

            this.setupFakeAestheticOverlays();

            // 🎬 Start Intro Blur Effect
            this.applyIntroBlur();

            EventBus.on(EventBus.EVENTS.DEBUG_SWAP_CHARACTER, this.handleDebugSwap, this);
            this.isResetting = false;

        } catch (error) {
            console.error('[Dungeon] Critical Initialization Error:', error);
            if (this.game.uiManager) this.game.uiManager.showToast('초기화 중 오류가 발생했습니다.');
            this.scene.start('TerritoryScene');
        } finally {
            this.isInitializing = false;
            console.log(`[Dungeon] Initialization Complete. Stance: READY.`);
        }
    }

    async spawnHiredNPC(startPos, playerLeader) {
        const npcManager = (await import('../modules/Core/NPCManager.js')).default;
        const activeNPC = npcManager.getHiredNPC();

        if (activeNPC && activeNPC.isCombatant && activeNPC.stacks > 0) {
            console.log(`[Dungeon] Spawning Hired Combatant: ${activeNPC.name}`);

            // Calculate Average Level of Top 6
            const activeParty = this.mercenaries.getChildren().filter(m => !m.config.hideInUI && !m.isSummoned);
            let totalLevel = 0;
            activeParty.forEach(m => totalLevel += (m.level || 1));
            const avgLevel = activeParty.length > 0 ? Math.round(totalLevel / activeParty.length) : 1;
            const hiredLevel = avgLevel * 2;

            const spawnX = startPos.x + 40; // Spawn slightly ahead/beside the leader
            const spawnY = startPos.y - 40;

            // Apply Level Scaling to Hired NPCs (Growth included)
            const baseClassConfig = activeNPC.id === 'HIRED_WARRIOR' ? MercenaryClasses.WARRIOR : MercenaryClasses.ARCHER;
            const scaledHiredConfig = scaleStats(baseClassConfig, hiredLevel, 'NORMAL');

            let hiredUnit = null;
            if (activeNPC.id === 'HIRED_WARRIOR') {
                hiredUnit = new HiredWarrior(this, spawnX, spawnY, scaledHiredConfig);
            } else if (activeNPC.id === 'HIRED_ARCHER') {
                hiredUnit = new HiredArcher(this, spawnX, spawnY, playerLeader, scaledHiredConfig);
            }

            if (hiredUnit) {
                this.mercenaries.add(hiredUnit);

                // Scale stats based on level
                if (typeof hiredUnit.addExp === 'function') {
                    // Force the level and stats
                    hiredUnit.level = hiredLevel;
                    const { scaleStats } = await import('../modules/Core/EntityStats.js');
                    const baseStats = MercenaryClasses[activeNPC.classId.toUpperCase()];
                    const scaled = scaleStats(baseStats, hiredLevel);

                    // Apply scaled stats
                    hiredUnit.maxHp = scaled.maxHp;
                    hiredUnit.hp = scaled.maxHp;
                    hiredUnit.atk = scaled.atk;
                    hiredUnit.mAtk = scaled.mAtk;
                    hiredUnit.def = scaled.def;
                    hiredUnit.mDef = scaled.mDef;

                    hiredUnit.syncStatusUI();
                }

                // Consume a stack
                await npcManager.consumeStack();
                EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[용병] ${activeNPC.name}가 전투에 합류했습니다! (레벨 ${hiredLevel}) ⚔️`);

                // Update NPC HUD via Event (if needed) or just let UIManager handle it
                if (this.game.uiManager) {
                    this.game.uiManager._updateNPCFormationSlot();
                }
            }
        }
    }

    handleDebugSwap(payload) {
        const { classId, characterId, unitId } = payload;

        // Find existing unit
        let existingUnit = null;
        if (unitId) {
            existingUnit = this.mercenaries.getChildren().find(u => u.id === unitId);
        } else {
            existingUnit = this.mercenaries.getChildren().find(u => u.className === classId);
        }

        if (!existingUnit) {
            console.warn(`[DebugSwap] Could not find existing unit for class: ${classId} or ID: ${unitId}`);
            return;
        }

        const x = existingUnit.x;
        const y = existingUnit.y;
        const leader = existingUnit.leader;

        // Apply scaling for debug swap to match actual power levels
        const star = this.game.partyManager.getHighestStar(characterId);
        const state = this.game.partyManager.getState(characterId) || { level: existingUnit.level || 1 };
        const level = state.level || existingUnit.level || 1;
        const scaledConfig = scaleStats({ ...Characters[characterId.toUpperCase()], star: star }, level);
        const config = { ...scaledConfig, team: 'player' };

        existingUnit.destroy();

        let newUnit = null;
        if (classId === 'warrior') {
            newUnit = new Warrior(this, x, y, config);
            this.player = newUnit; // update leader ref
            this.mercenaries.getChildren().forEach(m => {
                if (m !== newUnit) m.warrior = newUnit;
            });
        } else if (characterId === 'wrinkle') {
            newUnit = new Wrinkle(this, x, y, this.player, config);
        } else if (characterId === 'nickle') {
            newUnit = new Nickle(this, x, y, this.player, config);
        } else if (classId === 'archer') {
            newUnit = new Archer(this, x, y, this.player, config);
        } else if (classId === 'healer') {
            newUnit = new Healer(this, x, y, this.player, config);
        } else if (classId === 'wizard') {
            if (characterId === 'bao') {
                newUnit = new Bao(this, x, y, this.player, config);
            } else if (characterId === 'aina') {
                newUnit = new Aina(this, x, y, this.player, config);
            } else if (characterId === 'veve') {
                newUnit = new Veve(this, x, y, this.player, config);
            } else {
                newUnit = new Wizard(this, x, y, this.player, config);
            }
        } else if (classId === 'bard') {
            newUnit = new Bard(this, x, y, this.player, config);
        }

        if (newUnit) {
            this.mercenaries.add(newUnit);
            if (newUnit.initAI) newUnit.initAI();

            // Re-emit PARTY_DEPLOYED
            EventBus.emit(EventBus.EVENTS.PARTY_DEPLOYED, {
                scene: this,
                mercenaries: this.mercenaries.getChildren()
                    .filter(m => !m.config.hideInUI)
                    .map(m => m.getState())
            });

            EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[디버그] ${classId} 역할이 [${config.name}](으)로 교체되었습니다. 🔄`);
        }
    }

    update(time, delta) {
        // --- 1. Essential Background Updates (Run even during initialization) ---
        if (this.dynamicCamera) {
            this.dynamicCamera.update(time, delta);
        }
        if (this.weatherManager) {
            this.weatherManager.update(time, delta);
        }
        if (this.ambientMoteManager) {
            this.ambientMoteManager.update();
        }

        // --- 1.2 Building Support System Update ---
        if (buildingManager) {
            buildingManager.update(delta);
        }

        if (this.structureManager) {
            this.structureManager.update(time, delta);
        }

        if (!this.isResting && !this.isInitializing && !this.isResetting) {
            // --- 1.4 Fishing Turn Update ---
            if (time - (fishingManager.lastTurnTime || 0) > 5000) { // Every 5 seconds
                fishingManager.lastTurnTime = time;
                fishingManager.performFishingTurn().then(result => {
                    if (result && this.game.uiManager) {
                        this.game.uiManager.showFishingResultNotification(result);
                        this.game.uiManager.updateFishingHUDStatus();
                        if (result.success) this.game.uiManager.updateFishHUD();
                    }
                });
            }

            // --- 1.5 Alchemy Turn Update ---
            if (time - (alchemyManager.lastTurnTime || 0) > 6000) { // Every 6 seconds
                alchemyManager.lastTurnTime = time;
                alchemyManager.performAlchemyTurn().then(result => {
                    if (result && this.game.uiManager) {
                        this.game.uiManager.showAlchemyResultNotification(result);
                        this.game.uiManager.updateAlchemyHUDStatus();
                        
                        if (result.success) {
                            // Pick a random target from party
                            const activeMercs = this.mercenaries.getChildren().filter(m => m.active && m.hp > 0 && !m.config.hideInUI);
                            if (activeMercs.length > 0) {
                                const target = Phaser.Utils.Array.GetRandom(activeMercs);
                                this.launchPotionProjectile(result.potionId, target);
                            }
                        }
                    }
                });
            }
        }

        // --- 1.4 Construction Mode Camera ---
        if (this.isConstructionMode) {
            this.updateConstructionCamera(delta);
            return; // Skip normal gameplay updates
        }

        // --- 1.5 Global Systems Update ---
        if (this.game.messiahManager) {
            this.game.messiahManager.update(time, delta);

            // Auto-Mode execution
            if (this.game.messiahManager.isAutoMode && this.game.messiahManager.stacks > 0) {
                // Ensure combat is active and not resetting
                if (!this.isResting && !this.isSettingUp && !this.isResetting) {
                    this.executeAutoMessiahTouch();
                }
            }
        }

        // --- 2. Gameplay Guard ---
        if (this.isInitializing || this.isUltimateActive || this.isResetting) return;

        // --- CHECK: Party Wipeout (Auto-Restart Loop) ---
        // Exclude defense structures from living unit count check
        const livingUnits = this.mercenaries ? this.mercenaries.getChildren().filter(m => m.active && m.hp > 0 && !m.isBuilding) : [];
        if (livingUnits.length === 0 && !this.isResetting && !this.isResting) {
            this.handlePartyWipeout();
        }

        if (this.enemies && this.enemies.countActive(true) === 0 && !this.isResting) {
            this.isResting = true;
            EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[시스템] 라운드 ${this.currentRound} 클리어! 5초 뒤 다음 라운드가 시작됩니다. ⛺`);

            this.time.delayedCall(5000, async () => {
                // --- Food & Fish Buff Consumption (Next Rounds) ---
                this.activeFoodBuffs = await foodManager.consumeForRound();
                await fishingManager.processAutoConsume(this.currentRound + 1);

                if (this.game.uiManager) {
                    this.game.uiManager.updateFoodHUD();
                    this.game.uiManager.updateFishingHUDStatus();
                }

                // Sync Equipment Multiplier
                equipmentManager.expMultiplier = 1.0 + (this.activeFoodBuffs.EQUIP_EXP_BONUS || 0);

                if (this.activeFoodBuffs.PARTY_EXP_BONUS > 0 || this.activeFoodBuffs.EQUIP_EXP_BONUS > 0) {
                    console.log(`[DungeonScene] Food Buffs Activated for Round ${this.currentRound + 1}:`, this.activeFoodBuffs);
                }

                // Grant Round Clear EXP

                this.mercenaries.getChildren().forEach(merc => {
                    if (merc.active && merc.hp > 0 && typeof merc.addExp === 'function') {
                        merc.addExp(this.roundClearExp);
                    }
                });

                this.currentRound++;
                if (this.game.uiManager) this.game.uiManager.updateRoundDisplay(`DUNGEON ROUND ${this.currentRound}`);

                // Save Best Round (Difficulty-Specific)
                DBManager.saveBestRound(this.dungeonType, this.currentRound, this.difficulty).then(isNewBest => {
                    if (isNewBest) {
                        EventBus.emit('BEST_ROUND_UPDATED', {
                            dungeonType: this.dungeonType,
                            round: this.currentRound,
                            difficulty: this.difficulty
                        });
                    }
                });

                this.isResting = false;
                this.spawnWave();
            });
        }

        if (this.buffManager) {
            this.buffManager.update(time, delta);
        }
        if (this.ccManager) {
            this.ccManager.update(time, delta);
        }
        if (this.shieldManager) {
            this.shieldManager.update(time, delta);
        }
        if (this.barkManager) {
            this.barkManager.update(time, delta);
        }

        if (this.mercenaries) {
            this.mercenaries.getChildren().forEach(mercenary => {
                mercenary.update(time, delta);
                mercenary.setDepth(mercenary.y);

                // ── Idle Bob 자동 제어 ─────────────────────────────────────
                if (mercenary.body && mercenary.startIdleBob) {
                    const isMoving = mercenary.body.speed > 5;
                    const isBlocked = mercenary.isAirborne || mercenary.isKnockedBack || mercenary.hp <= 0;

                    if ((isMoving || isBlocked) && mercenary._idleBobTween) {
                        mercenary.stopIdleBob(false);
                    } else if (!isMoving && !isBlocked && !mercenary._idleBobTween) {
                        mercenary.startIdleBob();
                    }
                }

                // --- NEW: Strict Boundary Clamping (Anti-Bypass Safety) ---
                if (mercenary.body && mercenary.body.collideWorldBounds) {
                    const radius = mercenary.body.radius || 20;
                    const bounds = this.physics.world.bounds;
                    const HUD_MARGIN = 80; // Bottom HUD height (tightened from 160)
                    const SIDE_MARGIN = 40; // Extra safety so they don't touch the pixel edge

                    mercenary.x = Phaser.Math.Clamp(mercenary.x, radius + SIDE_MARGIN, bounds.width - radius - SIDE_MARGIN);
                    mercenary.y = Phaser.Math.Clamp(mercenary.y, radius + SIDE_MARGIN, bounds.height - radius - HUD_MARGIN);
                }
            });
        }

        if (this.petManager && this.petManager.pets) {
            this.petManager.pets.getChildren().forEach(pet => {
                pet.update(time, delta);
                pet.setDepth(pet.y);
            });
        }

        if (this.enemies) {
            this.enemies.getChildren().forEach(enemy => {
                enemy.update(time, delta);
                enemy.setDepth(enemy.y);

                // ── Idle Bob 자동 제어 (적 유닛도 동일) ─────────────────────
                if (enemy.body && enemy.startIdleBob) {
                    const isMoving = enemy.body.speed > 5;
                    const isBlocked = enemy.isAirborne || enemy.isKnockedBack || enemy.hp <= 0;

                    if ((isMoving || isBlocked) && enemy._idleBobTween) {
                        enemy.stopIdleBob(false);
                    } else if (!isMoving && !isBlocked && !enemy._idleBobTween) {
                        enemy.startIdleBob();
                    }
                }

                // --- NEW: Strict Boundary Clamping (Anti-Bypass Safety) ---
                if (enemy.body && enemy.body.collideWorldBounds) {
                    const radius = enemy.body.radius || 20;
                    const bounds = this.physics.world.bounds;
                    const HUD_MARGIN = 80;
                    const SIDE_MARGIN = 40;

                    enemy.x = Phaser.Math.Clamp(enemy.x, radius + SIDE_MARGIN, bounds.width - radius - SIDE_MARGIN);
                    enemy.y = Phaser.Math.Clamp(enemy.y, radius + SIDE_MARGIN, bounds.height - radius - HUD_MARGIN);
                }
            });
        }


        this.updateCameraFollow();

        // --- Debug: Boundary Check (Dev Only) ---
        if (this.currentRound % 5 === 0 && Math.random() < 0.01) { // Occasional check
            const allUnits = this.mercenaries.getChildren().concat(this.enemies.getChildren());
            allUnits.forEach(u => {
                const bounds = this.physics?.world?.bounds;
                if (u.active && bounds && (u.x < 0 || u.x > bounds.width || u.y < 0 || u.y > bounds.height)) {
                    console.warn(`[Dungeon] Unit ${u.unitName} (${u.id}) detected OUT OF BOUNDS at (${u.x.toFixed(0)}, ${u.y.toFixed(0)})! Resetting...`);
                    u.x = Phaser.Math.Clamp(u.x, 100, bounds.width - 100);
                    u.y = Phaser.Math.Clamp(u.y, 100, bounds.height - 100);
                }
            });
        }

        if (this.stageManager) {
            this.stageManager.update(time, delta);
        }
    }

    handlePartyWipeout() {
        this.isResetting = true;

        // --- Nun NPC Ability (Same-Round Restart) ---
        const npcManager = this.game.npcManager;
        const activeNPC = npcManager?.getActiveNPC();
        if (activeNPC && activeNPC.id === 'NUN' && activeNPC.stacks > 0) {
            console.log(`%c[NPC] Nun Intervention! Retrying Round ${this.currentRound}. Stacks: ${activeNPC.stacks} -> ${activeNPC.stacks - 1}`, 'color: #aa77ff; font-weight: bold;');

            EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[NPC] 수녀의 기도로 라운드 ${this.currentRound}(으)로 시간을 되돌립니다! ✨`);

            npcManager.consumeStack();

            // Visual feedback - flash and shake
            if (this.cameras.main) {
                this.cameras.main.flash(1000, 200, 150, 255, 0.5);
                this.cameras.main.shake(500, 0.01);
            }

            this.time.delayedCall(2000, () => {
                if (this.game.partyManager) this.game.partyManager.healAll();
                this.scene.restart({ dungeonType: this.dungeonType, startRound: this.currentRound });
            });
            return;
        }

        // Stop current BGM
        if (this.bgm) this.bgm.stop();

        // Show "DEFEATED" Message on UI Camera
        const width = this.scale.width;
        const height = this.scale.height;

        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
            .setScrollFactor(0).setDepth(40000).setAlpha(0);
        this.uiLayer.add(overlay);

        const failText = this.add.text(width / 2, height / 2, '[ 전멸했습니다... ]', {
            fontFamily: 'Press Start 2P',
            fontSize: '32px',
            fill: '#ff0000',
            stroke: '#000',
            strokeThickness: 8
        }).setOrigin(0.5).setScrollFactor(0).setDepth(40001).setAlpha(0);
        this.uiLayer.add(failText);

        const subText = this.add.text(width / 2, height / 2 + 60, '1라운드부터 다시 시작합니다.', {
            fontFamily: 'VT323',
            fontSize: '24px',
            fill: '#eeeeee'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(40001).setAlpha(0);
        this.uiLayer.add(subText);

        // Animation Sequence
        this.tweens.add({
            targets: [overlay, failText, subText],
            alpha: 1,
            duration: 1000,
            ease: 'Power2'
        });

        EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[시스템] 파티가 전멸했습니다. 1라운드부터 재시작합니다. 🔄`);

        // Wait and Restart
        this.time.delayedCall(4000, () => {
            // Reset resurrection costs when party loops
            this.resurrectionCosts = {};

            // Heal all before restart to ensure they spawn with full HP
            if (this.game.partyManager) this.game.partyManager.healAll();

            // Ticket deduction for specific dungeons
            if (this.dungeonType === 'UNDEAD_GRAVEYARD') {
                const hasTicket = this.game.inventory.removeItem('emoji_ticket', 1);
                if (!hasTicket) {
                    console.warn('[DungeonScene] No ticket for Undead Graveyard. Returning.');
                    this.game.uiManager.showToast('언데드 묘지 입장권(🎫)이 필요합니다.');
                    this.scene.start('DungeonScene', { dungeonType: 'CURSED_FOREST' });
                    return;
                }
            } else if (this.dungeonType === 'SWAMPLAND') {
                const hasTicket = this.game.inventory.removeItem('swampland_ticket', 1);
                if (!hasTicket) {
                    console.warn('[DungeonScene] No ticket for Swampland. Returning.');
                    this.game.uiManager.showToast('늪지대 입장권(🎫)이 필요합니다.');
                    this.scene.start('DungeonScene', { dungeonType: 'CURSED_FOREST' });
                    return;
                }
            }
            this.scene.restart({ dungeonType: this.dungeonType, startRound: 1 });
        });
    }

    async handleResurrection(payload) {
        const { unitId, characterId, classId, cost } = payload;

        // Anti-duplicate race condition guard
        if (this.pendingResurrections.has(characterId)) {
            console.warn(`[DungeonScene] Resurrection already in progress for ${characterId}. Ignoring.`);
            return;
        }

        // Check if unit is somehow alive already (safety check)
        const alreadyAlive = this.mercenaries.getChildren().find(m => m.characterId === characterId && m.active && m.hp > 0);
        if (alreadyAlive) {
            console.warn(`[DungeonScene] ${characterId} is already alive in scene. Ignoring resurrection.`);
            return;
        }

        this.pendingResurrections.add(characterId);
        console.log(`[DungeonScene] handleResurrection triggered for ${characterId} (Cost: ${cost}G)`);

        try {
            // 1. Check & Deduct Gold
            const coinItem = await DBManager.getInventoryItem('emoji_coin');
            const currentGold = coinItem ? coinItem.amount : 0;

            if (currentGold < cost) {
                if (this.game.uiManager) this.game.uiManager.showToast('골드가 부족합니다! 💰');
                return;
            }

            // 2. Deduct Gold
            await DBManager.saveInventoryItem('emoji_coin', currentGold - cost);
            console.log(`[DungeonScene] Gold deducted. Remaining: ${currentGold - cost}`);
            EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);
            EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[부활] ${cost} 골드를 지불하고 용병을 부활시켰습니다. ✨`);

            // 3. Increment Count for next time
            this.resurrectionCosts[characterId] = (this.resurrectionCosts[characterId] || 0) + 1;

            // 4. Find Respawn Location (Near leader or start)
            const startPos = this.dungeonManager ? this.dungeonManager.getPlayerStartPosition() : { x: 400, y: 300 };
            const spawnX = this.player ? this.player.x : startPos.x;
            const spawnY = this.player ? this.player.y : startPos.y;

            // 5. Spawn Logic (Modular Mapping)
            const config = { ...Characters[characterId.toUpperCase()], team: 'player' };
            let newUnit = null;

            if (classId === 'warrior') {
                newUnit = new Warrior(this, spawnX, spawnY, config);
                if (!this.player || !this.player.active) this.player = newUnit;
            } else if (characterId === 'wrinkle') {
                newUnit = new Wrinkle(this, spawnX, spawnY, this.player, config);
            } else if (characterId === 'nickle') {
                newUnit = new Nickle(this, spawnX, spawnY, this.player, config);
            } else if (classId === 'archer') {
                newUnit = new Archer(this, spawnX, spawnY, this.player, config);
            } else if (classId === 'healer') {
                newUnit = new Healer(this, spawnX, spawnY, this.player, config);
            } else if (classId === 'wizard') {
                if (characterId === 'bao') {
                    newUnit = new Bao(this, spawnX, spawnY, this.player, config);
                } else if (characterId === 'aina') {
                    newUnit = new Aina(this, spawnX, spawnY, this.player, config);
                } else if (characterId === 'veve') {
                    newUnit = new Veve(this, spawnX, spawnY, this.player, config);
                } else {
                    newUnit = new Wizard(this, spawnX, spawnY, this.player, config);
                }
            } else if (classId === 'bard') {
                if (characterId === 'nana') {
                    newUnit = new Nana(this, spawnX, spawnY, this.player, config);
                } else if (characterId === 'noah') {
                    newUnit = new Noah(this, spawnX, spawnY, this.player, config);
                } else if (characterId === 'noel') {
                    newUnit = new Noel(this, spawnX, spawnY, this.player, config);
                } else {
                    newUnit = new Bard(this, spawnX, spawnY, this.player, config);
                }
            }

            if (newUnit) {
                newUnit.id = unitId; // Keep the same UI slot ID

                // --- Resurrection Polish ---
                // 1. Force 100% HP (prevents loading stale dead state)
                newUnit.hp = newUnit.maxHp;

                // 2. Clear all persistent CC effects (Shock, Burn, etc.)
                if (newUnit.cleanse) newUnit.cleanse();

                // 3. Clear temporary stat buffs
                if (this.buffManager) this.buffManager.removeBuffs(newUnit);

                // 4. Clear active shields
                if (this.shieldManager) this.shieldManager.removeShield(newUnit);

                this.mercenaries.add(newUnit);
                if (newUnit.initAI) newUnit.initAI();

                // Link back to other units if it's the new warrior/leader
                if (classId === 'warrior') {
                    this.mercenaries.getChildren().forEach(m => {
                        if (m !== newUnit) m.warrior = newUnit;
                    });
                }

                // Visual feedback
                if (this.fxManager) {
                    this.fxManager.spawnEffect('heal_aura', spawnX, spawnY);
                }

                // Refresh UI
                EventBus.emit(EventBus.EVENTS.PARTY_DEPLOYED, {
                    scene: this,
                    mercenaries: this.mercenaries.getChildren()
                        .filter(m => !m.config.hideInUI)
                        .map(m => m.getState())
                });
            }
        } finally {
            this.pendingResurrections.delete(characterId);
        }
    }

    updateCameraFollow() {
        if (!this.mercenaries || !this.cameraTarget) return;

        let totalX = 0;
        let totalY = 0;
        let count = 0;
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        this.mercenaries.getChildren().forEach(merc => {
            if (merc.active && merc.hp > 0 && !merc.isSummoned) {
                totalX += merc.x;
                totalY += merc.y;
                count++;

                if (merc.x < minX) minX = merc.x;
                if (merc.x > maxX) maxX = merc.x;
                if (merc.y < minY) minY = merc.y;
                if (merc.y > maxY) maxY = merc.y;
            }
        });

        if (count > 0) {
            const avgX = totalX / count;
            const avgY = totalY / count;

            // Smoothly lerp camera target or set directly (Phaser's startFollow handles smoothing)
            this.cameraTarget.setPosition(avgX, avgY);

            // Calculate Dynamic Zoom based on spread
            const spreadX = maxX - minX;
            const spreadY = maxY - minY;
            const maxSpread = Math.max(spreadX, spreadY);

            // Zoom out as spread increases, clamped between 0.6 and 1.2
            // 200px spread -> 1.2 zoom, 1200px spread -> 0.6 zoom
            let targetZoom = 1.2;
            if (maxSpread > 200) {
                targetZoom = Math.max(0.6, 1.2 - ((maxSpread - 200) / 1600));
            }

            if (this.dynamicCamera) {
                this.dynamicCamera.targetZoom = targetZoom;
            }
        }
    }

    spawnWave() {
        if (this.isResetting) return;

        // Reset alchemy potion buffs for all mercenaries at the start of a wave
        if (this.mercenaries) {
            this.mercenaries.getChildren().forEach(m => {
                if (m.resetPotionBuffs) m.resetPotionBuffs();
            });
        }

        const stageConfig = StageConfigs[this.dungeonType] || StageConfigs.CURSED_FOREST;
        // Base pool for normal/elite should EXCLUDE epic variants (which are handled separately)
        const pool = (stageConfig.monsterPool || ['goblin', 'orc']).filter(id => !id.startsWith('epic_'));

        // Debug Log for Monster Pool
        console.log(`%c[Dungeon Spawn] Type: ${this.dungeonType} | Round: ${this.currentRound} | Pool: ${JSON.stringify(pool)}`, "color: #00ff00; font-weight: bold;");

        if (pool.includes('goblin') && this.dungeonType === 'SWAMPLAND') {
            console.error("[CRITICAL] SWAMPLAND detected but using Goblin pool! This is likely a CACHE issue with EntityStats.js");
        }

        const startPos = this.dungeonManager.getPlayerStartPosition();
        const levelOffset = this.difficultyCfg ? this.difficultyCfg.levelOffset : 0;
        const fishLevelBuff = fishingManager.getBuffValue('MONSTER_LEVEL');
        const monsterLevel = Math.floor((this.currentRound - 1) / 5) + 1 + levelOffset + fishLevelBuff;

        // Elite Settings
        const fishEliteBuff = fishingManager.getBuffValue('ELITE_RATE');
        const baseEliteChance = 0.1 + (this.currentRound - 1) * 0.05;
        const eliteChance = Math.min(0.5, baseEliteChance + fishEliteBuff);
        const novaCharms = ['emoji_fireworks', 'emoji_sparkler', 'emoji_koinobori'];
        const nodeCharmsList = ['emoji_pouting_face', 'emoji_enraged_face', 'emoji_smiling_face_with_sunglasses'];

        const applyEliteLogic = (monster) => {
            if (!monster) return;
            if (monster.config.type === 'ELITE') {
                monster.isElite = true;

                // Assign 1-2 random nova charms
                const charmCount = Phaser.Math.Between(1, 2);
                const shuffledNova = [...novaCharms].sort(() => 0.5 - Math.random());
                monster.charms[0] = shuffledNova[0];
                if (charmCount > 1) monster.charms[1] = shuffledNova[1];

                // Assign 1 random node charm (Gambit AI)
                const randomNodeCharm = nodeCharmsList[Math.floor(Math.random() * nodeCharmsList.length)];
                monster.nodeCharms[0] = randomNodeCharm;

                if (monster.setElite) monster.setElite(true);
                console.log(`[Spawn] Elite ${monster.unitName} spawned with AI Node: ${randomNodeCharm} & novas:`, monster.charms);
            }
        };

        // Class Mapping for IDs
        const monsterClassMap = {
            'goblin': Goblin,
            'orc': Orc,
            'shaman': MonsterHealer,
            'epic_goblin': Goblin,
            'epic_orc': Orc,
            'skeleton_warrior': SkeletonWarrior,
            'skeleton_wizard': SkeletonWizard,
            crocodile_warrior: CrocodileWarrior,
            crocodile_archer: CrocodileArcher,
            crocodile_healer: CrocodileHealer,
            fire_spirit_warrior: FireSpiritWarrior,
            fire_spirit_archer: FireSpiritArcher,
            fire_spirit_wizard: FireSpiritWizard,
            ice_spirit_warrior: IceSpiritWarrior,
            ice_spirit_wizard: IceSpiritWizard,
            ice_spirit_healer: IceSpiritHealer
        };

        // Total spawn count increases with rounds * Difficulty Multiplier
        const spawnMult = this.difficultyCfg ? this.difficultyCfg.spawnMult : 1;
        const fishSpawnBuff = fishingManager.getBuffValue('SPAWN_RATE');
        const baseSpawnCount = 18 + (this.currentRound - 1) * 2;
        const spawnCount = Math.floor(baseSpawnCount * spawnMult * (1 + fishSpawnBuff));

        console.log(`%c[낚시 버프 검증] 라운드 ${this.currentRound} 스폰 정보`, "background: #2563eb; color: #fff; padding: 2px 5px; font-weight: bold;");
        console.log(` - 몬스터 레벨: ${monsterLevel} (기록: ${monsterLevel - fishLevelBuff} + 버프: ${fishLevelBuff})`);
        console.log(` - 엘리트 확률: ${(eliteChance * 100).toFixed(1)}% (기본: ${(baseEliteChance * 100).toFixed(1)}% + 버프: ${(fishEliteBuff * 100).toFixed(1)}%)`);
        console.log(` - 스폰 수: ${spawnCount}마리 (기본: ${Math.floor(baseSpawnCount * spawnMult)} + 버프: +${(fishSpawnBuff * 100).toFixed(0)}%)`);

        const epicChance = (this.difficultyCfg && this.difficultyCfg.epicChanceBase)
            ? Math.min(0.6, this.difficultyCfg.epicChanceBase + (this.currentRound - 1) * 0.02)
            : 0;

        for (let i = 0; i < spawnCount; i++) {
            const isEpic = epicChance > 0 && Math.random() < epicChance;
            let currentPool = pool;
            let targetType = 'NORMAL';

            if (isEpic && this.difficultyCfg.epicPool) {
                currentPool = this.difficultyCfg.epicPool;
                targetType = 'EPIC';
            }

            const monsterId = Phaser.Utils.Array.GetRandom(currentPool);
            const MonsterClass = monsterClassMap[monsterId] || Goblin;

            // Random offset spread
            const offsetX = Phaser.Math.Between(100, 700);
            const offsetY = Phaser.Math.Between(-250, 250);

            const isEliteRequested = (targetType === 'NORMAL') && (Math.random() < eliteChance);
            const baseConfig = MonsterClasses[monsterId.toUpperCase()] || MonsterClasses.GOBLIN;

            const monster = this.spawnMonster(MonsterClass, startPos.x + offsetX, startPos.y + offsetY, this.player, monsterLevel, baseConfig, targetType === 'EPIC' ? 'EPIC' : (isEliteRequested ? 'ELITE' : 'NORMAL'));

            if (targetType === 'EPIC') {
                monster.isEpic = true;
                monster.setScale(baseConfig.scale || 2.0);
                monster.sprite.setTint(0xff5555); // Reddish tint for Epic
                if (monster.unitName && !monster.unitName.includes('💥')) {
                    monster.unitName = `💥 ${monster.unitName} 💥`;
                }
            } else {
                applyEliteLogic(monster);
            }
        }

        // Special handling for Shamans (Healers) in Cursed Forest if not in pool but needed
        if (this.dungeonType === 'CURSED_FOREST') {
            const shamanCount = 2 + Math.floor((this.currentRound - 1) / 2);
            for (let i = 0; i < shamanCount; i++) {
                const isEliteRequested = Math.random() < eliteChance;
                const shaman = this.spawnMonster(MonsterHealer, startPos.x + 200 + (i * 80), startPos.y + 120, this.player, monsterLevel, MonsterClasses.SHAMAN, isEliteRequested ? 'ELITE' : 'NORMAL');
                applyEliteLogic(shaman);
            }
        }

        // Boss Logic: Every 3 rounds (3, 6, 9...)
        if (this.currentRound % 3 === 0) {
            const bossCount = Math.floor(this.currentRound / 3);
            const shadowX = startPos.x + 150;
            const shadowY = startPos.y - 120;

            // 1. Spawn Aren (Always the leader/first boss)
            const shadowAren = this.spawnShadowMercenary('warrior', Characters.AREN, shadowX, shadowY, monsterLevel);
            EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[!] 그림자 전사 아렌이 나타났습니다! ⚔️`);

            // 2. Spawn Additional Bosses (Round 6 -> +1, Round 9 -> +2, etc.)
            if (bossCount > 1) {
                const availableChars = Object.values(Characters).filter(c => c.id !== 'aren');
                // Shuffle availableChars to pick random unique ones
                availableChars.sort(() => 0.5 - Math.random());

                const extraBosses = Math.min(bossCount - 1, availableChars.length);

                for (let i = 0; i < extraBosses; i++) {
                    const charConfig = availableChars[i];
                    // Offset position slightly for each extra boss so they don't stack
                    const offsetX = (i + 1) * 50;
                    const offsetY = (i % 2 === 0 ? 1 : -1) * 40;

                    // Pass shadowAren as leader so they follow him, not the player!
                    this.spawnShadowMercenary(charConfig.classId, charConfig, shadowX + offsetX, shadowY + offsetY, monsterLevel, shadowAren);
                    EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[!] 추가 증원: 그림자 ${charConfig.name} 등장!`);
                }
            }
        }

        if (this.currentRound > 1) {
            EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[시스템] 몬스터들이 증원되었습니다! (라운드 ${this.currentRound}) ⚔️`);
        }
    }

    /**
     * Spawns a mercenary as an enemy.
     * @param {string} classId 'warrior', 'archer', 'healer', 'wizard', 'bard'
     * @param {Object} characterConfig Configuration from EntityStats.js
     * @param {number} x X position
     * @param {number} y Y position
     * @param {number} level Monster level
     */
    spawnShadowMercenary(classId, characterConfig, x, y, level = 1, leader = null) {
        // BUG FIX: Get base class stats first, otherwise scaleStats will result in 0 HP/ATK
        const baseClassConfig = MercenaryClasses[classId.toUpperCase()] || {};

        // Merge them: Base Class -> Character Specifics
        const mergedBaseConfig = { ...baseClassConfig, ...characterConfig };

        // Apply scaling (Shadow Mercenaries use ELITE scaling)
        let config = scaleStats(mergedBaseConfig, level, 'ELITE');

        // Create config with enemy team and unique ID
        config = {
            ...config,
            id: characterConfig.id + '_shadow_' + Phaser.Math.Between(10000, 99999), // unique ID
            name: `Lv.${level} 그림자 ${characterConfig.name}`,
            team: 'enemy',
            hideInUI: true,  // Don't show in portrait bar
            expReward: 200   // Shadow Mercs are elite-tier enemies — much more EXP than regular monsters
        };

        // For shadow enemies, we want them following their own leader if possible.
        const leaderRef = leader || this.player;

        let unit = null;
        if (classId === 'warrior') {
            unit = new Warrior(this, x, y, config);
        } else if (characterConfig.id === 'wrinkle' || characterConfig.characterId === 'wrinkle') {
            unit = new Wrinkle(this, x, y, leaderRef, config);
        } else if (characterConfig.id === 'nickle' || characterConfig.characterId === 'nickle') {
            unit = new Nickle(this, x, y, leaderRef, config);
        } else if (classId === 'archer') {
            unit = new Archer(this, x, y, leaderRef, config);
        } else if (classId === 'healer') {
            unit = new Healer(this, x, y, leaderRef, config);
        } else if (classId === 'wizard') {
            if (characterConfig.id === 'bao' || characterConfig.characterId === 'bao') {
                unit = new Bao(this, x, y, leaderRef, config);
            } else if (characterConfig.id === 'aina' || characterConfig.characterId === 'aina') {
                unit = new Aina(this, x, y, leaderRef, config);
            } else if (characterConfig.id === 'veve' || characterConfig.characterId === 'veve') {
                unit = new Veve(this, x, y, leaderRef, config);
            } else {
                unit = new Wizard(this, x, y, leaderRef, config);
            }
        } else if (classId === 'bard') {
            unit = new Bard(this, x, y, leaderRef, config);
        }

        if (unit) {
            // Shadow Mercenaries are always Elite with extra charms
            // Note: HP/ATK scaling is already applied via scaleStats with 'ELITE'
            unit.isElite = true;

            // Give extra charms for bosses
            unit.charms[0] = 'emoji_fireworks';
            unit.charms[1] = 'emoji_sparkler';
            unit.nodeCharms[0] = 'emoji_pouting_face'; // Aggressive AI

            this.enemies.add(unit);
            return unit;
        }
        return null;
    }

    /**
     * Spawns a monster using pooling.
     * @param {Class} MonsterClass 
     * @param {number} x 
     * @param {number} y 
     * @param {Object} target 
     * @param {number} level 
     * @param {Object} classConfig Optional config for specific monsters (like shamans)
     * @param {string} type 'NORMAL', 'ELITE', 'RAID'
     */
    spawnMonster(MonsterClass, x, y, target, level, classConfig = null, type = 'NORMAL') {
        // VITE MINIFICATION SAFETY: Do NOT use MonsterClass.name. Use classConfig.id.
        const monsterId = classConfig ? classConfig.id : 'goblin';

        if (!this.monsterPool[monsterId]) {
            this.monsterPool[monsterId] = [];
        }

        // Find an inactive monster from the specific ID pool
        let monster = this.monsterPool[monsterId].find(m => !m.active);

        // Prepare config (explicitly pass classConfig to scaleStats)
        const config = scaleStats(classConfig || MonsterClasses.GOBLIN, level, type);

        // Ensure type/difficulty properties are passed
        config.type = type;

        if (monster) {
            monster.reset(x, y, config, target);
            this.enemies.add(monster);
        } else {
            monster = new MonsterClass(this, x, y, target, level, config);
            this.enemies.add(monster);
            this.monsterPool[monsterId].push(monster);
        }

        return monster;
    }

    handleMessiahTouch(pointer) {
        if (!this.game.messiahManager) return;
        const mm = this.game.messiahManager;

        // Ensure click is on the battlefield, not on UI
        // We'll proceed with consuming stacks if finding a valid target
        const power = mm.getActivePower();
        if (!power) return;

        let target = null;
        let searchRadius = 80;

        if (power.type === 'OFFENSE') {
            // Find nearest enemy
            let closestDist = Infinity;
            this.enemies.getChildren().forEach(enemy => {
                if (!enemy.active || enemy.hp <= 0) return;
                const dist = Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, enemy.x, enemy.y);
                if (dist < closestDist && dist <= searchRadius) {
                    closestDist = dist;
                    target = enemy;
                }
            });
        } else {
            // Find nearest ally
            let closestDist = Infinity;
            this.mercenaries.getChildren().forEach(ally => {
                if (!ally.active || ally.hp <= 0) return;
                const dist = Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, ally.x, ally.y);
                if (dist < closestDist && dist <= searchRadius) {
                    closestDist = dist;
                    target = ally;
                }
            });
        }

        if (target) {
            if (mm.consumeStack()) { // Consume stack ONLY if target is found
                // Play visual effect
                this.showMessiahPowerEffect(target.x, target.y - 20, power, target);

                // Apply combat effect
                const stats = mm.getStats();
                if (power.type === 'OFFENSE') {
                    // Judgment: Deal physical damage
                    const damage = stats.atk * 1.5;
                    target.takeDamage(damage, null, false);
                    console.log(`[Messiah Touch] Judgment! Dealt ${damage.toFixed(1)} DMG to ${target.name}.`);
                } else if (power.type === 'DEFENSE') {
                    // Healing: Heal ally
                    const heal = stats.mAtk * 1.5;
                    if (target.heal) {
                        target.heal(heal, null);
                        console.log(`[Messiah Touch] Healing! Restored ${heal.toFixed(1)} HP to ${target.name}.`);
                    }
                } else if (power.type === 'SUPPORT') {
                    // Encouragement: Temporary ATK/mATK buff
                    const buffAmount = stats.mAtk * 0.5;
                    target.bonusAtk += buffAmount;
                    target.bonusMAtk += buffAmount;
                    target.messiahEncouragementAmount = buffAmount; // Track for UI
                    console.log(`[Messiah Touch] Encouragement! ${target.name} ATK/mATK +${buffAmount.toFixed(1)} for 3s.`);
                    this.time.delayedCall(3000, () => {
                        target.bonusAtk -= buffAmount;
                        target.bonusMAtk -= buffAmount;
                        target.messiahEncouragementAmount = 0; // Clear tracking
                    });
                }
            } else {
                if (this.game.uiManager) this.game.uiManager.showToast('권능 스택이 부족합니다!');
            }
        }
    }

    showMessiahPowerEffect(x, y, power, target) {
        // --- 1. Finger Emoji (Text Object) ---
        let str = this.messiahTextPool.pop();
        if (!str) {
            str = this.add.text(0, 0, power.emoji, {
                fontFamily: 'Twemoji, Arial',
                fontSize: '64px',
                color: '#ffffff',
                stroke: 'rgba(251, 191, 36, 0.8)',
                strokeThickness: 5
            }).setOrigin(0.5).setDepth(2000);
            str.setShadow(0, 0, 'rgba(255,255,255,0.8)', 20, false, true);
        }

        // Reset and Position
        str.setText(power.emoji);
        str.setPosition(x, y - 60);
        str.setAlpha(1);
        str.setScale(1);
        str.setVisible(true);

        // "Press down" animation
        this.tweens.add({
            targets: str,
            y: y - 10,
            scaleX: 0.8,
            scaleY: 0.8,
            duration: 150,
            yoyo: true,
            hold: 50,
            ease: 'Power2',
            onComplete: () => {
                // Flash on target
                if (target && target.sprite) {
                    target.sprite.setTintFill(power.type === 'OFFENSE' ? 0xff0000 : 0xffffe0);
                    this.time.delayedCall(150, () => {
                        if (target && target.sprite && target.sprite.active) {
                            target.sprite.clearTint();
                        }
                    });
                }

                // --- 2. Burst Particles (Physics Circles) ---
                const particleColor = power.type === 'OFFENSE' ? 0xff4444 : 0xffff00;
                for (let i = 0; i < 12; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = 60 + Math.random() * 80;

                    let p = this.messiahParticlePool.get(x, y);
                    if (p) {
                        p.setActive(true);
                        p.setVisible(true);
                        p.setAlpha(1);
                        p.setFillStyle(particleColor);
                        p.setRadius(4);
                        if (!p.body) this.physics.add.existing(p);
                        p.body.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);
                        p.setDepth(2000);

                        this.tweens.add({
                            targets: p,
                            alpha: 0,
                            duration: 500,
                            ease: 'Power2',
                            onComplete: () => {
                                this.messiahParticlePool.killAndHide(p);
                                if (p.body) p.body.setVelocity(0, 0);
                            }
                        });
                    }
                }

                // --- 3. Fade away emoji ---
                this.tweens.add({
                    targets: str,
                    alpha: 0,
                    y: y - 50,
                    duration: 350,
                    onComplete: () => {
                        str.setVisible(false);
                        this.messiahTextPool.push(str);
                    }
                });
            }
        });
    }

    executeAutoMessiahTouch() {
        const mm = this.game.messiahManager;
        if (!mm || mm.stacks <= 0 || !mm.isAutoMode) return;

        const power = mm.getActivePower();
        if (!power) return;

        // Prevent firing every single frame; add a small delay between auto casts
        if (this.time.now - (this.lastAutoMessiahCast || 0) < 1000) return;

        let potentialTargets = [];

        if (power.type === 'OFFENSE') {
            potentialTargets = this.enemies.getChildren().filter(e => e.active && e.hp > 0);
        } else {
            potentialTargets = this.mercenaries.getChildren().filter(m => m.active && m.hp > 0);

            // Anti-overlap logic for Encouragement
            if (power.id === 'ENCOURAGEMENT') {
                potentialTargets = potentialTargets.filter(m => !m.messiahEncouragementAmount);
            }
        }

        if (potentialTargets.length === 0) return;

        // Pick a random target
        const target = Phaser.Utils.Array.GetRandom(potentialTargets);

        if (target) {
            // Fake a pointer event position
            const pseudoPointer = { worldX: target.x, worldY: target.y };

            // Fire!
            this.handleMessiahTouch(pseudoPointer);
            this.lastAutoMessiahCast = this.time.now;
        }
    }

    setupFakeAestheticOverlays() {
        // Remove the expensive PostFX TiltShift if any
        if (this.cameras.main.postFX) {
            this.cameras.main.postFX.clear();
        }

        // Ensure main camera has the correct dark background
        this.cameras.main.setBackgroundColor('#000000');

        console.log('[디버그] 대기 효과 적용 (구름 그림자 & 렌즈 플레어)');
    }

    /**
     * Applies a cinematic intro blur that fades away.
     */
    applyIntroBlur() {
        if (!this.cameras.main.postFX || localStorage.getItem('batterySaver') === 'true') {
            console.log('[Visuals] Battery Saver ON or PostFX unsupported - Skipping intro blur.');
            return;
        }

        // Add a temporary blur effect
        const blur = this.cameras.main.postFX.addBlur(2, 4, 4, 1, 0xffffff, 4);

        // Tween to zero strength
        this.tweens.add({
            targets: blur,
            x: 0,
            y: 0,
            strength: 0,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => {
                this.cameras.main.postFX.remove(blur);
                console.log('[Visuals] Intro Blur Concluded. Screen is clear. ✨');
            }
        });
    }

    async initPet() {
        try {
            const partyManager = this.game?.partyManager;
            const activePetId = partyManager ? partyManager.getActivePet() : 'dog_pet';

            const startPos = this.dungeonManager.getPlayerStartPosition();
            const pet = this.petManager.spawnPet(activePetId, startPos.x, startPos.y);
            if (pet) {
                pet.leader = this.player;
            }
        } catch (e) {
            console.error('[DungeonScene] Failed to initialize pet:', e);
        }
    }

    /**
     * Spawns a production particle on the Phaser canvas.
     * @param {number} x Screen X
     * @param {number} y Screen Y
     * @param {string} iconId Asset key
     */

    // --- Construction Mode Logic ---

    async toggleConstructionMode(instanceId = null) {
        this.isConstructionMode = !!instanceId;
        this.selectedStructureId = instanceId;

        if (this.isConstructionMode) {
            console.log(`[Construction] Entering Mode for instance: ${instanceId}`);
            this.physics.pause();
            // Stop animations for everyone
            this.mercenaries.getChildren().forEach(m => { if (m.stopIdleBob) m.stopIdleBob(); });
            this.enemies.getChildren().forEach(e => { if (e.stopIdleBob) e.stopIdleBob(); });

            if (this.game.uiManager) this.game.uiManager.showConstructionUI();
        } else {
            console.log('[Construction] Exiting Mode');
            this.physics.resume();
            if (this.game.uiManager) this.game.uiManager.hideConstructionUI();
        }
    }

    handleConstructionPointer(pointer) {
        if (!this.isConstructionMode || !this.selectedStructureId) return;

        // 1. Right Click (PC) - Instant Placement
        if (pointer.rightButtonDown()) {
            const worldPoint = pointer.positionToCamera(this.cameras.main);
            this.placeStructureAt(worldPoint.x, worldPoint.y);
            return;
        }

        // 2. Left Click / Touch - Start Long Press Timer & Panning
        this.isDraggingCamera = true;
        this.lastPointerX = pointer.x;
        this.lastPointerY = pointer.y;

        // Cleanup existing timer if any
        if (this.constructionTimer) this.constructionTimer.remove();

        // Start 600ms timer for "Long Press" placement
        this.constructionTimer = this.time.delayedCall(600, () => {
            if (this.isConstructionMode && !this.isDraggingSignificantly) {
                const worldPoint = pointer.positionToCamera(this.cameras.main);
                this.placeStructureAt(worldPoint.x, worldPoint.y);
            }
        });

        this.isDraggingSignificantly = false;
    }

    handleConstructionUp(pointer) {
        this.isDraggingCamera = false;
        if (this.constructionTimer) {
            this.constructionTimer.remove();
            this.constructionTimer = null;
        }
    }

    handleConstructionDrag(pointer) {
        if (!this.isConstructionMode || !this.isDraggingCamera) return;

        const dx = (this.lastPointerX - pointer.x) / this.cameras.main.zoom;
        const dy = (this.lastPointerY - pointer.y) / this.cameras.main.zoom;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            this.isDraggingSignificantly = true;
        }

        this.cameraTarget.x += dx;
        this.cameraTarget.y += dy;

        this.lastPointerX = pointer.x;
        this.lastPointerY = pointer.y;
    }

    updateConstructionCamera(delta) {
        // dynamicCamera follows cameraTarget, so we just pan cameraTarget
        // Bound checks
        const bounds = this.physics.world.bounds;
        if (bounds) {
            this.cameraTarget.x = Phaser.Math.Clamp(this.cameraTarget.x, 0, bounds.width);
            this.cameraTarget.y = Phaser.Math.Clamp(this.cameraTarget.y, 0, bounds.height);
        }
    }

    async placeStructureAt(x, y) {
        if (!this.structureManager || !this.selectedStructureId) return;

        const spawned = await this.structureManager.placeStructure(this.selectedStructureId, x, y);
        if (spawned) {
            if (this.game.uiManager) this.game.uiManager.showToast('시설물 배치 완료! 🛡️');
            this.toggleConstructionMode(null); // Exit mode after placement
        }
    }

    startConstructionMode(instanceId) {
        this.toggleConstructionMode(instanceId);
    }

    async spawnHiredNPC(startPos, playerLeader) {
        const { default: npcManager } = await import('../modules/Core/NPCManager.js');
        const activeNPC = npcManager.getHiredNPC();

        if (activeNPC && activeNPC.isCombatant && activeNPC.stacks > 0) {
            console.log(`[Dungeon] Spawning Hired Combatant: ${activeNPC.name}`);

            const spawnPos = startPos || (this.dungeonManager ? this.dungeonManager.getPlayerStartPosition() : { x: 400, y: 300 });

            // Calculate Average Level of Top 6
            const activeParty = this.mercenaries.getChildren().filter(m => !m.config.hideInUI && !m.isSummoned);
            let totalLevel = 0;
            activeParty.forEach(m => totalLevel += (m.level || 1));
            const avgLevel = activeParty.length > 0 ? Math.round(totalLevel / activeParty.length) : 1;
            const hiredLevel = avgLevel * 2;

            let hiredUnit = null;
            if (activeNPC.id === 'HIRED_WARRIOR') {
                hiredUnit = new HiredWarrior(this, spawnPos.x, spawnPos.y, { level: hiredLevel });
            } else if (activeNPC.id === 'HIRED_ARCHER') {
                hiredUnit = new HiredArcher(this, spawnPos.x, spawnPos.y, playerLeader, { level: hiredLevel });
            }

            if (hiredUnit) {
                console.log(`[Dungeon] Successfully instantiated ${hiredUnit.unitName} at level ${hiredLevel} at (${spawnPos.x}, ${spawnPos.y})`);
                this.mercenaries.add(hiredUnit);

                // Scale stats based on level
                hiredUnit.level = hiredLevel;
                const baseStats = MercenaryClasses[activeNPC.classId.toUpperCase()];
                const scaled = scaleStats(baseStats, hiredLevel);

                // Apply scaled stats
                hiredUnit.maxHp = scaled.maxHp;
                hiredUnit.hp = scaled.maxHp;
                hiredUnit.atk = scaled.atk;
                hiredUnit.mAtk = scaled.mAtk;
                hiredUnit.def = scaled.def;
                hiredUnit.mDef = scaled.mDef;

                hiredUnit.syncStatusUI();

                // Stacks are now consumed on death (Auto-Resurrection), not on entry.
                EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[용병] ${activeNPC.name}가 전투에 합류했습니다! (레벨 ${hiredLevel}) ⚔️`);
            } else {
                console.warn(`[Dungeon] Failed to instantiate hired unit: ${activeNPC.id}`);
            }
        } else {
            console.log(`[Dungeon] Spawning skipped. activeNPC: ${activeNPC?.id}, stacks: ${activeNPC?.stacks}`);
        }
    }

    /**
     * Launch a potion projectile from off-screen right toward a target mercenary.
     * @param {string} potionId - ID of the potion (e.g., 'atk_potion')
     * @param {Mercenary} target - Target mercenary unit
     */
    launchPotionProjectile(potionId, target) {
        if (!target || !target.active) return;

        const potionInfo = alchemyManager.potionData[potionId];
        if (!potionInfo) return;

        // Start from off-screen right
        const startX = this.cameras.main.worldView.right + 100;
        const startY = Phaser.Math.Between(100, 900);
        
        const potionSprite = this.add.image(startX, startY, potionId);
        potionSprite.setDepth(25000); // Above most things
        potionSprite.setDisplaySize(32, 32);

        // --- 1. Potion Trail Particle Effect ---
        const trailColors = {
            'atk_potion': 0xff4444,
            'def_potion': 0x4444ff,
            'mAtk_potion': 0xee44ee,
            'mDef_potion': 0xffffff
        };
        const trailColor = trailColors[potionId] || 0xffffff;

        // Generate particle texture dynamically if it doesn't exist
        if (!this.textures.exists('potion_trail_particle')) {
            const graphics = this.add.graphics();
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(8, 8, 8); // 16x16 circle
            graphics.generateTexture('potion_trail_particle', 16, 16);
            graphics.destroy();
        }

        // Use the generated circular texture
        const trailEmitter = this.add.particles(0, 0, 'potion_trail_particle', {
            speed: { min: 20, max: 40 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.8, end: 0 },
            tint: trailColor,
            lifespan: 500,
            blendMode: 'ADD',
            frequency: 30
        });
        trailEmitter.setDepth(24999);
        trailEmitter.startFollow(potionSprite);

        // Parabolic arc calculation
        const duration = 1200;
        const peakY = Math.min(startY, target.y) - 150;

        // X movement
        this.tweens.add({
            targets: potionSprite,
            x: target.x,
            rotation: 10, // Rotate as it flies
            duration: duration,
            ease: 'Linear',
            onComplete: () => {
                // Ignore if trail is already cleaned up
                if (trailEmitter) {
                    trailEmitter.stop();
                    // Destroy emitter after particles fade
                    this.time.delayedCall(500, () => trailEmitter.destroy());
                }

                // Impact Logic
                if (target.active && target.hp > 0) {
                    // --- 2. Splash Particle Effect ---
                    if (this.fxManager) {
                        this.fxManager.showPotionSplash(target, potionId);
                    }
                    
                    // Apply Potion Buff
                    const statTypeMap = {
                        'atk_potion': 'atk',
                        'def_potion': 'def',
                        'mAtk_potion': 'mAtk',
                        'mDef_potion': 'mDef'
                    };
                    const statType = statTypeMap[potionId];
                    if (statType) {
                        target.applyPotionBuff(statType);
                    }
                }
                potionSprite.destroy();
            }
        });

        // Y movement (Parabolic Arc)
        this.tweens.add({
            targets: potionSprite,
            y: peakY,
            duration: duration / 2,
            ease: 'Quad.easeOut',
            yoyo: true
        });
        
        console.log(`[Alchemy] Launched ${potionId} toward ${target.unitName}`);
    }
}
