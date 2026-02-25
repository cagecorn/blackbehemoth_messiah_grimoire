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
                let skillElement = element;
                let weaponElementHit = null;

                if (weaponElement) {
                    if (!skillElement) {
                        // Neutral skill inherits weapon element
                        skillElement = weaponElement;
                        console.log(`[AoeManager] Neutral skill inherited weapon element: ${weaponElement}`);
                    } else {
                        // Skill has inherent element, weapon adds synergy hit (even if same element)
                        weaponElementHit = weaponElement;
                        console.log(`[AoeManager] Weapon synergy: adding ${weaponElement} to ${skillElement} skill.`);
                    }
                }

                // Apply Damage
                if (isMagic && unit.takeMagicDamage) {
                    unit.takeMagicDamage(damage, attacker, isUltimate, skillElement, isCritical, 0);
                    if (weaponElementHit && unit.active) {
                        unit.takeMagicDamage(0, attacker, isUltimate, weaponElementHit, isCritical, 150);
                    }
                } else if (unit.takeDamage) {
                    unit.takeDamage(damage, attacker, isUltimate, skillElement, isCritical, 0);
                    if (weaponElementHit && unit.active) {
                        unit.takeDamage(0, attacker, isUltimate, weaponElementHit, isCritical, 150);
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
