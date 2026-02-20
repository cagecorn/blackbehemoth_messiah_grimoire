import Phaser from 'phaser';

/**
 * SpeechBubble
 * A visual component that renders a comic-style bubble with text.
 * Automatically follows a target unit and fades out after a duration.
 */
export default class SpeechBubble extends Phaser.GameObjects.Container {
    constructor(scene, target, text, duration = 3000) {
        // Initialize at target position
        super(scene, target.x, target.y);
        this.scene = scene;
        this.target = target;
        this.scene.add.existing(this);

        this.setDepth(20000); // Higher than health bars (9999) and FX

        const padding = 10;
        const fontSize = '14px';
        const maxWidth = 220;

        // Create Text
        this.textObj = this.scene.add.text(0, 0, text, {
            fontSize,
            fill: '#000',
            align: 'center',
            wordWrap: { width: maxWidth - padding * 2 }
        });

        // Calculate dimensions
        const bounds = this.textObj.getBounds();
        const width = Math.min(maxWidth, bounds.width + padding * 2);
        const height = bounds.height + padding * 2;

        // Position text relative to container
        // We want the bubble to be above the unit
        this.textObj.setPosition(-width / 2 + padding, -height - 50 + padding);

        // Graphics for the bubble background
        this.bubble = this.scene.add.graphics();
        this.bubble.fillStyle(0xffffff, 1);
        this.bubble.lineStyle(2, 0x000000, 1);

        // Draw bubble rectangle
        const bubbleX = -width / 2;
        const bubbleY = -height - 50;
        this.bubble.fillRoundedRect(bubbleX, bubbleY, width, height, 8);
        this.bubble.strokeRoundedRect(bubbleX, bubbleY, width, height, 8);

        // Draw pointer (stem)
        this.bubble.beginPath();
        this.bubble.moveTo(-10, -50);
        this.bubble.lineTo(0, -35);
        this.bubble.lineTo(10, -50);
        this.bubble.closePath();
        this.bubble.fillPath();
        this.bubble.strokePath();

        this.add(this.bubble);
        this.add(this.textObj);

        // Life cycle - Fade in
        this.alpha = 0;
        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            duration: 200,
            ease: 'Power2'
        });

        // Auto-destruction timer
        this.scene.time.delayedCall(duration, () => {
            if (this.scene && this.active) {
                this.scene.tweens.add({
                    targets: this,
                    alpha: 0,
                    duration: 500,
                    onComplete: () => {
                        if (this.active) this.destroy();
                    }
                });
            }
        });
    }

    /**
     * Phaser internal preUpdate - perfect for following late-physics updates
     */
    preUpdate(time, delta) {
        if (!this.target || !this.target.active || this.target.hp <= 0) {
            this.destroy();
            return;
        }

        // Smoothly follow target position
        this.x = this.target.x;
        this.y = this.target.y;
    }
}
