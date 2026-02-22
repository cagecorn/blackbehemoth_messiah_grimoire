/**
 * BardPerkSimulation.mjs
 * Headless Node.js simulation for:
 *   고양 (Inspiration) — 5% chance to advance ally skill cooldown by 15% on buff cast
 *
 * Run: node src/BardPerkSimulation.mjs
 */

const pass = (msg) => console.log(`  ✅ PASS | ${msg}`);
const fail = (msg) => { console.error(`  ❌ FAIL | ${msg}`); process.exitCode = 1; };
const section = (title) => console.log(`\n${'='.repeat(62)}\n  TEST: ${title}\n${'='.repeat(62)}`);

// ─── Mock castBuff (mirrors Bard.castBuff perk logic exactly) ────────────────
function mockCastBuff(bard, target, forcedRoll) {
    let inspirationTriggered = false;

    if (bard.activatedPerks.includes('inspiration') && target.skill) {
        const roll = (forcedRoll !== undefined) ? forcedRoll : Math.random();
        console.log(`  [Perk] ${bard.unitName}: 고양 확률 체크... (Roll: ${roll.toFixed(2)} / Threshold: 0.05)`);
        if (roll < 0.05) {
            inspirationTriggered = true;
            const cd = target.skill.cooldown || 5000;
            const advance = cd * 0.15;
            target.skill.lastCastTime = (target.skill.lastCastTime || 0) - advance;
            console.log(`  [Perk] ${bard.unitName}: 고양 발동! ${target.unitName}의 스킬 쿨타임 15% 앞당김 (-${(advance / 1000).toFixed(2)}s)`);
        }
    }
    return { inspirationTriggered };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1: Cooldown advance math
// ─────────────────────────────────────────────────────────────────────────────
section('고양 (Inspiration) — Cooldown advance math');

(function testCooldownMath() {
    const bard = { unitName: '리라', activatedPerks: ['inspiration'] };

    // Ally with a 10s cooldown, lastCastTime set to simulate they just cast it
    // Simulate: "now" = 100000ms, skill cast at 99000ms → 1s into a 10s cooldown
    const now = 100000;
    const skill = { cooldown: 10000, lastCastTime: 99000 };
    const target = { unitName: '전사', skill };

    const timeRemainingBefore = skill.cooldown - (now - skill.lastCastTime);
    console.log(`  Before: ${timeRemainingBefore}ms remaining on cooldown`);

    mockCastBuff(bard, target, 0.02); // force proc

    const timeRemainingAfter = skill.cooldown - (now - skill.lastCastTime);
    const expectedAdvance = skill.cooldown * 0.15; // 1500ms
    const actualAdvance = timeRemainingBefore - timeRemainingAfter;

    console.log(`  After:  ${timeRemainingAfter}ms remaining on cooldown`);
    console.log(`  Advance: ${actualAdvance}ms (expected ${expectedAdvance}ms)`);

    if (Math.abs(actualAdvance - expectedAdvance) < 1) {
        pass(`Cooldown reduced by exactly 15% (${expectedAdvance}ms of ${skill.cooldown}ms)`);
    } else {
        fail(`Advance was ${actualAdvance}ms, expected ${expectedAdvance}ms`);
    }

    // Verify the cd can be made "ready" (lastCastTime pushed far enough back)
    const skillWithLongRemainder = { cooldown: 10000, lastCastTime: now - 500 }; // 500ms in
    const target2 = { unitName: '마법사', skill: skillWithLongRemainder };
    mockCastBuff(bard, target2, 0.01);
    const newElapsed = now - skillWithLongRemainder.lastCastTime;
    if (newElapsed > 500) {
        pass(`lastCastTime shifted back correctly: elapsed ${newElapsed}ms (was 500ms)`);
    } else {
        fail(`lastCastTime not shifted: elapsed ${newElapsed}ms`);
    }
})();

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2: Threshold boundary & no proc cases
// ─────────────────────────────────────────────────────────────────────────────
section('고양 — Threshold boundary & no-proc cases');

(function testBoundary() {
    const bard = { unitName: '리라', activatedPerks: ['inspiration'] };
    const makeTarget = () => ({
        unitName: '동료',
        skill: { cooldown: 8000, lastCastTime: 0 }
    });

    // Roll = 0.04 → proc (< 0.05)
    const t1 = makeTarget();
    const before1 = t1.skill.lastCastTime;
    const { inspirationTriggered: proc1 } = mockCastBuff(bard, t1, 0.04);
    if (proc1 && t1.skill.lastCastTime < before1) {
        pass(`Roll 0.04 < 0.05: proc'd, lastCastTime shifted back ✓`);
    } else {
        fail(`Roll 0.04 should proc`);
    }

    // Roll = 0.05 → no proc (not < 0.05)
    const t2 = makeTarget();
    const before2 = t2.skill.lastCastTime;
    const { inspirationTriggered: proc2 } = mockCastBuff(bard, t2, 0.05);
    if (!proc2 && t2.skill.lastCastTime === before2) {
        pass(`Roll 0.05 NOT < 0.05: no proc ✓`);
    } else {
        fail(`Roll 0.05 should NOT proc`);
    }

    // Roll = 0.99 → no proc
    const t3 = makeTarget();
    const { inspirationTriggered: proc3 } = mockCastBuff(bard, t3, 0.99);
    if (!proc3) {
        pass(`Roll 0.99: no proc ✓`);
    } else {
        fail(`Roll 0.99 should NOT proc`);
    }

    // Target with no skill → should not crash, no proc
    const targetNoSkill = { unitName: '동료', skill: null };
    const { inspirationTriggered: proc4 } = mockCastBuff(bard, targetNoSkill, 0.01);
    if (!proc4) {
        pass(`Target with no skill: handled gracefully, no proc ✓`);
    } else {
        fail(`Should not proc for skillless target`);
    }

    // No perk → should not proc even with low roll
    const bardNoPerk = { unitName: '리라', activatedPerks: [] };
    const t5 = makeTarget();
    const before5 = t5.skill.lastCastTime;
    const { inspirationTriggered: proc5 } = mockCastBuff(bardNoPerk, t5, 0.01);
    if (!proc5 && t5.skill.lastCastTime === before5) {
        pass(`No perk: no proc, no CD change ✓`);
    } else {
        fail(`No perk should mean no inspiration proc`);
    }
})();

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3: Probability check over 10,000 trials
// ─────────────────────────────────────────────────────────────────────────────
section('고양 — 5% proc rate over 10,000 trials');

(function testProcRate() {
    const bard = { unitName: '리라', activatedPerks: ['inspiration'] };
    const trials = 10000;
    let procCount = 0;

    for (let i = 0; i < trials; i++) {
        const target = { unitName: '동료', skill: { cooldown: 8000, lastCastTime: 0 } };
        const { inspirationTriggered } = mockCastBuff(bard, target);
        if (inspirationTriggered) procCount++;
    }

    const pct = (procCount / trials * 100).toFixed(1);
    console.log(`\n  고양 rate: ${procCount}/${trials} (${pct}%) — Expected ~5%`);

    if (pct >= 3.5 && pct <= 6.5) {
        pass(`Proc rate ${pct}% is within ±1.5% of target (5%)`);
    } else {
        fail(`Proc rate ${pct}% is outside expected range (3.5–6.5%)`);
    }
})();

console.log('\n' + '='.repeat(62));
console.log('  Bard perk simulation complete.');
console.log('='.repeat(62) + '\n');
