import BaseMonster from './BaseMonster.js';
import applyMeleeAI from './MeleeAI.js';
import { MonsterClasses, scaleStats } from '../Core/EntityStats.js';

/**
 * SkeletonWarrior.js
 * Basic melee enemy for Undead Graveyard.
 */
export default class SkeletonWarrior extends BaseMonster {
    constructor(scene, x, y, target, level = 1) {
        const config = scaleStats(MonsterClasses.SKELETON_WARRIOR, level);
        super(scene, x, y, config, target);
        this.initAI();
    }

    initAI() {
        // Apply the generalized Melee AI
        applyMeleeAI(this, (agent) => agent.scene.mercenaries, 'AGGRESSIVE');
    }

    update() {
        super.update();
        // findNearestEnemy is now in BaseMonster
        this.findNearestEnemy();
    }
}
