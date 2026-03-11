/**
 * ItemManager.js
 * 
 * Central registry and manager for all items (Materials & Equipment).
 */
import localizationManager from './LocalizationManager.js';

export const ITEM_TYPES = {
    MATERIAL: 'material',
    EQUIPMENT: 'equipment'
};

export const EQUIP_SLOTS = {
    WEAPON: 'weapon',
    ARMOR: 'armor',
    ACCESSORY: 'accessory',
    NECKLACE: 'necklace',
    RING: 'ring'
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
    'swampland_ticket': { name: '늪지대 입장권', type: ITEM_TYPES.MATERIAL, icon: 'emoji_ticket', description: '늪지대에 입장하기 위해 필요한 티켓입니다. 🎫', price: 100 },
    'lava_field_ticket': { name: '용암 지대 입장권', type: ITEM_TYPES.MATERIAL, icon: 'emoji_ticket', description: '용암 지대에 입장하기 위해 필요한 티켓입니다. 🎫', price: 500 },
    'winter_land_ticket': { name: '겨울의 나라 입장권', type: ITEM_TYPES.MATERIAL, icon: 'emoji_ticket', description: '겨울의 나라에 입장하기 위해 필요한 티켓입니다. 🎫', price: 1000 },
    'emoji_clover': { name: '클로버', type: ITEM_TYPES.MATERIAL, icon: 'emoji_clover', description: '늪지대에서 발견되는 행운의 상징입니다. ☘️', price: 50 },
    'emoji_bone': { name: '뼈', type: ITEM_TYPES.MATERIAL, icon: 'emoji_bone', description: '언데드 몬스터의 잔해입니다.', price: 5 },
    'turret_bowgun': {
        name: '보우건 터렛',
        type: 'structure',
        icon: 'turret_bowgun',
        description: '우직하게 자리를 지키며 적들을 공격하는 설치형 터렛입니다.',
        customAsset: 'assets/structures/bow_turret_sprite.png',
        price: 500
    },
    'healing_turret': {
        name: '힐링 터렛',
        type: 'structure',
        icon: 'healing_turret',
        description: '주기적으로 아군의 체력을 회복시키는 보조형 터렛입니다.',
        customAsset: 'assets/structures/healing_turret_sprite.png',
        price: 800
    },
    'emoji_burger': { name: 'Hamburger', type: ITEM_TYPES.MATERIAL, icon: 'emoji_burger', chapter: 'ACTIVE' },
    'emoji_fireworks': { name: 'Fire Nova (🎆)', type: ITEM_TYPES.MATERIAL, icon: 'emoji_fireworks', chapter: 'ACTIVE' },
    'emoji_sparkler': { name: 'Spark Nova (🎇)', type: ITEM_TYPES.MATERIAL, icon: 'emoji_sparkler', chapter: 'ACTIVE' },
    'emoji_koinobori': { name: 'Ice Nova (🎏)', type: ITEM_TYPES.MATERIAL, icon: 'emoji_koinobori', chapter: 'ACTIVE' },
    'emoji_divine_essence': { name: '전능의 정수 (✨)', type: ITEM_TYPES.MATERIAL, icon: 'emoji_divine_essence', description: '메시아의 권능을 강화하는 데 필요한 신성한 재료입니다. ✨' },
    'eternal_ice': { name: '영원한 얼음', type: ITEM_TYPES.MATERIAL, icon: 'emoji_ice_cube', description: '태고의 냉기를 머금고 있는 얼음입니다. 양초의 상위 재료로 사용됩니다. 🧊', price: 150 },
    'emoji_candle': { name: '양초', type: ITEM_TYPES.MATERIAL, icon: 'emoji_candle', description: '화염 정령들이 떨어뜨린 고급 마법 재료입니다. 🕯️', price: 200 },
    'food_choco_parfait': {
        name: '초코 파르페',
        type: ITEM_TYPES.MATERIAL,
        icon: 'choco_parfait',
        customAsset: 'assets/food/choco_parfait.png',
        description: '달콤한 초코 파르페입니다. 한 라운드 동안 파티 획득 경험치가 10% 상승합니다.',
        price: 2000
    },
    'food_strawberry_cake': {
        name: '딸기 케이크',
        type: ITEM_TYPES.MATERIAL,
        icon: 'strawberry_cake',
        customAsset: 'assets/food/strawberry_cake.png',
        description: '상큼한 딸기 케이크입니다. 한 라운드 동안 장비 획득 경험치가 10% 상승합니다.',
        price: 2000
    },
    'bamboo_fishing_rod': {
        name: '대나무 낚시대',
        type: ITEM_TYPES.MATERIAL,
        icon: 'bamboo_fishing_rod',
        customAsset: 'assets/item/bamboo_fishing_rod.png',
        description: '평범한 대나무로 만든 낚시대입니다. 내구도 500.',
        price: 20000
    },
    'alchemy_tool_basic': {
        name: '평범한 연금도구',
        type: ITEM_TYPES.MATERIAL,
        icon: 'alchemy_tool',
        customAsset: 'assets/item/alchemi_tool.png',
        description: '평범한 연금도구입니다. 내구도 500. (50% 확률로 내구도 추가 소모)',
        price: 90000
    },
    'atk_potion': {
        name: '공격력 포션',
        type: ITEM_TYPES.MATERIAL,
        icon: 'potion_atk',
        customAsset: 'assets/potion/atk_potion.png',
        description: '공격력이 4% 일시적으로 증가하는 포션입니다.',
        price: 5000
    },
    'def_potion': {
        name: '방어력 포션',
        type: ITEM_TYPES.MATERIAL,
        icon: 'potion_def',
        customAsset: 'assets/potion/def_potion.png',
        description: '방어력이 4% 일시적으로 증가하는 포션입니다.',
        price: 5000
    },
    'mAtk_potion': {
        name: '마법공격력 포션',
        type: ITEM_TYPES.MATERIAL,
        icon: 'potion_matk',
        customAsset: 'assets/potion/mAtk_potion.png',
        description: '마법공격력이 4% 일시적으로 증가하는 포션입니다.',
        price: 5000
    },
    'mDef_potion': {
        name: '마법방어력 포션',
        type: ITEM_TYPES.MATERIAL,
        icon: 'potion_mdef',
        customAsset: 'assets/potion/mDef_potion.png',
        description: '마법방어력이 4% 일시적으로 증가하는 포션입니다.',
        price: 5000
    },
    'mackerel': {
        name: '고등어',
        type: ITEM_TYPES.MATERIAL,
        icon: 'fish_mackerel',
        customAsset: 'assets/fish/mackerel.png',
        description: '싱싱한 고등어입니다. 던전 몬스터 출현 양 30% 상승.'
    },
    'herring': {
        name: '청어',
        type: ITEM_TYPES.MATERIAL,
        icon: 'fish_herring',
        customAsset: 'assets/fish/herring.png',
        description: '빛나는 청어입니다. 던전 몬스터 레벨 +1.'
    },
    'squid': {
        name: '오징어',
        type: ITEM_TYPES.MATERIAL,
        icon: 'fish_squid',
        customAsset: 'assets/fish/squid.png',
        description: '쫄깃한 오징어입니다. 던전 엘리트 출현율 +30%.'
    },

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
    'wood_sword': {
        name: '우드 소드',
        type: ITEM_TYPES.EQUIPMENT,
        slot: EQUIP_SLOTS.WEAPON,
        icon: 'wood_sword',
        stats: { atk: 5 },
        description: '평범한 나무로 깎아 만든 검입니다. 하지만 당신의 노력에 따라 전설적인 무기가 될지도 모릅니다.',
        customAsset: 'assets/item/wood_sword.png',
        id: 'wood_sword'
    },
    'wood_armor': {
        name: '우드 아머',
        type: ITEM_TYPES.EQUIPMENT,
        slot: EQUIP_SLOTS.ARMOR,
        icon: 'wood_armor',
        stats: { def: 5, mDef: 2 },
        description: '나무 껍질을 엮어 만든 갑옷입니다. 투박하지만 입는 사람과 함께 성장하는 신비한 힘이 깃들어 있습니다.',
        customAsset: 'assets/item/wood_armor.png',
        id: 'wood_armor'
    },
    'wood_wand': {
        name: '우드 완드',
        type: ITEM_TYPES.EQUIPMENT,
        slot: EQUIP_SLOTS.WEAPON,
        icon: 'wood_wand',
        stats: { mAtk: 5 },
        description: '말라비틀어진 나뭇가지로 만든 투박한 지팡이입니다. 하지만 마력을 머금으면 놀라운 힘을 발휘할 것입니다.',
        customAsset: 'assets/item/wood_wand.png',
        id: 'wood_wand'
    }
};

export default class ItemManager {
    static getItem(id) {
        return ITEM_DATABASE[id] || null;
    }

    /**
     * Returns a localized name for the item.
     * @param {string} id Item ID
     * @returns {string} Localized name or database fallback
     */
    static getLocalizedName(id) {
        const item = this.getItem(id);
        if (!item) return id;
        return localizationManager.t(`item_name_${id}`, [], item.name);
    }

    /**
     * Returns a localized description for the item.
     * @param {string} id Item ID
     * @returns {string} Localized description or database fallback
     */
    static getLocalizedDescription(id) {
        const item = this.getItem(id);
        if (!item) return '';
        return localizationManager.t(`item_desc_${id}`, [], item.description || '');
    }

    static getAllItems() {
        return ITEM_DATABASE;
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
            'emoji_clover': '1f340.svg',
            'emoji_candle': '1f56f.svg',
            'swampland_ticket': '1f3ab.svg',
            'lava_field_ticket': '1f3ab.svg',
            'winter_land_ticket': '1f3ab.svg',
            'emoji_bone': '1f9b4.svg',
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
            'eternal_ice': '1f9ca.svg',
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
            'mackerel': '1f41f.svg',
            'herring': '1f41f.svg',
            'squid': '1f991.svg'
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
