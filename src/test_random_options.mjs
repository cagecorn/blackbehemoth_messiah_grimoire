
import equipmentManager from './modules/Core/EquipmentManager.js';

// Mock DBManager and EventBus
const DBManager = {
    saveEquipmentInstance: (inst) => {
        // console.log("DB Save:", inst.id, "Options:", inst.randomOptions.length); 
    },
    getEquipmentInstance: (id) => ({ id, level: 1, exp: 0, randomOptions: [], itemId: 'wood_sword' })
};

const EventBus = {
    emit: (event, data) => { /* console.log("Event:", event); */ }
};

// Override the real ones for the test environment
// Note: In a real project you'd use a better mocking framework, but this works for a quick check.
// We'll simulate the level up manually since the real DB/EventBus are imports.

async function testMilestones() {
    console.log("--- Weapon Random Options Test ---");

    let instance = {
        id: 'test_weapon_1',
        itemId: 'wood_sword',
        level: 1,
        exp: 0,
        randomOptions: []
    };

    // Level up to 10
    const expAt10 = equipmentManager.getTotalRequiredExp(10);
    console.log(`Setting EXP to ${expAt10} (Lv 10)...`);

    // Manually trigger addExp logic flow
    const oldLevel = instance.level;
    instance.exp = expAt10;
    const status = equipmentManager.calculateLevelFromExp(instance.exp);
    instance.level = status.level;

    if (instance.level >= 10 && oldLevel < 10) {
        await equipmentManager._unlockRandomOption(instance);
    }

    console.log("Lv 10 Options:", instance.randomOptions.map(o => o.label));
    if (instance.randomOptions.length !== 1) throw new Error("Should have 1 option at Lv 10");

    // Level up to 20
    const expAt20 = equipmentManager.getTotalRequiredExp(20);
    console.log(`Setting EXP to ${expAt20} (Lv 20)...`);

    const oldLevel2 = instance.level;
    instance.exp = expAt20;
    const status2 = equipmentManager.calculateLevelFromExp(instance.exp);
    instance.level = status2.level;

    if (instance.level >= 20 && oldLevel2 < 20) {
        await equipmentManager._unlockRandomOption(instance);
    }

    console.log("Lv 20 Options:", instance.randomOptions.map(o => o.label));
    if (instance.randomOptions.length !== 2) throw new Error("Should have 2 options at Lv 20");

    // Verify stats
    const baseItem = { itemId: 'wood_sword', stats: { atk: 5 } };
    const stats = equipmentManager.getEffectiveStats(instance, baseItem);
    console.log("Effective Stats at Lv 20:", stats);

    console.log("--- Test Passed ---");
}

testMilestones().catch(err => {
    console.error("Test Failed:", err);
    process.exit(1);
});
