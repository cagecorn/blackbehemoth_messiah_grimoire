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
    'emoji_burger': { name: 'Hamburger', type: ITEM_TYPES.MATERIAL, icon: 'emoji_burger' },
    'emoji_fireworks': { name: 'Fire Nova (🎆)', type: ITEM_TYPES.MATERIAL, icon: 'emoji_fireworks' },
    'emoji_sparkler': { name: 'Spark Nova (🎇)', type: ITEM_TYPES.MATERIAL, icon: 'emoji_sparkler' },
    'emoji_koinobori': { name: 'Ice Nova (🎏)', type: ITEM_TYPES.MATERIAL, icon: 'emoji_koinobori' },

    // --- Tactical Node Charms ---
    'emoji_pouting_face': { name: 'Hater Node (😠)', type: 'node_charm', icon: 'emoji_pouting_face', description: '서포터(힐러/바드)를 최우선으로 노리며 피해량이 10% 증가합니다.' },
    'emoji_enraged_face': { name: 'Blood Scent Node (😡)', type: 'node_charm', icon: 'emoji_enraged_face', description: '체력이 30% 이하인 적을 최우선으로 노리며 이동속도가 증가합니다.' },
    'emoji_smiling_face_with_sunglasses': { name: 'Bodyguard Node (😎)', type: 'node_charm', icon: 'emoji_smiling_face_with_sunglasses', description: '가장 체력이 낮은 아군 근처를 배회하며 다가오는 적을 요격합니다.' },

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
            'emoji_burger': '1f354.svg',
            'emoji_fireworks': '1f386.svg',
            'emoji_sparkler': '1f387.svg',
            'emoji_koinobori': '1f38f.svg',
            'emoji_sword': '1f5e1.svg',
            'emoji_staff': '1fa84.svg',
            'emoji_rock': '1f5ff.svg',
            'emoji_bison': '1f9ac.svg',
            'emoji_pouting_face': '1f620.svg',
            'emoji_enraged_face': '1f621.svg',
            'emoji_smiling_face_with_sunglasses': '1f60e.svg',
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
