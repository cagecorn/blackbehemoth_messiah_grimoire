import Phaser from 'phaser';

/**
 * MusicalMagicalCritical.js
 * Nana's Special Skill: "Musical Magical Critical"
 * Targets a clump of allies and enemies.
 * Enemies: Take magic damage.
 * Allies: Gain Crit Rate buff.
 */
export default class MusicalMagicalCritical {
    constructor() {
        this.name = '뮤지컬 매지컬 크리티컬';
        this.emoji = '🎶';
        this.cooldown = 12000;
        this.lastCastTime = 0;
        this.radius = 150;
        this.damageMultiplier = 1.5;
        this.critBuffAmount = 20; // +20%
        this.buffDuration = 8000; // 8 seconds
    }

    getCooldownProgress(now, castSpd) {
        const actualCD = this.cooldown;
        const elapsed = now - this.lastCastTime;
        return Math.min(1, elapsed / actualCD);
    }

    execute(caster) {
        const now = caster.scene.time.now;
        if (now - this.lastCastTime < this.cooldown) return false;

        // Find targets
        const bestTarget = this.findBestTarget(caster);
        if (!bestTarget) return false;

        this.lastCastTime = now;
        const scene = caster.scene;

        // Visuals: Rainfall of emojis
        this.playVisuals(scene, bestTarget.x, bestTarget.y);

        // Apply effects
        const allies = caster.allyGroup.getChildren().filter(a => a.active && a.hp > 0);
        const enemies = caster.targetGroup.getChildren().filter(e => e.active && e.hp > 0);

        allies.forEach(ally => {
            if (Phaser.Math.Distance.Between(bestTarget.x, bestTarget.y, ally.x, ally.y) < this.radius) {
                this.applyBuff(scene, caster, ally);
            }
        });

        enemies.forEach(enemy => {
            if (Phaser.Math.Distance.Between(bestTarget.x, bestTarget.y, enemy.x, enemy.y) < this.radius) {
                const damage = caster.getTotalMAtk() * this.damageMultiplier;
                enemy.takeMagicDamage(damage, caster);
            }
        });

        // Skill activation effect text
        if (scene.fxManager) {
            scene.fxManager.showDamageText(caster, 'MAGIC SHOW! ✨', '#ff88ff');
        }

        return true;
    }

    findBestTarget(caster) {
        // Priority: 1. Ally + Enemy clump, 2. Enemy clump, 3. Ally clump
        const allies = caster.allyGroup.getChildren().filter(a => a.active && a.hp > 0);
        const enemies = caster.targetGroup.getChildren().filter(e => e.active && e.hp > 0);

        const allPotential = [...allies, ...enemies];
        if (allPotential.length === 0) return null;

        let bestPoint = null;
        let maxScore = -1;

        // Sample points at each unit's location
        allPotential.forEach(p => {
            let score = 0;
            allies.forEach(a => {
                if (Phaser.Math.Distance.Between(p.x, p.y, a.x, a.y) < this.radius) score += 1;
            });
            enemies.forEach(e => {
                if (Phaser.Math.Distance.Between(p.x, p.y, e.x, e.y) < this.radius) score += 1.5; // Weight enemies slightly for offensive value
            });

            if (score > maxScore) {
                maxScore = score;
                bestPoint = { x: p.x, y: p.y };
            }
        });

        return bestPoint;
    }

    playVisuals(scene, x, y) {
        const emojis = ['emoji_note', 'emoji_star', 'emoji_heart'];
        const count = 15;

        for (let i = 0; i < count; i++) {
            const offsetX = Phaser.Math.Between(-this.radius, this.radius);
            const offsetY = Phaser.Math.Between(-this.radius, this.radius);
            const startY = y - 400 - Phaser.Math.Between(0, 100);

            const emoji = scene.add.image(x + offsetX, startY, Phaser.Utils.Array.GetRandom(emojis))
                .setDepth(20000)
                .setScale(0.5)
                .setAlpha(0);

            scene.tweens.add({
                targets: emoji,
                y: y + offsetY,
                alpha: 1,
                angle: 360,
                duration: 600 + Phaser.Math.Between(0, 400),
                ease: 'Cubic.easeIn',
                onComplete: () => {
                    if (scene.fxManager) {
                        scene.fxManager.createSparkleEffect({ x: emoji.x, y: emoji.y, active: true });
                    }
                    scene.tweens.add({
                        targets: emoji,
                        alpha: 0,
                        scale: 1,
                        duration: 300,
                        onComplete: () => emoji.destroy()
                    });
                }
            });
        }

        // Circular ripple to show area
        const circle = scene.add.circle(x, y, this.radius, 0xff88ff, 0.15);
        circle.setDepth(x - 1);
        scene.tweens.add({
            targets: circle,
            scale: 1.1,
            alpha: 0,
            duration: 1000,
            onComplete: () => circle.destroy()
        });
    }

    applyBuff(scene, caster, target) {
        if (!target.active || target.hp <= 0) return;

        // Custom buff logic
        // We'll use the BuffManager if available, or just set a flag on the target
        if (scene.buffManager) {
            scene.buffManager.applyBuff(target, caster, 'NanaCrit', this.buffDuration, 0, 0, {
                critBoost: this.critBuffAmount
            });
        }

        if (scene.fxManager) {
            scene.fxManager.showDamageText(target, 'CRIT UP! ♪', '#ff0000');
        }
    }
}
