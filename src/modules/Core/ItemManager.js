/**
 * ItemManager.js
 * 
 * Central registry and manager for all items (Materials & Equipment).
 */

export const ITEM_TYPES = {
    MATERIAL: 'material',
    EQUIPMENT: 'equipment'
};

export const EQUIP_SLOTS = {
    WEAPON: 'weapon',
    ARMOR: 'armor',
    ACCESSORY: 'accessory'
};

export const WEAPON_PREFIXES = {
    FIRE: { id: 'fire', element: 'fire', name: '불타는', color: '#ff9d00', particle: 'fire', emoji: '🔥' },
    ICE: { id: 'ice', element: 'ice', name: '얼어붙은', color: '#00bbff', particle: 'ice', emoji: '❄️' },
    LIGHTNING: { id: 'lightning', element: 'lightning', name: '비릿한', color: '#ffff00', particle: 'lightning', emoji: '⚡' }
};

const ITEM_DATABASE = {
    // --- Materials ---
    'emoji_coin': { name: 'Gold Coin', type: ITEM_TYPES.MATERIAL, icon: 'emoji_coin' },
    'emoji_gem': { name: 'Gemstone', type: ITEM_TYPES.MATERIAL, icon: 'emoji_gem' },
    'emoji_meat': { name: 'Monster Meat', type: ITEM_TYPES.MATERIAL, icon: 'emoji_meat' },
    'emoji_wood': { name: 'Wood Log', type: ITEM_TYPES.MATERIAL, icon: 'emoji_wood' },
    'emoji_herb': { name: 'Magic Herb', type: ITEM_TYPES.MATERIAL, icon: 'emoji_herb' },

    // --- Equipment ---
    'test_sword_fire': {
        name: '화염의 테스트 소드',
        type: ITEM_TYPES.EQUIPMENT,
        slot: EQUIP_SLOTS.WEAPON,
        icon: 'emoji_sword',
        stats: { atk: 50 },
        description: '강력한 화염의 테스트용 검입니다.',
        prefix: WEAPON_PREFIXES.FIRE
    },
    'test_sword_ice': {
        name: '냉기의 테스트 소드',
        type: ITEM_TYPES.EQUIPMENT,
        slot: EQUIP_SLOTS.WEAPON,
        icon: 'emoji_sword',
        stats: { atk: 50 },
        description: '강력한 냉기의 테스트용 검입니다.',
        prefix: WEAPON_PREFIXES.ICE
    },
    'test_sword_lightning': {
        name: '전격의 테스트 소드',
        type: ITEM_TYPES.EQUIPMENT,
        slot: EQUIP_SLOTS.WEAPON,
        icon: 'emoji_sword',
        stats: { atk: 50 },
        description: '강력한 전격의 테스트용 검입니다.',
        prefix: WEAPON_PREFIXES.LIGHTNING
    },
    'test_staff_fire': {
        name: '화염의 테스트 지팡이',
        type: ITEM_TYPES.EQUIPMENT,
        slot: EQUIP_SLOTS.WEAPON,
        icon: 'emoji_staff',
        stats: { mAtk: 50 },
        description: '강력한 화염의 테스트용 지팡이입니다.',
        prefix: WEAPON_PREFIXES.FIRE
    },
    'test_staff_ice': {
        name: '냉기의 테스트 지팡이',
        type: ITEM_TYPES.EQUIPMENT,
        slot: EQUIP_SLOTS.WEAPON,
        icon: 'emoji_staff',
        stats: { mAtk: 50 },
        description: '강력한 냉기의 테스트용 지팡이입니다.',
        prefix: WEAPON_PREFIXES.ICE
    },
    'test_staff_lightning': {
        name: '전격의 테스트 지팡이',
        type: ITEM_TYPES.EQUIPMENT,
        slot: EQUIP_SLOTS.WEAPON,
        icon: 'emoji_staff',
        stats: { mAtk: 50 },
        description: '강력한 전격의 테스트용 지팡이입니다.',
        prefix: WEAPON_PREFIXES.LIGHTNING
    }
};

export default class ItemManager {
    static getItem(id) {
        return ITEM_DATABASE[id] || null;
    }

    static getSVGFilename(id) {
        // Map common emoji IDs to their SVG filenames
        const map = {
            'emoji_coin': '1fa99.svg',
            'emoji_gem': '1f48e.svg',
            'emoji_meat': '1f356.svg',
            'emoji_wood': '1fab5.svg',
            'emoji_herb': '1f33f.svg',
            'emoji_sword': '1f5e1.svg',
            'emoji_staff': '1fa84.svg',
            'test_sword_fire': '1f5e1.svg',
            'test_sword_ice': '1f5e1.svg',
            'test_sword_lightning': '1f5e1.svg',
            'test_staff_fire': '1fa84.svg',
            'test_staff_ice': '1fa84.svg',
            'test_staff_lightning': '1fa84.svg'
        };
        return map[id] || '2753.svg'; // Default question mark
    }

    static isEquipment(id) {
        const item = this.getItem(id);
        return item && item.type === ITEM_TYPES.EQUIPMENT;
    }
}
