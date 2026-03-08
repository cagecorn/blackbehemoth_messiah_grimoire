import BaseMonster from './BaseMonster.js';
import applyRangedAI from './RangedAI.js';

/**
 * FireSpiritArcher.js
 * High-stat fire-elemental ranged enemy for Lava Field.
 */
export default class FireSpiritArcher extends BaseMonster {
    constructor(scene, x, y, target, level = 1, config = null) {
        super(scene, x, y, config, target);
        this.initAI();
    }

    initAI() {
        applyRangedAI(this);
    }

    update(time, delta) {
        super.update(time, delta);
        this.findNearestEnemy();
    }
}
