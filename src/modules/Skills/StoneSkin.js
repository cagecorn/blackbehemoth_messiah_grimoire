import EventBus from '../Events/EventBus.js';

export default class StoneSkin {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.name = 'Stone Skin';

        // Base cooldown 10 seconds. Scaled by cast speed later.
        this.baseCooldown = config.cooldown || 10000;

        // Base duration 5 seconds
        this.baseDuration = config.duration || 5000;

        // 20% Damage Reduction
        this.damageReduction = config.damageReduction || 0.20;

        this.lastCastTime = 0;
    }

    getCooldown(castSpd) {
        // castSpd 1000 = 100% speed (1x multiplier). 
        // Higher castSpd -> lower cooldown.
        const speedMultiplier = Math.max(0.1, (castSpd || 1000) / 1000);
        return this.baseCooldown / speedMultiplier;
    }

    getDuration() {
        // Duration could also scale, but we'll stick to flat 5 seconds for now.
        return this.baseDuration;
    }

    isReady(now, castSpd) {
        return now - this.lastCastTime >= this.getCooldown(castSpd);
    }

    getCooldownProgress(now, castSpd) {
        if (this.lastCastTime === 0) return 1; // Ready immediately
        const cd = this.getCooldown(castSpd);
        const elapsed = now - this.lastCastTime;
        return Math.max(0, Math.min(1, elapsed / cd));
    }

    execute(caster, target) {
        const now = this.scene.time.now;
        if (!this.isReady(now, caster.castSpd)) return false;

        this.lastCastTime = now;

        const duration = this.getDuration();

        // 1. Play FX
        if (this.scene.fxManager) {
            this.scene.fxManager.createSparkleEffect(caster);
        }

        // 2. Apply Buff
        // signature: applyBuff(target, source, type, duration, amountAtk, amountMAtk, amountDR)
        if (this.scene.buffManager) {
            this.scene.buffManager.applyBuff(
                caster,
                caster,
                this.name,
                duration,
                0,    // no +ATK
                0,    // no +mATK
                this.damageReduction // +0.20 DR
            );
        }

        // Add a small cast animation (nudge up/down)
        if (caster.sprite) {
            this.scene.tweens.killTweensOf(caster.sprite);
            caster.sprite.y = 0;
            this.scene.tweens.add({
                targets: caster.sprite,
                y: -10,
                duration: 150,
                yoyo: true,
                ease: 'Sine.easeInOut'
            });
        }

        console.log(`[Skill] ${caster.unitName} applied ${this.name} (${(this.damageReduction * 100).toFixed(0)}% DR) for ${duration}ms!`);
        return true;
    }
}
