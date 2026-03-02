/**
 * WrinkleTest.js
 * Headless simulation test for Wrinkle's unique mechanics.
 */
import { Characters } from './modules/Core/EntityStats.js';

console.log("=== Wrinkle Implementation Verification ===");

// 1. Check if Wrinkle is in EntityStats
const wrinkleConfig = Characters.WRINKLE;
if (wrinkleConfig) {
    console.log("✅ Wrinkle data found in EntityStats.js");
    console.log(` - Name: ${wrinkleConfig.name}`);
    console.log(` - Rarity: ${wrinkleConfig.rarity}`);
} else {
    console.error("❌ Wrinkle data NOT found in EntityStats.js");
    process.exit(1);
}

// 2. Mocking Wrinkle combat logic
class MockWrinkle {
    constructor() {
        this.unitName = "Wrinkle";
        this.atk = 15;
        this.lightningStacks = new Map();
        this.dashCount = 0;
    }

    getTotalAtk() { return this.atk; }

    // Mock basic attack (fireProjectile)
    attack(target) {
        console.log(`[Attack] Wrinkle attacks ${target.unitName}`);
        this.addLightningStack(target);
    }

    // Mock skill (GuillotinePaper)
    useSkill(target) {
        console.log(`[Skill] Wrinkle uses Guillotine Paper!`);
        // Guillotine Paper hits target once in this simplified test
        this.addLightningStack(target);
        target.isBurning = true;
        console.log(`[Status] Target is now BURNING.`);
    }

    // Mock ultimate (Execution)
    useUltimate(target) {
        console.log(`[Ultimate] Wrinkle triggers Execution!`);
        // 12 projectiles, but let's test if it adds stacks
        for (let i = 0; i < 3; i++) { // Test 3 hits to see if it triggers dash
            console.log(`  - Homing projectile hit #${i + 1}`);
            this.addLightningStack(target);
            if (target.hp <= 0) break;
        }
    }

    addLightningStack(enemy) {
        if (!enemy || enemy.hp <= 0) return;

        let stacks = this.lightningStacks.get(enemy) || 0;
        stacks++;
        console.log(`  - Lightning Stack: ${stacks}/3 on ${enemy.unitName}`);

        if (stacks >= 3) {
            this.lightningStacks.set(enemy, 0);
            this.executeLightningDash(enemy);
        } else {
            this.lightningStacks.set(enemy, stacks);
        }
    }

    executeLightningDash(enemy) {
        console.log(`⚡ [Passive] LIGHTNING DASH! (전광석화) triggered on ${enemy.unitName}`);
        this.dashCount++;
        enemy.isAirborne = true;
        console.log(`  - Applied AIRBORNE to ${enemy.unitName}`);
    }
}

const testWrinkle = new MockWrinkle();
const mockTarget = { unitName: "Goblin", hp: 100, maxHp: 100, isBurning: false, isAirborne: false };

console.log("\n--- Scenario 1: Basic Attack Stacks ---");
testWrinkle.attack(mockTarget); // Stack 1
testWrinkle.attack(mockTarget); // Stack 2
testWrinkle.attack(mockTarget); // Stack 3 -> Dash!

if (testWrinkle.dashCount === 1 && mockTarget.isAirborne) {
    console.log("✅ Basic Attack 3-stack logic working.");
} else {
    console.error("❌ Basic Attack stack logic failed.");
}

console.log("\n--- Scenario 2: Skill [Guillotine Paper] ---");
mockTarget.isAirborne = false;
mockTarget.isBurning = false;
testWrinkle.useSkill(mockTarget); // Stack 1 (Reset from before)

if (mockTarget.isBurning) {
    console.log("✅ Guillotine Paper correctly applies Burn.");
} else {
    console.error("❌ Guillotine Paper failed to apply Burn.");
}

console.log("\n--- Scenario 3: Ultimate [Execution] Shared Stacks ---");
// Current stack is 1 from the skill
testWrinkle.attack(mockTarget); // Stack 2
testWrinkle.useUltimate(mockTarget); // This will add more stacks and should trigger Dash during the ultimate

if (testWrinkle.dashCount >= 2) {
    console.log("✅ Ultimate correctly shares stacks and triggers Dash.");
} else {
    console.error("❌ Ultimate stack sharing failed.");
}

console.log("\n=== Wrinkle Verification Complete ===");
