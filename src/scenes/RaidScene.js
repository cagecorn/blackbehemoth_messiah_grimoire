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
import BossGoblin from '../modules/AI/BossGoblin.js';
import ProjectileManager from '../modules/Combat/ProjectileManager.js';
import ParticleManager from '../modules/Particles/ParticleManager.js';
import FXManager from '../modules/Combat/FXManager.js';
import UltimateManager from '../modules/Combat/UltimateManager.js';
import AoeManager from '../modules/Combat/AoeManager.js';
import CCManager from '../modules/Combat/CCManager.js';
import ShieldManager from '../modules/Combat/ShieldManager.js';
import BuffManager from '../modules/Core/BuffManager.js';
import SeparationManager from '../modules/Core/SeparationManager.js';
import BarkManager from '../modules/AI/BarkManager.js';
import { Characters } from '../modules/Core/EntityStats.js';
import EventBus from '../modules/Events/EventBus.js';
// partyManager will be accessed via this.game.partyManager
import StageManager from '../modules/Environment/StageManager.js';
import { StageConfigs } from '../modules/Core/EntityStats.js';
import AmbientMoteManager from '../modules/Environment/AmbientMoteManager.js';
import DynamicCameraManager from '../modules/Core/DynamicCameraManager.js';

export default class RaidScene extends Phaser.Scene {
    constructor() {
        super('RaidScene');
        this.mercenaries = null;
        this.boss = null;
        this.isRespawning = false;
        this.raidCount = 1;
    }

    init() {
        // Reset state on every entry
        this.raidCount = 1;
        this.isRespawning = false;
        this.isStarting = false;
        this.isUltimateActive = false;

        // Global Heal on Scene Entry
        const pm = this.game.partyManager;
        if (pm) pm.healAll();
    }

    create() {
        console.log('RaidScene started');
        EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[레이드] 레이드가 시작되었습니다! 원정대 출격! 🏰`);

        // Fixed Raid Dimensions (matching background asset 1536x1024)
        const worldWidth = 1536;
        const worldHeight = 1024;

        // Stage visual rendering
        this.stageManager = new StageManager(this, StageConfigs.RAID);
        this.stageManager.buildStage(worldWidth, worldHeight);


        // Physics Groups
        this.mercenaries = this.physics.add.group();
        this.enemies = this.physics.add.group(); // Boss will be added here

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
            console.log('[Raid] Skill FX Bloom Pipeline Active! ✨');
        }

        // UI
        this.statusText = this.add.text(this.cameras.main.width / 2, 50, `레이드 단계 #${this.raidCount}`, {
            fontSize: '32px',
            fill: '#fff',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);


        // Spawn Players
        this.spawnPlayers();

        // Spawn Boss
        this.spawnBoss();

