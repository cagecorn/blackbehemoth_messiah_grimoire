import Phaser from 'phaser';

/**
 * FXManager.js
 * Centralized manager for floating text and visual feedback in combat.
 */
export default class FXManager {
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Show high-resolution floating damage text.
     * @param {Phaser.GameObjects.GameObject} target 
     * @param {number} amount 
     * @param {string} color - Hex color string (e.g., '#ff0000')
     */
    showDamageText(target, amount, color = '#ff0000') {
        if (!target || !target.active) return;

        let displayAmount = typeof amount === 'number' ? `-${amount.toFixed(1)}` : amount;

        // Dynamic offset based on unit scale
        const scale = (target.config && target.config.scale) || 1;
        const yOffset = 40 * scale;

        // High-Resolution crisp text rendering technique:
        const text = this.scene.add.text(target.x, target.y - yOffset, displayAmount, {
            fontSize: '32px',
            fill: color,
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 5,
            resolution: 2
        }).setOrigin(0.5).setScale(0.5);

        // Ensure damage numbers are always on top of sprites
        text.setDepth(20000);

        this.scene.tweens.add({
            targets: text,
            y: target.y - yOffset - 40,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => text.destroy()
        });
    }

    /**
     * Show floating heal text.
     * @param {Phaser.GameObjects.GameObject} target 
     * @param {string} message - e.g., 'HEAL!' or '+20'
     * @param {string} color 
     */
    showHealText(target, message, color = '#00ff00') {
        if (!target || !target.active) return;

        const scale = (target.config && target.config.scale) || 1;
        const yOffset = 60 * scale;

        const text = this.scene.add.text(target.x, target.y - yOffset, message, {
            fontSize: '24px',
            fill: color,
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 4,
            resolution: 2
        }).setOrigin(0.5).setScale(0.5);

        text.setDepth(20001);

        this.scene.tweens.add({
            targets: text,
            y: target.y - yOffset - 40,
            alpha: 0,
            duration: 1000,
            onComplete: () => text.destroy()
        });
    }

    /**
     * Create an elliptical shadow for a unit.
     * @param {Phaser.GameObjects.GameObject} target - The unit to follow
     * @param {number} scale - Base scale multiplier
     */
    createShadow(target, scale = 1) {
        if (!target || !target.active) return null;

        // Position at feet: target is centered, so feet are at target.y + half height
        // Adjusted for high-res sprites that might have different base offsets
        const yOffset = target.shadowOffset !== undefined ? target.shadowOffset : (25 * scale);
        const shadow = this.scene.add.ellipse(target.x, target.y + yOffset, 40 * scale, 20 * scale, 0x000000, 0.5);
        shadow.setDepth(target.depth - 1); // Stay behind

        // Store ground height for airborne support
        shadow.groundY = target.y + yOffset;

        // Simple follow logic
        const updateListener = () => {
            if (!target.active || !shadow.active) {
                this.scene.events.off('postupdate', updateListener);
                shadow.destroy();
                return;
            }

            shadow.x = target.x;

            if (target.isAirborne) {
                shadow.y = shadow.groundY;
                const height = Math.abs(target.y + yOffset - shadow.y);
                shadow.alpha = Math.max(0.1, 0.5 - (height / 500));
                shadow.setScale(Math.max(0.5, 1 - (height / 400)));
            } else {
                shadow.y = target.y + yOffset;
                shadow.groundY = shadow.y;
                shadow.alpha = 0.5;
                shadow.setScale(1);
            }

            // Sync depth with unit's current depth
            shadow.setDepth(target.depth - 1);
        };

        this.scene.events.on('postupdate', updateListener);
        return shadow;
    }

    /**
     * Create an afterimage effect trailing behind a fast moving unit.
     */
    createAfterimage(target, duration = 300, alphaStart = 0.5) {
        if (!target || !target.sprite || !target.active) return;
        if (this.scene && this.scene.isUltimateActive) return;

        const image = this.scene.add.image(target.x, target.y, target.sprite.texture.key);
        image.setDisplaySize(target.sprite.displayWidth, target.sprite.displayHeight);
        image.scaleX = target.sprite.scaleX; // inherit flip
        image.scaleY = target.sprite.scaleY;
        image.setDepth(target.depth - 2); // behind the character and shadow
        image.setAlpha(alphaStart);
        image.setTint(0x88ccff); // slight wind/blue tint

        this.scene.tweens.add({
            targets: image,
            alpha: 0,
            duration: duration,
            ease: 'Linear',
            onComplete: () => image.destroy()
        });
    }

