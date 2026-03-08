import Phaser from 'phaser';
import Mercenary from './Mercenary.js';
import applyRangedAI from '../AI/RangedAI.js';
import Blackboard from '../AI/Blackboard.js';

/**
 * Siren.js
 * Summoned unit for Lute's ultimate skill.
 * Ranged AI, laser attacks, chance to inflict Sleep status.
 */
export default class Siren extends Mercenary {
    constructor(scene, x, y, master, options = {}) {
        // Stats scale based on master's mAtk
        const config = {
            id: 'siren_' + Date.now(),
            name: '사이렌 (Siren)',
            sprite: 'siren_sprite',
            maxHp: master.getTotalMAtk() * 8, // Slightly lower HP than Guardian Angel but ranged
            hp: master.getTotalMAtk() * 8,
            atk: 0,
            mAtk: master.getTotalMAtk() * 1.2, // Stronger magic scaling
            def: master.getTotalMDef() * 0.8,
            mDef: master.getTotalMDef() * 1.2,
            fireRes: master.getTotalMAtk() * 0.1,
            iceRes: master.getTotalMAtk() * 0.1,
            lightningRes: master.getTotalMAtk() * 0.1,
            speed: 120,
            atkSpd: 1500,
            atkRange: 250,
            rangeMin: 80,
            rangeMax: 250,
            physicsRadius: 24,
            spriteSize: 64,
            team: master.team,
            aiType: 'RANGED',
            hideInUI: true  // Summon - Don't show in portrait bar
        };

        super(scene, x, y, config);
        this.master = master;
        this.sleepChance = options.sleepChance || 0; // 0, 0.2, or 0.5 based on stage

        this.initAI();
    }

    initAI() {
        this.blackboard = new Blackboard();
        this.blackboard.set('self', this);
        this.blackboard.set('ai_state', 'AGGRESSIVE');
        this.blackboard.set('target', null);

        applyRangedAI(this);
    }

    update(time, delta) {
        super.update(time, delta);
        if (!this.active || !this.scene) return;

        // Ensure HP stays within dynamic bounds
        const currentMax = this.getTotalMaxHp();
        if (this.hp > currentMax) this.hp = currentMax;

        if (this.hp > 0) {
            this.findNearestEnemy();
        }
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
            if (!enemy.active || enemy.hp <= 0) continue;
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
        if (now - this.lastFireTime < (this.atkSpd || 1500)) return false;

        const target = this.blackboard.get('target');
        if (!target) return false;

        this.lastFireTime = now;

        // Visual "Singing" nudge
        if (this.sprite) {
            this.scene.tweens.killTweensOf(this.sprite);
            this.sprite.y = 0; // Reset y position
            this.scene.tweens.add({
                targets: this.sprite,
                y: -10, // Absolute relative offset
                duration: 100,
                yoyo: true
            });
        }

        // Laser attack (Instant hit)
        const prefix = this.master ? (this.master.getWeaponPrefix ? this.master.getWeaponPrefix() : null) : null;
        const element = prefix ? prefix.element : null;

        this.scene.projectileManager.fire(
            this.x, this.y, target.x, target.y,
            this.getTotalMAtk(), 'laser', true, this.targetGroup, this,
            (hitTarget) => {
                this.handleHitEffect(hitTarget);
            },
            false, element
        );

        return true;
    }

    handleHitEffect(target) {
        if (!target || !target.active || target.hp <= 0) return;

        // Check for Sleep chance
        if (this.sleepChance > 0 && Math.random() < this.sleepChance) {
            if (this.scene.ccManager) {
                this.scene.ccManager.applySleep(target, 4000);
            }
        }
    }

    // --- Dynamic Scaling ---
    getTotalMaxHp() {
        if (!this.master || !this.master.active) return super.getTotalMaxHp();
        return Math.floor(this.master.getTotalMAtk() * 8);
    }

    getTotalMAtk() {
        if (!this.master || !this.master.active) return super.getTotalMAtk();
        return Math.floor((this.master.getTotalMAtk() * 1.2) + (this.bonusMAtk || 0));
    }

    getTotalDef() {
        if (!this.master || !this.master.active) return super.getTotalDef();
        return Math.floor((this.master.getTotalMDef() * 0.8) + (this.bonusDef || 0));
    }

    getTotalMDef() {
        if (!this.master || !this.master.active) return super.getTotalMDef();
        return Math.floor((this.master.getTotalMDef() * 1.2) + (this.bonusMDef || 0));
    }

    die() {
        console.log(`[Siren] Summon has been defeated.`);
        if (this.master && this.master.onSummonDied) {
            this.master.onSummonDied(this);
        }
        super.die();
    }
}
