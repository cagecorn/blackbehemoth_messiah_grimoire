import Phaser from 'phaser';
import Archer from './Archer.js';
import GuillotinePaper from '../Skills/GuillotinePaper.js';
import Execution from '../Skills/Execution.js';
import { Characters } from '../Core/EntityStats.js';

/**
 * Wrinkle.js
 * The Messiah from another world (Black Behemoth).
 * Special Archer with the "Lightning Dash" passive.
 */
export default class Wrinkle extends Archer {
    constructor(scene, x, y, warrior, characterConfig = {}) {
        // Merge base WRINKLE stats with any overrides
        const config = { ...Characters.WRINKLE, ...characterConfig };
        super(scene, x, y, warrior, config);

        // Reset skill to Wrinkle's specific skill
        this.skill = new GuillotinePaper({
            cooldown: 7000,
            damageMultiplier: 1.2
        });

        // Reset ultimate to Wrinkle's specific ultimate
        this.ultimateSkill = new Execution(this);

        // Passive State: Stacks per enemy
        this.lightningStacks = new Map();
        this.isDashing = false;

        console.log(`[Wrinkle] Messiah from Black Behemoth has arrived.`);
    }

    /**
     * Override fireProjectile to add stack logic.
     */
    fireProjectile() {
        // Use base Archer fire logic
        const fired = super.fireProjectile();

        if (fired) {
            const target = this.blackboard ? this.blackboard.get('target') : null;
            if (target) {
                this.addLightningStack(target);
            }
        }
        return fired;
    }

    /**
     * Increments Lightning stacks on an enemy.
     * Triggers Lightning Dash on the 3rd stack.
     */
    addLightningStack(enemy) {
        if (!enemy || !enemy.active || enemy.hp <= 0) return;

        let stacks = this.lightningStacks.get(enemy) || 0;
        stacks++;

        if (stacks >= 3) {
            this.lightningStacks.set(enemy, 0); // Reset
            this.executeLightningDash(enemy);
        } else {
            this.lightningStacks.set(enemy, stacks);

            // Visual indicator for stacks (Bleeding effect)
            if (this.scene && this.scene.fxManager && this.scene.fxManager.spawnBloodParticles) {
                this.scene.fxManager.spawnBloodParticles(enemy.x, enemy.y, 4);
            }
        }
    }

    /**
     * Flamboyant Passive: Lightning Dash (전광석화)
     * Dash to enemy, melee strike, airborne, dash back.
     */
    executeLightningDash(enemy) {
        if (this.isDashing || !this.active || !enemy || !enemy.active) return;

        this.isDashing = true;
        const originalX = this.x;
        const originalY = this.y;

        console.log(`[Wrinkle] Passive: Lightning Dash! ⚡`);

        // 1. Dash to target
        this.scene.tweens.add({
            targets: this,
            x: enemy.x + (this.x < enemy.x ? -40 : 40),
            y: enemy.y,
            duration: 150,
            ease: 'Expo.easeIn',
            onStart: () => {
                // After-image effect
                const trail = this.scene ? this.scene.time.addEvent({
                    delay: 20,
                    callback: () => {
                        if (this.isDashing && this.scene && this.scene.fxManager) {
                            this.scene.fxManager.createAfterimage(this, 300, 0.5);
                        } else {
                            if (trail) trail.remove();
                        }
                    },
                    loop: true
                }) : null;
            },
            onComplete: () => {
                // 2. Melee Strike at target
                this.handleLightningDashImpact(enemy, originalX, originalY);
            }
        });
    }

    handleLightningDashImpact(enemy, originalX, originalY) {
        if (!enemy || !enemy.active) {
            this.dashBack(originalX, originalY);
            return;
        }

        // Percentage based damage: 2% target max HP + base damage
        const baseDamage = this.getTotalAtk() * 1.5;
        const percentDamage = enemy.maxHp * 0.02;
        const totalDamage = baseDamage + percentDamage;

        // Visual Hit Effect
        if (this.scene && this.scene.fxManager) {
            if (this.scene.fxManager.spawnBloodParticles) {
                this.scene.fxManager.spawnBloodParticles(enemy.x, enemy.y, 15);
            }
            this.scene.fxManager.showDamageText(enemy, totalDamage, '#ff0000', true);
        }

        // Apply Damage & CC
        if (enemy.takeDamage) {
            // Neutral element (null) allows it to inherit weapon element or trigger synergy
            enemy.takeDamage(totalDamage, this, false, null, true);
        }

        if (this.scene && this.scene.ccManager) {
            this.scene.ccManager.applyAirborne(enemy, 1000, 80);
        }

        // Sound effect
        if (this.scene && this.scene.soundEffects) {
            this.scene.soundEffects.playWhipSound();
        }

        // 3. Dash back to original position
        this.scene.time.delayedCall(100, () => {
            this.dashBack(originalX, originalY);
        });
    }

    dashBack(targetX, targetY) {
        this.scene.tweens.add({
            targets: this,
            x: targetX,
            y: targetY,
            duration: 200,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                this.isDashing = false;
            }
        });
    }

    /**
     * Clean up stacks when enemies are removed.
     */
    update(time, delta) {
        super.update(time, delta);

        // Simple cleanup: if Map gets too large, clear it or check for inactive enemies
        if (this.lightningStacks.size > 50) {
            for (let [enemy, stacks] of this.lightningStacks) {
                if (!enemy || !enemy.active || enemy.hp <= 0) {
                    this.lightningStacks.delete(enemy);
                }
            }
        }
    }
}
