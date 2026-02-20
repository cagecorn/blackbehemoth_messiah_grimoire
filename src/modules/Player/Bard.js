import Phaser from 'phaser';
import Mercenary from './Mercenary.js';
import applyBardAI from '../AI/BardAI.js';
import Blackboard from '../AI/Blackboard.js';
import { MercenaryClasses } from '../Core/EntityStats.js';

/**
 * Bard.js
 * Hybrid Support: Applies ATK/mATK buffs to allies, then attacks with notes.
 */
export default class Bard extends Mercenary {
    constructor(scene, x, y, warrior) {
        const config = MercenaryClasses.BARD;
        super(scene, x, y, config);
        this.warrior = warrior;

        this.lastFireTime = 0;
        this.lastBuffTime = 0;

        this.initAI();
    }

    initAI() {
        this.blackboard = new Blackboard();
        this.blackboard.set('self', this);
        this.blackboard.set('ai_state', 'AGGRESSIVE');
        this.blackboard.set('target', null);
        this.blackboard.set('buff_target', null);

        // Provides getAllyGroup and getEnemyGroup
        applyBardAI(this, () => this.scene.mercenaries, () => this.scene.enemies);
    }

    castBuff(target) {
        const now = this.scene.time.now;
        if (now - this.lastBuffTime < this.config.castSpd) return false;

        this.lastBuffTime = now;

        // Buff formulas: e.g., 20% of Bard's mAtk
        const buffAtk = Math.max(1, Math.floor(this.getTotalMAtk() * 0.2));
        const buffMAtk = Math.max(1, Math.floor(this.getTotalMAtk() * 0.25));
        const duration = 15000; // 15 seconds so Bard can buff everybody without looping endlessly

        this.scene.buffManager.applyBuff(target, this, 'Motivation', duration, buffAtk, buffMAtk);

        // Visual cast bump
        this.scene.tweens.add({
            targets: this.sprite,
            y: this.sprite.y - 15,
            duration: 100,
            yoyo: true
        });

        return true;
    }

    fireProjectile(target) {
        const now = this.scene.time.now;
        if (now - this.lastFireTime < this.config.atkSpd) return false;

        this.lastFireTime = now;

        this.scene.tweens.add({
            targets: this.sprite,
            x: this.sprite.x + (this.lastScaleX * 10),
            duration: 50,
            yoyo: true
        });

        // Use physical Atk for musical notes
        this.scene.projectileManager.fire(
            this.x, this.y, target.x, target.y,
            this.getTotalAtk(), 'emoji_note', false, null, this.className || this.id
        );

        return true;
    }
}
