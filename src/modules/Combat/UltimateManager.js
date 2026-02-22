import Phaser from 'phaser';

/**
 * UltimateManager.js
 * Handles the dramatic cutscene effects for ultimate skills.
 */
export default class UltimateManager {
    constructor(scene) {
        this.scene = scene;
        this.isCinematicActive = false;
        this.queue = [];
    }

    /**
     * Trigger the ultimate cutscene sequence. (Queued)
     * @param {Mercenary} unit - The mercenary using the ultimate
     * @param {string} skillName - Name of the ultimate skill
     */
    async playCutscene(unit, skillName) {
        return new Promise((resolve) => {
            this.queue.push({ unit, skillName, resolve });

            if (!this.isCinematicActive) {
                this.processQueue();
            }
        });
    }

    async processQueue() {
        if (this.queue.length === 0) {
            this.isCinematicActive = false;
            return;
        }

        this.isCinematicActive = true;
        const { unit, skillName, resolve } = this.queue[0];

        // 1. Pause Logic
        if (this.scene.physics && this.scene.physics.world) {
            this.scene.physics.world.pause();
        }
        this.scene.isUltimateActive = true;

        // 2. Execute Animation
        await this._executeCutscene(unit, skillName);

        // 3. Resume Logic
        if (this.scene.physics && this.scene.physics.world) {
            this.scene.physics.world.resume();
        }
        this.scene.isUltimateActive = false;

        // 4. Resolve current and continue
        resolve();
        this.queue.shift();
        this.processQueue();
    }

    /**
     * Internal animation logic
     */
    async _executeCutscene(unit, skillName) {
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;

        // Darken Overlay
        const overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
            .setScrollFactor(0)
            .setDepth(30000)
            .setAlpha(0);

        this.scene.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 300
        });

        // Mercenary Sprite Close-up
        const spriteKey = unit.config.sprite;
        const closeUp = this.scene.add.image(-200, height - 150, spriteKey)
            .setScrollFactor(0)
            .setDepth(30001)
            .setScale(4)
            .setTint(0xffffff);

        // Skill Name Text
        const text = this.scene.add.text(width + 200, height - 100, `[ ${skillName} ]`, {
            fontSize: '64px',
            fontStyle: 'bold italic',
            fill: '#ffcc00',
            stroke: '#000',
            strokeThickness: 8,
            fontFamily: 'Arial Black'
        }).setScrollFactor(0).setDepth(30002).setAlpha(0);

        return new Promise(res => {
            // Slide in unit
            this.scene.tweens.add({
                targets: closeUp,
                x: 150,
                duration: 400,
                ease: 'Back.easeOut'
            });

            // Slide in text
            this.scene.tweens.add({
                targets: text,
                x: width / 2,
                alpha: 1,
                duration: 300,
                ease: 'Power2',
                delay: 200
            });

            // Flash effect
            const flash = this.scene.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 1)
                .setScrollFactor(0).setDepth(30005).setAlpha(0);

            this.scene.tweens.add({
                targets: flash,
                alpha: 1,
                duration: 100,
                yoyo: true,
                delay: 1000
            });

            // Fade out everyone
            this.scene.tweens.add({
                targets: [closeUp, text, overlay],
                alpha: 0,
                duration: 500,
                ease: 'Power2',
                delay: 1500,
                onComplete: () => {
                    closeUp.destroy();
                    text.destroy();
                    overlay.destroy();
                    flash.destroy();
                    res();
                }
            });
        });
    }
}
