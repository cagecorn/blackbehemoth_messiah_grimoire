import { Skins } from './src/modules/Core/EntityStats.js';

console.log("=== Headless Test: Nickle Fox Skin 'Tactical Command' ===");

const nickle = {
    unitName: "Nickle",
    hp: 100,
    active: true,
    atk: 1000,
    mAtk: 1000,
    atkSpd: 2000, // slower attack speed (higher is slower in this game's delay logic)
    bonusAtkSpd: 0,
    isTacticalCommandActive: false,
    skinConfig: Skins.NICKLE_FOX, // Has Fox Skin equipped
    getSkinBonus: function (skillId) {
        if (this.skinConfig && this.skinConfig.abilityBonus && this.skinConfig.abilityBonus.skillId === skillId) {
            return this.skinConfig.abilityBonus.effect;
        }
        return null;
    },
    getTotalAtkSpd: function () {
        return Math.max(100, this.atkSpd + this.bonusAtkSpd);
    }
};

const ally = {
    unitName: "Noah",
    hp: 100,
    active: true,
    atk: 800,
    mAtk: 800,
    atkSpd: 1500,
    bonusAtkSpd: 0,
    isTacticalCommandActive: false,
    skinConfig: null, // NO Skin equipped
    getSkinBonus: function (skillId) {
        if (this.skinConfig && this.skinConfig.abilityBonus && this.skinConfig.abilityBonus.skillId === skillId) {
            return this.skinConfig.abilityBonus.effect;
        }
        return null;
    },
    getTotalAtkSpd: function () {
        return Math.max(100, this.atkSpd + this.bonusAtkSpd);
    }
};

function applyBuffToTarget(target, caster) {
    target.isTacticalCommandActive = true;
    console.log(`\n--- Buffing ${target.unitName} ---`);
    console.log(`Original AtkSpd (delay): ${target.getTotalAtkSpd()}ms`);
    console.log(`isTacticalCommandActive flag (for +50% dmg): ${target.isTacticalCommandActive}`);

    let skinBonusAtkSpd = 0;

    // The correct logic from TacticalCommand.js: read skin from CASTER
    const skillId = 'tactical_command';
    const skinBonus = (caster.getSkinBonus) ? caster.getSkinBonus(skillId) : null;

    if (skinBonus && skinBonus.atkSpdMult) {
        skinBonusAtkSpd = -(target.atkSpd * skinBonus.atkSpdMult);
        target.bonusAtkSpd += skinBonusAtkSpd;
        console.log(`Skin Bonus applied to ${target.unitName} (${skinBonusAtkSpd}ms AtkSpd reduction from Caster's ${skinBonus.atkSpdMult * 100}%)`);
    }

    console.log(`New AtkSpd (delay): ${target.getTotalAtkSpd()}ms`);
}

// Emulate TacticalCommand execution:
applyBuffToTarget(nickle, nickle);
applyBuffToTarget(ally, nickle);

