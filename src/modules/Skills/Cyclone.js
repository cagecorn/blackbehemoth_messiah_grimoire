import Phaser from 'phaser';
import EventBus from '../Events/EventBus.js';
import soundEffects from '../Core/SoundEffects.js';
import { Action, Condition, Sequence } from '../AI/BehaviorTreeManager.js';

/**
 * Cyclone.js
 * Veve's signature skill.
 * Fires a 🌪️ projectile that travels in a zigzag path.
 */
export default class Cyclone {
    constructor(options = {}) {
        this.id = 'cyclone';
        this.name = '싸이클론';
        this.baseCooldown = options.cooldown || 5000; // More aggressive: 7s -> 5s
        this.damageMultiplier = options.damageMultiplier || 1.8;
        this.lastCastTime = 0;
        this.projectileCount = options.projectileCount || 1;
    }

    getActualCooldown(castSpd) {
        const speedMultiplier = (castSpd || 1000) / 1000;
        return this.baseCooldown / Math.max(0.1, speedMultiplier);
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
        if (!caster || !caster.active || !target || !target.active) return false;

        const now = caster.scene.time.now;
        const castSpd = caster.getTotalCastSpd ? caster.getTotalCastSpd() : (caster.castSpd || 1000);
        if (!this.isReady(now, castSpd)) return false;

        this.lastCastTime = now;
        const scene = caster.scene;

        // Ultimate state check if caster has it
        const count = caster.isUltimateActive ? 5 : this.projectileCount;

        console.log(`[Cyclone] ${caster.unitName} casts Cyclone! (Count: ${count})`);

        for (let i = 0; i < count; i++) {
            // Slight delay between multiple projectiles if in ultimate
            if (i > 0) {
                scene.time.delayedCall(i * 100, () => this.fireProjectile(scene, caster, target));
            } else {
                this.fireProjectile(scene, caster, target);
            }
        }

        return true;
    }

