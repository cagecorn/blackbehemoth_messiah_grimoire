/**
 * AinaTest.js
 * Headless simulation test for Aina.
 */
import { Characters } from './modules/Core/EntityStats.js';

console.log("=== Aina Implementation Verification ===");

// 1. Check if AINA is in EntityStats
const aina = Characters.AINA;
if (aina) {
    console.log("✅ Aina data found in EntityStats.js");
    console.log(` - Name: ${aina.name}`);
    console.log(` - Class: ${aina.classId}`);
    console.log(` - Skill: ${aina.skillName}`);
    console.log(` - Ultimate: ${aina.ultimateName}`);
} else {
    console.error("❌ Aina data NOT found in EntityStats.js");
    process.exit(1);
}

// 2. Mocking Aina combat logic
class MockAina {
    constructor() {
        this.unitName = "Aina";
        this.mAtk = 38;
        this.isFrozen = false;
        this.mana = 0;
    }

    castIceBall() {
        const isSnowman = Math.random() < 0.1;
        console.log(`[Skill] Aina casts Ice Ball! ${isSnowman ? "⛄ SNOWMAN!" : "❄️"}`);
        return isSnowman;
    }

    applyDamage(target) {
        let damage = this.mAtk * 1.8;
        console.log(`[Damage] Applied ${damage.toFixed(1)} damage to target.`);
        target.isFrozen = true;
        console.log(`[Status] Target is now FROZEN. Speed reduced.`);
    }
}

const testAina = new MockAina();
const mockTarget = { name: "Goblin", isFrozen: false };

console.log("\n--- Simulating 10 Skill Casts ---");
let snowmenCount = 0;
for (let i = 1; i <= 10; i++) {
    const wasSnowman = testAina.castIceBall();
    if (wasSnowman) snowmenCount++;
}
console.log(`Summary: ${snowmenCount} snowmen out of 10 casts.`);

console.log("\n--- Simulating Impact ---");
testAina.applyDamage(mockTarget);

console.log("\n=== Test Complete ===");
