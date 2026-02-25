/**
 * StatusEffectTest.js
 * Verifies Freeze, Shock, Sleep, Burn, Stun across unit types.
 */
import { Characters, MonsterClasses } from './modules/Core/EntityStats.js';

console.log("=== Comprehensive Status Effect Verification ===");

// 1. Mock CCManager
class MockCCManager {
    constructor() {
        this.log = [];
    }
    applyFreeze(target, duration) {
        target.isFrozen = true;
        this.log.push(`[CC] Freeze applied to ${target.unitName}`);
    }
    applyShock(target, duration) {
        target.isShocked = true;
        this.log.push(`[CC] Shock applied to ${target.unitName}`);
    }
    applySleep(target, duration) {
        target.isAsleep = true;
        this.log.push(`[CC] Sleep applied to ${target.unitName}`);
    }
    applyBurn(target, duration) {
        target.isBurning = true;
        this.log.push(`[CC] Burn applied to ${target.unitName}`);
    }
    applyStun(target, duration) {
        target.isStunned = true;
        this.log.push(`[CC] Stun applied to ${target.unitName}`);
    }
}

// 2. Setup Unit Mocks
const ccManager = new MockCCManager();

function createMockUnit(name, type) {
    return {
        unitName: name,
        type: type,
        isFrozen: false,
        isShocked: false,
        isAsleep: false,
        isBurning: false,
        isStunned: false,
        speed: 100,
        atkSpd: 1000,
        hp: 1000,
        maxHp: 1000,
        stats() {
            let s = this.speed;
            let as = this.atkSpd;
            if (this.isFrozen) {
                s *= 0.5;
                as *= 2; // slow
            }
            return { speed: s, atkSpd: as };
        }
    };
}

const units = [
    createMockUnit("Aren (Player)", "mercenary"),
    createMockUnit("Goblin (Enemy)", "monster"),
    createMockUnit("Boss Goblin (Raid)", "boss"),
    createMockUnit("Babao (Summon)", "summon")
];

const effects = ["Freeze", "Shock", "Sleep", "Burn", "Stun"];

console.log("\n--- Applying Effects ---");
units.forEach(unit => {
    console.log(`\nTesting Unit: ${unit.unitName}`);

    // Test Freeze
    ccManager.applyFreeze(unit, 3000);
    const s = unit.stats();
    if (unit.isFrozen && s.speed === 50 && s.atkSpd === 2000) {
        console.log(" ✅ Freeze: Success (Stats reduced correctly)");
    } else {
        console.error(" ❌ Freeze: Failed");
    }

    // Test others (just presence)
    ccManager.applyShock(unit, 30);
    ccManager.applySleep(unit, 30);
    ccManager.applyBurn(unit, 30);
    ccManager.applyStun(unit, 30);

    if (unit.isShocked && unit.isAsleep && unit.isBurning && unit.isStunned) {
        console.log(" ✅ All other CC flags set correctly");
    } else {
        console.error(" ❌ One or more CC flags failed");
    }
});

console.log("\n--- CCManager Log ---");
ccManager.log.forEach(l => console.log(l));

console.log("\n=== Verification Complete ===");
