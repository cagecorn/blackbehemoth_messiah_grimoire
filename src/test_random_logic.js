
// Isolated test for random option selection and stat calculation logic

const WEAPON_OPTION_POOL = [
    { id: 'fire', type: 'element', value: 'fire', weight: 5, label: '무기 속성: 불 🔥' },
    { id: 'ice', type: 'element', value: 'ice', weight: 5, label: '무기 속성: 얼음 ❄️' },
    { id: 'lightning', type: 'element', value: 'lightning', weight: 5, label: '무기 속성: 번개 ⚡' },
    { id: 'atkMult', type: 'mult', stat: 'atkMult', min: 0.1, max: 0.4, weight: 20, label: '공격력' },
    { id: 'mAtkMult', type: 'mult', stat: 'mAtkMult', min: 0.1, max: 0.4, weight: 20, label: '마법 공격력' },
    { id: 'ultChargeSpeedMult', type: 'mult', stat: 'ultChargeSpeedMult', min: 0.01, max: 0.05, weight: 10, label: '궁극기 충전 속도' }
];

function unlockRandomOption(instance) {
    if (!instance.randomOptions) instance.randomOptions = [];

    const existingIds = instance.randomOptions.map(o => o.id);
    const availablePool = WEAPON_OPTION_POOL.filter(o => !existingIds.includes(o.id));

    if (availablePool.length === 0) return;

    const totalWeight = availablePool.reduce((sum, o) => sum + o.weight, 0);
    let random = Math.random() * totalWeight;
    let selected = availablePool[0];

    for (const opt of availablePool) {
        if (random < opt.weight) {
            selected = opt;
            break;
        }
        random -= opt.weight;
    }

    let finalOpt = { ...selected };
    if (selected.type === 'mult') {
        const val = selected.min + Math.random() * (selected.max - selected.min);
        finalOpt.value = parseFloat(val.toFixed(3));
    }

    instance.randomOptions.push(finalOpt);
}

function getEffectiveStats(instance, baseStats) {
    const stats = { ...baseStats };
    if (instance.randomOptions) {
        instance.randomOptions.forEach(opt => {
            if (opt.type === 'mult') {
                stats[opt.stat] = (stats[opt.stat] || 0) + opt.value;
            }
        });
    }
    return stats;
}

// SIMULATION
console.log("--- Weapon Random Option Simulation ---");
const weapon = { level: 1, randomOptions: [] };
const baseStats = { atk: 5 };

for (let i = 1; i <= 5; i++) {
    unlockRandomOption(weapon);
    const last = weapon.randomOptions[weapon.randomOptions.length - 1];
    console.log(`Lv.${i * 10} Unlock: ${last.label} (${last.value || last.value === 0 ? last.value : 'Element'})`);
}

console.log("\nFinal Options:", weapon.randomOptions.map(o => o.id));
const finalStats = getEffectiveStats(weapon, baseStats);
console.log("Final Effective Stats (Base + Mults):", finalStats);

if (weapon.randomOptions.length === 5) {
    console.log("\n--- Logic Test PASSED ---");
} else {
    console.error("--- Logic Test FAILED ---");
}
