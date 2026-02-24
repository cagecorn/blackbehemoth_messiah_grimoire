import Phaser from 'phaser';

/**
 * BuffManager.js
 * Tracks and applies temporary buffs to units.
 */
export default class BuffManager {
    constructor(scene) {
        this.scene = scene;
        this.activeBuffs = []; // Array of { target, source, type, duration, expireTime, icon, amountAtk, amountMAtk }
    }

    /**
     * Applies a hybrid stat buff to a target unit.
     */
    applyBuff(target, source, type, duration, amountAtk, amountMAtk, amountDR = 0, custom = {}) {
        if (!target || !target.active || target.hp <= 0) return;

        let existing = this.activeBuffs.find(b => b.target === target && b.type === type);
        const now = this.scene.time.now;
        const expireTime = now + duration;

        const buffs = {
            amountAtk,
            amountMAtk,
            amountDR,
            amountCrit: custom.bonusCrit || custom.critBoost || 0,
            amountEva: custom.bonusEva || 0,
            amountSpeed: custom.bonusSpeed || 0,
            amountDef: custom.bonusDef || 0,
            amountMDef: custom.bonusMDef || 0,
            amountAtkSpd: custom.bonusAtkSpd || 0,
            amountAtkRange: custom.bonusAtkRange || 0,
            amountRangeMin: custom.bonusRangeMin || 0,
            amountRangeMax: custom.bonusRangeMax || 0,
            amountCastSpd: custom.bonusCastSpd || 0,
            amountAcc: custom.bonusAcc || 0
        };

        if (existing) {
            existing.expireTime = expireTime;
            // Update stats if we want to replace or just refresh. 
            // For simplicity and to avoid stacking bugs, we revert previous and apply new.
            this.modifyTargetStats(target, existing.amounts, -1);
            this.modifyTargetStats(target, buffs, 1);
            existing.amounts = buffs;

            console.log(`[BuffManager] Refreshed ${type} on ${target.unitName}.`);
        } else {
            // Apply new buff
            this.modifyTargetStats(target, buffs, 1);

            this.activeBuffs.push({
                target,
                source,
                type,
                duration,
                expireTime,
                amounts: buffs
            });

            if (target.syncStatusUI) target.syncStatusUI();

            console.log(`[BuffManager] %c${source.unitName}%c applied ${type} to %c${target.unitName}%c.`,
                'color:#00ffff; font-weight:bold;', 'color:inherit;', 'color:#ffff00; font-weight:bold;', 'color:inherit;');
        }
    }

    modifyTargetStats(target, amounts, factor) {
        if (amounts.amountAtk) target.bonusAtk += amounts.amountAtk * factor;
        if (amounts.amountMAtk) target.bonusMAtk += amounts.amountMAtk * factor;
        if (amounts.amountDR) target.bonusDR += amounts.amountDR * factor;
        if (amounts.amountCrit) target.bonusCrit += amounts.amountCrit * factor;
        if (amounts.amountEva) target.bonusEva += amounts.amountEva * factor;
        if (amounts.amountSpeed) target.bonusSpeed += amounts.amountSpeed * factor;
        if (amounts.amountDef) target.bonusDef += amounts.amountDef * factor;
        if (amounts.amountMDef) target.bonusMDef += amounts.amountMDef * factor;
        if (amounts.amountAtkSpd) target.bonusAtkSpd += amounts.amountAtkSpd * factor;
        if (amounts.amountAtkRange) target.bonusAtkRange += amounts.amountAtkRange * factor;
        if (amounts.amountRangeMin) target.bonusRangeMin += amounts.amountRangeMin * factor;
        if (amounts.amountRangeMax) target.bonusRangeMax += amounts.amountRangeMax * factor;
        if (amounts.amountCastSpd) target.bonusCastSpd += amounts.amountCastSpd * factor;
        if (amounts.amountAcc) target.bonusAcc += amounts.amountAcc * factor;
    }

    hasBuff(target, type) {
        return this.activeBuffs.some(b => b.target === target && b.type === type);
    }

    update(time, delta) {
        for (let i = this.activeBuffs.length - 1; i >= 0; i--) {
            const buff = this.activeBuffs[i];

            // If target died or was destroyed, clean up
            if (!buff.target || !buff.target.active || buff.target.hp <= 0) {
                this.activeBuffs.splice(i, 1);
                continue;
            }

            // Check expiration
            if (time > buff.expireTime) {
                // Remove Stats
                this.modifyTargetStats(buff.target, buff.amounts, -1);

                console.log(`[BuffManager] ${buff.type} expired on ${buff.target.unitName}.`);
                const target = buff.target;
                this.activeBuffs.splice(i, 1);

                if (target.syncStatusUI) target.syncStatusUI();
            }
        }
    }
}
