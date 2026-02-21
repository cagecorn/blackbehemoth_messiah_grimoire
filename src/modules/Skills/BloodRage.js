import Phaser from 'phaser';

/**
 * BloodRage.js
 * A self-buff skill that increases attack power, attack speed, and movement speed.
 * It also grants lifesteal for its duration.
 */
export default class BloodRage {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.id = 'blood_rage';
        this.name = '블러드 레이지';
        this.cooldown = options.cooldown || 12000;
        this.duration = options.duration || 5000;

        // Percent buffs (e.g., 0.5 = +50%)
        this.atkBuffPercent = options.atkBuffPercent || 0.5;
        this.spdBuffPercent = options.spdBuffPercent || 0.5;
        this.atkSpdBuffPercent = options.atkSpdBuffPercent || 0.5; // Decreases delay

        this.lastCastTime = 0;
    }

    getActualCooldown(castSpd) {
        const speedMultiplier = (castSpd || 1000) / 1000;
        return this.cooldown / Math.max(0.1, speedMultiplier);
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

    execute(caster, targetArray) {
        if (!caster || !caster.active || caster.hp <= 0) return false;

        const now = this.scene.time.now;
        if (!this.isReady(now, caster.castSpd)) return false;

        // If already raging, do not recast
        if (caster.isBloodRaging) return false;

        this.lastCastTime = now;
        console.log(`[Skill] ${caster.unitName} activates Blood Rage! (Atk+${this.atkBuffPercent * 100}%, Spd+${this.spdBuffPercent * 100}%, AtkSpd+${this.atkSpdBuffPercent * 100}%, +35% Lifesteal)`);

        // 1. Calculate Buff Amounts based on base stats
        const bonusAtk = Math.floor((caster.getTotalAtk ? caster.getTotalAtk() : caster.atk) * this.atkBuffPercent);
        const bonusSpeed = Math.floor(caster.speed * this.spdBuffPercent);
        // For atkSpd, a buff means decreasing the delay (smaller is faster)
        const atkSpdReduction = Math.floor(caster.atkSpd * this.atkSpdBuffPercent);

        // 2. Apply State Flags and Flat Buffs
        caster.isBloodRaging = true;
        caster.bonusAtk += bonusAtk;
        caster.speed += bonusSpeed;
        caster.atkSpd -= atkSpdReduction;
        if (caster.syncStatusUI) caster.syncStatusUI();

        // 3. Visuals: Red Tint and Aura
        caster.sprite.setTint(0xff0000);

        // Dripping Blood Particles
        const emitter = this.scene.add.particles(0, 0, 'emoji_blood_drop', {
            speed: { min: 20, max: 60 },
            angle: { min: 0, max: 360 }, // Burst out slightly
            scale: { start: 0.5, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 800,
            frequency: 200, // Emit regularly
            follow: caster,
            followOffset: { x: 0, y: -20 } // Slightly above center
        });

        // 4. Timer to Reverse Effects
        this.scene.time.delayedCall(this.duration, () => {
            if (caster && caster.active) {
                caster.isBloodRaging = false;
                caster.bonusAtk -= bonusAtk;
                caster.speed -= bonusSpeed;
                caster.atkSpd += atkSpdReduction;
                caster.sprite.clearTint();
                if (caster.syncStatusUI) caster.syncStatusUI();
                console.log(`[Skill] ${caster.unitName}'s Blood Rage ended.`);
            }
            emitter.destroy();
        });

        return true;
    }
}
