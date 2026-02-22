/**
 * TeleportTest.js
 * Run this in the browser console while in a combat scene (Dungeon/Arena) 
 * to verify Merlin's Teleport perk.
 */
(function verifyTeleport() {
    const scene = window.game.scene.getScenes(true)[0];
    if (!scene || !scene.mercenaries) {
        console.error("No active combat scene found!");
        return;
    }

    const merlin = scene.mercenaries.getChildren().find(m => m.characterId === 'merlin');
    if (!merlin) {
        console.error("Merlin not found in the current party!");
        return;
    }

    // 1. Force perk activation if not already learned
    if (!merlin.activatedPerks.includes('teleport')) {
        merlin.activatedPerks.push('teleport');
        console.log("Forced 'teleport' perk on Merlin.");
    }

    // 2. Clear nearby area to ensure clean test (optional)
    console.log("Simulating surround condition in 2 seconds...");

    setTimeout(() => {
        const x = merlin.x;
        const y = merlin.y;

        // 3. Spawn 3 enemies around Merlin
        console.log("Spawning enemies...");
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const ex = x + Math.cos(angle) * 30;
            const ey = y + Math.sin(angle) * 30;

            // Assuming scene.enemies is the physics group
            // We use a simple config for the enemy
            const enemyConfig = { id: `test_enemy_${i}`, name: "Test Enemy", sprite: "goblin_sprite", hp: 100, maxHp: 100 };

            // Using the scene's existing spawning logic if possible, 
            // but for a pure physics test, we can just create sprites
            // Ideally we use the scene's methods to be realistic
            if (scene.spawnUnit) {
                const enemy = scene.spawnUnit(enemyConfig, ex, ey, 'enemy', null);
                if (enemy) scene.enemies.add(enemy);
            }
        }

        console.log("Enemies spawned! Watch Merlin.");
    }, 2000);
})();
