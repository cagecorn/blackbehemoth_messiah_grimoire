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
import Wrinkle from '../modules/Player/Wrinkle.js';
import Veve from '../modules/Player/Veve.js';
import ProjectileManager from '../modules/Combat/ProjectileManager.js';
import ParticleManager from '../modules/Particles/ParticleManager.js';
import FXManager from '../modules/Combat/FXManager.js';
import AoeManager from '../modules/Combat/AoeManager.js';
import CCManager from '../modules/Combat/CCManager.js';
import ShieldManager from '../modules/Combat/ShieldManager.js';
import UltimateManager from '../modules/Combat/UltimateManager.js';
import BuffManager from '../modules/Core/BuffManager.js';
import SeparationManager from '../modules/Core/SeparationManager.js';
import BarkManager from '../modules/AI/BarkManager.js';
import { Characters } from '../modules/Core/EntityStats.js';
// partyManager will be accessed via this.game.partyManager
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
        // Reset state on every entry
        this.gameState = 'BATTLE';
        this.isResetting = false;
        this.battleCount = 1;
        this.isUltimateActive = false;

        // Global Heal on Scene Entry
        if (this.game.partyManager) this.game.partyManager.healAll();

        // 1. Reset particle pools to avoid "sys" TypeErrors from dead objects
        this.resParticlePool = [];
        this.messiahTextPool = [];
    }

    create() {
        if (this.game.uiManager) {
            this.game.uiManager.scene = this;
        }
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
        this.ultimateManager = new UltimateManager(this);
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
        if (this.game.uiManager) {
            this.game.uiManager.updateRoundDisplay(`ARENA BATTLE #${this.battleCount}`);
        }

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
            if (this.game.uiManager) this.game.uiManager.updateRoundDisplay(null);
            console.log('[ArenaScene] Cleaned up AmbientMotes and HUD.');
        });

        // Messiah Pools
        this.messiahTextPool = [];
        this.messiahParticlePool = this.physics.add.group({
            classType: Phaser.GameObjects.Arc,
            maxSize: 50,
            runChildUpdate: false
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
        const activeParty = this.game.partyManager.getActiveParty();

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
        const avgLevel = this.game.partyManager.getAveragePartyLevel();
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

        if (this.game.uiManager) {
            this.game.uiManager.updateRoundDisplay(`ARENA BATTLE #${this.battleCount}`);
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
        } else if (config.id === 'wrinkle' || config.characterId === 'wrinkle') {
            unit = new Wrinkle(this, x, y, leader, finalConfig);
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
            } else if (config.id === 'veve' || config.characterId === 'veve') {
                unit = new Veve(this, x, y, leader, finalConfig);
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

        // Auto Messiah Touch (Disabled in Arena)
        // this.executeAutoMessiahTouch();

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
        if (!this.mercenaries || !this.enemies || !this.cameraTarget || !this.dynamicCamera) return;

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let count = 0;

        const allUnits = [...this.mercenaries.getChildren(), ...this.enemies.getChildren()];

        allUnits.forEach(u => {
            if (u.active && u.hp > 0) {
                minX = Math.min(minX, u.x);
                maxX = Math.max(maxX, u.x);
                minY = Math.min(minY, u.y);
                maxY = Math.max(maxY, u.y);
                count++;
            }
        });

        if (count > 0) {
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            this.cameraTarget.setPosition(centerX, centerY);

            // Dynamic Zoom calculation to fit all 12 units
            const width = maxX - minX + 200; // Add padding
            const height = maxY - minY + 200;
            const zoomX = this.cameras.main.width / width;
            const zoomY = this.cameras.main.height / height;

            // Aim for a zoom that fits the bounding box, but clamp it between reasonable values
            let targetZoom = Math.min(zoomX, zoomY);
            targetZoom = Phaser.Math.Clamp(targetZoom, 0.5, 1.2);

            if (this.dynamicCamera.targetZoom !== targetZoom) {
                console.log(`[Arena] Camera Update: Center(${centerX.toFixed(0)}, ${centerY.toFixed(0)}) Zoom: ${targetZoom.toFixed(2)} Units: ${count}`);
            }

            this.dynamicCamera.targetZoom = targetZoom;
        } else {
            console.warn('[Arena] No active units for camera follow!');
        }
    }

    handleBattleEnd(isVictory) {
        this.isResetting = true;
        const resultText = isVictory ? "승리! 🏆" : "패배... 💀";
        const color = isVictory ? "#ffff00" : "#ff0000";

        EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[아레나] ${resultText} 3초 뒤 다음 전투가 시작됩니다.`);

        if (this.game.uiManager) {
            this.game.uiManager.showSplashMessage(resultText, color);
        }

        this.time.delayedCall(3000, () => {
            this.battleCount++;
            this.scene.restart();
        });
    }


    handleMessiahTouch(pointer) {
        if (!this.game.messiahManager) return;
        const mm = this.game.messiahManager;
        const power = mm.getActivePower();
        if (!power) return;

        let target = null;
        let searchRadius = 80;

        if (power.type === 'OFFENSE') {
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
            if (mm.consumeStack()) {
                this.showMessiahPowerEffect(target.x, target.y - 20, power, target);
                const stats = mm.getStats();
                if (power.type === 'OFFENSE') {
                    const damage = stats.atk * 1.5;
                    target.takeDamage(damage, null, false);
                } else if (power.type === 'DEFENSE') {
                    const heal = stats.mAtk * 1.5;
                    if (target.heal) target.heal(heal, null);
                } else if (power.type === 'SUPPORT') {
                    const buffAmount = stats.mAtk * 0.5;
                    target.bonusAtk += buffAmount;
                    target.bonusMAtk += buffAmount;
                    target.messiahEncouragementAmount = buffAmount;
                    this.time.delayedCall(3000, () => {
                        target.bonusAtk -= buffAmount;
                        target.bonusMAtk -= buffAmount;
                        target.messiahEncouragementAmount = 0;
                    });
                }
            } else {
                if (this.game.uiManager) this.game.uiManager.showToast('권능 스택이 부족합니다!');
            }
        }
    }

    showMessiahPowerEffect(x, y, power, target) {
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

        str.setText(power.emoji);
        str.setPosition(x, y - 60);
        str.setAlpha(1);
        str.setScale(1);
        str.setVisible(true);

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
                if (target && target.sprite) {
                    target.sprite.setTintFill(power.type === 'OFFENSE' ? 0xff0000 : 0xffffe0);
                    this.time.delayedCall(150, () => {
                        if (target && target.sprite && target.sprite.active) target.sprite.clearTint();
                    });
                }

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
        // Disabled in Arena for 정정당당한 대결 컨셉
        return;
    }
}
