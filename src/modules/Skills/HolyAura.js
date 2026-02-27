import Phaser from 'phaser';

/**
 * HolyAura.js
 * A buff skill that creates a healing aura around the caster.
 * Periodically heals allies within its radius.
 * Healing amount and radius scale with the caster's mAtk.
 * Cooldown scales with castSpd.
 */
export default class HolyAura {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.id = 'holy_aura';
        this.name = '홀리 오라';

        // Base configurable values
        this.baseCooldown = options.cooldown || 15000;
        this.duration = options.duration || 5000;
        this.tickRate = options.tickRate || 1000; // Heal every 1 sec

        // Scaling factors
        this.baseRadius = options.baseRadius || 100;
        this.radiusScale = options.radiusScale || 2.0; // radius += mAtk * 2

        this.baseHeal = options.baseHeal || 5;
        this.healScale = options.healScale || 0.5; // heal += mAtk * 0.5

        this.lastCastTime = 0;
    }

    getActualCooldown(castSpd) {
        // castSpd 1000 = 100% speed. Higher is faster.
        const speedMultiplier = (castSpd || 1000) / 1000;
        return this.baseCooldown / Math.max(0.1, speedMultiplier);
    }

    getCooldownProgress(now, castSpd) {
        if (this.lastCastTime === 0) return 1;
        const cd = this.getActualCooldown(castSpd);
        const elapsed = now - this.lastCastTime;
        return Math.max(0, Math.min(1, elapsed / cd));
    }

    isReady(now, castSpd) {
        return this.getCooldownProgress(now, castSpd) >= 1;
    }

    execute(caster) {
        if (!caster || !caster.active || caster.hp <= 0) return false;

        const now = this.scene.time.now;
        if (!this.isReady(now, caster.castSpd)) return false;

        // Prevent overlapping auras if already active
        if (caster.isHolyAuraActive) return false;

        this.lastCastTime = now;
        caster.isHolyAuraActive = true;

        // Calculate scaling
        const mAtk = caster.mAtk || 0;
        const radius = this.baseRadius + (mAtk * this.radiusScale);
        const healAmount = this.baseHeal + (mAtk * this.healScale);

        console.log(`[Skill] ${caster.unitName} activates Holy Aura! (Radius: ${radius}, Heal/sec: ${healAmount})`);

        // 1. Visuals: Gradient Aura and Particles
        const auraColor = 0xffffaa;
        const auraGraphic = this.scene.add.graphics();
        auraGraphic.setBlendMode('ADD'); // Glow effect

        // Draw concentric circles to fake a radial gradient
        const steps = 12;
        for (let i = steps; i > 0; i--) {
            const r = (radius / steps) * i;
            // Higher alpha towards the center, fading out at the edges
            const alpha = 0.02 + (0.015 * (steps - i));
            auraGraphic.fillStyle(auraColor, alpha);
            auraGraphic.fillCircle(0, 0, r);
        }

        auraGraphic.setDepth(caster.depth - 1); // Behind the caster

        // Pulsing animation for a "breathing" aura effect
        this.scene.tweens.add({
            targets: auraGraphic,
            scale: 1.05,
            alpha: 0.8,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 2. Particles: Rising sparkles
        const emitter = this.scene.add.particles(0, 0, 'emoji_sparkles', {
            speedY: { min: -20, max: -60 }, // Move upwards
            speedX: { min: -20, max: 20 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 2000,
            frequency: 200,
            blendMode: 'ADD',
            emitZone: {
                type: 'random',
                source: new Phaser.Geom.Circle(0, 0, radius * 0.8)
            }
        });
        emitter.setDepth(caster.depth + 1);

        // Smoothly follow the caster every frame
        const onUpdate = () => {
            if (caster && caster.active) {
                auraGraphic.setPosition(caster.x, caster.y);
                emitter.setPosition(caster.x, caster.y);

                // Keep depth in sync with caster (especially important for Arena/Dungeon Y-sorting)
                auraGraphic.setDepth(caster.depth - 1);
                emitter.setDepth(caster.depth + 1);
            }
        };
        this.scene.events.on('update', onUpdate);

        // Track time for ticks
        let elapsedDuration = 0;

        // Use a timer event for periodic healing ticks
        const auraTimer = this.scene.time.addEvent({
            delay: this.tickRate,
            callback: () => {
                if (!caster || !caster.active || caster.hp <= 0) {
                    this.cleanup(caster, auraGraphic, emitter, auraTimer, onUpdate);
                    return;
                }

                // Determine allied group (Mercenary vs Monster)
                const alliesGroup = caster.allyGroup;
                const allies = alliesGroup ? alliesGroup.getChildren() : [];

                // Heal allies in range
                for (const ally of allies) {
                    if (!ally.active || ally.hp <= 0) continue;
                    const dist = Phaser.Math.Distance.Between(caster.x, caster.y, ally.x, ally.y);
                    if (dist <= radius) {
                        if (ally.heal) {
                            ally.heal(healAmount);
                        }
                    }
                }

                elapsedDuration += this.tickRate;
                if (elapsedDuration >= this.duration) {
                    this.cleanup(caster, auraGraphic, emitter, auraTimer, onUpdate);
                }
            },
            callbackScope: this,
            loop: true
        });

        // Initial Position Check
        auraGraphic.setPosition(caster.x, caster.y);
        emitter.setPosition(caster.x, caster.y);

        return true;
    }

    cleanup(caster, graphic, emitter, timer, onUpdate) {
        if (this.scene && onUpdate) {
            this.scene.events.off('update', onUpdate);
        }
        if (caster) caster.isHolyAuraActive = false;
        if (graphic) graphic.destroy();
        if (emitter) emitter.destroy();
        if (timer) timer.remove();
        console.log(`[Skill] Holy Aura ended.`);
    }
}
