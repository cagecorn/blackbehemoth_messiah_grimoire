import Phaser from 'phaser';
import Mercenary from './Mercenary.js';
import applyBardAI from '../AI/BardAI.js';
import Blackboard from '../AI/Blackboard.js';
import { MercenaryClasses } from '../Core/EntityStats.js';
import SongOfProtection from '../Skills/SongOfProtection.js';
import PlaceholderSkill from '../Skills/PlaceholderSkill.js';

/**
 * Bard.js
 * Hybrid Support: Applies ATK/mATK buffs to allies, then attacks with notes.
 */
export default class Bard extends Mercenary {
    constructor(scene, x, y, warrior, characterConfig = {}) {
        const config = { ...MercenaryClasses.BARD, ...characterConfig };
        super(scene, x, y, config);
        this.warrior = warrior;

        this.lastFireTime = 0;
        this.lastBuffTime = 0;

        // Instantiate Skill dynamically
        if (config.skillName === 'SongOfProtection') {
            this.skill = new SongOfProtection({
                cooldown: 10000,
                shieldMultiplier: 2.5,
                shieldDuration: 5000
            });
        } else if (config.skillName === 'PlaceholderSkill') {
            this.skill = new PlaceholderSkill();
        }

        this.initAI();
    }

    getSkillProgress() {
        if (!this.skill) return 0;
        return this.skill.getCooldownProgress(this.scene.time.now, this.castSpd);
    }

    initAI() {
        this.blackboard = new Blackboard();
        this.blackboard.set('self', this);
        this.blackboard.set('ai_state', 'AGGRESSIVE');
        this.blackboard.set('target', null);
        this.blackboard.set('buff_target', null);

        // Provides getAllyGroup and getEnemyGroup based on team
        applyBardAI(this, (u) => u.allyGroup, (u) => u.targetGroup);
    }

    castBuff(target) {
        const now = this.scene.time.now;
        if (now - this.lastBuffTime < this.castSpd) return false;

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
        if (now - this.lastFireTime < this.atkSpd) return false;

        this.lastFireTime = now;

        this.scene.tweens.add({
            targets: this.sprite,
            x: this.sprite.x + (this.lastScaleX * 10),
            duration: 50,
            yoyo: true
        });

        this.scene.projectileManager.fire(
            this.x, this.y, target.x, target.y,
            this.getTotalAtk(), 'emoji_note', false, this.targetGroup, this
        );

        return true;
    }

    update() {
        super.update();

        // Auto-cast Song of Protection when off cooldown
        if (!this.isAirborne && !this.isStunned && !this.isKnockedBack && this.skill) {
            this.skill.execute(this);
        }
    }
}
