import Phaser from 'phaser';
import DungeonManager from '../modules/Dungeon/DungeonManager.js';
import Warrior from '../modules/Player/Warrior.js';
import Goblin from '../modules/AI/Goblin.js';
import Orc from '../modules/AI/Orc.js';
import MonsterHealer from '../modules/AI/MonsterHealer.js';
import Archer from '../modules/Player/Archer.js';
import Healer from '../modules/Player/Healer.js';
import Wizard from '../modules/Player/Wizard.js';
import Bao from '../modules/Player/Bao.js';
import Bard from '../modules/Player/Bard.js';
import Nana from '../modules/Player/Nana.js';
import Nickle from '../modules/Player/Nickle.js';
import Noah from '../modules/Player/Noah.js';
import Noel from '../modules/Player/Noel.js';
import ProjectileManager from '../modules/Combat/ProjectileManager.js';
import ParticleManager from '../modules/Particles/ParticleManager.js';
import FXManager from '../modules/Combat/FXManager.js';
import UltimateManager from '../modules/Combat/UltimateManager.js';
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
import partyManager from '../modules/Core/PartyManager.js';

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

        // Reward values
        this.killExp = 25;
        this.roundClearExp = 500;
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

        // Listen for Character Swap
        this.handleDebugSwapListener = this.handleDebugSwap.bind(this);
        EventBus.on(EventBus.EVENTS.DEBUG_SWAP_CHARACTER, this.handleDebugSwapListener);

        // Global Combat Events for Rewards - Store as reference for cleanup
        this.handleMonsterKilledListener = (payload) => {
            // Distribute EXP to all active mercenaries
            if (this.mercenaries && this.mercenaries.active) {
                this.mercenaries.getChildren().forEach(merc => {
                    if (merc.active && merc.hp > 0) {
                        merc.addExp(this.killExp);
                    }
                });
            }
        };
        EventBus.on(EventBus.EVENTS.MONSTER_KILLED, this.handleMonsterKilledListener);

        // Cleanup on scene shutdown
        this.events.once('shutdown', () => {
            EventBus.off(EventBus.EVENTS.DEBUG_SWAP_CHARACTER, this.handleDebugSwapListener);
            EventBus.off(EventBus.EVENTS.MONSTER_KILLED, this.handleMonsterKilledListener);
            console.log('[DungeonScene] Cleaned up EventBus listeners');
        });

        // Spawn Party from PartyManager
        const activeParty = partyManager.getActiveParty();
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
            } else if (charId === 'nickle') {
                unit = new Nickle(this, x, y, playerLeader, charConfig);
            } else if (charConfig.classId === 'archer') {
                unit = new Archer(this, x, y, playerLeader, charConfig);
            } else if (charConfig.classId === 'healer') {
                unit = new Healer(this, x, y, playerLeader, charConfig);
            } else if (charConfig.classId === 'wizard') {
                if (charId === 'bao') {
                    unit = new Bao(this, x, y, playerLeader, charConfig);
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
        this.cameras.main.startFollow(this.cameraTarget, true, 0.1, 0.1);

        // If no leader was found (e.g. no warrior selected), just pick the first one
        if (!this.player && this.mercenaries.countActive(true) > 0) {
            this.player = this.mercenaries.getChildren()[0];
        }

        // First wave of monsters (Now that player is spawned)
        this.spawnWave();

        // Sync UI after spawn
        this.time.delayedCall(500, () => {
            EventBus.emit(EventBus.EVENTS.PARTY_DEPLOYED, {
                mercenaries: this.mercenaries.getChildren()
                    .filter(m => !m.config.hideInUI)
                    .map(m => m.getState())
            });
        });

        // ESC to return
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

        // Sync UI with initial character names after a short delay to ensure UI is ready
        this.time.delayedCall(500, () => {
            // We no longer trigger hardcoded debug swaps here
        });

        EventBus.on(EventBus.EVENTS.DEBUG_SWAP_CHARACTER, this.handleDebugSwap, this);
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
        } else if (characterId === 'nickle') {
            newUnit = new Nickle(this, x, y, this.player, config);
        } else if (classId === 'archer') {
            newUnit = new Archer(this, x, y, this.player, config);
        } else if (classId === 'healer') {
            newUnit = new Healer(this, x, y, this.player, config);
        } else if (classId === 'wizard') {
            if (characterId === 'bao') {
                newUnit = new Bao(this, x, y, this.player, config);
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
                mercenaries: this.mercenaries.getChildren()
                    .filter(m => !m.config.hideInUI)
                    .map(m => m.getState())
            });

            EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[디버그] ${classId} 역할이 [${config.name}](으)로 교체되었습니다. 🔄`);
        }
    }

    update(time, delta) {
        if (this.isUltimateActive) return;

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

        this.updateCameraFollow();
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

        // Spawn Orcs (Round 1: 2, then +1 per round)
        const orcCount = 2 + (this.currentRound - 1);
        for (let i = 0; i < orcCount; i++) {
            const offsetX = (i % 2) * 80;
            const offsetY = Math.floor(i / 2) * 80;
            const orc = new Orc(this, startPos.x + 400 + offsetX, startPos.y + offsetY - 40, this.player);
            this.enemies.add(orc);
        }

        // Round 3+: Spawn Shadow Aren as a mini-boss!
        if (this.currentRound >= 3) {
            const shadowX = startPos.x + 150; // Reduced from 400
            const shadowY = startPos.y - 120; // Slightly offset
            this.spawnShadowMercenary('warrior', Characters.AREN, shadowX, shadowY);
            EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[!] 그림자 전사 아렌이 나타났습니다! ⚔️`);
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
     */
    spawnShadowMercenary(classId, characterConfig, x, y) {
        // Create config with enemy team
        const config = {
            ...characterConfig,
            id: characterConfig.id + '_shadow', // unique ID to avoid PartyManager conflicts
            name: `그림자 ${characterConfig.name}`,
            team: 'enemy'
        };

        let unit = null;
        if (classId === 'warrior') {
            unit = new Warrior(this, x, y, config);
        } else if (characterConfig.id === 'nickle' || characterConfig.characterId === 'nickle') {
            unit = new Nickle(this, x, y, this.player, config);
        } else if (classId === 'archer') {
            unit = new Archer(this, x, y, this.player, config);
        } else if (classId === 'healer') {
            unit = new Healer(this, x, y, this.player, config);
        } else if (classId === 'wizard') {
            if (characterConfig.id === 'bao' || characterConfig.characterId === 'bao') {
                unit = new Bao(this, x, y, this.player, config);
            } else {
                unit = new Wizard(this, x, y, this.player, config);
            }
        } else if (classId === 'bard') {
            unit = new Bard(this, x, y, this.player, config);
        }

        if (unit) {
            this.enemies.add(unit);

            // Re-initialize AI targets to be sure it targets the player party
            if (unit.initAI) {
                unit.initAI();
            }

            return unit;
        }
        return null;
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
