import Phaser from 'phaser';
import Archer from './Archer.js';
import EventBus from '../Events/EventBus.js';

/**
 * Nickle.js
 * Dedicated class for Nickle.
 * Ultimate: "Back in my day..." (왕년엔 말이야...)
 * Transforms into prime self, gaining massive stats and multi-shot ability.
 */
export default class Nickle extends Archer {
    constructor(scene, x, y, warrior, characterConfig = {}) {
        super(scene, x, y, warrior, characterConfig);

        this.isPrimeMode = false;
        this.primeTimer = null;
        this.originalStats = null;
    }

    /**
     * Nickle's Ultimate: "Back in my day..."
     */
    async executeUltimate() {
        if (this.isPrimeMode) return;

        const scene = this.scene;
        const skillName = "왕년엔 말이야...";

        // 1. Play Cutscene
        await scene.ultimateManager.playCutscene(this, skillName);

        // 2. Transform
        this.transformToPrime();
    }

    transformToPrime() {
        this.isPrimeMode = true;

        // Save original stats to revert later
        this.originalStats = {
            speed: this.speed,
            atk: this.atk,
            mAtk: this.mAtk,
            def: this.def,
            mDef: this.mDef,
            atkSpd: this.atkSpd,
            spriteTexture: this.sprite.texture.key
        };

        // 1. Sprite Swap
        this.sprite.setTexture('nickle_ultimate_sprite');

        // 2. Stat Buffs
        this.speed *= 3.0; // Extreme speed boost (Lightning-like)
        this.atk *= 1.5;
        this.mAtk *= 1.5;
        this.def *= 1.5;
        this.mDef *= 1.5;
        this.atkSpd *= 0.5; // Double attack speed

        // 3. Visual Effects
        if (this.scene.fxManager) {
            this.scene.fxManager.showDamageText(this, '리즈 시절! ✨', '#ffff00');
            this.scene.fxManager.createSparkleEffect(this);
        }

        // Add periodic afterimage for "lightning fast" feel
        this.primeAfterimageTimer = this.scene.time.addEvent({
            delay: 100,
            callback: () => {
                const isValid = this && this.active && this.isPrimeMode &&
                    this.scene && !this.scene.isUltimateActive &&
                    this.scene.fxManager;
                if (isValid) {
                    this.scene.fxManager.createAfterimage(this, 300, 0.3);
                }
            },
            loop: true
        });

        this.syncStatusUI();
        EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `${this.unitName}: 왕년엔 나도 이랬단 말이야! ⚡`);

        // 4. Timer to revert
        this.scene.time.delayedCall(20000, () => {
            this.revertFromPrime();
        });
    }

    revertFromPrime() {
        if (!this.isPrimeMode) return;
        this.isPrimeMode = false;

        if (this.primeAfterimageTimer) {
            this.primeAfterimageTimer.remove();
        }

        // Revert Stats and Sprite
        if (this.originalStats) {
            this.speed = this.originalStats.speed;
            this.atk = this.originalStats.atk;
            this.mAtk = this.originalStats.mAtk;
            this.def = this.originalStats.def;
            this.mDef = this.originalStats.mDef;
            this.atkSpd = this.originalStats.atkSpd;
            this.sprite.setTexture(this.originalStats.spriteTexture);
        }

        this.ultGauge = 0; // Reset gauge
        this.syncStatusUI();

        console.log(`[Nickle] Prime mode ended.`);
    }

    destroy() {
        if (this.primeAfterimageTimer) {
            this.primeAfterimageTimer.remove();
            this.primeAfterimageTimer = null;
        }
        super.destroy();
    }

    fireProjectile() {
        if (!this.isPrimeMode) {
            return super.fireProjectile();
        }

        // Prime Mode: Multi-shot (5 arrows)
        const now = this.scene.time.now;
        if (now - this.lastFireTime < this.atkSpd) return false;

        const target = this.blackboard.get('target');
        if (!target || !target.active || target.hp <= 0) return false;

        this.lastFireTime = now;

        const arrowCount = 5;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
        const spreadAngle = Phaser.Math.DegToRad(30); // 30 degrees total spread

        for (let i = 0; i < arrowCount; i++) {
            const angleOffset = (i - (arrowCount - 1) / 2) * (spreadAngle / (arrowCount - 1));
            const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
            const finalAngle = baseAngle + angleOffset;

            // Fire to the point at the target's distance with spread angle
            const tX = this.x + Math.cos(finalAngle) * dist;
            const tY = this.y + Math.sin(finalAngle) * dist;

            this.scene.projectileManager.fire(
                this.x, this.y, tX, tY,
                this.atk, 'archer', false, this.targetGroup, this
            );
        }

        return true;
    }

    gainUltGauge(amount) {
        // Prevent gauge gain while in Prime mode
        if (this.isPrimeMode) return;
        super.gainUltGauge(amount);
    }

    getCustomStatuses() {
        const statuses = super.getCustomStatuses();
        if (this.isPrimeMode) {
            statuses.push({
                name: '리즈 시절',
                description: '전성기 시절의 힘을 되찾았습니다. 스탯 대폭 상승 및 5발의 화살을 발사합니다.',
                emoji: '✨',
                category: 'buff'
            });
        }
        return statuses;
    }
}
