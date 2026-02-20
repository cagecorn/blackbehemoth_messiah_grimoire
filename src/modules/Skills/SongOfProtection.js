import Phaser from 'phaser';

/**
 * SongOfProtection.js
 * A skill for the Bard that grants a party-wide shield based on magic attack,
 * featuring musical visual effects.
 */
export default class SongOfProtection {
    constructor(options = {}) {
        this.cooldown = options.cooldown || 10000;
        this.shieldMultiplier = options.shieldMultiplier || 2.5;
        this.shieldDuration = options.shieldDuration || 5000; // 5 seconds
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
     * Executes the Song of Protection.
     * @param {Phaser.GameObjects.Container} caster - Who is using the skill
     */
    execute(caster) {
        if (!caster || !caster.active || caster.hp <= 0) return false;

        const now = caster.scene.time.now;
        if (!this.isReady(now, caster.castSpd)) {
            return false; // Still on cooldown
        }

        this.lastCastTime = now;

        console.log(`[Skill] ${caster.unitName} uses Song of Protection!`);

        // Determine the allied group dynamically
        const isMonster = caster.scene.enemies.contains(caster);
        const alliedGroup = isMonster ? caster.scene.enemies : caster.scene.mercenaries;

        const totalMAtk = caster.getTotalMAtk ? caster.getTotalMAtk() : caster.mAtk;
        const shieldAmount = totalMAtk * this.shieldMultiplier;

        if (caster.showSpeechBubble) {
            caster.showSpeechBubble("수호의 선율이여...!");
        }

        // Apply shield to all active allies
        const allies = alliedGroup.getChildren();
        allies.forEach(ally => {
            if (ally.active && ally.hp > 0) {
                // Apply shield via ShieldManager
                if (caster.scene.shieldManager) {
                    caster.scene.shieldManager.applyShield(ally, shieldAmount, this.shieldDuration);
                }

                // Show text
                if (caster.scene.fxManager) {
                    caster.scene.fxManager.showHealText(ally, `SHIELD`, '#ffff00');
                }

                // Flashy individual effect
                caster.scene.tweens.add({
                    targets: ally.sprite,
                    tint: 0xffff00,
                    duration: 200,
                    yoyo: true,
                    onComplete: () => {
                        if (ally.sprite && ally.active) ally.sprite.clearTint();
                    }
                });

                // Music particle burst
                this.playMusicAuraEffect(caster.scene, ally.x, ally.y);
            }
        });

        // Giant screen-wide central flash (optional, just centered on the caster)
        const flash = caster.scene.add.circle(caster.x, caster.y, 10, 0xffff00, 0.6);
        caster.scene.tweens.add({
            targets: flash,
            scale: 60,
            alpha: 0,
            duration: 1000,
            ease: 'Cubic.easeOut',
            onComplete: () => flash.destroy()
        });

        return true;
    }

    playMusicAuraEffect(scene, x, y) {
        // Create an emitter that spatters music notes upward
        const emitter = scene.add.particles(x, y, 'emoji_note', {
            speed: { min: 40, max: 100 },
            angle: { min: 200, max: 340 }, // pointing upwards
            scale: { start: 0.6, end: 0.2 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 1200,
            gravityY: -40,
            blendMode: 'NORMAL',
            quantity: 6
        });

        emitter.explode(6);

        // Auto cleanup
        scene.time.delayedCall(1500, () => {
            emitter.destroy();
        });
    }
}
