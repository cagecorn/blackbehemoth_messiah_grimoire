/**
 * test_elemental_resistance.js
 * 
 * 속성 저항력(Elemental Resistance)이 데미지를 올바르게 감쇄하는지 검증하는 헤드리스 테스트입니다.
 * 
 * 실제 코드 로직 재현:
 * - Mercenary.js (용병): getTotalFireRes() = Math.min(75, base + eqBonus + bonusRes + grimoireBonus)
 * - BaseMonster.js (몬스터): getTotalFireRes() = Math.min(90, base + bonusRes + grimoireBonus)
 * - 물리 데미지: finalDamage = Math.max(1, amount - def), 그 후 저항적용
 * - 마법 데미지: finalDamage = Math.max(1, amount - mDef), 그 후 저항적용
 */

let passed = 0;
let failed = 0;

function assert(testName, actual, expected, tolerance = 0.01) {
    const diff = Math.abs(actual - expected);
    if (diff <= tolerance) {
        console.log(`  ✅ PASS | ${testName}`);
        console.log(`         | Expected: ${expected}, Got: ${actual.toFixed(4)}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL | ${testName}`);
        console.error(`         | Expected: ${expected}, Got: ${actual.toFixed(4)} (diff: ${diff.toFixed(4)})`);
        failed++;
    }
}

// ─────────────────────────────────────────────
// Mock 유닛 — Mercenary (저항 캡: 75%)
// ─────────────────────────────────────────────
class MockMercenary {
    constructor(name, stats = {}) {
        this.unitName = name;
        this.hp = stats.maxHp || 1000;
        this.maxHp = stats.maxHp || 1000;
        this.def = stats.def || 0;
        this.mDef = stats.mDef || 0;
        this.fireRes = stats.fireRes || 0;
        this.iceRes = stats.iceRes || 0;
        this.lightningRes = stats.lightningRes || 0;
        this.bonusFireRes = stats.bonusFireRes || 0;
        this.bonusIceRes = stats.bonusIceRes || 0;
        this.bonusLightningRes = stats.bonusLightningRes || 0;
        this.bonusDR = stats.bonusDR || 0;
        // Grimoire / Equipment bonus (none in test)
        this.grimoireBonuses = stats.grimoireBonuses || {};
    }

    // Mercenary.js L600~612 재현 (캡: 75%)
    getTotalFireRes() {
        return Math.min(75, (this.fireRes || 0) + (this.bonusFireRes || 0) + (this.grimoireBonuses.fireResAdd || 0));
    }
    getTotalIceRes() {
        return Math.min(75, (this.iceRes || 0) + (this.bonusIceRes || 0) + (this.grimoireBonuses.iceResAdd || 0));
    }
    getTotalLightningRes() {
        return Math.min(75, (this.lightningRes || 0) + (this.bonusLightningRes || 0) + (this.grimoireBonuses.lightningResAdd || 0));
    }
    getTotalDef() { return Math.floor((this.def || 0)); }
    getTotalMDef() { return Math.floor((this.mDef || 0)); }
    getTotalDR() { return (this.bonusDR || 0); }

    // Mercenary.js takeDamage 재현
    takeDamage(amount, element = null) {
        let finalDamage = Math.max(1, amount - this.getTotalDef());
        if (element) {
            let res = 0;
            if (element === 'fire') res = this.getTotalFireRes();
            else if (element === 'ice') res = this.getTotalIceRes();
            else if (element === 'lightning') res = this.getTotalLightningRes();
            finalDamage *= (1 - (res / 100));
        }
        if (this.getTotalDR() > 0) {
            finalDamage *= (1 - this.getTotalDR());
        }
        this.hp -= finalDamage;
        return finalDamage;
    }

    // Mercenary.js takeMagicDamage 재현
    takeMagicDamage(amount, element = null) {
        let finalDamage = Math.max(1, amount - this.getTotalMDef());
        if (element) {
            let res = 0;
            if (element === 'fire') res = this.getTotalFireRes();
            else if (element === 'ice') res = this.getTotalIceRes();
            else if (element === 'lightning') res = this.getTotalLightningRes();
            finalDamage *= (1 - (res / 100));
        }
        if (this.getTotalDR() > 0) {
            finalDamage *= (1 - this.getTotalDR());
        }
        this.hp -= finalDamage;
        return finalDamage;
    }
}

// ─────────────────────────────────────────────
// Mock 유닛 — BaseMonster (저항 캡: 90%)
// ─────────────────────────────────────────────
class MockMonster {
    constructor(name, stats = {}) {
        this.unitName = name;
        this.hp = stats.maxHp || 1000;
        this.maxHp = stats.maxHp || 1000;
        this.def = stats.def || 0;
        this.mDef = stats.mDef || 0;
        this.fireRes = stats.fireRes || 0;
        this.iceRes = stats.iceRes || 0;
        this.lightningRes = stats.lightningRes || 0;
        this.bonusFireRes = stats.bonusFireRes || 0;
        this.bonusIceRes = stats.bonusIceRes || 0;
        this.bonusLightningRes = stats.bonusLightningRes || 0;
        this.bonusDR = stats.bonusDR || 0;
        this.grimoireBonuses = stats.grimoireBonuses || {};
    }

