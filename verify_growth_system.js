
/**
 * verify_growth_system.js (v2)
 * 
 * Comprehensive test to verify:
 * 1. Equipment Leveling (EXP -> Level)
 * 2. Stat Growth (Wood base items)
 * 3. Random Option Unlocking milestones
 * 4. Correct Pool selection (Weapon vs Armor)
 * 5. Auto-correction for bugged items
 */

// --- Production Logic Simulation ---

const WEAPON_OPTION_POOL = [
    { id: 'atk_mult', label: '물리 공격력 %', type: 'mult', stat: 'atkMult', min: 0.1, max: 0.4 },
    { id: 'mAtk_mult', label: '마법 공격력 %', type: 'mult', stat: 'mAtkMult', min: 0.1, max: 0.4 },
    { id: 'atkSpd_mult', label: '공격 속도 %', type: 'mult', stat: 'atkSpdMult', min: 0.05, max: 0.3 },
    { id: 'castSpd_mult', label: '시전 속도 %', type: 'mult', stat: 'castSpdMult', min: 0.05, max: 0.3 }
];

const ARMOR_OPTION_POOL = [
    { id: 'hp_mult', label: '최대 체력 %', type: 'mult', stat: 'maxHpMult', min: 0.1, max: 0.4 },
    { id: 'def_mult', label: '방어력 %', type: 'mult', stat: 'defMult', min: 0.1, max: 0.4 },
    { id: 'fire_res', label: '불 저항력', type: 'add', stat: 'fireRes', min: 10, max: 30 },
    { id: 'ice_res', label: '얼음 저항력', type: 'add', stat: 'iceRes', min: 10, max: 30 }
];

function getRequiredExpForLevel(level) {
    if (level <= 1) return 0;
    return Math.floor(25000 * Math.pow(1.3, level - 1));
}

function calculateLevelFromExp(exp) {
    let level = 1;
    let remainingExp = exp;
    while (true) {
        const req = getRequiredExpForLevel(level + 1);
        if (remainingExp >= req) {
            remainingExp -= req;
            level++;
            if (level >= 50) break;
        } else {
            break;
        }
    }
    return level;
}

function getEffectiveStats(instance) {
    const baseStats = {
        'wood_sword': { atk: 5 },
        'wood_armor': { def: 5, mDef: 2 },
        'wood_wand': { mAtk: 5 }
    }[instance.itemId] || {};

    let stats = { ...baseStats };
    const L = instance.level;
    const bonus = 1 + (0.25 * (L - 1));

    if (instance.itemId === 'wood_sword') {
        stats.atk = Math.round(5 * bonus);
    } else if (instance.itemId === 'wood_armor') {
        stats.def = Math.round(5 * bonus);
        stats.mDef = Math.round(2 * bonus);
    } else if (instance.itemId === 'wood_wand') {
        stats.mAtk = Math.round(5 * bonus);
    }

    // Apply Random Options
    if (instance.randomOptions) {
        instance.randomOptions.forEach(opt => {
            stats[opt.stat] = (stats[opt.stat] || 0) + opt.value;
        });
    }

    return stats;
}

function unlockRandomOption(instance) {
    const slot = instance.slot;
    const pool = (slot === 'armor') ? ARMOR_OPTION_POOL : WEAPON_OPTION_POOL;

    const available = pool.filter(o => !instance.randomOptions.some(eo => eo.id === o.id));
    if (available.length === 0) return;

    // Use deterministic selection for testing (wrap around)
    const selected = available[instance.randomOptions.length % available.length];

    let finalOpt = { ...selected };
    // Simulated randomization logic
    const val = selected.min + 0.5 * (selected.max - selected.min); // Mid-range for test
    if (selected.type === 'mult') {
        finalOpt.value = parseFloat(val.toFixed(3));
    } else if (selected.type === 'add') {
        finalOpt.value = Math.floor(val);
    }
    instance.randomOptions.push(finalOpt);
}

