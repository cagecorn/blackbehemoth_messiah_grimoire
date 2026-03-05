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
    'emoji_brick': { name: 'Brick', type: ITEM_TYPES.MATERIAL, icon: 'emoji_brick' },
    'emoji_meat': { name: 'Monster Meat', type: ITEM_TYPES.MATERIAL, icon: 'emoji_meat' },
    'emoji_wood': { name: 'Wood Log', type: ITEM_TYPES.MATERIAL, icon: 'emoji_wood' },
    'emoji_herb': { name: 'Magic Herb', type: ITEM_TYPES.MATERIAL, icon: 'emoji_herb' },
    'emoji_ticket': { name: '언데드 묘지 입장권', type: ITEM_TYPES.MATERIAL, icon: 'emoji_ticket', description: '언데드 묘지에 입장하기 위해 필요한 티켓입니다. 🎫', price: 10 },
    'emoji_burger': { name: 'Hamburger', type: ITEM_TYPES.MATERIAL, icon: 'emoji_burger', chapter: 'ACTIVE' },
    'emoji_fireworks': { name: 'Fire Nova (🎆)', type: ITEM_TYPES.MATERIAL, icon: 'emoji_fireworks', chapter: 'ACTIVE' },
    'emoji_sparkler': { name: 'Spark Nova (🎇)', type: ITEM_TYPES.MATERIAL, icon: 'emoji_sparkler', chapter: 'ACTIVE' },
    'emoji_koinobori': { name: 'Ice Nova (🎏)', type: ITEM_TYPES.MATERIAL, icon: 'emoji_koinobori', chapter: 'ACTIVE' },
    'emoji_divine_essence': { name: '전능의 정수 (✨)', type: ITEM_TYPES.MATERIAL, icon: 'emoji_divine_essence', description: '메시아의 권능을 강화하는 데 필요한 신성한 재료입니다. ✨' },

    // --- Tactical Node Charms ---
    'emoji_pouting_face': { name: '분노 (Enraged 😠)', type: 'node_charm', icon: 'emoji_pouting_face', description: '적의 서포터(힐러/바드)를 최우선으로 추적하며, 자신의 잃은 체력에 비례해 공격력이 최대 15%까지 상승합니다.' },
    'emoji_enraged_face': { name: 'Blood Scent Node (😡)', type: 'node_charm', icon: 'emoji_enraged_face', description: '체력이 30% 이하인 적을 최우선으로 노리며 이동속도가 영구적으로 +50 증가합니다 (기본 속도에 추가).' },
    'emoji_smiling_face_with_sunglasses': { name: 'Bodyguard Node (😎)', type: 'node_charm', icon: 'emoji_smiling_face_with_sunglasses', description: '팀원 중 서포터(힐러/바드)의 주위를 맴돌며 다가오는 적을 요격합니다.' },

    // --- Class Charms (Chapter C) ---
    // Archer
    'emoji_running_shoe': { name: '회피 기동 (🏃)', type: 'class_charm', icon: 'emoji_running_shoe', classId: 'archer', description: '적에게 포위되었을 때 즉시 구르며 탈출합니다. (이동속도 150% 증가, 유닛 통과, 10초 쿨타임)' },
    'emoji_bullseye': { name: '약자 멸시 (🎯)', type: 'class_charm', icon: 'emoji_bullseye', classId: 'archer', description: '체력이 30% 이하인 적에게 주는 피해량이 20% 증가합니다.' },
    'emoji_shoe': { name: '히트 앤 런 (👞)', type: 'class_charm', icon: 'emoji_shoe', classId: 'archer', description: '공격 시 2초 동안 이동 속도가 30% 증가합니다.' },
    // Warrior
    'emoji_shield': { name: '강건함 (🛡️)', type: 'class_charm', icon: 'emoji_shield', classId: 'warrior', description: '주위에 3명 이상의 적에게 포위당할 경우, 방어력이 10% 상승합니다.' },
    'emoji_wolf': { name: '론 울프 (🐺)', type: 'class_charm', icon: 'emoji_wolf', classId: 'warrior', description: '주위에 아군이 없을 경우, 모든 스탯이 5% 상승합니다.' },
    // Healer
    'emoji_pill': { name: '구원 (💊)', type: 'class_charm', icon: 'emoji_pill', classId: 'healer', description: '체력이 25% 이하인 아군을 회복시킬 때 회복량이 30% 증가합니다.' },
    'emoji_bubbles': { name: '정화 (🫧)', type: 'class_charm', icon: 'emoji_bubbles', classId: 'healer', description: '평타 회복 시 5%의 확률로 대상의 해로운 효과 하나를 제거합니다.' },
    // Wizard
    'emoji_milky_way': { name: '텔레포트 (🌌)', type: 'class_charm', icon: 'emoji_milky_way', classId: 'wizard', description: '적에게 포위당하거나 체력이 낮아지면 안전한 위치로 순식간에 이동합니다. (10초 쿨타임)' },
    'emoji_cyclone': { name: '비전 분출 (🌀)', type: 'class_charm', icon: 'emoji_cyclone', classId: 'wizard', description: '스킬 사용 시 20% 확률로 다음 재사용 대기시간이 50% 감소합니다.' },
    // Bard
    'emoji_musical_note': { name: '고양 (🎶)', type: 'class_charm', icon: 'emoji_musical_note', classId: 'bard', description: '평타 버프 시 5% 확률로 대상의 스킬 재사용 대기시간을 15% 단축시킵니다.' },

    // --- Transformation Charms (Chapter D) ---
    'emoji_crown': { name: 'Messiah Crown (👑)', type: 'trans_charm', icon: 'emoji_crown', description: '장착 시 금서의 힘을 빌어 특별한 형태로 변신합니다. 모든 능력치가 대폭 상승합니다.' },

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
            'emoji_brick': '1f9f1.svg',
            'emoji_meat': '1f356.svg',
            'emoji_wood': '1fab5.svg',
            'emoji_divine_essence': '2728.svg',
            'emoji_diamond': '1f48e.svg',
            'emoji_herb': '1f33f.svg',
            'emoji_ticket': '1f3ab.svg',
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
            'emoji_running_shoe': '1f3c3.svg',
            'emoji_bullseye': '1f3af.svg',
            'emoji_shoe': '1f45e.svg',
            'emoji_shield': '1f6e1.svg',
            'emoji_wolf': '1f43a.svg',
            'emoji_pill': '1f48a.svg',
            'emoji_bubbles': '1fae7.svg',
            'emoji_milky_way': '1f30c.svg',
            'emoji_sparkles': '2728.svg',
            'emoji_sparkles_wiz': '2728.svg',
            'emoji_cyclone': '1f300.svg',
            'emoji_musical_note': '1f3b6.svg',
            'emoji_crown': '1f451.svg',
            'emoji_castle': '1f3f0.svg',
            'emoji_bank': '1f3e6.svg',
            'emoji_factory': '1f3ed.svg',
            'emoji_church': '26ea.svg',
            'emoji_camp': '1f3d5.svg',
            'emoji_tree': '1f333.svg',
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

    static getChapter(id) {
        const item = this.getItem(id);
        if (!item) return null;
        if (item.chapter) return item.chapter;
        if (item.type === 'node_charm') return 'TACTICAL';
        if (item.type === 'class_charm') return 'CLASS';
        if (item.type === 'trans_charm') return 'TRANSFORMATION';
        return null;
    }
}
