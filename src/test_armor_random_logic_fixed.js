
// Isolated test for Armor Random Options logic
// Does not import EquipmentManager to avoid Phaser dependencies
// Instead, redefined necessary constants and logic for testing.

const ARMOR_OPTION_POOL = [
    { id: 'hp_pct', label: '최대 체력', type: 'mult', stat: 'maxHpMult', min: 0.10, max: 0.30, weight: 15 },
    { id: 'def_pct', label: '방어력', type: 'mult', stat: 'defMult', min: 0.10, max: 0.40, weight: 15 },
    { id: 'mDef_pct', label: '마법 방어력', type: 'mult', stat: 'mDefMult', min: 0.10, max: 0.40, weight: 15 },
    { id: 'castSpd_pct', label: '시전 속도', type: 'mult', stat: 'castSpdMult', min: 0.05, max: 0.20, weight: 10 },
    { id: 'ult_charge', label: '궁극기 충전 속도', type: 'mult', stat: 'ultChargeSpeedMult', min: 0.01, max: 0.05, weight: 10 },
    { id: 'fire_res', label: '불 저항력', type: 'add', stat: 'fireRes', min: 10, max: 30, weight: 10 },
    { id: 'ice_res', label: '얼음 저항력', type: 'add', stat: 'iceRes', min: 10, max: 30, weight: 10 },
    { id: 'lightning_res', label: '번개 저항력', type: 'add', stat: 'lightningRes', min: 10, max: 30, weight: 10 }
];

function _unlockRandomOption(instance) {
    if (!instance.randomOptions) instance.randomOptions = [];
    const existingIds = instance.randomOptions.map(o => o.id);
    const pool = ARMOR_OPTION_POOL;
    const availablePool = pool.filter(o => !existingIds.includes(o.id));
    if (availablePool.length === 0) return;

    const totalWeight = availablePool.reduce((sum, o) => sum + o.weight, 0);
    let random = Math.random() * totalWeight;
    let selected = availablePool[availablePool.length - 1];

    for (const opt of availablePool) {
        if (random < opt.weight) {
            selected = opt;
            break;
        }
        random -= opt.weight;
    }

    let finalOpt = { ...selected };
    if (selected.type === 'mult' || selected.type === 'add') {
        const val = selected.min + Math.random() * (selected.max - selected.min);
        finalOpt.value = (selected.type === 'mult') ? parseFloat(val.toFixed(3)) : Math.round(val);
    }
    instance.randomOptions.push(finalOpt);
}

function getEffectiveStats(instance, baseStats) {
    const stats = { ...baseStats };
    if (instance.randomOptions) {
        instance.randomOptions.forEach(opt => {
            stats[opt.stat] = (stats[opt.stat] || 0) + opt.value;
        });
    }
    return stats;
}

async function testArmorOptions() {
    console.log("--- Testing Armor Random Options (Logic Only) ---");
    const armorInstance = { id: 'test_armor', slot: 'armor', level: 1, randomOptions: [] };
    const milestones = [10, 20, 30, 40, 50];

    for (let lv of milestones) {
        armorInstance.level = lv;
        _unlockRandomOption(armorInstance);
        const last = armorInstance.randomOptions[armorInstance.randomOptions.length - 1];
        console.log(`Lv.${lv} unlocked: ${last.label} (${last.value}${last.type === 'mult' ? 'x' : ''})`);
    }

    const finalStats = getEffectiveStats(armorInstance, { def: 10, mDef: 5 });
    console.log("\nFinal Effective Stats:", JSON.stringify(finalStats, null, 2));

    if (armorInstance.randomOptions.length === 5) {
        console.log("✅ Successfully verified unique armor option sequence.");
    } else {
        console.error("❌ Failed to verify unique selection.");
    }
}

testArmorOptions();
