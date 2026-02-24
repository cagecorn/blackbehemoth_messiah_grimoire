import Phaser from 'phaser';

/**
 * ProjectileManager
 * Manages all projectiles in the scene using Object Pooling to minimize GC spikes.
 */
export default class ProjectileManager {
    constructor(scene) {
        this.scene = scene;

        // Image Pool (for sprites/textures)
        this.imagePool = this.scene.add.group({
            classType: Phaser.GameObjects.Image,
            maxSize: 100,
            runChildUpdate: false
        });

        // Text Pool (for emoji text)
        this.textPool = this.scene.add.group({
            classType: Phaser.GameObjects.Text,
            maxSize: 50,
            runChildUpdate: false
        });
    }

    /**
     * Retrieves an inactive projectile from the pool or creates a new one.
     * @param {string} type The texture key or text content.
     * @param {number} x X position
     * @param {number} y Y position
     * @param {boolean} isText Whether it is a text object
     */
    getProjectile(type, x, y, isText = false) {
        let projectile;
        if (isText) {
            projectile = this.textPool.get(x, y);
            if (projectile) {
                projectile.setText(type);
                projectile.setFontSize('24px');
                projectile.setOrigin(0.5);
            }
        } else {
            projectile = this.imagePool.get(x, y, type);
            if (projectile) {
                projectile.setTexture(type);
            }
        }

        if (projectile) {
            projectile.setActive(true).setVisible(true);
            projectile.setAlpha(1);
            projectile.setScale(1);
            projectile.setRotation(0);
            projectile.setTint(0xffffff); // Reset tint
        }
        return projectile;
    }

    /**
     * Releases a projectile back to the pool.
     */
    releaseProjectile(projectile) {
        if (!projectile) return;
        this.scene.tweens.killTweensOf(projectile);
        projectile.setActive(false).setVisible(false);
        projectile.setPosition(-1000, -1000); // Move offscreen
    }

