import Phaser from 'phaser';
import DungeonManager from '../modules/Dungeon/DungeonManager.js';
import Warrior from '../modules/Player/Warrior.js';
import Goblin from '../modules/AI/Goblin.js';
import MonsterHealer from '../modules/AI/MonsterHealer.js';
import Archer from '../modules/Player/Archer.js';
import Healer from '../modules/Player/Healer.js';
import ProjectileManager from '../modules/Combat/ProjectileManager.js';
import ParticleManager from '../modules/Particles/ParticleManager.js';
import CombatManager from '../modules/Combat/CombatManager.js';
import FXManager from '../modules/Combat/FXManager.js';
import LootManager from '../modules/Loot/LootManager.js';
import { MercenaryClasses, MonsterClasses } from '../modules/Core/EntityStats.js';
import SeparationManager from '../modules/Core/SeparationManager.js';

export default class DungeonScene extends Phaser.Scene {
    constructor() {
        super('DungeonScene');
        this.dungeonManager = null;
        this.combatManager = null;
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
        this.combatManager = new CombatManager(this);
        this.fxManager = new FXManager(this);
        this.lootManager = new LootManager(this);
        this.projectileManager = new ProjectileManager(this);
        this.particleManager = new ParticleManager(this);

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

        // Spawn Goblins (4 units for testing) + 1 Shaman
        const goblinConfig = MonsterClasses.GOBLIN;
        for (let i = 0; i < 4; i++) {
            const offsetX = (i % 3) * 60;
            const offsetY = Math.floor(i / 3) * 60;
            const goblin = new Goblin(this, startPos.x + 150 + offsetX, startPos.y + offsetY - 60, this.player);
            this.enemies.add(goblin);
        }

        // Spawn 1 Shaman
        const shamanConfig = MonsterClasses.SHAMAN;
        const shaman = new MonsterHealer(this, startPos.x + 250, startPos.y + 50, shamanConfig, this.player);
        this.enemies.add(shaman);

        // Setup Camera to follow player
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // Match bounds to dungeon size (50x50 tiles @ 32px)
        const worldSize = 50 * 32;
        this.cameras.main.setBounds(0, 0, worldSize, worldSize);
        this.physics.world.setBounds(0, 0, worldSize, worldSize);

        // Return to Territory
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.start('TerritoryScene');
        });

        this.add.text(10, 10, 'WASD to Move, ESC to Return', { fontSize: '16px', fill: '#fff' }).setScrollFactor(0).setDepth(100);

        // 1. Mercenaries collect Loot
        this.physics.add.overlap(this.mercenaries, this.lootManager.lootGroup, (mercenary, item) => {
            this.lootManager.collectLoot(mercenary, item);
        });

        // 2. Battle Initiation
        this.physics.add.overlap(this.mercenaries, this.enemies, (mercenary, enemy) => {
            if (this.combatManager.activeBattles.has(enemy.id)) return;
            if (enemy.hp <= 0) return;
            this.combatManager.initiateBattle(this.mercenaries.getChildren(), enemy);
        });

        // 3. Unit Separation (Repulsion Logic to prevent stacking/spinning)
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
        if (this.mercenaries) {
            this.mercenaries.getChildren().forEach(mercenary => {
                mercenary.update();
                mercenary.setDepth(mercenary.y);
            });
        }

        if (this.enemies) {
            this.enemies.getChildren().forEach(enemy => {
                enemy.update();
                enemy.setDepth(enemy.y);
            });
        }
    }
}
