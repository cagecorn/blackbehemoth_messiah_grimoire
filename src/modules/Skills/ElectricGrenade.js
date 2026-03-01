import Phaser from 'phaser';
import SoundEffects from '../Core/SoundEffects.js';

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
        console.log(`[Skill] ${caster.unitName} throws Electric Grenade at ${target.unitName}!`);

        const startX = caster.x;
        const startY = caster.y;

        // Capture target position at start of throw
        const targetX = target.x;
        const targetY = target.y;

        // Create Grenade Sprite
        const grenade = scene.add.image(startX, startY, 'emoji_bomb');
        grenade.setTint(0xffff00);
        grenade.setDepth(2000);
        grenade.setDisplaySize(32, 32);

        // Parabolic Flight
        const curve = new Phaser.Curves.QuadraticBezier(
            new Phaser.Math.Vector2(startX, startY),
            new Phaser.Math.Vector2((startX + targetX) / 2, Math.min(startY, targetY) - 150),
            new Phaser.Math.Vector2(targetX, targetY)
        );

        const duration = 600;
        const path = { t: 0 };

        scene.tweens.add({
            targets: path,
            t: 1,
            duration: duration,
            ease: 'Cubic.easeOut',
            onUpdate: () => {
                const p = curve.getPoint(path.t);
                grenade.x = p.x;
                grenade.y = p.y;
                grenade.angle += 10;
            },
            onComplete: () => {
                grenade.destroy();
            }
        });

        // Use a delayedCall to ensure explosion triggers even if tween is interrupted
        scene.time.delayedCall(duration, () => {
            console.log(`[Grenade] Timer triggered explosion for ${caster.unitName}'s grenade`);
            this.explode(scene, targetX, targetY, caster);
        });

        return true;
    }

    explode(scene, x, y, caster) {
        // Use correct Phaser 3 API to check scene activity
        if (!scene || !scene.scene || !scene.scene.isActive()) return;
        if (!caster || !caster.active) return;

        SoundEffects.playJijigSound();

        console.log(`[Grenade] Exploding at (${Math.round(x)}, ${Math.round(y)}) from caster ${caster.unitName}`);

        // 1. Visual Effect (Explosion)
        const flash = scene.add.circle(x, y, this.aoeRadius, 0xffff00, 0.4);
        flash.setDepth(3000);
        scene.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 1.5,
            duration: 400,
            onComplete: () => {
                if (flash && flash.destroy) flash.destroy();
            }
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
        emitter.setDepth(3000);
        emitter.explode(20);
        scene.time.delayedCall(1000, () => {
            if (emitter && emitter.destroy) emitter.destroy();
        });

        // 3. AOE Damage & CC
        if (scene.aoeManager) {
            // Leona is an Archer: skill damage scales with physical attack (atk)
            const totalAtk = caster.getTotalAtk ? caster.getTotalAtk() : caster.atk;
            const damage = totalAtk * this.damageMultiplier;
            const opposingGroup = caster.targetGroup;

            console.log(`[Grenade] AOE START: Caster=${caster.unitName}, Team=${caster.team}, targetGroup=${opposingGroup ? 'OK' : 'NULL'}`);

            if (opposingGroup) {
                if (!scene || !scene.scene || !scene.scene.isActive()) {
                    console.warn(`[Grenade] Scene inactive during detonation. Skipping damage.`);
                    return;
                }
                const hitEnemies = scene.aoeManager.triggerAoe(x, y, this.aoeRadius, damage, caster, opposingGroup, false, false, 'lightning');

                if (scene.ccManager) {
                    hitEnemies.forEach(enemy => {
                        console.log(`[Grenade] Applying Shock SUCCESS to ${enemy.unitName}`);
                        scene.ccManager.applyShock(enemy, this.shockDuration);
                    });
                }
            } else {
                console.error(`[Grenade] FAILED to trigger AOE: targetGroup is NULL!`);
            }
        } else {
            console.error(`[Grenade] FAILED to trigger AOE: scene.aoeManager is MISSING!`);
        }
    }
}
