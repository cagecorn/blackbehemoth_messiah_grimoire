import Phaser from 'phaser';
import SoundEffects from '../Core/SoundEffects.js';

/**
 * TacticalCommand.js
 * A buff skill that targets the caster and one random ally.
 * Temporarily increases the effectiveness of their "Basic Attacks" by 50%.
 * (Physical, Magical, Healing, and Basic Buffing).
 * Cooldown scales with castSpd.
 */
export default class TacticalCommand {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.id = 'tactical_command';
        this.name = '전술 지휘';

        this.baseCooldown = options.cooldown || 25000;
        this.duration = options.duration || 10000;

        this.lastCastTime = 0;
    }

    getActualCooldown(castSpd) {
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

        // Determine allied group (Mercenary vs Monster)
        const alliesGroup = caster.allyGroup;
        const group = alliesGroup ? alliesGroup.getChildren() : [];

        // Filter valid living allies excluding the caster
        const validAllies = group.filter(ally => ally !== caster && ally.active && ally.hp > 0);

        if (validAllies.length === 0) {
            console.log(`[Skill] Tactical Command: No valid allies found for ${caster.unitName}.`);
            return false; // Could choose to allow self-buff only, but let's require an ally for "Command"
        }

        // Pick one random ally
        const targetAlly = Phaser.Utils.Array.GetRandom(validAllies);

        this.lastCastTime = now;

        console.log(`[Skill] 📢 Tactical Command activated by ${caster.unitName}!`);
        console.log(`[Skill] 📢 Buffing ${caster.unitName} and ${targetAlly.unitName} for ${this.duration}ms.`);

        SoundEffects.playJajajanSound();

        // Apply Buff
        this.applyBuffToTarget(caster, caster);
        this.applyBuffToTarget(targetAlly, caster);

        return true;
    }

    applyBuffToTarget(target, caster) {
        // Prevent overlapping internal timers if already buffed
        if (target.isTacticalCommandActive) {
            console.log(`[Skill] 📢 ${target.unitName} is already under Tactical Command. Refreshing...`);
            // Let's reset the timer and clear previous glow if it exists.
            if (target.tacticalCommandTimer) {
                target.tacticalCommandTimer.remove();
                target.tacticalCommandTimer = null;
            }
            if (target.tacticalCommandGlow) {
                target.sprite.postFX.remove(target.tacticalCommandGlow);
                target.tacticalCommandGlow = null;
            }
        }

        target.isTacticalCommandActive = true;
        if (target.syncStatusUI) target.syncStatusUI();

        // Visuals: Megaphone icon popping up or a glow
        if (this.scene.fxManager) {
            this.scene.fxManager.showDamageText(target, '전술 지휘!', '#ffff00');
        }

        target.tacticalCommandGlow = target.sprite.postFX.addGlow(0xffff00, 2, 0, false, 0.1, 10);

        // --- Skin Bonus: +25% Attack Speed (Nickle Fox Skin) ---
        let skinBonusAtkSpd = 0;
        // The CASTER must have the skin bonus, which then buffs the target
        const skinBonus = (caster.getSkinBonus) ? caster.getSkinBonus(this.id) : null;
        if (skinBonus && skinBonus.atkSpdMult) {
            skinBonusAtkSpd = -(target.atkSpd * skinBonus.atkSpdMult); // Negative to decrease delay
            target.bonusAtkSpd += skinBonusAtkSpd;
            console.log(`[Skill] 📢 Tactial Command: Skin Bonus applied to ${target.unitName} (${skinBonusAtkSpd}ms AtkSpd delay reduction)`);
        }

        // Set expiration timer
        target.tacticalCommandTimer = this.scene.time.delayedCall(this.duration, () => {
            if (target && target.active) {
                target.isTacticalCommandActive = false;
                if (target.tacticalCommandGlow) {
                    target.sprite.postFX.remove(target.tacticalCommandGlow);
                    target.tacticalCommandGlow = null;
                }
                if (target.syncStatusUI) target.syncStatusUI();

                // Revert Skin Bonus
                if (skinBonusAtkSpd !== 0) {
                    target.bonusAtkSpd -= skinBonusAtkSpd;
                }

                console.log(`[Skill] 📢 Tactical Command expired for ${target.unitName}.`);
            }
        }, [], this);
    }
}
