import BaseMonster from './BaseMonster.js';
import applyMeleeAI from './MeleeAI.js';

/**
 * CrocodileWarrior.js
 * High-stat melee enemy for Swampland.
 */
export default class CrocodileWarrior extends BaseMonster {
    constructor(scene, x, y, target, level = 1, config = null) {
        super(scene, x, y, config, target);
        this.initAI();
    }

    initAI() {
        // High HP and ATK focus
        applyMeleeAI(this, (agent) => agent.scene.mercenaries, 'AGGRESSIVE');
    }

    update() {
        super.update();
        this.findNearestEnemy();
    }
}
