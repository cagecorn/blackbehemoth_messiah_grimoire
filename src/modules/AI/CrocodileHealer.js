import BaseMonster from './BaseMonster.js';
import applyHealerAI from './HealerAI.js';
import Blackboard from './Blackboard.js';
import { HealerActions } from '../Combat/HealerActions.js';

/**
 * CrocodileHealer.js
 * High-stat support enemy for Swampland.
 */
export default class CrocodileHealer extends BaseMonster {
    constructor(scene, x, y, target, level = 1, config = null) {
        super(scene, x, y, config, target);

        // Stats for HealerActions
        this.mAtk = this.config.mAtk || 35;
        this.castSpd = this.config.castSpd || 1800;
        this.atkSpd = this.config.atkSpd || 2200;
        this.lastActionTime = 0;

        this.initAI();
    }

    initAI() {
        this.blackboard = new Blackboard();
        this.blackboard.set('self', this);
        this.blackboard.set('ai_state', 'AGGRESSIVE');
        this.blackboard.set('target', this.target);
        this.blackboard.set('heal_target', null);

        // Monster Healer: Allies = Enemies (Monsters), Enemies = Mercenaries
        applyHealerAI(
            this,
            () => this.scene.enemies,
            () => this.scene.mercenaries
        );
    }

    castHeal(target) {
        return HealerActions.castHeal(this, target);
    }

    castAttack(target) {
        return HealerActions.castAttack(this, target);
    }

    showHealFX(target) {
        HealerActions.showHealFX(this.scene, target);
    }

    update() {
        super.update();
        this.findNearestEnemy();
    }
}
