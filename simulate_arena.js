import HeadlessCombatEngine from './src/engine/HeadlessCombatEngine.js';

// Mock some unit states
const playerUnits = [
    { unitName: 'Aren', hp: 100, x: 100, y: 100, atk: 20, def: 10, speed: 100, acc: 90, eva: 10, atkRange: 50, atkSpd: 1000, skillName: 'ChargeAttack' },
    { unitName: 'Ella', hp: 80, x: 50, y: 50, atk: 15, def: 5, speed: 120, acc: 95, eva: 20, atkRange: 300, atkSpd: 800, skillName: 'KnockbackShot' }
];

const enemyUnits = [
    { unitName: 'Enemy Warrior', hp: 100, x: 400, y: 400, atk: 15, def: 8, speed: 80, acc: 85, eva: 5, atkRange: 50, atkSpd: 1200 },
    { unitName: 'Enemy Wizard', hp: 60, x: 450, y: 450, atk: 5, mAtk: 25, def: 2, speed: 90, acc: 100, eva: 15, atkRange: 400, atkSpd: 1500, skillName: 'SkillFireball' }
];

const engine = new HeadlessCombatEngine({ tickRate: 100 });
engine.setState(playerUnits, enemyUnits);

console.log("--- Starting Arena Headless Simulation ---");
for (let i = 0; i < 100; i++) { // 10 seconds of combat (100 ticks @ 100ms)
    engine.update();

    if (i % 10 === 0) {
        const state = engine.getState();
        console.log(`[Tick ${i}] Player: ${state.player.length}, Enemy: ${state.enemy.length}`);
    }

    if (engine.units.length <= 2) break; // End early if a team is wiped
}
console.log("--- Simulation Finished ---");
console.log("Final logs:");
engine.logs.forEach(log => console.log(log));
