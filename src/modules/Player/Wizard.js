import Phaser from 'phaser';
import Mercenary from './Mercenary.js';
import applyRangedAI from '../AI/RangedAI.js';
import Blackboard from '../AI/Blackboard.js';
import { MercenaryClasses } from '../Core/EntityStats.js';
import SkillFireball from '../Skills/SkillFireball.js';
import SkillStoneBlast from '../Skills/SkillStoneBlast.js';
import SkillMeteorStrike from '../Skills/SkillMeteorStrike.js';
import PlaceholderSkill from '../Skills/PlaceholderSkill.js';
import EventBus from '../Events/EventBus.js';

/**
 * Wizard.js
 * Specialist in magic attacks. Follows the Warrior and kites enemies, firing instant lasers.
 */
export default class Wizard extends Mercenary {
    constructor(scene, x, y, warrior, characterConfig = {}) {
        const config = { ...MercenaryClasses.WIZARD, ...characterConfig };
        super(scene, x, y, config);
        this.warrior = warrior; // Reference to leader

        this.atkSpd = this.config.atkSpd || 1200;
        this.lastFireTime = 0;
        this.teleportCooldown = 0;

        // Instantiate Skill dynamically
        if (config.skillName === 'SkillFireball') {
            this.skill = new SkillFireball();
        } else if (config.skillName === 'SkillStoneBlast') {
            this.skill = new SkillStoneBlast();
        } else if (config.skillName === 'PlaceholderSkill') {
            this.skill = new PlaceholderSkill();
        }

        // Initialize Ultimate Skill
        if (this.characterId === 'merlin') {
            this.ultimateSkill = new SkillMeteorStrike();
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

        // Apply base ranged AI, passing our skill node to be injected into the selector
        const skillNode = this.skill ? this.skill.createBehaviorNode(this) : null;
        applyRangedAI(this, skillNode);
    }

    update() {
        super.update();

        // Check for Perk: Teleport
        if (this.activatedPerks.includes('teleport')) {
            this.checkTeleportTrigger();
        }

        // Always find the nearest enemy to ensure proper kiting and survival
        this.findNearestEnemy();
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

        // Use mAtk and pass 'laser' type to ProjectileManager
        this.scene.tweens.add({
            targets: this.sprite,
            x: this.sprite.x + (this.lastScaleX * 10), // nudge forward
            duration: 50,
            yoyo: true
        });

        this.scene.projectileManager.fire(
            this.x, this.y, target.x, target.y,
            this.getTotalMAtk(), 'laser', true, this.targetGroup, this
        );
        return true;
    }

    executeUltimate() {
        if (this.ultimateSkill) {
            this.ultimateSkill.execute(this.scene, this);
        }
    }

    checkTeleportTrigger() {
        if (this.scene.time.now < this.teleportCooldown) return;

        const targetGroup = this.targetGroup;
        if (!targetGroup) return;

        const enemies = targetGroup.getChildren();
        let nearCount = 0;

        for (const enemy of enemies) {
            if (!enemy.active || enemy.hp <= 0) continue;
            const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
            if (dist < 80) nearCount++;
        }

        if (nearCount >= 2 || (this.hp / this.maxHp < 0.2)) {
            this.triggerTeleport();
        }
    }

    triggerTeleport() {
        this.teleportCooldown = this.scene.time.now + 10000; // 10s cooldown

        console.log(`[Perk] ${this.unitName} triggered Teleport!`);
        EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `${this.unitName}: 텔레포트! ✨`);

        // 1. Find Safe Spot
        const targetGroup = this.targetGroup;
        const enemies = targetGroup.getChildren();
        let avgX = 0;
        let avgY = 0;
        let count = 0;

        for (const enemy of enemies) {
            if (!enemy.active || enemy.hp <= 0) continue;
            const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
            if (dist < 150) {
                avgX += enemy.x;
                avgY += enemy.y;
                count++;
            }
        }

        let targetX, targetY;
        if (count > 0) {
            avgX /= count;
            avgY /= count;
            const angle = Phaser.Math.Angle.Between(avgX, avgY, this.x, this.y);
            targetX = this.x + Math.cos(angle) * 200;
            targetY = this.y + Math.sin(angle) * 200;
        } else {
            // Random direction if no enemies nearby (e.g. low HP trigger)
            const angle = Math.random() * Math.PI * 2;
            targetX = this.x + Math.cos(angle) * 200;
            targetY = this.y + Math.sin(angle) * 200;
        }

        // Clamp to screen bounds
        const margin = 50;
        targetX = Phaser.Math.Clamp(targetX, margin, this.scene.cameras.main.width - margin);
        targetY = Phaser.Math.Clamp(targetY, margin, this.scene.cameras.main.height - margin);

        // 2. Visual & Sound "Pop!"
        if (this.scene.fxManager) {
            this.scene.fxManager.showDamageText(this, 'POP! ✨', '#ffffff');
            // Flash at old position
            const flash = this.scene.add.circle(this.x, this.y, 30, 0xffffff, 0.8);
            this.scene.tweens.add({
                targets: flash,
                alpha: 0,
                scale: 1.5,
                duration: 300,
                onComplete: () => flash.destroy()
            });
        }

        // 3. Move
        this.x = targetX;
        this.y = targetY;

        // Flash at new position
        if (this.scene.fxManager) {
            const flash2 = this.scene.add.circle(this.x, this.y, 40, 0xaaaaff, 0.6);
            this.scene.tweens.add({
                targets: flash2,
                alpha: 0,
                scale: 0.5,
                duration: 300,
                onComplete: () => flash2.destroy()
            });
        }
    }


    onSkillExecuted(skill) {
        if (this.activatedPerks.includes('arcane_surge')) {
            const roll = Math.random();
            console.log(`[Perk] ${this.unitName}: 비전 분출 확률 체크... (Roll: ${roll.toFixed(2)} / Threshold: 0.20)`);

            // 20% chance to reduce cooldown by 50%
            if (roll < 0.2) {
                const now = this.scene.time.now;
                const cd = skill.getActualCooldown ? skill.getActualCooldown(this.castSpd) : 5000;

                // Set lastCastTime back by half the cooldown
                skill.lastCastTime = now - (cd * 0.5);

                console.log(`[Perk] ${this.unitName}: 비전 분출 발동! 다음 스킬 재사용 대기시간 50% 감소`);
                if (this.scene.fxManager) {
                    this.scene.fxManager.showDamageText(this, 'ARCANE SURGE! 🌀', '#33ccff');
                }
            }
        }
    }
}