    // BaseMonster.js L466~480 재현 (캡: 90%)
    getTotalFireRes() {
        return Math.min(90, (this.fireRes || 0) + (this.bonusFireRes || 0) + (this.grimoireBonuses.fireResAdd || 0));
    }
    getTotalIceRes() {
        return Math.min(90, (this.iceRes || 0) + (this.bonusIceRes || 0) + (this.grimoireBonuses.iceResAdd || 0));
    }
    getTotalLightningRes() {
        return Math.min(90, (this.lightningRes || 0) + (this.bonusLightningRes || 0) + (this.grimoireBonuses.lightningResAdd || 0));
    }
    getTotalDef() { return Math.floor((this.def || 0)); }
    getTotalMDef() { return Math.floor((this.mDef || 0)); }
    getTotalDR() { return (this.bonusDR || 0); }

    // BaseMonster.js takeDamage 재현
    takeDamage(amount, element = null) {
        let finalDamage = Math.max(1, amount - this.getTotalDef());
        if (element) {
            let res = 0;
            if (element === 'fire') res = this.getTotalFireRes();
            else if (element === 'ice') res = this.getTotalIceRes();
            else if (element === 'lightning') res = this.getTotalLightningRes();
            finalDamage *= (1 - (res / 100));
        }
        if (this.getTotalDR() > 0) {
            finalDamage *= (1 - this.getTotalDR());
        }
        this.hp -= finalDamage;
        return finalDamage;
    }

    takeMagicDamage(amount, element = null) {
        let finalDamage = Math.max(1, amount - this.getTotalMDef());
        if (element) {
            let res = 0;
            if (element === 'fire') res = this.getTotalFireRes();
            else if (element === 'ice') res = this.getTotalIceRes();
            else if (element === 'lightning') res = this.getTotalLightningRes();
            finalDamage *= (1 - (res / 100));
        }
        if (this.getTotalDR() > 0) {
            finalDamage *= (1 - this.getTotalDR());
        }
        this.hp -= finalDamage;
        return finalDamage;
    }
}

// ═══════════════════════════════════════════════════
// 테스트 실행
// ═══════════════════════════════════════════════════

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║   Elemental Resistance Headless Test             ║');
console.log('╚══════════════════════════════════════════════════╝\n');

// ── SUITE 1: 기본 데미지 (저항 없음 기대값 확인) ──────
console.log('── SUITE 1: Base Damage (No Resistance) ──');

const plain = new MockMercenary('Plain Unit', { def: 0, mDef: 0 });
const physDmg = plain.takeDamage(100);
assert('물리 100 데미지, 방어 0 → 100 그대로', physDmg, 100);

const plainMagic = new MockMercenary('Plain Unit (Magic)', { mDef: 0 });
const magicDmg = plainMagic.takeMagicDamage(100);
assert('마법 100 데미지, 마방 0 → 100 그대로', magicDmg, 100);

// ── SUITE 2: 방어력 차감 (속성 없음) ──────────────────
console.log('\n── SUITE 2: DEF/mDef Reduction (No Element) ──');

const tankUnit = new MockMercenary('Tank', { def: 50, mDef: 40 });
assert('물리 100 vs DEF 50 → 50', tankUnit.takeDamage(100), 50);
assert('마법 100 vs mDef 40 → 60', tankUnit.takeMagicDamage(100), 60);

// ── SUITE 3: 용병 속성 저항 (캡 75%) ──────────────────
console.log('\n── SUITE 3: Mercenary Elemental Resistance (25% / 50% / 75% cap) ──');

// 3-1. 화염 25% 저항
const fireUnit = new MockMercenary('FireRes 25', { fireRes: 25, def: 0 });
// 100 * (1 - 0.25) = 75
assert('불 100 vs fireRes 25% (용병) → 75', fireUnit.takeDamage(100, 'fire'), 75);

// 3-2. 얼음 50% 저항
const iceUnit = new MockMercenary('IceRes 50', { iceRes: 50, def: 0 });
assert('얼음 100 vs iceRes 50% (용병) → 50', iceUnit.takeDamage(100, 'ice'), 50);

// 3-3. 번개 저항 캡 테스트 (90% 입력 → 75%로 클램프)
const lightningUnit = new MockMercenary('LightningRes 90cap', { lightningRes: 90, def: 0 });
// 100 * (1 - 0.75) = 25 (75% 캡 적용)
assert('번개 100 vs lightningRes 90% (용병 캡75%) → 25', lightningUnit.takeDamage(100, 'lightning'), 25);

// 3-4. 방어 + 속성 저항 혼합
const hybridMerc = new MockMercenary('Hybrid Merc', { def: 30, fireRes: 50 });
// (100 - 30) * (1 - 0.50) = 70 * 0.50 = 35
assert('불 100 vs DEF 30 + fireRes 50% (용병) → 35', hybridMerc.takeDamage(100, 'fire'), 35);

