import Phaser from 'phaser';
import Warrior from '../modules/Player/Warrior.js';
import Archer from '../modules/Player/Archer.js';
import Healer from '../modules/Player/Healer.js';
import Wizard from '../modules/Player/Wizard.js';
import Bard from '../modules/Player/Bard.js';
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
import partyManager from '../modules/Core/PartyManager.js';

export default class RaidScene extends Phaser.Scene {
    constructor() {
        super('RaidScene');
        this.mercenaries = null;
        this.boss = null;
        this.isRespawning = false;
        this.raidCount = 1;
    }

    create() {
        console.log('RaidScene started');
        EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[레이드] 레이드가 시작되었습니다! 원정대 출격! 🏰`);

        // Background (Reuse Cursed Forest for Raid)
        const bg = this.add.image(0, 0, 'bg_cursed_forest').setOrigin(0, 0);
        const scaleX = this.cameras.main.width / bg.width;
        const scaleY = this.cameras.main.height / bg.height;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale).setScrollFactor(0);

        // Physics Groups
        this.mercenaries = this.physics.add.group();
        this.enemies = this.physics.add.group(); // Boss will be added here

        // World Bounds
        this.physics.world.setBounds(0, 0, this.cameras.main.width, this.cameras.main.height);

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

        // UI
        this.statusText = this.add.text(this.cameras.main.width / 2, 50, `레이드 단계 #${this.raidCount}`, {
            fontSize: '32px',
            fill: '#fff',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

        this.add.text(10, 10, 'ESC to Return to Territory', { fontSize: '16px', fill: '#fff' }).setScrollFactor(0).setDepth(1000);

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
    }

    spawnPlayers() {
        this.isStarting = true; // Block update until players are spawned
        const centerY = this.cameras.main.height / 2;
        const activeParty = partyManager.getActiveParty();

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
            } else if (charConfig.classId === 'archer') {
                unit = new Archer(this, x, y, playerLeader, charConfig);
            } else if (charConfig.classId === 'healer') {
                unit = new Healer(this, x, y, playerLeader, charConfig);
            } else if (charConfig.classId === 'wizard') {
                unit = new Wizard(this, x, y, playerLeader, charConfig);
            } else if (charConfig.classId === 'bard') {
                unit = new Bard(this, x, y, playerLeader, charConfig);
            }

            if (unit) this.mercenaries.add(unit);
        });

        // Trigger UI binding
        EventBus.emit(EventBus.EVENTS.PARTY_DEPLOYED, {
            mercenaries: this.mercenaries.getChildren().map(m => m.getState())
        });
    }

    spawnBoss() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Boss spawns on the right
        const bossX = this.cameras.main.width - 250;
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
            mercenaries: this.mercenaries.getChildren().map(m => m.getState())
        });
    }

    update(time, delta) {
        if (this.isUltimateActive || this.isStarting) return;

        if (this.buffManager) this.buffManager.update(time, delta);
        if (this.ccManager) this.ccManager.update(time, delta);
        if (this.shieldManager) this.shieldManager.update(time, delta);
        if (this.barkManager) this.barkManager.update(time, delta);

        const margin = 50;
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.mercenaries.getChildren().forEach(u => {
            u.update();
            u.setDepth(u.y);
            u.x = Phaser.Math.Clamp(u.x, margin, width - margin);
            u.y = Phaser.Math.Clamp(u.y, margin, height - margin);
        });

        if (this.boss && this.boss.active) {
            this.boss.update();
            this.boss.setDepth(this.boss.y);
            // Allow boss a bit more room due to large size
            const bossMargin = 100;
            this.boss.x = Phaser.Math.Clamp(this.boss.x, bossMargin, width - bossMargin);
            this.boss.y = Phaser.Math.Clamp(this.boss.y, bossMargin, height - bossMargin);
        } else if (!this.isRespawning && this.mercenaries.countActive(true) > 0) {
            this.handleBossDefeated();
        }

        // Check for total defeat
        if (this.mercenaries.countActive(true) === 0) {
            this.handlePlayerDefeat();
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
