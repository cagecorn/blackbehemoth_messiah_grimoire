import MusicalMagicalCritical from './src/modules/Skills/MusicalMagicalCritical.js';

console.log("=== Headless Test: Nana Idol Skin 'Musical Magical Critical' ===");

const skill = new MusicalMagicalCritical();
// Mock the cooldown so it is ready
skill.lastCastTime = -20000;

const ally1 = { active: true, hp: 100, x: 10, y: 10 };
const enemy1 = { active: true, hp: 100, x: 500, y: 500 };

const mockNana = {
    unitName: "Nana",
    active: true,
    hp: 100,
    getTotalMAtk: () => 100,
    scene: {
        time: { now: 1000, delayedCall: (d, cb) => cb() },
        aoeManager: { triggerAoe: (x, y, r, d, c, t, z) => console.log(`Triggered AoE at (${x}, ${y}) damage: ${d}`) },
        buffManager: { applyBuff: (t, c, id, d) => console.log(`Applied buff to ${t === ally1 ? "Ally" : "Unknown"}`) },
        fxManager: { showDamageText: (t, text) => console.log(`FX: ${text}`), createSparkleEffect: () => { } },
        tweens: { add: () => { } },
        add: { circle: () => ({ setDepth: () => { }, setPreFX: () => ({ addBlur: () => { } }), destroy: () => { } }), image: () => ({ setDepth: () => ({ setScale: () => ({ setAlpha: () => ({ destroy: () => { } }) }) }) }) }
    },
    allyGroup: { getChildren: () => [ally1] },
    targetGroup: { getChildren: () => [enemy1] },
    getSkinBonus: (id) => {
        if (id === 'musical_magical_critical') {
            return { dualZone: true };
        }
        return null;
    }
};

const mockNormalNana = {
    ...mockNana,
    getSkinBonus: () => null
};

console.log("\n--- Testing Normal Nana ---");
skill.lastCastTime = -20000;
skill.execute(mockNormalNana);

console.log("\n--- Testing Idol Nana (dualZone: true) ---");
skill.lastCastTime = -20000;
skill.execute(mockNana);