    fireProjectile(scene, caster, target) {
        if (!caster.active || !target.active) return;

        const startX = caster.x;
        const startY = caster.y;

        // Target position
        const targetX = target.x;
        const targetY = target.y;

        // 1. Create Projectile (Container for multiple emojis)
        const container = scene.add.container(startX, startY);
        container.setDepth(2000);

        // Requested: 4 layers of 🌪️ with 60% alpha, ADD blend, and varied ScaleX
        const configs = [
            { size: '64px', alpha: 0.6, scaleX: 1.0, swayAmp: 10, swayFreq: 400 },
            { size: '56px', alpha: 0.6, scaleX: 1.5, swayAmp: 20, swayFreq: 600 },
            { size: '48px', alpha: 0.6, scaleX: 0.8, swayAmp: 15, swayFreq: 500 },
            { size: '72px', alpha: 0.5, scaleX: 1.2, swayAmp: 25, swayFreq: 800 }
        ];

        configs.forEach((cfg, i) => {
            const s = scene.add.text(0, 0, '🌪️', { fontSize: cfg.size }).setOrigin(0.5, 0.8);
            s.setAlpha(cfg.alpha);
            s.setBlendMode('ADD');
            s.setScale(cfg.scaleX, 1.0); // Apply varied horizontal scaling
            container.add(s);

            // Billboard Sway with unique logic per layer
            scene.tweens.add({
                targets: s,
                angle: { from: -cfg.swayAmp, to: cfg.swayAmp },
                duration: cfg.swayFreq,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            // Pulse width slightly for "turbulent" feeling
            scene.tweens.add({
                targets: s,
                scaleX: '*=1.1',
                duration: 500 + i * 200,
                yoyo: true,
                repeat: -1
            });
        });

        // 🍃 Dust/Leaves at the base
        const baseEmitter = scene.add.particles(0, 20, 'emoji_herb', {
            speed: { min: 20, max: 100 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 0 },
            lifespan: 800,
            frequency: 30, // More frequent
            quantity: 2,
            follow: container
        });
        baseEmitter.setDepth(1999);

        // Path calculation for Wandering/Wobbling (Diablo 2 Tornado style)
        const dx = targetX - startX;
        const dy = targetY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        const duration = 1500; // Snappier: 1500ms
        const movement = { t: 0 };

        scene.tweens.add({
            targets: movement,
            t: 1,
            duration: duration,
            ease: 'Linear',
            onUpdate: () => {
                // Dynamic tracking: update target position if still alive/active
                let curTargetX = targetX;
                let curTargetY = targetY;
                if (target && target.active && target.hp > 0) {
                    curTargetX = target.x;
                    curTargetY = target.y;
                }

                const currentDistX = (curTargetX - startX) * movement.t;
                const currentDistY = (curTargetY - startY) * movement.t;

                const lx = startX + currentDistX;
                const ly = startY + currentDistY;

                // "Drunk Walk" / Wandering offset
                // Using multiple sine waves with different frequencies for unpredictable movement
                const timeFactor = movement.t * duration * 0.01;
                const wobbleX = Math.sin(timeFactor * 0.5) * 40 + Math.cos(timeFactor * 1.2) * 20;
                const wobbleY = Math.sin(timeFactor * 0.8) * 30 + Math.cos(timeFactor * 1.5) * 15;

                container.x = lx + wobbleX;
                container.y = ly + wobbleY;

                // 💨 Ground dust effect
                if (scene.time.now % 150 < 20) {
                    const dust = scene.add.text(container.x, container.y + 30, '💨', { fontSize: '28px' }).setOrigin(0.5);
                    dust.setDepth(1998);
                    dust.setAlpha(0.6);
                    scene.tweens.add({
                        targets: dust,
                        alpha: 0,
                        scale: 1.5,
                        duration: 800,
                        onComplete: () => dust.destroy()
                    });
                }
            },
            onComplete: () => {
                this.hit(scene, container.x, container.y, caster);
                container.destroy();
                baseEmitter.destroy();
            }
        });

        // Sound
        if (soundEffects.playWindSound) {
            soundEffects.playWindSound();
        }
    }

    hit(scene, x, y, caster) {
        if (!scene || !scene.scene.isActive()) return;

        // AOE Check at end of path - Increased radius for better feel
        const radius = 100;
        const mAtk = caster.getTotalMAtk ? caster.getTotalMAtk() : (caster.mAtk || 0);
        const damage = mAtk * this.damageMultiplier;

        if (scene.aoeManager) {
            console.log(`[Cyclone Debug] Triggering AOE hit from ${caster.unitName} (Team: ${caster.team}) at (${Math.round(x)}, ${Math.round(y)})`);
            const hitEnemies = scene.aoeManager.triggerAoe(x, y, radius, damage, caster, caster.targetGroup, true, false, 'wind');

            console.log(`[Cyclone Debug] AOE Result: ${hitEnemies.length} targets hit.`);

            // Airborne CC
            if (scene.ccManager && hitEnemies.length > 0) {
                hitEnemies.forEach(e => {
                    console.log(`[Cyclone Debug] Applying Airborne CC to ${e.unitName}`);
                    scene.ccManager.applyAirborne(e, 1200, 150); // Slightly stronger CC
                });
            }
        }

        // Impact Visuals
        const blast = scene.add.circle(x, y, radius, 0xaaffff, 0.4).setDepth(2001);
        scene.tweens.add({
            targets: blast,
            scale: 1.5,
            alpha: 0,
            duration: 400,
            onComplete: () => blast.destroy()
        });
    }

    /**
     * Create a pre-configured Behavior Tree Sequence for this skill.
     */
    createBehaviorNode(unit) {

        const canCast = new Condition(() => {
            if (!unit.scene) return false;
            const targetObj = unit.blackboard.get('target');
            if (!targetObj || targetObj.hp <= 0) return false;

            // Check range using reachDist (accounting for hitboxes) for more aggressive usage
            const dist = Phaser.Math.Distance.Between(unit.x, unit.y, targetObj.x, targetObj.y);
            const r1 = unit.body ? unit.body.radius : 0;
            const r2 = targetObj.body ? targetObj.body.radius : 0;
            const reachDist = dist - r1 - r2;

            const rangeMax = unit.getTotalRangeMax ? unit.getTotalRangeMax() : (unit.rangeMax || 500);
            if (reachDist > rangeMax) return false;

            const castSpd = unit.getTotalCastSpd ? unit.getTotalCastSpd() : (unit.castSpd || 1000);
            return this.isReady(unit.scene.time.now, castSpd);
        }, "Is Cyclone Ready?");

        const castAction = new Action(() => {
            const targetObj = unit.blackboard.get('target');
            if (!targetObj) return 2; // Failed

            const success = this.execute(unit, targetObj);
            return success ? 0 : 2; // Success : Failed
        }, "Cast Cyclone!");

        return new Sequence([canCast, castAction], "Cyclone Sequence");
    }
}
