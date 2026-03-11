import DBManager from '../Database/DBManager.js';
import EventBus from '../Events/EventBus.js';
import localizationManager from './LocalizationManager.js';

/**
 * MessiahManager
 * Handles the "Messiah Touch" system: stats, powers, stacks, and upgrades.
 */
class MessiahManager {
    static POWER_DATA = {
        JUDGMENT: { id: 'JUDGMENT', name: '심판의 권능', emoji: '👆', type: 'OFFENSE' },
        HEALING: { id: 'HEALING', name: '치료의 권능', emoji: '🫳', type: 'DEFENSE' },
        ENCOURAGEMENT: { id: 'ENCOURAGEMENT', name: '격려의 권능', emoji: '👍', type: 'SUPPORT' }
    };

    constructor() {
        this.stats = {
            level: 1,
            exp: 0,
            atk: 50,
            mAtk: 50,
            def: 10,
            castSpd: 1000, // Influences cooldown reduction
            acc: 90,
            crit: 10
        };

        this.powers = {
            JUDGMENT: { ...MessiahManager.POWER_DATA.JUDGMENT, level: 1 },
            HEALING: { ...MessiahManager.POWER_DATA.HEALING, level: 1 },
            ENCOURAGEMENT: { ...MessiahManager.POWER_DATA.ENCOURAGEMENT, level: 1 }
        };

        this.activePowerId = 'JUDGMENT';
        this.stacks = 0;
        this.maxStacks = 10;
        this.cooldownTimer = 0;
        this.baseCooldown = 5000; // 5 seconds base
        this.isAutoMode = false;

        this.isInitialized = false;
    }

    static getLocalizedName(powerId) {
        if (!powerId) return '';
        const key = `messiah_power_${powerId.toLowerCase()}_name`;
        const internal = MessiahManager.POWER_DATA[powerId.toUpperCase()];
        return localizationManager.t(key, null, internal ? internal.name : powerId);
    }

    static getLocalizedDescription(powerId) {
        if (!powerId) return '';
        const key = `messiah_power_${powerId.toLowerCase()}_desc`;
        return localizationManager.t(key, null, '');
    }

    async init() {
        if (this.isInitialized) return;

        const savedState = await DBManager.get('settings', 'messiah_state');
        if (savedState) {
            this.stats = { ...this.stats, ...savedState.stats };
            this.powers = { ...this.powers, ...savedState.powers };
            this.activePowerId = savedState.activePowerId || 'JUDGMENT';
            this.stacks = savedState.stacks || 0;
            this.isAutoMode = !!savedState.isAutoMode;
            this.updateMaxStacks();
            console.log('[MessiahManager] Loaded saved state:', savedState);
        }

        this.isInitialized = true;
    }

    async saveState() {
        await DBManager.save('settings', 'messiah_state', {
            stats: this.stats,
            powers: this.powers,
            activePowerId: this.activePowerId,
            stacks: this.stacks,
            isAutoMode: this.isAutoMode
        });
    }

    addExp(amount) {
        this.stats.exp += amount;
        let leveledUp = false;

        while (true) {
            const requiredExp = this.stats.level * 100;
            if (this.stats.exp >= requiredExp) {
                this.stats.exp -= requiredExp;
                this.stats.level++;

                // Stat scaling per level
                this.stats.atk += 5;
                this.stats.mAtk += 5;
                this.stats.def += 2;
                this.stats.acc += 1;
                // crit and castSpd remain relatively static or can be scaled differently if needed

                leveledUp = true;
                const msg = localizationManager.t('ui_messiah_sys_leveled_up', [this.stats.level]);
                EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, msg, '#fbbf24');
            } else {
                break;
            }
        }

        this.saveState();
        if (leveledUp) {
            EventBus.emit('MESSIAH_LEVELED_UP', this.stats.level);
            // Also notify power UI if it's open
            EventBus.emit('MESSIAH_POWER_UPGRADED', this.activePowerId);
        }
    }

    toggleAutoMode() {
        this.isAutoMode = !this.isAutoMode;
        this.saveState();
        return this.isAutoMode;
    }

    getActivePower() {
        return this.powers[this.activePowerId];
    }

    setActivePower(powerId) {
        if (this.powers[powerId]) {
            this.activePowerId = powerId;
            this.updateMaxStacks();
            this.saveState();
            EventBus.emit('MESSIAH_POWER_CHANGED', powerId);
            return true;
        }
        return false;
    }

    getStats() {
        return this.stats;
    }

    updateMaxStacks() {
        const power = this.getActivePower();
        if (power) {
            this.maxStacks = 10 + (power.level - 1) * 2;
            if (this.stacks > this.maxStacks) {
                this.stacks = this.maxStacks;
            }
        }
    }

    update(time, delta) {
        if (!this.isInitialized) return;

        // Stack regeneration logic
        if (this.stacks < this.maxStacks) {
            this.cooldownTimer += delta;

            // Cooldown reduction based on castSpd (1000 is base)
            const actualCooldown = this.baseCooldown * (1000 / this.stats.castSpd);

            if (this.cooldownTimer >= actualCooldown) {
                this.stacks++;
                this.cooldownTimer = 0;
                EventBus.emit('MESSIAH_STACKS_UPDATED', this.stacks);
            }
        }
    }

    consumeStack() {
        if (this.stacks > 0) {
            this.stacks--;
            EventBus.emit('MESSIAH_STACKS_UPDATED', this.stacks);
            this.saveState();
            return true;
        }
        return false;
    }

    async upgradePower(powerId) {
        const power = this.powers[powerId];
        if (!power) return false;

        // Upgrade logic (requires ✨ Divine Essence)
        // Check if we have enough essence (cost scales with level)
        const cost = power.level * 10;
        const essenceItem = await DBManager.getInventoryItem('emoji_divine_essence');
        const currentEssence = essenceItem ? essenceItem.amount : 0;

        if (currentEssence < cost) {
            const msg = localizationManager.t('ui_messiah_sys_low_essence', [cost]);
            EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, msg);
            return false;
        }

        // Deduct essence
        await DBManager.saveInventoryItem('emoji_divine_essence', currentEssence - cost);
        EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);

        power.level++;
        this.updateMaxStacks();

        await this.saveState();
        EventBus.emit('MESSIAH_POWER_UPGRADED', powerId);
        return true;
    }
}

// Global instance
const messiahManager = new MessiahManager();
export default messiahManager;
