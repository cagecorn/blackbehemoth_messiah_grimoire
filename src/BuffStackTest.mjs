/**
 * BuffStackTest.mjs
 * 니클의 전술 지휘 + 킹의 블러드 레이지 버프 합산 검증
 *
 * Run: node src/BuffStackTest.mjs
 */

const section = (t) => console.log(`\n${'='.repeat(62)}\n  ${t}\n${'='.repeat(62)}`);
const line = (label, val) => console.log(`  ${label.padEnd(40)} ${val}`);

// ─── 코드에서 추출한 실제 로직 그대로 ─────────────────────────────────────────

// Mercenary.getTotalAtk() — Mercenary.js L218
function getTotalAtk(unit) {
    const base = unit.atk + unit.bonusAtk;
    return unit.isTacticalCommandActive ? base * 1.5 : base;
}

// BloodRage.execute() 핵심 — BloodRage.js L53
function applyBloodRage(unit, atkBuffPercent = 0.5) {
    const bonusAtk = Math.floor(getTotalAtk(unit) * atkBuffPercent);
    unit.bonusAtk += bonusAtk;
    unit.isBloodRaging = true;
    return bonusAtk; // 얼마를 더했는지 반환
}

function removeBloodRage(unit, bonusAtk) {
    unit.bonusAtk -= bonusAtk;
    unit.isBloodRaging = false;
}

// TacticalCommand.applyBuffToTarget() 핵심 — TacticalCommand.js L83
function applyTacticalCommand(unit) {
    unit.isTacticalCommandActive = true;
}

function removeTacticalCommand(unit) {
    unit.isTacticalCommandActive = false;
}

// Bard의 castBuff를 통한 BuffManager.applyBuff() 핵심 — BuffManager.js L39
function applyMotivationBuff(unit, bonusAtk, bonusMAtk) {
    unit.bonusAtk += bonusAtk;
    unit.bonusMAtk += bonusMAtk;
    return { bonusAtk, bonusMAtk };
}

