import Phaser from 'phaser';

// ============================================================
//  AmbientMoteManager.js
//  환경 부유 먼지/빛 가루 — 3레이어 시차(Parallax) 파티클.
//
//  📌 설계 원칙:
//    1. 3개의 독립 레이어 (near / mid / far)
//    2. 각 레이어마다 scrollFactor를 다르게 설정하여
//       카메라 이동 시 자연스러운 원근 시차를 연출합니다.
//    3. 파티클 수는 극소(총 ~40개)로 유지하여 퍼포먼스 영향 0.
//    4. 별도 텍스처를 프로시저럴(코드) 생성하여 에셋 의존 없음.
// ============================================================

/**
 * Mote Layer 설정 목록
 * scrollFactor가 1보다 작을수록 "먼 곳"에 있어 카메라에 덜 따라감 → 원근감
 * scrollFactor가 1보다 클수록 "가까이" 있어 카메라보다 빨리 움직임 → 전경 원근
 */
const MOTE_LAYERS = [
    {
        id: 'far',
        scrollFactor: 0.3,       // 멀리 → 카메라의 30%만 따라감
        count: 18,
        speedMin: 3,
        speedMax: 8,
        scaleMin: 0.15,
        scaleMax: 0.35,
        alphaStart: 0.15,
        alphaEnd: 0,
        lifespan: { min: 8000, max: 14000 },
        depth: -800,             // 유닛보다 뒤, 배경보다 앞
        tint: 0x8888ff,          // 푸른 빛 (저주받은 숲 분위기)
        frequency: 600,          // 600ms마다 1개 방출
    },
    {
        id: 'mid',
        scrollFactor: 0.65,      // 중간 → 카메라의 65% 추종
        count: 14,
        speedMin: 5,
        speedMax: 12,
        scaleMin: 0.25,
        scaleMax: 0.5,
        alphaStart: 0.2,
        alphaEnd: 0,
        lifespan: { min: 6000, max: 10000 },
        depth: -400,
        tint: 0xaabbff,
        frequency: 800,
    },
    {
        id: 'near',
        scrollFactor: 1.15,      // 가까이 → 카메라보다 약간 빠르게
        count: 8,
        speedMin: 8,
        speedMax: 18,
        scaleMin: 0.4,
        scaleMax: 0.8,
        alphaStart: 0.3,
        alphaEnd: 0,
        lifespan: { min: 4000, max: 7000 },
        depth: 14000,            // 유닛 위, skillFxLayer 아래
        tint: 0xccddff,
        frequency: 1200,
    }
];

const MOTE_TEXTURE_KEY = 'ambient_mote_soft';

export default class AmbientMoteManager {
    /**
     * @param {Phaser.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
        /** @type {Phaser.GameObjects.Particles.ParticleEmitter[]} */
        this.emitters = [];
        this._ensureTexture();
        this._createLayers();
        console.log(`[AmbientMoteManager] ${MOTE_LAYERS.length}레이어 Parallax 부유 먼지 활성화 ✨`);
    }

    // ── 프로시저럴 소프트 원 텍스처 생성 ────────────────
    _ensureTexture() {
        if (this.scene.textures.exists(MOTE_TEXTURE_KEY)) return;

        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Soft radial gradient circle
        const gradient = ctx.createRadialGradient(
            size / 2, size / 2, 0,
            size / 2, size / 2, size / 2
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
        gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        this.scene.textures.addCanvas(MOTE_TEXTURE_KEY, canvas);
        console.log('[AmbientMoteManager] 소프트 원 텍스처 프로시저럴 생성 완료');
    }

    // ── 레이어별 파티클 이미터 생성 ────────────────────
    _createLayers() {
        const cam = this.scene.cameras.main;
        // 카메라 뷰포트 기준으로 랜덤 위치에 파티클 방출
        // emitZone은 뷰포트 범위 + 여유분

        MOTE_LAYERS.forEach(layer => {
            const emitter = this.scene.add.particles(0, 0, MOTE_TEXTURE_KEY, {
                speed: { min: layer.speedMin, max: layer.speedMax },
                angle: { min: 250, max: 290 },    // 대략 위로 떠오르는 방향
                scale: { start: layer.scaleMin, end: layer.scaleMax },
                alpha: { start: layer.alphaStart, end: layer.alphaEnd },
                lifespan: layer.lifespan,
                blendMode: Phaser.BlendModes.ADD,
                tint: layer.tint,
                frequency: layer.frequency,
                maxParticles: layer.count,
                emitting: true,

                // 카메라 뷰포트 기준 방출 영역
                emitZone: {
                    type: 'random',
                    source: new Phaser.Geom.Rectangle(
                        -100, -100,
                        cam.width + 200,
                        cam.height + 200
                    )
                }
            });

            // ── 핵심: scrollFactor로 원근 시차 ──
            emitter.setScrollFactor(layer.scrollFactor);
            emitter.setDepth(layer.depth);

            this.emitters.push({ emitter, config: layer });
        });
    }

    /**
     * 매 프레임 호출 — emitZone 위치를 카메라에 동기화.
     * scrollFactor가 1.0이 아닌 이미터들의 emitZone 위치를
     * 카메라 스크롤 위치에 맞춰 조정합니다.
     */
    update() {
        const cam = this.scene.cameras.main;

        this.emitters.forEach(({ emitter, config }) => {
            // scrollFactor 보정: 이미터의 월드 좌표를
            // 카메라 스크롤 × scrollFactor로 맞춤
            const sf = config.scrollFactor;
            emitter.setPosition(cam.scrollX * sf, cam.scrollY * sf);
        });
    }

    /**
     * bgCamera에는 mote가 블러되지 않도록 ignore 처리용 배열 반환.
     * @returns {Phaser.GameObjects.Particles.ParticleEmitter[]}
     */
    getEmittersForCameraIgnore() {
        return this.emitters.map(e => e.emitter);
    }

    destroy() {
        this.emitters.forEach(({ emitter }) => {
            emitter.destroy();
        });
        this.emitters = [];
        console.log('[AmbientMoteManager] 정리 완료');
    }
}
