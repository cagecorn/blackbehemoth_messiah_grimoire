import Blackboard from './Blackboard.js';
import BaseMonster from './BaseMonster.js';
import applyRangedAI from './RangedAI.js';
import { MonsterClasses } from '../Core/EntityStats.js';

/**
 * Orc.js
 * Ranged enemy using Orc sprite.
 */
export default class Orc extends BaseMonster {
    constructor(scene, x, y, target) {
        // We pass the ORC config from EntityStats
        super(scene, x, y, MonsterClasses.ORC, target);
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

    update() {
        super.update();
        // findNearestEnemy is now in BaseMonster
        this.findNearestEnemy();
    }
}
