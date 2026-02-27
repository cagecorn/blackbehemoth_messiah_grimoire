import Phaser from 'phaser';
import { Action, Condition, Sequence } from '../AI/BehaviorTreeManager.js';
import EventBus from '../Events/EventBus.js';

/**
 * SkillIceBall.js
 * A frosty magic skill that freezes enemies.
 */
export default class SkillIceBall {
    constructor() {
        this.id = 'skill_ice_ball';
        this.name = 'Ice Ball';
        this.baseCooldown = 4000;
        this.lastCastTime = 0;
        this.aoeRadius = 100;
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
        const damage = totalMAtk * 1.8;

        const isSnowman = Math.random() < 0.1;
        const emojiKey = isSnowman ? 'emoji_snowman' : 'emoji_snowball';

        if (isSnowman) {
            EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[스킬] ${caster.unitName}: 눈사람 발사! ⛄`);
        } else {
            EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[스킬] ${caster.unitName}: 아이스볼! ❄️`);
        }

        scene.projectileManager.fire(
            caster.x, caster.y, target.x, target.y,
            damage, emojiKey, true, caster.targetGroup, caster,
            {
                onHit: (hitTarget) => {
                    this.onProjectileHit(scene, caster, hitTarget, damage, isSnowman);
                }
            },
            false, 'ice', isSnowman
        );

        return true;
    }

    onProjectileHit(scene, caster, target, damage, isSnowman) {
        if (!scene || !scene.scene || !scene.scene.isActive()) return;

        // 1. AOE Damage & Freeze
        if (scene.aoeManager) {
            scene.aoeManager.triggerAoe(target.x, target.y, this.aoeRadius, damage, caster, caster.targetGroup, true, false, 'ice', isSnowman);
        }

        // Apply Freeze to all in AOE
        const targetGroup = caster.targetGroup;
        if (targetGroup && targetGroup.getChildren) {
            const targets = targetGroup.getChildren();
            for (const t of targets) {
                if (t.active && t.hp > 0) {
                    const dist = Phaser.Math.Distance.Between(target.x, target.y, t.x, t.y);
                    if (dist <= this.aoeRadius) {
                        if (scene.ccManager) {
                            scene.ccManager.applyFreeze(t, 3000);
                        }
                    }
                }
            }
        }

        // 2. Snowman Special Logic
        if (isSnowman) {
            this.spawnMiniSnowmen(scene, caster, target.x, target.y, damage * 0.4);
        }

        // Visual Effects
        this.playShatterEffect(scene, target.x, target.y);
    }

    spawnMiniSnowmen(scene, caster, x, y, miniDamage) {
        const count = 3;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const spreadX = x + Math.cos(angle) * 30;
            const spreadY = y + Math.sin(angle) * 30;

            // Simple "tracking" projectile: find a new target or use current cluster
            const targetGroup = caster.targetGroup;
            if (!targetGroup || !targetGroup.getChildren) continue;

            const targets = targetGroup.getChildren().filter(t => t.active && t.hp > 0);
            let miniTarget = targets[Math.floor(Math.random() * targets.length)];

            if (miniTarget) {
                scene.projectileManager.fire(
                    spreadX, spreadY, miniTarget.x, miniTarget.y,
                    miniDamage, 'emoji_snowman', true, caster.targetGroup, caster,
                    {
                        speed: 250,
                        onHit: (hitT) => {
                            if (scene.aoeManager) {
                                scene.aoeManager.triggerAoe(hitT.x, hitT.y, 60, miniDamage, caster, caster.targetGroup, true, false, 'ice', false);
                            }
                            if (scene.ccManager) {
                                scene.ccManager.applyFreeze(hitT, 1500);
                            }
                            this.playShatterEffect(scene, hitT.x, hitT.y, 0.5);
                        }
                    },
                    false, 'ice'
                );
            }
        }
    }

    playShatterEffect(scene, x, y, scale = 1) {
        const emitter = scene.add.particles(x, y, 'emoji_snowball', {
            speed: { min: 50, max: 200 },
            scale: { start: 0.4 * scale, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 500,
            quantity: 15,
            tint: [0xffffff, 0xaaaaff]
        });
        emitter.explode(15);
        scene.time.delayedCall(1000, () => emitter.destroy());
    }

    createBehaviorNode(unit) {
        const canCast = new Condition(() => {
            if (!unit.scene) return false;
            const targetObj = unit.blackboard.get('target');
            if (!targetObj || targetObj.hp <= 0) return false;
            return this.isReady(unit.scene.time.now, unit.castSpd);
        }, "Is Ice Ball Ready?");

        const castAction = new Action(() => {
            const targetObj = unit.blackboard.get('target');
            if (!targetObj) return 2;
            const success = this.cast(unit.scene, unit, targetObj);
            return success ? 0 : 2;
        }, "Cast Ice Ball!");

        return new Sequence([canCast, castAction], "Ice Ball Sequence");
    }
}
