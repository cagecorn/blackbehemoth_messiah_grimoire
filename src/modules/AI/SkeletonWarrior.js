import BaseMonster from './BaseMonster.js';
import applyMeleeAI from './MeleeAI.js';
import { MonsterClasses, scaleStats } from '../Core/EntityStats.js';

/**
 * SkeletonWarrior.js
 * Basic melee enemy for Undead Graveyard.
 */
export default class SkeletonWarrior extends BaseMonster {
    constructor(scene, x, y, target, level = 1, config = null) {
        const finalConfig = config || scaleStats(MonsterClasses.SKELETON_WARRIOR, level);
        super(scene, x, y, finalConfig, target);
        this.initAI();
    }

    initAI() {
        // Apply the generalized Melee AI
        applyMeleeAI(this, (agent) => agent.scene.mercenaries, 'AGGRESSIVE');
    }

    update(time, delta) {
        super.update(time, delta);
        // findNearestEnemy is now in BaseMonster
        this.findNearestEnemy();
    }
}
