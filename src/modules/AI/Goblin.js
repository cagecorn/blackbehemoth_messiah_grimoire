import BaseMonster from './BaseMonster.js';
import applyMeleeAI from './MeleeAI.js';
import { MonsterClasses } from '../Core/EntityStats.js';

/**
 * Goblin.js
 * Basic melee enemy.
 */
export default class Goblin extends BaseMonster {
    constructor(scene, x, y, target) {
        // We pass the GOBLIN config from EntityStats
        super(scene, x, y, MonsterClasses.GOBLIN, target);
        this.initAI();
    }

    initAI() {
        // Apply the generalized Melee AI
        // Goblin chases its target (usually the Warrior)
        applyMeleeAI(this, (agent) => [agent.target], 'AGGRESSIVE');
    }
}
