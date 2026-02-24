import Phaser from 'phaser';
import { Action, Condition, Sequence } from '../AI/BehaviorTreeManager.js';
import EventBus from '../Events/EventBus.js';

/**
 * SkillStoneBlast.js
 * Bao's signature skill: Telekinetic rock throw.
 * Rocks emerge from the ground and are hurled towards the target, causing AOE damage and shockwaves.
 */
export default class SkillStoneBlast {
    constructor() {
        this.id = 'skill_stone_blast';
        this.name = 'Stone Blast';

        // Base cooldown in ms. Scaled by castSpd.
        this.baseCooldown = 6000; // Slightly longer than Fireball

        this.lastCastTime = 0;
        this.aoeRadius = 140; // Slightly larger AOE than Fireball
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

    cast(scene, caster, target) {
        if (!target) return false;

        const now = scene.time.now;
        if (!this.isReady(now, caster.castSpd)) return false;

        this.lastCastTime = now;

        const totalMAtk = caster.getTotalMAtk ? caster.getTotalMAtk() : caster.mAtk;
        const damage = totalMAtk * 1.6; // Slightly lower multiplier than Fireball as requested

        EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[스킬] ${caster.unitName || '누군가'}가 스톤 블래스트를 시전했습니다! 🪨`);

        // 1. Create rock emerging from ground near caster
        const rock = scene.add.image(caster.x, caster.y, 'emoji_rock');
        rock.setDisplaySize(32, 32);
        rock.setDepth(caster.depth + 1);
        rock.setAlpha(0);

        // 2. Levitation phase
        scene.tweens.killTweensOf(caster.sprite);
        caster.sprite.y = 0;
        scene.tweens.add({
            targets: caster.sprite,
            y: -100,
            duration: 400,
            yoyo: true,
            ease: 'Power2'
        });
        scene.tweens.add({
            targets: rock,
            y: caster.y - 100,
            alpha: 1,
            displayHeight: 80,
            displayWidth: 80,
            duration: 400,
            ease: 'Back.easeOut',
            onComplete: () => {
                // 3. Hurling phase
                scene.tweens.add({
                    targets: rock,
                    x: target.x,
                    y: target.y,
                    displayHeight: 64,
                    displayWidth: 64,
                    duration: 400,
                    ease: 'Sine.easeIn',
                    onComplete: () => {
                        this.detonate(scene, caster, target.x, target.y, damage);
                        if (rock && rock.destroy) rock.destroy();
                    }
                });
            }
        });

        return true;
    }

    detonate(scene, caster, x, y, damage) {
        if (!scene || !scene.scene || !scene.scene.isActive()) return;

        // Shockwave Visual
        const shockwave = scene.add.circle(x, y, 10, 0xaaaaaa, 0.5);
        scene.tweens.add({
            targets: shockwave,
            radius: this.aoeRadius,
            alpha: 0,
            duration: 400,
            ease: 'Cubic.easeOut',
            onComplete: () => shockwave.destroy()
        });

        // AOE Damage
        if (scene.aoeManager && caster && caster.active) {
            const opposingGroup = caster.targetGroup;
            if (opposingGroup) {
                scene.aoeManager.triggerAoe(x, y, this.aoeRadius, damage, caster, opposingGroup, true);
            }
        }

        // Particle Effect
        this.playRockShatterEffect(scene, x, y);

        // Perk Hook
        if (caster.onSkillExecuted) {
            caster.onSkillExecuted(this);
        }
    }

    playRockShatterEffect(scene, x, y) {
        const emitter = scene.add.particles(x, y, 'emoji_rock', {
            speed: { min: 150, max: 450 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.3, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 500,
            gravityY: 400,
            quantity: 20
        });

        emitter.explode(20);

        scene.time.delayedCall(800, () => {
            emitter.destroy();
        });
    }

    createBehaviorNode(unit) {
        const canCast = new Condition(() => {
            if (!unit.scene) return false;
            const targetObj = unit.blackboard.get('target');
            if (!targetObj || targetObj.hp <= 0) return false;

            return this.isReady(unit.scene.time.now, unit.castSpd);
        }, "Is Stone Blast Ready?");

        const castAction = new Action(() => {
            const targetObj = unit.blackboard.get('target');
            if (!targetObj) return 2;

            const success = this.cast(unit.scene, unit, targetObj);
            return success ? 0 : 2;
        }, "Cast Stone Blast!");

        return new Sequence([canCast, castAction], "Stone Blast Sequence");
    }
}
