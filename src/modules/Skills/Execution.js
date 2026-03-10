import Phaser from 'phaser';
import soundEffects from '../Core/SoundEffects.js';

/**
 * Execution.js
 * Wrinkle's Ultimate Skill (Redesigned). 
 * 10 high-speed dashes across the screen, slashing through enemies.
 * Inspired by FatesString and Magenta Drive.
 */
export default class Execution {
    constructor(caster) {
        this.caster = caster;
        this.strikeDamageMult = 1.0;
        this.numStrikes = 10;
    }

    async execute(scene, caster) {
        if (!caster || !caster.active || !scene) return;

        console.log(`[Ultimate] ${caster.unitName} activates Redesigned Execution!`);

        // 1. Play dramatic cutscene
        if (scene.ultimateManager) {
            await scene.ultimateManager.playCutscene(caster, '처형 (Execution)');
        }

        if (!caster.active || !scene) return;

        caster.isStunned = true; // Prevent player from breaking the animation
        const originalX = caster.x;
        const originalY = caster.y;
        
        // Fix: Capture actual scale (including sign) to preserve direction
        const originalScaleX = caster.sprite.scaleX; 
        const originalScaleY = caster.sprite.scaleY;

        // Darken screen for drama
        const darken = scene.add.rectangle(0, 0, scene.game.config.width * 2, scene.game.config.height * 2, 0x000000, 0.5)
            .setDepth(15000).setScrollFactor(0);

        // 2. Perform strike sequence
        try {
            for (let i = 0; i < this.numStrikes; i++) {
                const targets = caster.targetGroup.getChildren().filter(e => e.active && e.hp > 0);
                const target = targets.length > 0 ? Phaser.Utils.Array.GetRandom(targets) : null;

                // Determine target points: pick a point slightly past the target to "slash through"
                let tx, ty;
                if (target) {
                    const angle = Phaser.Math.Angle.Between(caster.x, caster.y, target.x, target.y);
                    const dashPastDistance = 150;
                    tx = target.x + Math.cos(angle) * dashPastDistance;
                    ty = target.y + Math.sin(angle) * dashPastDistance;
                } else {
                    // Random fallback if no targets left
                    tx = Phaser.Math.Between(100, scene.game.config.width - 100);
                    ty = Phaser.Math.Between(100, scene.game.config.height - 100);
                }

                await this.performStrike(scene, caster, tx, ty, originalScaleX, originalScaleY);

                // Small pause between strikes if needed, but the user wants "quick"
                if (i < this.numStrikes - 1) {
                    await new Promise(resolve => scene.time.delayedCall(40, resolve));
                }
            }
        } finally {
            // 3. Return to origin (always clean up, even if caster died during the loop)
            const doCleanup = () => {
                if (darken && darken.active) darken.destroy();
                if (caster && caster.sprite) {
                    caster.sprite.setScale(originalScaleX, originalScaleY);
                    caster.sprite.setRotation(0);
                    caster.sprite.clearTint();
                }
                if (caster) caster.isStunned = false;
                console.log('[Execution] Ultimate finished — sprite restored.');
            };

            if (!caster.active || !scene) {
                doCleanup();
                return;
            }

            scene.tweens.add({
                targets: caster,
                x: originalX,
                y: originalY,
                duration: 250,
                ease: 'Cubic.easeOut',
                onComplete: doCleanup
            });

            // Safety net: if the return tween is also killed, clean up after 400ms
            scene.time.delayedCall(400, () => {
                if (caster && caster.isStunned) {
                    console.warn('[Execution] Safety timeout fired — forcing cleanup.');
                    doCleanup();
                }
            });
        }
    }

    async performStrike(scene, caster, tx, ty, originalScaleX, originalScaleY) {
        const startX = caster.x;
        const startY = caster.y;

        // Visual Trail (Sword Slash) - Fate's String style
        const line = scene.add.graphics().setDepth(14000);
        line.lineStyle(20, 0x880000, 0.4); // Thick glow
        line.beginPath();
        line.moveTo(startX, startY);
        line.lineTo(tx, ty);
        line.strokePath();

        line.lineStyle(6, 0xff0000, 1.0); // Bright core
        line.beginPath();
        line.moveTo(startX, startY);
        line.lineTo(tx, ty);
        line.strokePath();

        scene.tweens.add({
            targets: line,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => line.destroy()
        });

        // Sprite Stretching (Magenta Drive style)
        const angle = Phaser.Math.Angle.Between(startX, startY, tx, ty);
        caster.sprite.setRotation(angle);
        // Stretch horizontally (in local rotation space)
        caster.sprite.setScale(originalScaleX * 2.5, originalScaleY * 0.4);
        caster.sprite.setTint(0xff0000);

        if (scene.fxManager && scene.fxManager.createAfterimage) {
            scene.fxManager.createAfterimage(caster, 400, 0.7, 0xff0000);
        }

        // Damage calculation
        this.applyStrikeDamage(scene, caster, startX, startY, tx, ty);

        // Movement
        return new Promise(resolve => {
            let settled = false;
            const settle = (fromTimeout = false) => {
                if (settled) return;
                settled = true;
                // Always restore sprite state before moving on to next strike
                if (caster && caster.sprite) {
                    caster.sprite.setRotation(0);
                    caster.sprite.setScale(originalScaleX, originalScaleY);
                    caster.sprite.clearTint();
                }
                if (!fromTimeout) {
                    soundEffects.playWhipSound();
                    scene.cameras.main.shake(150, 0.012);
                }
                resolve();
            };

            scene.tweens.add({
                targets: caster,
                x: tx,
                y: ty,
                duration: 90,
                ease: 'Linear',
                onComplete: () => settle(false)
            });

            // Safety net: if tween is killed externally (scene change, CC, killTweensOf),
            // still resolve and restore sprite after 300ms max.
            scene.time.delayedCall(300, () => settle(true));
        });
    }

    applyStrikeDamage(scene, caster, x1, y1, x2, y2) {
        const enemies = caster.targetGroup.getChildren().filter(e => e.active && e.hp > 0);
        const damage = caster.getTotalAtk() * this.strikeDamageMult;

        enemies.forEach(enemy => {
            const dist = this.getPointLineDistance(enemy.x, enemy.y, x1, y1, x2, y2);
            if (dist < 100) { // Hitbox width
                if (enemy.takeDamage) {
                    // Neutral element (null) to inherit/synergize with weapon
                    enemy.takeDamage(damage, caster, true, null, Math.random() < caster.getTotalCrit() / 100);
                }

                // Blood Visuals
                if (scene.fxManager && scene.fxManager.spawnBloodParticles) {
                    scene.fxManager.spawnBloodParticles(enemy.x, enemy.y, 12);
                }
            }
        });
    }

    getPointLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        if (len_sq !== 0) param = dot / len_sq;

        let xx, yy;

        if (param < 0) { xx = x1; yy = y1; }
        else if (param > 1) { xx = x2; yy = y2; }
        else { xx = x1 + param * C; yy = y1 + param * D; }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
