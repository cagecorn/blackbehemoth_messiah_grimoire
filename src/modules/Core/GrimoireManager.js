import CharmManager from './CharmManager.js';
import NodeCharmManager from '../AI/NodeCharmManager.js';

/**
 * GrimoireManager.js
 * 
 * Manages the "Grimoire Inventory" for all unit types.
 * Standardizes 4 chapters of Emoji (Hieroglyphs).
 */
export default class GrimoireManager {
    static CHAPTERS = {
        ACTIVE: 'chapter_a',         // Periodic Skills (Nova)
        TACTICAL: 'chapter_b',      // AI Behaviors (Nodes)
        CLASS: 'chapter_c',         // Class Specific (Former Perks)
        TRANSFORMATION: 'chapter_d' // Mid-boss Evolution
    };

    /**
     * Initializes a unit with a Grimoire structure if not already present.
     * @param {Object} unit The Mercenary or BaseMonster
     */
    static initGrimoire(unit) {
        if (!unit.grimoire) {
            unit.grimoire = {
                [this.CHAPTERS.ACTIVE]: Array(9).fill(null),
                [this.CHAPTERS.TACTICAL]: Array(3).fill(null),
                [this.CHAPTERS.CLASS]: Array(6).fill(null),
                [this.CHAPTERS.TRANSFORMATION]: Array(1).fill(null)
            };
        }
    }

    /**
     * Applies all active effects in the Grimoire to the unit.
     */
    static applyAll(unit) {
        if (!unit.grimoire) this.initGrimoire(unit);

        this.applyChapterA(unit); // Active / Periodic
        this.applyChapterB(unit); // Tactical AI (Handled via BT transition usually)
        this.applyChapterC(unit); // Class Stats
        this.applyChapterD(unit); // Transformation
    }

    /**
     * Chapter A: Active Periodic Effects
     */
    static applyChapterA(unit) {
        // Active charms are usually handled in unit.update -> updateCharmEffects
        // We ensure the unit's legacy 'charms' array points to Grimoire Chapter A.
        unit.charms = unit.grimoire[this.CHAPTERS.ACTIVE];
    }

    /**
     * Chapter B: Tactical AI Nodes
     */
    static applyChapterB(unit) {
        // Tactical nodes are usually handled in initAI or BT creation.
        // We ensure the unit's legacy 'nodeCharms' array points to Grimoire Chapter B.
        unit.nodeCharms = unit.grimoire[this.CHAPTERS.TACTICAL];
        if (unit.initAI) unit.initAI(); // Re-initialize AI to inject nodes
    }

    /**
     * Chapter C: Class Charms (Stats & Mechanics)
     */
    static applyChapterC(unit) {
        // Class charms are formerly perks. 
        // We ensure the unit's legacy 'activatedPerks' array points to Grimoire Chapter C.
        // During migration, we filter out nulls.
        const classCharms = unit.grimoire[this.CHAPTERS.CLASS];
        unit.activatedPerks = classCharms.filter(id => id !== null);
    }

    /**
     * Chapter D: Transformation (Stats + Sprite)
     */
    static applyChapterD(unit) {
        const transCharmId = unit.grimoire[this.CHAPTERS.TRANSFORMATION][0];
        if (!transCharmId) {
            // Restore original state if transformed before
            if (unit._originalConfig) {
                unit.unitName = unit._originalConfig.name;
                // Stat restoration logic would go here
            }
            return;
        }

        // Apply Transformation logic (Elite/Boss expansion)
        if (!unit._originalConfig) {
            unit._originalConfig = { name: unit.unitName, scale: unit.sprite.scale };
        }

        console.log(`[Grimoire] ${unit.unitName} is transforming via Chapter D: ${transCharmId}`);

        // Visual Transformation
        if (unit.sprite) {
            unit.sprite.setScale(unit._originalConfig.scale * 1.5);
            if (unit.scene.fxManager) {
                unit.scene.fxManager.showEmojiPopup(unit, '👑');
                // Remove previous transformation glow if it exists
                if (unit.grimoireGlow) {
                    unit.sprite.postFX.remove(unit.grimoireGlow);
                }
                unit.grimoireGlow = unit.sprite.postFX.addGlow(0xffd700, 2, 0, false, 0.1, 10);
            }
        }

        if (!unit.unitName.includes('👑')) {
            unit.unitName = `[👑] ${unit.unitName}`;
        }

        // Stat multipliers (Handled in getTotalAtk/Def getters in Mercenary/BaseMonster)
        unit.grimoire_transmult = 1.5; // Example +50% all stats
    }
}
