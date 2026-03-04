import Phaser from 'phaser';
import { scaleStats } from '../Core/EntityStats.js';

/**
 * Pet.js
 * Base class for all Pets.
 * Pets automatically move towards dropped loot and collect it.
 */
export default class Pet extends Phaser.GameObjects.Container {
    constructor(scene, x, y, baseConfig, stats = { level: 1, stars: 1 }) {
        super(scene, x, y);
        this.scene = scene;

        // Scale config based on level and stars
        const config = scaleStats(baseConfig, stats.level, stats.stars);
        this.config = config;

        this.id = config.id || 'pet_' + Phaser.Math.Between(1000, 9999);
        this.unitName = config.name || 'Pet';
        this.className = 'pet'; // Added for compatibility with LootManager.js
        this.leader = null;    // Reference to the player/leader

        // Stats from scaled config
        this.hp = config.hp || 100;
        this.maxHp = config.maxHp || 100;
        this.atk = config.atk || 0;
        this.speed = config.speed || 150;
        this.followSpeed = this.speed * 0.7; // Slightly slower when just following
        this.collectRange = config.collectRange || 50;
        this.detectRange = config.detectRange || 300;
        this.followRange = 60; // Stay near leader
        this.scaleValue = config.scale || 0.8;

        this.atkRange = config.atkRange || 40;
        this.atkDelay = (config.atkSpd || 1.0) * 1000; // ms
        this.lastAtkTime = 0;
        this.isAttacking = false;

        // State
        this.targetLoot = null;
        this.targetEnemy = null;
        this.isWaddling = false;

        // Setup Physics & Rendering
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);

        this.sprite = this.scene.add.image(0, 0, config.sprite);
        this.sprite.setScale(this.scaleValue);
        this.add(this.sprite);

        this.body.setCircle(16);
        this.body.setOffset(-16, -16);
        this.body.setCollideWorldBounds(true);

        // Shadow initialization
        if (this.scene.fxManager) {
            this.shadow = this.scene.fxManager.createShadow(this);
        }

        // --- Interaction ---
        this.setInteractive(new Phaser.Geom.Circle(0, 0, 40), Phaser.Geom.Circle.Contains);
        this.on('pointerdown', (pointer) => {
            // Stop propagation so we don't click anything under the pet
            pointer.event.stopPropagation();
            this.playHappyReaction();
        });

        // Idle Bob (from Mercenary.js style)
        this.startIdleBob();

        // Update loop
        this.scene.events.on('update', this.update, this);

