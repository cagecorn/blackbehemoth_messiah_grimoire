import Phaser from 'phaser';
import Mercenary from './Mercenary.js';
import applyHealerAI from '../AI/HealerAI.js';
import Blackboard from '../AI/Blackboard.js';
import { MercenaryClasses } from '../Core/EntityStats.js';
import { HealerActions } from '../Combat/HealerActions.js';
import EventBus from '../Events/EventBus.js';

/**
 * Healer.js
 * Support unit. Heals allies and uses magic attacks.
 */
export default class Healer extends Mercenary {
    constructor(scene, x, y, warrior) {
        const config = MercenaryClasses.HEALER;
        super(scene, x, y, config);
        this.warrior = warrior;

        this.mAtk = config.mAtk;
        this.atkSpd = config.atkSpd || 1200;
        this.castSpd = config.castSpd || 1000;
        this.lastActionTime = 0;

        this.initAI();
    }

    initAI() {
        this.blackboard = new Blackboard();
        this.blackboard.set('self', this);
        this.blackboard.set('ai_state', 'AGGRESSIVE');
        this.blackboard.set('target', null);
        this.blackboard.set('heal_target', null);

        // Player Healer: Allies = Party, Enemies = Monsters
        applyHealerAI(
            this,
            () => this.scene.mercenaries,
            () => this.scene.enemies
        );
    }

    update() {
        super.update();

        // Share warrior's target
        if (this.warrior && this.warrior.blackboard) {
            const warriorTarget = this.warrior.blackboard.get('target');
            if (warriorTarget && warriorTarget.active && warriorTarget.hp > 0) {
                this.blackboard.set('target', warriorTarget);
            } else {
                this.findNearestEnemy();
            }
        }
    }

    findNearestEnemy() {
        // AI now handles initial targeting via conditions, 
        // but we keep this for manual/shared logic if needed
        if (!this.scene.enemies) return;
        const enemies = this.scene.enemies.getChildren();
        let nearest = null;
        let minDist = Infinity;
        for (const enemy of enemies) {
            if (!enemy.active || enemy.hp <= 0) continue;
            const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        }
        this.blackboard.set('target', nearest);
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
}
