import Phaser from 'phaser';
import TargetingUtils from '../AI/TargetingUtils.js';

/**
 * ChargeAttack.js
 * A skill that causes the user to dash to a cluster of enemies,
 * deal AoE damage, and apply Airborne CC.
 */
export default class ChargeAttack {
    constructor(options = {}) {
        this.cooldown = options.cooldown || 5000;
        this.damageMultiplier = options.damageMultiplier || 1.5;
        this.scanRadius = options.scanRadius || 400;
        this.clusterRadius = options.clusterRadius || 100;
        this.dashSpeedMultiplier = options.dashSpeedMultiplier || 6;
        this.aoeRadius = options.aoeRadius || 80;
        this.ccDuration = options.ccDuration || 1200;
        this.ccHeight = options.ccHeight || 80;
        this.lastCastTime = 0;
    }

    /**
     * Calculates the actual cooldown taking the unit's castSpd into account.
     */
    getActualCooldown(castSpd) {
        const speedMultiplier = (castSpd || 1000) / 1000;
        return this.cooldown / Math.max(0.1, speedMultiplier);
    }

    getCooldownProgress(now, castSpd) {
        if (this.lastCastTime === 0) return 1; // Ready immediately
        const cd = this.getActualCooldown(castSpd);
        const elapsed = now - this.lastCastTime;
        return Math.max(0, Math.min(1, elapsed / cd));
    }

    isReady(now, castSpd) {
        return this.getCooldownProgress(now, castSpd) >= 1;
    }

    /**
     * Executes the charge attack.
     * @param {Phaser.GameObjects.Container} caster - Who is using the skill
     * @param {Array} enemies - List of potential targets
     */
    execute(caster, enemies) {
        if (!caster || !caster.active || caster.hp <= 0) return false;

        const now = caster.scene.time.now;
        if (!this.isReady(now, caster.castSpd)) {
            return false; // Still on cooldown
        }

        // Find targets within scan range
        const validTargets = enemies.filter(e => {
            if (!e.active || e.hp <= 0) return false;
            const dist = Phaser.Math.Distance.Between(caster.x, caster.y, e.x, e.y);
            return dist <= this.scanRadius && dist > 50; // Don't dash if already practically on top of them
        });

        if (validTargets.length === 0) return false;

        // Find the best cluster
        const bestCluster = TargetingUtils.findLargestCluster(validTargets, this.clusterRadius);

        if (!bestCluster || bestCluster.count === 0) return false;

        // Start Charge!
        this.lastCastTime = now;

        // Lock the caster into a casting state (temporarily override AI)
        const previousState = caster.blackboard ? caster.blackboard.get('ai_state') : null;
        if (caster.blackboard) caster.blackboard.set('ai_state', 'CASTING');

        // Stop current movement
        if (caster.body) caster.body.setVelocity(0, 0);

        const targetX = bestCluster.x;
        const targetY = bestCluster.y;

        const dist = Phaser.Math.Distance.Between(caster.x, caster.y, targetX, targetY);
        const duration = (dist / (caster.speed * this.dashSpeedMultiplier)) * 1000;
        const angle = Phaser.Math.Angle.Between(caster.x, caster.y, targetX, targetY);

        // Visual orientation before dashing
        if (targetX > caster.x && caster.lastScaleX !== -1) {
            caster.lastScaleX = -1;
            caster.sprite.scaleX = -1 * caster.baseScaleX;
        } else if (targetX < caster.x && caster.lastScaleX !== 1) {
            caster.lastScaleX = 1;
            caster.sprite.scaleX = 1 * caster.baseScaleX;
        }

        // Create an afterimage timer
        const afterimageTimer = caster.scene.time.addEvent({
            delay: 50,
            callback: () => {
                if (caster.scene && caster.scene.fxManager && caster.active) {
                    caster.scene.fxManager.createAfterimage(caster, 200, 0.4);
                }
            },
            loop: true
        });

        console.log(`[Skill] ${caster.unitName} uses Charge Attack! Dashing to cluster of ${bestCluster.count}.`);

        // Tween to destination
        caster.scene.tweens.add({
            targets: caster,
            x: targetX,
            y: targetY,
            duration: duration,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                afterimageTimer.remove();

                if (!caster.active) return;

                // Arrived! Play strike effect
                if (caster.scene.particleManager) {
                    caster.scene.particleManager.createWindSlash(caster.x, caster.y, angle);
                }

                // Deal Damage and CC
                if (caster.scene.aoeManager) {
                    const totalDamage = caster.atk * this.damageMultiplier;
                    const hitEnemies = caster.scene.aoeManager.triggerAoe(caster.x, caster.y, this.aoeRadius, totalDamage, caster.className);

                    if (caster.scene.ccManager) {
                        hitEnemies.forEach(hitEnemy => {
                            caster.scene.ccManager.applyAirborne(hitEnemy, this.ccDuration, this.ccHeight);
                        });
                    }
                }

                // Restore AI State
                if (caster.blackboard && previousState) {
                    caster.blackboard.set('ai_state', previousState);
                }
            }
        });

        return true; // Skill activated successfully
    }
}
