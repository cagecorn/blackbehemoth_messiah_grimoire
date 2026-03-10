import Phaser from 'phaser';
import soundEffects from '../Core/SoundEffects.js';

// ============================================================

export default class FXManager {

    // 데미지 텍스트 풀 크기 (하이 트래픽 전투 대비)
    static DAMAGE_TEXT_POOL_SIZE = 30;
    // 원소 파티클 개수
    static ELEMENTAL_PARTICLE_COUNT = 6;

    constructor(scene) {
        this.scene = scene;

        // ── 1. Damage Text Object Pool ──────────────────────────
        this._damageTextPool = [];
        this._initDamageTextPool();

        // ── 2. Elemental Particle Emitter Cache ─────────────────
        this._elementalEmitters = {};
        this._isBatterySaver = localStorage.getItem('batterySaver') === 'true';

        // Listen for Battery Saver Toggle
        this._onBatterySaverToggled = this.onBatterySaverToggled.bind(this);
        import('../Events/EventBus.js').then(module => {
            this.EventBus = module.default;
            this.EventBus.on(this.EventBus.EVENTS.BATTERY_SAVER_TOGGLED, this._onBatterySaverToggled);
        });

        console.log(`[FXPool] 초기화 완료. DamageText Pool: ${FXManager.DAMAGE_TEXT_POOL_SIZE}개 사전 생성. ✅`);
    }

    destroy() {
        if (this.EventBus) {
            this.EventBus.off(this.EventBus.EVENTS.BATTERY_SAVER_TOGGLED, this._onBatterySaverToggled);
        }
    }

    onBatterySaverToggled(enabled) {
        this._isBatterySaver = enabled;
        // Update existing emitters blend modes
        Object.values(this._elementalEmitters).forEach(emitter => {
            if (emitter && emitter.active) {
                emitter.setBlendMode(enabled ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);
            }
        });
    }

    // ============================================================
    //  POOL INITIALIZATION
    // ============================================================

    /**
     * 데미지 텍스트 풀을 미리 생성합니다. 게임 시작 시 1회만 실행.
     */
    _initDamageTextPool() {
        for (let i = 0; i < FXManager.DAMAGE_TEXT_POOL_SIZE; i++) {
            const text = this.scene.add.text(0, 0, '', {
                fontSize: '32px',
                fill: '#ff0000',
                fontStyle: 'bold',
                stroke: '#000',
                strokeThickness: 5,
                resolution: 2
            }).setOrigin(0.5).setScale(0.5).setActive(false).setVisible(false);
            text.setDepth(20000);
            this._damageTextPool.push(text);
        }
        console.log(`[FXPool] DamageText Pool ${this._damageTextPool.length}개 생성 완료.`);
    }

    /**
     * 풀에서 비활성화된 텍스트 객체를 꺼냅니다.
     * @returns {Phaser.GameObjects.Text | null}
     */
    _getPooledDamageText() {
        const obj = this._damageTextPool.find(t => !t.active);
        if (!obj) {
            // 풀이 가득 찼을 경우 경고 (전투 강도 상승 시 POOL_SIZE 조절 필요)
            console.warn('[FXPool] ⚠️ DamageText Pool 소진! 텍스트를 임시 생성합니다. Pool 크기 증가를 고려하세요.');
            const fallback = this.scene.add.text(0, 0, '', {
                fontSize: '32px', fill: '#ff0000', fontStyle: 'bold',
                stroke: '#000', strokeThickness: 5, resolution: 2
            }).setOrigin(0.5).setScale(0.5);
            fallback.setDepth(20000);
            fallback._isPoolFallback = true;
            return fallback;
        }
        obj.setActive(true).setVisible(true);
        return obj;
    }

    /**
     * 텍스트 객체를 풀에 반납합니다.
     * @param {Phaser.GameObjects.Text} text
     */
    _returnToPool(text) {
        if (text._isPoolFallback) {
            text.destroy();
            return;
        }
        this.scene.tweens.killTweensOf(text);
        text.setActive(false).setVisible(false).setScale(0.5).setAlpha(1);
    }

