
const MercenaryClasses = {
    WARRIOR: { growth: { maxHp: 20, atk: 3, mAtk: 1, def: 2, mDef: 1.2, acc: 0.5, eva: 0.5 } },
    ARCHER: { growth: { maxHp: 10, atk: 3, mAtk: 1, def: 1, mDef: 1, acc: 2, eva: 2, atkSpd: -5 } },
    HEALER: { growth: { maxHp: 10, atk: 1, mAtk: 4, def: 1, mDef: 2.5, acc: 1, eva: 1 } },
    WIZARD: { growth: { maxHp: 10, atk: 1, mAtk: 5, def: 1, mDef: 2, acc: 2, eva: 1 } },
    BARD: { growth: { maxHp: 15, atk: 1.8, mAtk: 1.8, def: 1.8, mDef: 1.8, acc: 1, eva: 1 } },
    BOON: { growth: { maxHp: 18, atk: 1.5, mAtk: 4, def: 1.5, mDef: 3, acc: 1, eva: 1 } }
};

function simulateLevelUp(classKey, currentStats) {
    const growth = MercenaryClasses[classKey].growth;
    const multi = 1.0; // Assume 1 star for simplicity

    const newStats = { ...currentStats };
    for (const stat in growth) {
        if (stat === 'maxHp') {
            newStats.maxHp += Math.floor(growth.maxHp * multi);
        } else {
            newStats[stat] = (newStats[stat] || 0) + (growth[stat] * multi);
        }
    }
    return newStats;
}

const base = { maxHp: 100, atk: 10, mAtk: 10, def: 10, mDef: 10 };

console.log("Class | Stat Growth (after 10 levels)");
console.log("--------------------------------------");
for (const key in MercenaryClasses) {
    let stats = { ...base };
    for (let i = 0; i < 10; i++) {
        stats = simulateLevelUp(key, stats);
    }
    console.log(`${key.padEnd(8)} | HP: ${stats.maxHp} | Atk: ${stats.atk.toFixed(1)} | mAtk: ${stats.mAtk.toFixed(1)} | Def: ${stats.def.toFixed(1)} | mDef: ${stats.mDef.toFixed(1)}`);
}
