import Phaser from 'phaser';
import DungeonManager from '../modules/Dungeon/DungeonManager.js';
import Warrior from '../modules/Player/Warrior.js';
import Goblin from '../modules/AI/Goblin.js';
import MonsterHealer from '../modules/AI/MonsterHealer.js';
import Archer from '../modules/Player/Archer.js';
import Healer from '../modules/Player/Healer.js';
import Wizard from '../modules/Player/Wizard.js';
import Bard from '../modules/Player/Bard.js';
import ProjectileManager from '../modules/Combat/ProjectileManager.js';
import ParticleManager from '../modules/Particles/ParticleManager.js';
import FXManager from '../modules/Combat/FXManager.js';
import AoeManager from '../modules/Combat/AoeManager.js';
import LootManager from '../modules/Loot/LootManager.js';
import { MercenaryClasses, MonsterClasses, StageConfigs } from '../modules/Core/EntityStats.js';
import SeparationManager from '../modules/Core/SeparationManager.js';
import BuffManager from '../modules/Core/BuffManager.js';
import StageManager from '../modules/Environment/StageManager.js';

export default class DungeonScene extends Phaser.Scene {
    constructor() {
        super('DungeonScene');
        this.dungeonManager = null;
        this.lootManager = null;
        this.player = null; // Leader focus
        this.mercenaries = null;
        this.enemies = null;
    }

    create() {
        console.log('DungeonScene started');
        this.cameras.main.setBackgroundColor('#2d2d2d');

        // Initialize Managers
        this.dungeonManager = new DungeonManager(this);
        this.dungeonManager.generateDungeon();

        // Stage visual rendering
        const worldSize = 50 * 32;
        this.stageManager = new StageManager(this, StageConfigs.CURSED_FOREST);
        this.stageManager.buildStage(worldSize, worldSize);

        // ★ Set world & camera bounds BEFORE spawning units
        // so that setCollideWorldBounds(true) in constructors uses the correct dungeon size.
        this.cameras.main.setBounds(0, 0, worldSize, worldSize);
        this.physics.world.setBounds(0, 0, worldSize, worldSize);

        this.fxManager = new FXManager(this);
        this.aoeManager = new AoeManager(this);
        this.lootManager = new LootManager(this);
        this.projectileManager = new ProjectileManager(this);
        this.particleManager = new ParticleManager(this);
        this.buffManager = new BuffManager(this);

        // Physics Groups
        this.mercenaries = this.physics.add.group();
        this.enemies = this.physics.add.group();

        // Spawn Warrior (Leader)
        const startPos = this.dungeonManager.getPlayerStartPosition();
        const warriorConfig = MercenaryClasses.WARRIOR;
        this.player = new Warrior(this, startPos.x + warriorConfig.spawnOffset.x, startPos.y + warriorConfig.spawnOffset.y);
        this.mercenaries.add(this.player);

        // Spawn Archer
        const archerConfig = MercenaryClasses.ARCHER;
        this.archer = new Archer(this, startPos.x - 40, startPos.y, this.player);
        this.mercenaries.add(this.archer);

        // Spawn Healer
        const healerConfig = MercenaryClasses.HEALER;
        this.healer = new Healer(this, startPos.x - 80, startPos.y, this.player);
        this.mercenaries.add(this.healer);

        // Spawn Wizard
        const wizardConfig = MercenaryClasses.WIZARD;
        this.wizard = new Wizard(this, startPos.x - 120, startPos.y, this.player);
        this.mercenaries.add(this.wizard);

        // Spawn Bard
        const bardConfig = MercenaryClasses.BARD;
        this.bard = new Bard(this, startPos.x - 160, startPos.y, this.player);
        this.mercenaries.add(this.bard);

        // Spawn Goblins (12 units for longer testing)
        const goblinConfig = MonsterClasses.GOBLIN;
        for (let i = 0; i < 12; i++) {
            const offsetX = (i % 4) * 60;
            const offsetY = Math.floor(i / 4) * 60;
            const goblin = new Goblin(this, startPos.x + 150 + offsetX, startPos.y + offsetY - 80, this.player);
            this.enemies.add(goblin);
        }

        // Spawn 2 Shamans
        const shamanConfig = MonsterClasses.SHAMAN;
        for (let i = 0; i < 2; i++) {
            const shaman = new MonsterHealer(this, startPos.x + 200 + (i * 80), startPos.y + 120, shamanConfig, this.player);
            this.enemies.add(shaman);
        }

        // Setup Camera to follow player
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // Return to Territory
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.start('TerritoryScene');
        });

        this.add.text(10, 10, 'WASD to Move, ESC to Return', { fontSize: '16px', fill: '#fff' }).setScrollFactor(0).setDepth(100);

        // 1. Mercenaries collect Loot
        this.physics.add.overlap(this.mercenaries, this.lootManager.lootGroup, (mercenary, item) => {
            this.lootManager.collectLoot(mercenary, item);
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
    }

    update(time, delta) {
        if (this.buffManager) {
            this.buffManager.update(time, delta);
        }

        if (this.mercenaries) {
            this.mercenaries.getChildren().forEach(mercenary => {
                mercenary.update();
                mercenary.setDepth(mercenary.y);
                this.clampToCamera(mercenary);
            });
        }

        if (this.enemies) {
            this.enemies.getChildren().forEach(enemy => {
                enemy.update();
                enemy.setDepth(enemy.y);
                this.clampToCamera(enemy);
            });
        }
    }

    clampToCamera(unit) {
        if (!unit.active || !unit.body) return;
        const cam = this.cameras.main.worldView;
        const buffer = 16; // Small padding to keep them fully on-screen

        // If camera hasn't fully initialized its dimensions, skip
        if (cam.width === 0 || cam.height === 0) return;

        if (unit.x < cam.left + buffer) {
            unit.x = cam.left + buffer;
            if (unit.body.velocity.x < 0) unit.body.velocity.x = 0;
        } else if (unit.x > cam.right - buffer) {
            unit.x = cam.right - buffer;
            if (unit.body.velocity.x > 0) unit.body.velocity.x = 0;
        }

        if (unit.y < cam.top + buffer) {
            unit.y = cam.top + buffer;
            if (unit.body.velocity.y < 0) unit.body.velocity.y = 0;
        } else if (unit.y > cam.bottom - buffer) {
            unit.y = cam.bottom - buffer;
            if (unit.body.velocity.y > 0) unit.body.velocity.y = 0;
        }
    }
}
