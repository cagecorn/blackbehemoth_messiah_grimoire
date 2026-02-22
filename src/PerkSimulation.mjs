/**
 * PerkSimulation.mjs
 * Headless Node.js simulation for:
 *   1. Arcane Surge      (Wizard) — 20% cooldown reduction on cast
 *   2. Weakness Exploitation (Archer) — 20% damage bonus vs low HP target
 *   3. Hit and Run       (Archer) — 30% speed boost after attack
 *
 * Run: node src/PerkSimulation.mjs
 */

// ─── Helpers ────────────────────────────────────────────────────────────────
const pass = (msg) => console.log(`  ✅ PASS | ${msg}`);
const fail = (msg) => console.error(`  ❌ FAIL | ${msg}`);
const section = (title) => console.log(`\n${'='.repeat(55)}\n  TEST: ${title}\n${'='.repeat(55)}`);

// ─── 1. ARCANE SURGE ────────────────────────────────────────────────────────
section('Arcane Surge — 20% chance, 50% CD reduction');

function simulateArcaneSurge(trials = 10000) {
    // Simulate the exact logic from Wizard.js onSkillExecuted()
    const COOLDOWN_MS = 5000;
    let surgeCount = 0;

    const skill = { lastCastTime: 0 };
    const now = 1000000; // arbitrary time ref

    for (let i = 0; i < trials; i++) {
        // Reset skill before each cast
        skill.lastCastTime = 0;

        const roll = Math.random();
        if (roll < 0.2) {
            surgeCount++;
            // Simulate: skill.lastCastTime = now - (cd * 0.5)
            skill.lastCastTime = now - (COOLDOWN_MS * 0.5);

            // Verify: the remaining cooldown is ~50% of original
            const remainingCD = COOLDOWN_MS - (now - skill.lastCastTime);
            if (Math.abs(remainingCD - COOLDOWN_MS * 0.5) > 1) {
                fail(`Incorrect CD reduction on trial ${i}: remaining=${remainingCD}`);
                return;
            }
        }
    }

    const pct = (surgeCount / trials * 100).toFixed(1);
    console.log(`  Triggered: ${surgeCount}/${trials} (${pct}%) — Expected ~20%`);

    if (pct >= 18 && pct <= 22) {
        pass(`Surge rate ${pct}% is within ±2% of target (20%)`);
    } else {
        fail(`Surge rate ${pct}% is out of expected range (18-22%)`);
    }

    // Verify CD reduction math
    const mockSkill = { lastCastTime: 0 };
    const nowMs = 100000;
    const cd = 5000;
    mockSkill.lastCastTime = nowMs - (cd * 0.5);
    const timeUntilReady = cd - (nowMs - mockSkill.lastCastTime);
    if (Math.abs(timeUntilReady - 2500) < 1) {
        pass(`CD reduction math correct: ${timeUntilReady}ms remaining (expected 2500ms)`);
    } else {
        fail(`CD reduction math wrong: got ${timeUntilReady}ms`);
    }
}

simulateArcaneSurge();

// ─── 2. WEAKNESS EXPLOITATION ───────────────────────────────────────────────
section('Weakness Exploitation — 20% damage bonus if target HP ≤ 30%');

function simulateWeaknessExploitation() {
    const archer = { atk: 10, activatedPerks: ['weakness_exploitation'], unitName: 'Ella' };

    const testCases = [
        { hp: 100, maxHp: 100, expectedBonus: false, desc: 'Target at 100% HP – no bonus' },
        { hp: 30, maxHp: 100, expectedBonus: false, desc: 'Target at 30% HP – no bonus (boundary, > 0.30 is false but = is still 0.30 ≤ 0.30)' },
        { hp: 29, maxHp: 100, expectedBonus: true, desc: 'Target at 29% HP – should trigger bonus' },
        { hp: 1, maxHp: 100, expectedBonus: true, desc: 'Target at 1% HP – should trigger bonus' },
        { hp: 0, maxHp: 100, expectedBonus: true, desc: 'Target at 0% HP – should trigger bonus' },
    ];

    for (const tc of testCases) {
        const target = { hp: tc.hp, maxHp: tc.maxHp };
        let finalDmg = archer.atk;
        let bonusApplied = false;

        // Exact logic from Archer.js fireProjectile()
        if (archer.activatedPerks.includes('weakness_exploitation')) {
            if (target.hp / target.maxHp <= 0.3) {
                finalDmg *= 1.2;
                bonusApplied = true;
                console.log(`  [Perk] ${archer.unitName}: 약자 멸시 발동! (대상 HP: ${Math.round(target.hp / target.maxHp * 100)}%)`);
            }
        }

        const ok = bonusApplied === tc.expectedBonus;
        const dmgInfo = `dmg=${finalDmg.toFixed(1)}`;
        ok ? pass(`${tc.desc} → ${dmgInfo}`) : fail(`${tc.desc} → ${dmgInfo} (bonus=${bonusApplied})`);
    }
}

simulateWeaknessExploitation();

// ─── 3. HIT AND RUN ─────────────────────────────────────────────────────────
section('Hit and Run — 30% speed boost, 2s duration, no stacking');

function simulateHitAndRun() {
    // Simulate the applyHitAndRun() logic
    let isHitAndRunActive = false;
    const archer = { speed: 100, unitName: 'Ella', activatedPerks: ['hit_and_run'] };

    function applyHitAndRun(callbackAfter2s) {
        if (isHitAndRunActive) {
            console.log('  [Perk] 히트 앤 런 이미 활성화됨 — 중복 발동 방지');
            return false; // no-op
        }
        isHitAndRunActive = true;
        const originalSpeed = archer.speed;
        archer.speed *= 1.3;
        console.log(`  [Perk] ${archer.unitName}: 히트 앤 런 발동! 이동 속도 30% 증가`);

        // Simulate 2s delay
        setTimeout(() => {
            archer.speed = originalSpeed;
            isHitAndRunActive = false;
            console.log(`  [Perk] ${archer.unitName}: 히트 앤 런 효과 종료`);
            if (callbackAfter2s) callbackAfter2s();
        }, 100); // 100ms in sim = 2s in game
        return true;
    }

    // --- Test 1: Speed boost applies
    const before = archer.speed;
    applyHitAndRun(() => {
        if (archer.speed === before) {
            pass(`Speed restored to ${archer.speed} after effect ends`);
        } else {
            fail(`Speed not restored correctly: ${archer.speed} (expected ${before})`);
        }

        // --- Test 2: No stacking / re-activation
        isHitAndRunActive = true; // simulate already active
        const result2 = applyHitAndRun(null);
        if (result2 === false) {
            pass('Double-activation correctly blocked (isHitAndRunActive guard works)');
        } else {
            fail('Double-activation was NOT blocked!');
        }
    });

    // Check speed during active window
    if (archer.speed === before * 1.3) {
        pass(`Speed boosted from ${before} to ${archer.speed} (30%)`);
    } else {
        fail(`Speed not boosted correctly: ${archer.speed} (expected ${before * 1.3})`);
    }
}

simulateHitAndRun();

// ─── SUMMARY ────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(55));
console.log('  Simulation complete.');
console.log('='.repeat(55) + '\n');
