import Phaser from 'phaser';

/**
 * ElectricGrenade.js
 * A skill that throws a grenade in a parabolic arc.
 * On impact, it deals AOE damage and applies the SHOCK status effect.
 */
export default class ElectricGrenade {
    constructor(options = {}) {
        this.id = 'electric_grenade';
        this.name = '전기 수류탄';
        this.cooldown = options.cooldown || 8000;
        this.damageMultiplier = options.damageMultiplier || 1.8;
        this.aoeRadius = options.aoeRadius || 100;
        this.shockDuration = options.shockDuration || 3000;
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
        if (!target || !target.active || target.hp <= 0) return false;

        const now = caster.scene.time.now;
        if (!this.isReady(now, caster.castSpd)) return false;

        this.lastCastTime = now;

        const scene = caster.scene;
        console.log(`[Skill] ${caster.unitName} throws Electric Grenade!`);

        const startX = caster.x;
        const startY = caster.y;
        const targetX = target.x;
        const targetY = target.y;

        // Create Grenade Sprite
        const grenade = scene.add.image(startX, startY, 'emoji_bomb');
        grenade.setTint(0xffff00); // Yellowish tint for electric grenade
        grenade.setDepth(2000);
        grenade.setDisplaySize(32, 32);

        // Parabolic Flight (using a custom property and a tween)
        const curve = new Phaser.Curves.QuadraticBezier(
            new Phaser.Math.Vector2(startX, startY),
            new Phaser.Math.Vector2((startX + targetX) / 2, Math.min(startY, targetY) - 150),
            new Phaser.Math.Vector2(targetX, targetY)
        );

        const path = { t: 0 };
        scene.tweens.add({
            targets: path,
            t: 1,
            duration: 800,
            ease: 'Cubic.easeIn',
            onUpdate: () => {
                const p = curve.getPoint(path.t);
                grenade.x = p.x;
                grenade.y = p.y;
                grenade.angle += 10; // Spin while flying
            },
            onComplete: () => {
                this.explode(scene, grenade.x, grenade.y, caster);
                grenade.destroy();
            }
        });

        return true;
    }

    explode(scene, x, y, caster) {
        // 1. Visual Effect (Explosion)
        const flash = scene.add.circle(x, y, this.aoeRadius, 0xffff00, 0.4);
        scene.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 1.5,
            duration: 400,
            onComplete: () => flash.destroy()
        });

        // 2. Electric Particles
        const emitter = scene.add.particles(x, y, 'emoji_lightning', {
            speed: { min: 100, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            quantity: 20
        });
        emitter.explode(20);
        scene.time.delayedCall(1000, () => emitter.destroy());

        // 3. AOE Damage & CC
        if (scene.aoeManager) {
            const opposingGroup = scene.enemies.contains(caster) ? scene.mercenaries : scene.enemies;
            const damage = (caster.getTotalAtk ? caster.getTotalAtk() : caster.atk) * this.damageMultiplier;

            // Manual AOE to apply Shock
            opposingGroup.getChildren().forEach(enemy => {
                if (enemy.active && enemy.hp > 0) {
                    const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
                    if (dist <= this.aoeRadius) {
                        // Damage
                        enemy.takeDamage(damage, caster);

                        // Apply Shock
                        if (scene.ccManager) {
                            scene.ccManager.applyShock(enemy, this.shockDuration);
                        }
                    }
                }
            });
        }
    }
}
