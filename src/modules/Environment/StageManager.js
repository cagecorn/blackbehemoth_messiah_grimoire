import Phaser from 'phaser';

/**
 * StageManager.js
 * Handles environment visual rendering (backgrounds) based on StageConfiguration.
 */
export default class StageManager {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
    }

    buildStage(worldWidth, worldHeight) {
        if (!this.config || !this.config.background) return;

        // Add the background image to the center of the world bounds
        const bg = this.scene.add.image(worldWidth / 2, worldHeight / 2, this.config.background);

        // Push it all the way to the back
        bg.setDepth(-1000);

        // Optionally scale it to cover the active playable area
        // Depending on art style, we might tile it or stretch it.
        // For a single large illustration, we calculate scaling:
        const scaleX = worldWidth / bg.width;
        const scaleY = worldHeight / bg.height;
        const scale = Math.max(scaleX, scaleY); // Cover

        bg.setScale(scale);

        console.log(`[StageManager] Rendered stage: ${this.config.name}`);
    }
}
