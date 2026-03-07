
function getEffectiveStats(instance, baseItem) {
    if (!instance || !baseItem) return {};
    const stats = { ...baseItem.stats };
    if (instance.itemId === 'wood_armor') {
        const levelBonus = 1 + (0.25 * (instance.level - 1));
        stats.def = Math.round(5 * levelBonus);
        stats.mDef = Math.round(2 * levelBonus);
    }
    return stats;
}

const baseItem = { stats: { def: 5, mDef: 2 } };
console.log("Wood Armor Stats (Math.round):");
console.log("| Level | Bonus | Def | mDef |");
console.log("| :--- | :--- | :--- | :--- |");
for (let lvl = 1; lvl <= 10; lvl++) {
    const inst = { itemId: 'wood_armor', level: lvl };
    const levelBonus = 1 + (0.25 * (lvl - 1));
    const result = getEffectiveStats(inst, baseItem);
    console.log(`| ${lvl} | ${levelBonus.toFixed(2)} | ${result.def} | ${result.mDef} |`);
}
