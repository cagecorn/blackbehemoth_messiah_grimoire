import Phaser from 'phaser';
import soundEffects from '../Core/SoundEffects.js';

/**
 * GuillotinePaper.js
 * Wrinkle's signature skill. Fires 9 "Guillotine Paper" projectiles in a 360-degree spread.
 * Projectiles have a red trail and apply Burn on hit.
 */
export default class GuillotinePaper {
    constructor(options = {}) {
        this.cooldown = options.cooldown || 7000;
        this.damageMultiplier = options.damageMultiplier || 1.2;
        this.projectileSpeed = options.projectileSpeed || 600;
        this.lastCastTime = 0;
    }

    getActualCooldown(castSpd) {
        const speedMultiplier = (castSpd || 1000) / 1000;
        return this.cooldown / Math.max(0.1, speedMultiplier);
    }

    getCooldownProgress(now, castSpd) {
        if (this.lastCastTime === 0) return 1;
        const cd = this.getActualCooldown(castSpd);
        const elapsed = now - this.lastCastTime;
        return Math.max(0, Math.min(1, elapsed / cd));
    }

    isReady(now, castSpd) {
        return this.getCooldownProgress(now, castSpd) >= 1;
    }

    execute(caster, target) {
        if (!caster || !caster.active || caster.hp <= 0) return false;

        const now = caster.scene.time.now;
        if (!this.isReady(now, caster.castSpd)) return false;

        this.lastCastTime = now;

        console.log(`[Skill] ${caster.unitName} uses Guillotine Paper!`);
        soundEffects.playWhipSound(); // Corrected: playWhipSound exists, playArrowSound doesn't

        const numProjectiles = 9;
        const angleStep = (Math.PI * 2) / numProjectiles;

        // Visual orientation
        if (target && target.x > caster.x) {
            caster.lastScaleX = -1;
            caster.sprite.scaleX = -1 * caster.baseScaleX;
        } else if (target && target.x < caster.x) {
            caster.lastScaleX = 1;
            caster.sprite.scaleX = 1 * caster.baseScaleX;
        }

        for (let i = 0; i < numProjectiles; i++) {
            const angle = i * angleStep;
            this.fireGuillotine(caster, angle);
        }

        return true;
    }

    fireGuillotine(caster, angle) {
        const startX = caster.x;
        const startY = caster.y;
        const distance = 800;
        const targetX = startX + Math.cos(angle) * distance;
        const targetY = startY + Math.sin(angle) * distance;

        // For Wrinkle, we use 'emoji_note' or a custom texture if it exists. 
        // User mentioned window.addDiamonds so I assume they can handle assets.
        // I'll use a placeholder or try to find a paper-like emoji.
        const type = 'emoji_note'; // Placeholder for paper

        const onHit = (target, damage) => {
            if (caster.scene.ccManager) {
                caster.scene.ccManager.applyBurn(target, 5000);
            }
            // Logic for Lightning Dash stack (Wrinkle specific)
            if (caster.addLightningStack) {
                caster.addLightningStack(target);
            }
        };

        const projectile = caster.scene.projectileManager.fire(
            startX, startY, targetX, targetY,
            caster.getTotalAtk() * this.damageMultiplier,
            type, false, caster.targetGroup, caster, onHit, false, 'fire'
        );

        if (projectile) {
            projectile.setTint(0xff3333); // Red tint for "Guillotine Paper"

            // Add custom trail
            const trail = caster.scene.time.addEvent({
                delay: 20,
                callback: () => {
                    if (projectile.active) {
                        const t = caster.scene.add.circle(projectile.x, projectile.y, 4, 0xff0000, 0.5);
                        caster.scene.tweens.add({
                            targets: t,
                            alpha: 0,
                            scale: 0.1,
                            duration: 200,
                            onComplete: () => t.destroy()
                        });
                    } else {
                        trail.remove();
                    }
                },
                loop: true
            });
        }
    }
}
