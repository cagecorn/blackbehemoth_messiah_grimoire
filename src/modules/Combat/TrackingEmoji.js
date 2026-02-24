import Phaser from 'phaser';

/**
 * TrackingEmoji
 * A specialized projectile that tracks a target (ally or enemy)
 * and applies an effect upon contact.
 */
export default class TrackingEmoji extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, texture, target, effect, owner) {
        super(scene, x, y, texture);
        this.scene = scene;
        this.target = target;
        this.effect = effect;
        this.owner = owner;
        this.speed = 400;
        this.hitThreshold = 30;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setDisplaySize(32, 32);

        // Add some rotation juice
        this.scene.tweens.add({
            targets: this,
            angle: 360,
            duration: 1000,
            repeat: -1
        });
    }

    preUpdate(time, delta) {
        if (!this.target || !this.target.active || this.target.hp <= 0) {
            this.fadeOut();
            return;
        }

        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
        this.body.setVelocity(
            Math.cos(angle) * this.speed,
            Math.sin(angle) * this.speed
        );

        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
        if (dist < this.hitThreshold) {
            this.handleHit();
        }
    }

    handleHit() {
        if (this.effect && typeof this.effect === 'function') {
            this.effect(this.target, this.owner, this.scene);
        }

        if (this.scene.fxManager) {
            this.scene.fxManager.createSparkleEffect({ x: this.x, y: this.y, active: true });
        }

        this.destroy();
    }

    fadeOut() {
        if (this.isFading) return;
        this.isFading = true;
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 300,
            onComplete: () => this.destroy()
        });
    }
}
