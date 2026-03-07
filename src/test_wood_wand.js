
import equipmentManager from './modules/Core/EquipmentManager.js';
import ItemManager from './modules/Core/ItemManager.js';
import DBManager from './modules/Database/DBManager.js';

async function testWoodWand() {
    console.log('--- Wood Wand Verification ---');

    // 1. Check Item Definition
    const item = ItemManager.getItem('wood_wand');
    if (item) {
        console.log('✅ Wood Wand item definition found.');
        console.log(`- Base mAtk: ${item.stats.mAtk}`);
    } else {
        console.error('❌ Wood Wand item definition NOT found.');
        return;
    }

    // 2. Simulate Crafting (Pseudo-test for logic)
    // We can't easily test the actual craftItem because it depends on IDB and materials
    console.log('\n[Testing Stat Growth]');

    const mockInstance = {
        itemId: 'wood_wand',
        level: 1,
        exp: 0,
        randomOptions: []
    };

    const statsLv1 = equipmentManager.getEffectiveStats(mockInstance, item);
    console.log(`- Level 1 mAtk: ${statsLv1.mAtk} (Expected: 5)`);

    mockInstance.level = 2;
    const statsLv2 = equipmentManager.getEffectiveStats(mockInstance, item);
    console.log(`- Level 2 mAtk: ${statsLv2.mAtk} (Expected: 6)`); // 5 * 1.25 = 6.25 -> 6

    mockInstance.level = 10;
    const statsLv10 = equipmentManager.getEffectiveStats(mockInstance, item);
    console.log(`- Level 10 mAtk: ${statsLv10.mAtk} (Expected: 16)`); // 5 * (1 + 0.25*9) = 16.25 -> 16

    // 3. Check Option Pool consistency
    console.log('\n[Testing Option Pool]');
    if (equipmentManager.constructor.WEAPON_OPTION_POOL.some(o => o.id === 'mAtkMult')) {
        console.log('✅ Weapon option pool contains mAtkMult.');
    } else {
        console.error('❌ Weapon option pool missing mAtkMult!');
    }

    console.log('\n--- Script Completed ---');
}

testWoodWand();
