/**
 * NickleRaidTest.js
 * Standalone Node.js simulation to verify Nickle's multi-hit damage logic.
 */

// Simulation of Phaser's distance formula
const getDistance = (x1, y1, x2, y2) => Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
const degToRad = (deg) => deg * (Math.PI / 180);

function simulateNickleUltimate(distanceToTarget) {
    console.log(`\n--- Simulating Nickle Ultimate Multi-hit (Distance: ${distanceToTarget}px) ---`);

    // 1. Setup Entities
    const nickle = { x: 0, y: 0 };
    const boss = { x: distanceToTarget, y: 0 };
    const hitThreshold = 80; // ProjectileManager.js threshold

    // 2. Fire Logic (Replicated from Nickle.js)
    const arrowCount = 5;
    const spreadAngle = degToRad(30); // 30 degrees total spread
    let hitsRegistered = 0;

    console.log(`Boss Center: (${boss.x}, ${boss.y}), Match Threshold: ${hitThreshold}px`);

    for (let i = 0; i < arrowCount; i++) {
        const angleOffset = (i - (arrowCount - 1) / 2) * (spreadAngle / (arrowCount - 1));
        const baseAngle = Math.atan2(boss.y - nickle.y, boss.x - nickle.x);
        const finalAngle = baseAngle + angleOffset;

        // Target point calculation (Replicated from Nickle.js)
        const tX = nickle.x + Math.cos(finalAngle) * distanceToTarget;
        const tY = nickle.y + Math.sin(finalAngle) * distanceToTarget;

        // Hit Detection Logic (Replicated from ProjectileManager.js - UPDATED)
        const distToCenter = getDistance(tX, tY, boss.x, boss.y);

        let dynamicThreshold = hitThreshold;
        const bossScale = 4.0; // From EntityStats.js for BOSS_GOBLIN
        if (bossScale > 1.2) {
            dynamicThreshold += (bossScale - 1) * 30;
        }

        const isHit = distToCenter <= dynamicThreshold;

        if (isHit) {
            hitsRegistered++;
        }

        console.log(` Arrow ${i + 1}: Target Point (${tX.toFixed(1)}, ${tY.toFixed(1)}), Dist: ${distToCenter.toFixed(1)}px, Threshold: ${dynamicThreshold}px -> ${isHit ? 'HIT! ✅' : 'MISS! ❌'}`);
    }

    console.log(`Total Hits: ${hitsRegistered} / ${arrowCount}`);
    return hitsRegistered;
}

// Run Tests
const results = [
    simulateNickleUltimate(150), // Close range
    simulateNickleUltimate(350), // Standard range
    simulateNickleUltimate(500), // Max range
    simulateNickleUltimate(700)  // Extreme range
];

console.log("\n--- Final Results Summary ---");
results.forEach((hits, i) => {
    const dist = [150, 350, 500, 700][i];
    console.log(`Distance ${dist}px: ${hits}/5 hits landed.`);
});

if (results[1] === 5) {
    console.log("\nCONCLUSION: Nickle's 5-arrow burst successfully lands ALL shots at standard attack range (350px).");
} else {
    console.log("\nCONCLUSION: Some arrows missed! spread might be too wide or threshold too narrow.");
}
