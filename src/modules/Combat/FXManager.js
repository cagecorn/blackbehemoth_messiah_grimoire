import Phaser from 'phaser';

/**
 * FXManager.js
 * Centralized manager for floating text and visual feedback in combat.
 */
export default class FXManager {
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Show high-resolution floating damage text.
     * @param {Phaser.GameObjects.GameObject} target 
     * @param {number} amount 
     * @param {string} color - Hex color string (e.g., '#ff0000')
     */
    showDamageText(target, amount, color = '#ff0000') {
        if (!target || !target.active) return;

        // High-Resolution crisp text rendering technique:
        const text = this.scene.add.text(target.x, target.y - 20, `-${amount.toFixed(1)}`, {
            fontSize: '32px',
            fill: color,
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 5,
            resolution: 2
        }).setOrigin(0.5).setScale(0.5);

        this.scene.tweens.add({
            targets: text,
            y: target.y - 60,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => text.destroy()
        });
    }

    /**
     * Show floating heal text.
     * @param {Phaser.GameObjects.GameObject} target 
     * @param {string} message - e.g., 'HEAL!' or '+20'
     * @param {string} color 
     */
    showHealText(target, message, color = '#00ff00') {
        if (!target || !target.active) return;

        const text = this.scene.add.text(target.x, target.y - 40, message, {
            fontSize: '24px',
            fill: color,
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 4,
            resolution: 2
        }).setOrigin(0.5).setScale(0.5);

        this.scene.tweens.add({
            targets: text,
            y: target.y - 80,
            alpha: 0,
            duration: 1000,
            onComplete: () => text.destroy()
        });
    }

    /**
     * Create an elliptical shadow for a unit.
     * @param {Phaser.GameObjects.GameObject} target - The unit to follow
     * @param {number} scale - Base scale multiplier
     */
    createShadow(target, scale = 1) {
        if (!target || !target.active) return null;

        // Position at feet: target is centered, so feet are at target.y + half height
        // Assuming default height is 64, offset is ~20-25 for better grounding
        const yOffset = 25 * scale;
        const shadow = this.scene.add.ellipse(target.x, target.y + yOffset, 40 * scale, 20 * scale, 0x000000, 0.5);
        shadow.setDepth(target.depth - 1); // Stay behind

        // Store ground height for airborne support
        shadow.groundY = target.y + yOffset;

        // Simple follow logic
        const updateListener = () => {
            if (!target.active || !shadow.active) {
                this.scene.events.off('postupdate', updateListener);
                shadow.destroy();
                return;
            }

            shadow.x = target.x;

            if (target.isAirborne) {
                shadow.y = shadow.groundY;
                const height = Math.abs(target.y + yOffset - shadow.y);
                shadow.alpha = Math.max(0.1, 0.5 - (height / 500));
                shadow.setScale(Math.max(0.5, 1 - (height / 400)));
            } else {
                shadow.y = target.y + yOffset;
                shadow.groundY = shadow.y;
                shadow.alpha = 0.5;
                shadow.setScale(1);
            }

            // Sync depth with unit's current depth
            shadow.setDepth(target.depth - 1);
        };

        this.scene.events.on('postupdate', updateListener);
        return shadow;
    }
}
