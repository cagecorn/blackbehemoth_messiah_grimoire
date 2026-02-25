import Phaser from 'phaser';
import { Action, Condition, Sequence } from '../AI/BehaviorTreeManager.js';
import EventBus from '../Events/EventBus.js';

/**
 * SkillFireball.js
 * A powerful AOE magic skill.
 */
export default class SkillFireball {
    constructor() {
        this.id = 'skill_fireball';
        this.name = 'Fireball';

        // Base cooldown in ms (e.g. 5 seconds). 
        // This will be scaled by the caster's castSpd.
        this.baseCooldown = 5000;

        this.lastCastTime = 0;
        this.aoeRadius = 120; // 120 pixels blast radius
    }

    /**
     * Calculates the actual cooldown taking the unit's castSpd into account.
     * Higher castSpd means shorter cooldown.
     * We'll assume castSpd of 1000 is baseline (1x). 2000 is 2x speed (half CD).
     */
    getActualCooldown(castSpd) {
        const speedMultiplier = (castSpd || 1000) / 1000;
        return this.baseCooldown / Math.max(0.1, speedMultiplier);
    }

    getCooldownProgress(now, castSpd) {
        if (this.lastCastTime === 0) return 1; // Ready immediately
        const cd = this.getActualCooldown(castSpd);
        const elapsed = now - this.lastCastTime;
        return Math.max(0, Math.min(1, elapsed / cd));
    }

    isReady(now, castSpd) {
        return this.getCooldownProgress(now, castSpd) >= 1;
    }