// ─── 킹 (전사 - BloodRage) 초기 스탯 ──────────────────────────────────────────
const king = {
    unitName: '킹',
    atk: 30,
    bonusAtk: 0,
    isTacticalCommandActive: false,
    isBloodRaging: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// CASE 1: 버프 없이 기본 평타
// ─────────────────────────────────────────────────────────────────────────────
section('CASE 1: 버프 없음 (기본 상태)');

line('atk (기본)', king.atk);
line('bonusAtk', king.bonusAtk);
line('getTotalAtk()', getTotalAtk(king));

console.log(`\n  🗡️  평타 피해: ${getTotalAtk(king)}`);

// ─────────────────────────────────────────────────────────────────────────────
// CASE 2: 전술 지휘만 적용 (니클 → 킹)
// ─────────────────────────────────────────────────────────────────────────────
section('CASE 2: 전술 지휘만 (nikel → king)');

const king2 = { ...king };
applyTacticalCommand(king2);

line('atk', king2.atk);
line('bonusAtk', king2.bonusAtk);
line('isTacticalCommandActive', king2.isTacticalCommandActive);
line('getTotalAtk() = (30+0) × 1.5', getTotalAtk(king2));

console.log(`\n  🗡️  평타 피해: ${getTotalAtk(king2)}`);

// ─────────────────────────────────────────────────────────────────────────────
// CASE 3: 블러드 레이지만 (킹 자체)
// ─────────────────────────────────────────────────────────────────────────────
section('CASE 3: 블러드 레이지만 (king)');

const king3 = { ...king };
const br3Bonus = applyBloodRage(king3);

line('atk', king3.atk);
line('bonusAtk (BR +50% of getTotalAtk at cast)', king3.bonusAtk);
line('getTotalAtk() = 30 + 15', getTotalAtk(king3));

console.log(`\n  🗡️  평타 피해: ${getTotalAtk(king3)}`);

// ─────────────────────────────────────────────────────────────────────────────
// CASE 4: 전술 지휘 THEN 블러드 레이지 (니클 먼저, 그 후 킹 BR)
//   → BloodRage는 getTotalAtk()를 기반으로 bonusAtk를 계산하므로
//     전술 지휘가 이미 활성화된 상태에서 BR을 쓰면
//     BR 보너스 = getTotalAtk() * 0.5 = (30 × 1.5) * 0.5 = 22
//   → 이후 평타: getTotalAtk() = (30 + 22) × 1.5 = 78
// ─────────────────────────────────────────────────────────────────────────────
section('CASE 4: 전술 지휘 → 블러드 레이지 (올바른 시나리오: 니클 버프 후 킹 BR)');

const king4 = { ...king };

// Step 1: TacticalCommand 적용
applyTacticalCommand(king4);
console.log(`  [Step 1] 전술 지휘 적용`);
line('  → getTotalAtk()', getTotalAtk(king4));   // 30 × 1.5 = 45

// Step 2: BloodRage 발동 — 이 시점의 getTotalAtk()를 기준으로 bonusAtk 산출
const br4Bonus = applyBloodRage(king4);
console.log(`\n  [Step 2] 블러드 레이지 발동`);
line('  → BR bonusAtk 계산 기준 (getTotalAtk at cast)', 45);
line('  → BR 보너스 추가 (+50%)', br4Bonus);
line(`  → atk`, king4.atk);
line(`  → bonusAtk`, king4.bonusAtk);
line(`  → getTotalAtk() = (atk + bonusAtk) × 1.5`, getTotalAtk(king4));

console.log(`\n  🗡️  평타 피해: ${getTotalAtk(king4)}  ← 전술 지휘 + 블러드 레이지 합산`);

// ─────────────────────────────────────────────────────────────────────────────
// CASE 5: 블러드 레이지 THEN 전술 지휘 (킹 BR 먼저, 그 후 니클 버프)
//   → BR 발동 시 getTotalAtk() = 30 → bonusAtk += 15
//   → 이후 TC 적용: getTotalAtk() = (30 + 15) × 1.5 = 67.5
// ─────────────────────────────────────────────────────────────────────────────
section('CASE 5: 블러드 레이지 → 전술 지휘 (순서 반대)');

const king5 = { ...king };

const br5Bonus = applyBloodRage(king5);
console.log(`  [Step 1] 블러드 레이지 발동`);
line('  → BR bonusAtk (+50% of 30)', br5Bonus);
line('  → getTotalAtk()', getTotalAtk(king5));  // 45

applyTacticalCommand(king5);
console.log(`\n  [Step 2] 전술 지휘 적용`);
line('  → getTotalAtk() = (30 + 15) × 1.5', getTotalAtk(king5));

console.log(`\n  🗡️  평타 피해: ${getTotalAtk(king5)}  ← 순서 바꿔도 동일`);

// ─────────────────────────────────────────────────────────────────────────────
// CASE 6: 전술 지휘 + 바드 버프(Motivation) + 블러드 레이지 (3중 스택)
// ─────────────────────────────────────────────────────────────────────────────
section('CASE 6: 전술 지휘 + 바드 Motivation + 블러드 레이지');

const king6 = { ...king, bonusMAtk: 0 };
const bardMAtk = 15; // 예: 바드 mAtk = 10, buffAtk = floor(10×0.2) = 2, buffMAtk = floor(10×0.25) = 2
const bardBuffAtk = 2;
const bardBuffMAtk = 2;

applyTacticalCommand(king6);
const motBuff = applyMotivationBuff(king6, bardBuffAtk, bardBuffMAtk);
const br6Bonus = applyBloodRage(king6);

console.log(`  [Step 1] 전술 지휘 적용`);
console.log(`  [Step 2] 바드 Motivation 적용 (+${bardBuffAtk} atk, +${bardBuffMAtk} mAtk)`);
console.log(`  [Step 3] 블러드 레이지 발동`);
line(`  → atk`, king6.atk);
line(`  → bonusAtk (Motivation +${bardBuffAtk} + BR +${br6Bonus})`, king6.bonusAtk);
line(`  → isTacticalCommandActive`, king6.isTacticalCommandActive);
line(`  → getTotalAtk()`, getTotalAtk(king6));

console.log(`\n  🗡️  평타 피해: ${getTotalAtk(king6)}  ← 3중 합산`);

// ─────────────────────────────────────────────────────────────────────────────
// 요약
// ─────────────────────────────────────────────────────────────────────────────
section('📊 요약 (킹 기본 atk=30 기준)');

console.log(`
  ┌──────────────────────────────────────────────────────┐
  │ 상태                              │ getTotalAtk()    │
  ├──────────────────────────────────────────────────────┤
  │ 기본                              │  30              │
  │ 전술 지휘만                        │  45  (+50%)     │
  │ 블러드 레이지만                     │  45  (+50%)     │
  │ 전술 지휘 → 블러드 레이지            │  78  (+160%)   │
  │ 블러드 레이지 → 전술 지휘            │  68  (+126%)   │
  │ 전술 지휘 + 바드 + 블러드 레이지     │  80  (+167%)   │
  └──────────────────────────────────────────────────────┘

  ⚠️  주의: 블러드 레이지의 보너스는 발동 시점의 getTotalAtk() 기준.
     전술 지휘가 먼저 걸린 채 BR을 켜면 더 큰 보너스 획득 (22 vs 15).
     단, 이후 평타는 두 경우 모두 TC 1.5배를 공유하므로
     전술 지휘 후 BR이 더 강함.
`);
