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
        const scene = caster.scene;
        const startX = caster.x;
        const startY = caster.y;
        const distance = 800;
        const targetX = startX + Math.cos(angle) * distance;
        const targetY = startY + Math.sin(angle) * distance;

        const blade = scene.add.image(startX, startY, 'guillotine_paper')
            .setOrigin(0.5)
            .setDepth(16000)
            .setDisplaySize(50, 25)
            .setRotation(angle);

        const hitEnemies = new Set();
        const damage = caster.getTotalAtk() * this.damageMultiplier;

        scene.tweens.add({
            targets: blade,
            x: targetX,
            y: targetY,
            duration: 1000,
            ease: 'Linear',
            onUpdate: () => {
                if (!blade.active) return;

                // 1. Trail Visuals (Denser & Custom)
                if (scene.time.now % 40 < 20) {
                    if (scene.fxManager && scene.fxManager.createAfterimage) {
                        scene.fxManager.createAfterimage({
                            x: blade.x, y: blade.y, sprite: blade, active: true, depth: blade.depth
                        }, 400, 0.4);
                    }
                    const drip = scene.add.circle(blade.x, blade.y, 3, 0x880000, 0.8);
                    scene.tweens.add({
                        targets: drip,
                        y: drip.y + 20,
                        alpha: 0,
                        duration: 500,
                        onComplete: () => drip.destroy()
                    });
                }

                // 2. Traversal Hit Detection
                const enemies = caster.targetGroup.getChildren().filter(e => e.active && e.hp > 0);
                enemies.forEach(enemy => {
                    if (hitEnemies.has(enemy)) return;
                    const dist = Phaser.Math.Distance.Between(blade.x, blade.y, enemy.x, enemy.y);
                    if (dist < 40) {
                        hitEnemies.add(enemy);

                        // Apply Damage
                        if (enemy.takeDamage) {
                            // Neutral element (null) to inherit/synergize with weapon
                            enemy.takeDamage(damage, caster, false, null, Math.random() < caster.getTotalCrit() / 100);
                        }

                        // Apply Burn
                        if (scene.ccManager) {
                            scene.ccManager.applyBurn(enemy, 5000);
                        }

                        // Passive Stack
                        if (caster.addLightningStack) {
                            caster.addLightningStack(enemy);
                        }

                        // Blood Visuals
                        if (scene.fxManager && scene.fxManager.spawnBloodParticles) {
                            scene.fxManager.spawnBloodParticles(enemy.x, enemy.y, 12);
                        }
                    }
                });
            },
            onComplete: () => {
                blade.destroy();
            }
        });
    }
}
