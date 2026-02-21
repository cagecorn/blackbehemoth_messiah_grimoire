import Phaser from 'phaser';
import Mercenary from './Mercenary.js';
import applyRangedAI from '../AI/RangedAI.js';
import Blackboard from '../AI/Blackboard.js';
import { MercenaryClasses } from '../Core/EntityStats.js';
import KnockbackShot from '../Skills/KnockbackShot.js';
import TacticalCommand from '../Skills/TacticalCommand.js';
import ElectricGrenade from '../Skills/ElectricGrenade.js';
import PlaceholderSkill from '../Skills/PlaceholderSkill.js';

/**
 * Archer.js
 * Specialist in Ranged combat. Follows the Warrior and kites enemies.
 */
export default class Archer extends Mercenary {
    constructor(scene, x, y, warrior, characterConfig = {}) {
        const config = { ...MercenaryClasses.ARCHER, ...characterConfig };
        super(scene, x, y, config);
        this.warrior = warrior; // Reference to leader

        // Ranged specific stats
        this.atkSpd = this.config.atkSpd || 1000;
        this.lastFireTime = 0;

        // Instantiate Skill dynamically
        if (config.skillName === 'KnockbackShot') {
            this.skill = new KnockbackShot({
                cooldown: 6000,
                damageMultiplier: 2.5, // Stronger than normal attack
                projectileSpeed: 1200, // Very fast
                knockbackDistance: 180,
                knockbackDuration: 250
            });
        } else if (config.skillName === 'ElectricGrenade') {
            this.skill = new ElectricGrenade(scene, {
                cooldown: 8000,
                damageMultiplier: 1.8,
                aoeRadius: 100,
                shockDuration: 3000
            });
        } else if (config.skillName === 'KnockbackShot') {
            this.skill = new KnockbackShot({
                cooldown: 6000,
                damageMultiplier: 2.5, // Stronger than normal attack
                projectileSpeed: 1200, // Very fast
                knockbackDistance: 180,
                knockbackDuration: 250
            });
        } else if (config.skillName === 'TacticalCommand') {
            this.skill = new TacticalCommand(scene, {
                cooldown: 25000,
                duration: 10000
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

        applyRangedAI(this);
    }

    update() {
        super.update();

        // Auto-cast Skill when Aggressive
        if (this.blackboard && this.blackboard.get('ai_state') === 'AGGRESSIVE') {
            if (!this.isAirborne && !this.isStunned && !this.isKnockedBack && this.skill) {
                const target = this.blackboard.get('target');
                if (target && target.active && target.hp > 0) {
                    this.skill.execute(this, target);
                }
            }
        }

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
        this.scene.projectileManager.fire(this.x, this.y, target.x, target.y, this.atk, 'archer', false, null, this);
        return true;
    }
}