    /**
     * Fire a projectile.
     * @param {number} x Start X
     * @param {number} y Start Y
     * @param {number} targetX End X
     * @param {number} targetY End Y
     * @param {number} damage Damage amount
     * @param {string} type 'archer' or 'emoji_sparkle'
     * @param {Boolean} isMagic Whether this is a magic attack
     * @param {Phaser.GameObjects.Group} targetGroup The group to hit (mercenaries or enemies)
     * @param {Object} shooter The shooter object for Miss/Kill attribution
     * @param {Function} onHitCallback Optional callback when a hit is confirmed (target, damage)
     */
    fire(x, y, targetX, targetY, damage, type = 'archer', isMagic = false, targetGroup = null, shooter = null, onHitCallback = null) {
        let projectile;
        const groupToHit = targetGroup || this.scene.enemies;

        if (type === 'laser') {
            // Draw an instant laser beam using Graphics
            // Graphics are cheap to create/destroy occasionally, keeping as is for now
            const graphics = this.scene.add.graphics();
            graphics.lineStyle(4, 0x00ffff, 1); // Cyan laser

            // Draw the line from shooter to target
            graphics.beginPath();
            graphics.moveTo(x, y);
            graphics.lineTo(targetX, targetY);
            graphics.strokePath();

            // Laser fades out quickly
            this.scene.tweens.add({
                targets: graphics,
                alpha: 0,
                duration: 200,
                ease: 'Power2',
                onComplete: () => {
                    graphics.destroy();
                }
            });

            // Instant hit calculation
            this.checkHitAtTarget(targetX, targetY, damage, groupToHit, isMagic, shooter, onHitCallback);
            return; // Skip standard projectile logic
        }

        // Map 'fireball' to existing 'emoji_fire' asset if not explicitly provided
        if (type === 'fireball' && !this.scene.textures.exists('fireball')) {
            type = 'emoji_fire';
        }

        const emojiMap = {
            'archer': '🏹',
            'meteor': '☄️',
            'fire': '🔥',
            'fireball': '🔥',
            'emoji_fire': '🔥'
        };

        // Check if image/texture actually exists in the scene
        const textureExists = this.scene.textures.exists(type);

        if (textureExists) {
            projectile = this.getProjectile(type, x, y, false);
            // Default size 32 for general emojis, special cases for larger ones
            const size = (type === 'fireball' || type === 'emoji_fire') ? 48 : 32;
            if (projectile) {
                projectile.setDisplaySize(size, size);
                if (type === 'emoji_fire') projectile.setTint(0xffaa00);
            }
        } else {
            const emoji = emojiMap[type] || (type.includes('fire') ? '🔥' : '🏹');
            projectile = this.getProjectile(emoji, x, y, true);
        }

        if (!projectile) return; // Should not happen unless pool max reached and strict

        // Linear movement for magic, sparkles, notes, OR if it's a known emoji texture (herd effect)
        const isEmoji = type.startsWith('emoji_');
        if (type === 'emoji_sparkle' || type === 'emoji_note' || isMagic || isEmoji) {
            this.scene.tweens.add({
                targets: projectile,
                x: targetX,
                y: targetY,
                rotation: Phaser.Math.Angle.Between(x, y, targetX, targetY) + Math.PI / 2,
                duration: 400,
                ease: 'Linear',
                onComplete: () => {
                    this.checkHitAtTarget(targetX, targetY, damage, groupToHit, isMagic, shooter, onHitCallback);
                    this.releaseProjectile(projectile);
                }
            });
        } else {
            const midX = (x + targetX) / 2;
            const midY = Math.min(y, targetY) - 100;

            this.scene.tweens.addCounter({
                from: 0,
                to: 1,
                duration: 600,
                ease: 'Linear',
                onUpdate: (tween) => {
                    const t = tween.getValue();
                    const currX = Math.pow(1 - t, 2) * x + 2 * (1 - t) * t * midX + Math.pow(t, 2) * targetX;
                    const currY = Math.pow(1 - t, 2) * y + 2 * (1 - t) * t * midY + Math.pow(t, 2) * targetY;
                    projectile.setPosition(currX, currY);

                    const nextT = t + 0.05;
                    if (nextT <= 1) {
                        const nextX = Math.pow(1 - nextT, 2) * x + 2 * (1 - nextT) * nextT * midX + Math.pow(nextT, 2) * targetX;
                        const nextY = Math.pow(1 - nextT, 2) * y + 2 * (1 - nextT) * nextT * midY + Math.pow(nextT, 2) * targetY;
                        projectile.setRotation(Phaser.Math.Angle.Between(currX, currY, nextX, nextY) + Math.PI / 4);
                    }
                },
                onComplete: () => {
                    this.checkHitAtTarget(targetX, targetY, damage, groupToHit, false, shooter, onHitCallback);
                    this.releaseProjectile(projectile);
                }
            });
        }
    }

    checkHitAtTarget(tx, ty, damage, targetGroup, isMagic, shooter, onHitCallback = null) {
        if (!targetGroup) return;

        const threshold = 80; // Increased for better feel in Arena
        const hitTarget = targetGroup.getChildren().find(e => {
            if (!e.active || e.hp <= 0) return false;
            const dist = Phaser.Math.Distance.Between(e.x, e.y, tx, ty);

            // Account for target size:
            // 1. Minimum logical threshold (80)
            // 2. Add extra buffer for large units (scale > 1)
            let dynamicThreshold = threshold;
            if (e.scale > 1.2) {
                dynamicThreshold += (e.scale - 1) * 30; // Bosses get a much larger hit area
            }

            return dist <= dynamicThreshold;
        });

        if (hitTarget) {
            this.handleHit(hitTarget, damage, isMagic, shooter, onHitCallback);
        }
    }

    handleHit(target, damage, isMagic, shooter, onHitCallback = null) {
        if (target) {
            if (isMagic && target.takeMagicDamage) {
                target.takeMagicDamage(damage, shooter);
            } else if (target.takeDamage) {
                target.takeDamage(damage, shooter);
            }

            // Execute additional hit effects
            if (onHitCallback) {
                onHitCallback(target, damage);
            }
        }
    }
}
