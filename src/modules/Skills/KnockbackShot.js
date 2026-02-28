import Phaser from 'phaser';
import soundEffects from '../Core/SoundEffects.js';

/**
 * KnockbackShot.js
 * A skill for the Archer that fires a large, piercing arrow in a straight line,
 * knocking back enemies on impact.
 */
export default class KnockbackShot {
    constructor(options = {}) {
        this.cooldown = options.cooldown || 6000;
        this.damageMultiplier = options.damageMultiplier || 2.0;
        this.projectileSpeed = options.projectileSpeed || 800; // Fast!
        this.knockbackDistance = options.knockbackDistance || 150;
        this.knockbackDuration = options.knockbackDuration || 300;
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
     * Executes the Knockback Shot.
     * @param {Phaser.GameObjects.Container} caster - Who is using the skill
     * @param {Phaser.GameObjects.Container} target - The main target to aim at
     */
    execute(caster, target) {
        if (!caster || !caster.active || caster.hp <= 0) return false;
        if (!target || !target.active || target.hp <= 0) return false;

        const now = caster.scene.time.now;
        if (!this.isReady(now, caster.castSpd)) {
            return false; // Still on cooldown
        }

        this.lastCastTime = now;

        console.log(`[Skill] ${caster.unitName} uses Knockback Shot!`);
        soundEffects.playGunshotSound();

        const startX = caster.x;
        const startY = caster.y;
        const targetX = target.x;
        const targetY = target.y;

        // Visual orientation before firing
        if (targetX > caster.x && caster.lastScaleX !== -1) {
            caster.lastScaleX = -1;
            caster.sprite.scaleX = -1 * caster.baseScaleX;
        } else if (targetX < caster.x && caster.lastScaleX !== 1) {
            caster.lastScaleX = 1;
            caster.sprite.scaleX = 1 * caster.baseScaleX;
        }

        const angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);

        // Calculate destination far offscreen based on the angle (straight line)
        const distanceToEdge = 2000;
        const endX = startX + Math.cos(angle) * distanceToEdge;
        const endY = startY + Math.sin(angle) * distanceToEdge;
        const travelDuration = (distanceToEdge / this.projectileSpeed) * 1000;

        // Create the giant arrow
        const projectile = caster.scene.add.text(startX, startY, '🏹', { fontSize: '48px' });
        projectile.setOrigin(0.5, 0.5);
        // Adjust rotation because the emoji usually points top-right or right
        projectile.setRotation(angle + Math.PI / 4);

        // Add physics body for collision check
        caster.scene.physics.add.existing(projectile);
        // Make body large enough to hit easily
        projectile.body.setCircle(24);
        projectile.body.setOffset(-12, -12);

        // Keep track of enemies already hit to prevent multi-hits on the same target
        const hitEnemies = new Set();

        // Trail effect
        const trailTimer = caster.scene.time.addEvent({
            delay: 30,
            callback: () => {
                if (!projectile || !projectile.active || !projectile.scene) return;
                const trail = projectile.scene.add.circle(projectile.x, projectile.y, 8, 0xff3300, 0.6);
                projectile.scene.tweens.add({
                    targets: trail,
                    alpha: 0,
                    scale: 0.1,
                    duration: 300,
                    onComplete: () => trail.destroy()
                });
            },
            loop: true
        });

        // Tween the projectile
        caster.scene.tweens.add({
            targets: projectile,
            x: endX,
            y: endY,
            duration: travelDuration,
            ease: 'Linear',
            onUpdate: () => {
                if (!projectile || !projectile.active || !projectile.scene || !projectile.scene.scene || !projectile.scene.scene.isActive()) {
                    if (projectile && projectile.active && projectile.scene && projectile.scene.scene && !projectile.scene.scene.isActive()) {
                        projectile.destroy();
                    }
                    return;
                }

                const opposingGroup = caster.targetGroup;
                if (!opposingGroup) {
                    if (!this._warnedTargetGroup) {
                        console.error(`[KnockbackShot] CRITICAL: targetGroup is NULL for ${caster.unitName}`);
                        this._warnedTargetGroup = true;
                    }
                    return;
                }

                if (!opposingGroup.getChildren) {
                    console.error(`[KnockbackShot] CRITICAL: targetGroup is NOT a Phaser Group!`, opposingGroup);
                    return;
                }

                // Continuous overlap check manually for piercing effect
                opposingGroup.getChildren().forEach(unit => {
                    if (unit && unit.active && unit.hp > 0 && !hitEnemies.has(unit)) {
                        const dist = Phaser.Math.Distance.Between(projectile.x, projectile.y, unit.x, unit.y);
                        if (dist < 80) { // Collision radius
                            hitEnemies.add(unit);
                            console.log(`[KnockbackShot] HIT SUCCESS: ${unit.unitName} (Team: ${unit.team})`);

                            // Deal damage
                            const totalAtk = caster.getTotalAtk ? caster.getTotalAtk() : caster.atk;
                            const totalDamage = totalAtk * this.damageMultiplier;

                            // Check for weapon element
                            let weaponElement = null;
                            if (caster && caster.getWeaponPrefix) {
                                const prefix = caster.getWeaponPrefix();
                                if (prefix) weaponElement = prefix.element;
                            }

                            if (unit.takeDamage) {
                                unit.takeDamage(totalDamage, caster, false, weaponElement);
                            } else {
                                console.error(`[KnockbackShot] Unit ${unit.unitName} lacks takeDamage method!`);
                            }

                            // Apply Knockback
                            if (projectile.scene.ccManager) {
                                projectile.scene.ccManager.applyKnockback(unit, angle, this.knockbackDistance, this.knockbackDuration);
                            }
                        }
                    }
                });
            },
            onComplete: () => {
                if (trailTimer) trailTimer.remove();
                if (projectile && projectile.active) {
                    projectile.destroy();
                }
            }
        });

        return true;
    }
}
