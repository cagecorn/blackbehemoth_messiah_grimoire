/**
 * combat_verification.js
 * 
 * 물리/마법 데미지 차감 및 속성 저항력 적용을 검증하는 헤드리스 테스트 스크립트입니다.
 */

// 1. Mock Combat Logic (BaseMonster & Mercenary 기반)
class CombatUnit {
    constructor(name, stats) {
        this.unitName = name;
        this.hp = stats.hp || 1000;
        this.maxHp = stats.hp || 1000;
        this.def = stats.def || 0;
        this.mDef = stats.mDef || 0;
        this.fireRes = stats.fireRes || 0;
        this.iceRes = stats.iceRes || 0;
        this.lightningRes = stats.lightningRes || 0;
        this.bonusDR = stats.bonusDR || 0;
    }

    getTotalFireRes() { return Math.min(75, this.fireRes); }
    getTotalIceRes() { return Math.min(75, this.iceRes); }
    getTotalLightningRes() { return Math.min(75, this.lightningRes); }

    // Mercenary/BaseMonster의 takeDamage 로직 재현
    takeDamage(amount, element = null) {
        let finalDamage = Math.max(1, amount - this.def);

        if (element) {
            let res = 0;
            if (element === 'fire') res = this.getTotalFireRes();
            else if (element === 'ice') res = this.getTotalIceRes();
            else if (element === 'lightning') res = this.getTotalLightningRes();
            finalDamage *= (1 - (res / 100));
        }

        if (this.bonusDR > 0) {
            finalDamage *= (1 - this.bonusDR);
        }

        this.hp -= finalDamage;
        return finalDamage;
    }

    // Mercenary/BaseMonster의 takeMagicDamage 로직 재현
    takeMagicDamage(amount, element = null) {
        let finalDamage = Math.max(1, amount - this.mDef);

        if (element) {
            let res = 0;
            if (element === 'fire') res = this.getTotalFireRes();
            else if (element === 'ice') res = this.getTotalIceRes();
            else if (element === 'lightning') res = this.getTotalLightningRes();
            finalDamage *= (1 - (res / 100));
        }

        this.hp -= finalDamage;
        return finalDamage;
    }
}

// 2. Test Execution
function runCombatTest() {
    console.log("=== Combat Mechanics Verification Test ===");

    // Scenario 1: Physical Damage vs Defense
    console.log("\n[Scenario 1] Physical Damage vs Defense");
    const tank = new CombatUnit("Tank", { def: 50 });
    const rawPhysDmg = 100;
    const receivedPhys = tank.takeDamage(rawPhysDmg);
    console.log(`Raw Damage: ${rawPhysDmg}, Def: 50`);
    console.log(`Received Damage: ${receivedPhys} (Expected: 50)`);
    if (receivedPhys === 50) console.log("✅ Case 1: Defense Reduction Passed!");
    else console.log("❌ Case 1: Defense Reduction Failed!");

    // Scenario 2: Magic Damage vs Magic Defense
    console.log("\n[Scenario 2] Magic Damage vs MDef");
    const mage = new CombatUnit("Mage", { mDef: 40 });
    const rawMagicDmg = 100;
    const receivedMagic = mage.takeMagicDamage(rawMagicDmg);
    console.log(`Raw Damage: ${rawMagicDmg}, MDef: 40`);
    console.log(`Received Damage: ${receivedMagic} (Expected: 60)`);
    if (receivedMagic === 60) console.log("✅ Case 2: MDef Reduction Passed!");
    else console.log("❌ Case 2: MDef Reduction Failed!");

    // Scenario 3: Elemental Damage vs Resistance
    console.log("\n[Scenario 3] Fire Damage vs Fire Resistance");
    const fireResUnit = new CombatUnit("FireResist", { def: 0, fireRes: 50 });
    const rawFireDmg = 100;
    const receivedFire = fireResUnit.takeDamage(rawFireDmg, 'fire');
    console.log(`Raw Damage: ${rawFireDmg}, FireRes: 50%`);
    console.log(`Received Damage: ${receivedFire} (Expected: 50)`);
    if (receivedFire === 50) console.log("✅ Case 3: Fire Resistance Passed!");
    else console.log("❌ Case 3: Fire Resistance Failed!");

    // Scenario 4: Elemental Damage capped at 75%
    console.log("\n[Scenario 4] Ice Damage vs High Resistance (Capped at 75%)");
    const iceResUnit = new CombatUnit("IceResist", { def: 0, iceRes: 90 }); // 90% should cap to 75%
    const rawIceDmg = 1000;
    const receivedIce = iceResUnit.takeDamage(rawIceDmg, 'ice');
    console.log(`Raw Damage: ${rawIceDmg}, IceRes: 90% (capped at 75%)`);
    console.log(`Received Damage: ${receivedIce} (Expected: 250)`);
    if (receivedIce === 250) console.log("✅ Case 4: Resistance Capping Passed!");
    else console.log("❌ Case 4: Resistance Capping Failed!");

    // Scenario 5: Combined Def and Resistance
    console.log("\n[Scenario 5] Lightning Damage vs Def + Resistance");
    // (1000 - 100 def) * (1 - 0.5 res) = 900 * 0.5 = 450
    const hybridUnit = new CombatUnit("Hybrid", { def: 100, lightningRes: 50 });
    const rawLightningDmg = 1000;
    const receivedLightning = hybridUnit.takeDamage(rawLightningDmg, 'lightning');
    console.log(`Raw Damage: ${rawLightningDmg}, Def: 100, LightningRes: 50%`);
    console.log(`Received Damage: ${receivedLightning} (Expected: 450)`);
    if (receivedLightning === 450) console.log("✅ Case 5: Combined Reduction Passed!");
    else console.log("❌ Case 5: Combined Reduction Failed!");

    console.log("\n=== Verification Complete ===");
}

runCombatTest();
