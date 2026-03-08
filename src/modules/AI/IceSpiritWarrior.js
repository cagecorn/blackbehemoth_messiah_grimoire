import BaseMonster from './BaseMonster.js';
import applyMeleeAI from './MeleeAI.js';

/**
 * IceSpiritWarrior.js
 * High-stat ice-elemental melee enemy for Winter Land.
 * Has a chance to freeze targets on hit.
 */
export default class IceSpiritWarrior extends BaseMonster {
    constructor(scene, x, y, target, level = 1, config = null) {
        super(scene, x, y, config, target);
        this.initAI();
    }

    initAI() {
        applyMeleeAI(this, (agent) => agent.scene.mercenaries, 'AGGRESSIVE');
    }

    update() {
        super.update();
        this.findNearestEnemy();
    }
}