        console.log(`[Pet] ${this.unitName} initialized.`);
    }

    startIdleBob() {
        if (!this.sprite || !this.active) return;

        this._idleBobTween = this.scene.tweens.add({
            targets: this.sprite,
            y: { from: 0, to: -4 },
            duration: 800,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
        });
    }

    stopIdleBob() {
        if (this._idleBobTween) {
            this._idleBobTween.stop();
            this._idleBobTween = null;
        }
        if (this.sprite) this.sprite.y = 0;
    }

    update() {
        if (!this.active || !this.body) return;

        // 1. Check for target loot (Highest Priority)
        if (!this.targetLoot || !this.targetLoot.active || this.targetLoot.isCollected || !this.targetLoot.canBeCollected) {
            this.findNewLootTarget();
        }

        if (this.targetLoot) {
            this.targetEnemy = null; // Prioritize loot
            this.moveToLootTarget();
            return;
        }

        // 2. Check for enemies (Combat Priority)
        if (!this.targetEnemy || !this.targetEnemy.active || (this.targetEnemy.hp !== undefined && this.targetEnemy.hp <= 0)) {
            this.findNewCombatTarget();
        }

        if (this.targetEnemy && !this.isAttacking) {
            this.moveToCombatTarget();
        } else if (!this.isAttacking) {
            this.idleBehavior();
        }
    }

    findNewLootTarget() {
        const lootItems = this.scene.lootManager?.lootGroup?.getChildren() || [];
        let closest = null;
        let minDist = this.detectRange;

        lootItems.forEach(item => {
            if (item.active && item.canBeCollected && !item.isCollected) {
                const dist = Phaser.Math.Distance.Between(this.x, this.y, item.x, item.y);
                if (dist < minDist) {
                    minDist = dist;
                    closest = item;
                }
            }
        });

        if (closest) {
            this.targetLoot = closest;
            console.log(`[Pet] New target found: ${this.targetLoot.emojiId}`);
        } else {
            this.targetLoot = null;
        }
    }

    moveToLootTarget() {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.targetLoot.x, this.targetLoot.y);

        if (dist <= this.collectRange) {
            // Collect it!
            this.scene.lootManager.collectLoot(this, this.targetLoot);
            this.targetLoot = null;
            this.stopWaddle();
            return;
        }

        // Move towards target
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.targetLoot.x, this.targetLoot.y);
        this.body.setVelocity(
            Math.cos(angle) * this.speed,
            Math.sin(angle) * this.speed
        );

        // Flip sprite based on direction
        this.sprite.flipX = this.body.velocity.x < 0;

        this.startWaddle();
    }

    findNewCombatTarget() {
        const enemies = this.scene.enemies?.getChildren() || [];
        let closest = null;
        let minDist = this.detectRange; // Reuse detect range for combat too

        enemies.forEach(enemy => {
            if (enemy.active && enemy.hp > 0) {
                const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
                if (dist < minDist) {
                    minDist = dist;
                    closest = enemy;
                }
            }
        });

        this.targetEnemy = closest;
    }

    moveToCombatTarget() {
        if (!this.targetEnemy) return;

        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.targetEnemy.x, this.targetEnemy.y);
        const atkRange = this.atkRange;

        if (dist <= atkRange) {
            this.body.setVelocity(0, 0);
            this.stopWaddle();
            this.tryAttack();
            return;
        }

        // Move toward enemy
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.targetEnemy.x, this.targetEnemy.y);
        this.body.setVelocity(
            Math.cos(angle) * this.speed,
            Math.sin(angle) * this.speed
        );
        this.sprite.flipX = this.body.velocity.x < 0;
        this.startWaddle();
    }

    tryAttack() {
        const now = this.scene.time.now;
        if (now - this.lastAtkTime < this.atkDelay || this.isAttacking) return;

        this.lastAtkTime = now;

        // Decide attack type based on range
        if (this.atkRange > 100) {
            this.performRangedAttack();
        } else {
            this.performDashAttack();
        }
    }

    performRangedAttack() {
        if (!this.targetEnemy || !this.targetEnemy.active) return;
        this.isAttacking = true;
        this.stopWaddle();

        const target = this.targetEnemy;

        // Visual Flip
        this.sprite.flipX = (target.x < this.x);

        // Attack Animation (Simple squash/stretch)
        this.scene.tweens.add({
            targets: this.sprite,
            scaleY: this.sprite.scaleY * 0.8,
            scaleX: this.sprite.scaleX * 1.2,
            duration: 100,
            yoyo: true,
            onComplete: () => {
                if (!this.active || !target.active) {
                    this.isAttacking = false;
                    return;
                }

                // Fire Laser (Wizard style)
                const damage = this.mAtk || 5;
                const isCritical = Math.random() < 0.05;

                if (this.scene.projectileManager) {
                    this.scene.projectileManager.fire(
                        this.x, this.y, target.x, target.y,
                        damage, 'laser', true, this.scene.enemies, this, null, false, null, isCritical
                    );
                } else if (target.takeDamage) {
                    // Fallback
                    target.takeDamage(damage, this, false, null, isCritical);
                }

                this.isAttacking = false;
            }
        });
    }

    performDashAttack() {
        if (!this.targetEnemy || !this.targetEnemy.active) return;
        this.isAttacking = true;
        this.stopWaddle();
        this.stopIdleBob();

        const target = this.targetEnemy;
        const startX = this.x;
        const startY = this.y;

        // Dash toward target position + a bit extra to "strike through"
        const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
        const dashDist = 40;
        const dashX = target.x + Math.cos(angle) * 10;
        const dashY = target.y + Math.sin(angle) * 10;

        // Visual Flip
        this.sprite.flipX = (target.x < this.x);

        // Afterimage Effect
        const afterimageTimer = this.scene.time.addEvent({
            delay: 50,
            callback: () => {
                if (this.scene?.fxManager && this.active) {
                    this.scene.fxManager.createAfterimage(this, 150, 0.4);
                }
            },
            repeat: 3
        });

        this.scene.tweens.add({
            targets: this,
            x: dashX,
            y: dashY,
            duration: 150,
            ease: 'Power2',
            onComplete: () => {
                // Apply Damage
                if (target.active && target.takeDamage) {
                    const damage = this.atk || 5;
                    target.takeDamage(damage, this, false, null, Math.random() < 0.05);

                    // Small impact effect
                    if (this.scene.particleManager) {
                        this.scene.particleManager.createSparkle(target.x, target.y);
                    }
                }

                // Return to start or just end attack
                this.scene.tweens.add({
                    targets: this,
                    x: startX,
                    y: startY,
                    duration: 150,
                    ease: 'Power1',
                    delay: 50,
                    onComplete: () => {
                        this.isAttacking = false;
                        this.startIdleBob();
                    }
                });
            }
        });
    }

    /**
     * Pets are invincible.
     */
    takeDamage(damage, source) {
        // No-op. Pets do not take damage.
        console.log(`[Pet] ${this.unitName} is invincible! (Ignored ${damage} damage)`);
        return false;
    }

    idleBehavior() {
        if (this.leader && this.leader.active) {
            const dist = Phaser.Math.Distance.Between(this.x, this.y, this.leader.x, this.leader.y);

            if (dist > this.followRange) {
                const angle = Phaser.Math.Angle.Between(this.x, this.y, this.leader.x, this.leader.y);
                this.body.setVelocity(
                    Math.cos(angle) * this.followSpeed,
                    Math.sin(angle) * this.followSpeed
                );
                this.sprite.flipX = this.body.velocity.x < 0;
                this.startWaddle();
            } else {
                this.body.setVelocity(0, 0);
                this.stopWaddle();
            }
        } else {
            // Slow down to stop
            this.body.setVelocity(0, 0);
            this.stopWaddle();
        }
    }

    startWaddle() {
        if (this.isWaddling) return;
        this.isWaddling = true;
        this.stopIdleBob();

        // "뽈뽈뽈" Waddling Animation: Side-to-side tilt
        this._waddleTween = this.scene.tweens.add({
            targets: this.sprite,
            angle: { from: -10, to: 10 },
            duration: 150,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    stopWaddle() {
        if (!this.isWaddling) return;
        this.isWaddling = false;

        if (this._waddleTween) {
            this._waddleTween.stop();
            this._waddleTween = null;
        }
        if (this.sprite) this.sprite.angle = 0;

        this.startIdleBob();
    }

    playHappyReaction() {
        if (!this.active || this.isJumping) return;
        this.isJumping = true;

        // 1. Happy Jump Animation
        this.stopIdleBob();
        this.scene.tweens.add({
            targets: this.sprite,
            y: -30,
            duration: 200,
            yoyo: true,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.isJumping = false;
                if (!this.isWaddling) this.startIdleBob();
            }
        });

        // 2. Emoji & Text Popups
        if (this.scene.fxManager) {
            // Heart Emoji
            this.scene.fxManager.showEmojiPopup(this, '❤️');

            // "Yippee!" Text
            const scale = this.scaleValue;
            const text = this.scene.add.text(this.x, this.y - 70 * scale, 'Yippee!', {
                fontSize: '28px',
                fill: '#ff66aa',
                fontStyle: 'bold',
                stroke: '#fff',
                strokeThickness: 4,
                resolution: 2
            }).setOrigin(0.5);
            text.setDepth(20005);

            this.scene.tweens.add({
                targets: text,
                y: text.y - 50,
                alpha: 0,
                duration: 1000,
                ease: 'Power2',
                onComplete: () => text.destroy()
            });
        }

        console.log(`[Pet] ${this.unitName} is happy! 야호!`);
    }

    destroy() {
        this.scene.events.off('update', this.update, this);
        this.stopIdleBob();
        this.stopWaddle();
        super.destroy();
    }
}
