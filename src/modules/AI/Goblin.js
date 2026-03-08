import BaseMonster from './BaseMonster.js';
import applyMeleeAI from './MeleeAI.js';
import { MonsterClasses, scaleStats } from '../Core/EntityStats.js';

/**
 * Goblin.js
 * Basic melee enemy.
 */
export default class Goblin extends BaseMonster {
    constructor(scene, x, y, target, level = 1, config = null) {
        // Use passed config or scale from default
        const finalConfig = config || scaleStats(MonsterClasses.GOBLIN, level);
        super(scene, x, y, finalConfig, target);
        this.initAI();
    }

    initAI() {
        // Apply the generalized Melee AI
        // Goblin searches for the nearest valid mercenary in the scene
        applyMeleeAI(this, (agent) => agent.scene.mercenaries, 'AGGRESSIVE');
    }
}
