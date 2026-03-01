import Phaser from 'phaser';
import Warrior from '../modules/Player/Warrior.js';
import Archer from '../modules/Player/Archer.js';
import Healer from '../modules/Player/Healer.js';
import Wizard from '../modules/Player/Wizard.js';
import Aina from '../modules/Player/Aina.js';
import Bao from '../modules/Player/Bao.js';
import Bard from '../modules/Player/Bard.js';
import Nana from '../modules/Player/Nana.js';
import Nickle from '../modules/Player/Nickle.js';
import ProjectileManager from '../modules/Combat/ProjectileManager.js';
import ParticleManager from '../modules/Particles/ParticleManager.js';
import FXManager from '../modules/Combat/FXManager.js';
import AoeManager from '../modules/Combat/AoeManager.js';
import CCManager from '../modules/Combat/CCManager.js';
import ShieldManager from '../modules/Combat/ShieldManager.js';
import BuffManager from '../modules/Core/BuffManager.js';
import SeparationManager from '../modules/Core/SeparationManager.js';
import BarkManager from '../modules/AI/BarkManager.js';
import { Characters } from '../modules/Core/EntityStats.js';
import partyManager from '../modules/Core/PartyManager.js';
import EventBus from '../modules/Events/EventBus.js';
import StageManager from '../modules/Environment/StageManager.js';
import { StageConfigs } from '../modules/Core/EntityStats.js';
import AmbientMoteManager from '../modules/Environment/AmbientMoteManager.js';
import DynamicCameraManager from '../modules/Core/DynamicCameraManager.js';

export default class ArenaScene extends Phaser.Scene {
    constructor() {
        super('ArenaScene');
        this.mercenaries = null;
        this.enemies = null;
        this.isResetting = false;
        this.battleCount = 1;

        // Selection State
        this.gameState = 'SELECTING'; // 'SELECTING' or 'BATTLE'
        this.selectedMercs = new Set();
        this.selectionUI = null;
    }

    init() {
        // Reset state on every restart
        this.gameState = 'BATTLE';
        this.isResetting = false;

        // Global Heal on Scene Entry
        if (partyManager) partyManager.healAll();
    }

    create() {
        console.log('ArenaScene started');

        // Fixed Arena Dimensions (matching background asset 1536x1024)
        const worldWidth = 1536;
        const worldHeight = 1024;

        // Stage visual rendering
        this.stageManager = new StageManager(this, StageConfigs.ARENA);
        this.stageManager.buildStage(worldWidth, worldHeight);


        // Physics Groups
        this.mercenaries = this.physics.add.group();
        this.enemies = this.physics.add.group();

        // ★ Set fixed world & camera bounds
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

        // Initialize Managers
        this.fxManager = new FXManager(this);
        this.aoeManager = new AoeManager(this);
        this.projectileManager = new ProjectileManager(this);
        this.particleManager = new ParticleManager(this);
        this.buffManager = new BuffManager(this);
        this.ccManager = new CCManager(this);
        this.shieldManager = new ShieldManager(this);
        this.barkManager = new BarkManager(this);

        // ⚔️ Premium Skill FX Layer (with Global Bloom)
        this.skillFxLayer = this.add.container(0, 0);
        this.skillFxLayer.setDepth(15000);

        if (this.skillFxLayer.postFX) {
            this.skillFxLayer.postFX.addBloom(0xffffff, 1, 1, 1.2, 3);
            console.log('[Arena] Skill FX Bloom Pipeline Active! ✨');
        }

        // UI
        this.statusText = this.add.text(this.cameras.main.width / 2, 50, '아레나 배틀 준비...', {
            fontSize: '32px',
            fill: '#fff',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

        this.add.text(10, 10, 'ESC to Return to Territory', { fontSize: '16px', fill: '#fff' }).setScrollFactor(0).setDepth(1000);

        // ESC to return
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.start('TerritoryScene');
        });

        // Repulsion
        this.physics.add.overlap(this.mercenaries, this.mercenaries, (u1, u2) => {
            if (u1 !== u2) SeparationManager.applyRepulsion(u1, u2, 40);
        });
        this.physics.add.overlap(this.enemies, this.enemies, (u1, u2) => {
            if (u1 !== u2) SeparationManager.applyRepulsion(u1, u2, 40);
        });
        this.physics.add.overlap(this.mercenaries, this.enemies, (u1, u2) => {
            SeparationManager.applyRepulsion(u1, u2, 60);
        });

        EventBus.on(EventBus.EVENTS.DEBUG_SWAP_CHARACTER, this.handleDebugSwap, this);

        // ── 환경 부유 먼지 (3레이어 Parallax) ──
        this.ambientMoteManager = new AmbientMoteManager(this);
        console.log('[Arena] Dust Bokeh (AmbientMoteManager) initialized.');

        // Cleanup on scene shutdown
        this.events.once('shutdown', () => {
            EventBus.off(EventBus.EVENTS.DEBUG_SWAP_CHARACTER, this.handleDebugSwap, this);
            if (this.ambientMoteManager) this.ambientMoteManager.destroy();
            console.log('[ArenaScene] Cleaned up AmbientMotes.');
        });

        // Start battle immediately with PartyManager data
        this.startNewBattle();
    }

