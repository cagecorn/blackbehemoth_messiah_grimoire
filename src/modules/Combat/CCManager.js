import Phaser from 'phaser';

/**
 * CCManager.js
 * Handles Crowd Control (CC) status effects for entities.
 */
export default class CCManager {
    constructor(scene) {
        this.scene = scene;
        this.activeCCs = [];
    }

    /**
     * Applies an Airborne effect to the target.
     * @param {Phaser.GameObjects.Container} target - The entity to be affected
     * @param {number} duration - How long the effect lasts in ms
     * @param {number} height - How high the sprite goes
     */
    applyAirborne(target, duration = 1000, height = 60) {
        if (!target || !target.active || target.hp <= 0) return;

        // Prevent overriding an existing airborne unless we want to reset it
        if (target.isAirborne) {
            // Note: Simplistic approach - we just let the current tween finish
            return;
        }

        target.isAirborne = true;
        if (target.syncStatusUI) target.syncStatusUI();

        // Interrupt current velocity
        if (target.body) {
            target.body.setVelocity(0, 0);
        }

        const originalY = target.sprite.y;

        // Tween the sprite visually upwards
        this.scene.tweens.add({
            targets: target.sprite,
            y: originalY - height,
            duration: duration * 0.4,
            ease: 'Cubic.easeOut',
            yoyo: true,
            hold: duration * 0.2,
            onComplete: () => {
                if (target && target.active) {
                    target.sprite.y = originalY;
                    target.isAirborne = false;
                    if (target.syncStatusUI) target.syncStatusUI();
                }
            }
        });

        console.log(`[CCManager] Applied Airborne to ${target.unitName} for ${duration}ms!`);
    }

    /**
     * Applies a Knockback effect to the target, pushing them away.
     * @param {Phaser.GameObjects.Container} target - The entity to be affected
     * @param {number} angle - The angle (radians) of the impact
     * @param {number} distance - How far to push the target
     * @param {number} duration - How fast they are pushed in ms
     */
    applyKnockback(target, angle, distance = 150, duration = 300) {
        if (!target || !target.active || target.hp <= 0) return;

        if (target.isKnockedBack) {
            return; // Ignore if already being knocked back
        }

        target.isKnockedBack = true;
        if (target.syncStatusUI) target.syncStatusUI();

        // Interpret current velocity to zero to stop them immediately
        if (target.body) {
            target.body.setVelocity(0, 0);
        }

        // Calculate push destination
        const destX = target.x + Math.cos(angle) * distance;
        const destY = target.y + Math.sin(angle) * distance;

        // Visual flash
        this.scene.tweens.add({
            targets: target.sprite,
            tint: 0xffaaaa,
            duration: 100,
            yoyo: true,
            onComplete: () => {
                if (target.sprite) target.sprite.clearTint();
            }
        });

        // Push tween
        this.scene.tweens.add({
            targets: target,
            x: destX,
            y: destY,
            duration: duration,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                if (target && target.active) {
                    target.isKnockedBack = false;
                    if (target.syncStatusUI) target.syncStatusUI();
                }
            }
        });

        console.log(`[CCManager] Applied Knockback to ${target.unitName}!`);
    }

    update(time, delta) {
        // Future expansion: we can track buffs/debuffs tick-by-tick here if needed
    }
}
