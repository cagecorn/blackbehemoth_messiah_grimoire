import BaseStructure from './BaseStructure.js';
import Phaser from 'phaser';

/**
 * HealingTurret.js
 * Specialized defense structure that heals allies instead of attacking enemies.
 */
export default class HealingTurret extends BaseStructure {
    constructor(scene, x, y, instanceId, baseId) {
        super(scene, x, y, instanceId, baseId);
        this.unitName = '힐링 터렛';
    }

    // Override target group to focus on allies (mercenaries)
    get targetGroup() {
        if (!this.scene || !this.scene.mercenaries) return { getChildren: () => [] };
        return this.scene.mercenaries;
    }

    /**
     * Override findNearestEnemy to find the most wounded ally instead.
     */
    findNearestEnemy() {
        const allies = this.targetGroup.getChildren();
        let mostWounded = null;
        let lowestHpRatio = 1.0;
        const range = this.getTotalAtkRange();

        for (const ally of allies) {
            // Only heal active, living, non-building allies within range
            if (!ally.active || ally.hp <= 0 || ally.isBuilding) continue;

            const dist = Phaser.Math.Distance.Between(this.x, this.y, ally.x, ally.y);
            if (dist <= range) {
                const hpRatio = ally.hp / ally.maxHp;
                if (hpRatio < lowestHpRatio) {
                    lowestHpRatio = hpRatio;
                    mostWounded = ally;
                }
            }
        }

        // If everyone is full HP, just find the closest ally to "idle" target if any
        if (!mostWounded) {
            let nearest = null;
            let minDist = range;
            for (const ally of allies) {
                if (!ally.active || ally.hp <= 0 || ally.isBuilding) continue;
                const dist = Phaser.Math.Distance.Between(this.x, this.y, ally.x, ally.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = ally;
                }
            }
            return nearest;
        }

        return mostWounded;
    }

    /**
     * Override fireProjectile to handle healing logic.
     */
    fireProjectile(target) {
        if (!this.scene.projectileManager) return;

        // Calculate Heal Amount based on mAtk
        const healAmount = this.getTotalMAtk();
        const isCritical = Math.random() * 100 < this.getTotalCrit();
        const finalHeal = isCritical ? Math.floor(healAmount * 1.5) : healAmount;

        // Sprite facing check
        if (target.x < this.x) this.sprite.setScale(-Math.abs(this.sprite.scaleX), this.sprite.scaleY);
        else this.sprite.setScale(Math.abs(this.sprite.scaleX), this.sprite.scaleY);

        // Visual: Sparkles (✨)
        const projType = 'heal_pulse';

        this.scene.projectileManager.fire(
            this.x, this.y,
            target.x, target.y,
            0, // Damage is 0 (Heal is handled via callback)
            projType,
            false, // isMagic
            this.targetGroup,
            this,
            (hitTarget) => {
                if (hitTarget && hitTarget.heal) {
                    // Use standard heal method for visuals and consistency
                    hitTarget.heal(finalHeal, false, this.id);
                }
            }, // onHitCallback
            false, // isUltimate
            null, // No custom element
            isCritical
        );

        // Visual feedback on the turret itself
        if (this.scene.fxManager) {
            this.scene.tweens.add({
                targets: this.sprite,
                scale: 1.1,
                duration: 100,
                yoyo: true
            });
        }
    }
}
