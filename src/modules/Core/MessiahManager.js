import DBManager from '../Database/DBManager.js';
import EventBus from '../Events/EventBus.js';

/**
 * MessiahManager
 * Handles the "Messiah Touch" system: stats, powers, stacks, and upgrades.
 */
class MessiahManager {
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
            JUDGMENT: { id: 'JUDGMENT', name: '심판의 권능', emoji: '👆', level: 1, type: 'OFFENSE' },
            HEALING: { id: 'HEALING', name: '치료의 권능', emoji: '🫳', level: 1, type: 'DEFENSE' },
            ENCOURAGEMENT: { id: 'ENCOURAGEMENT', name: '격려의 권능', emoji: '👍', level: 1, type: 'SUPPORT' }
        };

        this.activePowerId = 'JUDGMENT';
        this.stacks = 0;
        this.maxStacks = 10;
        this.cooldownTimer = 0;
        this.baseCooldown = 5000; // 5 seconds base

        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;

        const savedState = await DBManager.get('settings', 'messiah_state');
        if (savedState) {
            this.stats = { ...this.stats, ...savedState.stats };
            this.powers = { ...this.powers, ...savedState.powers };
            this.activePowerId = savedState.activePowerId || 'JUDGMENT';
            this.stacks = savedState.stacks || 0;
            console.log('[MessiahManager] Loaded saved state:', savedState);
        }

        this.isInitialized = true;
    }

    async saveState() {
        await DBManager.save('settings', 'messiah_state', {
            stats: this.stats,
            powers: this.powers,
            activePowerId: this.activePowerId,
            stacks: this.stacks
        });
    }

    getActivePower() {
        return this.powers[this.activePowerId];
    }

    setActivePower(powerId) {
        if (this.powers[powerId]) {
            this.activePowerId = powerId;
            this.saveState();
            EventBus.emit('MESSIAH_POWER_CHANGED', powerId);
            return true;
        }
        return false;
    }

    getStats() {
        return this.stats;
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
        // For now, just increment level
        power.level++;
        this.maxStacks = 10 + (power.level - 1) * 2; // Increase max stacks with level

        await this.saveState();
        EventBus.emit('MESSIAH_POWER_UPGRADED', powerId);
        return true;
    }
}

// Global instance
const messiahManager = new MessiahManager();
export default messiahManager;