    startNewBattle() {
        this.isResetting = false;
        this.mercenaries.clear(true, true);
        this.enemies.clear(true, true);

        // Final projectile cleanup to be safe
        if (this.projectileManager && this.projectileManager.projectiles) {
            this.projectileManager.projectiles.clear(true, true);
        }

        const centerX = 1536 / 2;
        const centerY = 1024 / 2;

        // 1. Spawn Selected Player Party from PartyManager
        const activeParty = partyManager.getActiveParty();

        activeParty.forEach((charId, i) => {
            if (!charId) return;
            const config = Object.values(Characters).find(c => c.id === charId);
            if (!config) return;

            const x = centerX - 250;
            const y = centerY - 150 + (i * 65); // Reduced spacing from 75 to 65 for 6 units
            const unit = this.spawnUnit(config, x, y, 'player', null);
            if (unit) {
                this.mercenaries.add(unit);
                unit.autoUlt = true; // Auto-ult in Arena
            }
        });

        // 2. Spawn Random Enemy Party
        const avgLevel = partyManager.getAveragePartyLevel();
        const availableCharacters = [...Object.values(Characters)];
        Phaser.Utils.Array.Shuffle(availableCharacters);

        for (let i = 0; i < 6; i++) { // Increased to 6 enemies
            const randomChar = availableCharacters[i % availableCharacters.length];
            const x = centerX + 250;
            const y = centerY - 150 + (i * 65); // Reduced spacing to 65

            const enemyConfig = {
                ...randomChar,
                id: randomChar.id + '_enemy_' + this.battleCount + '_' + i,
                characterId: randomChar.id, // Ensure characterId is preserved
                name: `적 ${randomChar.name}`,
                level: avgLevel,
                team: 'enemy'
            };

            const unit = this.spawnUnit(enemyConfig, x, y, 'enemy', null);
            if (unit) {
                this.enemies.add(unit);
                unit.autoUlt = true; // Auto-ult even for enemies
            }
        }

        if (this.statusText) {
            this.statusText.setText(`아레나 배틀 #${this.battleCount}`);
        }

        // Initialize Camera Target (follows centroid of party)
        this.cameraTarget = this.add.container(centerX, centerY);

        // Initialize Dynamic Camera Manager
        this.dynamicCamera = new DynamicCameraManager(this, this.cameras.main);
        this.dynamicCamera.setTarget(this.cameraTarget);
        console.log('[Arena] Dynamic Shake Camera (DynamicCameraManager) initialized.');

        // Trigger UI binding for the deployed mercenaries
        EventBus.emit(EventBus.EVENTS.PARTY_DEPLOYED, {
            scene: this,
            mercenaries: this.mercenaries.getChildren().map(m => m.getState())
        });
    }

    spawnUnit(config, x, y, team, leader) {
        const classId = config.classId || 'warrior';
        let unit;

        const finalConfig = { ...config, team };

        if (classId === 'warrior') {
            unit = new Warrior(this, x, y, finalConfig);
        } else if (config.id === 'nickle' || config.characterId === 'nickle') {
            unit = new Nickle(this, x, y, leader, finalConfig);
        } else if (classId === 'archer') {
            unit = new Archer(this, x, y, leader, finalConfig);
        } else if (classId === 'healer') {
            unit = new Healer(this, x, y, leader, finalConfig);
        } else if (classId === 'wizard') {
            if (config.id === 'bao' || config.characterId === 'bao') {
                unit = new Bao(this, x, y, leader, finalConfig);
            } else if (config.id === 'aina' || config.characterId === 'aina') {
                unit = new Aina(this, x, y, leader, finalConfig);
            } else {
                unit = new Wizard(this, x, y, leader, finalConfig);
            }
        } else if (classId === 'bard') {
            if (config.id === 'nana' || config.characterId === 'nana') {
                unit = new Nana(this, x, y, leader, finalConfig);
            } else {
                unit = new Bard(this, x, y, leader, finalConfig);
            }
        }

        if (unit && unit.initAI) {
            unit.initAI();
        }

        return unit;
    }

