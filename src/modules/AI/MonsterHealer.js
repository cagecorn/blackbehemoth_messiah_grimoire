import Phaser from 'phaser';
import BaseMonster from './BaseMonster.js';
import applyHealerAI from './HealerAI.js';
import Blackboard from './Blackboard.js';
import { HealerActions } from '../Combat/HealerActions.js';

/**
 * MonsterHealer.js
 * An enemy that heals its own group and attacks the player.
 */
export default class MonsterHealer extends BaseMonster {
    constructor(scene, x, y, config, target) {
        super(scene, x, y, config, target);

        // Stats
        this.mAtk = config.mAtk || 10;
        this.castSpd = config.castSpd || 1500;
        this.atkSpd = config.atkSpd || 2000;
        // lastActionTime is used inside HealerActions.js, 
        // we'll use the one initialized in the base class or just let HealerActions handle it.
        this.lastActionTime = 0;

        // Tint to differentiate from normal goblins
        this.sprite.setTint(0xccffcc);

        this.initAI();
    }

    initAI() {
        this.blackboard = new Blackboard();
        this.blackboard.set('self', this);
        this.blackboard.set('ai_state', 'AGGRESSIVE');
        this.blackboard.set('target', this.target); // Usually the Warrior
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

    handleAttack() {
        // MonsterHealer handles all attack logic via Behavior Tree (HealerAI.js)
        // No melee dash logic needed.
    }

    update() {
        super.update();
        // BaseMonster.update handles BT step and manual attack logic
        // But support AI handles everything via BT.
    }
}
