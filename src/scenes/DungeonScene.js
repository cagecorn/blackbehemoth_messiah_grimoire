import Phaser from 'phaser';
import DungeonManager from '../modules/Dungeon/DungeonManager.js';
import Warrior from '../modules/Player/Warrior.js';
import Goblin from '../modules/AI/Goblin.js';
import Orc from '../modules/AI/Orc.js';
import SkeletonWarrior from '../modules/AI/SkeletonWarrior.js';
import SkeletonWizard from '../modules/AI/SkeletonWizard.js';
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

        // Reward values
        this.killExp = 25;
        this.roundClearExp = 500;
    }

    init(data) {
        this.dungeonType = data?.dungeonType || 'CURSED_FOREST';
        this.currentRound = data?.startRound || 1;
        // Reset state on every entry
        this.isResting = false;
        this.isUltimateActive = false;
        this.isResetting = false;
        this.isInitializing = true;

        // Global Heal on Scene Entry
        if (this.game.partyManager) this.game.partyManager.healAll();
    }

    create() {
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

        this.initDungeon();
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

        // --- 2. Emergency Camera Setup: Enable basic zoom/controls immediately ---
        // Create a temporary camera target at center so user can zoom/pan during ticket check
        this.cameraTarget = this.add.container(worldWidth / 2, worldHeight / 2);
        this.dynamicCamera = new DynamicCameraManager(this, this.cameras.main);
        this.dynamicCamera.setTarget(this.cameraTarget);

        console.log(`[Dungeon] Initializing World Bounds: ${worldWidth}x${worldHeight}`);

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
            }

            if (this.game.uiManager) {
                this.game.uiManager.scene = this;
            }

            // Enable multi-touch for pinch zoom
            this.input.addPointer(1);

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

            // Initialize Managers
            this.dungeonManager = new DungeonManager(this);
            this.dungeonManager.generateDungeon();

            // --- Layers Setup ---
            // Create a dedicated layer for UI elements that should NOT zoom or move.
            this.uiLayer = this.add.container(0, 0).setDepth(100000).setScrollFactor(0);

            // --- UI Camera Setup (Fixed Overlay) ---
            // This camera stays at zoom 1 and doesn't scroll.
            this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height).setName('UICamera');
            this.uiCamera.setScroll(0, 0);
            this.uiCamera.setZoom(1);

            const stageConfig = StageConfigs[this.dungeonType] || StageConfigs.CURSED_FOREST;
            this.stageManager = new StageManager(this, stageConfig);
            this.stageManager.buildStage(worldWidth, worldHeight);

            // Bounds are already set at the start, but we re-verify for consistency with dynamically generated dungeons
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

            // ⚔️ Premium Skill FX Layer (with Global Bloom)
            // This layer hosts all magical effects, projectiles, and skill visuals.
            // It sits above units but below the UI/HUD.
            this.skillFxLayer = this.add.container(0, 0);
            this.skillFxLayer.setDepth(15000); // Between units (~5000-10000) and Damage Text (~20000)

            if (this.skillFxLayer.postFX && localStorage.getItem('batterySaver') !== 'true') {
                const bloom = this.skillFxLayer.postFX.addBloom(0xffffff, 1, 1, 1.2, 3);
                console.log('[Visuals] Skill FX Bloom Pipeline Active! ✨ (Golden Glow enabled)');
            }

            // Create a named listener for Battery Saver for easy removal
            this.onBatterySaverToggled = (enabled) => {
                if (this.skillFxLayer && this.skillFxLayer.postFX) {
                    if (enabled) {
                        this.skillFxLayer.postFX.clear();
                        console.log('[Visuals] Battery Saver ON - Removed PostFX from Skill Layer.');
                    } else {
                        if (this.skillFxLayer.postFX.list.length === 0) {
                            this.skillFxLayer.postFX.addBloom(0xffffff, 1, 1, 1.2, 3);
                            console.log('[Visuals] Battery Saver OFF - Restored PostFX Bloom.');
                        }
                    }
                }
            };
            EventBus.on(EventBus.EVENTS.BATTERY_SAVER_TOGGLED, this.onBatterySaverToggled, this);

            // Listen for Character Swap
            this.handleDebugSwapListener = this.handleDebugSwap.bind(this);
            EventBus.on(EventBus.EVENTS.DEBUG_SWAP_CHARACTER, this.handleDebugSwapListener);

            // Global Combat Events for Rewards - Store as reference for cleanup
            this.handleMonsterKilledListener = (payload) => {
                if (this.mercenaries && this.mercenaries.active) {
                    const monsterLevel = payload.level || 1;
                    const monsterId = payload.id || '';

                    // Base XP Scaling: killExp * (1 + (level - 1) * 0.1)
                    // Skeletons give 1.5x more XP
                    let calculatedExp = this.killExp * (1 + (monsterLevel - 1) * 0.1);

                    if (monsterId.includes('skeleton')) {
                        calculatedExp *= 1.5;
                    }

                    calculatedExp = Math.floor(calculatedExp);

                    // Ensure a minimum of killExp
                    calculatedExp = Math.max(calculatedExp, this.killExp);

                    this.mercenaries.getChildren().forEach(merc => {
                        if (merc.active && merc.hp > 0) {
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

            // Spawn Party from PartyManager
            const activeParty = this.game.partyManager.getActiveParty();
            const startPos = this.dungeonManager.getPlayerStartPosition();

            let playerLeader = null;
            activeParty.forEach((charId, i) => {
                if (!charId) return;

                const charConfig = Object.values(Characters).find(c => c.id === charId);
                if (!charConfig) return;

                const x = startPos.x - (i * 40);
                const y = startPos.y;
                let unit = null;

                if (charConfig.classId === 'warrior') {
                    unit = new Warrior(this, x, y, charConfig);
                    if (!playerLeader) {
                        playerLeader = unit;
                        this.player = unit;
                    }
                } else if (charId === 'wrinkle') {
                    unit = new Wrinkle(this, x, y, playerLeader, charConfig);
                } else if (charId === 'nickle') {
                    unit = new Nickle(this, x, y, playerLeader, charConfig);
                } else if (charConfig.classId === 'archer') {
                    unit = new Archer(this, x, y, playerLeader, charConfig);
                } else if (charConfig.classId === 'healer') {
                    unit = new Healer(this, x, y, playerLeader, charConfig);
                } else if (charConfig.classId === 'wizard') {
                    if (charId === 'bao') {
                        unit = new Bao(this, x, y, playerLeader, charConfig);
                    } else if (charId === 'aina') {
                        unit = new Aina(this, x, y, playerLeader, charConfig);
                    } else if (charId === 'veve') {
                        unit = new Veve(this, x, y, playerLeader, charConfig);
                    } else {
                        unit = new Wizard(this, x, y, playerLeader, charConfig);
                    }
                } else if (charConfig.classId === 'bard') {
                    if (charId === 'nana') {
                        unit = new Nana(this, x, y, playerLeader, charConfig);
                    } else if (charId === 'noah') {
                        unit = new Noah(this, x, y, playerLeader, charConfig);
                    } else if (charId === 'noel') {
                        unit = new Noel(this, x, y, playerLeader, charConfig);
                    } else {
                        unit = new Bard(this, x, y, playerLeader, charConfig);
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
                // Access UIManager via the game object (assuming it's attached there or globally accessible)
                if (this.sys.game.uiManager && this.sys.game.uiManager.popupOverlay && this.sys.game.uiManager.popupOverlay.style.display === 'flex') {
                    this.sys.game.uiManager.hidePopup();
                } else {
                    this.scene.start('TerritoryScene');
                }
            });

            // UI Indicators (Now DOM-Based)
            if (this.game.uiManager) {
                this.game.uiManager.updateRoundDisplay(`DUNGEON ROUND ${this.currentRound}`);
            }

            // --- Camera Rule: UI Visibility ---
            // 1. Main camera ignores the UI layer completely
            this.cameras.main.ignore(this.uiLayer);

            // 2. UI camera ignores EVERYTHING except the UI layer
            // First, ignore all existing children
            this.children.list.forEach(child => {
                if (child !== this.uiLayer) this.uiCamera.ignore(child);
            });

            // Second, dynamically ignore any future objects added to the scene
            this.events.on('addedtogame', (child) => {
                if (this.uiCamera && child !== this.uiLayer) {
                    this.uiCamera.ignore(child);
                }
            });

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
        const config = { ...Characters[characterId.toUpperCase()], team: 'player' };

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
        if (this.mercenaries && this.mercenaries.countActive(true) === 0 && !this.isResetting && !this.isResting) {
            this.handlePartyWipeout();
        }

        if (this.enemies && this.enemies.countActive(true) === 0 && !this.isResting) {
            this.isResting = true;
            EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[시스템] 라운드 ${this.currentRound} 클리어! 5초 뒤 다음 라운드가 시작됩니다. ⛺`);

            this.time.delayedCall(5000, () => {
                // Grant Round Clear EXP
                this.mercenaries.getChildren().forEach(merc => {
                    if (merc.active && merc.hp > 0) {
                        merc.addExp(this.roundClearExp);
                    }
                });

                this.currentRound++;
                if (this.game.uiManager) this.game.uiManager.updateRoundDisplay(`DUNGEON ROUND ${this.currentRound}`);

                // Save Best Round
                DBManager.saveBestRound(this.dungeonType, this.currentRound).then(isNewBest => {
                    if (isNewBest) {
                        EventBus.emit('BEST_ROUND_UPDATED', { dungeonType: this.dungeonType, round: this.currentRound });
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

            // Check if we need a ticket to restart this specific dungeon
            if (this.dungeonType === 'UNDEAD_GRAVEYARD') {
                DBManager.getInventoryItem('emoji_ticket').then(ticket => {
                    if (!ticket || ticket.amount <= 0) {
                        if (this.game.uiManager) this.game.uiManager.showToast('입장권 소진으로 [저주받은 숲]으로 복귀합니다.');
                        this.scene.start('DungeonScene', { dungeonType: 'CURSED_FOREST', startRound: 1 });
                    } else {
                        this.scene.restart({ dungeonType: this.dungeonType, startRound: 1 });
                    }
                });
            } else {
                this.scene.restart();
            }
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

        this.mercenaries.getChildren().forEach(merc => {
            if (merc.active && merc.hp > 0) {
                totalX += merc.x;
                totalY += merc.y;
                count++;
            }
        });

        if (count > 0) {
            const avgX = totalX / count;
            const avgY = totalY / count;

            // Smoothly lerp camera target or set directly (Phaser's startFollow handles smoothing)
            this.cameraTarget.setPosition(avgX, avgY);
        }
    }

    spawnWave() {
        const startPos = this.dungeonManager.getPlayerStartPosition();
        // Monster scaling: Increases every 5 rounds
        const monsterLevel = Math.floor((this.currentRound - 1) / 5) + 1;

        // Elite Settings
        const eliteChance = Math.min(0.5, 0.1 + (this.currentRound - 1) * 0.05);
        const novaCharms = ['emoji_fireworks', 'emoji_sparkler', 'emoji_koinobori'];
        const nodeCharmsList = ['emoji_pouting_face', 'emoji_enraged_face', 'emoji_smiling_face_with_sunglasses'];

        const applyEliteLogic = (monster) => {
            if (Math.random() < eliteChance) {
                monster.maxHp *= 2.5;
                monster.hp = monster.maxHp;
                monster.atk *= 1.5;
                monster.mAtk *= 1.5;
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

        if (this.dungeonType === 'UNDEAD_GRAVEYARD') {
            // --- Undead Graveyard Spawning ---
            // Spawn Skeleton Warriors (Base 12 + 1 per round)
            const skeletonCount = 12 + (this.currentRound - 1) * 1;
            for (let i = 0; i < skeletonCount; i++) {
                const offsetX = (i % 4) * 60;
                const offsetY = Math.floor(i / 4) * 60;
                const skeleton = this.spawnMonster(SkeletonWarrior, startPos.x + 150 + offsetX, startPos.y + offsetY - 80, this.player, monsterLevel);
                applyEliteLogic(skeleton);
            }

            // Spawn Skeleton Wizards (Base 4 + 1 every round)
            const wizardCount = 4 + (this.currentRound - 1);
            for (let i = 0; i < wizardCount; i++) {
                const offsetX = (i % 2) * 80;
                const offsetY = Math.floor(i / 2) * 80;
                const wiz = this.spawnMonster(SkeletonWizard, startPos.x + 400 + offsetX, startPos.y + offsetY - 40, this.player, monsterLevel);
                applyEliteLogic(wiz);
            }
        } else {
            // --- Cursed Forest Spawning (Original Logic) ---
            // Spawn Goblins (Base 12 + 1 per round)
            const goblinCount = 12 + (this.currentRound - 1) * 1;
            for (let i = 0; i < goblinCount; i++) {
                const offsetX = (i % 4) * 60;
                const offsetY = Math.floor(i / 4) * 60;
                const goblin = this.spawnMonster(Goblin, startPos.x + 150 + offsetX, startPos.y + offsetY - 80, this.player, monsterLevel);
                applyEliteLogic(goblin);
            }

            // Spawn Shamans (Base 2 + 1 every 2 rounds)
            const shamanConfig = MonsterClasses.SHAMAN;
            const shamanCount = 2 + Math.floor((this.currentRound - 1) / 2);
            for (let i = 0; i < shamanCount; i++) {
                const shaman = this.spawnMonster(MonsterHealer, startPos.x + 200 + (i * 80), startPos.y + 120, this.player, monsterLevel, shamanConfig);
                applyEliteLogic(shaman);
            }

            // Spawn Orcs (Round 1: 2, then +0.5 per round)
            const orcCount = 2 + Math.floor((this.currentRound - 1) / 2);
            for (let i = 0; i < orcCount; i++) {
                const offsetX = (i % 2) * 80;
                const offsetY = Math.floor(i / 2) * 80;
                const orc = this.spawnMonster(Orc, startPos.x + 400 + offsetX, startPos.y + offsetY - 40, this.player, monsterLevel);
                applyEliteLogic(orc);
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

        // Apply scaling
        let config = scaleStats(mergedBaseConfig, level);

        // Create config with enemy team and unique ID
        config = {
            ...config,
            id: characterConfig.id + '_shadow_' + Phaser.Math.Between(10000, 99999), // unique ID
            name: `Lv.${level} 그림자 ${characterConfig.name}`,
            team: 'enemy',
            hideInUI: true  // Don't show in portrait bar
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
            unit.maxHp *= 3;
            unit.hp = unit.maxHp;
            unit.atk *= 1.8;
            unit.mAtk *= 1.8;
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
     */
    spawnMonster(MonsterClass, x, y, target, level, classConfig = null) {
        const className = MonsterClass.name;
        if (!this.monsterPool[className]) {
            this.monsterPool[className] = [];
        }

        // Find an inactive monster of the same class
        let monster = this.monsterPool[className].find(m => !m.active);

        // Prepare config
        const baseConfig = classConfig || MonsterClasses[className.toUpperCase()] || MonsterClasses.GOBLIN;
        const config = scaleStats(baseConfig, level);

        if (monster) {
            monster.reset(x, y, config, target);
            this.enemies.add(monster);
        } else {
            monster = new MonsterClass(this, x, y, target, level);
            this.enemies.add(monster);
            this.monsterPool[className].push(monster);
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
    spawnResourceParticle(x, y, iconId) {
        if (!this.resParticlePool) this.resParticlePool = [];

        let p = this.resParticlePool.pop();
        if (!p) {
            p = this.add.image(0, 0, iconId);
            p.setDepth(200000); // Super top depth
            p.setScrollFactor(0); // Fixed screen position

            // Critical Fix: Tell the main camera to ignore this particle 
            // so it only shows up on the uiCamera (preventing duplication).
            if (this.uiCamera) {
                this.cameras.main.ignore(p);
            }
        }

        p.setTexture(iconId);
        p.setPosition(x, y);
        p.setAlpha(1);
        p.setScale(0.2); // Miniature feel (was 0.4)
        p.setVisible(true);

        // Animate: Pop up, float, and fade
        this.tweens.add({
            targets: p,
            y: y - 60,
            alpha: 0,
            scale: 0.6,
            duration: 1500,
            ease: 'Cubic.out',
            onComplete: () => {
                p.setVisible(false);
                this.resParticlePool.push(p);
            }
        });
    }
}