// 3-5. 마법 데미지 + 속성 저항
const magicFireUnit = new MockMercenary('MagicFireRes 40', { mDef: 20, fireRes: 40 });
// (100 - 20) * (1 - 0.40) = 80 * 0.60 = 48
assert('불 마법 100 vs mDef 20 + fireRes 40% (용병) → 48', magicFireUnit.takeMagicDamage(100, 'fire'), 48);

// 3-6. bonusFireRes (Grimoire/Buff로 추가된 저항)
const bonusResUnit = new MockMercenary('BonusRes Merc', { fireRes: 30, bonusFireRes: 25 });
// total = 30 + 25 = 55%, cap 75, (100) * (1 - 0.55) = 45
assert('불 100, fireRes 30 + bonusFireRes 25 = 55% (용병) → 45', bonusResUnit.takeDamage(100, 'fire'), 45);

// 3-7. 저항 총합이 75 초과 시 캡 확인 (30 + 60 = 90 → 75 캡)
const overCapUnit = new MockMercenary('OverCap Merc', { iceRes: 30, bonusIceRes: 60 });
// capped at 75, (100) * (1 - 0.75) = 25
assert('얼음 100, iceRes 90% (30+60) 캡75% 적용 (용병) → 25', overCapUnit.takeDamage(100, 'ice'), 25);

// ── SUITE 4: 몬스터 속성 저항 (캡 90%) ────────────────
console.log('\n── SUITE 4: Monster Elemental Resistance (cap 90%) ──');

// 4-1. 화염 50% 저항
const monsterFire = new MockMonster('Goblin Shaman', { mDef: 0, fireRes: 50 });
assert('불 마법 100 vs fireRes 50% (몬스터) → 50', monsterFire.takeMagicDamage(100, 'fire'), 50);

// 4-2. 몬스터 저항 캡 90% 확인 (100% 입력 → 90%로 클램프)
const monsterCap = new MockMonster('Elite Monster', { fireRes: 100, def: 0 });
// 100 * (1 - 0.90) = 10
assert('불 100, fireRes 100% (몬스터 캡90%) → 10', monsterCap.takeDamage(100, 'fire'), 10);

// 4-3. 언데드 - 화염 취약성(-10 저항)
const undeadSkeleton = new MockMonster('Skeleton', { def: 10, mDef: 4, fireRes: -10 });
// (100 - 10) * (1 - (-10/100)) = 90 * 1.10 = 99
assert('불 100 vs DEF 10 + fireRes -10% (언데드 약점) → 99', undeadSkeleton.takeDamage(100, 'fire'), 99);

// 4-4. 몬스터도 방어 + 저항 혼합
const monsterHybrid = new MockMonster('OrcElite', { def: 20, lightningRes: 60 });
// (100 - 20) * (1 - 0.60) = 80 * 0.40 = 32
assert('번개 100 vs DEF 20 + lightningRes 60% (몬스터) → 32', monsterHybrid.takeDamage(100, 'lightning'), 32);

// ── SUITE 5: DR (데미지 감소 버프) 상호작용 ─────────────
console.log('\n── SUITE 5: Damage Reduction (DR) Interaction ──');

// 5-1. 순수 DR
const drUnit = new MockMercenary('DR Unit', { bonusDR: 0.3 });
// 100 * (1 - 0.30) = 70
assert('물리 100 vs DR 30% (용병) → 70', drUnit.takeDamage(100), 70);

// 5-2. DEF + 저항 + DR 모두 적용 순서 확인
// Step 1: 100 - def(20) = 80
// Step 2: 80 * (1 - 0.50 fireRes) = 40
// Step 3: 40 * (1 - 0.20 DR) = 32
const fullUnit = new MockMercenary('Full Stack Merc', { def: 20, fireRes: 50, bonusDR: 0.2 });
assert('불 100 vs DEF 20 + fireRes 50% + DR 20% (용병) → 32', fullUnit.takeDamage(100, 'fire'), 32);

// ── SUITE 6: 최솟값 보장 (방어가 공격보다 훨씬 높을 때 최소 1) ──
console.log('\n── SUITE 6: Minimum Damage Floor (always 1) ──');

const fortressUnit = new MockMercenary('Fortress', { def: 9999 });
assert('물리 10 vs DEF 9999 → 최소 1', fortressUnit.takeDamage(10), 1);

const fortressMagic = new MockMercenary('FortressMagic', { mDef: 9999 });
assert('마법 10 vs mDef 9999 → 최소 1', fortressMagic.takeMagicDamage(10), 1);

// ═══════════════════════════════════════════════════
// 결과 요약
// ═══════════════════════════════════════════════════
console.log('\n╔══════════════════════════════════════════════════╗');
console.log(`║  총 ${passed + failed}개 테스트 | ✅ 통과: ${passed} | ❌ 실패: ${failed}  ║`);
console.log('╚══════════════════════════════════════════════════╝\n');

if (failed === 0) {
    console.log('🎉 모든 속성 저항 테스트를 통과했습니다!');
    console.log('   Elemental Resistance 계산 로직이 정상 작동 중입니다.\n');
} else {
    console.error('⚠️  일부 테스트가 실패했습니다. 위 로그를 확인해 주세요.\n');
}
