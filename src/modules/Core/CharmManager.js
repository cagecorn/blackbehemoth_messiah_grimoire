import SoundEffects from './SoundEffects.js';

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
        name: 'Hamburger (🍔)',
        emoji: '🍔',
        type: CHARM_EFFECT_TYPES.PASSIVE,
        stat: 'maxHp',
        description: '최대 체력을 % 증가시킵니다.'
    },
    'emoji_fireworks': {
        id: 'emoji_fireworks',
        name: 'Fire Resist (🎆)',
        emoji: '🎆',
        type: CHARM_EFFECT_TYPES.PASSIVE,
        stat: 'fireRes',
        description: '불 저항력을 % 증가시킵니다.'
    },
    'emoji_sparkler': {
        id: 'emoji_sparkler',
        name: 'Spark Resist (🎇)',
        emoji: '🎇',
        type: CHARM_EFFECT_TYPES.PASSIVE,
        stat: 'lightningRes',
        description: '번개 저항력을 % 증가시킵니다.'
    },
    'emoji_koinobori': {
        id: 'emoji_koinobori',
        name: 'Ice Resist (🎏)',
        emoji: '🎏',
        type: CHARM_EFFECT_TYPES.PASSIVE,
        stat: 'iceRes',
        description: '얼음 저항력을 % 증가시킵니다.'
    }
};

export default class CharmManager {
    static getCharm(id) {
        return CHARM_DATABASE[id] || null;
    }

    static getAllCharms() {
        return Object.values(CHARM_DATABASE);
    }
}
