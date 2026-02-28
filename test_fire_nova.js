
import CharmManager from './src/modules/Core/CharmManager.js';

// Mocking the required objects for testing
const mockUnit = {
    unitName: 'TestWarrior',
    atk: 100,
    mAtk: 50,
    maxHp: 500,
    x: 100,
    y: 100,
    getTotalAtk: () => 100,
    getTotalMAtk: () => 50,
    scene: {
        aoeManager: {
            triggerAoe: (x, y, radius, damage, attacker, targetGroup, isMagic, isUltimate, element) => {
                console.log(`[TEST] triggerAoe CALLED: x=${x}, y=${y}, radius=${radius}, damage=${damage}, isMagic=${isMagic}, element=${element}`);
                mockUnit.lastAoe = { x, y, radius, damage, isMagic, element };
            }
        },
        fxManager: {
            showFireNovaEffect: (target) => {
                console.log(`[TEST] showFireNovaEffect CALLED for ${target.unitName}`);
                mockUnit.fxCalled = true;
            }
        }
    }
};

console.log("==========================================");
console.log("      🎇 Fire Nova Charm Logic Test 🎇      ");
console.log("==========================================\n");

const fireNova = CharmManager.getCharm('emoji_fireworks');
if (!fireNova) {
    console.error("FAILED: emoji_fireworks not found in CharmManager!");
    process.exit(1);
}

console.log(`Charm: ${fireNova.name}`);
console.log(`Interval: ${fireNova.interval}ms`);

// 1. Damage Calculation Test (Max of Atk/MAtk)
console.log("\n[Test 1] Damage Calculation (ATK 100, MATK 50)...");
fireNova.effect(mockUnit);
if (mockUnit.lastAoe && mockUnit.lastAoe.damage === 120) {
    console.log("SUCCESS: Damage is 120 (120% of 100).");
} else {
    console.error(`FAILED: Expected 120, got ${mockUnit.lastAoe ? mockUnit.lastAoe.damage : 'null'}`);
}

// 2. Damage Calculation Test (ATK 50, MATK 200)
console.log("\n[Test 2] Damage Calculation (ATK 50, MATK 200)...");
mockUnit.getTotalAtk = () => 50;
mockUnit.getTotalMAtk = () => 200;
fireNova.effect(mockUnit);
if (mockUnit.lastAoe && mockUnit.lastAoe.damage === 240) {
    console.log("SUCCESS: Damage is 240 (120% of 200).");
    console.log(`isMagic Check: ${mockUnit.lastAoe.isMagic}`);
} else {
    console.error(`FAILED: Expected 240, got ${mockUnit.lastAoe ? mockUnit.lastAoe.damage : 'null'}`);
}

// 3. Attribute Check
console.log("\n[Test 3] Attribute Check...");
if (mockUnit.lastAoe.element === 'fire') {
    console.log("SUCCESS: Element is 'fire'.");
} else {
    console.error(`FAILED: Expected 'fire', got ${mockUnit.lastAoe.element}`);
}

// 4. Time Simulation (Mocking the loop in Mercenary.js pattern)
console.log("\n[Test 4] Cooldown Simulation (15s)...");
let timer = 0;
let triggerCount = 0;
const delta = 1000; // 1 second increments

for (let i = 1; i <= 30; i++) {
    timer += delta;
    if (timer >= fireNova.interval) {
        timer = 0;
        fireNova.effect(mockUnit);
        triggerCount++;
        console.log(`  > Time: ${i}s - Triggered!`);
    }
}

// 5. Spark Nova Check
console.log("\n[Test 5] Spark Nova (🎇) Logic...");
const sparkNova = CharmManager.getCharm('emoji_sparkler');
sparkNova.effect(mockUnit);
if (mockUnit.lastAoe.element === 'lightning') {
    console.log("SUCCESS: Element is 'lightning'.");
} else {
    console.error(`FAILED: Expected 'lightning', got ${mockUnit.lastAoe.element}`);
}

// 6. Ice Nova Check
console.log("\n[Test 6] Ice Nova (🎏) Logic...");
const iceNova = CharmManager.getCharm('emoji_koinobori');
iceNova.effect(mockUnit);
if (mockUnit.lastAoe.element === 'ice') {
    console.log("SUCCESS: Element is 'ice'.");
} else {
    console.error(`FAILED: Expected 'ice', got ${mockUnit.lastAoe.element}`);
}

console.log("\n==========================================");
console.log("                Test Complete             ");
console.log("==========================================");
