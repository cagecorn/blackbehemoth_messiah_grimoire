import Phaser from 'phaser';

/**
 * MassHeal.js
 * A skill for the Healer that heals all allies in the party based on magic attack,
 * featuring flashy visual effects.
 */
export default class MassHeal {
    constructor(options = {}) {
        this.cooldown = options.cooldown || 8000;
        this.healMultiplier = options.healMultiplier || 3.0;
        this.lastCastTime = 0;
    }

    /**
     * Calculates the actual cooldown taking the unit's castSpd into account.
     */
    getActualCooldown(castSpd) {
        const speedMultiplier = (castSpd || 1000) / 1000;
        return this.cooldown / Math.max(0.1, speedMultiplier);
    }

    getCooldownProgress(now, castSpd) {
        if (this.lastCastTime === 0) return 1; // Ready immediately
        const cd = this.getActualCooldown(castSpd);
        const elapsed = now - this.lastCastTime;
        return Math.max(0, Math.min(1, elapsed / cd));
    }

    isReady(now, castSpd) {
        return this.getCooldownProgress(now, castSpd) >= 1;
    }

    /**
     * Executes the Mass Heal.
     * @param {Phaser.GameObjects.Container} caster - Who is using the skill
     */
    execute(caster) {
        if (!caster || !caster.active || caster.hp <= 0) return false;

        const now = caster.scene.time.now;
        if (!this.isReady(now, caster.castSpd)) {
            return false; // Still on cooldown
        }

        this.lastCastTime = now;

        console.log(`[Skill] ${caster.unitName} uses Mass Heal!`);

        // Determine the allied group dynamically
        const isMonster = caster.scene.enemies.contains(caster);
        const alliedGroup = isMonster ? caster.scene.enemies : caster.scene.mercenaries;

        const totalMAtk = caster.getTotalMAtk ? caster.getTotalMAtk() : caster.mAtk;
        const healAmount = totalMAtk * this.healMultiplier;

        // if (caster.showSpeechBubble) {
        //     caster.showSpeechBubble("빛이여... 무두를 치유하라!");
        // }

        // Apply heal to all active allies
        const allies = alliedGroup.getChildren();
        allies.forEach(ally => {
            if (ally.active && ally.hp > 0) {
                // Heal the ally
                ally.receiveHeal(healAmount);

                // Show text
                if (caster.scene.fxManager) {
                    caster.scene.fxManager.showHealText(ally, `+${Math.round(healAmount)}`, '#55ff55');
                }

                // Flashy individual effect
                caster.scene.tweens.add({
                    targets: ally.sprite,
                    tint: 0x00ff00,
                    duration: 300,
                    yoyo: true,
                    onComplete: () => {
                        if (ally.sprite && ally.active) ally.sprite.clearTint();
                    }
                });

                // Sparkle burst
                this.playHealAuraEffect(caster.scene, ally.x, ally.y);
            }
        });

        // Giant screen-wide central flash (optional, just centered on the caster)
        const flash = caster.scene.add.circle(caster.x, caster.y, 10, 0x55ff55, 0.8);
        caster.scene.tweens.add({
            targets: flash,
            scale: 50,
            alpha: 0,
            duration: 800,
            ease: 'Cubic.easeOut',
            onComplete: () => flash.destroy()
        });

        return true;
    }

    playHealAuraEffect(scene, x, y) {
        // Create an emitter that spatters green/yellow sparkles upward
        const emitter = scene.add.particles(x, y, 'emoji_sparkle', {
            speed: { min: 50, max: 150 },
            angle: { min: 220, max: 320 }, // pointing upwards
            scale: { start: 0.6, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 800,
            blendMode: 'ADD',
            tint: [0x55ff55, 0xaaffaa, 0x00ff00], // healing colors
            quantity: 20
        });

        emitter.explode(20);

        // Auto cleanup
        scene.time.delayedCall(1000, () => {
            emitter.destroy();
        });
    }
}
