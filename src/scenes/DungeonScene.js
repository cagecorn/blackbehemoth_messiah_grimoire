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
import CCManager from '../modules/Combat/CCManager.js';
import ShieldManager from '../modules/Combat/ShieldManager.js';
import LootManager from '../modules/Loot/LootManager.js';
import { MercenaryClasses, MonsterClasses, StageConfigs, Characters } from '../modules/Core/EntityStats.js';
import SeparationManager from '../modules/Core/SeparationManager.js';
import BuffManager from '../modules/Core/BuffManager.js';
import StageManager from '../modules/Environment/StageManager.js';
import EventBus from '../modules/Events/EventBus.js';
import BarkManager from '../modules/AI/BarkManager.js';

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
        this.ccManager = new CCManager(this);
        this.shieldManager = new ShieldManager(this);
        this.barkManager = new BarkManager(this);

        // Physics Groups
        this.mercenaries = this.physics.add.group();
        this.enemies = this.physics.add.group();

        // Spawn Warrior (Leader) -> Aren
        const startPos = this.dungeonManager.getPlayerStartPosition();
        const warriorConfig = Characters.AREN;
        this.player = new Warrior(this, startPos.x, startPos.y, warriorConfig);
        this.mercenaries.add(this.player);

        // Spawn Archer -> Ella
        const archerConfig = Characters.ELLA;
        this.archer = new Archer(this, startPos.x - 40, startPos.y, this.player, archerConfig);
        this.mercenaries.add(this.archer);

        // Spawn Healer -> Sera
        const healerConfig = Characters.SERA;
        this.healer = new Healer(this, startPos.x - 80, startPos.y, this.player, healerConfig);
        this.mercenaries.add(this.healer);

        // Spawn Wizard -> Merlin
        const wizardConfig = Characters.MERLIN;
        this.wizard = new Wizard(this, startPos.x - 120, startPos.y, this.player, wizardConfig);
        this.mercenaries.add(this.wizard);

        // Spawn Bard -> Lute
        const bardConfig = Characters.LUTE;
        this.bard = new Bard(this, startPos.x - 160, startPos.y, this.player, bardConfig);
        this.mercenaries.add(this.bard);

        // First wave of monsters
        this.spawnWave();

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

        // Listen for Character Swap
        EventBus.on(EventBus.EVENTS.DEBUG_SWAP_CHARACTER, this.handleDebugSwap, this);

        // Sync UI with initial character names after a short delay to ensure UI is ready
        this.time.delayedCall(500, () => {
            EventBus.emit(EventBus.EVENTS.DEBUG_SWAP_CHARACTER, { classId: 'warrior', characterId: 'aren' });
            EventBus.emit(EventBus.EVENTS.DEBUG_SWAP_CHARACTER, { classId: 'archer', characterId: 'ella' });
            EventBus.emit(EventBus.EVENTS.DEBUG_SWAP_CHARACTER, { classId: 'healer', characterId: 'sera' });
            EventBus.emit(EventBus.EVENTS.DEBUG_SWAP_CHARACTER, { classId: 'wizard', characterId: 'merlin' });
            EventBus.emit(EventBus.EVENTS.DEBUG_SWAP_CHARACTER, { classId: 'bard', characterId: 'lute' });
        });
    }

    handleDebugSwap(payload) {
        const { classId, characterId } = payload;

        // Find existing unit
        const existingUnit = this.mercenaries.getChildren().find(m => m.className === classId);
        if (!existingUnit) {
            console.warn(`[DebugSwap] Could not find existing unit for class: ${classId}. Available:`, this.mercenaries.getChildren().map(m => m.className));
            return;
        }

        if (existingUnit.characterId === characterId) {
            console.log(`[DebugSwap] ${existingUnit.unitName} is already ${characterId}. Skipping re-spawn.`);
            return;
        }

        console.log(`[DebugSwap] Swapping ${existingUnit.unitName} (${classId}) -> ${characterId}`);

        // Remember position
        const x = existingUnit.x;
        const y = existingUnit.y;

        // Get new config
        const newConfig = Object.values(Characters).find(c => c.id === characterId);
        if (!newConfig) return;

        // Destroy old
        existingUnit.destroy();

        // Spawn new
        let newUnit = null;
        if (classId === 'warrior') {
            newUnit = new Warrior(this, x, y, newConfig);
            this.player = newUnit; // update leader ref
            this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

            // Update all others' warrior ref
            this.mercenaries.getChildren().forEach(m => {
                if (m !== newUnit) m.warrior = newUnit;
            });
        } else if (classId === 'archer') {
            newUnit = new Archer(this, x, y, this.player, newConfig);
            this.archer = newUnit;
        } else if (classId === 'healer') {
            newUnit = new Healer(this, x, y, this.player, newConfig);
            this.healer = newUnit;
        } else if (classId === 'wizard') {
            newUnit = new Wizard(this, x, y, this.player, newConfig);
            this.wizard = newUnit;
        } else if (classId === 'bard') {
            newUnit = new Bard(this, x, y, this.player, newConfig);
            this.bard = newUnit;
        }

        if (newUnit) {
            this.mercenaries.add(newUnit);
            EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[디버그] ${classId} 역할이 [${newConfig.name}](으)로 교체되었습니다. 🔄`);
        }
    }

    update(time, delta) {
        if (this.enemies && this.enemies.countActive(true) === 0 && !this.isResting) {
            this.isResting = true;
            EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[시스템] 라운드 ${this.currentRound} 클리어! 5초 뒤 다음 라운드가 시작됩니다. ⛺`);

            this.time.delayedCall(5000, () => {
                this.currentRound++;
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

    spawnWave() {
        const startPos = this.dungeonManager.getPlayerStartPosition();

        // Spawn Goblins (Base 12 + 2 per round)
        const goblinConfig = MonsterClasses.GOBLIN;
        const goblinCount = 12 + (this.currentRound - 1) * 2;
        for (let i = 0; i < goblinCount; i++) {
            const offsetX = (i % 4) * 60;
            const offsetY = Math.floor(i / 4) * 60;
            const goblin = new Goblin(this, startPos.x + 150 + offsetX, startPos.y + offsetY - 80, this.player);
            this.enemies.add(goblin);
        }

        // Spawn Shamans (Base 2 + 1 every 2 rounds)
        const shamanConfig = MonsterClasses.SHAMAN;
        const shamanCount = 2 + Math.floor((this.currentRound - 1) / 2);
        for (let i = 0; i < shamanCount; i++) {
            const shaman = new MonsterHealer(this, startPos.x + 200 + (i * 80), startPos.y + 120, shamanConfig, this.player);
            this.enemies.add(shaman);
        }

        if (this.currentRound > 1) {
            EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[시스템] 몬스터들이 증원되었습니다! (라운드 ${this.currentRound}) ⚔️`);
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
