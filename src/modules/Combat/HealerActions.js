import Phaser from 'phaser';

/**
 * HealerActions.js
 * Specialized healing and magic attack logic shared between Player Healers and Monster Shamans.
 */
export const HealerActions = {
    castHeal(unit, target) {
        const now = unit.scene.time.now;
        const castSpd = unit.castSpd || 1000;
        if (now - (unit.lastActionTime || 0) < castSpd) return false;
        console.log(`[HealerActions] castHeal triggered by ${unit.unitName} for ${target.unitName}`);
        unit.lastActionTime = now;

        const mAtk = unit.getTotalMAtk();
        let healAmount = mAtk * 1.5;

        // Perk: 구원의 손길 (Salvation) — +30% heal on targets at ≤25% HP
        if (unit.activatedPerks && unit.activatedPerks.includes('emoji_pill')) {
            if (target.hp / target.maxHp <= 0.25) {
                healAmount *= 1.3;
                console.log(`[Perk] ${unit.unitName}: 구원의 손길 발동! 회복량 30% 증가 (대상 HP: ${Math.round(target.hp / target.maxHp * 100)}%) → ${healAmount.toFixed(1)}`);
                if (unit.scene && unit.scene.fxManager) {
                    unit.scene.fxManager.showDamageText(target, 'SALVATION! 💊', '#ffccff');
                }
            }
        }

        target.receiveHeal(healAmount, unit.id);

        // Perk: 정화 (Purify) — 5% chance to cleanse 1 debuff on basic heal
        if (unit.activatedPerks && unit.activatedPerks.includes('emoji_bubbles')) {
            const roll = Math.random();
            console.log(`[Perk] ${unit.unitName}: 정화 확률 체크... (Roll: ${roll.toFixed(2)} / Threshold: 0.05)`);
            if (roll < 0.05) {
                // Attempt to cleanse — looks for statusEffects or debuffs array on the target
                // (디버프 시스템 미구현 — 코드 스텁 준비)
                let cleansed = false;
                if (target.statusEffects && target.statusEffects.length > 0) {
                    const removed = target.statusEffects.shift(); // remove oldest debuff
                    cleansed = true;
                    console.log(`[Perk] ${unit.unitName}: 정화 발동! ${target.unitName}의 '${removed.name || removed}' 해제`);
                } else {
                    console.log(`[Perk] ${unit.unitName}: 정화 발동! (해제할 디버프 없음)`);
                    cleansed = true; // proc'd, but nothing to remove
                }
                if (cleansed && unit.scene && unit.scene.fxManager) {
                    unit.scene.fxManager.showDamageText(target, '정화! 🫧', '#aaffff');
                }
            }
        }

        console.info(
            `%c[Support] %c${unit.unitName}%c healed %c${target.unitName}%c for %c${healAmount.toFixed(1)}%c HP.`,
            'color: #00ff00; font-weight: bold;',
            'color: #ffff00;',
            'color: #e0e0e0;',
            'color: #00ccff;',
            'color: #e0e0e0;',
            'color: #55ff55; font-weight: bold;',
            'color: #e0e0e0;'
        );

        // Visual effect
        if (unit.scene.particleManager) {
            unit.scene.particleManager.createSparkle(target.x, target.y);
        }
        this.showHealFX(unit.scene, target);
        return true;
    },

    castAttack(unit, target) {
        const now = unit.scene.time.now;
        const atkSpd = unit.atkSpd || 1200;
        if (now - (unit.lastActionTime || 0) < atkSpd) return false;
        if (!target || !target.active) return false;
        console.log(`[HealerActions] castAttack triggered by ${unit.unitName} on ${target.unitName}`);
        unit.lastActionTime = now;

        const mAtk = unit.getTotalMAtk();

        // Determine target group: 
        // If unit is a Mercenary (in mercenaries group), targetGroup is enemies.
        // If unit is a Monster (in enemies group), targetGroup is mercenaries.
        let targetGroup = unit.scene.enemies;
        if (unit.scene.enemies.contains(unit)) {
            targetGroup = unit.scene.mercenaries;
        }

        // Magic attack (sparkle projectile)
        if (unit.scene.projectileManager) {
            const prefix = unit.getWeaponPrefix ? unit.getWeaponPrefix() : null;
            const element = prefix ? prefix.element : null;

            unit.scene.projectileManager.fire(
                unit.x, unit.y, target.x, target.y,
                mAtk, 'emoji_sparkle', true, targetGroup, unit, null, false, element
            );
        }
        return true;
    },

    showHealFX(scene, target) {
        // Simple green flash
        scene.tweens.add({
            targets: target.sprite,
            tint: 0x00ff00,
            duration: 200,
            yoyo: true,
            onComplete: () => {
                if (target.sprite) target.sprite.clearTint();
            }
        });

        if (scene.fxManager) {
            scene.fxManager.showHealText(target, 'HEAL!');
        }
    }
};