    /**
     * Initiates the casting sequence.
     */
    cast(scene, caster, target) {
        if (!target) return false;

        const now = scene.time.now;
        if (!this.isReady(now, caster.castSpd)) return false;

        this.lastCastTime = now;

        // Scale damage using the caster's total magic attack
        const totalMAtk = caster.getTotalMAtk ? caster.getTotalMAtk() : caster.mAtk;
        const damage = totalMAtk * 1.8; // Reduced for balance (was 2.5)

        // Announce the cast
        // if (caster.showSpeechBubble) {
        //     caster.showSpeechBubble("Meteor... Strike!!");
        // }
        EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[스킬] ${caster.unitName || '누군가'}가 파이어볼을 시전했습니다! 🔥`);

        // 1. Create the meteor high up and diagonally offset
        const startX = target.x - 400;
        const startY = target.y - 600;

        const meteor = scene.add.image(startX, startY, 'emoji_fire');
        meteor.setDisplaySize(96, 96); // huge!
        meteor.setDepth(target.depth + 1000); // render way above
        meteor.setTint(0xff3300); // More intense red
        meteor.setBlendMode('ADD'); // Glow effect

        // 1.5 Gradient Aura (Intense core glow)
        const auraGraphic = scene.add.graphics();
        auraGraphic.setDepth(meteor.depth - 1);
        auraGraphic.setBlendMode('ADD');

        const steps = 10;
        const auraColor = 0xff3300;
        const maxRadius = 120; // Larger area for visibility
        for (let i = steps; i > 0; i--) {
            const r = (maxRadius / steps) * i;
            const alpha = 0.03 + (0.04 * (steps - i)); // Increased alpha
            auraGraphic.fillStyle(auraColor, alpha);
            auraGraphic.fillCircle(0, 0, r);
        }

        // 1.6 Intense Particle Trail
        const trailEmitter = scene.add.particles(0, 0, 'emoji_fire', {
            speed: { min: 20, max: 60 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 800,
            frequency: 10, // Very frequent for smooth trail
            blendMode: 'ADD',
            tint: 0xff5500, // Slightly brighter red-orange
            follow: meteor
        });
        trailEmitter.setDepth(meteor.depth - 2);

        const duration = 600;

        // 2. Tween it dropping down
        scene.tweens.add({
            targets: meteor,
            x: target.x,
            y: target.y,
            duration: duration,
            ease: 'Sine.easeIn',
            onUpdate: () => {
                if (auraGraphic && auraGraphic.active !== false) {
                    auraGraphic.setPosition(meteor.x, meteor.y);
                }
            },
            onComplete: () => {
                if (meteor && meteor.destroy) meteor.destroy();
                if (auraGraphic && auraGraphic.destroy) auraGraphic.destroy();
                if (trailEmitter && trailEmitter.destroy) trailEmitter.destroy();
            }
        });

        // Use a delayedCall to ensure explosion triggers even if tween is interrupted
        scene.time.delayedCall(duration, () => {
            console.log(`[Fireball] DETONATING at (${Math.round(target.x)}, ${Math.round(target.y)})`);

            // If the scene is shutting down, we still play visuals if possible, 
            // but we DON'T apply logical damage to prevent "Ghost" hits in next round.
            if (!scene || !scene.scene || !scene.scene.isActive()) {
                console.warn(`[Fireball] Scene inactive during DETONATION. Skipping damage.`);
            }

            // 3. Trigger AOE Damage Manager
            if (scene && scene.scene && scene.scene.isActive() && scene.aoeManager && caster && caster.active) {
                const opposingGroup = caster.targetGroup;
                console.log(`[Fireball] Group Check: ${opposingGroup ? 'FOUND (count: ' + opposingGroup.getChildren().length + ')' : 'NULL'}`);

                if (opposingGroup) {
                    scene.aoeManager.triggerAoe(target.x, target.y, this.aoeRadius, damage, caster, opposingGroup, true, false, 'fire');
                } else {
                    console.error(`[Fireball] FAILED to trigger AOE: targetGroup is NULL! Team: ${caster.team}`);
                }
            } else {
                if (!scene || !scene.active) {
                    // Already warned above, but good to be explicit if this path is taken
                } else if (!scene.aoeManager) {
                    console.error(`[Fireball] FAILED to trigger AOE: scene.aoeManager is MISSING!`);
                } else if (!caster || !caster.active) {
                    console.warn(`[Fireball] Caster dead or inactive during damage application. Skipping damage.`);
                }
            }

            // 4. Shatter Particle Effect
            // This should always play if the scene object itself exists, regardless of scene.active state
            // as it's a visual effect.
            if (scene) {
                this.playShatterEffect(scene, target.x, target.y);
            }

            // Perk Hook
            if (caster.onSkillExecuted) {
                caster.onSkillExecuted(this);
            }
        });

        return true;
    }

    playShatterEffect(scene, x, y) {
        // Create an emitter that spatters small fires
        const emitter = scene.add.particles(x, y, 'emoji_fire', {
            speed: { min: 100, max: 400 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            blendMode: 'ADD',
            tint: [0xff0000, 0xffaa00, 0xffff00], // dynamic colors
            quantity: 30 // number of sparks
        });

        // Emitters run continuously unless configured to burst or stopped
        emitter.explode(30);

        // Clean up the emitter manager object
        scene.time.delayedCall(1000, () => {
            emitter.destroy();
        });
    }

    /**
     * Create a pre-configured Behavior Tree Sequence for this skill.
     * Merely evaluating the Sequence checks cooldown and ranges, and executes the cast Action if ready.
     */
    createBehaviorNode(unit) {
        const canCast = new Condition(() => {
            if (!unit.scene) return false;
            const targetObj = unit.blackboard.get('target');
            if (!targetObj || targetObj.hp <= 0) return false;

            return this.isReady(unit.scene.time.now, unit.castSpd);
        }, "Is Fireball Ready?");

        const castAction = new Action(() => {
            const targetObj = unit.blackboard.get('target');
            if (!targetObj) return 2; // Failed

            const success = this.cast(unit.scene, unit, targetObj);
            return success ? 0 : 2; // Success : Failed
        }, "Cast Fireball!");

        return new Sequence([canCast, castAction], "Fireball Sequence");
    }
}
