import { StageConfigs } from './EntityStats.js';
import CharmManager from './CharmManager.js';
import DBManager from '../Database/DBManager.js';
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
    static async applyAll(unit) {
        if (!unit.grimoire) this.initGrimoire(unit);

        await this.applyChapterA(unit); // Passive Stat Bonuses
        this.applyChapterB(unit); // Tactical AI
        this.applyChapterC(unit); // Class Stats
        this.applyChapterD(unit); // Transformation
    }

    /**
     * Chapter A: Passive Stat Bonuses (formerly Active Periodic)
     */
    static async applyChapterA(unit) {
        if (!unit.grimoireBonuses) {
            unit.grimoireBonuses = {
                maxHpMult: 0,
                atkMult: 0,
                mAtkMult: 0,
                defMult: 0,
                mDefMult: 0,
                fireResAdd: 0,
                iceResAdd: 0,
                lightningResAdd: 0,
                speedAdd: 0,
                critAdd: 0
            };
        }

        // Reset Bonuses
        Object.keys(unit.grimoireBonuses).forEach(key => unit.grimoireBonuses[key] = 0);

        const charms = unit.grimoire[this.CHAPTERS.ACTIVE];
        if (!charms) return;

        for (const charmEntry of charms) {
            if (!charmEntry) continue;

            // charmEntry can be a string (id) for simple monsters, 
            // or an object/instanceId for mercenaries.
            let charmData = null;
            let value = 0;

            if (typeof charmEntry === 'object' && charmEntry.stat && charmEntry.value) {
                // Direct object (already loaded)
                charmData = CharmManager.getCharm(charmEntry.id);
                value = charmEntry.value;
            } else if (typeof charmEntry === 'string') {
                if (charmEntry.startsWith('charm_')) {
                    // It's an instanceId, fetch from DB
                    try {
                        const instance = await DBManager.getCharmInstance(charmEntry);
                        if (instance) {
                            charmData = CharmManager.getCharm(instance.id);
                            value = instance.value;
                        }
                    } catch (e) {
                        console.error(`[Grimoire] Failed to fetch charm instance ${charmEntry}:`, e);
                    }
                } else {
                    // It's a base ID (used for monsters/elites)
                    charmData = CharmManager.getCharm(charmEntry);

                    // Progressive randomization for monsters
                    const stageConfig = StageConfigs[unit.scene?.dungeonType] || StageConfigs.CURSED_FOREST;
                    const dungeonMult = stageConfig.goldMultiplier || 1.0;
                    const level = unit.level || 1;
                    const isElite = unit.isElite || false;
                    const isShadow = unit.unitName?.toLowerCase().includes('shadow') || false;

                    const advantage = (dungeonMult - 1) * 1.2 + (level / 20) + (isShadow ? 3 : (isElite ? 1 : 0));
                    const minRoll = 2 + Math.floor(advantage / 2);
                    const maxRoll = 8 + Math.floor(advantage);

                    value = Math.floor(Math.random() * (maxRoll - minRoll + 1)) + minRoll;
                }
            }

            if (charmData && charmData.stat) {
                const stat = charmData.stat;
                const bonusValue = value / 100; // Convert 10% to 0.1

                if (!unit.id.startsWith('merc_')) {
                    console.log(`[Grimoire] Applying Random Charm to ${unit.unitName}: ${charmData.id} (${value}%)`);
                }

                if (stat === 'maxHp') unit.grimoireBonuses.maxHpMult += bonusValue;
                else if (stat === 'atk') unit.grimoireBonuses.atkMult += bonusValue;
                else if (stat === 'mAtk') unit.grimoireBonuses.mAtkMult += bonusValue;
                else if (stat === 'fireRes') unit.grimoireBonuses.fireResAdd += value; // Resists are additive 
                else if (stat === 'iceRes') unit.grimoireBonuses.iceResAdd += value;
                else if (stat === 'lightningRes') unit.grimoireBonuses.lightningResAdd += value;
                else if (stat === 'speed') unit.grimoireBonuses.speedAdd += value;
                else if (stat === 'crit') unit.grimoireBonuses.critAdd += value;
            }
        }

        unit.charms = charms;
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
