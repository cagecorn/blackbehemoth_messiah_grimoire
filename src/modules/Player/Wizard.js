import Phaser from 'phaser';
import Mercenary from './Mercenary.js';
import applyRangedAI from '../AI/RangedAI.js';
import Blackboard from '../AI/Blackboard.js';
import { MercenaryClasses } from '../Core/EntityStats.js';
import SkillFireball from '../Skills/SkillFireball.js';

/**
 * Wizard.js
 * Specialist in magic attacks. Follows the Warrior and kites enemies, firing instant lasers.
 */
export default class Wizard extends Mercenary {
    constructor(scene, x, y, warrior) {
        const config = MercenaryClasses.WIZARD;
        super(scene, x, y, config);
        this.warrior = warrior; // Reference to leader

        this.atkSpd = config.atkSpd || 1200;
        this.lastFireTime = 0;

        // Instantiate Skill
        this.skill = new SkillFireball();

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

        // Apply base ranged AI, passing our skill node to be injected into the selector
        const skillNode = this.skill.createBehaviorNode(this);
        applyRangedAI(this, skillNode);
    }

    update() {
        super.update();

        // Always find the nearest enemy to ensure proper kiting and survival
        this.findNearestEnemy();
    }

    findNearestEnemy() {
        if (!this.scene.enemies) return;

        const enemies = this.scene.enemies.getChildren();
        if (enemies.length === 0) {
            this.blackboard.set('target', null);
            return;
        }

        let nearest = null;
        let minDist = Infinity;

        for (const enemy of enemies) {
            if (enemy.hp <= 0) continue;
            const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        }
        this.blackboard.set('target', nearest);
    }

    fireProjectile() {
        const now = this.scene.time.now;
        if (now - this.lastFireTime < this.atkSpd) return false;

        const target = this.blackboard.get('target');
        if (!target) return false;

        this.lastFireTime = now;

        // Use mAtk and pass 'laser' type to ProjectileManager
        this.scene.tweens.add({
            targets: this.sprite,
            x: this.sprite.x + (this.lastScaleX * 10), // nudge forward
            duration: 50,
            yoyo: true
        });

        this.scene.projectileManager.fire(
            this.x, this.y, target.x, target.y,
            this.mAtk, 'laser', true, null, this.className || this.id
        );
        return true;
    }
}
