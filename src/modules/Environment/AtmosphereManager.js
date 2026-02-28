import Phaser from 'phaser';

/**
 * AtmosphereManager
 * Handles immersive atmospheric effects like parallax dust particles.
 */
export default class AtmosphereManager {
    constructor(scene) {
        this.scene = scene;
        this.layers = [];
        this.textureKey = 'vfx_dust_particle';

        this.init();
    }

    init() {
        this.createDustTexture();
        this.createParallaxLayers();
        console.log('[AtmosphereManager] Atmospheric Dust System (Optimized) Initialized. ✨☁️');
    }

    createDustTexture() {
        if (this.scene.textures.exists(this.textureKey)) return;

        const size = 32;
        const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });

        // Draw a soft glowy dot
        // Core
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(size / 2, size / 2, size / 8);

        // Outer glow
        graphics.fillStyle(0xffffff, 0.3);
        graphics.fillCircle(size / 2, size / 2, size / 4);

        graphics.generateTexture(this.textureKey, size, size);
    }

    createParallaxLayers() {
        const { width, height } = this.scene.scale;

        // Configuration with better visibility and fixed depths
        const layerConfigs = [
            {
                name: 'Far',
                depth: 100,         // Just above background
                scrollFactor: 0.1,   // Almost static
                alpha: { start: 0.3, end: 0 },
                scale: { start: 0.3, end: 0.5 },
                speedX: { min: 2, max: 10 },
                speedY: { min: -2, max: 2 },
                quantity: 1,
                frequency: 150
            },
            {
                name: 'Mid',
                depth: 14000,       // Above units, below UI
                scrollFactor: 0.6,
                alpha: { start: 0.4, end: 0 },
                scale: { start: 0.5, end: 0.8 },
                speedX: { min: 10, max: 20 },
                speedY: { min: -5, max: 5 },
                quantity: 1,
                frequency: 300
            },
            {
                name: 'Near',
                depth: 200000,      // In front of everything
                scrollFactor: 1.5,
                alpha: { start: 0.6, end: 0 },
                scale: { start: 1.0, end: 1.8 },
                speedX: { min: 40, max: 80 },
                speedY: { min: -10, max: 10 },
                quantity: 1,
                frequency: 600
            }

        ];

        layerConfigs.forEach(config => {
            // Optimization: Use emitter pool and bounds
            const emitter = this.scene.add.particles(0, 0, this.textureKey, {
                x: { min: -width, max: width * 2 }, // Extra wide for camera movement
                y: { min: -height, max: height * 2 },
                lifespan: { min: 5000, max: 10000 },
                speedX: config.speedX,
                speedY: config.speedY,
                scale: config.scale,
                alpha: config.alpha,
                blendMode: 'ADD',
                frequency: config.frequency,
                quantity: config.quantity,
                follow: this.scene.cameras.main,
                followOffset: { x: -width / 2, y: -height / 2 }
            });

            emitter.setDepth(config.depth);
            // By using scrollFactor on an emitter that follows camera, we get true parallax
            emitter.setScrollFactor(config.scrollFactor);

            this.layers.push(emitter);
        });
    }

    update() {
        // Particles handle themselves via speed and camera follow
    }

    destroy() {
        this.layers.forEach(l => l.destroy());
    }
}
