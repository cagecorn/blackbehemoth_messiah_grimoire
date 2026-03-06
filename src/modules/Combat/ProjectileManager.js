import Phaser from 'phaser';
import ItemManager from '../Core/ItemManager.js';
import equipmentManager from '../Core/EquipmentManager.js';

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

            // Route to Global Bloom Layer if available
            if (this.scene.skillFxLayer) {
                this.scene.skillFxLayer.add(projectile);
            }
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
     */
    fire(x, y, targetX, targetY, damage, type = 'archer', isMagic = false, targetGroup = null, shooter = null, onHitCallback = null, isUltimate = false, element = null, isCritical = false) {
        let projectile;
        const groupToHit = targetGroup || this.scene.enemies;

        // --- Centralized Synergy Check ---
        const inherentElement = element;
        let weaponElement = null;

        if (shooter && shooter.getWeaponPrefix) {
            const prefix = shooter.getWeaponPrefix();
            if (prefix) weaponElement = prefix.element;
        }

        // Final primary element for the projectile appearance & first hit
        let finalElement = inherentElement || weaponElement;

        // Synergy: Weapon adds a secondary hit IF the skill already has an inherent element
        let secondaryElement = (inherentElement && weaponElement) ? weaponElement : null;
        if (inherentElement && weaponElement) {
            console.log(`[Projectile] Elemental Synergy: ${inherentElement} + ${weaponElement}`);
        }

        // FUTURE: Handle 'Clone' Suffix (Recursive call or loop)
        // if (weaponSuffix === 'clone') { ... }

        if (type === 'laser') {
            // Draw an instant laser beam using Graphics
            const graphics = this.scene.add.graphics();

            // Route to Global Bloom Layer
            if (this.scene.skillFxLayer) {
                this.scene.skillFxLayer.add(graphics);
            }

            // Dynamic laser color based on element
            let laserColor = 0x00ffff; // Default Cyan
            if (finalElement === 'fire') laserColor = 0xff3300;
            else if (finalElement === 'ice') laserColor = 0x00bbff;
            else if (finalElement === 'lightning') laserColor = 0xffff00;

            graphics.lineStyle(4, laserColor, 1);

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
            this.checkHitAtTarget(targetX, targetY, damage, groupToHit, isMagic, shooter, onHitCallback, isUltimate, finalElement, isCritical, weaponElement);
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
            let size = (type === 'fireball' || type === 'emoji_fire') ? 48 : 32;

            // FUTURE: Handle 'Enhance' Suffix (Size increase)
            // if (weaponSuffix === 'enhance') size *= 1.5;

            if (projectile) {
                projectile.setDisplaySize(size, size);
                if (type === 'emoji_fire') projectile.setTint(0xff3300);
            }
        } else {
            const emoji = emojiMap[type] || (type.includes('fire') ? '🔥' : '🏹');
            projectile = this.getProjectile(emoji, x, y, true);

            // Apply elemental tint for notes and sparkles
            if ((type === 'emoji_note' || type === 'emoji_sparkle') && finalElement && this.scene.fxManager) {
                const colorStr = this.scene.fxManager.getElementColor(finalElement);
                if (colorStr) {
                    const hex = parseInt(colorStr.replace('#', '0x'), 16);
                    projectile.setTint(hex);
                }
            }
        }

        if (!projectile) return; // Should not happen unless pool max reached

        // Movement Logic (Normal Linear or Arc)
        const isEmoji = type.startsWith('emoji_');
        const movementType = (type === 'emoji_sparkle' || type === 'emoji_note' || isMagic || isEmoji) ? 'LINEAR' : 'ARC';

        if (movementType === 'LINEAR') {
            this.scene.tweens.add({
                targets: projectile,
                x: targetX,
                y: targetY,
                rotation: Phaser.Math.Angle.Between(x, y, targetX, targetY) + Math.PI / 2,
                duration: 400,
                ease: 'Linear',
                onUpdate: () => {
                    if (this.scene.fxManager && Math.random() > 0.5) {
                        if (finalElement) this.scene.fxManager.spawnElementalParticles(projectile.x, projectile.y, finalElement);
                        if (weaponElement && weaponElement !== finalElement) this.scene.fxManager.spawnElementalParticles(projectile.x, projectile.y, weaponElement);
                    }
                },
                onComplete: () => {
                    const hitCount = this.checkHitAtTarget(targetX, targetY, damage, groupToHit, isMagic, shooter, onHitCallback, isUltimate, finalElement, isCritical, weaponElement, projectile);

                    const config = (onHitCallback && typeof onHitCallback === 'object') ? onHitCallback : {};
                    const isPiercing = config.pierceCount && config.pierceCount > 0;

                    // Always release if it's a fixed target LINEAR move, 
                    // unless we implement "Through-Piercing" (which this is not).
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

                    if (this.scene.fxManager && Math.random() > 0.5) {
                        if (finalElement) this.scene.fxManager.spawnElementalParticles(projectile.x, projectile.y, finalElement);
                        if (weaponElement && weaponElement !== finalElement) this.scene.fxManager.spawnElementalParticles(projectile.x, projectile.y, weaponElement);
                    }
                },
                onComplete: () => {
                    const hitCount = this.checkHitAtTarget(targetX, targetY, damage, groupToHit, false, shooter, onHitCallback, isUltimate, finalElement, isCritical, weaponElement, projectile);

                    const config = (onHitCallback && typeof onHitCallback === 'object') ? onHitCallback : {};
                    const isPiercing = config.pierceCount && config.pierceCount > 0;

                    // Always release at end of ARC move
                    this.releaseProjectile(projectile);
                }
            });
        }
    }

    checkHitAtTarget(tx, ty, damage, targetGroup, isMagic, shooter, onHitCallback = null, isUltimate = false, element = null, isCritical = false, secondaryElement = null, projectile = null) {
        if (!targetGroup) return 0;

        const config = (onHitCallback && typeof onHitCallback === 'object') ? onHitCallback : {};
        const isPiercing = config.pierceCount && config.pierceCount > 0;

        const threshold = 80;
        const potentialTargets = targetGroup.getChildren().filter(e => e.active && e.hp > 0);

        let hitCount = 0;

        if (isPiercing) {
            if (projectile && !projectile.hitLog) projectile.hitLog = new Map();

            potentialTargets.forEach(e => {
                const dist = Phaser.Math.Distance.Between(e.x, e.y, tx, ty);
                let dynamicThreshold = threshold;
                if (e.scale > 1.2) dynamicThreshold += (e.scale - 1) * 30;

                if (dist <= dynamicThreshold) {
                    const now = this.scene.time.now;
                    const lastHit = projectile.hitLog.get(e) || 0;
                    const hitCooldown = config.hitCooldown || 150;

                    if (now - lastHit > hitCooldown) {
                        projectile.hitLog.set(e, now);
                        projectile.currentHits = (projectile.currentHits || 0) + 1;
                        this.handleHit(e, damage, isMagic, shooter, onHitCallback, isUltimate, element, isCritical, secondaryElement);
                        hitCount++;
                    }
                }
            });
        } else {
            const hitTarget = potentialTargets.find(e => {
                const dist = Phaser.Math.Distance.Between(e.x, e.y, tx, ty);
                let dynamicThreshold = threshold;
                if (e.scale > 1.2) dynamicThreshold += (e.scale - 1) * 30;
                return dist <= dynamicThreshold;
            });

            if (hitTarget) {
                this.handleHit(hitTarget, damage, isMagic, shooter, onHitCallback, isUltimate, element, isCritical, secondaryElement);
                hitCount = 1;
            }
        }
        return hitCount;
    }

    handleHit(target, damage, isMagic, shooter, onHitCallback = null, isUltimate = false, element = null, isCritical = false, secondaryElement = null) {
        if (!target) return;

        // Apply Primary Damage
        if (isMagic && target.takeMagicDamage) {
            target.takeMagicDamage(damage, shooter, isUltimate, element, isCritical, 0);
            // Synergy: Apply secondary element bonus from weapon
            if (secondaryElement) {
                target.takeMagicDamage(0, shooter, isUltimate, secondaryElement, isCritical, 150);
            }
        } else if (target.takeDamage) {
            target.takeDamage(damage, shooter, isUltimate, element, isCritical, 0);
            if (secondaryElement) {
                target.takeDamage(0, shooter, isUltimate, secondaryElement, isCritical, 150);
            }
        }

        // Execute additional hit effects
        if (typeof onHitCallback === 'function') {
            onHitCallback(target, damage, isUltimate);
        } else if (onHitCallback && typeof onHitCallback.onHit === 'function') {
            onHitCallback.onHit(target, damage, isUltimate);
        }
    }
}
