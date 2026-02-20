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

        const mAtk = unit.mAtk || 10;
        const healAmount = mAtk * 1.5;
        target.receiveHeal(healAmount);

        console.info(
            `%c[Support] %c${unit.unitName}%c healed %c${target.unitName}%c for %c${healAmount.toFixed(1)}%c HP.`,
            'color: #00ff00; font-weight: bold;',
            'color: #ffff00;',
            'color: #e0e0e0;',
            'color: #00ffcc;',
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

        const mAtk = unit.mAtk || 10;

        // Determine target group: 
        // If unit is a Mercenary (in mercenaries group), targetGroup is enemies.
        // If unit is a Monster (in enemies group), targetGroup is mercenaries.
        let targetGroup = unit.scene.enemies;
        if (unit.scene.enemies.contains(unit)) {
            targetGroup = unit.scene.mercenaries;
        }

        // Magic attack (sparkle projectile)
        if (unit.scene.projectileManager) {
            unit.scene.projectileManager.fire(
                unit.x, unit.y, target.x, target.y,
                mAtk, 'emoji_sparkle', true, targetGroup, unit.className || unit.id
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
