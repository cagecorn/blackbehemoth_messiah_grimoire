/**
 * HealerPerkSimulation.mjs
 * Headless Node.js simulation for:
 *   1. 구원의 손길 (Salvation) — +30% heal bonus on ally HP ≤ 25%
 *   2. 정화 (Purify)          — 5% chance to cleanse 1 debuff on basic heal
 *
 * Run: node src/HealerPerkSimulation.mjs
 */

const pass = (msg) => console.log(`  ✅ PASS | ${msg}`);
const fail = (msg) => { console.error(`  ❌ FAIL | ${msg}`); process.exitCode = 1; };
const section = (title) => console.log(`\n${'='.repeat(62)}\n  TEST: ${title}\n${'='.repeat(62)}`);

// ─── Mock castHeal (mirrors HealerActions.castHeal logic exactly) ────────────
function mockCastHeal(unit, target) {
    const mAtk = unit.mAtk;
    let healAmount = mAtk * 1.5;

    // Perk: 구원의 손길 (Salvation)
    let salvationTriggered = false;
    if (unit.activatedPerks.includes('salvation')) {
        if (target.hp / target.maxHp <= 0.25) {
            healAmount *= 1.3;
            salvationTriggered = true;
            console.log(`  [Perk] ${unit.unitName}: 구원의 손길 발동! 회복량 30% 증가 (대상 HP: ${Math.round(target.hp / target.maxHp * 100)}%) → ${healAmount.toFixed(1)}`);
        }
    }

    target.hp = Math.min(target.maxHp, target.hp + healAmount);

    // Perk: 정화 (Purify)
    let purifyTriggered = false;
    if (unit.activatedPerks.includes('purify')) {
        const roll = unit._forcedRoll !== undefined ? unit._forcedRoll : Math.random();
        console.log(`  [Perk] ${unit.unitName}: 정화 확률 체크... (Roll: ${roll.toFixed(2)} / Threshold: 0.05)`);
        if (roll < 0.05) {
            purifyTriggered = true;
            if (target.statusEffects && target.statusEffects.length > 0) {
                const removed = target.statusEffects.shift();
                console.log(`  [Perk] ${unit.unitName}: 정화 발동! ${target.unitName}의 '${removed.name || removed}' 해제`);
            } else {
                console.log(`  [Perk] ${unit.unitName}: 정화 발동! (해제할 디버프 없음)`);
            }
        }
    }

    return { healAmount, salvationTriggered, purifyTriggered };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1: 구원의 손길 (Salvation)
// ─────────────────────────────────────────────────────────────────────────────
section('구원의 손길 (Salvation) — +30% heal when ally HP ≤ 25%');

(function testSalvation() {
    const healer = { unitName: '이졸데', mAtk: 20, activatedPerks: ['salvation'] };
    const baseHeal = healer.mAtk * 1.5; // = 30

    const testCases = [
        { label: 'Target at 100% HP (100/100)', hp: 100, maxHp: 100, expectBonus: false },
        { label: 'Target at 26% HP (just above threshold)', hp: 26, maxHp: 100, expectBonus: false },
        { label: 'Target at 25% HP (boundary ≤ 0.25)', hp: 25, maxHp: 100, expectBonus: true },
        { label: 'Target at 10% HP', hp: 10, maxHp: 100, expectBonus: true },
        { label: 'Target at 1% HP', hp: 1, maxHp: 100, expectBonus: true },
    ];

    for (const tc of testCases) {
        const target = { unitName: '동료', hp: tc.hp, maxHp: tc.maxHp, statusEffects: [] };
        const { healAmount, salvationTriggered } = mockCastHeal(healer, target);
        const expectedHeal = tc.expectBonus ? baseHeal * 1.3 : baseHeal;

        if (Math.abs(healAmount - expectedHeal) < 0.01 && salvationTriggered === tc.expectBonus) {
            pass(`${tc.label} → heal=${healAmount.toFixed(1)} (expected ${expectedHeal.toFixed(1)})`);
        } else {
            fail(`${tc.label} → heal=${healAmount.toFixed(1)}, bonus=${salvationTriggered} (expected bonus=${tc.expectBonus})`);
        }
    }

    // Verify no bonus without perk
    const healerNoPerk = { unitName: '이졸데', mAtk: 20, activatedPerks: [] };
    const targetLow = { unitName: '동료', hp: 10, maxHp: 100, statusEffects: [] };
    const { healAmount: noBonus } = mockCastHeal(healerNoPerk, targetLow);
    if (Math.abs(noBonus - baseHeal) < 0.01) {
        pass(`No perk → base heal (${noBonus.toFixed(1)}) — no bonus applied`);
    } else {
        fail(`No perk bonus check failed: got ${noBonus.toFixed(1)}`);
    }
})();

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2: 정화 (Purify)
// ─────────────────────────────────────────────────────────────────────────────
section('정화 (Purify) — 5% cleanse chance on basic heal');

(function testPurify() {
    const healer = { unitName: '이졸데', mAtk: 20, activatedPerks: ['purify'] };

    // --- 2a: Force roll below threshold → cleanse proc
    const targetWithDebuff = {
        unitName: '동료', hp: 80, maxHp: 100,
        statusEffects: [{ name: '독 (Poison)' }, { name: '화상 (Burn)' }]
    };
    healer._forcedRoll = 0.03; // below 0.05 → proc
    const { purifyTriggered } = mockCastHeal(healer, targetWithDebuff);

    if (purifyTriggered) {
        pass(`Roll 0.03 < 0.05: Purify proc'd ✓`);
    } else {
        fail(`Roll 0.03 should trigger Purify`);
    }
    if (targetWithDebuff.statusEffects.length === 1) {
        pass(`1 debuff removed, 1 remaining (was 2)`);
    } else {
        fail(`Expected 1 remaining debuff, got ${targetWithDebuff.statusEffects.length}`);
    }

    // --- 2b: Roll above threshold → no cleanse
    const targetWithDebuff2 = {
        unitName: '동료', hp: 80, maxHp: 100,
        statusEffects: [{ name: '기절 (Stun)' }]
    };
    healer._forcedRoll = 0.10; // above 0.05
    const { purifyTriggered: notProc } = mockCastHeal(healer, targetWithDebuff2);

    if (!notProc) {
        pass(`Roll 0.10 >= 0.05: Purify NOT triggered ✓`);
    } else {
        fail(`Roll 0.10 should NOT trigger Purify`);
    }
    if (targetWithDebuff2.statusEffects.length === 1) {
        pass(`Debuff list unchanged (still 1 debuff)`);
    } else {
        fail(`Debuff list should be unchanged`);
    }

    // --- 2c: Proc with no debuffs (graceful handling)
    const targetNone = { unitName: '동료', hp: 80, maxHp: 100, statusEffects: [] };
    healer._forcedRoll = 0.01; // proc
    const { purifyTriggered: procNone } = mockCastHeal(healer, targetNone);
    if (procNone) {
        pass(`Proc with 0 debuffs: handled gracefully (no crash)`);
    } else {
        fail(`Should still proc even with no debuffs`);
    }

    // --- 2d: Probability check over 10,000 trials
    delete healer._forcedRoll;
    const trials = 10000;
    let procCount = 0;
    const dummyTarget = { unitName: '동료', hp: 80, maxHp: 100, statusEffects: [] };
    for (let i = 0; i < trials; i++) {
        const { purifyTriggered: t } = mockCastHeal(healer, dummyTarget);
        if (t) procCount++;
    }
    const pct = (procCount / trials * 100).toFixed(1);
    console.log(`\n  Purify rate: ${procCount}/${trials} (${pct}%) — Expected ~5%`);
    if (pct >= 3.5 && pct <= 6.5) {
        pass(`Proc rate ${pct}% is within ±1.5% of target (5%)`);
    } else {
        fail(`Proc rate ${pct}% is outside expected range (3.5–6.5%)`);
    }
})();

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3: Both perks active simultaneously
// ─────────────────────────────────────────────────────────────────────────────
section('Both perks active simultaneously');

(function testBothPerks() {
    const healer = { unitName: '이졸데', mAtk: 20, activatedPerks: ['salvation', 'purify'], _forcedRoll: 0.02 };
    const target = { unitName: '동료', hp: 20, maxHp: 100, statusEffects: [{ name: '독' }] };

    const baseHeal = healer.mAtk * 1.5;
    const expectedHeal = baseHeal * 1.3; // 25% HP → bonus applies

    const { healAmount, salvationTriggered, purifyTriggered } = mockCastHeal(healer, target);

    if (Math.abs(healAmount - expectedHeal) < 0.01) {
        pass(`Heal amount correct with both perks: ${healAmount.toFixed(1)}`);
    } else {
        fail(`Heal amount wrong: got ${healAmount.toFixed(1)}, expected ${expectedHeal.toFixed(1)}`);
    }
    if (salvationTriggered) pass(`구원의 손길 triggered simultaneously ✓`);
    else fail(`구원의 손길 should trigger`);
    if (purifyTriggered) pass(`정화 triggered simultaneously ✓`);
    else fail(`정화 should trigger`);
    if (target.statusEffects.length === 0) pass(`Debuff cleared correctly`);
    else fail(`Debuff should have been cleared`);
})();

console.log('\n' + '='.repeat(62));
console.log('  Healer perk simulation complete.');
console.log('='.repeat(62) + '\n');
