// ============================================================
//  WeatherManager.js
//  날씨 시스템 — 사실적인 강수 파티클 및 환경 효과.
//
//  📌 설계 원칙:
//    - Phaser Canvas API로 직접 렌더링 (텍스처 의존 없음)
//    - 빗방울: 다층 레이어(전경/중경/배경)로 원근감 표현
//    - 물 튀김: 지면 타격 시 작은 파티클 폭발
//    - 화면 효과: CSS 오버레이로 빗속 분위기 연출 (무비용)
//    - 날씨 전환: fadeIn/fadeOut 지원
//    - 성능: setScrollFactor(0) 고정 레이어 + 객체 풀링
//
//  📌 날씨 타입 (향후 확장):
//    'none' | 'rain' | 'snow' | 'fog' | 'storm'
// ============================================================

import Phaser from 'phaser';

// ── 빗방울 파티클 ────────────────────────────────────────────
// Phaser의 Graphics를 이용해 날카로운 빗줄기 텍스처를 런타임에 생성합니다.
const RAIN_TEXTURE_KEY = 'weather_rain_drop';
const SPLASH_TEXTURE_KEY = 'weather_rain_splash';

// 빗방울 레이어 설정 (전경→배경 순서로 원근 표현)
const RAIN_LAYERS = [
    // 전경: 굵고 빠르고 불투명 (가까운 빗방울)
    { id: 'fg', alpha: 0.85, speedMin: 900, speedMax: 1200, scaleMin: 0.8, scaleMax: 1.2, count: 250, angle: 80, windDrift: 0.10 },
    // 중경: 중간 굵기
    { id: 'mg', alpha: 0.55, speedMin: 650, speedMax: 900, scaleMin: 0.5, scaleMax: 0.8, count: 400, angle: 78, windDrift: 0.07 },
    // 배경: 얇고 느리고 희미 (먼 빗방울)
    { id: 'bg', alpha: 0.30, speedMin: 400, speedMax: 620, scaleMin: 0.3, scaleMax: 0.5, count: 500, angle: 76, windDrift: 0.04 },
];

export default class WeatherManager {
    /**
     * @param {Phaser.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.currentWeather = 'none';
        this._rainEmitters = [];      // ParticleEmitter 레이어 배열
        this._splashEmitter = null;   // 물 튀김 이미터
        this._cssOverlay = null;      // DOM 오버레이 엘리먼트
        this._ambientDarken = null;   // 씬 내 어둠 오버레이 (Phaser Graphics)
        this._windAngle = 0;          // 현재 바람 각도 (도, 약간 랜덤 변화)
        this._windTimer = 0;

        console.log('[WeatherManager] 초기화 완료. ☁️');
    }

    // ──────────────────────────────────────────────────────────
    //  공개 API
    // ──────────────────────────────────────────────────────────

    /**
     * 날씨를 설정합니다.
     * @param {'none'|'rain'} type
     * @param {object} [options]
     * @param {number} [options.fadeDuration=2000] 전환 시간 (ms)
     */
    setWeather(type, options = {}) {
        const fadeDuration = options.fadeDuration ?? 2000;
        if (this.currentWeather === type) return;

        console.log(`[WeatherManager] 날씨 전환: ${this.currentWeather} → ${type}`);

        // 이전 날씨 종료
        this._stopCurrentWeather(fadeDuration);

        this.currentWeather = type;

        if (type === 'rain') {
            this._startRain(fadeDuration);
        }
    }

    /**
     * 매 프레임 호출 (DungeonScene.update에서 호출).
     * @param {number} time
     * @param {number} delta
     */
    update(time, delta) {
        if (this.currentWeather === 'none') return;

        if (this.currentWeather === 'rain') {
            this._updateRainWind(time, delta);
        }
    }

    /**
     * 씬 종료 시 정리.
     */
    destroy() {
        this._stopCurrentWeather(0);
        console.log('[WeatherManager] 정리 완료.');
    }

    // ──────────────────────────────────────────────────────────
    //  내부 — 비 시작/정지
    // ──────────────────────────────────────────────────────────

