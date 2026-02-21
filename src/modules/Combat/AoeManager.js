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
    triggerAoe(x, y, radius, damage, attacker = null, targetGroup = null, isMagic = true) {
        // If scene is dead, stop immediately
        if (!this.scene || !this.scene.scene || !this.scene.scene.isActive()) {
            console.error(`[AoeManager] triggerAoe called in INACTIVE scene!`);
            return [];
        }

        const group = targetGroup || this.scene.enemies;
        if (!group || !group.getChildren) {
            console.error(`[AoeManager] No valid target group!`);
            return [];
        }

        const units = group.getChildren().filter(u => u && u.active && u.hp > 0);
        const affectedUnits = [];

        console.log(`[AoeManager] AOE at (${Math.round(x)}, ${Math.round(y)}) with radius ${radius}. Targets alive: ${units.length}`);

        units.forEach(unit => {

            const dist = Phaser.Math.Distance.Between(x, y, unit.x, unit.y);
            if (dist <= radius) {
                console.log(`[AOE] HIT SUCCESS: ${unit.unitName} at dist ${Math.round(dist)}`);

                // Use standard damage methods
                if (isMagic && unit.takeMagicDamage) {
                    unit.takeMagicDamage(damage, attacker);
                } else if (unit.takeDamage) {
                    unit.takeDamage(damage, attacker);
                } else {
                    console.error(`[AoeManager] Unit ${unit.unitName} lacks takeDamage/takeMagicDamage methods!`);
                }
                affectedUnits.push(unit);
            }
        });

        console.log(`[AoeManager] AOE complete. Hit ${affectedUnits.length} targets.`);
        return affectedUnits;
    }
}
