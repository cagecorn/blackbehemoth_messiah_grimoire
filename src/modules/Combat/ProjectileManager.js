import Phaser from 'phaser';

/**
 * ProjectileManager
 * Manages all projectiles in the scene.
 */
export default class ProjectileManager {
    constructor(scene) {
        this.scene = scene;
        this.projectiles = this.scene.physics.add.group();

        // Collision detection for both groups
        // In Arena, projectiles from both teams can hit either group depending on targetGroup
        this.scene.physics.add.overlap(this.projectiles, this.scene.enemies, this.handlePhysicsHit, null, this);
        this.scene.physics.add.overlap(this.projectiles, this.scene.mercenaries, this.handlePhysicsHit, null, this);
    }

    handlePhysicsHit(projectile, target) {
        // Fallback for physics-based projectiles if any are added to this.projectiles group
        this.handleHit(target, projectile.damage || 0, projectile.isMagic || false, projectile.shooter);
        projectile.destroy();
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
     */
    fire(x, y, targetX, targetY, damage, type = 'archer', isMagic = false, targetGroup = null, shooter = null) {
        let projectile;
        const groupToHit = targetGroup || this.scene.enemies;

        if (type === 'laser') {
            // Draw an instant laser beam using Graphics
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
            this.checkHitAtTarget(targetX, targetY, damage, groupToHit, isMagic, shooter);
            return; // Skip standard projectile logic
        }

        // Map 'fireball' to existing 'emoji_fire' asset if not explicitly provided
        if (type === 'fireball' && !this.scene.textures.exists('fireball')) {
            type = 'emoji_fire';
        }

        const imageTypes = ['emoji_sparkle', 'emoji_note', 'emoji_fire', 'fireball', 'laser_ball'];
        const emojiMap = {
            'archer': '🏹',
            'meteor': '☄️',
            'fire': '🔥',
            'fireball': '🔥',
            'emoji_fire': '🔥'
        };

        // Check if image/texture actually exists in the scene
        if (imageTypes.includes(type) && this.scene.textures.exists(type)) {
            projectile = this.scene.add.image(x, y, type);
            const size = (type === 'fireball' || type === 'emoji_fire') ? 48 : 24;
            projectile.setDisplaySize(size, size);
            if (type === 'emoji_fire') projectile.setTint(0xffaa00);
        } else {
            const emoji = emojiMap[type] || (type.includes('fire') ? '🔥' : '🏹');
            projectile = this.scene.add.text(x, y, emoji, { fontSize: '24px' });
            projectile.setOrigin(0.5); // Center text for better rotation behavior
        }

        if (type === 'emoji_sparkle' || type === 'emoji_note' || isMagic) {
            this.scene.tweens.add({
                targets: projectile,
                x: targetX,
                y: targetY,
                rotation: Phaser.Math.Angle.Between(x, y, targetX, targetY) + Math.PI / 2,
                duration: 400,
                ease: 'Linear',
                onComplete: () => {
                    this.checkHitAtTarget(targetX, targetY, damage, groupToHit, isMagic, shooter);
                    projectile.destroy();
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
                    this.checkHitAtTarget(targetX, targetY, damage, groupToHit, false, shooter);
                    projectile.destroy();
                }
            });
        }
    }

    checkHitAtTarget(tx, ty, damage, targetGroup, isMagic, shooter) {
        if (!targetGroup) return;

        const threshold = 80; // Increased for better feel in Arena
        const hitTarget = targetGroup.getChildren().find(e =>
            e.active && e.hp > 0 && Phaser.Math.Distance.Between(e.x, e.y, tx, ty) <= threshold
        );

        if (hitTarget) {
            this.handleHit(hitTarget, damage, isMagic, shooter);
        }
    }

    handleHit(target, damage, isMagic, shooter) {
        if (target) {
            if (isMagic && target.takeMagicDamage) {
                target.takeMagicDamage(damage, shooter);
            } else if (target.takeDamage) {
                target.takeDamage(damage, shooter);
            }
        }
    }
}
