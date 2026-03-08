import BaseMonster from './BaseMonster.js';
import applyHealerAI from './HealerAI.js';
import { HealerActions } from '../Combat/HealerActions.js';

/**
 * IceSpiritHealer.js
 * Support ice-elemental enemy for Winter Land.
 * Heals allies and can freeze approaching enemies.
 */
export default class IceSpiritHealer extends BaseMonster {
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
        // Monster Healer: Allies = Enemies (this.scene.enemies), Enemies = Mercenaries
        applyHealerAI(
            this,
            (agent) => agent.scene.enemies,
            (agent) => agent.scene.mercenaries
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
