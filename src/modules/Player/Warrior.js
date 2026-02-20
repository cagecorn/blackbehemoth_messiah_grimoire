import Phaser from 'phaser';
import Mercenary from './Mercenary.js';
import applyMeleeAI from '../AI/MeleeAI.js';
import { MercenaryClasses } from '../Core/EntityStats.js';
import ChargeAttack from '../Skills/ChargeAttack.js';

/**
 * Warrior.js
 * Specialist in Melee combat. Supports manual WASD movement for debugging.
 */
export default class Warrior extends Mercenary {
    constructor(scene, x, y) {
        super(scene, x, y, MercenaryClasses.WARRIOR);

        // Input setup for manual control
        this.cursors = this.scene.input.keyboard.createCursorKeys();
        this.wasd = this.scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        // Instantiate Skill
        this.skill = new ChargeAttack({
            cooldown: 8000,
            damageMultiplier: 2.0,
            aoeRadius: 100,
            clusterRadius: 120, // look for goblins within 120px of each other
            dashSpeedMultiplier: 8, // fast dash
            ccDuration: 2000, // 2 second airborne
            ccHeight: 120 // launch them high
        });

        // Initialize Melee AI in Manual Mode by default
        this.initAI();
    }

    getSkillProgress() {
        if (!this.skill) return 0;
        return this.skill.getCooldownProgress(this.scene.time.now, this.castSpd);
    }

    initAI() {
        // Targets are entities in the scene.enemies group
        applyMeleeAI(this, (agent) => agent.scene.enemies, 'AGGRESSIVE');
    }

    update() {
        super.update();

        // Handle Manual Movement Override
        let isMovingManually = false;
        let vx = 0;
        let vy = 0;

        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            vx = -this.speed;
            isMovingManually = true;
        } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
            vx = this.speed;
            isMovingManually = true;
        }

        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            vy = -this.speed;
            isMovingManually = true;
        } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
            vy = this.speed;
            isMovingManually = true;
        }

        if (isMovingManually) {
            // Manual Override: Cancel AI Aggression
            if (this.blackboard.get('ai_state') !== 'MANUAL') {
                this.blackboard.set('ai_state', 'MANUAL');
                console.log(`[${this.unitName}] Manual override engaged, AI disabled.`);
            }
            this.body.setVelocity(vx, vy);
            this.body.velocity.normalize().scale(this.speed);
        } else if (this.blackboard && this.blackboard.get('ai_state') !== 'AGGRESSIVE') {
            // Stop moving if purely manual and keys are released
            this.body.setVelocity(0);
        }

        // Auto-cast Skills when Aggressive (Not Manual)
        if (!isMovingManually && this.blackboard && this.blackboard.get('ai_state') === 'AGGRESSIVE') {
            // Only try if we can act and enemies exist
            if (!this.isAirborne && !this.isStunned && this.scene && this.scene.enemies) {
                this.skill.execute(this, this.scene.enemies.getChildren());
            }
        }

        // Apply visual orientation after manual velocity has been calculated and applied
        this.updateVisualOrientation();
    }
}
