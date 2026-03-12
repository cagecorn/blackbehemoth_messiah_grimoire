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
        // --- DEFENSIVE SINGLETON ---
        if (typeof window !== 'undefined' && window.__MESSIAH_SINGLETON_HOLDER__) {
            return window.__MESSIAH_SINGLETON_HOLDER__;
        }

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

        this._hasLoaded = false;
        this.isInitialized = false;
        this._saveQueue = Promise.resolve(); // For serializing saves
        this._instanceId = Math.random().toString(36).substr(2, 9);
        
        if (typeof window !== 'undefined') {
            window.__MESSIAH_SINGLETON_HOLDER__ = this;
            console.log(`%c[MessiahManager] Unique Singleton Instance [${this._instanceId}] created.`,"color: #8b5cf6; font-weight: bold;");
        }
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

        console.log("%c[MessiahManager] Initializing...", "color: #fbbf24; font-weight: bold;");

        try {
            const savedState = await DBManager.get('settings', 'messiah_state');
            console.log("[MessiahManager] DB Load raw result:", savedState);

            if (savedState && savedState.stats) {
                // Mutative merge to maintain references if any
                Object.assign(this.stats, savedState.stats);
                
                // For powers, we need to deep merge or carefully assign
                if (savedState.powers) {
                    Object.keys(savedState.powers).forEach(key => {
                        if (this.powers[key]) {
                            Object.assign(this.powers[key], savedState.powers[key]);
                        }
                    });
                }

                this.activePowerId = savedState.activePowerId || 'JUDGMENT';
                this.stacks = savedState.stacks || 0;
                this.isAutoMode = !!savedState.isAutoMode;
                this.updateMaxStacks();
                console.log(`%c[MessiahManager] Success! Loaded Lv.${this.stats.level} (Exp: ${this.stats.exp})`, "color: #4ade80; font-weight: bold;");
            } else {
                console.warn('[MessiahManager] No valid saved state found in DB or data corrupted. Using defaults.');
            }
            this._hasLoaded = true; // Mark as loaded safely to allow future saves
        } catch (e) {
            console.error('%c[MessiahManager] CRITICAL LOAD ERROR:', "color: #ef4444; font-weight: bold;", e);
        }

        this.isInitialized = true;
    }

    async saveState() {
        // Queue the save operation to prevent race conditions
        this._saveQueue = this._saveQueue.then(async () => {
            if (!this._hasLoaded) {
                console.warn(`%c[MessiahManager:${this._instanceId}] saveState BLOCKED: Loading failed or in progress.`, "color: #fca5a5;");
                return;
            }

            const stateToSave = {
                stats: { ...this.stats },
                powers: JSON.parse(JSON.stringify(this.powers)), 
                activePowerId: this.activePowerId,
                stacks: this.stacks,
                isAutoMode: this.isAutoMode,
                _timestamp: Date.now()
            };

            try {
                console.log(`%c[MessiahManager:${this._instanceId}] Pushing to DB: Lv.${this.stats.level} (Exp: ${this.stats.exp})`, "color: #fbbf24;");
                await DBManager.save('settings', 'messiah_state', stateToSave);
                
                // Verification
                const verified = await DBManager.get('settings', 'messiah_state');
                if (verified && verified.stats && verified.stats.level === this.stats.level) {
                    console.log(`%c[MessiahManager:${this._instanceId}] Save Verified!`, "color: #4ade80;");
                } else {
                    console.error(`%c[MessiahManager:${this._instanceId}] SAVE VERIFICATION FAILED!`, "color: #ff0000; font-weight: bold;", { memory: this.stats, db: verified ? verified.stats : 'MISSING' });
                }
            } catch (e) {
                console.error(`[MessiahManager:${this._instanceId}] saveState error:`, e);
            }
        });

        return this._saveQueue;
    }

    async addExp(amount) {
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

        await this.saveState();
        
        // --- Currency Unification ---
        // Earned Messiah EXP also acts as Divine Essence for upgrades
        await this._awardEssence(amount);

        if (leveledUp) {
            console.log(`%c[MessiahManager] Level Up Verified: ${this.stats.level}`, "color: #fbbf24; font-weight: bold;");
            EventBus.emit('MESSIAH_LEVELED_UP', this.stats.level);
            // Also notify power UI if it's open
            EventBus.emit('MESSIAH_POWER_UPGRADED', this.activePowerId);
        }
    }

    async toggleAutoMode() {
        this.isAutoMode = !this.isAutoMode;
        await this.saveState();
        return this.isAutoMode;
    }

    getActivePower() {
        return this.powers[this.activePowerId];
    }

    async setActivePower(powerId) {
        if (this.powers[powerId]) {
            this.activePowerId = powerId;
            this.updateMaxStacks();
            await this.saveState();
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

    async consumeStack() {
        if (this.stacks > 0) {
            this.stacks--;
            EventBus.emit('MESSIAH_STACKS_UPDATED', this.stacks);
            await this.saveState();
            return true;
        }
        return false;
    }

    async upgradePower(powerId) {
        const power = this.powers[powerId];
        if (!power) return false;

        // Level Linkage: Power level cannot exceed Messiah Level
        if (power.level >= this.stats.level) {
            const msg = `메시아 레벨이 부족합니다! (현재 최고 레벨: ${this.stats.level})`;
            EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, msg, '#ff5555');
            return false;
        }

        // Upgrade logic (requires ✨ Divine Essence)
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

    async _awardEssence(amount) {
        try {
            const essenceItem = await DBManager.getInventoryItem('emoji_divine_essence');
            const currentEssence = essenceItem ? essenceItem.amount : 0;
            await DBManager.saveInventoryItem('emoji_divine_essence', currentEssence + amount);
            EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);
        } catch (e) {
            console.error('[MessiahManager] Error awarding essence:', e);
        }
    }
}

// Global instance
const messiahManager = new MessiahManager();

// --- EXTREME DEBUG HOOK ---
// This allows checking the state directly from the browser console
if (typeof window !== 'undefined') {
    window.MESSIAH_DEBUG = {
        getStats: () => messiahManager.stats,
        getPowers: () => messiahManager.powers,
        getRawDB: async () => await DBManager.get('settings', 'messiah_state'),
        forceSave: async () => await messiahManager.saveState(),
        addExp: async (n) => await messiahManager.addExp(n),
        checkPersistence: async () => {
            console.log("Checking persistence...");
            const mem = messiahManager.stats.level;
            await messiahManager.saveState();
            const db = await DBManager.get('settings', 'messiah_state');
            console.log(`Memory Level: ${mem}, DB Level: ${db ? db.stats.level : 'MISSING'}`);
            return mem === (db ? db.stats.level : -1);
        }
    };
}

export default messiahManager;