    /**
     * 원소별 Particle Emitter를 캐싱하여 반환합니다. 최초 1회만 생성.
     * @param {string} textureKey
     * @param {number} tint
     * @returns {Phaser.GameObjects.Particles.ParticleEmitter}
     */
    _getOrCreateElementalEmitter(textureKey, tint) {
        if (!this._elementalEmitters[textureKey]) {
            if (!this.scene.textures.exists(textureKey)) {
                console.warn(`[FXPool] 텍스처 '${textureKey}' 없음. 원소 파티클 스킵.`);
                return null;
            }
            const emitter = this.scene.add.particles(0, 0, textureKey, {
                speed: { min: 40, max: 120 },
                scale: { start: 0.15, end: 0.05 },
                alpha: { start: 0.75, end: 0 },
                angle: { min: 0, max: 360 },
                lifespan: { min: 400, max: 700 },
                blendMode: this._isBatterySaver ? 'NORMAL' : 'ADD',
                quantity: FXManager.ELEMENTAL_PARTICLE_COUNT,
                emitting: false,
            });
            if (tint !== undefined) emitter.setParticleTint(tint);
            emitter.setDepth(15000);
            this._elementalEmitters[textureKey] = emitter;
            console.log(`[FXPool] Elemental Emitter '${textureKey}' 최초 생성 (캐싱됨).`);
        }
        return this._elementalEmitters[textureKey];
    }

    // ============================================================
    //  PUBLIC API
    // ============================================================

    /**
     * Get hex color for a specific element.
     */
    getElementColor(element) {
        switch (element) {
            case 'fire': return '#ff3300';
            case 'ice': return '#00bbff';
            case 'lightning': return '#ffff00';
            default: return null;
        }
    }

    /**
     * 풀 기반 고해상도 데미지 플로팅 텍스트 표시.
     */
    showDamageText(target, amount, color = '#ff0000', isCritical = false, offsetX = 0, delay = 0) {
        if (!target || !target.active) return;
        if (typeof amount === 'number' && amount <= 0 && offsetX === 0) return;

        let displayAmount = typeof amount === 'number' ? `-${amount.toFixed(1)}` : amount;

        // --- Play 8-bit hit sound ---
        if (delay > 0) {
            this.scene.time.delayedCall(delay, () => {
                soundEffects.play8BitHitSound(isCritical, amount);
            });
        } else {
            soundEffects.play8BitHitSound(isCritical, amount);
        }

        const scale = (target.config && target.config.scale) || 1;
        const yOffset = 40 * scale;
        const jitterX = (Math.random() - 0.5) * 10;
        const jitterY = (Math.random() - 0.5) * 10;

        const text = this._getPooledDamageText();
        if (!text) return;

        // 텍스트 내용/스타일 업데이트
        text.setText(displayAmount);
        text.setColor(color);
        text.setFontSize(isCritical ? '48px' : '32px');
        text.setStroke('#000', isCritical ? 7 : 5);
        text.setPosition(target.x + offsetX + jitterX, target.y - yOffset + jitterY);
        text.setAlpha(isCritical ? 0 : 1);
        text.setScale(0.5);

        if (delay > 0) {
            this.scene.time.delayedCall(delay, () => {
                if (text && text.active) this._animateDamageText(text, yOffset, isCritical);
            });
        } else {
            this._animateDamageText(text, yOffset, isCritical);
        }
    }

    _animateDamageText(text, yOffset, isCritical) {
        text.setAlpha(1);

        if (isCritical) {
            this.scene.tweens.add({
                targets: text,
                scale: 0.8,
                duration: 100,
                yoyo: true,
                ease: 'Back.easeOut'
            });
        }

        this.scene.tweens.add({
            targets: text,
            y: `-=${40}`,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => this._returnToPool(text)
        });
    }

    /**
     * 원소 파티클 효과 (캐싱된 Emitter 재사용).
     */
    spawnElementalParticles(x, y, element) {
        if (!element) return;

        const textureMap = {
            'fire': { key: 'emoji_fire', tint: 0xff3300 },
            'ice': { key: 'emoji_snowball', tint: undefined },
            'lightning': { key: 'emoji_lightning', tint: undefined }
        };

        const config = textureMap[element];
        if (!config) return;

        const emitter = this._getOrCreateElementalEmitter(config.key, config.tint);
        if (!emitter) return;

        emitter.setPosition(x, y);
        emitter.explode(FXManager.ELEMENTAL_PARTICLE_COUNT);
    }

