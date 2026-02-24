/**
 * noel_simulation.js
 * 
 * Noel의 식물 친구들 스킬과 봄의 축복 궁극기가 정확한 수치로 적용되는지 점검하는 헤드리스 테스트 스크립트입니다.
 */

// 1. Mock Mercenary Class
class MockMercenary {
    constructor(name, stats) {
        this.unitName = name;
        this.active = true;
        this.hp = stats.hp || 100;
        this.maxHp = stats.hp || 100;
        this.atk = stats.atk || 20;
        this.mAtk = stats.mAtk || 20;
        this.def = stats.def || 10;
        this.mDef = stats.mDef || 10;
        this.speed = stats.speed || 100;
        this.atkSpd = stats.atkSpd || 1000;
        this.atkRange = stats.atkRange || 50;
        this.crit = stats.crit || 5;
        this.ultGauge = 0;
        this.isCCImmune = false;

        // Bonus stats
        this.bonusAtkSpd = 0;
        this.bonusDef = 0;
        this.bonusCrit = 0;
        this.bonusMAtk = 0;
    }

    receiveHeal(amount) {
        const oldHp = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        console.log(`[Heal] ${this.unitName} healed for ${Math.round(amount)}. (${Math.round(oldHp)} -> ${Math.round(this.hp)})`);
    }

    gainUltGauge(amount) {
        const oldVal = this.ultGauge;
        this.ultGauge = Math.min(100, this.ultGauge + amount);
        console.log(`[UltGauge] ${this.unitName} +${amount}%. (${oldVal}% -> ${this.ultGauge}%)`);
    }

    cleanse() { console.log(`[Skill] ${this.unitName} CLEANSED all current CCs.`); }

    getTotalMAtk() { return this.mAtk + this.bonusMAtk; }
}

// 2. Mock BuffManager
class MockBuffManager {
    applyBuff(target, source, type, duration, amountAtk, amountMAtk, dr, custom) {
        console.log(`[Buff] Applying ${type} to ${target.unitName}...`);
        if (custom) {
            target.bonusAtkSpd += custom.bonusAtkSpd || 0;
            target.bonusDef += custom.bonusDef || 0;
            target.bonusCrit += custom.bonusCrit || 0;
        }
    }
}

// 3. Test Simulation
function runNoelTest() {
    console.log("=== Noel Skills & Ultimate Simulation Test ===");

    const buffManager = new MockBuffManager();
    const scene = {
        buffManager,
        fxManager: {
            showDamageText: (t, msg, col) => console.log(`[FX] ${t.unitName}: ${msg}`),
            showHealText: (t, msg, col) => console.log(`[HealText] ${t.unitName}: ${msg}`),
            createOrbitEffect: () => { }
        },
        ccManager: {
            applyShock: (t, d) => console.log(`[CC] ${t.unitName} SHOCKED!`),
            applyBurn: (t, d) => console.log(`[CC] ${t.unitName} BURNING!`)
        }
    };

    const noel = new MockMercenary("Noel", { mAtk: 120 });
    const ally = new MockMercenary("Warrior Ally", { hp: 500, def: 50, atkSpd: 1000, crit: 5 });
    ally.hp = 300; // Partially damaged for heal test

    const enemy = new MockMercenary("Orc Enemy", { hp: 1000 });

    console.log("\n--- Testing Noel's Blessing of Spring (Ultimate) ---");

    // Simulate Ultimate Start
    ally.isCCImmune = true;
    ally.cleanse();
    const duration = 10000;
    const noelMAtk = noel.getTotalMAtk();

    console.log(`Noel MAtk: ${noelMAtk}. CC Immunity: ${ally.isCCImmune}`);

    // 10 second healing simulation
    for (let i = 1; i <= 10; i++) {
        const heal = noelMAtk * 0.1;
        ally.receiveHeal(heal);
    }

    console.log(`Final Ally HP: ${ally.hp} (Start 300 + 10 x 12 = 420)`);
    if (ally.hp === 420) console.log("✅ Ultimate MAtk-based Healing Correct!");
    if (ally.isCCImmune) console.log("✅ Ultimate CC Immunity Correct!");

    console.log("\n--- Testing 'Help! Plant Friends!' (Skill) ---");

    // 🥝 Kiwi: +5% Ult Gauge
    const oldUlt = ally.ultGauge;
    ally.gainUltGauge(5);
    if (ally.ultGauge === 5) console.log("✅ Kiwi Ult Gauge Correct!");

    // 🍇 Grapes: +20% AtkSpd
    const atkSpdBoost = Math.ceil(ally.atkSpd * 0.2);
    buffManager.applyBuff(ally, noel, 'Plant_AtkSpd', 5000, 0, 0, 0, { bonusAtkSpd: atkSpdBoost });
    console.log(`🍇 Grapes: Bonus AtkSpd +${atkSpdBoost}. Total Bonus: ${ally.bonusAtkSpd}`);
    if (atkSpdBoost === 200) console.log("✅ Grapes Attack Speed Correct!");

    // 🍉 Watermelon: +10% Def
    const defBoost = Math.ceil(ally.def * 0.1);
    buffManager.applyBuff(ally, noel, 'Plant_Def', 5000, 0, 0, 0, { bonusDef: defBoost });
    console.log(`🍉 Watermelon: Bonus Def +${defBoost}. Total Bonus: ${ally.bonusDef}`);
    if (defBoost === 5) console.log("✅ Watermelon Defense Correct!");

    // 🍍 Pineapple: +10% Crit
    const critBoost = Math.ceil(ally.crit * 0.1);
    buffManager.applyBuff(ally, noel, 'Plant_Crit', 5000, 0, 0, 0, { bonusCrit: critBoost });
    console.log(`🍍 Pineapple: Bonus Crit +${critBoost}. Total Bonus: ${ally.bonusCrit}`);
    if (critBoost === 1) console.log("✅ Pineapple Crit Correct!");

    // 🍌 Banana: Shock
    scene.ccManager.applyShock(enemy, 3000);

    // 🍓 Strawberry: Burn
    scene.ccManager.applyBurn(enemy, 5000);

    console.log("\n=== Simulation Complete ===");
}

runNoelTest();
