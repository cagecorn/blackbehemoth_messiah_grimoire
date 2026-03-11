import EventBus from '../Events/EventBus.js';

/**
 * LocalizationManager handles multi-language support.
 * It listens for LANGUAGE_CHANGED events and prepares translations.
 */
class LocalizationManager {
    constructor() {
        this.currentLanguage = localStorage.getItem('gameLanguage') || 'KR';
        this.init();
    }

    init() {
        this.dictionary = {
            'KR': {
                'nav_territory': '영지',
                'nav_gacha': '뽑기',
                'nav_party': '편성',
                'nav_dungeon': '던전',
                'nav_arena': '아레나',
                'nav_raid': '레이드',
                'nav_dungeon_forest': '저주받은 숲',
                'nav_dungeon_graveyard': '언데드 묘지',
                'nav_dungeon_swamp': '늪지대',
                'nav_dungeon_lava': '용암 지대',
                'nav_dungeon_winter': '겨울의 나라',
                'menu_roster': '용병 도감',
                'menu_shop': '상점',
                'menu_equipment': '장비창',
                'menu_pets': '펫 보관함',
                'menu_npc_hire': 'NPC 고용',
                'menu_messiah': '메시아 권능 관리',
                'menu_structures': '방어 시설 관리',
                'menu_achievements': '업적',
                'menu_monster_codex': '몬스터 도감',
                'menu_cooking': '요리하기',
                'menu_fishing': '낚시 관리',
                'menu_alchemy': '연금술 관리',
                'menu_music': '집중 모드 & 음반 구입',
                'patch_notes_title': '📋 패치 내역',
                'toast_preparing': '준비 중입니다 🔧',
                'toast_gold_shortage': '골드가 부족합니다! 💰',
                'toast_party_not_full': '6명의 용병을 편성해주세요',
                'toast_building_upgraded': '건물을 강화했습니다! ✨',
                'toast_building_demolished': '건물을 철거했습니다. 💨',
                'toast_building_constructed': '건물을 건설했습니다! ✨',
                'toast_language_changed': '언어가 한국어로 변경되었습니다.',
                'confirm_exit_combat': '전투가 진행 중입니다. 정말로 나가시겠습니까?',
                'confirm_forfeit_combat': '전투를 포기하고 나가시겠습니까?',
                'confirm_demolish': '건물을 철거하시겠습니까? 🔨',
                'ui_tab_emoji': '🎒 이모지',
                'ui_tab_gear': '⚔️ 장비',
                'ui_filter_all': '전체',
                'ui_filter_weapon': '무기',
                'ui_filter_armor': '방어구',
                'ui_filter_necklace': '목걸이',
                'ui_filter_ring': '반지',
                'ui_btn_equip': '장착',
                'ui_btn_discard': '버리기',
                'ui_btn_upgrade': '강화',
                'ui_btn_demolish': '철거',
                'ui_btn_construction_exit': '건축 종료 (ESC)',
                'ui_construction_hint': '마우스 우클릭 / 길게 터치: 시설물 배치',
                'building_bank': '은행',
                'building_factory': '공장',
                'building_church': '성당',
                'building_camp': '캠프',
                'building_tree': '나무',
                'building_castle': '성',
            },
            'EN': {
                'nav_territory': 'Territory',
                'nav_gacha': 'Gacha',
                'nav_party': 'Formation',
                'nav_dungeon': 'Dungeon',
                'nav_arena': 'Arena',
                'nav_raid': 'Raid',
                'nav_dungeon_forest': 'Cursed Forest',
                'nav_dungeon_graveyard': 'Undead Graveyard',
                'nav_dungeon_swamp': 'Swampland',
                'nav_dungeon_lava': 'Lava Field',
                'nav_dungeon_winter': 'Winter Land',
                'menu_roster': 'Mercenary Roster',
                'menu_shop': 'Shop',
                'menu_equipment': 'Equipment',
                'menu_pets': 'Pet Storage',
                'menu_npc_hire': 'NPC Hire',
                'menu_messiah': 'Messiah Touch',
                'menu_structures': 'Structures',
                'menu_achievements': 'Achievements',
                'menu_monster_codex': 'Monster Codex',
                'menu_cooking': 'Cooking',
                'menu_fishing': 'Fishing',
                'menu_alchemy': 'Alchemy',
                'menu_music': 'Focus & Music',
                'patch_notes_title': '📋 Patch Notes',
                'toast_preparing': 'Coming Soon 🔧',
                'toast_gold_shortage': 'Not enough gold! 💰',
                'toast_party_not_full': 'Please deploy 6 mercenaries',
                'toast_building_upgraded': 'Building upgraded! ✨',
                'toast_building_demolished': 'Building demolished. 💨',
                'toast_building_constructed': 'Building constructed! ✨',
                'toast_language_changed': 'Language changed to English.',
                'confirm_exit_combat': 'Combat in progress. Do you really want to leave?',
                'confirm_forfeit_combat': 'Give up and leave combat?',
                'confirm_demolish': 'Do you want to demolish this building? 🔨',
                'ui_tab_emoji': '🎒 Emoji',
                'ui_tab_gear': '⚔️ Gear',
                'ui_filter_all': 'Total',
                'ui_filter_weapon': 'Weapon',
                'ui_filter_armor': 'Armor',
                'ui_filter_necklace': 'Necklace',
                'ui_filter_ring': 'Ring',
                'ui_btn_equip': 'Equip',
                'ui_btn_discard': 'Discard',
                'ui_btn_upgrade': 'Upgrade',
                'ui_btn_demolish': 'Demolish',
                'ui_btn_construction_exit': 'Exit Build Mode (ESC)',
                'ui_construction_hint': 'Right Click / Long Press: Place Structure',
                'building_bank': 'Bank',
                'building_factory': 'Factory',
                'building_church': 'Church',
                'building_camp': 'Camp',
                'building_tree': 'Tree',
                'building_castle': 'Castle',
            }
        };

        console.log(`[LocalizationManager] Initialized with language: ${this.currentLanguage}`);
        
        EventBus.on(EventBus.EVENTS.LANGUAGE_CHANGED, (payload) => {
            this.handleLanguageChange(payload.language);
        });
    }

    handleLanguageChange(lang) {
        this.currentLanguage = lang;
        console.log(`[LocalizationManager] System language updated to: ${lang}`);
        // Optionally save to localStorage if not already done by UI
        localStorage.setItem('gameLanguage', lang);
    }

    /**
     * Get a localized string by key
     * @param {string} key 
     * @returns {string}
     */
    t(key) {
        if (this.dictionary[this.currentLanguage] && this.dictionary[this.currentLanguage][key]) {
            return this.dictionary[this.currentLanguage][key];
        }
        return key; 
    }
}

// Global instance
const localizationManager = new LocalizationManager();
export default localizationManager;