    /**
     * 그림자 생성 (캐릭터 발 밑 blob shadow).
     */
    createShadow(target, scale = 1) {
        if (!target || !target.active) return null;

        const yOffset = target.shadowOffset !== undefined ? target.shadowOffset : (25 * scale);
        const shadow = this.scene.add.ellipse(0, yOffset, 40 * scale, 20 * scale, 0x000000, 0.75);

        target.add(shadow);
        shadow.setDepth(-10);

        const updateListener = () => {
            if (!target.scene) {
                this.scene.events.off('postupdate', updateListener);
                if (shadow && shadow.active) shadow.destroy();
                return;
            }
            if (!target.active || !shadow.active) {
                return;
            }
            if (target.isAirborne && target.sprite) {
                const height = Math.abs(target.sprite.y);
                shadow.alpha = Math.max(0.15, 0.75 - (height / 500));
                shadow.setScale(Math.max(0.5, 1 - (height / 400)));
            } else {
                shadow.alpha = 0.75;
                shadow.setScale(1);
            }
        };

        this.scene.events.on('postupdate', updateListener);
        return shadow;
    }

    /**
     * 잔상(Afterimage) 효과 - 고속 이동 유닛 전용.
     */
    createAfterimage(target, duration = 300, alphaStart = 0.5) {
        if (!target || !target.sprite || !target.active) return;
        if (this.scene && this.scene.isUltimateActive) return;

        const image = this.scene.add.image(target.x, target.y, target.sprite.texture.key);
        image.setDisplaySize(target.sprite.displayWidth, target.sprite.displayHeight);
        image.scaleX = target.sprite.scaleX;
        image.scaleY = target.sprite.scaleY;
        image.setDepth(target.depth - 2);
        image.setAlpha(alphaStart);
        image.setTint(0x88ccff);

        this.scene.tweens.add({
            targets: image,
            alpha: 0,
            duration: duration,
            ease: 'Linear',
            onComplete: () => image.destroy()
        });
    }

    /**
     * 버프 스파클 이펙트.
     */
    createSparkleEffect(target) {
        if (!target || !target.active) return;

        if (!this.scene.textures.exists('sparkle_fx')) {
            const graphics = this.scene.add.graphics();
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('sparkle_fx', 8, 8);
            graphics.destroy();
        }

        const emitter = this.scene.add.particles(0, 0, 'sparkle_fx', {
            x: target.x,
            y: target.y - 30,
            speed: { min: 20, max: 50 },
            angle: { min: 240, max: 300 },
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 800,
            gravityY: -50,
            tint: [0xffff00, 0xffa500, 0xffffff],
            blendMode: this._isBatterySaver ? 'NORMAL' : 'ADD',
            quantity: 2,
            frequency: 50,
            duration: 500
        });

        this.scene.time.delayedCall(1500, () => {
            if (emitter) emitter.destroy();
        });
    }

    /**
     * 스턴 효과 (회전하는 별).
     */
    createStunEffect(target, duration) {
        if (!target || !target.active) return;

        const stars = [];
        const starCount = 3;
        const radius = 25;

        for (let i = 0; i < starCount; i++) {
            const star = this.scene.add.image(target.x, target.y - 40, 'emoji_star');
            star.setDisplaySize(8, 8);
            star.setDepth(target.depth + 1);
            stars.push(star);
        }

        // 단일 update 리스너로 통합 (이전 패턴의 리스너 누적 문제 해결)
        const stunStartTime = this.scene.time.now;
        const followListener = () => {
            const elapsed = this.scene.time.now - stunStartTime;
            if (!target.active || elapsed >= duration) {
                this.scene.events.off('update', followListener);
                stars.forEach(s => { if (s.active) s.destroy(); });
                if (target.active) target.isStunned = false;
                return;
            }
            const time = this.scene.time.now / 1000;
            stars.forEach((star, idx) => {
                const angle = time * Math.PI * 2 + (idx / starCount) * Math.PI * 2;
                star.x = target.x + Math.cos(angle) * radius;
                star.y = target.y - 45 + Math.sin(angle) * (radius / 3);
                star.setDepth(target.depth + (Math.sin(angle) > 0 ? 1 : -1));
            });
        };
        this.scene.events.on('update', followListener);
    }

