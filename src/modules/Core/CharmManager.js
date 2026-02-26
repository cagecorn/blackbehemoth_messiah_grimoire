/**
 * CharmManager.js
 * 
 * Defines and manages effects for emoji charms.
 */

export const CHARM_EFFECT_TYPES = {
    PASSIVE: 'passive',  // Stat boosts
    PERIODIC: 'periodic' // Cooldown-based effects
};

export const CHARM_DATABASE = {
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
                console.log(`[Charm] ${unit.unitName} healed ${healAmount} by 🍔`);
            }
        },
        description: '10초마다 최대 체력의 2%를 회복합니다.'
    }
    // Add more charms here
};

export default class CharmManager {
    static getCharm(id) {
        return CHARM_DATABASE[id] || null;
    }

    static getAllCharms() {
        return Object.values(CHARM_DATABASE);
    }
}
