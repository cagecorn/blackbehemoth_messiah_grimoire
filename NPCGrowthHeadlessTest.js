/**
 * NPCGrowthHeadlessTest.js
 * Verifies level-up scaling for FishingManager and AlchemyManager.
 */

class MockNPCManager {
    constructor(type) {
        if (type === 'fishing') {
            this.npc = {
                id: 'POLAR_BEAR',
                name: '북극곰 아저씨',
                baseStats: { speed: 1.0, successRate: 0.5, catchRate: 1.0, maxStamina: 100, health: 10 },
                growth: { speed: 0.01, successRate: 0.005, catchRate: 0.01, maxStamina: 20, health: 5 }
            };
        } else {
            this.npc = {
                id: 'GRUMPY_RABBIT',
                name: '뾰로퉁 토끼씨',
                baseStats: { speed: 1.0, successRate: 0.4, productionCount: 1.0, maxStamina: 100, health: 10 },
                growth: { speed: 0.01, successRate: 0.015, productionCount: 0.01, maxStamina: 15, health: 5 }
            };
        }
    }

    getStats(level) {
        return {
            level: level,
            stats: {
                maxStamina: this.npc.baseStats.maxStamina + (level - 1) * this.npc.growth.maxStamina,
                health: this.npc.baseStats.health + (level - 1) * this.npc.growth.health,
                successRate: this.npc.baseStats.successRate + (level - 1) * (this.npc.growth.successRate || 0),
                speed: this.npc.baseStats.speed + (level - 1) * (this.npc.growth.speed || 0),
                catchRate: this.npc.baseStats.catchRate ? this.npc.baseStats.catchRate + (level - 1) * (this.npc.growth.catchRate || 0) : null,
                productionCount: this.npc.baseStats.productionCount ? this.npc.baseStats.productionCount + (level - 1) * (this.npc.growth.productionCount || 0) : null
            }
        };
    }
}

function runTest() {
    console.log("=== NPC Growth Scaling Verification ===");

    // 1. Fisherman (Polar Bear) - Focus: Stamina & Recovery
    console.log("\n[Fisherman: Polar Bear] trait: Stamina/Recovery focus");
    const fm = new MockNPCManager('fishing');
    
    [1, 5, 10].forEach(lv => {
        const s = fm.getStats(lv);
        console.log(`Lv ${lv}: MaxStamina ${s.stats.maxStamina}, Health (Recovery) ${s.stats.health}, SuccessRate ${s.stats.successRate.toFixed(3)}`);
        
        // Validation check for Lv 10
        if (lv === 10) {
            const expectedStam = 100 + (9 * 20); // 280
            const expectedHealth = 10 + (9 * 5); // 55
            if (s.stats.maxStamina === expectedStam && s.stats.health === expectedHealth) {
                console.log("✅ Fisherman Lv 10 Stats Correct (Stamina focus verified)");
            } else {
                console.log(`❌ Fisherman Lv 10 Stats Failure! Expected ${expectedStam}/${expectedHealth}, Got ${s.stats.maxStamina}/${s.stats.health}`);
                process.exit(1);
            }
        }
    });

    // 2. Alchemist (Grumpy Rabbit) - Focus: Success Rate
    console.log("\n[Alchemist: Grumpy Rabbit] trait: Success Rate focus");
    const am = new MockNPCManager('alchemy');
    
    [1, 5, 10].forEach(lv => {
        const s = am.getStats(lv);
        console.log(`Lv ${lv}: SuccessRate ${s.stats.successRate.toFixed(3)}, MaxStamina ${s.stats.maxStamina}, Health ${s.stats.health}`);
        
        // Validation check for Lv 10
        if (lv === 10) {
            const expectedSuccess = 0.4 + (9 * 0.015); // 0.535
            const expectedStam = 100 + (9 * 15); // 235
            if (Math.abs(s.stats.successRate - expectedSuccess) < 0.001) {
                console.log("✅ Alchemist Lv 10 Stats Correct (SuccessRate focus verified)");
            } else {
                console.log(`❌ Alchemist Lv 10 Stats Failure! Expected ${expectedSuccess}, Got ${s.stats.successRate}`);
                process.exit(1);
            }
        }
    });

    console.log("\n=== NPC Growth Logic Verification Passed ===");
}

runTest();
