/**
 * NickleSynergyTest.js
 * Headless simulation to verify Nickle's damage with Tactical Command and Elemental Synergy.
 */

class MockEntity {
    constructor(name, stats) {
        this.unitName = name;
        this.hp = stats.hp || 100;
        this.maxHp = stats.hp || 100;
        this.atk = stats.atk || 10;
        this.mAtk = stats.mAtk || 0;
        this.def = stats.def || 0;
        this.fireRes = stats.fireRes || 0;
        this.iceRes = stats.iceRes || 0;
        this.lightningRes = stats.lightningRes || 0;
        this.isTacticalCommandActive = false;
        this.equipment = { weapon: null };
    }

    getTotalAtk() {
        const base = this.atk;
        return this.isTacticalCommandActive ? base * 1.5 : base;
    }

    getWeaponPrefix() {
        return (this.equipment.weapon && this.equipment.weapon.prefix) ? this.equipment.weapon.prefix : null;
    }

    takeDamage(amount, element = null) {
        let finalDamage = Math.max(1, amount - this.def);
        if (element) {
            let res = 0;
            if (element === 'fire') res = this.fireRes;
            else if (element === 'ice') res = this.iceRes;
            else if (element === 'lightning') res = this.lightningRes;
            finalDamage *= (1 - (res / 100));
        }
        this.hp -= finalDamage;
        return finalDamage;
    }
}

function runTest() {
    console.log("=== Nickle Damage Simulation ===");

    // 1. Setup Nickle (Level 1 Stats approx)
    const nickle = new MockEntity('Nickle', { atk: 18 });
    const boss = new MockEntity('Raid Boss', { hp: 5000, def: 25 });

    console.log(`Nickle ATK: ${nickle.atk}, Boss DEF: ${boss.def}`);

    // TEST 1: Normal Attack (No Buff, No Weapon)
    let dmg = boss.takeDamage(nickle.atk);
    console.log(`[Test 1] Normal Attack: ${dmg.toFixed(1)} damage (Expected: 1.0 because 18-25 < 1)`);

    // TEST 2: Normal Attack + Weapon (Atk +50)
    nickle.atk += 50; // Simulate equipment bonus
    dmg = boss.takeDamage(nickle.atk);
    console.log(`[Test 2] Normal Attack + Weapon (Atk 68): ${dmg.toFixed(1)} damage (Expected: 43.0)`);
    nickle.atk -= 50;

    // TEST 3: Tactical Command (Wait, Archer uses this.atk BUG simulation)
    nickle.isTacticalCommandActive = true;
    // Current Buggy Implementation: uses nickle.atk
    dmg = boss.takeDamage(nickle.atk);
    console.log(`[Test 3] BUGGY Tactical Command (Using this.atk): ${dmg.toFixed(1)} damage (Expected: same as Test 1)`);

    // Fixed Implementation: uses getTotalAtk()
    dmg = boss.takeDamage(nickle.getTotalAtk());
    console.log(`[Test 4] FIXED Tactical Command (Using getTotalAtk): ${dmg.toFixed(1)} damage (Expected: 18*1.5 - 25 = 2.0)`);

    // TEST 5: Prime Mode
    console.log("\n--- Prime Mode Transformation ---");
    const originalAtk = nickle.atk;
    nickle.atk *= 1.5; // Nickle.js transformToPrime logic
    console.log(`Prime Nickle ATK: ${nickle.atk}`);

    // Prime + Tactical Command (Buggy)
    dmg = boss.takeDamage(nickle.atk);
    console.log(`[Test 5] Prime + TC (Buggy): ${dmg.toFixed(1)} per arrow (Expected: 27-25 = 2.0)`);

    // Prime + Tactical Command (Fixed)
    dmg = boss.takeDamage(nickle.getTotalAtk());
    console.log(`[Test 6] Prime + TC (Fixed): ${dmg.toFixed(1)} per arrow (Expected: 27*1.5 - 25 = 15.5)`);

    // TEST 7: Elemental Synergy
    console.log("\n--- Elemental Synergy ---");
    const icePrefix = { id: 'ice', element: 'ice' };
    dmg = boss.takeDamage(nickle.getTotalAtk(), 'ice');
    console.log(`[Test 7] Prime + TC + Ice (No Boss Res): ${dmg.toFixed(1)} damage`);

    boss.iceRes = 50;
    dmg = boss.takeDamage(nickle.getTotalAtk(), 'ice');
    console.log(`[Test 8] Prime + TC + Ice (Boss 50% Res): ${dmg.toFixed(1)} damage (Expected: 15.5 * 0.5 = 7.75)`);
}

runTest();
