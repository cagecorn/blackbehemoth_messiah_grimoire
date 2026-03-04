import Phaser from 'phaser';
import DungeonManager from '../modules/Dungeon/DungeonManager.js';
import Warrior from '../modules/Player/Warrior.js';
import Goblin from '../modules/AI/Goblin.js';
import Orc from '../modules/AI/Orc.js';
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

    init() {
        // Reset state on every entry
        this.currentRound = 1;
        this.isResting = false;
        this.isUltimateActive = false;
        this.isResetting = false;

        // Global Heal on Scene Entry
        if (this.game.partyManager) this.game.partyManager.healAll();
    }

    create() {
        if (this.game.uiManager) {
            this.game.uiManager.scene = this;
        }
        console.log('DungeonScene started');
        this.cameras.main.setBackgroundColor('#000000');

        // Enable multi-touch for pinch zoom
        this.input.addPointer(1);

        // Play Random BGM
        const bgms = ['main_battle_bgm_1', 'main_battle_bgm_2', 'main_battle_bgm_3'];
        const randomBgm = Phaser.Utils.Array.GetRandom(bgms);
        if (this.sound.get(randomBgm)) {
            // Already initialized, don't re-add unless needed, but stopAll gives fresh start
        }
        this.sound.stopAll();
        this.bgm = this.sound.add(randomBgm, { volume: 0.3, loop: true });
        this.bgm.play();

        // --- Retro Bitcrusher & Lowpass Filter for BGM ---
        if (this.sound.context && this.bgm.gainNode) {
            try {
                const ctx = this.sound.context;

                // 1. Bitcrusher (WaveShaper)
                const bitCrusher = ctx.createWaveShaper();
                const bitDepth = 4; // 4-bit crunch
                const step = Math.pow(0.5, bitDepth);
                const size = 4096;
                const curve = new Float32Array(size);
                for (let i = 0; i < size; i++) {
                    const x = (i * 2 / size) - 1;
                    curve[i] = Math.round(x / step) * step;
                }
                bitCrusher.curve = curve;

                // 2. Lowpass Filter (Lo-Fi muffled sound)
                const lowpass = ctx.createBiquadFilter();
                lowpass.type = 'lowpass';
                lowpass.frequency.value = 2000;

                // 3. Distortion for crunchiness
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
                distNode.curve = makeDistortionCurve(20); // Mild distortion
                distNode.oversample = '4x';

                // Disconnect Phaser's default routing
                this.bgm.gainNode.disconnect();

                // Route: Gain -> Bitcrusher -> Distortion -> Lowpass -> Master Destination
                this.bgm.gainNode.connect(bitCrusher);
                bitCrusher.connect(distNode);
                distNode.connect(lowpass);
                lowpass.connect(this.sound.destination);

                console.log('[Audio] 8-Bit BGM Filter Activated');
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
        // Cameras are transparent by default unless setBackgroundColor is used.
        // Background base 1536x1024 * 1.5 = 2304x1536
        const worldWidth = this.dungeonManager.dungeonInstance.width * 32;
        const worldHeight = this.dungeonManager.dungeonInstance.height * 32;
        this.stageManager = new StageManager(this, StageConfigs.CURSED_FOREST);
        this.stageManager.buildStage(worldWidth, worldHeight);

        // ★ Set world & camera bounds BEFORE spawning units
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

        console.log(`[Dungeon] World Size Scaled to 1.5x: ${worldWidth}x${worldHeight}`);

        // --- Global Debug helper for user ---
        window.showWorldBounds = () => {
            console.log(`World Bounds: 0..${worldWidth}, 0..${worldHeight}`);
            console.log(`Camera Bounds: ${this.cameras.main._bounds.x}..${this.cameras.main._bounds.width}`);
            const bg = this.children.list.find(c => c.texture && c.texture.key.includes('bg'));
            if (bg) console.log(`BG: Pos(${bg.x},${bg.y}), Size(${bg.displayWidth},${bg.displayHeight})`);
        };

        // Physics Groups (Initialize early for Managers)
        this.mercenaries = this.physics.add.group();
        this.enemies = this.physics.add.group();

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
                this.mercenaries.getChildren().forEach(merc => {
                    if (merc.active && merc.hp > 0) {
                        merc.addExp(this.killExp);
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

        // Initialize Camera Target (follows centroid of party)
        this.cameraTarget = this.add.container(startPos.x, startPos.y);

        // Initialize Dynamic Camera Manager
        this.dynamicCamera = new DynamicCameraManager(this, this.cameras.main);
        this.dynamicCamera.setTarget(this.cameraTarget);

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

        // UI Indicators
        this.roundText = this.add.text(this.cameras.main.width / 2, 55, `DUNGEON ROUND ${this.currentRound}`, {
            fontSize: '24px',
            fill: '#fff',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 5
        }).setOrigin(0.5);
        this.uiLayer.add(this.roundText);

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
        if (this.isUltimateActive || this.isResetting) return;

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
                if (this.roundText) this.roundText.setText(`DUNGEON ROUND ${this.currentRound}`);
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

        if (this.dynamicCamera) {
            this.dynamicCamera.update(time, delta);
        }
        if (this.weatherManager) {
            this.weatherManager.update(time, delta);
        }
        if (this.stageManager) {
            this.stageManager.update(time, delta);
        }
        if (this.ambientMoteManager) {
            this.ambientMoteManager.update();
        }
    }

    handlePartyWipeout() {
        this.isResetting = true;

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
            this.scene.restart();
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

        // Spawn Goblins (Base 12 + 1 per round)
        const goblinConfig = MonsterClasses.GOBLIN;
        const goblinCount = 12 + (this.currentRound - 1) * 1;
        for (let i = 0; i < goblinCount; i++) {
            const offsetX = (i % 4) * 60;
            const offsetY = Math.floor(i / 4) * 60;
            const goblin = new Goblin(this, startPos.x + 150 + offsetX, startPos.y + offsetY - 80, this.player, monsterLevel);
            applyEliteLogic(goblin);
            this.enemies.add(goblin);
        }

        // Spawn Shamans (Base 2 + 1 every 2 rounds)
        const shamanConfig = MonsterClasses.SHAMAN;
        const shamanCount = 2 + Math.floor((this.currentRound - 1) / 2);
        for (let i = 0; i < shamanCount; i++) {
            const shaman = new MonsterHealer(this, startPos.x + 200 + (i * 80), startPos.y + 120, shamanConfig, this.player, monsterLevel);
            applyEliteLogic(shaman);
            this.enemies.add(shaman);
        }

        // Spawn Orcs (Round 1: 2, then +0.5 per round)
        const orcCount = 2 + Math.floor((this.currentRound - 1) / 2);
        for (let i = 0; i < orcCount; i++) {
            const offsetX = (i % 2) * 80;
            const offsetY = Math.floor(i / 2) * 80;
            const orc = new Orc(this, startPos.x + 400 + offsetX, startPos.y + offsetY - 40, this.player, monsterLevel);
            applyEliteLogic(orc);
            this.enemies.add(orc);
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

            const novaCharms = ['emoji_fireworks', 'emoji_sparkler', 'emoji_koinobori'];
            const charmCount = Phaser.Math.Between(1, 3);
            const shuffledNova = [...novaCharms].sort(() => 0.5 - Math.random());
            unit.charms[0] = shuffledNova[0];
            if (charmCount > 1) unit.charms[1] = shuffledNova[1];
            if (charmCount > 2) unit.charms[2] = shuffledNova[2];

            // Assign 1 random node charm (Gambit AI)
            const nodeCharmsList = ['emoji_pouting_face', 'emoji_enraged_face', 'emoji_smiling_face_with_sunglasses'];
            const randomNodeCharm = nodeCharmsList[Math.floor(Math.random() * nodeCharmsList.length)];
            unit.nodeCharms[0] = randomNodeCharm;

            // Convert node charm back to readable emoji for Log
            let nodeEmoji = 'None';
            if (randomNodeCharm === 'emoji_pouting_face') nodeEmoji = '😠 [Hater]';
            if (randomNodeCharm === 'emoji_enraged_face') nodeEmoji = '😡 [Blood Scent]';
            if (randomNodeCharm === 'emoji_smiling_face_with_sunglasses') nodeEmoji = '😎 [Bodyguard]';

            this.enemies.add(unit);
            console.log(`[Dungeon] Spawned Shadow ${config.name} (ID: ${unit.id}) with HP: ${unit.hp}/${unit.maxHp}, Node Charm: ${nodeEmoji} and novas: ${unit.charms}`);

            if (unit.setElite) unit.setElite(true);

            // Re-initialize AI targets to be sure it targets the player party
            if (unit.initAI) {
                unit.initAI();
            }

            return unit;
        }
        return null;
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
            const petData = await DBManager.get('settings', 'playerPets');
            const activePetId = petData ? petData.activePet : 'dog_pet';

            const startPos = this.dungeonManager.getPlayerStartPosition();
            const pet = this.petManager.spawnPet(activePetId, startPos.x, startPos.y);
            if (pet) {
                pet.leader = this.player;
            }
        } catch (e) {
            console.error('[DungeonScene] Failed to initialize pet:', e);
        }
    }
}
