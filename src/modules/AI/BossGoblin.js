import BaseMonster from './BaseMonster.js';
import applyMeleeAI from './MeleeAI.js';
import { MonsterClasses } from '../Core/EntityStats.js';

/**
 * BossGoblin.js
 * Giant goblin boss for Raid.
 */
export default class BossGoblin extends BaseMonster {
    constructor(scene, x, y, config, target) {
        super(scene, x, y, config || MonsterClasses.BOSS_GOBLIN, target);
        this.initAI();
    }

    initAI() {
        // Apply Melee AI targeting mercenaries
        applyMeleeAI(this, (agent) => agent.scene.mercenaries, 'AGGRESSIVE');
    }
}