    /**
     * 궤도 공전 이펙트.
     */
    createOrbitEffect(target, textures, duration) {
        if (!target || !target.active) return;

        const objects = [];
        const count = textures.length;
        const radius = 40;

        for (let i = 0; i < count; i++) {
            const obj = this.scene.add.image(target.x, target.y - 20, textures[i]);
            obj.setDisplaySize(24, 24);
            obj.setDepth(target.depth + 1);
            objects.push(obj);
        }

        const orbitEndTime = this.scene.time.now + duration;
        const followListener = () => {
            if (!target.active || this.scene.time.now > orbitEndTime) {
                this.scene.events.off('update', followListener);
                objects.forEach(o => { if (o.active) o.destroy(); });
                return;
            }
            objects.forEach((obj, idx) => {
                const time = this.scene.time.now / 1000;
                const angle = time * 3 + (idx / count) * Math.PI * 2;
                obj.x = target.x + Math.cos(angle) * radius;
                obj.y = target.y - 20 + Math.sin(angle) * (radius / 2);
                obj.setDepth(target.depth + (Math.sin(angle) > 0 ? 1 : -1));
            });
        };
        this.scene.events.on('update', followListener);
    }

    /**
     * 이모지 팝업 애니메이션 (전투 이벤트 리액션 등에 사용).
     */
    showEmojiPopup(target, emoji) {
        if (!target || !target.active) return;

        const scale = (target.config && target.config.scale) || 1;
        const initialYOffset = 70 * scale;

        const text = this.scene.add.text(target.x, target.y - initialYOffset, emoji, {
            fontSize: '44px',
            resolution: 2
        }).setOrigin(0.5).setScale(0).setAlpha(0);

        text.setDepth(20002);

        let currentYOffset = initialYOffset;
        let wobbleX = 0;

        const followListener = () => {
            if (!target.active || !text.active) {
                this.scene.events.off('postupdate', followListener);
                return;
            }
            text.x = target.x + wobbleX;
            text.y = target.y - currentYOffset;
        };
        this.scene.events.on('postupdate', followListener);

        this.scene.tweens.add({ targets: text, scale: 1, alpha: 0.5, duration: 600, ease: 'Back.easeOut' });
        this.scene.tweens.add({
            targets: { y: initialYOffset },
            y: initialYOffset + 80,
            duration: 1800,
            ease: 'Sine.easeIn',
            onUpdate: (tween) => { currentYOffset = tween.getValue(); },
            onComplete: () => {
                this.scene.events.off('postupdate', followListener);
                text.destroy();
            }
        });
        this.scene.tweens.add({ targets: text, alpha: 0, duration: 1000, delay: 800 });
        this.scene.tweens.add({
            targets: { x: 0 }, x: 10, duration: 800, yoyo: true, repeat: 1, ease: 'Sine.easeInOut',
            onUpdate: (tween) => { wobbleX = tween.getValue(); }
        });
    }

    /**
     * 힐 텍스트 표시 (풀 미사용 - 빈도 낮음).
     */
    showHealText(target, message, color = '#00ff00') {
        if (!target || !target.active) return;

        const scale = (target.config && target.config.scale) || 1;
        const yOffset = 60 * scale;

        const text = this.scene.add.text(target.x, target.y - yOffset, message, {
            fontSize: '24px',
            fill: color,
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 4,
            resolution: 2
        }).setOrigin(0.5).setScale(0.5);

        text.setDepth(20001);

        this.scene.tweens.add({
            targets: text,
            y: target.y - yOffset - 40,
            alpha: 0,
            duration: 1000,
            onComplete: () => text.destroy()
        });
    }

