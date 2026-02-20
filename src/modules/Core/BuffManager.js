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
    applyBuff(target, source, type, duration, amountAtk, amountMAtk) {
        if (!target || !target.active || target.hp <= 0) return;

        // Check if target already has this buff type. If so, refresh it and maybe update amounts.
        let existing = this.activeBuffs.find(b => b.target === target && b.type === type);

        const now = this.scene.time.now;
        const expireTime = now + duration;

        if (existing) {
            existing.expireTime = expireTime;
            // Update the stats if the new buff is stronger
            if (amountAtk > existing.amountAtk || amountMAtk > existing.amountMAtk) {
                target.bonusAtk = (target.bonusAtk - existing.amountAtk) + amountAtk;
                target.bonusMAtk = (target.bonusMAtk - existing.amountMAtk) + amountMAtk;
                existing.amountAtk = amountAtk;
                existing.amountMAtk = amountMAtk;
            }
            console.log(`[BuffManager] Refreshed ${type} on ${target.unitName}. (Atk+${existing.amountAtk}, mAtk+${existing.amountMAtk})`);
        } else {
            // Apply new buff
            target.bonusAtk += amountAtk;
            target.bonusMAtk += amountMAtk;

            // Visual Icon
            const icon = this.scene.add.image(target.x, target.y - 50, 'emoji_buff');
            icon.setDisplaySize(16, 16);
            icon.setDepth(target.depth + 1);

            // Pop animation
            this.scene.tweens.add({
                targets: icon,
                scaleX: 1.5,
                scaleY: 1.5,
                yoyo: true,
                duration: 200
            });

            this.activeBuffs.push({
                target,
                source,
                type,
                duration,
                expireTime,
                icon,
                amountAtk,
                amountMAtk
            });

            console.log(`[BuffManager] %c${source.unitName}%c applied ${type} to %c${target.unitName}%c. (Atk+${amountAtk}, mAtk+${amountMAtk})`,
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
                if (buff.icon) buff.icon.destroy();
                this.activeBuffs.splice(i, 1);
                continue;
            }

            // Update icon position
            if (buff.icon) {
                const targetBuffs = this.activeBuffs.filter(b => b.target === buff.target);
                const index = targetBuffs.indexOf(buff);
                const offsetX = (index - (targetBuffs.length - 1) / 2) * 16;

                buff.icon.setPosition(buff.target.x + offsetX, buff.target.y - 50);
                buff.icon.setDepth(buff.target.depth + 1);
            }

            // Check expiration
            if (time > buff.expireTime) {
                // Remove Stats
                buff.target.bonusAtk -= buff.amountAtk;
                buff.target.bonusMAtk -= buff.amountMAtk;

                // Visual cleanup
                if (buff.icon) buff.icon.destroy();

                console.log(`[BuffManager] ${buff.type} expired on ${buff.target.unitName}.`);
                this.activeBuffs.splice(i, 1);
            }
        }
    }
}
