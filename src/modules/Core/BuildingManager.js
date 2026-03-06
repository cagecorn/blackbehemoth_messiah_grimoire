import EventBus from '../Events/EventBus.js';
import DBManager from '../Database/DBManager.js';

export const BUILDING_TYPES = {
    BANK: { id: 'bank', emoji: '🏦', iconId: 'emoji_bank', resource: 'emoji_coin', rate: 10, cooldown: 10 },
    FACTORY: { id: 'factory', emoji: '🏭', iconId: 'emoji_factory', resource: 'emoji_brick', rate: 5, cooldown: 20 },
    CHURCH: { id: 'church', emoji: '⛪', iconId: 'emoji_church', resource: 'emoji_divine_essence', rate: 1, cooldown: 60 },
    CAMP: { id: 'camp', emoji: '🏕️', iconId: 'emoji_camp', resource: 'emoji_meat', rate: 3, cooldown: 30 },
    TREE: { id: 'tree', emoji: '🌳', iconId: 'emoji_tree', resource: 'emoji_wood', rate: 5, cooldown: 15 },
    CASTLE: { id: 'castle', emoji: '🏰', iconId: 'emoji_castle', resource: 'emoji_diamond', rate: 1, cooldown: 300 }
};

class BuildingManager {
    constructor() {
        this.slots = Array(12).fill(null);
        this.cooldowns = Array(12).fill(0); // Progress 0 to 1
        this.isInitialized = false;
        this._dirty = true;
    }

    update(dt) {
        if (!this.isInitialized) return;

        let hasUpdate = false;
        const dtSec = dt / 1000;

        this.slots.forEach((slot, i) => {
            if (!slot) {
                this.cooldowns[i] = 0;
                return;
            }

            const config = BUILDING_TYPES[slot.typeId.toUpperCase()];
            if (!config || !config.cooldown) return;

            // Increment progress: (seconds_passed / total_cooldown_seconds)
            this.cooldowns[i] += dtSec / config.cooldown;

            if (this.cooldowns[i] >= 1) {
                // Trigger Action
                EventBus.emit('BUILDING_ACTION_TRIGGERED', {
                    typeId: slot.typeId,
                    level: slot.level,
                    slotIndex: i
                });

                // Reset (modulo for precision if dt is large)
                this.cooldowns[i] %= 1;
            }
            hasUpdate = true;
        });

        if (hasUpdate) {
            EventBus.emit('BUILDING_COOLDOWN_UPDATE', {
                progresses: this.cooldowns
            });
        }
    }

    async init() {
        if (this.isInitialized) return;

        const saved = await DBManager.get('settings', 'building_slots');
        if (saved && saved.slots) {
            // Load saved data and ensure it fits the 12-slot grid
            saved.slots.forEach((s, i) => {
                if (i < 12) this.slots[i] = s;
            });
        }

        // Ensure at least the first 6 specific types are there for new players
        const activeTypesCount = this.slots.filter(s => s).length;
        if (activeTypesCount < 6) {
            const types = ['bank', 'factory', 'church', 'camp', 'tree', 'castle'];
            types.forEach((typeId, i) => {
                if (i < 12 && !this.slots[i]) {
                    this.slots[i] = { typeId, level: 1, lastProduced: Date.now() };
                }
            });
            await this.save();
        }

        this.isInitialized = true;
        EventBus.emit('BUILDINGS_UPDATED', { slots: this.slots });
        // REMOVED: this.startProductionLoop();
    }

    // REMOVED: startProductionLoop() { ... }

    async checkProduction() {
        // Placeholder for future combat support triggers
        if (!this.isInitialized) return;
    }

    // REMOVED: produce(slotIndex, config, amount) { ... }

    getResourceEmoji(resourceId) {
        const mapping = {
            'emoji_coin': '💰',
            'emoji_brick': '🧱',
            'emoji_divine_essence': '✨',
            'emoji_meat': '🍖',
            'emoji_wood': '🪵',
            'emoji_diamond': '💎'
        };
        return mapping[resourceId] || '🎁';
    }

    async addBuilding(typeId, slotIndex) {
        if (slotIndex < 0 || slotIndex >= 12) return;
        this.slots[slotIndex] = { typeId, level: 1, lastProduced: Date.now() };
        this._dirty = true;
        await this.save();
        EventBus.emit('BUILDINGS_UPDATED', { slots: this.slots });
    }

    async upgradeBuilding(slotIndex) {
        if (slotIndex < 0 || slotIndex >= 12) return false;
        const b = this.slots[slotIndex];
        if (!b) return false;

        // Exponential cost scaling: 1.5x per level
        const goldCost = Math.floor(100 * Math.pow(1.5, b.level - 1));
        const brickCost = Math.floor(20 * Math.pow(1.5, b.level - 1));

        const goldItem = await DBManager.getInventoryItem('emoji_coin');
        const brickItem = await DBManager.getInventoryItem('emoji_brick');

        if ((goldItem?.amount || 0) < goldCost || (brickItem?.amount || 0) < brickCost) {
            return { success: false, reason: '자원이 부족합니다.' };
        }

        // Deduct
        await DBManager.saveInventoryItem('emoji_coin', (goldItem.amount || 0) - goldCost);
        await DBManager.saveInventoryItem('emoji_brick', (brickItem.amount || 0) - brickCost);

        b.level++;
        this._dirty = true;
        await this.save();
        EventBus.emit('BUILDINGS_UPDATED', { slots: this.slots });
        EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);
        return { success: true };
    }

    async removeBuilding(slotIndex) {
        if (slotIndex < 0 || slotIndex >= 12) return;
        this.slots[slotIndex] = null;
        this._dirty = true;
        await this.save();
        EventBus.emit('BUILDINGS_UPDATED', { slots: this.slots });
    }

    async save() {
        await DBManager.save('settings', 'building_slots', { slots: this.slots });
    }

    get dirty() { return this._dirty; }
    set dirty(val) { this._dirty = val; }
}

const instance = new BuildingManager();
export default instance;