    /**
     * Create a rising sparkle particle effect over the target (e.g., for buffs).
     */
    createSparkleEffect(target) {
        if (!target || !target.active) return;

        // Since we don't have a specific sparkle texture defined yet, 
        // we can use a small graphics object or a default white particle.
        // For now, let's create a temporary graphics texture if it doesn't exist.
        if (!this.scene.textures.exists('sparkle_fx')) {
            const graphics = this.scene.add.graphics();
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('sparkle_fx', 8, 8);
            graphics.destroy();
        }

        const emitter = this.scene.add.particles(0, 0, 'sparkle_fx', {
            x: target.x,
            y: target.y - 30, // Start slightly above the center
            speed: { min: 20, max: 50 },
            angle: { min: 240, max: 300 }, // Shooting upwards
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 800,
            gravityY: -50,
            tint: [0xffff00, 0xffa500, 0xffffff], // Gold/yellow sparkles
            blendMode: 'ADD',
            quantity: 2,
            frequency: 50,
            duration: 500 // Stop emitting after 500ms
        });

        // Cleanup after emission finishes
        this.scene.time.delayedCall(1500, () => {
            if (emitter) emitter.destroy();
        });
    }

    /**
     * Create a stun effect (spinning stars) above the target.
     * @param {Phaser.GameObjects.GameObject} target 
     * @param {number} duration 
     */
    createStunEffect(target, duration) {
        if (!target || !target.active) return;

        const stars = [];
        const starCount = 3;
        const radius = 25;

        for (let i = 0; i < starCount; i++) {
            const star = this.scene.add.image(target.x, target.y - 40, 'emoji_star');
            star.setDisplaySize(16, 16);
            star.setDepth(target.depth + 1);
            stars.push(star);

            // Orbit and spin animation
            this.scene.tweens.add({
                targets: star,
                interpolation: 'bezier',
                props: {
                    x: {
                        value: {
                            getEnd: (target, key, value) => target.x,
                            getStart: (target, key, value) => target.x,
                        },
                        duration: 1000,
                        repeat: -1,
                        ease: (t) => Math.cos(t * Math.PI * 2 + (i / starCount) * Math.PI * 2) * radius
                    },
                    y: {
                        value: {
                            getEnd: (target, key, value) => target.y - 40,
                            getStart: (target, key, value) => target.y - 40,
                        },
                        duration: 1000,
                        repeat: -1,
                        ease: (t) => Math.sin(t * Math.PI * 2 + (i / starCount) * Math.PI * 2) * (radius / 3)
                    }
                }
            });

            // Self rotation
            this.scene.tweens.add({
                targets: star,
                angle: 360,
                duration: 800,
                repeat: -1
            });
        }

        // Cleanup listener to keep stars following the target
        const followListener = () => {
            if (!target.active || !target.isStunned) {
                this.scene.events.off('update', followListener);
                stars.forEach(s => s.destroy());
                return;
            }
            stars.forEach((star, idx) => {
                const time = this.scene.time.now / 1000;
                const angle = time * Math.PI * 2 + (idx / starCount) * Math.PI * 2;
                star.x = target.x + Math.cos(angle) * radius;
                star.y = target.y - 45 + Math.sin(angle) * (radius / 3);
                star.setDepth(target.depth + (Math.sin(angle) > 0 ? 1 : -1));
            });
        };
        this.scene.events.on('update', followListener);

        // Auto-disable stun after duration
        this.scene.time.delayedCall(duration, () => {
            if (target.active) {
                target.isStunned = false;
            }
        });
    }

    /**
     * Create an orbiting effect with specific textures.
     * @param {Phaser.GameObjects.GameObject} target 
     * @param {string[]} textures 
     * @param {number} duration 
     */
    createOrbitEffect(target, textures, duration) {
        if (!target || !target.active) return;

        const objects = [];
        const count = textures.length;
        const radius = 40;

        for (let i = 0; i < count; i++) {
            const obj = this.scene.add.image(target.x, target.y - 20, textures[i]);
            obj.setDisplaySize(24, 24);
            obj.setDepth(target.depth + 1);
            objects.push(obj);

            // Orbit tween
            this.scene.tweens.add({
                targets: obj,
                angle: 360,
                duration: 2000,
                repeat: -1
            });
        }

        const followListener = () => {
            if (!target.active || (this.scene.time.now > (target.orbitEndTime || 0))) {
                this.scene.events.off('update', followListener);
                objects.forEach(o => o.destroy());
                return;
            }
            objects.forEach((obj, idx) => {
                const time = this.scene.time.now / 1000;
                const angle = time * 3 + (idx / count) * Math.PI * 2;
                obj.x = target.x + Math.cos(angle) * radius;
                obj.y = target.y - 20 + Math.sin(angle) * (radius / 2);
                obj.setDepth(target.depth + (Math.sin(angle) > 0 ? 1 : -1));
            });
        };
        target.orbitEndTime = this.scene.time.now + duration;
        this.scene.events.on('update', followListener);
    }
}
