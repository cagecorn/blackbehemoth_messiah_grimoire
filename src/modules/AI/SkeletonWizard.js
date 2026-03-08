import BaseMonster from './BaseMonster.js';
import applyRangedAI from './RangedAI.js';
import { MonsterClasses, scaleStats } from '../Core/EntityStats.js';

/**
 * SkeletonWizard.js
 * Ranged magic enemy for Undead Graveyard.
 */
export default class SkeletonWizard extends BaseMonster {
    constructor(scene, x, y, target, level = 1, config = null) {
        const finalConfig = config || scaleStats(MonsterClasses.SKELETON_WIZARD, level);
        super(scene, x, y, finalConfig, target);
        this.initAI();
    }

    initAI() {
        // Apply the generalized Ranged AI
        applyRangedAI(this);
    }

    update(time, delta) {
        super.update(time, delta);
        // findNearestEnemy is now in BaseMonster
        this.findNearestEnemy();
    }
}