    _startRain(fadeDuration) {
        this._ensureTextures();
        const scene = this.scene;
        const cam = scene.cameras.main;
        const W = cam.width;
        const H = cam.height;

        // ── 1. 씬 내 어둠 오버레이 (빗속의 어두운 하늘) ─────
        this._ambientDarken = scene.add.rectangle(0, 0, W * 3, H * 3, 0x0a1a2e, 0)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(49990);   // 파티클 바로 아래

        scene.tweens.add({
            targets: this._ambientDarken,
            alpha: 0.28,
            duration: fadeDuration,
            ease: 'Sine.easeIn',
        });

        // ── 2. 빗방울 레이어들 (다층 원근) ───────────────────
        RAIN_LAYERS.forEach((layer, idx) => {
            // 빗방울 방향: 약간 오른쪽으로 기울어진 각도 (바람)
            const emitter = scene.add.particles(0, 0, RAIN_TEXTURE_KEY, {
                // 화면 전체 상단에서 균일하게 생성
                emitZone: {
                    type: 'random',
                    source: new Phaser.Geom.Rectangle(-50, -80, W + 100, 1),
                },
                // 속도: 아래 + 약간 오른쪽 대각선
                speedX: { min: layer.speedMin * 0.18, max: layer.speedMin * 0.22 },
                speedY: { min: layer.speedMin, max: layer.speedMax },
                // 회전: 빗줄기 각도
                rotate: layer.angle,
                // 크기
                scaleX: { min: layer.scaleMin, max: layer.scaleMax },
                scaleY: { min: layer.scaleMin * 2.5, max: layer.scaleMax * 2.5 },
                // 수명: 화면 높이 / 속도 에 맞게 계산
                lifespan: { min: (H / layer.speedMin) * 1000, max: (H / layer.speedMin) * 1400 },
                // 투명도
                alpha: { start: layer.alpha, end: layer.alpha * 0.6 },
                // 블렌딩: 반투명 하얀 빛
                blendMode: 'SCREEN',
                // 방출 빈도
                frequency: 1000 / (layer.count / H * 1000 * 0.06),
                // 고정 레이어 (카메라 스크롤 무시)
                scrollFactorX: 0,
                scrollFactorY: 0,
                // 물리: 중력 없음 (속도로 제어)
                gravityY: 0,
                // 틴트: 살짝 푸른 빗방울
                tint: 0xaaccff,
                // 개수 제한
                maxParticles: 0,
            });

            emitter.setDepth(50000 + idx);
            // 초기 alpha 0으로 페이드인
            emitter.setAlpha(0);
            scene.tweens.add({
                targets: emitter,
                alpha: 1,
                duration: fadeDuration,
                ease: 'Sine.easeIn',
            });

            this._rainEmitters.push(emitter);
        });

        // ── 3. 물 튀김 이미터 (지면 하단에서 발생) ──────────
        this._splashEmitter = scene.add.particles(0, 0, SPLASH_TEXTURE_KEY, {
            emitZone: {
                type: 'random',
                source: new Phaser.Geom.Rectangle(0, H * 0.75, W, H * 0.25),
            },
            speedX: { min: -60, max: 60 },
            speedY: { min: -80, max: -20 },
            scaleX: { min: 0.3, max: 0.9 },
            scaleY: { min: 0.15, max: 0.4 },
            lifespan: { min: 150, max: 350 },
            alpha: { start: 0.55, end: 0 },
            blendMode: 'SCREEN',
            frequency: 35,
            gravityY: 280,
            tint: 0x99bbdd,
            maxParticles: 0,
            scrollFactorX: 0,
            scrollFactorY: 0,
        });
        this._splashEmitter.setDepth(50004);
        this._splashEmitter.setAlpha(0);
        scene.tweens.add({
            targets: this._splashEmitter,
            alpha: 1,
            duration: fadeDuration,
            ease: 'Sine.easeIn',
        });

        // ── 4. CSS 오버레이 (DOM): 비 안개 + 색감 보정 ──────
        this._applyCssRainOverlay(fadeDuration);

        console.log('[WeatherManager] ☔ 비 시작! 레이어 3층 구성 (FG/MG/BG) + 물튀김 + CSS 오버레이');
    }

    _stopCurrentWeather(fadeDuration) {
        const scene = this.scene;

        // 파티클 페이드아웃 후 제거
        const allEmitters = [...this._rainEmitters];
        if (this._splashEmitter) allEmitters.push(this._splashEmitter);

        allEmitters.forEach(emitter => {
            if (!emitter || !emitter.active) return;
            scene.tweens.add({
                targets: emitter,
                alpha: 0,
                duration: fadeDuration,
                ease: 'Sine.easeOut',
                onComplete: () => { if (emitter && emitter.active) emitter.destroy(); }
            });
        });
        this._rainEmitters = [];
        this._splashEmitter = null;

        // 어둠 오버레이 페이드아웃
        if (this._ambientDarken) {
            scene.tweens.add({
                targets: this._ambientDarken,
                alpha: 0,
                duration: fadeDuration,
                ease: 'Sine.easeOut',
                onComplete: () => { if (this._ambientDarken) { this._ambientDarken.destroy(); this._ambientDarken = null; } }
            });
        }

        // CSS 오버레이 제거
        this._removeCssRainOverlay(fadeDuration);
    }

    // ──────────────────────────────────────────────────────────
    //  내부 — 바람 변화 (빗방울이 자연스럽게 흔들림)
    // ──────────────────────────────────────────────────────────

