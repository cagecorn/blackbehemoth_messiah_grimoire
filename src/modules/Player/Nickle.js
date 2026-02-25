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
            rangeMin: this.rangeMin,
            rangeMax: this.rangeMax,
            spriteTexture: this.sprite.texture.key
        };

        // 1. Sprite Swap
        this.sprite.setTexture('nickle_ultimate_sprite');

        // 2. Stat Buffs (Using Bonus Properties)
        this.bonusSpeed += this.speed * 2.0; // +200% = x3.0 total
        this.bonusAtk += this.atk * 0.5;
        this.bonusMAtk += this.mAtk * 0.5;
        this.bonusDef += this.def * 0.5;
        this.bonusMDef += this.mDef * 0.5;
        this.bonusAtkSpd += this.atkSpd * 0.5; // Double attack speed (reduce delay by 50%)

        // 2.1 Raid Specific Logic: Move closer to the boss for multi-hit arrows
        if (this.scene.constructor.name === 'RaidScene') {
            this.rangeMin = 50;
            this.rangeMax = 120;
            console.log(`[Nickle] Raid Mode: Ranges adjusted to ${this.rangeMin}-${this.rangeMax} for multi-hit.`);
        }

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
            this.bonusSpeed -= this.originalStats.speed * 2.0;
            this.bonusAtk -= this.originalStats.atk * 0.5;
            this.bonusMAtk -= this.originalStats.mAtk * 0.5;
            this.bonusDef -= this.originalStats.def * 0.5;
            this.bonusMDef -= this.originalStats.mDef * 0.5;
            this.bonusAtkSpd -= this.originalStats.atkSpd * 0.5;

            this.rangeMin = this.originalStats.rangeMin;
            this.rangeMax = this.originalStats.rangeMax;
            this.sprite.setTexture(this.originalStats.spriteTexture);
        }

        this.ultGauge = 0; // Reset gauge
        this.syncStatusUI();

        // Safe Retreat: Give a temporary speed boost and force AI to re-evaluate
        const originalSpeed = this.speed;
        this.speed *= 2.0;
        this.scene.time.delayedCall(1500, () => {
            if (this.active) {
                this.speed = originalSpeed;
            }
        });

        console.log(`[Nickle] Prime mode ended. Retreating...`);
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
        const spreadAngle = Phaser.Math.DegToRad(30); // 30 degrees total spread

        for (let i = 0; i < arrowCount; i++) {
            // Stagger each arrow by 50ms for sequential "dadadada" damage text
            this.scene.time.delayedCall(i * 50, () => {
                if (!this.active || !this.isPrimeMode) return;

                const target = this.blackboard.get('target');
                if (!target || !target.active || target.hp <= 0) return;

                const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
                const angleOffset = (i - (arrowCount - 1) / 2) * (spreadAngle / (arrowCount - 1));
                const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
                const finalAngle = baseAngle + angleOffset;

                // Fire to the point at the target's distance with spread angle
                const tX = this.x + Math.cos(finalAngle) * dist;
                const tY = this.y + Math.sin(finalAngle) * dist;

                const prefix = this.getWeaponPrefix();
                const element = prefix ? prefix.element : null;

                this.scene.projectileManager.fire(
                    this.x, this.y, tX, tY,
                    this.getTotalAtk(), 'archer', false, this.targetGroup, this, null, false, element
                );
            });
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
