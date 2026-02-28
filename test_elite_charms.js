
import { CHARM_DATABASE } from './src/modules/Core/CharmManager.js';
import BaseMonster from './src/modules/AI/BaseMonster.js';

// Mocking Phaser and Scene
const mockScene = {
    time: { now: 0 },
    add: {
        circle: () => ({ setStrokeStyle: () => ({ setDepth: () => { } }) }),
        existing: () => { },
        image: () => ({ setDisplaySize: () => { }, setTint: () => { } }),
        tween: { add: () => { } },
        tweens: { add: () => { } }
    },
    physics: {
        add: {
            existing: (obj) => {
                obj.body = {
                    setCircle: () => { },
                    setOffset: () => { },
                    setCollideWorldBounds: () => { },
                    setVelocity: () => { },
                    speed: 0
                };
            }
        }
    },
    events: { emit: () => { }, on: () => { } },
    aoeManager: {
        triggerAoe: (x, y, radius, damage, attacker, targetGroup, isMagic, isUltimate, element) => {
            console.log(`[Test AOE] Triggered by ${attacker.unitName}, TargetGroup: ${targetGroup === mockScene.mercenaries ? 'Mercenaries' : 'Enemies'}, Element: ${element}`);
            mockScene.lastAoe = { attacker, targetGroup, element, damage };
        }
    },
    fxManager: {
        showElementalNovaEffect: (unit, element) => {
            console.log(`[Test FX] Nova Effect: ${element} on ${unit.unitName}`);
        }
    },
    mercenaries: { getChildren: () => [] },
    enemies: { getChildren: () => [], add: () => { } }
};

async function testEliteCharms() {
    console.log("--- Starting Elite Monster Charm Test ---");

    const eliteConfig = {
        id: 'test_elite',
        name: 'Elite Orc',
        sprite: 'orc_sprite',
        maxHp: 500,
        hp: 500,
        atk: 30,
        mAtk: 10,
        isElite: true,
        charms: ['emoji_fireworks', 'emoji_sparkler'], // Fire and Lightning
        team: 'enemy'
    };

    const monster = new BaseMonster(mockScene, 100, 100, eliteConfig);

    console.log(`Monster Name: ${monster.unitName}`);
    console.log(`Is Elite: ${monster.isElite}`);
    console.log(`Charms: ${monster.charms.filter(c => c).join(', ')}`);

    // Test periodic activation
    // Fireworks interval is 15000ms
    console.log("\nSimulating 15 seconds pass...");
    monster.updateCharmEffects(15001);

    if (mockScene.lastAoe) {
        const success = mockScene.lastAoe.attacker === monster &&
            mockScene.lastAoe.targetGroup === mockScene.mercenaries;

        console.log(`AOE Triggered: ${!!mockScene.lastAoe}`);
        console.log(`Targeting Correct (Mercenaries): ${mockScene.lastAoe.targetGroup === mockScene.mercenaries}`);
        console.log(`Element: ${mockScene.lastAoe.element}`);

        if (success) {
            console.log("✅ Elite Charm Logic Verified: Correct targeting and activation.");
        } else {
            console.error("❌ Elite Charm Logic Failed: Incorrect targeting or attacker.");
        }
    } else {
        console.error("❌ AOE was not triggered!");
    }

    console.log("\nSimulating another 15 seconds for second charm...");
    mockScene.lastAoe = null;
    monster.updateCharmEffects(15001);

    if (mockScene.lastAoe) {
        console.log(`Second AOE Element: ${mockScene.lastAoe.element}`);
        if (mockScene.lastAoe.element === 'lightning') {
            console.log("✅ Second charm (Spark Nova) correctly triggered.");
        }
    }

    console.log("--- Elite Monster Charm Test Finished ---");
}

testEliteCharms().catch(console.error);
