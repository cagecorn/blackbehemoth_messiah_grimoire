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

        // Check if target already has this buff type. If so, refresh it and maybe update amounts.
        let existing = this.activeBuffs.find(b => b.target === target && b.type === type);

        const now = this.scene.time.now;
        const expireTime = now + duration;
        const amountCrit = custom.critBoost || 0;

        if (existing) {
            existing.expireTime = expireTime;
            // Update the stats if the new buff is stronger
            if (amountAtk > existing.amountAtk || amountMAtk > existing.amountMAtk || amountDR > existing.amountDR || amountCrit > existing.amountCrit) {
                target.bonusAtk = (target.bonusAtk - existing.amountAtk) + amountAtk;
                target.bonusMAtk = (target.bonusMAtk - existing.amountMAtk) + amountMAtk;
                target.bonusDR = (target.bonusDR - (existing.amountDR || 0)) + amountDR;
                if (amountCrit > (existing.amountCrit || 0)) {
                    target.bonusCrit = (target.bonusCrit || 0) - (existing.amountCrit || 0) + amountCrit;
                }
                existing.amountAtk = amountAtk;
                existing.amountMAtk = amountMAtk;
                existing.amountDR = amountDR;
                existing.amountCrit = amountCrit;
            }
            console.log(`[BuffManager] Refreshed ${type} on ${target.unitName}. (Atk+${existing.amountAtk}, mAtk+${existing.amountMAtk}, DR+${existing.amountDR}, Crit+${existing.amountCrit})`);
        } else {
            // Apply new buff
            target.bonusAtk += amountAtk;
            target.bonusMAtk += amountMAtk;
            target.bonusDR = (target.bonusDR || 0) + amountDR;
            target.bonusCrit = (target.bonusCrit || 0) + amountCrit;

            this.activeBuffs.push({
                target,
                source,
                type,
                duration,
                expireTime,
                amountAtk,
                amountMAtk,
                amountDR,
                amountCrit
            });

            if (target.syncStatusUI) target.syncStatusUI();

            console.log(`[BuffManager] %c${source.unitName}%c applied ${type} to %c${target.unitName}%c. (Atk+${amountAtk}, mAtk+${amountMAtk}, DR+${amountDR}, Crit+${amountCrit})`,
                'color:#00ffff; font-weight:bold;', 'color:inherit;', 'color:#ffff00; font-weight:bold;', 'color:inherit;');
        }
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
                buff.target.bonusAtk -= buff.amountAtk;
                buff.target.bonusMAtk -= buff.amountMAtk;
                buff.target.bonusDR -= (buff.amountDR || 0);
                if (buff.amountCrit) {
                    buff.target.bonusCrit -= buff.amountCrit;
                }

                console.log(`[BuffManager] ${buff.type} expired on ${buff.target.unitName}.`);
                const target = buff.target;
                this.activeBuffs.splice(i, 1);

                if (target.syncStatusUI) target.syncStatusUI();
            }
        }
    }
}
