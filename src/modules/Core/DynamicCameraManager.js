import EventBus from '../Events/EventBus.js';

/**
 * DynamicCameraManager.js
 * Handles cinematic camera effects like Shake, Jitter, and Dynamic Follow.
 * Inspired by Bourne Identity's handheld "shaky cam" style.
 */
export default class DynamicCameraManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        // Configuration
        this.config = {
            followLerp: 0.1,
            jitterIntensity: 1.5,
            jitterSpeed: 0.05,
            shakeDecay: 0.95,
            maxShake: 20,
            minZoom: 0.8,
            maxZoom: 2.5,
            zoomLerp: 0.1,
            zoomSensitivity: 0.005
        };

        // Internal State
        this.shakeAmount = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.target = null;
        this.targetZoom = this.camera.zoom;
        this.prevPinchDist = 0;

        // Jitter state (Simplex-like noise simulation using simple sine waves)
        this.noiseTime = 0;

        this.init();
    }

    init() {
        // Listen for Camera Shake events
        this.handleShakeEvent = (payload) => {
            const intensity = payload.intensity || 10;
            this.shake(intensity);
        };
        EventBus.on(EventBus.EVENTS.CAMERA_SHAKE, this.handleShakeEvent);

        // Cleanup on scene shutdown
        this.scene.events.once('shutdown', () => {
            EventBus.off(EventBus.EVENTS.CAMERA_SHAKE, this.handleShakeEvent);
        });

        // Setup Input Listeners for Zoom
        this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            this.handleWheelZoom(deltaY);
        });

        console.log('[Camera] DynamicCameraManager Initialized. 🎬 Ready for some Bourne-style action.');
    }

    handleWheelZoom(deltaY) {
        const zoomDelta = deltaY > 0 ? -0.1 : 0.1;
        this.targetZoom = Phaser.Math.Clamp(this.targetZoom + zoomDelta, this.config.minZoom, this.config.maxZoom);
    }

    handlePinchZoom() {
        const pointer1 = this.scene.input.pointer1;
        const pointer2 = this.scene.input.pointer2;

        if (pointer1 && pointer2 && pointer1.isDown && pointer2.isDown) {
            const dist = Phaser.Math.Distance.Between(pointer1.x, pointer1.y, pointer2.x, pointer2.y);

            if (this.prevPinchDist > 0) {
                const delta = dist - this.prevPinchDist;
                const zoomDelta = delta * this.config.zoomSensitivity;
                this.targetZoom = Phaser.Math.Clamp(this.targetZoom + zoomDelta, this.config.minZoom, this.config.maxZoom);
            }
            this.prevPinchDist = dist;
        } else {
            this.prevPinchDist = 0;
        }
    }

    setTarget(target) {
        this.target = target;
        if (target) {
            this.camera.startFollow(target, true, this.config.followLerp, this.config.followLerp);
        }
    }

    /**
     * Trigger a quick, high-intensity shake (Impact)
     * @param {number} intensity - Pixels to shake
     */
    shake(intensity) {
        this.shakeAmount = Math.min(this.config.maxShake, this.shakeAmount + intensity);
        console.debug(`[Camera] Shaking with intensity: ${intensity}`);
    }

    /**
     * Main update loop called by the scene
     */
    update(time, delta) {
        if (!this.target) return;

        // 1. Calculate Jitter (Handheld feel)
        this.noiseTime += this.config.jitterSpeed * (delta / 16);
        const jitterX = Math.sin(this.noiseTime * 1.3) * this.config.jitterIntensity;
        const jitterY = Math.cos(this.noiseTime * 0.7) * this.config.jitterIntensity;

        // 2. Calculate Shake (Impacts)
        let impactX = 0;
        let impactY = 0;
        if (this.shakeAmount > 0.1) {
            impactX = (Math.random() - 0.5) * 2 * this.shakeAmount;
            impactY = (Math.random() - 0.5) * 2 * this.shakeAmount;
            this.shakeAmount *= this.config.shakeDecay;
        } else {
            this.shakeAmount = 0;
        }

        // 3. Apply Offsets to Camera Follow Target
        this.camera.setFollowOffset(jitterX + impactX, jitterY + impactY);

        // 4. Update Zoom (Smooth Lerp)
        this.handlePinchZoom();
        if (Math.abs(this.camera.zoom - this.targetZoom) > 0.001) {
            this.camera.zoom = Phaser.Math.Linear(this.camera.zoom, this.targetZoom, this.config.zoomLerp);
        }
    }
}
