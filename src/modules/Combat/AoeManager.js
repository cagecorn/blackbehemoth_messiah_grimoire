import Phaser from 'phaser';

/**
 * AoeManager.js
 * Handles Area of Effect logic across the physical scene.
 */
export default class AoeManager {
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Triggers AOE damage originating from (x, y) within a radius.
     */
    triggerAoe(x, y, radius, damage, sourceId = null, targetGroup = null) {
        const group = targetGroup || this.scene.enemies;
        if (!group) return [];

        // Iterate over entities and apply damage if within radius
        const enemies = group.getChildren();
        const affectedEnemies = [];

        enemies.forEach(enemy => {
            if (enemy.hp <= 0) return;

            const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
            if (dist <= radius) {
                // Determine whether it's magic or physical. For now fireball is magic.
                enemy.takeMagicDamage(damage, sourceId);
                affectedEnemies.push(enemy);
            }
        });

        // Debug visual (optional, flashes a circle in the real scene)
        if (this.scene.physics && this.scene.physics.world.drawDebug) {
            // Just for testing if needed
        }

        console.log(`[AoeManager] AOE at (${Math.round(x)}, ${Math.round(y)}) with radius ${radius} hit ${affectedEnemies.length} targets.`);
        return affectedEnemies;
    }
}
