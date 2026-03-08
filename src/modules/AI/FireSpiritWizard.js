import BaseMonster from './BaseMonster.js';
import applyRangedAI from './RangedAI.js';

/**
 * FireSpiritWizard.js
 * High-stat fire-elemental magic enemy for Lava Field.
 * Uses 'laser' projectiles via aiType: 'RANGED_MAGIC'.
 */
export default class FireSpiritWizard extends BaseMonster {
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
