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
    triggerAoe(x, y, radius, damage, attacker = null, targetGroup = null, isMagic = true, isUltimate = false, element = null, isCritical = false) {
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

        // --- Centralized Synergy Check ---
        let finalRadius = radius;
        let weaponElement = null;
        let weaponSuffix = null;

        if (attacker && attacker.getWeaponPrefix) {
            const prefix = attacker.getWeaponPrefix();
            if (prefix) weaponElement = prefix.element;

            // FUTURE: Handle Enhance Suffix (e.g., Increase radius)
            // if (weaponSuffix === 'enhance') finalRadius *= 1.5;
        }

        const units = group.getChildren().filter(u => u && u.active && u.hp > 0);
        const affectedUnits = [];

        console.log(`[AoeManager] AOE at (${Math.round(x)}, ${Math.round(y)}) with radius ${finalRadius}. Targets alive: ${units.length}, isUltimate: ${isUltimate}`);

        units.forEach(unit => {
            const dist = Phaser.Math.Distance.Between(x, y, unit.x, unit.y);
            if (dist <= finalRadius) {
                console.log(`[AOE] HIT SUCCESS: ${unit.unitName} at dist ${Math.round(dist)}`);

                // 1. Primary Skill Element inheritance/synergy
                // If skill has no element, use weapon's element.
                // If skill has an element AND weapon has a different element, both are applied.
                const skillElement = element;
                const activeElements = [];
                if (skillElement) activeElements.push(skillElement);
                if (weaponElement && weaponElement !== skillElement) {
                    activeElements.push(weaponElement);
                    console.log(`[AoeManager] Weapon synergy detected: adding ${weaponElement} to ${skillElement || 'Neutral'} skill.`);
                }

                // Apply Damage
                if (isMagic && unit.takeMagicDamage) {
                    unit.takeMagicDamage(damage, attacker, isUltimate, skillElement, isCritical, 0);
                    // Apply secondary element bonus if mixed
                    if (activeElements.length > 1) {
                        unit.takeMagicDamage(0, attacker, isUltimate, weaponElement, isCritical, 150);
                    }
                } else if (unit.takeDamage) {
                    unit.takeDamage(damage, attacker, isUltimate, skillElement, isCritical, 0);
                    if (activeElements.length > 1) {
                        unit.takeDamage(0, attacker, isUltimate, weaponElement, isCritical, 150);
                    }
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
