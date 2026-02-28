// Mock Browser Globals to prevent Phaser crash in Node.js
const mockWindow = {
    addEventListener: () => { },
    removeEventListener: () => { },
    navigator: { userAgent: 'node' },
    document: {
        createElement: () => ({ getContext: () => null, style: {} }),
        readyState: 'complete'
    }
};
Object.defineProperty(global, 'window', { value: mockWindow, writable: true });
Object.defineProperty(global, 'navigator', { value: mockWindow.navigator, writable: true });
Object.defineProperty(global, 'document', { value: mockWindow.document, writable: true });
global.Image = class { };

// Dynamic import to ensure mocks apply before Phaser is loaded
import('./src/modules/AI/NodeCharmManager.js').then((m) => {
    const NodeCharmManager = m.default;
    const { NODE_CHARMS } = m;
    const BehaviorTreeManager = require('./src/modules/AI/BehaviorTreeManager.js');
    const { Selector, Sequence, Action } = BehaviorTreeManager;
    const applyMeleeAI = require('./src/modules/AI/MeleeAI.js').default;

    console.log("--- Starting Node Charm AI Headless Test ---");

    // Unified Dummy Agent Generator
    function createDummy(id, team, x, y, hp, maxHp, aiType = 'MELEE') {
        const dummy = {
            id, team, x, y, hp, maxHp, unitName: id, active: true,
            config: { id, aiType },
            body: { radius: 10, setVelocity: () => { } },
            blackboard: null,
            btManager: null,
            bonusSpeed: 0,
            scene: {
                physics: { moveToObject: () => { } },
                time: { now: 100 },
                tweens: { killTweensOf: () => { }, add: () => { } }
            }
        };
        return dummy;
    }

    // SCENARIO 1: Hater (😠) overrides Melee closest target
    const merc = createDummy('Warrior', 'player', 0, 0, 100, 100, 'MELEE');
    merc.nodeCharms = [NODE_CHARMS.node_hater];

    // Nearest is normal, furthest is support
    const enemy1 = createDummy('E_Normal', 'enemy', 50, 0, 100, 100, 'MELEE');
    const enemy2 = createDummy('E_Support', 'enemy', 200, 0, 100, 100, 'SUPPORT');

    merc.targetGroup = { getChildren: () => [enemy1, enemy2] };

    // Apply standard MeleeAI (it will inject NodeCharmManager internally)
    applyMeleeAI(merc, () => [enemy1, enemy2]);
    merc.btManager.step();

    const target1 = merc.blackboard.get('target');
    console.log(`[Test 1: Hater 😠] Target is: ${target1 ? target1.id : 'null'}`);
    if (target1 && target1.id === 'E_Support') console.log("✅ Success: Ignored closer enemy to target Support.");
    else console.error("❌ Failed: Did not target support.");

    // SCENARIO 2: Blood Scent (🩸) speeds up to low HP target
    const ranger = createDummy('Archer', 'player', 0, 0, 100, 100, 'RANGED');
    ranger.nodeCharms = [NODE_CHARMS.node_blood];

    const enemyHealthy = createDummy('E_Healthy', 'enemy', 50, 0, 100, 100);
    const enemyLow = createDummy('E_Low', 'enemy', 150, 0, 20, 100); // 20% HP

    ranger.targetGroup = { getChildren: () => [enemyHealthy, enemyLow] };

    applyMeleeAI(ranger, () => [enemyHealthy, enemyLow]); // Using MeleeAI wrapper for simplicity of test
    ranger.btManager.step();

    const target2 = ranger.blackboard.get('target');
    console.log(`\n[Test 2: Blood 🩸] Target is: ${target2 ? target2.id : 'null'}`);
    console.log(`[Test 2: Blood 🩸] Bonus Speed: ${ranger.bonusSpeed}`);
    if (target2 && target2.id === 'E_Low' && ranger.bonusSpeed > 0) console.log("✅ Success: Targeted low HP and gained speed.");
    else console.error("❌ Failed: Did not target low HP or didn't gain speed.");

    // SCENARIO 3: Guard (🛡️) protects lowest HP ally
    const tank = createDummy('Tank', 'player', 0, 0, 200, 200, 'MELEE');
    tank.nodeCharms = [NODE_CHARMS.node_guard];

    const allyHealthy = createDummy('A_Healthy', 'player', 50, 0, 100, 100);
    const allyLow = createDummy('A_Low', 'player', 300, 0, 10, 100); // 10% HP
    const enemyNearAlly = createDummy('E_Assassin', 'enemy', 350, 0, 100, 100); // Near A_Low
    const enemyNearTank = createDummy('E_Grunt', 'enemy', 50, 50, 100, 100); // Near tank

    tank.allyGroup = { getChildren: () => [tank, allyHealthy, allyLow] };
    tank.targetGroup = { getChildren: () => [enemyNearAlly, enemyNearTank] };

    applyMeleeAI(tank, () => [enemyNearAlly, enemyNearTank]);
    tank.btManager.step();

    // Since tank is far from A_Low (300px), it should move to A_Low first
    console.log(`\n[Test 3: Guard 🛡️] Step 1: Tank far from wounded ally`);
    let target3 = tank.blackboard.get('target');
    console.log(`[Test 3: Guard 🛡️] Target for attack: ${target3 ? target3.id : 'null'}`);

    if (tank.btManager.lastActiveNodeName === 'Sequence: Guard' || !target3) console.log("✅ Success: Tank is moving to protect ally instead of attacking nearest enemy.");
    else console.error("❌ Failed: Tank did not prioritize guarding.");

    // Simulate tank reaching ally
    tank.x = 280;
    console.log(`[Test 3: Guard 🛡️] Step 2: Tank is now near wounded ally`);
    tank.btManager.step();

    target3 = tank.blackboard.get('target');
    console.log(`[Test 3: Guard 🛡️] Target for attack: ${target3 ? target3.id : 'null'}`);
    if (target3 && target3.id === 'E_Assassin') console.log("✅ Success: Tank attacks the assassin near the ally!");
    else console.error("❌ Failed: Tank did not attack the threat.");

    console.log("\n--- Node Charm AI Test Complete ---");
}).catch(console.error);
