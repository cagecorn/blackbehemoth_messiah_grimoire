import Phaser from 'phaser';

/**
 * SpeechBubble
 * A visual component that renders a comic-style bubble with text.
 * Automatically fades out after a duration.
 */
export default class SpeechBubble extends Phaser.GameObjects.Container {
    constructor(scene, x, y, text, duration = 3000) {
        super(scene, x, y);
        this.scene = scene;
        this.scene.add.existing(this);

        this.setDepth(1000); // Always on top

        const padding = 10;
        const fontSize = '14px';
        const maxWidth = 200;

        // Create Text
        this.textObj = this.scene.add.text(0, 0, text, {
            fontSize,
            fill: '#000',
            align: 'center',
            wordWrap: { width: maxWidth - padding * 2 }
        });

        // Calculate dimensions
        const bounds = this.textObj.getBounds();
        const width = bounds.width + padding * 2;
        const height = bounds.height + padding * 2;

        // Position text relative to container
        this.textObj.setPosition(-width / 2 + padding, -height - 40 + padding);

        // Graphics for the bubble background
        this.bubble = this.scene.add.graphics();
        this.bubble.fillStyle(0xffffff, 1);
        this.bubble.lineStyle(2, 0x000000, 1);

        // Draw bubble rectangle
        const bubbleX = -width / 2;
        const bubbleY = -height - 40;
        this.bubble.fillRoundedRect(bubbleX, bubbleY, width, height, 8);
        this.bubble.strokeRoundedRect(bubbleX, bubbleY, width, height, 8);

        // Draw pointer (stem)
        this.bubble.beginPath();
        this.bubble.moveTo(-10, -40);
        this.bubble.lineTo(0, -25);
        this.bubble.lineTo(10, -40);
        this.bubble.closePath();
        this.bubble.fillPath();
        this.bubble.strokePath();

        this.add(this.bubble);
        this.add(this.textObj);

        // Life cycle
        this.scene.tweens.add({
            targets: this,
            alpha: { from: 0, to: 1 },
            y: y - 10,
            duration: 200,
            ease: 'Power2'
        });

        this.scene.time.delayedCall(duration, () => {
            this.scene.tweens.add({
                targets: this,
                alpha: 0,
                y: y - 20,
                duration: 500,
                onComplete: () => this.destroy()
            });
        });
    }
}