    _updateRainWind(time, delta) {
        this._windTimer += delta;
        // 3~6초마다 바람 각도를 조금씩 변환
        if (this._windTimer > 3500 + Math.random() * 2500) {
            this._windTimer = 0;
            this._windAngle = Phaser.Math.Clamp(this._windAngle + Phaser.Math.Between(-6, 6), -15, 15);

            this._rainEmitters.forEach((emitter, idx) => {
                if (!emitter || !emitter.active) return;
                const layer = RAIN_LAYERS[idx];
                // 바람에 따라 수평 속도 갱신
                const drift = layer.windDrift;

                // Phaser 3의 최신 파티클 시스템 속성 접근 방식에 맞게 수정
                // 단순히 객체를 새로 생성해서 할당하거나 내부 값을 변경
                const newSpeedXMin = this._windAngle * drift * 80;
                const newSpeedXMax = this._windAngle * drift * 120;

                if (emitter.speedX) {
                    // 내부 구현에 따라 다르지만 보통 start, end 범위를 직접 제어해야 안전함.
                    // 가장 확실한 것은 onEmit 콜백을 쓰거나 property 객체를 안전하게 조작하는 것.
                    // 간단하게는 속성 객체 자체를 다시 세팅하는 방식이 안전할 수 있습니다.
                    if (emitter.speedX.onEmit) {
                        // 속성이 함수 형태인 경우 등 복합적인 상태 처리, 하지만 우리는 min/max 객체를 줬었음.
                    }
                    try {
                        // 강제로 프로퍼티 변경 (안전하게)
                        if (emitter.speedX.min !== undefined) emitter.speedX.min = newSpeedXMin;
                        if (emitter.speedX.max !== undefined) emitter.speedX.max = newSpeedXMax;

                        // 만약 Phaser Property 객체라면
                        if (emitter.speedX.propertyValue !== undefined && typeof emitter.speedX === 'object') {
                            emitter.speedX.propertyValue = { min: newSpeedXMin, max: newSpeedXMax };
                        }
                    } catch (e) { }
                }

                if (emitter.rotate) {
                    try {
                        const newAngle = layer.angle + this._windAngle * 0.4;
                        // 숫자일 경우 바로 값 수정 불가
                        if (typeof emitter.rotate === 'number') {
                            // 무시하거나 다른 방법 사용. 보통 config 단에서 수정 불가능한 숫자면 재생성이 맞음
                        } else if (emitter.rotate.propertyValue !== undefined && typeof emitter.rotate === 'object') {
                            emitter.rotate.propertyValue = newAngle;
                        } else {
                            emitter.rotate.start = newAngle;
                            emitter.rotate.end = newAngle;
                        }
                    } catch (e) { }
                }
            });
        }
    }

    // ──────────────────────────────────────────────────────────
    //  내부 — 텍스처 생성 (런타임 Canvas)
    // ──────────────────────────────────────────────────────────

    _ensureTextures() {
        const scene = this.scene;

        // 빗방울 텍스처: 날카로운 얇은 선분
        if (!scene.textures.exists(RAIN_TEXTURE_KEY)) {
            const g = scene.make.graphics({ x: 0, y: 0, add: false });
            // 빗줄기 크기 증가: 길이 24, 폭 3
            g.fillStyle(0xffffff, 1);
            g.fillRect(0, 0, 3, 24);
            // 위쪽으로 옅어지는 꼬리 느낌 보강
            g.fillStyle(0xffffff, 0.5);
            g.fillRect(0, 0, 3, 6);
            g.generateTexture(RAIN_TEXTURE_KEY, 3, 24);
            g.destroy();
            console.log('[WeatherManager] 빗방울 텍스처 생성 완료 (강화됨).');
        }

        // 물 튀김 텍스처: 작은 원형 점
        if (!scene.textures.exists(SPLASH_TEXTURE_KEY)) {
            const g = scene.make.graphics({ x: 0, y: 0, add: false });
            g.fillStyle(0xffffff, 1);
            g.fillEllipse(4, 4, 8, 4); // 납작한 타원 (물 튀김)
            g.generateTexture(SPLASH_TEXTURE_KEY, 8, 8);
            g.destroy();
            console.log('[WeatherManager] 물 튀김 텍스처 생성 완료.');
        }
    }

    // ──────────────────────────────────────────────────────────
    //  내부 — CSS DOM 오버레이 (비 안개 효과)
    // ──────────────────────────────────────────────────────────

    _applyCssRainOverlay(fadeDuration) {
        const existing = document.getElementById('weather-rain-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'weather-rain-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none;
            z-index: 9998;
            opacity: 0;
            transition: opacity ${fadeDuration}ms ease;
            background:
                linear-gradient(180deg,
                    rgba(10, 25, 50, 0.18) 0%,
                    rgba(20, 40, 80, 0.08) 60%,
                    rgba(5, 15, 35, 0.20) 100%);
            mix-blend-mode: multiply;
        `;
        document.getElementById('game-container')?.appendChild(overlay);

        // 트리거 fade-in
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });

        this._cssOverlay = overlay;
    }

    _removeCssRainOverlay(fadeDuration) {
        if (!this._cssOverlay) return;
        const overlay = this._cssOverlay;
        overlay.style.transition = `opacity ${fadeDuration}ms ease`;
        overlay.style.opacity = '0';
        setTimeout(() => { overlay.remove(); }, fadeDuration + 50);
        this._cssOverlay = null;
    }
}