    /**
     * 힐 파티클 효과 (녹색 스파클).
     */
    showHealEffect(target) {
        if (!target || !target.active) return;

        if (!this.scene.textures.exists('sparkle_fx')) {
            const graphics = this.scene.add.graphics();
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('sparkle_fx', 8, 8);
            graphics.destroy();
        }

        const emitter = this.scene.add.particles(0, 0, 'sparkle_fx', {
            x: target.x,
            y: target.y,
            speed: { min: 30, max: 100 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 1000,
            gravityY: -100,
            tint: [0x55ff55, 0x00ff00, 0xaaffaa],
            blendMode: this._isBatterySaver ? 'NORMAL' : 'ADD',
            quantity: 10,
            emitting: false
        });

        if (this.scene.skillFxLayer) {
            this.scene.skillFxLayer.add(emitter);
        }

        emitter.setDepth(target.depth + 1);
        emitter.explode(15);

        this.scene.time.delayedCall(1500, () => {
            if (emitter) emitter.destroy();
        });
    }

    /**
     * 마법진 이펙트 생성.
     */
    createMagicCircle(target, color = 0xffffff, duration = 1000) {
        if (!target || !target.active) return;

        const radius = 50;
        const graphics = this.scene.add.graphics();
        graphics.setDepth(target.depth - 1);
        graphics.setBlendMode('ADD');

        graphics.lineStyle(2, color, 0.8);
        graphics.strokeCircle(0, 0, radius);
        graphics.lineStyle(1, color, 0.4);
        graphics.strokeCircle(0, 0, radius * 0.8);

        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2;
            graphics.moveTo(Math.cos(angle) * (radius - 10), Math.sin(angle) * (radius - 10));
            graphics.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        graphics.strokePath();
        graphics.setPosition(target.x, target.y);

        const followListener = () => {
            if (!target.active || !graphics.active) {
                this.scene.events.off('update', followListener);
                if (graphics.active) graphics.destroy();
                return;
            }
            graphics.setPosition(target.x, target.y);
            graphics.setDepth(target.depth - 1);
        };
        this.scene.events.on('update', followListener);

        this.scene.tweens.add({
            targets: graphics,
            scale: 1.2,
            alpha: 0,
            duration: duration,
            ease: 'Sine.easeOut',
            onComplete: () => {
                this.scene.events.off('update', followListener);
                graphics.destroy();
            }
        });
    }
    /**
     * 포션 적중 시 물방울 스플래시(Splash) 효과
     * @param {Phaser.GameObjects.Sprite} target 적중 대상 용병
     * @param {string} potionId 포션 ID (atk_potion, def_potion 등)
     */
    showPotionSplash(target, potionId) {
        if (!target || !target.active || !this.scene) return;

        // 포션 속성에 따른 색상 매핑
        const colorMap = {
            'atk_potion': 0xff4444,   // Red (Attack)
            'def_potion': 0x4444ff,   // Blue (Defense)
            'mAtk_potion': 0xee44ee,  // Purple (Magic Attack)
            'mDef_potion': 0xffffff   // White (Magic Defense)
        };

        const color = colorMap[potionId] || 0x00ff00; // Default: Green
        const particlesCount = 8;
        const radius = 60;

        // 1. 퍼져나가는 물방울 파티클 (Arcade-retro style pixel blobs)
        for (let i = 0; i < particlesCount; i++) {
            const angle = (i / particlesCount) * Math.PI * 2;
            const drop = this.scene.add.circle(target.x, target.y - 20, 6, color);
            drop.setDepth(target.depth + 10);
            drop.setBlendMode(this._isBatterySaver ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);

            this.scene.tweens.add({
                targets: drop,
                x: target.x + Math.cos(angle) * (radius * Phaser.Math.FloatBetween(0.8, 1.2)),
                y: target.y - 20 + Math.sin(angle) * (radius * Phaser.Math.FloatBetween(0.8, 1.2)),
                scale: 0.1, // 점점 작아짐
                alpha: 0,
                duration: 400 + Phaser.Math.Between(0, 200),
                ease: 'Quad.easeOut',
                onComplete: () => drop.destroy()
            });
        }

        // 2. 중심부 플래시 (임팩트)
        const flash = this.scene.add.circle(target.x, target.y - 20, 25, color, 0.6);
        flash.setDepth(target.depth + 11);
        flash.setBlendMode(this._isBatterySaver ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);
        this.scene.tweens.add({
            targets: flash,
            scale: 2.5,
            alpha: 0,
            duration: 300,
            ease: 'Expo.easeOut',
            onComplete: () => flash.destroy()
        });
        
        // --- Play Liquid Splat Sound (Optional) ---
        soundEffects.play8BitHitSound(false, 0); // Reuse low pitch hit as splat
    }

    /**
     * 원소별 노바 시각 효과 통합 (Fire, Ice, Spark)
     */
    showElementalNovaEffect(target, element = 'fire') {
        if (!target || !target.active) return;

        const configMap = {
            'fire': { emoji: 'emoji_fire', color: 0xffaa00, sparkle: [0xff4400, 0xffaa00] },
            'ice': { emoji: 'emoji_snowball', color: 0x00ccff, sparkle: [0x88ffff, 0x00ccff] },
            'lightning': { emoji: 'emoji_lightning', color: 0xffff00, sparkle: [0xffffff, 0xffff00] }
        };

        const config = configMap[element] || configMap['fire'];
        const count = 12;
        const radius = 150;

        // 1. 이모지 확산 효과
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const x = target.x + Math.cos(angle) * 20;
            const y = target.y + Math.sin(angle) * 20;

            const part = this.scene.add.image(x, y, config.emoji);
            part.setDepth(target.depth + 10);
            part.setBlendMode('ADD');
            part.setScale(0.8);
            part.setAlpha(0.9);

            this.scene.tweens.add({
                targets: part,
                x: target.x + Math.cos(angle) * radius,
                y: target.y + Math.sin(angle) * radius,
                scale: 1.8,
                alpha: 0,
                rotation: angle + Math.PI / 2,
                duration: 900,
                ease: 'Cubic.easeOut',
                onComplete: () => part.destroy()
            });

            // 2. 스파클 파티클 추가 (나나의 기술 참조)
            if (this.scene.time.now % 2 === 0) { // 성능을 위해 절반만 생성
                this.scene.time.delayedCall(Phaser.Math.Between(0, 300), () => {
                    if (target.active) {
                        const sx = target.x + Math.cos(angle) * (radius * 0.5);
                        const sy = target.y + Math.sin(angle) * (radius * 0.5);
                        this.createSparkleEffect({ x: sx, y: sy, active: true }, config.sparkle);
                    }
                });
            }
        }

        // 3. 중앙 플래시 효과
        const flash = this.scene.add.circle(target.x, target.y, 15, config.color, 0.8);
        flash.setDepth(target.depth + 5);
        flash.setBlendMode('ADD');
        this.scene.tweens.add({
            targets: flash,
            scale: 20,
            alpha: 0,
            duration: 500,
            ease: 'Expo.easeOut',
            onComplete: () => flash.destroy()
        });
    }

