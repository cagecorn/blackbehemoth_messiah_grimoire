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
    /**
     * Internal animation logic - NOW USING DOM via UIManager
     */
    async _executeCutscene(unit, skillName) {
        if (!this.scene.game.uiManager) {
            console.warn("[UltimateManager] UIManager not found, skipping cutscene.");
            return;
        }

        // Just delegate to the UIManager and wait for completion
        // The UIManager handles the DOM overlay, animations, and high-res sprites
        // which prevents the camera zoom bugs.
        await this.scene.game.uiManager.showUltimateCutscene(unit.characterId, skillName, 3000);
    }
}
