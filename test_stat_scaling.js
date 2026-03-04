/**
 * test_stat_scaling.js
 * Headless test to verify mercenary stat scaling.
 */
import { MercenaryClasses, Characters } from './src/modules/Core/EntityStats.js';

// Mock leveling logic from Mercenary.js (now using growth rates)
function simulateLevelUp(stats, growth, levelFrom, levelTo) {
    const currentStats = { ...stats };
    const history = [];

    for (let lv = levelFrom; lv < levelTo; lv++) {
        // Star multiplier awareness (Option C harmonization)
        const multi = stats.starMultiplier || 1.0;

        // From Mercenary.js:levelUp()
        if (growth.maxHp) currentStats.maxHp += Math.floor(growth.maxHp * multi);
        currentStats.hp = currentStats.maxHp;
        if (growth.atk) currentStats.atk += growth.atk * multi;
        if (growth.mAtk) currentStats.mAtk += growth.mAtk * multi;
        if (growth.def) currentStats.def += growth.def * multi;
        if (growth.mDef) currentStats.mDef += growth.mDef * multi;
        if (growth.acc) currentStats.acc += growth.acc * multi;
        if (growth.eva) currentStats.eva += growth.eva * multi;
        if (growth.crit) currentStats.crit += growth.crit * multi;

        if ((lv + 1) % 10 === 0 || lv + 1 === levelTo) {
            history.push({
                level: lv + 1,
                hp: currentStats.maxHp,
                atk: currentStats.atk,
                mAtk: currentStats.mAtk,
                def: currentStats.def,
                mDef: currentStats.mDef,
                acc: currentStats.acc,
                eva: currentStats.eva,
                crit: currentStats.crit
            });
        }
    }
    return history;
}

console.log('=== Mercenary Stat Scaling Verification (Current Implementation) ===\n');

const testUnits = [
    { name: 'Aren (Warrior)', char: Characters.AREN, base: MercenaryClasses.WARRIOR },
    { name: 'Ella (Archer)', char: Characters.ELLA, base: MercenaryClasses.ARCHER },
    { name: 'Sera (Healer)', char: Characters.SERA, base: MercenaryClasses.HEALER },
    { name: 'Merlin (Wizard)', char: Characters.MERLIN, base: MercenaryClasses.WIZARD },
    { name: 'Boon (Paladin)', char: Characters.BOON, base: MercenaryClasses.WARRIOR }
];

testUnits.forEach(unit => {
    // Initial stats use scaleStats logic
    const starLevel = unit.name.includes('Boon') ? 3 : 1; // Example: Boon as 3-star
    const bonusStars = starLevel - 1;
    const starMultiplier = Math.pow(1.2, bonusStars);

    const initialStats = {
        maxHp: Math.floor((unit.base.maxHp || 100) * starMultiplier),
        atk: (unit.base.atk || 0) + (unit.char.atk || 0),
        mAtk: (unit.base.mAtk || 0) + (unit.char.mAtk || 0),
        def: (unit.base.def || 0) + (unit.char.def || 0),
        mDef: (unit.base.mDef || 0) + (unit.char.mDef || 0),
        acc: (unit.base.acc || 0) + (unit.char.acc || 0),
        eva: (unit.base.eva || 0) + (unit.char.eva || 0),
        crit: (unit.base.crit || 0) + (unit.char.crit || 0),
        starMultiplier: starMultiplier,
        level: 1
    };

    // Apply scaleStats star-scaling to base combat stats
    initialStats.atk = Math.floor(initialStats.atk * starMultiplier);
    initialStats.mAtk = Math.floor(initialStats.mAtk * starMultiplier);
    initialStats.def = Math.floor(initialStats.def * starMultiplier);
    initialStats.mDef = Math.floor(initialStats.mDef * starMultiplier);

    // [Option C] Utility additions
    if (bonusStars > 0) {
        initialStats.crit += bonusStars * 2;
        initialStats.acc += bonusStars * 5;
        initialStats.eva += bonusStars * 3;
    }

    // Growth combines Class Growth + Character Override Growth (if any)
    const growth = { ...(unit.base.growth || {}), ...(unit.char.growth || {}) };

    console.log(`[Unit: ${unit.name} | Star: ${starLevel}]`);
    console.log(`Base (Lv 1): HP: ${initialStats.maxHp}, ATK: ${initialStats.atk}, mATK: ${initialStats.mAtk}, DEF: ${initialStats.def}, Crit: ${initialStats.crit}%, Acc: ${initialStats.acc}, Eva: ${initialStats.eva}`);

    const scaling = simulateLevelUp(initialStats, growth, 1, 40);

    scaling.forEach(s => {
        console.log(`Lv ${s.level}: HP: ${s.hp}, ATK: ${s.atk.toFixed(1)}, mATK: ${s.mAtk.toFixed(1)}, DEF: ${s.def.toFixed(1)}, Acc: ${s.acc.toFixed(1)}, Crit: ${s.crit.toFixed(1)}%`);
    });

    // Check for anomalies
    if (unit.name.includes('Wizard') && scaling[scaling.length - 1].mAtk <= scaling[scaling.length - 1].atk) {
        console.warn(`!! ANOMALY DETECTED: Wizard mATK should be much higher than ATK!`);
    } else if (unit.name.includes('Boon') && scaling[scaling.length - 1].mAtk < scaling[scaling.length - 1].atk) {
        console.warn(`!! ANOMALY DETECTED: Boon (Paladin) should have higher mATK scaling than ATK!`);
    }

    console.log('--------------------------------------------------\n');
});