function validateAndFixOptions(instance) {
    const slot = (instance.itemId === 'wood_armor') ? 'armor' : 'weapon';
    const correctPool = (slot === 'armor') ? ARMOR_OPTION_POOL : WEAPON_OPTION_POOL;
    const correctIds = correctPool.map(o => o.id);

    let modified = false;
    instance.randomOptions = instance.randomOptions.map(opt => {
        const isCorrupted = (opt.type === 'mult' || opt.type === 'add') && (opt.value === undefined || opt.value === null || isNaN(opt.value));
        if (!correctIds.includes(opt.id) || isCorrupted) {
            modified = true;
            const available = correctPool.filter(o => !instance.randomOptions.some(eo => eo.id === o.id));
            const selected = available[0];
            let fixed = { ...selected };
            fixed.value = (selected.type === 'mult') ? 0.2 : 15;
            return fixed;
        }
        return opt;
    });
    return modified;
}

// --- Test Implementation ---

function runTest(itemId, slot) {
    console.log(`\n=============================================`);
    console.log(`TESTING: ${itemId} (${slot.toUpperCase()})`);
    console.log(`=============================================`);

    let instance = { itemId, slot, level: 1, exp: 0, randomOptions: [] };

    const milestones = [1, 10, 20, 30, 40, 50];

    milestones.forEach(targetLv => {
        // Fast-forward to level
        if (targetLv > 1) {
            for (let l = instance.level; l < targetLv; l++) {
                const req = getRequiredExpForLevel(l + 1);
                instance.exp += req;
                const oldLevel = instance.level;
                instance.level = calculateLevelFromExp(instance.exp);

                // Check milestones
                if (instance.level > oldLevel) {
                    [10, 20, 30, 40, 50].forEach(m => {
                        if (oldLevel < m && instance.level >= m) {
                            unlockRandomOption(instance);
                        }
                    });
                }
            }
        }

        const stats = getEffectiveStats(instance);
        console.log(`LV ${instance.level.toString().padEnd(2)} | EXP: ${instance.exp.toLocaleString().padStart(12)} | Stats: ${JSON.stringify(stats)}`);
    });

    // Verification
    if (instance.randomOptions.length !== 5) {
        console.error(`FAILURE: Expected 5 options at LV 50, got ${instance.randomOptions.length}`);
    } else {
        console.log(`SUCCESS: 5 Options unlocked.`);
    }

    const pool = (slot === 'armor') ? ARMOR_OPTION_POOL : WEAPON_OPTION_POOL;
    instance.randomOptions.forEach((opt, i) => {
        const inPool = pool.some(p => p.id === opt.id);
        if (!inPool) console.error(`FAILURE: Option '${opt.id}' not in ${slot} pool!`);
        console.log(`   - Option ${i + 1}: ${opt.label} (${opt.id}) -> +${opt.value}${opt.type === 'mult' ? '%' : ''}`);
    });
}

runTest('wood_sword', 'weapon');
runTest('wood_armor', 'armor');

// Bugged Item Fix Test
console.log(`\n=============================================`);
console.log(`TESTING: CORRECTION LOGIC (Bugged Wood Armor)`);
console.log(`=============================================`);

let bugged = {
    itemId: 'wood_armor',
    slot: 'armor',
    level: 10,
    randomOptions: [
        { id: 'atk_mult', stat: 'atkMult', type: 'mult', value: 0.4 } // WRONG: Weapon option on Armor
    ]
};

console.log(`Before Fix: ${JSON.stringify(bugged.randomOptions)}`);
const modified = validateAndFixOptions(bugged);
console.log(`Modified: ${modified}`);
console.log(`After Fix:  ${JSON.stringify(bugged.randomOptions)}`);

if (bugged.randomOptions[0].id.includes('hp') || bugged.randomOptions[0].id.includes('def') || bugged.randomOptions[0].id.includes('res')) {
    console.log("SUCCESS: Armor corrected to correct option pool.");
} else {
    console.error("FAILURE: Correction failed!");
}
