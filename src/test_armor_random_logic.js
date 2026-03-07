
import EquipmentManager from './modules/Core/EquipmentManager.js';

// Mock DBManager and EventBus
const mockDB = {
    saveEquipmentInstance: (inst) => {
        // console.log(`[MockDB] Saved instance ${inst.id}`);
        return Promise.resolve();
    }
};

const EM = new EquipmentManager();
EM.dbManager = mockDB;

async function testArmorOptions() {
    console.log("--- Testing Armor Random Options ---");

    const armorInstance = {
        id: 'eq_armor_test_1',
        itemId: 'WOOD_ARMOR',
        slot: 'armor',
        level: 1,
        exp: 0,
        randomOptions: []
    };

    // Simulate leveling up to 50
    const milestones = [10, 20, 30, 40, 50];
    for (let lv of milestones) {
        armorInstance.level = lv;
        await EM._unlockRandomOption(armorInstance);
        console.log(`Lv.${lv} unlocked: ${armorInstance.randomOptions[armorInstance.randomOptions.length - 1].label}`);
    }

    console.log("\nFinal Options:", armorInstance.randomOptions.map(o => o.label).join(", "));

    if (armorInstance.randomOptions.length === 5) {
        console.log("✅ Successfully unlocked 5 unique options.");
    } else {
        console.error("❌ Failed to unlock 5 unique options.");
    }

    // Check stats
    const stats = EM.getEffectiveStats(armorInstance, { stats: { def: 10 } });
    console.log("Effective Stats:", JSON.stringify(stats, null, 2));

    const display = EM.getDisplayInfo(armorInstance);
    console.log("Display Info Stats:", JSON.stringify(display.stats, null, 2));
}

testArmorOptions().catch(console.error);
