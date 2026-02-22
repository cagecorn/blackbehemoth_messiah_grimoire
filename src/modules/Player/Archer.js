import Phaser from 'phaser';
import Mercenary from './Mercenary.js';
import applyRangedAI from '../AI/RangedAI.js';
import Blackboard from '../AI/Blackboard.js';
import EventBus from '../Events/EventBus.js';
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
        this.isEvasiveManeuversActive = false;
        this.evasiveCooldown = 0;

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
            this.skill = new ElectricGrenade({
                cooldown: 8000,
                damageMultiplier: 1.8,
                aoeRadius: 140,
                shockDuration: 3000
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

        // Check for Evasive Maneuvers Perk
        if (this.activatedPerks.includes('evasive_maneuvers')) {
            this.checkEvasiveManeuversTrigger();
        }
    }

    checkEvasiveManeuversTrigger() {
        if (this.isEvasiveManeuversActive || this.scene.time.now < this.evasiveCooldown) return;

        // Condition: surrounded by 2+ enemies within 80px or hp < 20%
        const enemies = this.targetGroup.getChildren();
        let nearCount = 0;
        for (const enemy of enemies) {
            if (!enemy.active || enemy.hp <= 0) continue;
            const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
            if (dist < 80) nearCount++;
        }

        if (nearCount >= 2 || (this.hp / this.maxHp < 0.2)) {
            this.triggerEvasiveManeuvers();
        }
    }

    triggerEvasiveManeuvers() {
        this.isEvasiveManeuversActive = true;
        this.evasiveCooldown = this.scene.time.now + 10000; // 10s cooldown

        console.log(`[Perk] ${this.unitName} triggered Evasive Maneuvers!`);
        EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `${this.unitName}: 회피 기동! 🏃💨`);

        // 1. Phasing & Speed Buff
        const originalSpeed = this.speed;
        this.speed *= 2.5;

        // Disable collisions with other units (Phasing)
        // We use checkCollision.none or just rely on them not slowing down
        // For actual phasing, we can stop the separation manager or set a flag
        this.isPhasing = true;

        // 2. Rolling Animation
        this.scene.tweens.add({
            targets: this.sprite,
            angle: 360,
            duration: 600,
            onComplete: () => {
                this.sprite.angle = 0;
            }
        });

        // 3. Forced Movement (Flee from nearest enemies)
        // This will be handled by the AI's "Flee" behavior if we set a high priority, 
        // or we can manually push here for a split second.

        // 4. Trail Effect (After-images)
        const trailTimer = this.scene.time.addEvent({
            delay: 50,
            callback: () => {
                if (this.scene.fxManager) {
                    this.scene.fxManager.createAfterimage(this, 400, 0.4);
                }
            },
            repeat: 12 // 0.6s total
        });

        // 5. Cleanup after duration
        this.scene.time.delayedCall(700, () => {
            this.speed = originalSpeed;
            this.isEvasiveManeuversActive = false;
            this.isPhasing = false;
        });
    }

    findNearestEnemy() {
        const targetGroup = this.targetGroup;
        if (!targetGroup) return;

        const enemies = targetGroup.getChildren();
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
        this.scene.projectileManager.fire(this.x, this.y, target.x, target.y, this.atk, 'archer', false, this.targetGroup, this);
        return true;
    }
}
