import Phaser from 'phaser';

/**
 * ProjectileManager
 * Manages all projectiles in the scene.
 */
export default class ProjectileManager {
    constructor(scene) {
        this.scene = scene;
        this.projectiles = this.scene.physics.add.group();

        // Collision detection
        this.scene.physics.add.overlap(this.projectiles, this.scene.enemies, this.handleHit, null, this);
    }

    /**
     * Fire a projectile.
     * @param {number} x Start X
     * @param {number} y Start Y
     * @param {number} targetX End X
     * @param {number} targetY End Y
     * @param {number} damage Damage amount
     * @param {string} type 'archer' or 'emoji_sparkle'
     * @param {boolean} isMagic Whether this is a magic attack
     * @param {Phaser.GameObjects.Group} targetGroup The group to hit (mercenaries or enemies)
     */
    fire(x, y, targetX, targetY, damage, type = 'archer', isMagic = false, targetGroup = null) {
        let projectile;
        const groupToHit = targetGroup || this.scene.enemies;

        if (type === 'emoji_sparkle') {
            projectile = this.scene.add.image(x, y, 'emoji_sparkle');
            projectile.setDisplaySize(24, 24);
        } else {
            projectile = this.scene.add.text(x, y, '🏹', { fontSize: '24px' });
        }

        if (type === 'emoji_sparkle' || isMagic) {
            this.scene.tweens.add({
                targets: projectile,
                x: targetX,
                y: targetY,
                rotation: Phaser.Math.Angle.Between(x, y, targetX, targetY) + Math.PI / 2,
                duration: 400,
                ease: 'Linear',
                onComplete: () => {
                    this.checkHitAtTarget(targetX, targetY, damage, groupToHit, isMagic);
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
                    this.checkHitAtTarget(targetX, targetY, damage, groupToHit, false);
                    projectile.destroy();
                }
            });
        }
    }

    checkHitAtTarget(tx, ty, damage, targetGroup, isMagic) {
        const threshold = 50;
        const hitTarget = targetGroup.getChildren().find(e =>
            e.active && e.hp > 0 && Phaser.Math.Distance.Between(e.x, e.y, tx, ty) <= threshold
        );

        if (hitTarget) {
            this.handleHit(hitTarget, damage, isMagic);
        }
    }

    handleHit(target, damage, isMagic) {
        if (target) {
            if (isMagic && target.takeMagicDamage) {
                target.takeMagicDamage(damage);
            } else if (target.takeDamage) {
                target.takeDamage(damage);
            }
        }
    }
}
