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

        // ── 3. 절차적 구름 그림자 오버레이 ────────────────────────
        this.createCloudShadows(worldWidth, worldHeight);

        // ── 4. 은은한 렌즈 플레어 오버레이 ────────────────────────
        this.createLensFlare(worldWidth, worldHeight);
    }

    createCloudShadows(worldWidth, worldHeight) {
        const texKey = 'procedural_cloud_shadow';
        const texSize = 512;

        if (!this.scene.textures.exists(texKey)) {
            const canvas = document.createElement('canvas');
            canvas.width = texSize;
            canvas.height = texSize;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = 'rgba(0, 0, 0, 0)';
            ctx.fillRect(0, 0, texSize, texSize);

            const drawCloudSpot = (x, y, radius, opacity) => {
                const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
                grad.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
                grad.addColorStop(0.5, `rgba(0, 0, 0, ${opacity * 0.8})`);
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            };

            const spots = [
                { x: 100, y: 150, r: 150, o: 0.8 },
                { x: 400, y: 300, r: 180, o: 0.7 },
                { x: 250, y: 450, r: 130, o: 0.85 },
                { x: 50, y: 400, r: 120, o: 0.6 }
            ];

            spots.forEach(spot => {
                drawCloudSpot(spot.x, spot.y, spot.r, spot.o);
                drawCloudSpot(spot.x + texSize, spot.y, spot.r, spot.o);
                drawCloudSpot(spot.x - texSize, spot.y, spot.r, spot.o);
                drawCloudSpot(spot.x, spot.y + texSize, spot.r, spot.o);
                drawCloudSpot(spot.x, spot.y - texSize, spot.r, spot.o);
            });

            this.scene.textures.addImage(texKey, canvas);
        }

        this.cloudLayer = this.scene.add.tileSprite(worldWidth / 2, worldHeight / 2, worldWidth, worldHeight, texKey);
        this.cloudLayer.setDepth(-998);
        this.cloudLayer.setBlendMode(Phaser.BlendModes.MULTIPLY);
        this.cloudLayer.setAlpha(0.8); // 더 짙게 조정 (이전 0.6)
        this.cloudLayer.tileScaleX = 3;
        this.cloudLayer.tileScaleY = 3;

        console.log(`[StageManager] 프로시저럴 구름 그림자 생성 완료 (농도 업그레이드)`);
    }

    createLensFlare(worldWidth, worldHeight) {
        const texKey = 'procedural_lens_flare';
        const texSize = 512;

        if (!this.scene.textures.exists(texKey)) {
            const canvas = document.createElement('canvas');
            canvas.width = texSize;
            canvas.height = texSize;
            const ctx = canvas.getContext('2d');
            const cx = texSize / 2;
            const cy = texSize / 2;

            ctx.fillStyle = 'rgba(0, 0, 0, 0)';
            ctx.fillRect(0, 0, texSize, texSize);

            const haloGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx);
            haloGrad.addColorStop(0, 'rgba(255, 230, 200, 0.4)');
            haloGrad.addColorStop(0.3, 'rgba(255, 180, 100, 0.2)');
            haloGrad.addColorStop(1, 'rgba(255, 150, 50, 0)');
            ctx.fillStyle = haloGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, cx, 0, Math.PI * 2);
            ctx.fill();

            const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx * 0.3);
            coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            coreGrad.addColorStop(0.2, 'rgba(255, 250, 220, 0.6)');
            coreGrad.addColorStop(1, 'rgba(255, 200, 150, 0)');
            ctx.fillStyle = coreGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, cx * 0.3, 0, Math.PI * 2);
            ctx.fill();

            const streakGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx);
            streakGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
            streakGrad.addColorStop(0.3, 'rgba(255, 200, 150, 0.3)');
            streakGrad.addColorStop(1, 'rgba(255, 150, 50, 0)');

            ctx.save();
            ctx.fillStyle = streakGrad;
            ctx.globalCompositeOperation = 'lighter';
            ctx.translate(cx, cy);
            ctx.scale(1, 0.05);
            ctx.beginPath();
            ctx.arc(0, 0, cx, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            this.scene.textures.addImage(texKey, canvas);
        }

        this.flareSprite = this.scene.add.sprite(0, 0, texKey);
        this.flareSprite.setOrigin(0.5, 0.5);
        this.flareSprite.setDepth(1500);
        this.flareSprite.setBlendMode(Phaser.BlendModes.ADD);
        this.flareSprite.setAlpha(0);
        this.flareSprite.setScrollFactor(0);

        this.triggerRandomFlare();
    }

    triggerRandomFlare() {
        if (!this.flareSprite || !this.scene || !this.scene.cameras.main) return;
        const nextDelay = Phaser.Math.Between(8000, 15000);

        this.scene.time.delayedCall(nextDelay, () => {
            if (!this.flareSprite || !this.flareSprite.active) return;
            const cam = this.scene.cameras.main;
            const isLeft = Math.random() > 0.5;
            const startX = isLeft ? Phaser.Math.Between(0, cam.width * 0.3) : Phaser.Math.Between(cam.width * 0.7, cam.width);
            const startY = Phaser.Math.Between(cam.height * 0.6, cam.height * 0.9);

            this.flareSprite.setPosition(startX, startY);
            this.flareSprite.setScale(Phaser.Math.FloatBetween(0.8, 1.5));
            this.flareSprite.setRotation(Phaser.Math.FloatBetween(-0.2, 0.2));

            this.scene.tweens.add({
                targets: this.flareSprite,
                alpha: { from: 0, to: Phaser.Math.FloatBetween(0.4, 0.7) },
                scale: { value: '+=0.2' },
                y: { value: '-=50' },
                duration: Phaser.Math.Between(2000, 4000),
                yoyo: true,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    if (this.flareSprite) this.flareSprite.setAlpha(0);
                    this.triggerRandomFlare();
                }
            });
        });
    }

    update(time, delta) {
        if (this.cloudLayer) {
            this.cloudLayer.tilePositionX -= 0.02 * delta;
            this.cloudLayer.tilePositionY -= 0.01 * delta;
        }
    }
}
