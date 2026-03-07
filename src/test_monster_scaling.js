import { MonsterClasses, scaleStats, MONSTER_SCALING } from './modules/Core/EntityStats.js';

console.log('--- Monster Scaling Verification ---');

const testCases = [
    { id: 'GOBLIN', level: 1, type: 'NORMAL' },
    { id: 'GOBLIN', level: 10, type: 'NORMAL' },
    { id: 'GOBLIN', level: 10, type: 'ELITE' },
    { id: 'BOSS_GOBLIN', level: 1, type: 'RAID' }
];

testCases.forEach(tc => {
    const baseConfig = MonsterClasses[tc.id];
    const scaled = scaleStats(baseConfig, tc.level, tc.type);

    console.log(`\n[Test] ${tc.id} Lv.${tc.level} (${tc.type})`);

    // Check for presence of all 20 stats
    const requiredStats = [
        'hp', 'maxHp', 'atk', 'mAtk', 'def', 'mDef',
        'speed', 'atkSpd', 'atkRange', 'rangeMin', 'rangeMax', 'castSpd',
        'acc', 'eva', 'crit', 'ultChargeSpeed',
        'fireRes', 'iceRes', 'lightningRes', 'level'
    ];

    let missing = [];
    requiredStats.forEach(stat => {
        if (scaled[stat] === undefined) missing.push(stat);
    });

    if (missing.length > 0) {
        console.error(`❌ Missing Stats: ${missing.join(', ')}`);
    } else {
        console.log(`✅ All 20 stats present.`);
    }

    // Verify Scaling logic
    if (tc.type === 'ELITE') {
        const normal = scaleStats(baseConfig, tc.level, 'NORMAL');
        const hpRatio = scaled.maxHp / normal.maxHp;
        const atkRatio = scaled.atk / normal.atk;
        console.log(`- Elite HP Multiplier: ${hpRatio.toFixed(2)}x (Expected ~2.5x)`);
        console.log(`- Elite ATK Multiplier: ${atkRatio.toFixed(2)}x (Expected ~1.5x)`);
    }

    if (tc.type === 'RAID') {
        const hpRatio = scaled.maxHp / baseConfig.maxHp;
        console.log(`- Raid HP Multiplier: ${hpRatio.toFixed(2)}x (Expected ~50x)`);
    }
});

console.log('\n--- Script Completed ---');