    /**
     * 버프 스파클 이펙트 (색상 커스텀 지원 버전)
     */
    createSparkleEffect(target, colors = [0xffff00, 0xffa500, 0xffffff]) {
        if (!target || !target.active) return;

        if (!this.scene.textures.exists('sparkle_fx')) {
            const graphics = this.scene.add.graphics();
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('sparkle_fx', 8, 8);
            graphics.destroy();
        }

        const emitter = this.scene.add.particles(0, 0, 'sparkle_fx', {
            x: target.x,
            y: target.y,
            speed: { min: 40, max: 100 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            tint: colors,
            blendMode: this._isBatterySaver ? 'NORMAL' : 'ADD',
            quantity: 5,
            emitting: false
        });

        emitter.setDepth(20000);
        emitter.explode(5);

        this.scene.time.delayedCall(800, () => {
            if (emitter) emitter.destroy();
        });
    }

    /**
     * 혈흔 파티클 효과 (Dark Red visceral effect).
     */
    spawnBloodParticles(x, y, count = 8) {
        if (!this.scene.textures.exists('sparkle_fx')) {
            const graphics = this.scene.add.graphics();
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('sparkle_fx', 8, 8);
            graphics.destroy();
        }

        const emitter = this.scene.add.particles(x, y, 'sparkle_fx', {
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 400,
            tint: [0x880000, 0xaa0000, 0xbb0000],
            blendMode: 'NORMAL',
            quantity: count,
            emitting: false
        });

        if (this.scene.skillFxLayer) {
            this.scene.skillFxLayer.add(emitter);
        }

        emitter.setDepth(20000);
        emitter.explode(count);

        this.scene.time.delayedCall(1000, () => {
            if (emitter) emitter.destroy();
        });
    }

    // Deprecated but kept for compatibility
    showFireNovaEffect(target) {
        this.showElementalNovaEffect(target, 'fire');
    }

    /**
     * Missionary Revive Effect
     */
    spawnHolyAura(x, y) {
        if (!this.scene.textures.exists('sparkle_fx')) {
            const graphics = this.scene.add.graphics();
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('sparkle_fx', 8, 8);
            graphics.destroy();
        }

        const emitter = this.scene.add.particles(0, 0, 'sparkle_fx', {
            x: x,
            y: y,
            speed: { min: 60, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.2, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 800,
            tint: [0xffffdd, 0xffd700, 0xffffff],
            blendMode: this._isBatterySaver ? 'NORMAL' : 'ADD',
            quantity: 30,
            emitting: false
        });

        emitter.setDepth(20000);
        emitter.explode(30);

        // Rising circles
        for (let i = 0; i < 3; i++) {
            const circle = this.scene.add.circle(x, y, 10 + i * 10, 0xffffff, 0.4);
            circle.setDepth(19999);
            this.scene.tweens.add({
                targets: circle,
                y: y - 120,
                scale: 2.5,
                alpha: 0,
                duration: 1200,
                delay: i * 150,
                onComplete: () => circle.destroy()
            });
        }

        this.scene.time.delayedCall(1500, () => {
            if (emitter) emitter.destroy();
        });
    }
}
