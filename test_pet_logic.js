/**
 * test_pet_logic.js
 * Headless test to verify pet passive bonuses and stat scaling.
 */

import { scaleStats, PetStats } from './src/modules/Core/EntityStats.js';

// --- Mocks ---
const mockPartyManager = {
    activePet: 'wolf_pet',
    getGlobalPetBonus: function (statName) {
        if (!this.activePet) return 0;
        const petConfig = PetStats[this.activePet.toUpperCase()];
        if (!petConfig || !petConfig.passive || !petConfig.passive.effect) return 0;
        const effect = petConfig.passive.effect;
        if (statName === 'atkMult' && effect.atkMult) return effect.atkMult;
        if (statName === 'mAtkMult' && effect.mAtkMult) return effect.mAtkMult;
        return 0;
    }
};

const mockScene = {
    game: {
        partyManager: mockPartyManager
    }
};

class MockMercenary {
    constructor(atk, mAtk) {
        this.atk = atk;
        this.mAtk = mAtk;
        this.bonusAtk = 0;
        this.bonusMAtk = 0;
        this.equipment = { weapon: { stats: { atk: 10 } } };
        this.scene = mockScene;
        this.grimoire_transmult = 1.0;
    }

    getEquipmentBonus(statName) {
        if (statName === 'atk') return 10;
        return 0;
    }

    getTotalAtk() {
        const base = (this.atk || 0) + this.getEquipmentBonus('atk');
        const additions = (this.bonusAtk || 0);
        let multipliers = 0;
        const petBonus = this.scene.game.partyManager?.getGlobalPetBonus('atkMult') || 0;
        multipliers += petBonus;
        return (base + additions) * (1 + multipliers);
    }
}

// --- Tests ---

function testWolfPetBonus() {
    console.log("Testing Wolf Pet Passive (+5% ATK)...");
    const merc = new MockMercenary(100, 50);
    // Base(100) + Equip(10) = 110. 110 * 1.05 = 115.5
    const totalAtk = merc.getTotalAtk();
    console.log(`Total ATK: ${totalAtk} (Expected: 115.5)`);
    if (Math.abs(totalAtk - 115.5) < 0.01) {
        console.log("✅ Wolf Pet Passive Test Passed!");
    } else {
        console.error("❌ Wolf Pet Passive Test Failed!");
    }
}

function testPetScaling() {
    console.log("\nTesting Pet Scaling (Level 2, Star 1)...");
    const dogBase = PetStats.DOG_PET;
    const scaled = scaleStats({ ...dogBase, star: 1 }, 2);
    // Base ATK 5 + Growth 1 = 6.
    console.log(`Level 2 Dog ATK: ${scaled.atk} (Expected: 6)`);
    if (scaled.atk === 6) {
        console.log("✅ Pet Level Scaling Test Passed!");
    } else {
        console.error("❌ Pet Level Scaling Test Failed!");
    }

    console.log("\nTesting Pet Scaling (Level 1, Star 2)...");
    const scaledStar = scaleStats({ ...dogBase, star: 2 }, 1);
    // Base ATK 5 * 1.2 = 6.
    console.log(`Star 2 Dog ATK: ${scaledStar.atk} (Expected: 6)`);
    if (scaledStar.atk === 6) {
        console.log("✅ Pet Star Scaling Test Passed!");
    } else {
        console.error("❌ Pet Star Scaling Test Failed!");
    }
}

// Run
try {
    testWolfPetBonus();
    testPetScaling();
} catch (e) {
    console.error("Error during test execution:", e);
}
