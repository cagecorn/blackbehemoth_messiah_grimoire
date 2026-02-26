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
     * Get hex color for a specific element.
     * @param {string} element 
     * @returns {string} Hex color string
     */
    getElementColor(element) {
        switch (element) {
            case 'fire': return '#ff3300'; // Pure Red/Orange Red
            case 'ice': return '#00bbff';  // Blue
            case 'lightning': return '#ffff00'; // Yellow
            default: return null;
        }
    }

    /**
     * Show high-resolution floating damage text.
     * @param {Phaser.GameObjects.GameObject} target 
     * @param {number} amount 
     * @param {string} color - Hex color string (e.g., '#ff0000')
     * @param {boolean} isCritical - Whether this is a critical hit
     * @param {number} offsetX - Optional horizontal offset for dual text
     * @param {number} delay - Delay before showing the text (ms)
     */
    showDamageText(target, amount, color = '#ff0000', isCritical = false, offsetX = 0, delay = 0) {
        if (!target || !target.active) return;

        // Prevent showing 0 damage texts if it's just for a secondary effect (unless it's an intentional text)
        if (typeof amount === 'number' && amount <= 0 && offsetX === 0) return;

        let displayAmount = typeof amount === 'number' ? `-${amount.toFixed(1)}` : amount;

        // Dynamic offset based on unit scale
        const scale = (target.config && target.config.scale) || 1;
        const yOffset = 40 * scale;

        // Add a tiny random jitter to the position so overlapping texts are visible
        const jitterX = (Math.random() - 0.5) * 10;
        const jitterY = (Math.random() - 0.5) * 10;

        // High-Resolution crisp text rendering technique:
        const fontSize = isCritical ? '48px' : '32px';
        const text = this.scene.add.text(target.x + offsetX + jitterX, target.y - yOffset + jitterY, displayAmount, {
            fontSize: fontSize,
            fill: color,
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: isCritical ? 7 : 5,
            resolution: 2
        }).setOrigin(0.5).setScale(0.5).setAlpha(0);

        if (delay > 0) {
            this.scene.time.delayedCall(delay, () => {
                if (text && text.active) this.animateDamageText(text, target, yOffset, isCritical);
            });
        } else {
            this.animateDamageText(text, target, yOffset, isCritical);
        }
    }

    animateDamageText(text, target, yOffset, isCritical) {
        text.setAlpha(1);
        if (isCritical) {
            // Give critical hits a little "pop" animation
            this.scene.tweens.add({
                targets: text,
                scale: 0.8,
                duration: 100,
                yoyo: true,
                ease: 'Back.easeOut'
            });
        }

        // Ensure damage numbers are always on top of sprites
        text.setDepth(20000);

        this.scene.tweens.add({
            targets: text,
            y: '-=40',
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => text.destroy()
        });
    }

    /**
     * Spawn elemental particles on hit.
     * @param {number} x 
     * @param {number} y 
     * @param {string} element - 'fire', 'ice', 'lightning'
     */
    spawnElementalParticles(x, y, element) {
        if (!element) return;

        const textureMap = {
            'fire': 'emoji_fire',
            'ice': 'emoji_snowball',
            'lightning': 'emoji_lightning'
        };

        const texture = textureMap[element] || 'emoji_sparkle';
        const count = 6;

        for (let i = 0; i < count; i++) {
            const particle = this.scene.add.image(x, y, texture);
            particle.setDisplaySize(8, 8);
            particle.setAlpha(0.5); // 50% opacity for subtle glow
            particle.setBlendMode('ADD'); // Linear Dodge effect

            // Apply red tint to fire to distinguish from lightning
            if (element === 'fire') {
                particle.setTint(0xff3300);
            }

            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 80;

            this.scene.physics.add.existing(particle);
            particle.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            particle.body.setDrag(80);
            particle.setRotation(Math.random() * Math.PI * 2);

            this.scene.tweens.add({
                targets: particle,
                alpha: 0,
                scale: 0.2,
                angle: '+=90',
                duration: 500 + Math.random() * 500,
                onComplete: () => particle.destroy()
            });
        }
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
            star.setDisplaySize(8, 8);
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

    /**
     * Show a popping emoji animation above the target.
     * @param {Phaser.GameObjects.GameObject} target 
     * @param {string} emoji - The emoji string (e.g., '🍔')
     */
    showEmojiPopup(target, emoji) {
        if (!target || !target.active) return;

        const scale = (target.config && target.config.scale) || 1;
        const initialYOffset = 70 * scale;

        const text = this.scene.add.text(target.x, target.y - initialYOffset, emoji, {
            fontSize: '44px',
            resolution: 2
        }).setOrigin(0.5).setScale(0).setAlpha(0);

        text.setDepth(20002);

        // Tracking state
        let currentYOffset = initialYOffset;
        let wobbleX = 0;

        // Follow listener to keep emoji attached to moving unit
        const followListener = () => {
            if (!target.active || !text.active) {
                this.scene.events.off('postupdate', followListener);
                return;
            }
            text.x = target.x + wobbleX;
            text.y = target.y - currentYOffset;
        };
        this.scene.events.on('postupdate', followListener);

        // Primary animation: Pop up and fade to 50% opacity
        this.scene.tweens.add({
            targets: text,
            scale: 1,
            alpha: 0.5,
            duration: 600,
            ease: 'Back.easeOut'
        });

        // Floating animation via currentYOffset
        this.scene.tweens.add({
            targets: { y: initialYOffset },
            y: initialYOffset + 80,
            duration: 1800,
            ease: 'Sine.easeIn',
            onUpdate: (tween) => {
                currentYOffset = tween.getValue();
            },
            onComplete: () => {
                this.scene.events.off('postupdate', followListener);
                text.destroy();
            }
        });

        // Slow fade out
        this.scene.tweens.add({
            targets: text,
            alpha: 0,
            duration: 1000,
            delay: 800
        });

        // Subtle horizontal wobble
        this.scene.tweens.add({
            targets: { x: 0 },
            x: 10,
            duration: 800,
            yoyo: true,
            repeat: 1,
            ease: 'Sine.easeInOut',
            onUpdate: (tween) => {
                wobbleX = tween.getValue();
            }
        });
    }

    /**
     * Show green healing particles around the target.
     * @param {Phaser.GameObjects.GameObject} target 
     */
    showHealEffect(target) {
        if (!target || !target.active) return;

        // Use the existing sparkle technique but with green tint
        if (!this.scene.textures.exists('sparkle_fx')) {
            const graphics = this.scene.add.graphics();
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('sparkle_fx', 8, 8);
            graphics.destroy();
        }

        const emitter = this.scene.add.particles(0, 0, 'sparkle_fx', {
            x: target.x,
            y: target.y,
            speed: { min: 30, max: 100 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 1000,
            gravityY: -100,
            tint: [0x55ff55, 0x00ff00, 0xaaffaa], // Green shades
            blendMode: 'ADD',
            quantity: 10,
            emitting: false
        });

        emitter.setDepth(target.depth + 1);
        emitter.explode(15);

        this.scene.time.delayedCall(1500, () => {
            if (emitter) emitter.destroy();
        });
    }
}
