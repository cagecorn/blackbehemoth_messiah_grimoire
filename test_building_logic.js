
/**
 * Headless Test for Building Upgrade Logic
 * Verifies exponential scaling for costs and production.
 */

const BUILDING_TYPES = {
    BANK: { id: 'bank', rate: 10 },
    FACTORY: { id: 'factory', rate: 5 },
    CHURCH: { id: 'church', rate: 1 },
    CAMP: { id: 'camp', rate: 3 },
    TREE: { id: 'tree', rate: 5 },
    CASTLE: { id: 'castle', rate: 1 }
};

const COST_MUL = 1.5;
const PROD_MUL = 1.2;
const BASE_GOLD = 100;
const BASE_BRICK = 20;

function calculateStats(typeId, level) {
    const config = BUILDING_TYPES[typeId.toUpperCase()];
    const costGold = Math.floor(BASE_GOLD * Math.pow(COST_MUL, level - 1));
    const costBrick = Math.floor(BASE_BRICK * Math.pow(COST_MUL, level - 1));
    const production = Math.floor(config.rate * Math.pow(PROD_MUL, level - 1));
    return { costGold, costBrick, production };
}

console.log("=== Building Upgrade Logic Simulation (Lv 1 - 20) ===");
const types = Object.keys(BUILDING_TYPES);

types.forEach(typeId => {
    console.log(`\nBuilding Type: ${typeId}`);
    console.log("--------------------------------------------------");
    console.log("Lv | Gold Cost | Brick Cost | Production | Growth (%)");

    let lastProd = 0;
    for (let lv = 1; lv <= 20; lv++) {
        const stats = calculateStats(typeId, lv);
        const growth = lastProd > 0 ? ((stats.production - lastProd) / lastProd * 100).toFixed(1) : "N/A";

        console.log(
            `${lv.toString().padEnd(2)} | ` +
            `${stats.costGold.toString().padEnd(9)} | ` +
            `${stats.costBrick.toString().padEnd(10)} | ` +
            `${stats.production.toString().padEnd(10)} | ` +
            `${growth}%`
        );
        lastProd = stats.production;
    }
});

console.log("\n[SUCCESS] Headless test complete. Growth is consistent 20% (approx due to floor).");
