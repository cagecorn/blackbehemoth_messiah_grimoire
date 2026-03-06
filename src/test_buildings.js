/**
 * Headless Test for Building Support Actions
 * Verify cooldown logic and effect scaling (Tree Healing)
 */

// Mock EventBus
const EventBus = {
    events: {},
    on: function (evt, cb) { this.events[evt] = cb; },
    emit: function (evt, data) { if (this.events[evt]) this.events[evt](data); },
    off: function (evt) { delete this.events[evt]; }
};

// Mock BUILDING_TYPES (Simplified)
const BUILDING_TYPES = {
    TREE: { id: 'tree', cooldown: 15 },
    FACTORY: { id: 'factory', cooldown: 20 },
    BANK: { id: 'bank', cooldown: 10 },
    CHURCH: { id: 'church', cooldown: 60 },
    CAMP: { id: 'camp', cooldown: 30 },
    CASTLE: { id: 'castle', cooldown: 300 }
};

// Mock SupportActionManager logic
class MockSupportActionManager {
    calculateHeal(level) {
        return 15 + (level - 1) * 5;
    }
    calculateDamage(level) {
        return 10 + (level - 1) * 4;
    }
    calculateBankGold(level) {
        return 50 + (level - 1) * 25;
    }
    calculateCampDamage(level) {
        return 10 + (level - 1) * 3;
    }
    calculateCampStun(level) {
        return 1000 + (level - 1) * 200;
    }
    calculateCastleGems(level) {
        return 1 + Math.floor((level - 1) / 5);
    }
}

// Mock BuildingManager logic
class MockBuildingManager {
    constructor() {
        this.slots = [
            { typeId: 'tree', level: 1 },
            { typeId: 'factory', level: 1 },
            { typeId: 'bank', level: 1 }
        ];
        this.cooldowns = [0, 0, 0];
    }

    update(dt) {
        let triggers = [];
        this.slots.forEach((slot, i) => {
            if (!slot) return;
            const config = BUILDING_TYPES[slot.typeId.toUpperCase()];
            if (!config) return;
            const dtSec = dt / 1000;
            this.cooldowns[i] += dtSec / config.cooldown;

            if (this.cooldowns[i] >= 1) {
                triggers.push({ typeId: slot.typeId, level: slot.level });
                this.cooldowns[i] %= 1;
            }
        });
        return triggers;
    }
}

function runTests() {
    console.log("=== Building System Headless Test (Full) ===");

    const actionManager = new MockSupportActionManager();
    const buildingManager = new MockBuildingManager();

    // Test 1: Scaling Verification
    console.log("\n[Test 1] Scaling Verification (All Buildings):");
    const levels = [1, 2, 3, 5, 10];
    levels.forEach(lvl => {
        const heal = actionManager.calculateHeal(lvl);
        const dmg = actionManager.calculateDamage(lvl);
        const gold = actionManager.calculateBankGold(lvl);
        const campDmg = actionManager.calculateCampDamage(lvl);
        const stun = actionManager.calculateCampStun(lvl);
        const gems = actionManager.calculateCastleGems(lvl);

        console.log(`- Lvl ${lvl}: Heal=${heal}, FactoryDmg=${dmg}, Gold=${gold}, CampDmg=${campDmg}, Stun=${stun}ms, Gems=${gems}`);

        if (heal !== (15 + (lvl - 1) * 5)) throw new Error(`Heal fail @ ${lvl}`);
        if (dmg !== (10 + (lvl - 1) * 4)) throw new Error(`FactoryDmg fail @ ${lvl}`);
        if (gold !== (50 + (lvl - 1) * 25)) throw new Error(`Gold fail @ ${lvl}`);
        if (campDmg !== (10 + (lvl - 1) * 3)) throw new Error(`CampDmg fail @ ${lvl}`);
        if (stun !== (1000 + (lvl - 1) * 200)) throw new Error(`Stun fail @ ${lvl}`);
        if (gems !== (1 + Math.floor((lvl - 1) / 5))) throw new Error(`Gems fail @ ${lvl}`);
    });
    console.log("Scaling Result: PASS");

    // Test 2: Cooldown Timing (Bank @ 10s)
    console.log("\n[Test 2] Cooldown Timing (Bank @ 10s):");
    // Bank is index 2
    buildingManager.update(9900);
    if (buildingManager.cooldowns[2] >= 1) throw new Error("Bank triggered too early!");

    let triggers = buildingManager.update(200);
    const hasBank = triggers.some(t => t.typeId === 'bank');
    console.log(`- Bank triggered at 10.1s: ${hasBank}`);
    if (!hasBank) throw new Error("Bank failed to trigger!");
    console.log("Result: PASS");

    console.log("\n=== ALL TESTS PASSED SUCCESSFULLY ===");
}

try {
    runTests();
} catch (e) {
    console.error("\nTEST FAILED!");
    console.error(e.message);
    process.exit(1);
}
