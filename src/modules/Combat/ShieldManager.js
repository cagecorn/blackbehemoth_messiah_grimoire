import Phaser from 'phaser';

/**
 * ShieldManager.js
 * Centralized manager for handling damage-absorbing shields on units.
 */
export default class ShieldManager {
    constructor(scene) {
        this.scene = scene;
        // Map of target object to shield data { amount, duration }
        this.shields = new Map();
    }

    /**
     * Applies a shield to a target.
     * @param {Phaser.GameObjects.Container} target - The unit to shield
     * @param {number} amount - The shield hit points
     * @param {number} duration - How long the shield lasts in ms
     */
    applyShield(target, amount, duration) {
        if (!target || !target.active || target.hp <= 0) return;

        const currentShield = this.shields.get(target);

        // If there's an existing shield, we only override if the new amount is higher (don't stack infinitely)
        if (currentShield && currentShield.amount > amount) {
            return; // Existing shield is stronger
        }

        this.shields.set(target, {
            amount: amount,
            duration: duration
        });

        console.log(`[ShieldManager] Applied ${amount.toFixed(1)} shield to ${target.unitName} for ${duration}ms.`);

        // Trigger UI sync for the DOM chat status
        if (target.syncStatusUI) target.syncStatusUI();

        // Ensure HP bar updates visually
        if (target.updateHealthBar) target.updateHealthBar();
    }

    /**
     * Retrieves the current shield amount for a target.
     */
    getShield(target) {
        const shield = this.shields.get(target);
        return shield ? shield.amount : 0;
    }

    /**
     * Intercepts damage. Returns any remaining (unabsorbed) damage.
     * @param {Phaser.GameObjects.Container} target 
     * @param {number} damage 
     * @returns {number} The remaining damage after shield absorption.
     */
    takeDamage(target, damage) {
        const shield = this.shields.get(target);
        if (!shield || shield.amount <= 0) return damage;

        if (shield.amount >= damage) {
            // Shield absorbed all damage
            shield.amount -= damage;

            // Visual feedback for shield hit
            if (this.scene.fxManager && target.active) {
                this.scene.fxManager.showDamageText(target, damage, '#ffff00'); // Yellow text for shield damage
            }

            if (shield.amount <= 0) {
                this.shields.delete(target);
                if (target.syncStatusUI) target.syncStatusUI(); // Remove icon
            }

            if (target.updateHealthBar) target.updateHealthBar(); // Update visual UI bar
            return 0; // No remaining damage
        } else {
            // Shield broken, calculate remaining damage
            const remainingDamage = damage - shield.amount;

            // Visual feedback for the part the shield absorbed before breaking
            if (this.scene.fxManager && target.active) {
                this.scene.fxManager.showDamageText(target, shield.amount, '#ffff00');
            }

            this.shields.delete(target);
            if (target.syncStatusUI) target.syncStatusUI(); // Remove icon
            if (target.updateHealthBar) target.updateHealthBar(); // Update visual UI bar

            console.log(`[ShieldManager] Shield broken on ${target.unitName}. ${remainingDamage.toFixed(1)} damage passed through.`);
            return remainingDamage;
        }
    }

    /**
     * Decay shield durations.
     */
    update(time, delta) {
        for (const [target, shield] of this.shields.entries()) {
            if (!target.active || target.hp <= 0) {
                // Remove cleanly if dead
                this.shields.delete(target);
                continue;
            }

            shield.duration -= delta;
            if (shield.duration <= 0) {
                // Shield expired naturally
                this.shields.delete(target);
                console.log(`[ShieldManager] Shield expired on ${target.unitName}.`);
                if (target.syncStatusUI) target.syncStatusUI();
                if (target.updateHealthBar) target.updateHealthBar();
            }
        }
    }
}
