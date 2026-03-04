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

        // 1. Selective Pause Logic
        if (this.scene.physics && this.scene.physics.world) {
            this.scene.physics.world.pause();
        }

        // Capture currently active tweens and pause them
        const capturedTweens = this.scene.tweens.getTweens().filter(t => t.active && !t.paused);
        capturedTweens.forEach(t => t.pause());

        // Capture currently active timers and pause them
        const capturedTimers = [];
        if (this.scene.time && this.scene.time._active) {
            this.scene.time._active.forEach(event => {
                if (!event.paused) {
                    event.paused = true;
                    capturedTimers.push(event);
                }
            });
        }

        this.scene.isUltimateActive = true;

        try {
            // 2. Execute Animation
            await this._executeCutscene(unit, skillName);
        } catch (err) {
            console.error("[UltimateManager] Error during cutscene:", err);
        } finally {
            // 3. Resume Logic
            if (this.scene.physics && this.scene.physics.world) {
                this.scene.physics.world.resume();
            }

            // Resume captured tweens
            capturedTweens.forEach(t => {
                if (t && t.active) t.resume();
            });

            // Resume captured timers
            capturedTimers.forEach(event => {
                if (event) event.paused = false;
            });

            this.scene.isUltimateActive = false;

            // 4. Resolve current and continue
            resolve();
            this.queue.shift();
            this.processQueue();
        }
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

        if (this.scene.uiLayer) this.scene.uiLayer.add(overlay);

        this.scene.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 300
        });

        // Mercenary Sprite Close-up
        let spriteKey = unit.config.sprite;
        let scale = 4;
        let yOffset = height - 300; // Raised from 150 to avoid HUD

        // Special case: high-res cutscene characters
        const cutsceneChars = ['merlin', 'aren', 'sera', 'lute', 'nickle', 'bao', 'king', 'leona', 'silvi', 'ella', 'boon', 'nana', 'noah', 'noel', 'aina', 'wrinkle', 'veve'];
        if (cutsceneChars.includes(unit.characterId)) {
            spriteKey = unit.characterId + '_cutscene';
            scale = 1.0;
            yOffset = height - 350; // Raised further for high-res images to stay clear of portraits
        }

        const closeUp = this.scene.add.image(-200, yOffset, spriteKey)
            .setScrollFactor(0)
            .setDepth(30001)
            .setScale(scale)
            .setTint(0xffffff);

        if (this.scene.uiLayer) this.scene.uiLayer.add(closeUp);

        // Skill Name Text - positioned over the sprite on the left side
        const text = this.scene.add.text(30, height - 450, `[ ${skillName} ]`, {
            fontSize: '52px',
            fontStyle: 'bold italic',
            fill: '#ffcc00',
            stroke: '#000',
            strokeThickness: 8,
            fontFamily: 'Arial Black',
            wordWrap: { width: width - 60, useAdvancedWrap: true }
        }).setScrollFactor(0).setDepth(30002).setAlpha(0);

        if (this.scene.uiLayer) this.scene.uiLayer.add(text);

        return new Promise(res => {
            // Slide in unit
            this.scene.tweens.add({
                targets: closeUp,
                x: 150,
                duration: 400,
                ease: 'Back.easeOut'
            });

            // Fade in text (no slide - it's already positioned on the left)
            this.scene.tweens.add({
                targets: text,
                alpha: 1,
                duration: 300,
                ease: 'Power2',
                delay: 200
            });

            // Flash effect
            const flash = this.scene.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 1)
                .setScrollFactor(0).setDepth(30005).setAlpha(0);

            if (this.scene.uiLayer) this.scene.uiLayer.add(flash);

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
