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
        this.baseCooldown = options.cooldown || 7000;
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
        if (!this.isReady(now, caster.castSpd)) return false;

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

        // Target position plus some randomness for "zigzag" variety
        const targetX = target.x + Phaser.Math.Between(-30, 30);
        const targetY = target.y + Phaser.Math.Between(-30, 30);

        // 1. Create Projectile (Group of emojis for "overlapping" look)
        const container = scene.add.container(startX, startY);
        container.setDepth(2000);

        const swirls = [];
        for (let i = 0; i < 3; i++) {
            const s = scene.add.text(0, 0, '🌪️', { fontSize: '42px' }).setOrigin(0.5);
            s.setAlpha(0.7 - i * 0.2);
            s.setBlendMode('ADD');
            s.setScale(1 + i * 0.2);
            container.add(s);
            swirls.push(s);

            // Spinning animation for each swirl
            scene.tweens.add({
                targets: s,
                angle: 360,
                duration: 500 - i * 100,
                repeat: -1
            });
        }

        // 🍃 Leaves flying around
        const leaves = scene.add.particles(0, 0, 'emoji_herb', {
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.4, end: 0 },
            lifespan: 600,
            frequency: 50,
            blendMode: 'ADD',
            follow: container
        });
        leaves.setDepth(1999);

        // Path calculation for Zigzag
        const dx = targetX - startX;
        const dy = targetY - startY;
        const angle = Math.atan2(dy, dx);
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Randomize zigzag frequency and amplitude
        const freq = Phaser.Math.FloatBetween(2, 4);
        const amp = Phaser.Math.Between(40, 80);

        const duration = 1200;
        const movement = { t: 0 };

        scene.tweens.add({
            targets: movement,
            t: 1,
            duration: duration,
            ease: 'Linear',
            onUpdate: () => {
                const currentDist = dist * movement.t;
                const lx = startX + Math.cos(angle) * currentDist;
                const ly = startY + Math.sin(angle) * currentDist;

                // Zigzag offset
                const offset = Math.sin(movement.t * Math.PI * freq) * amp;
                container.x = lx + Math.cos(angle + Math.PI / 2) * offset;
                container.y = ly + Math.sin(angle + Math.PI / 2) * offset;

                // 💨 Smoke emoji puffs at bottom
                if (scene.time.now % 100 < 20) {
                    const smoke = scene.add.text(container.x, container.y + 20, '💨', { fontSize: '24px' }).setOrigin(0.5);
                    smoke.setDepth(container.depth - 1);
                    scene.tweens.add({
                        targets: smoke,
                        y: smoke.y - 40,
                        alpha: 0,
                        duration: 500,
                        onComplete: () => smoke.destroy()
                    });
                }
            },
            onComplete: () => {
                this.hit(scene, container.x, container.y, caster);
                container.destroy();
                leaves.destroy();
            }
        });

        // Sound
        if (soundEffects.playWindSound) {
            soundEffects.playWindSound();
        }
    }

    hit(scene, x, y, caster) {
        if (!scene || !scene.scene.isActive()) return;

        // AOE Check at end of path
        const radius = 60;
        const mAtk = caster.getTotalMAtk ? caster.getTotalMAtk() : caster.mAtk;
        const damage = mAtk * this.damageMultiplier;

        if (scene.aoeManager) {
            const hitEnemies = scene.aoeManager.triggerAoe(x, y, radius, damage, caster, caster.targetGroup, true, false, 'wind');

            // Airborne CC
            if (scene.ccManager && hitEnemies.length > 0) {
                hitEnemies.forEach(e => {
                    scene.ccManager.applyAirborne(e, 1000, 100);
                });
            }
        }

        // Impact Visuals
        const blast = scene.add.circle(x, y, radius, 0xffffff, 0.3).setDepth(2001);
        scene.tweens.add({
            targets: blast,
            scale: 2,
            alpha: 0,
            duration: 300,
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

            // Check range
            const dist = Phaser.Math.Distance.Between(unit.x, unit.y, targetObj.x, targetObj.y);
            if (dist > (unit.rangeMax || 400)) return false;

            return this.isReady(unit.scene.time.now, unit.castSpd);
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
