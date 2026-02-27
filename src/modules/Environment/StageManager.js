import Phaser from 'phaser';

// ============================================================
//  StageManager.js
//  스테이지 환경 렌더링 (배경 및 분위기 레이어).
//
//  📌 앰비언트 컬러 레이어:
//    StageConfig.ambientColor / ambientAlpha 설정값을 읽어
//    배경 위에 반투명 컬러 오버레이를 씌웁니다.
//    맵마다 고유한 분위기를 색상으로 표현할 수 있습니다.
//    예: 저주받은 숲 → 진한 보라, 화산 지형 → 붉은 주황
// ============================================================
export default class StageManager {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
    }

    buildStage(worldWidth, worldHeight) {
        if (!this.config || !this.config.background) return;

        // ── 1. 배경 이미지 ───────────────────────────────────────
        const bg = this.scene.add.image(worldWidth / 2, worldHeight / 2, this.config.background);
        bg.setDepth(-1000);
        bg.setOrigin(0.5, 0.5);

        const scaleX = worldWidth / bg.width;
        const scaleY = worldHeight / bg.height;
        bg.setScale(Math.max(scaleX, scaleY));

        bg.setAlpha(1.0);
        bg.setTint(0xffffff);

        console.log(`[StageManager] 스테이지 렌더링: ${this.config.name}`);

        // ── 2. 앰비언트 컬러 오버레이 ────────────────────────────
        // 옥토패스 트래블러 감성의 핵심: 맵 전체에 절묘한 색상 wash를 드리워
        // 분위기 있는 조명 효과를 시뮬레이션합니다. (연산비용 0)
        if (this.config.ambientColor !== undefined) {
            const alpha = this.config.ambientAlpha ?? 0.2;

            const ambientOverlay = this.scene.add.rectangle(
                worldWidth / 2,
                worldHeight / 2,
                worldWidth,
                worldHeight,
                this.config.ambientColor,
                alpha
            );
            ambientOverlay.setDepth(-999); // 배경 바로 위, 모든 캐릭터 아래
            ambientOverlay.setBlendMode(Phaser.BlendModes.MULTIPLY);

            console.log(`[StageManager] 앰비언트 오버레이 적용: 색상 0x${this.config.ambientColor.toString(16).toUpperCase()}, 불투명도 ${alpha * 100}%`);
        }

        // ── 3. 대기 입자 (Atmospheric Particles) ─────────────────
        // 공기 중에 떠다니는 먼지/포자를 표현하여 공간감과 밀도감을 높입니다.
        this.createDustParticles(worldWidth, worldHeight);
    }

    createDustParticles(width, height) {
        // 1. 먼지 텍스처 생성 (작고 흐릿한 원)
        if (!this.scene.textures.exists('atmos_dust')) {
            const dustGraphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
            dustGraphics.fillStyle(0xffffff, 1);
            dustGraphics.fillCircle(4, 4, 4);
            dustGraphics.generateTexture('atmos_dust', 8, 8);
        }

        // 2. 파티클 이미터 설정
        const dustEmitter = this.scene.add.particles(0, 0, 'atmos_dust', {
            x: { min: 0, max: width },
            y: { min: 0, max: height },
            lifespan: { min: 4000, max: 8000 },
            speedX: { min: -10, max: 10 },
            speedY: { min: -5, max: 5 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0, end: 0.4, ease: 'Sine.easeInOut' }, // 서서히 나타났다 사라짐
            tint: [0xffffff, 0xffffdd, 0xaaccff], // 약간의 색상 변조
            blendMode: 'ADD',
            quantity: 2,           // 한 번에 생성되는 수
            frequency: 100,        // 생성 주기 (ms)
            maxParticles: 300      // 화면 내 최대 유지 개수
        });

        dustEmitter.setDepth(20000); // UI 아래, 캐릭터 위 (혹은 앰비언트 위)
        // dustEmitter.setScrollFactor(1); // 카메라 따라가게 하려면 scrollFactor 설정 필요 (여기선 월드 좌표계 사용)

        console.log('[StageManager] 대기 입자(Dust Particles) 활성화 ✨');
    }
}
