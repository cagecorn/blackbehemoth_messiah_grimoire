import BaseStructure from '../AI/BaseStructure.js';
import HealingTurret from '../AI/HealingTurret.js';
import DBManager from '../Database/DBManager.js';
import EventBus from '../Events/EventBus.js';

/**
 * StructureManager.js
 * Modular manager to handle defense buildings lifecycle in dungeons.
 */
export default class StructureManager {
    constructor(scene) {
        this.scene = scene;
        this.dungeonId = scene.dungeonId;
        this.structures = scene.add.group({ classType: BaseStructure, runChildUpdate: true });

        // Add to scene's primary groups if they exist
        if (this.scene.mercenaries) {
            // Monsters target this.scene.mercenaries, so we should either add structures there
            // or modify BaseMonster search. Adding to mercenaries group is easier.
            this.scene.structures = this.structures;
        }
    }

    /**
     * Initialize all previously placed structures for this dungeon.
     */
    async initDungeonStructures() {
        if (!this.dungeonId) return;

        console.log(`[StructureManager] Loading structures for dungeon: ${this.dungeonId}`);
        const saved = await DBManager.getStructuresByDungeon(this.dungeonId);

        for (const s of saved) {
            if (s.x !== undefined && s.y !== undefined) {
                // Ignore HP from DB for session entry; always spawn at full strength
                this.spawnStructure(s.id, s.baseId, s.x, s.y, s.maxHp || 1000);
            }
        }
    }

    /**
     * Spawn a structure instance into the scene.
     */
    spawnStructure(instanceId, baseId, x, y, hpCap) {
        let structure;
        if (baseId === 'healing_turret') {
            structure = new HealingTurret(this.scene, x, y, instanceId, baseId);
        } else {
            structure = new BaseStructure(this.scene, x, y, instanceId, baseId);
        }

        if (hpCap !== undefined) structure.hp = hpCap;
        structure.updateHealthBar();

        this.structures.add(structure);

        // Ensure monsters can see this
        if (this.scene.mercenaries) {
            this.scene.mercenaries.add(structure);
        }

        return structure;
    }

    /**
     * Place a new structure and save its position.
     */
    async placeStructure(instanceId, x, y) {
        const inst = await DBManager.getStructureInstance(instanceId);
        if (!inst) return null;

        inst.dungeonId = this.dungeonId;
        inst.x = x;
        inst.y = y;
        if (inst.currentHp === undefined) inst.currentHp = inst.maxHp || 1000; // Default or use base stats

        await DBManager.saveStructureInstance(inst);

        const spawned = this.spawnStructure(instanceId, inst.baseId, x, y, inst.currentHp);

        console.log(`[StructureManager] Placed ${inst.baseId} at (${x}, ${y}) in ${this.dungeonId}`);
        return spawned;
    }

    /**
     * Remove a structure from the scene.
     */
    async removeStructure(instanceId) {
        const structure = this.structures.getChildren().find(s => s.instanceId === instanceId);
        if (structure) {
            structure.destroy();
        }

        // Optional: Clear placement from DB if user "uninstalls" it.
        // For now, destruction only sets HP to 0.
    }

    update(time, delta) {
        // Each structure handles its own update via runChildUpdate: true
    }
}
