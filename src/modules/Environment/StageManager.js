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
    }
}
