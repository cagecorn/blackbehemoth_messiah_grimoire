/**
 * FishBuffHeadlessTest.js
 * Verifies FishingManager buff application and expiration logic.
 */
import EventEmitter from 'events';

// 1. Mock Database & EventBus
const EventBus = {
    EVENTS: {
        INVENTORY_UPDATED: 'INVENTORY_UPDATED',
        SYSTEM_MESSAGE: 'SYSTEM_MESSAGE'
    },
    emitter: new EventEmitter(),
    on(event, fn) { this.emitter.on(event, fn); },
    emit(event, payload) { this.emitter.emit(event, payload); }
};

const DBManager = {
    inventory: {
        'mackerel': { id: 'mackerel', amount: 5 },
        'herring': { id: 'herring', amount: 1 },
        'squid': { id: 'squid', amount: 0 }
    },
    async getInventoryItem(id) {
        return this.inventory[id] || null;
    },
    async saveInventoryItem(id, amount) {
        if (!this.inventory[id]) this.inventory[id] = { id, amount: 0 };
        this.inventory[id].amount = amount;
    },
    async get(store, key) { return null; },
    async save(store, key, val) { }
};

// 2. Import/Mock constants from FishingManager
const FISH_DATA = {
    'mackerel': { id: 'mackerel', name: '고등어', buffType: 'SPAWN_RATE', buffValue: 0.3, buffDescription: '몬스터 출현 양 30% 상승' },
    'herring': { id: 'herring', name: '청어', buffType: 'MONSTER_LEVEL', buffValue: 1, buffDescription: '몬스터 레벨 1 상승' }
};
const FISHING_SPOTS = {
    'lake': { id: 'lake', fishList: ['mackerel', 'herring'] }
};

// 3. Simplified FishingManager for testing
class FishingManager {
    constructor() {
        this.state = {
            activeSpotId: 'lake',
            autoConsume: true,
            activeFishBuffs: {}
        };
    }

    async processAutoConsume(currentRound) {
        if (!this.state.autoConsume) return;
        const spot = FISHING_SPOTS[this.state.activeSpotId];
        for (const fishId of spot.fishList) {
            const inventory = await DBManager.getInventoryItem(fishId);
            if (inventory && inventory.amount > 0) {
                await DBManager.saveInventoryItem(fishId, inventory.amount - 1);
                const fishData = FISH_DATA[fishId];
                this.state.activeFishBuffs[fishData.buffType] = {
                    id: fishId,
                    name: fishData.name,
                    value: fishData.buffValue,
                    expiresAtRound: currentRound + 1
                };
                console.log(`[Test] Applied ${fishData.name} buff at Round ${currentRound}`);
            }
        }
    }

    clearExpiredBuffs(currentRound) {
        for (const [type, buff] of Object.entries(this.state.activeFishBuffs)) {
            if (currentRound >= buff.expiresAtRound) {
                console.log(`[Test] Expired ${buff.name} buff at Round ${currentRound}`);
                delete this.state.activeFishBuffs[type];
            }
        }
    }

    getBuffValue(type) {
        return this.state.activeFishBuffs[type]?.value || 0;
    }
}

async function runTest() {
    console.log("=== Fish Buff Headless Verification ===");
    const fm = new FishingManager();

    // Round 1: Consume fish
    console.log("\n--- Round 1 Start ---");
    await fm.processAutoConsume(1);
    console.log("Active Buffs:", Object.keys(fm.state.activeFishBuffs));
    console.log("SPAWN_RATE Value:", fm.getBuffValue('SPAWN_RATE'));
    
    if (fm.getBuffValue('SPAWN_RATE') === 0.3) console.log("✅ Round 1 Application Passed");
    else { console.log("❌ Round 1 Application Failed"); process.exit(1); }

    // Round 2: Expiration & New Consumption
    console.log("\n--- Round 2 Start ---");
    fm.clearExpiredBuffs(2);
    console.log("Buffs after expiration check:", Object.keys(fm.state.activeFishBuffs));
    
    if (Object.keys(fm.state.activeFishBuffs).length === 0) console.log("✅ Round 2 Expiration Passed");
    else { console.log("❌ Round 2 Expiration Failed"); process.exit(1); }

    await fm.processAutoConsume(2);
    console.log("Buffs after re-consumption:", Object.keys(fm.state.activeFishBuffs));
    
    // Check inventory decrement
    const mackerel = await DBManager.getInventoryItem('mackerel');
    console.log("Mackerel count (start: 5):", mackerel.amount);
    if (mackerel.amount === 3) console.log("✅ Inventory Deduction Passed (2 rounds)");
    else { console.log("❌ Inventory Deduction Failed"); process.exit(1); }

    console.log("\n=== All Fish Buff Tests Passed! ===");
}

runTest();
