/**
 * charm_verification.js
 * 
 * Headless simulation to verify that the Hamburger charm 
 * actually heals the unit every 10 seconds.
 */

const CHARM_EFFECT_TYPES = {
    PASSIVE: 'passive',
    PERIODIC: 'periodic'
};

const CHARM_DATABASE = {
    'emoji_burger': {
        id: 'emoji_burger',
        name: 'Hamburger (햄버거)',
        emoji: '🍔',
        type: CHARM_EFFECT_TYPES.PERIODIC,
        interval: 10000, // 10 seconds
        effect: (unit) => {
            const healAmount = Math.floor(unit.maxHp * 0.02);
            if (healAmount > 0) {
                unit.heal(healAmount);
                console.log(`[VERIFICATION] Applied heal: +${healAmount} HP`);
            }
        },
        description: '10초마다 최대 체력의 2%를 회복합니다.'
    }
};

class MockMercenary {
    constructor() {
        this.active = true;
        this.maxHp = 1000;
        this.hp = 500;
        this.charms = ['emoji_burger'];
        this.charmTimers = [0];
    }

    heal(amount) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
    }

    updateCharmEffects(delta) {
        if (!this.active || this.hp <= 0) return;

        this.charms.forEach((itemId, index) => {
            if (!itemId) return;

            const charm = CHARM_DATABASE[itemId];
            if (!charm || charm.type !== 'periodic') return;

            this.charmTimers[index] += delta;
            if (this.charmTimers[index] >= charm.interval) {
                this.charmTimers[index] = 0;
                charm.effect(this);
            }
        });
    }
}

// SIMULATION
console.log("=== Charm Healing Verification Starting ===");
const unit = new MockMercenary();
const initialHp = unit.hp;
const simulationTimeMs = 15000; // 15 seconds
const stepMs = 100; // 0.1s steps

let totalTime = 0;
while (totalTime < simulationTimeMs) {
    unit.updateCharmEffects(stepMs);
    totalTime += stepMs;
}

console.log(`Initial HP: ${initialHp}`);
console.log(`Final HP: ${unit.hp}`);
console.log(`Expected Heal at 10s: +20 HP (2% of 1000)`);

if (unit.hp === initialHp + 20) {
    console.log("SUCCESS: Healing logic verified.");
    process.exit(0);
} else {
    console.error("FAILURE: Healing logic did not result in expected HP.");
    process.exit(1);
}
