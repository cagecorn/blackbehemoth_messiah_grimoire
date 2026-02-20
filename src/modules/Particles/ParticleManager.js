import Phaser from 'phaser';

/**
 * ParticleManager.js
 * Specialized manager for lightweight visual effects using Phaser's Particle Emitters.
 */
export default class ParticleManager {
    constructor(scene) {
        this.scene = scene;
        this.emitters = new Map();
    }

    /**
     * Create a sparkle effect at x, y
     * @param {number} x 
     * @param {number} y 
     * @param {string} texture - The key of the image/emoji to use as a particle
     */
    createSparkle(x, y, texture = 'emoji_sparkle') {
        const emitter = this.scene.add.particles(x, y, texture, {
            speed: { min: 50, max: 150 },
            scale: { start: 0.4, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 800,
            blendMode: 'ADD',
            gravityY: -50,
            maxParticles: 15,
            emitting: false
        });

        emitter.explode(15);

        // Auto cleanup
        this.scene.time.delayedCall(1000, () => {
            emitter.destroy();
        });
    }

    /**
     * Continuous aura effect (e.g. for a buff or status)
     */
    createAura(target, texture = 'emoji_sparkle', tint = 0x55ff55) {
        const emitter = this.scene.add.particles(0, 0, texture, {
            speed: { min: 20, max: 40 },
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 1000,
            gravityY: -20,
            frequency: 100,
            follow: target,
            tint: tint
        });

        return emitter; // Caller survives the lifecycle
    }
}
