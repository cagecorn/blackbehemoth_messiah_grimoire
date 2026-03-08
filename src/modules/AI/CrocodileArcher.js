import BaseMonster from './BaseMonster.js';
import applyRangedAI from './RangedAI.js';

/**
 * CrocodileArcher.js
 * High-stat ranged enemy for Swampland.
 */
export default class CrocodileArcher extends BaseMonster {
    constructor(scene, x, y, target, level = 1, config = null) {
        super(scene, x, y, config, target);
        this.initAI();
    }

    initAI() {
        // Use RangedAI logic for archers
        applyRangedAI(this);
    }

    update(time, delta) {
        super.update(time, delta);
        this.findNearestEnemy();
    }
}
