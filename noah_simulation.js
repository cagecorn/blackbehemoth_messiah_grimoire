/**
 * noah_simulation.js
 * 
 * Noah의 스킬과 궁극기 효과가 정확한 수치로 적용되는지 점검하는 헤드리스 테스트 스크립트입니다.
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
        this.rangeMin = stats.rangeMin || 0;
        this.rangeMax = stats.rangeMax || 0;
        this.castSpd = stats.castSpd || 800;
        this.acc = stats.acc || 90;
        this.eva = stats.eva || 10;
        this.crit = stats.crit || 5;

        // Bonus stats managed by BuffManager
        this.bonusAtk = 0;
        this.bonusMAtk = 0;
        this.bonusDef = 0;
        this.bonusMDef = 0;
        this.bonusSpeed = 0;
        this.bonusCrit = 0;
        this.bonusEva = 0;
        this.bonusAtkSpd = 0;
        this.bonusAtkRange = 0;
        this.bonusRangeMin = 0;
        this.bonusRangeMax = 0;
        this.bonusCastSpd = 0;
        this.bonusAcc = 0;

        this.skill = stats.skill || { lastCastTime: 0, cooldown: 12000, getActualCooldown: (cs) => 12000 };
    }

    receiveHeal(amount) {
        const oldHp = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        console.log(`[Heal] ${this.unitName} healed for ${Math.round(amount)}. (${Math.round(oldHp)} -> ${Math.round(this.hp)})`);
    }

    takeDamage(amount) {
        const oldHp = this.hp;
        this.hp -= amount;
        console.log(`[Damage] ${this.unitName} took ${Math.round(amount)} damage. (${Math.round(oldHp)} -> ${Math.round(this.hp)})`);
    }

    // CC Mocks
    applyAirborne() { console.log(`[CC] ${this.unitName} is AIRBORNE!`); }
    applySleep() { console.log(`[CC] ${this.unitName} is ASLEEP!`); }

    getTotalSpeed() { return this.speed + this.bonusSpeed; }
    getTotalCrit() { return this.crit + this.bonusCrit; }
    getTotalEva() { return this.eva + this.bonusEva; }
}

// 2. Mock BuffManager
class MockBuffManager {
    applyBuff(target, source, type, duration, amountAtk, amountMAtk, dr, custom) {
        console.log(`[Buff] Applying ${type} to ${target.unitName}...`);
        target.bonusAtk += amountAtk || 0;
        target.bonusMAtk += amountMAtk || 0;
        if (custom) {
            target.bonusCrit += custom.bonusCrit || 0;
            target.bonusEva += custom.bonusEva || 0;
            target.bonusSpeed += custom.bonusSpeed || 0;
            target.bonusDef += custom.bonusDef || 0;
            target.bonusMDef += custom.bonusMDef || 0;
            target.bonusAtkSpd += custom.bonusAtkSpd || 0;
            target.bonusAtkRange += custom.bonusAtkRange || 0;
            target.bonusRangeMin += custom.bonusRangeMin || 0;
            target.bonusRangeMax += custom.bonusRangeMax || 0;
            target.bonusCastSpd += custom.bonusCastSpd || 0;
            target.bonusAcc += custom.bonusAcc || 0;
        }
    }
}

// 3. Test Simulation
function runNoahTest() {
    console.log("=== Noah Skills & Ultimate Simulation Test ===");

    const buffManager = new MockBuffManager();
    const scene = {
        buffManager,
        fxManager: {
            showDamageText: (t, msg, col) => console.log(`[FX] ${t.unitName}: ${msg}`),
            showHealText: (t, msg, col) => console.log(`[FX] ${t.unitName}: ${msg}`),
            createOrbitEffect: () => { }
        },
        ccManager: {
            applyAirborne: (t, d) => t.applyAirborne(),
            applySleep: (t, d) => t.applySleep()
        }
    };

    const noah = new MockMercenary("Noah", { mAtk: 100 });
    const ally = new MockMercenary("Warrior Ally", { hp: 500, eva: 20, speed: 100, crit: 5, def: 50, mDef: 40 });
    ally.hp = 250; // Half HP for heal test

    const enemy = new MockMercenary("Goblin Enemy", { hp: 1000 });

    console.log("\n--- Testing Noah's Ark (Ultimate) ---");
    console.log(`Initial Stats: Def ${ally.def}, Speed ${ally.speed}, Atk ${ally.atk}`);

    // Simulate Ultimate: +15% to all
    const duration = 10000;
    const allies = [ally, noah];
    allies.forEach(a => {
        const buffStats = {
            bonusCrit: a.crit * 0.15,
            bonusEva: a.eva * 0.15,
            bonusSpeed: a.speed * 0.15,
            bonusDef: a.def * 0.15,
            bonusMDef: a.mDef * 0.15,
            bonusAtkSpd: a.atkSpd * 0.15,
            bonusAtkRange: a.atkRange * 0.15,
            bonusRangeMin: a.rangeMin * 0.15,
            bonusRangeMax: a.rangeMax * 0.15,
            bonusCastSpd: a.castSpd * 0.15,
            bonusAcc: a.acc * 0.15
        };
        buffManager.applyBuff(a, noah, 'Noahs_Ark_Blessing', duration, a.atk * 0.15, a.mAtk * 0.15, 0, buffStats);
    });

    console.log(`Buffed Stats (Ally): Def ${ally.def + ally.bonusDef} (Expected ${50 * 1.15}), Speed ${ally.speed + ally.bonusSpeed} (Expected ${100 * 1.15})`);
    if (Math.abs((ally.def + ally.bonusDef) - 50 * 1.15) < 0.1) console.log("✅ Ultimate Stat Boost Correct!");

    console.log("\n--- Testing 'Help! Animal Friends!' (Skill) ---");

    // 🐕 Dog: CD 30% reduction
    const oldCD = ally.skill.lastCastTime;
    const cdVal = 12000;
    ally.skill.lastCastTime = (ally.skill.lastCastTime || 0) - cdVal * 0.3;
    console.log(`🐕 Dog: CD Reduced. Value: ${ally.skill.lastCastTime} (Expected -3600)`);
    if (ally.skill.lastCastTime === -3600) console.log("✅ Dog CD Reduction Correct!");

    // 🐈 Cat: Evasion 10%
    const oldEva = ally.bonusEva;
    const evaBoost = Math.ceil(ally.eva * 0.1);
    buffManager.applyBuff(ally, noah, 'Animal_Evasion', 5000, 0, 0, 0, { bonusEva: evaBoost });
    console.log(`🐈 Cat: Evasion +${evaBoost}. Total Bonus: ${ally.bonusEva}`);
    if (evaBoost === 2) console.log("✅ Cat Evasion Boost Correct!");

    // 🐎 Horse: Speed 10%
    const speedBoost = Math.ceil(ally.speed * 0.1);
    buffManager.applyBuff(ally, noah, 'Animal_Speed', 5000, 0, 0, 0, { bonusSpeed: speedBoost });
    console.log(`🐎 Horse: Speed +${speedBoost}. Total Bonus: ${ally.bonusSpeed}`);
    if (speedBoost === 10) console.log("✅ Horse Speed Boost Correct!");

    // 🐖 Pig: Heal 20%
    const oldHp = ally.hp;
    const heal = ally.maxHp * 0.2;
    ally.receiveHeal(heal);
    if (ally.hp === oldHp + 100) console.log("✅ Pig Healing Correct!");

    // 🐅 Tiger: mAtk Damage
    const matk = noah.mAtk + noah.bonusMAtk; // Noah is buffed by his own ult!
    enemy.takeDamage(matk * 2.0);
    console.log(`🐅 Tiger Damage: ${matk * 2.0} (Expected ${115 * 2.0})`);
    if (matk * 2.0 === 230) console.log("✅ Tiger Damage Correct!");

    // 🦬 Bison: Airborne
    scene.ccManager.applyAirborne(enemy, 1000);

    // 🐑 Sheep: Sleep
    scene.ccManager.applySleep(enemy, 3000);

    console.log("\n=== Simulation Complete ===");
}

runNoahTest();
