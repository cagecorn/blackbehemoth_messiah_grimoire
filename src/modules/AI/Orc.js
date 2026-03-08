import Blackboard from './Blackboard.js';
import BaseMonster from './BaseMonster.js';
import applyRangedAI from './RangedAI.js';
import { MonsterClasses, scaleStats } from '../Core/EntityStats.js';

/**
 * Orc.js
 * Ranged enemy using Orc sprite.
 */
export default class Orc extends BaseMonster {
    constructor(scene, x, y, target, level = 1, config = null) {
        // Use passed config or scale from default
        const finalConfig = config || scaleStats(MonsterClasses.ORC, level);
        super(scene, x, y, finalConfig, target);
        this.initAI();
    }

    initAI() {
        // Initialize the blackboard before applying AI or using it
        this.blackboard = new Blackboard();
        this.blackboard.set('self', this);
        this.blackboard.set('ai_state', 'AGGRESSIVE');
        this.blackboard.set('target', null);

        // Apply the generalized Ranged AI
        applyRangedAI(this);
    }

    update(time, delta) {
        super.update(time, delta);
        // findNearestEnemy is now in BaseMonster
        this.findNearestEnemy();
    }
}
