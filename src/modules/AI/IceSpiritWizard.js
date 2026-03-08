import BaseMonster from './BaseMonster.js';
import applyRangedAI from './RangedAI.js';

/**
 * IceSpiritWizard.js
 * High-stat ice-elemental magic ranged enemy for Winter Land.
 * Sprays ice orbs that can freeze targets.
 */
export default class IceSpiritWizard extends BaseMonster {
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
