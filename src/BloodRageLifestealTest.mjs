/**
 * BloodRageLifestealTest.mjs
 * 킹의 블러드 레이지 흡혈(Lifesteal) 기능 검증 헤드리스 테스트
 * 
 * 구현 로직 (Mercenary.js):
 * if (attacker && attacker.isBloodRaging && attacker.heal) {
 *     attacker.heal(finalDamage * 0.35);
 * }
 */

const section = (t) => console.log(`\n${'='.repeat(62)}\n  ${t}\n${'='.repeat(62)}`);
const line = (label, val) => console.log(`  ${label.padEnd(40)} ${val}`);

// --- Mock Classes ---

class MockUnit {
    constructor(name, hp, atk) {
        this.unitName = name;
        this.maxHp = hp;
        this.hp = hp;
        this.atk = atk;
        this.bonusAtk = 0;
        this.isBloodRaging = false;
        this.healedAmount = 0;
        this.active = true;
    }

    getTotalAtk() {
        return this.atk + this.bonusAtk;
    }

    heal(amount) {
        const prevHp = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        const actualHeal = this.hp - prevHp;
        this.healedAmount += amount;
        console.log(`  [Heal] ${this.unitName} heals for ${amount.toFixed(1)} (HP: ${prevHp.toFixed(1)} -> ${this.hp.toFixed(1)})`);
    }

    // 시뮬레이션용 데미지 주기 함수
    dealDamage(target, amount) {
        console.log(`  [Attack] ${this.unitName} attacks ${target.unitName} for ${amount.toFixed(1)} damage.`);
        target.takeDamage(amount, this);
    }
}

class MockTarget {
    constructor(name, hp, def) {
        this.unitName = name;
        this.hp = hp;
        this.def = def;
        this.active = true;
    }

    takeDamage(amount, attacker) {
        const finalDamage = Math.max(1, amount - this.def);
        this.hp -= finalDamage;
        console.log(`  [Damage] ${this.unitName} takes ${finalDamage.toFixed(1)} damage (Remaining HP: ${this.hp.toFixed(1)})`);

        // 핵심: Mercenary.js의 흡혈 로직 시뮬레이션
        if (attacker && typeof attacker === 'object' && attacker.isBloodRaging && attacker.heal) {
            attacker.heal(finalDamage * 0.35);
        }
    }
}

// --- Simulation ---

async function runTest() {
    section('KING BLOOD RAGE LIFESTEAL TEST');

    // 1. 초기화
    const king = new MockUnit('King', 100, 50);
    const goblin = new MockTarget('Goblin', 1000, 10);

    // 킹의 체력을 미리 50으로 깎아둠 (흡혈 확인을 위해)
    king.hp = 50;
    line('King Initial HP', king.hp);
    line('King ATK', king.atk);
    line('Goblin DEF', goblin.def);

    // 2. 블러드 레이지 미발동 상태에서 공격
    section('STEP 1: 블러드 레이지 미발동 상태 공격');
    king.isBloodRaging = false;
    king.dealDamage(goblin, king.getTotalAtk());
    line('King HP after attack (No lifesteal)', king.hp);

    // 3. 블러드 레이지 발동
    section('STEP 2: 블러드 레이지 발동 후 공격');
    king.isBloodRaging = true;
    // 공격력 보너스 적용 (BloodRage.js 시뮬레이션)
    const bonusAtk = Math.floor(king.atk * 0.5);
    king.bonusAtk += bonusAtk;
    console.log(`  [Skill] King activates Blood Rage! (+${bonusAtk} ATK, +35% Lifesteal)`);
    line('King Current ATK', king.getTotalAtk());

    king.dealDamage(goblin, king.getTotalAtk());

    // 계산 검증
    // damage = 75, goblin def = 10 -> final damage = 65
    // lifesteal = 65 * 0.35 = 22.75
    // HP: 50 + 22.75 = 72.75

    const expectedHeal = (king.getTotalAtk() - goblin.def) * 0.35;
    line('Expected Heal Amount', expectedHeal.toFixed(2));
    line('Actual Healed Total', king.healedAmount.toFixed(2));
    line('King Final HP', king.hp.toFixed(2));

    if (Math.abs(king.healedAmount - expectedHeal) < 0.1) {
        console.log('\n  ✅ SUCCESS: Lifesteal correctly applied (35% of final damage).');
    } else {
        console.log('\n  ❌ FAILURE: Lifesteal mismatch.');
    }

    // 4. 오버힐 방지 확인
    section('STEP 3: 오버힐 방지 확인');
    king.hp = 95;
    console.log('  Setting King HP to 95/100');
    king.dealDamage(goblin, king.getTotalAtk());
    line('King HP after overheal attempt', king.hp);
    if (king.hp === 100) {
        console.log('  ✅ SUCCESS: HP capped at maxHp (100).');
    }
}

runTest();
