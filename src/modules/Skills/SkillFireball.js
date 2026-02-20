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
        const damage = totalMAtk * 2.5; // Fireball multiplier!

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
        meteor.setTint(0xff5555); // glowing red overlay

        // 2. Tween it dropping down
        scene.tweens.add({
            targets: meteor,
            x: target.x,
            y: target.y,
            duration: 600, // fast drop
            ease: 'Sine.easeIn',
            onComplete: () => {
                // The meteor hit the ground!
                meteor.destroy();

                // 3. Trigger AOE Damage Manager
                if (scene.aoeManager) {
                    const opposingGroup = scene.enemies.contains(caster) ? scene.mercenaries : scene.enemies;
                    scene.aoeManager.triggerAoe(target.x, target.y, this.aoeRadius, damage, caster.className || caster.id, opposingGroup);
                }

                // 4. Shatter Particle Effect
                this.playShatterEffect(scene, target.x, target.y);
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
