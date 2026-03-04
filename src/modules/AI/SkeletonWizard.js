import BaseMonster from './BaseMonster.js';
import applyRangedAI from './RangedAI.js';
import { MonsterClasses, scaleStats } from '../Core/EntityStats.js';

/**
 * SkeletonWizard.js
 * Ranged magic enemy for Undead Graveyard.
 */
export default class SkeletonWizard extends BaseMonster {
    constructor(scene, x, y, target, level = 1) {
        const config = scaleStats(MonsterClasses.SKELETON_WIZARD, level);
        super(scene, x, y, config, target);
        this.initAI();
    }

    initAI() {
        // Apply the generalized Ranged AI
        applyRangedAI(this);
    }

    update() {
        super.update();
        // findNearestEnemy is now in BaseMonster
        this.findNearestEnemy();
    }
}
