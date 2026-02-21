import Phaser from 'phaser';
import Warrior from '../modules/Player/Warrior.js';
import Archer from '../modules/Player/Archer.js';
import Healer from '../modules/Player/Healer.js';
import Wizard from '../modules/Player/Wizard.js';
import Bard from '../modules/Player/Bard.js';
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

export default class ArenaScene extends Phaser.Scene {
    constructor() {
        super('ArenaScene');
        this.mercenaries = null;
        this.enemies = null;
        this.isResetting = false;
        this.battleCount = 1;
    }

    create() {
        console.log('ArenaScene started');

        // Background
        const bg = this.add.image(0, 0, 'bg_arena').setOrigin(0, 0);
        const scaleX = this.cameras.main.width / bg.width;
        const scaleY = this.cameras.main.height / bg.height;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale).setScrollFactor(0);

        // Physics Groups
        this.mercenaries = this.physics.add.group();
        this.enemies = this.physics.add.group();

        // 맵 화면 밖으로 나가지 못하게 월드 경계 설정 (현재 카메라 크기 기준)
        this.physics.world.setBounds(0, 0, this.cameras.main.width, this.cameras.main.height);

        // Initialize Managers
        this.fxManager = new FXManager(this);
        this.aoeManager = new AoeManager(this);
        this.projectileManager = new ProjectileManager(this);
        this.particleManager = new ParticleManager(this);
        this.buffManager = new BuffManager(this);
        this.ccManager = new CCManager(this);
        this.shieldManager = new ShieldManager(this);
        this.barkManager = new BarkManager(this);

        // UI (Create statusText before startNewBattle so it can be updated safely)
        this.statusText = this.add.text(this.cameras.main.width / 2, 50, `아레나 배틀 #${this.battleCount}`, {
            fontSize: '32px',
            fill: '#fff',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

        this.add.text(10, 10, 'ESC to Return to Territory', { fontSize: '16px', fill: '#fff' }).setScrollFactor(0).setDepth(1000);

        // Spawn Players and initial Enemies
        this.startNewBattle();

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
    }

    startNewBattle() {
        this.isResetting = false;
        this.mercenaries.clear(true, true);
        this.enemies.clear(true, true);

        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // 1. Spawn Player Party (5 members)
        const playerConfigs = [
            Characters.AREN,
            Characters.ELLA,
            Characters.SERA,
            Characters.MERLIN,
            Characters.LUTE
        ];

        let playerLeader = null;
        playerConfigs.forEach((config, i) => {
            const x = centerX - 200;
            const y = centerY - 150 + (i * 75);
            let unit;

            if (config.id === 'aren') {
                unit = new Warrior(this, x, y, config);
                playerLeader = unit;
            } else if (config.id === 'ella') {
                unit = new Archer(this, x, y, playerLeader, config);
            } else if (config.id === 'sera') {
                unit = new Healer(this, x, y, playerLeader, config);
            } else if (config.id === 'merlin') {
                unit = new Wizard(this, x, y, playerLeader, config);
            } else if (config.id === 'lute') {
                unit = new Bard(this, x, y, playerLeader, config);
            }

            if (unit) this.mercenaries.add(unit);
        });

        // 2. Spawn Unique Random Enemy Party (5 members)
        const avgLevel = partyManager.getAveragePartyLevel();
        const availableCharacters = [...Object.values(Characters)];
        Phaser.Utils.Array.Shuffle(availableCharacters);

        let enemyLeader = null;
        for (let i = 0; i < 5; i++) {
            const randomChar = availableCharacters[i % availableCharacters.length];
            const x = centerX + 200;
            const y = centerY - 150 + (i * 75);

            const enemyConfig = {
                ...randomChar,
                id: randomChar.id + '_enemy_' + i,
                name: `적 ${randomChar.name}`,
                level: avgLevel,
                team: 'enemy'
            };

            let unit;
            const classId = randomChar.classId || 'warrior';

            if (classId === 'warrior') {
                unit = new Warrior(this, x, y, enemyConfig);
                if (!enemyLeader) enemyLeader = unit;
            } else if (classId === 'archer') {
                unit = new Archer(this, x, y, enemyLeader, enemyConfig);
            } else if (classId === 'healer') {
                unit = new Healer(this, x, y, enemyLeader, enemyConfig);
            } else if (classId === 'wizard') {
                unit = new Wizard(this, x, y, enemyLeader, enemyConfig);
            } else if (classId === 'bard') {
                unit = new Bard(this, x, y, enemyLeader, enemyConfig);
            }

            if (unit) this.enemies.add(unit);
        }

        if (this.statusText) {
            this.statusText.setText(`아레나 배틀 #${this.battleCount}`);
        }
    }

    update(time, delta) {
        if (this.isResetting) return;

        if (this.buffManager) this.buffManager.update(time, delta);
        if (this.ccManager) this.ccManager.update(time, delta);
        if (this.shieldManager) this.shieldManager.update(time, delta);
        if (this.barkManager) this.barkManager.update(time, delta);

        const margin = 40;
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.mercenaries.getChildren().forEach(u => {
            u.update();
            u.setDepth(u.y); // 발밑 그림자 및 레이어링 해결

            // 맵 밖으로 나가지 않도록 강제 클램핑 (SeparationManager 등의 Nudge 방지)
            u.x = Phaser.Math.Clamp(u.x, margin, width - margin);
            u.y = Phaser.Math.Clamp(u.y, margin, height - margin);
        });
        this.enemies.getChildren().forEach(u => {
            u.update();
            u.setDepth(u.y); // 발밑 그림자 및 레이어링 해결

            // 맵 밖으로 나가지 않도록 강제 클램핑
            u.x = Phaser.Math.Clamp(u.x, margin, width - margin);
            u.y = Phaser.Math.Clamp(u.y, margin, height - margin);
        });

        // Check for victory/defeat
        const playersAlive = this.mercenaries.countActive(true);
        const enemiesAlive = this.enemies.countActive(true);

        if (playersAlive === 0 || enemiesAlive === 0) {
            this.handleBattleEnd(enemiesAlive === 0);
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
        }).setOrigin(0.5).setDepth(2000).setAlpha(0).setAlpha(1);

        this.time.delayedCall(3000, () => {
            this.battleCount++;
            this.scene.restart();
        });
    }
}
