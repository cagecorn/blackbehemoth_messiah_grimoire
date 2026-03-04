import Phaser from 'phaser';

// ============================================================
//  ParticleManager.js
//  Lightweight visual effects using Phaser's Particle Emitters.
//
//  📌 최적화: _emitterCache를 통해 텍스처-키별 Emitter를 단 1회만 생성하고
//  이후 호출 시에는 위치(explode)만 변경하여 재사용합니다.
//  매번 생성/파괴하던 이전 방식의 메모리 파편화를 제거합니다.
// ============================================================
export default class ParticleManager {
    constructor(scene) {
        this.scene = scene;
        this._emitterCache = new Map(); // texture key → ParticleEmitter
        this._isBatterySaver = localStorage.getItem('batterySaver') === 'true';

        // Listen for Battery Saver Toggle
        import('../Events/EventBus.js').then(module => {
            const EventBus = module.default;
            EventBus.on(EventBus.EVENTS.BATTERY_SAVER_TOGGLED, this.onBatterySaverToggled, this);
        });

        console.log('[ParticleManager] 초기화 완료. Emitter 캐시 모드 활성화. ✅');
    }

    onBatterySaverToggled(enabled) {
        this._isBatterySaver = enabled;
        // Update existing cached emitters blend modes
        this._emitterCache.forEach(emitter => {
            if (emitter && emitter.active) {
                // If the emitter was originally 'ADD', switch it.
                // We assume these are 'ADD' based on current code.
                emitter.setBlendMode(enabled ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);
            }
        });
    }

    /**
     * 텍스처-키별 Emitter를 캐싱하여 반환합니다.
     * 최초 요청 시만 생성, 이후는 캐시에서 즉시 반환.
     * @param {string} textureKey
     * @param {object} config - Phaser ParticleEmitter config
     * @returns {Phaser.GameObjects.Particles.ParticleEmitter | null}
     */
    _getOrCreateEmitter(textureKey, config) {
        if (!this.scene.textures.exists(textureKey)) {
            console.warn(`[ParticleManager] 텍스처 '${textureKey}' 없음. 파티클 스킵.`);
            return null;
        }
        if (!this._emitterCache.has(textureKey)) {
            const emitter = this.scene.add.particles(0, 0, textureKey, {
                ...config,
                blendMode: (this._isBatterySaver && (config.blendMode === 'ADD' || config.blendMode === Phaser.BlendModes.ADD)) ? 'NORMAL' : (config.blendMode || 'NORMAL'),
                emitting: false
            });
            this._emitterCache.set(textureKey, emitter);
            console.log(`[ParticleManager] Emitter '${textureKey}' 최초 생성 (캐싱됨).`);
        }
        return this._emitterCache.get(textureKey);
    }

    /**
     * 스파클 폭발 이펙트 (버프, 아이템 획득 등).
     * @param {number} x
     * @param {number} y
     * @param {string} texture
     */
    createSparkle(x, y, texture = 'emoji_sparkle') {
        const emitter = this._getOrCreateEmitter(texture, {
            speed: { min: 50, max: 150 },
            scale: { start: 0.2, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 800,
            blendMode: 'ADD',
            gravityY: -50,
            maxParticles: 15,
        });
        if (!emitter) return;
        emitter.setPosition(x, y);
        emitter.explode(15);
    }

    /**
     * 지속 오라 이펙트 (버프/상태이상 지속 표시용).
     * @param {Phaser.GameObjects.GameObject} target
     * @param {string} texture
     * @param {number} tint
     * @returns {Phaser.GameObjects.Particles.ParticleEmitter}
     */
    createAura(target, texture = 'emoji_sparkle', tint = 0x55ff55) {
        if (!this.scene.textures.exists(texture)) {
            console.warn(`[ParticleManager] 텍스처 '${texture}' 없음. 오라 스킵.`);
            return null;
        }
        // 오라는 유닛마다 독립적인 에미터가 필요하므로 캐싱하지 않고 생성.
        // (호출 빈도가 낮고, 유닛 수명과 함께 destroy되므로 허용)
        const emitter = this.scene.add.particles(0, 0, texture, {
            speed: { min: 20, max: 40 },
            scale: { start: 0.15, end: 0 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 1000,
            gravityY: -20,
            frequency: 100,
            follow: target,
            tint: tint
        });
        return emitter;
    }

    /**
     * 바람/슬래시 방향성 폭발 파티클 (고속 이동, 돌격 스킬 등).
     * @param {number} x
     * @param {number} y
     * @param {number} angleRad - 방향 (라디안)
     * @param {string} texture
     */
    createWindSlash(x, y, angleRad, texture = 'emoji_sparkle') {
        const cacheKey = `wind_${texture}`;
        const emitter = this._getOrCreateEmitter(texture, {
            speed: { min: 200, max: 400 },
            angle: {
                min: Phaser.Math.RadToDeg(angleRad) - 20,
                max: Phaser.Math.RadToDeg(angleRad) + 20
            },
            scale: { start: 0.25, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 300,
            blendMode: 'ADD',
            tint: 0xaaffff,
            quantity: 15,
        });
        if (!emitter) return;

        // 방향은 explode 전에 업데이트
        emitter.setEmitterAngle({
            min: Phaser.Math.RadToDeg(angleRad) - 20,
            max: Phaser.Math.RadToDeg(angleRad) + 20
        });
        emitter.setPosition(x, y);
        emitter.explode(15);
    }
}
