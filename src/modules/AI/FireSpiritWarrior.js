import BaseMonster from './BaseMonster.js';
import applyMeleeAI from './MeleeAI.js';

/**
 * FireSpiritWarrior.js
 * High-stat fire-elemental melee enemy for Lava Field.
 */
export default class FireSpiritWarrior extends BaseMonster {
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