        // ESC to return
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.start('TerritoryScene');
        });

        // Repulsion
        this.physics.add.overlap(this.mercenaries, this.mercenaries, (u1, u2) => {
            if (u1 !== u2) SeparationManager.applyRepulsion(u1, u2, 40);
        });
        this.physics.add.overlap(this.mercenaries, this.enemies, (u1, u2) => {
            SeparationManager.applyRepulsion(u1, u2, 80); // Stronger repulsion for boss
        });

        // ── 환경 부유 먼지 (3레이어 Parallax) ──
        this.ambientMoteManager = new AmbientMoteManager(this);
        console.log('[Raid] Dust Bokeh (AmbientMoteManager) initialized.');

        // Cleanup on scene shutdown
        this.events.once('shutdown', () => {
            if (this.ambientMoteManager) this.ambientMoteManager.destroy();
            console.log('[RaidScene] Cleaned up AmbientMotes.');
        });
    }

    spawnPlayers() {
        this.isStarting = true; // Block update until players are spawned
        const worldHeight = 1024;
        const centerY = worldHeight / 2;
        const activeParty = this.game.partyManager.getActiveParty();

        let playerLeader = null;
        activeParty.forEach((charId, i) => {
            if (!charId) return;

            const charConfig = Object.values(Characters).find(c => c.id === charId);
            if (!charConfig) return;

            const x = 150;
            const y = centerY - 150 + (i * 75);
            let unit;

            if (charConfig.classId === 'warrior') {
                unit = new Warrior(this, x, y, charConfig);
                if (!playerLeader) playerLeader = unit;
            } else if (charId === 'wrinkle' || charConfig.characterId === 'wrinkle') {
                unit = new Wrinkle(this, x, y, playerLeader, charConfig);
            } else if (charId === 'nickle' || charConfig.characterId === 'nickle') {
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
                if (charId === 'nana' || charConfig.characterId === 'nana') {
                    unit = new Nana(this, x, y, playerLeader, charConfig);
                } else {
                    unit = new Bard(this, x, y, playerLeader, charConfig);
                }
            }

            if (unit) this.mercenaries.add(unit);
        });

        // Initialize Camera Target (follows centroid of party)
        this.cameraTarget = this.add.container(150, centerY);

        // Initialize Dynamic Camera Manager
        this.dynamicCamera = new DynamicCameraManager(this, this.cameras.main);
        this.dynamicCamera.setTarget(this.cameraTarget);
        console.log('[Raid] Dynamic Shake Camera (DynamicCameraManager) initialized.');

        // Trigger UI binding
        EventBus.emit(EventBus.EVENTS.PARTY_DEPLOYED, {
            scene: this,
            mercenaries: this.mercenaries.getChildren().map(m => m.getState())
        });
    }

    spawnBoss() {
        const worldWidth = 1536;
        const worldHeight = 1024;
        const centerX = worldWidth / 2;
        const centerY = worldHeight / 2;

        // Boss spawns on the right
        const bossX = worldWidth - 250;
        const bossY = centerY;

        const playerLeader = this.mercenaries.getChildren().find(u => u.className === 'warrior');
        this.boss = new BossGoblin(this, bossX, bossY, playerLeader);
        this.enemies.add(this.boss);

        console.log(`[Raid] Boss spawned at stage ${this.raidCount}. HP: ${this.boss.hp}`);
        this.isRespawning = false;
        this.isStarting = false; // Flag to indicate spawning is done
        EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[레이드] 대왕 고블린이 나타났습니다! 👺`);

        // Trigger UI binding
        EventBus.emit(EventBus.EVENTS.PARTY_DEPLOYED, {
            scene: this,
            mercenaries: this.mercenaries.getChildren().map(m => m.getState())
        });
    }

    update(time, delta) {
        if (this.isUltimateActive || this.isStarting) return;

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

            // Strict Boundary Clamping
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

        if (this.boss && this.boss.active) {
            this.boss.update();
            this.boss.setDepth(this.boss.y);

            // Strict Boundary Clamping (factoring in larger boss size)
            const bossRadius = this.boss.body?.radius || 40;
            this.boss.x = Phaser.Math.Clamp(this.boss.x, bossRadius + SIDE_MARGIN, worldWidth - bossRadius - SIDE_MARGIN);
            this.boss.y = Phaser.Math.Clamp(this.boss.y, bossRadius + SIDE_MARGIN, worldHeight - bossRadius - HUD_MARGIN);

            // ── Idle Bob 자동 제어 (보스 유닛도 동일하게 체크할 수 있음) ──
            if (this.boss.body && this.boss.startIdleBob) {
                const isMoving = this.boss.body.speed > 5;
                const isBlocked = this.boss.isAirborne || this.boss.isKnockedBack || this.boss.hp <= 0;

                if ((isMoving || isBlocked) && this.boss._idleBobTween) {
                    this.boss.stopIdleBob(false);
                } else if (!isMoving && !isBlocked && !this.boss._idleBobTween) {
                    this.boss.startIdleBob();
                }
            }
        } else if (!this.isRespawning && this.mercenaries.countActive(true) > 0) {
            this.handleBossDefeated();
        }

        // Check for total defeat
        if (this.mercenaries.countActive(true) === 0) {
            this.handlePlayerDefeat();
        }

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
            this.cameraTarget.setPosition(avgX, avgY);
        }
    }

    handleBossDefeated() {
        this.isRespawning = true;
        console.log(`[Raid] Boss defeated at stage ${this.raidCount}.`);
        this.raidCount++;
        EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[레이드] 보스 처치 완료! 5초 뒤 더 강력한 보스가 나타납니다. ⏳`);

        this.time.delayedCall(5000, () => {
            this.spawnBoss();
            if (this.statusText) {
                this.statusText.setText(`레이드 단계 #${this.raidCount}`);
            }
        });
    }

    handlePlayerDefeat() {
        EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[레이드] 원정대가 전멸했습니다... 영지로 귀환합니다. 💀`);
        this.time.delayedCall(3000, () => {
            this.scene.start('TerritoryScene');
        });
    }
}
