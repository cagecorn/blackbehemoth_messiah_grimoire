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

    /**
     * Applies a Shock effect to the target.
     * @param {Phaser.GameObjects.Container} target - The entity to be affected
     * @param {number} duration - How long the effect lasts in ms
     */
    applyShock(target, duration = 3000) {
        if (!target || !target.active || target.hp <= 0) return;

        console.log(`[CCManager] Attempting to apply Shock to ${target.unitName}...`);

        // Handle existing shock status
        if (target.isShocked) {
            // If already shocked, we want to refresh it.
            // Clear existing timers/tweens if they were stored (not currently stored, let's improve that)
            if (target._shockCleanupTimer) target._shockCleanupTimer.remove();
            if (target._shockShakeTween) target._shockShakeTween.stop();
            if (target._shockEmitter) target._shockEmitter.destroy();

            target.isShocked = false; // Reset briefly to re-apply everything fresh
        }

        target.isShocked = true;
        target.shockDuration = duration;
        if (target.syncStatusUI) target.syncStatusUI();

        // 1. Shake Visual
        // Reset X to 0 briefly if already shaking to get clean base
        if (target.sprite.x !== 0) target.sprite.x = 0;

        target._shockShakeTween = this.scene.tweens.add({
            targets: target.sprite,
            x: 4,
            duration: 50,
            yoyo: true,
            repeat: -1
        });

        // 2. Yellow Tint
        target.sprite.setTint(0xffff00);

        // 3. Particle Effect
        target._shockEmitter = this.scene.add.particles(0, 0, 'emoji_lightning', {
            speed: { min: 20, max: 80 },
            scale: { start: 0.6, end: 0.2 },
            alpha: { start: 1, end: 0 },
            lifespan: 500,
            frequency: 100,
            follow: target
        });
        target._shockEmitter.setDepth(3000);

        // Timer to handle cleanup
        target._shockCleanupTimer = this.scene.time.delayedCall(duration, () => {
            if (target && target.active) {
                target.isShocked = false;
                if (target.sprite) {
                    target.sprite.clearTint();
                    target.sprite.x = 0; // Reset to local center
                }
                if (target.syncStatusUI) target.syncStatusUI();
            }
            if (target._shockShakeTween) target._shockShakeTween.stop();
            if (target._shockEmitter) target._shockEmitter.destroy();

            target._shockCleanupTimer = null;
            target._shockShakeTween = null;
            target._shockEmitter = null;

            console.log(`[CCManager] Shock expired for ${target.unitName}`);
        });

        console.log(`[CCManager] Shock applied successfully to ${target.unitName} for ${duration}ms!`);
    }

    update(time, delta) {
        // Future expansion: we can track buffs/debuffs tick-by-tick here if needed
    }
}