    handleDebugSwap(payload) {
        if (this.gameState !== 'BATTLE') return;

        const { classId, characterId, unitId } = payload;
        let unitToSwap = this.mercenaries.getChildren().find(u => u.id === unitId);

        if (unitToSwap) {
            const x = unitToSwap.x;
            const y = unitToSwap.y;
            const config = { ...Characters[characterId.toUpperCase()], team: 'player' };

            unitToSwap.destroy();

            const newUnit = this.spawnUnit(config, x, y, 'player', null);
            if (newUnit) {
                this.mercenaries.add(newUnit);
                newUnit.autoUlt = true;

                // Re-emit PARTY_DEPLOYED
                EventBus.emit(EventBus.EVENTS.PARTY_DEPLOYED, {
                    scene: this,
                    mercenaries: this.mercenaries.getChildren().map(m => m.getState())
                });
            }
        }
    }

    update(time, delta) {
        if (this.gameState !== 'BATTLE' || this.isResetting) return;

        if (this.buffManager) this.buffManager.update(time, delta);
        if (this.ccManager) this.ccManager.update(time, delta);
        if (this.shieldManager) this.shieldManager.update(time, delta);
        if (this.barkManager) this.barkManager.update(time, delta);

        const HUD_MARGIN = 80;
        const SIDE_MARGIN = 40;
        const worldWidth = 1536;
        const worldHeight = 1024;

        this.mercenaries.getChildren().forEach(u => {
            u.update();
            u.setDepth(u.y);

            // Strict Boundary Clamping (Anti-Bypass Safety)
            u.x = Phaser.Math.Clamp(u.x, (u.body?.radius || 20) + SIDE_MARGIN, worldWidth - (u.body?.radius || 20) - SIDE_MARGIN);
            u.y = Phaser.Math.Clamp(u.y, (u.body?.radius || 20) + SIDE_MARGIN, worldHeight - (u.body?.radius || 20) - HUD_MARGIN);

            // ── Idle Bob 자동 제어 (에어본 글리치 방지) ──
            if (u.body && u.startIdleBob) {
                const isMoving = u.body.speed > 5;
                const isBlocked = u.isAirborne || u.isKnockedBack || u.hp <= 0;

                if ((isMoving || isBlocked) && u._idleBobTween) {
                    u.stopIdleBob(false);
                } else if (!isMoving && !isBlocked && !u._idleBobTween) {
                    u.startIdleBob();
                }
            }
        });
        this.enemies.getChildren().forEach(u => {
            u.update();
            u.setDepth(u.y);

            // Strict Boundary Clamping
            u.x = Phaser.Math.Clamp(u.x, (u.body?.radius || 20) + SIDE_MARGIN, worldWidth - (u.body?.radius || 20) - SIDE_MARGIN);
            u.y = Phaser.Math.Clamp(u.y, (u.body?.radius || 20) + SIDE_MARGIN, worldHeight - (u.body?.radius || 20) - HUD_MARGIN);

            // ── Idle Bob 자동 제어 (적 유닛도 동일) ──
            if (u.body && u.startIdleBob) {
                const isMoving = u.body.speed > 5;
                const isBlocked = u.isAirborne || u.isKnockedBack || u.hp <= 0;

                if ((isMoving || isBlocked) && u._idleBobTween) {
                    u.stopIdleBob(false);
                } else if (!isMoving && !isBlocked && !u._idleBobTween) {
                    u.startIdleBob();
                }
            }
        });

        this.updateCameraFollow();

        if (this.stageManager) {
            this.stageManager.update(time, delta);
        }

        if (this.ambientMoteManager) {
            this.ambientMoteManager.update();
        }

        if (this.dynamicCamera) {
            this.dynamicCamera.update(time, delta);
        }

        // Check for victory/defeat
        const playersAlive = this.mercenaries.countActive(true);
        const enemiesAlive = this.enemies.countActive(true);

        if (playersAlive === 0 || enemiesAlive === 0) {
            this.handleBattleEnd(enemiesAlive === 0);
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

        // Add enemies to the focus calculation
        this.enemies.getChildren().forEach(enemy => {
            if (enemy.active && enemy.hp > 0) {
                totalX += enemy.x;
                totalY += enemy.y;
                count++;
            }
        });

        if (count > 0) {
            const avgX = totalX / count;
            const avgY = totalY / count;
            this.cameraTarget.setPosition(avgX, avgY);
        }
    }

    handleBattleEnd(isVictory) {
        this.isResetting = true;
        const resultText = isVictory ? "승리! 🏆" : "패배... 💀";
        const color = isVictory ? "#ffff00" : "#ff0000";

        EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[아레나] ${resultText} 3초 뒤 다음 전투가 시작됩니다.`);

        this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, resultText, {
            fontSize: '64px',
            fill: color,
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 8
        }).setOrigin(0.5).setDepth(2000).setScrollFactor(0).setAlpha(0).setAlpha(1);

        this.time.delayedCall(3000, () => {
            this.battleCount++;
            this.scene.restart();
        });
    }
}
