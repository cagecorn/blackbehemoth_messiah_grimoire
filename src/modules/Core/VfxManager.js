import Phaser from 'phaser';

/**
 * VfxManager
 * Handles Chromatic Aberration using Optimized RenderTexture.
 */
export default class VfxManager {
    constructor(scene) {
        this.scene = scene;
        this.rt = null;
        this.redGhost = null;
        this.blueGhost = null;
        this.isEnabled = true;

        this.config = {
            offset: 4,           // Increased offset for better visibility
            alpha: 0.45,         // Adjusted alpha
            updateFrequency: 2    // Update every 2 frames for performance
        };

        this.frameCounter = 0;
        this.init();
    }

    init() {
        const { width, height } = this.scene.scale;

        this.rt = this.scene.add.renderTexture(0, 0, width, height);
        this.rt.setVisible(false);

        // Layers setup
        this.redGhost = this.scene.add.image(0, 0, this.rt.texture);
        this.redGhost.setOrigin(0);
        this.redGhost.setTint(0xff0000);
        this.redGhost.setBlendMode(Phaser.BlendModes.SCREEN);
        this.redGhost.setAlpha(this.config.alpha);
        this.redGhost.setScrollFactor(0);
        this.redGhost.setDepth(200000);

        this.blueGhost = this.scene.add.image(0, 0, this.rt.texture);
        this.blueGhost.setOrigin(0);
        this.blueGhost.setTint(0x0000ff);
        this.blueGhost.setBlendMode(Phaser.BlendModes.SCREEN);
        this.blueGhost.setAlpha(this.config.alpha);
        this.blueGhost.setScrollFactor(0);
        this.blueGhost.setDepth(200000);

        // Advanced Edge Blur using postFX
        if (this.redGhost.postFX) {
            // Apply a soft blur to ghosts to mimic lens behavior
            this.redGhost.postFX.addBlur(1, 1, 1, 2);
            this.blueGhost.postFX.addBlur(1, 1, 1, 2);

            // Vignette the ghosting so it only appears at edges (Chromatic Aberration is typically an edge phenomenon)
            this.redGhost.postFX.addVignette(0.5, 0.5, 0.4, 0.4);
            this.blueGhost.postFX.addVignette(0.5, 0.5, 0.4, 0.4);
        }

        console.log('[VfxManager] Chromatic Aberration Optimized. 🎨');
    }

    update() {
        if (!this.isEnabled) return;
        this.frameCounter++;
        if (this.frameCounter % this.config.updateFrequency !== 0) return;

        // Optimized Capture: temporarily hide overlays
        this.redGhost.setVisible(false);
        this.blueGhost.setVisible(false);

        this.rt.clear();

        // Draw the scene objects that are visible to the camera
        // Using draw() on the scene is the most complete way without an explicit world container
        this.rt.draw(this.scene.children.list.filter(c => c !== this.rt && c !== this.redGhost && c !== this.blueGhost && c.visible && c.alpha > 0));

        this.redGhost.setVisible(true);
        this.blueGhost.setVisible(true);

        // Pulse offset
        const pulse = Math.sin(this.scene.time.now / 400) * 1.5;
        this.redGhost.x = -(this.config.offset + pulse);
        this.blueGhost.x = (this.config.offset + pulse);
    }

    destroy() {
        if (this.rt) this.rt.destroy();
        if (this.redGhost) this.redGhost.destroy();
        if (this.blueGhost) this.blueGhost.destroy();
    }
}
