import EventBus from '../Events/EventBus.js';
import localizationManager from '../Core/LocalizationManager.js';

/**
 * TerritoryUI.js
 * Premium "Command Center" dashboard.
 * Consolidates banners and patch notes into a modular UI.
 */
export default class TerritoryUI {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.navContainer = null;
        this.patchNotesContainer = null;
        
        this.banners = [
            { id: 'companion', langKey: 'menu_roster', sublabel: 'ROSTER', cutscene: 'assets/characters/party/king_cutscene.png', accentColor: '#c0843a' },
            { id: 'shop', langKey: 'menu_shop', sublabel: 'SHOP', cutscene: 'assets/characters/party/lute_cutscene.png', accentColor: '#3a7fc0' },
            { id: 'equipment', langKey: 'menu_equipment', sublabel: 'EQUIPMENT', cutscene: 'assets/characters/party/aren_cutscene.png', accentColor: '#7a3ac0' },
            { id: 'pet', langKey: 'menu_pets', sublabel: 'PETS', cutscene: 'assets/characters/party/nana_cutscene.png', accentColor: '#3ac06e' },
            { id: 'npc-hire', langKey: 'menu_npc_hire', sublabel: 'NPC HIRE', cutscene: 'assets/characters/party/king_cutscene.png', accentColor: '#fbbf24' },
            { id: 'messiah', langKey: 'menu_messiah', sublabel: 'MESSIAH TOUCH', cutscene: 'assets/characters/party/messiah_cutscene.png', accentColor: '#ffffff' },
            { id: 'defense', langKey: 'menu_structures', sublabel: 'STRUCTURES', cutscene: 'assets/characters/party/boon_cutscene.png', accentColor: '#4ade80' },
            { id: 'achievement', langKey: 'menu_achievements', sublabel: 'ACHIEVEMENTS', cutscene: 'assets/characters/party/silvi_cutscene.png', accentColor: '#c03a3a' },
            { id: 'monster-codex', langKey: 'menu_monster_codex', sublabel: 'MONSTER CODEX', cutscene: 'assets/characters/enemies/goblin_cutscene.png', accentColor: '#4ade80' },
            { id: 'cook', langKey: 'menu_cooking', sublabel: 'COOKING', cutscene: 'assets/characters/party/nana_cutscene.png', accentColor: '#fb7185' },
            { id: 'fishing', langKey: 'menu_fishing', sublabel: 'FISHING', cutscene: 'assets/npc/polar_bear.png', accentColor: '#3b82f6' },
            { id: 'alchemy', langKey: 'menu_alchemy', sublabel: 'ALCHEMY', cutscene: 'assets/npc/rabbit.png', accentColor: '#a78bfa' },
            { id: 'focus-music', langKey: 'menu_music', sublabel: 'FOCUS & MUSIC', cutscene: 'assets/characters/party/lute_cutscene.png', accentColor: '#8b5cf6' }
        ];

        this._setupLanguageListener();
    }

    _setupLanguageListener() {
        EventBus.on(EventBus.EVENTS.LANGUAGE_CHANGED, () => {
            if (this.navContainer && this.navContainer.style.display !== 'none') {
                this._renderBanners();
            }
            if (this.patchNotesContainer) {
                const title = this.patchNotesContainer.querySelector('#territory-patch-tab span');
                if (title) title.innerText = localizationManager.t('patch_notes_title');
            }
        });
    }

    /**
     * Shows the Territory Dashboard.
     */
    show() {
        console.log('[TerritoryUI] Opening Command Center...');
        this._ensureContainers();
        this.navContainer.style.display = 'block';
        this.patchNotesContainer.style.display = 'block';
        this._renderBanners();
        this._renderPatchNotes();
    }

    /**
     * Hides the Territory Dashboard.
     */
    hide() {
        if (this.navContainer) this.navContainer.style.display = 'none';
        if (this.patchNotesContainer) this.patchNotesContainer.style.display = 'none';
    }

    _ensureContainers() {
        const app = document.getElementById('app-container') || document.body;

        if (!document.getElementById('territory-banner-wrap')) {
            this.navContainer = document.createElement('div');
            this.navContainer.id = 'territory-banner-wrap';
            app.appendChild(this.navContainer);
        } else {
            this.navContainer = document.getElementById('territory-banner-wrap');
        }

        if (!document.getElementById('territory-patch-notes')) {
            this.patchNotesContainer = document.createElement('div');
            this.patchNotesContainer.id = 'territory-patch-notes';
            app.appendChild(this.patchNotesContainer);
        } else {
            this.patchNotesContainer = document.getElementById('territory-patch-notes');
        }
    }

    _renderBanners() {
        if (!this.navContainer) return;

        const html = `
            <style>
                #territory-banner-wrap {
                    position: fixed;
                    top: 80px;
                    left: 20px;
                    bottom: 20px;
                    right: 440px; /* Leave space for patch notes */
                    overflow-y: auto;
                    padding-right: 10px;
                    z-index: 50;
                    display: none;
                }
                #territory-banner-inner {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 15px;
                }
                .territory-banner {
                    position: relative;
                    height: 140px;
                    background: #1e1b4b;
                    border: 2px solid var(--accent, #4c1d95);
                    border-radius: 12px;
                    overflow: hidden;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    align-items: center;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                }
                .territory-banner:hover {
                    transform: translateY(-4px) scale(1.02);
                    border-color: #fbbf24;
                    box-shadow: 0 8px 25px rgba(0,0,0,0.5), 0 0 15px rgba(251, 191, 36, 0.2);
                }
                .territory-banner-img-wrap {
                    width: 160px;
                    height: 100%;
                    overflow: hidden;
                    position: relative;
                    flex-shrink: 0;
                    background: #000;
                }
                .territory-banner-img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    image-rendering: pixelated;
                    transition: transform 0.5s;
                    opacity: 0.8;
                }
                .territory-banner:hover .territory-banner-img {
                    transform: scale(1.1);
                    opacity: 1;
                }
                .territory-banner-label-wrap {
                    flex: 1;
                    padding: 0 20px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 4px;
                    z-index: 2;
                }
                .territory-banner-sublabel {
                    font-family: 'Press Start 2P', cursive;
                    font-size: 8px;
                    color: #fbbf24;
                    opacity: 0.8;
                    letter-spacing: 1px;
                }
                .territory-banner-label {
                    font-size: 18px;
                    font-weight: 800;
                    color: #fff;
                    text-transform: uppercase;
                    letter-spacing: -0.5px;
                }
                .territory-banner-arrow {
                    position: absolute;
                    bottom: 12px;
                    right: 15px;
                    font-size: 14px;
                    color: #fbbf24;
                    opacity: 0;
                    transition: all 0.2s;
                }
                .territory-banner:hover .territory-banner-arrow {
                    opacity: 1;
                    transform: translateX(5px);
                }
                
                /* Patch Notes Styles */
                #territory-patch-notes {
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    width: 400px;
                    bottom: 20px;
                    background: rgba(15, 12, 41, 0.9);
                    backdrop-filter: blur(10px);
                    border: 2px solid #312e81;
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    z-index: 50;
                    display: none;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }
                #territory-patch-tab {
                    height: 50px;
                    background: linear-gradient(to right, #1e1b4b, #312e81);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 15px;
                    border-bottom: 2px solid #312e81;
                    font-family: 'Press Start 2P', cursive;
                    font-size: 10px;
                    color: #fbbf24;
                }
                #territory-patch-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 15px;
                    scrollbar-width: thin;
                    scrollbar-color: #4c1d95 rgba(0,0,0,0.2);
                }
                .patch-entry { margin-bottom: 20px; }
                .patch-date { color: #fbbf24; font-weight: bold; font-size: 14px; margin-bottom: 8px; border-bottom: 1px solid rgba(251, 191, 36, 0.3); padding-bottom: 4px; }
                .patch-item { font-size: 13px; color: #e0e7ff; line-height: 1.6; margin-bottom: 8px; display: flex; gap: 8px; }
                .patch-item-icon { flex-shrink: 0; }
                #territory-patch-close { background: none; border: none; color: #ef4444; font-size: 20px; cursor: pointer; transition: transform 0.2s; }
                #territory-patch-close:hover { transform: scale(1.2); }
            </style>
            <div id="territory-banner-inner">
                ${this.banners.map(b => `
                    <div id="banner-${b.id}" class="territory-banner" style="--accent: ${b.accentColor}">
                        <div class="territory-banner-img-wrap">
                            <img src="${b.cutscene}" class="territory-banner-img">
                        </div>
                        <div class="territory-banner-label-wrap">
                            <span class="territory-banner-sublabel">${b.sublabel}</span>
                            <span class="territory-banner-label">${localizationManager.t(b.langKey)}</span>
                        </div>
                        <span class="territory-banner-arrow">▸</span>
                    </div>
                `).join('')}
            </div>
        `;

        this.navContainer.innerHTML = html;
        this._attachBannerEvents();
    }

    _attachBannerEvents() {
        this.banners.forEach(b => {
            const el = document.getElementById(`banner-${b.id}`);
            if (!el) return;
            el.onclick = () => {
                console.log(`[TerritoryUI] Opening: ${b.id}`);
                switch(b.id) {
                    case 'companion': this.uiManager.showMercenaryRoster(); break;
                    case 'shop': this.uiManager.showShop(); break;
                    case 'equipment': this.uiManager.showEquipmentCrafting(); break;
                    case 'pet': this.uiManager.showPetStorage(); break;
                    case 'npc-hire': this.uiManager.showNPCHire(); break;
                    case 'messiah': this.uiManager.showMessiahManagement(); break;
                    case 'defense': this.uiManager.showDefenseManagement(); break;
                    case 'achievement': this.uiManager.showAchievementsUI(); break;
                    case 'monster-codex': this.uiManager.showMonsterCodex(); break;
                    case 'cook': this.uiManager.showCooking(); break;
                    case 'fishing': this.uiManager.showFishingManagement(); break;
                    case 'alchemy': this.uiManager.showAlchemyManagement(); break;
                    case 'focus-music': this.uiManager.showFocusMusicManager(); break;
                    default: this.uiManager.showToast('준비 중입니다 🔧'); break;
                }
            };
        });
    }

    _renderPatchNotes() {
        if (!this.patchNotesContainer) return;

        const html = `
            <div id="territory-patch-tab">
                <span>${localizationManager.t('patch_notes_title')}</span>
                <button id="territory-patch-close">✕</button>
            </div>
            <div id="territory-patch-body">
                <div class="patch-entry" style="border: 2px solid #3a7fc0; background: rgba(58, 127, 192, 0.1); padding: 10px; margin-bottom: 10px; border-radius: 8px;">
                    <div class="patch-item" style="color: #ffffff; line-height: 1.6; font-size: 13px; text-align: left; padding: 5px;">
                        공식 카페가 개설되었습니다. 여러분의 많은 피드백 부탁드립니다.<br>
                        패치노트는 편의성을 위해서 카페, 인게임 내 모두 갱신됩니다.<br>
                        <a href="https://cafe.naver.com/blackbehemothmessiah" target="_blank" style="color: #60a5fa; text-decoration: underline; font-weight: bold; display: inline-block; margin-top: 8px;">[🔗 공식 카페 바로가기]</a>
                    </div>
                </div>
                <div class="patch-entry" style="border: 2px solid #ef4444; background: rgba(239, 68, 68, 0.1); padding: 10px; border-radius: 8px;">
                    <div class="patch-date" style="color: #ef4444; border-bottom-color: rgba(239, 68, 68, 0.3);">📢 **필독 공지**</div>
                    <div class="patch-item" style="color: #ffffff; line-height: 1.4;">저의 부주의로 인해 여러분의 소중한 게임 진행 데이터가 초기화되는 불상사가 일어났습니다. 죄송합니다. 더 열심히 개발하여 보상해드리겠습니다.</div>
                </div>
                
                <div class="patch-entry">
                    <div class="patch-date">▶ 2026/3/10 (Latest)</div>
                    <div class="patch-item"><span class="patch-item-icon">🎵</span>50종 신곡이 게임 전반적으로 추가되었습니다. 이제 다양한 배경음으로 게임을 즐겨보세요. 해당 음원들은 [집중 모드 & 음반 구입] 배너에서 구입할 수 있습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">⏳</span>던전 씬에서 [집중 모드]를 활성화할 수 있습니다. 구입한 음원들을 들으실 수 있으며, 화면에 강한 흐리기 효과가 적용되고 타이머가 설정되어 여러분의 집중을 돕습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">⚗️</span>[연금술 관리]로 이제 던전의 용병들에게 다양한 버프를 제공할 수 있습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">🎣</span>[낚시 관리]로 이제 던전의 몬스터들에게 다양한 효과를 줄 수 있습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">🍳</span>[요리하기]로 이제 다양한 경험치 버프를 얻을 수 있습니다. 해당 음식은 상점에서도 구매 가능합니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">🔨</span>장비창에서 선택한 장비를 파괴할 수 있습니다. 버그로 무용지물이 된 장비들을 제거해주세요.</div>
                    <div class="patch-item"><span class="patch-item-icon">📹</span>던전에서 이제 용병들을 전체적으로 비추는 카메라 워크가 향상되었습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">🎰</span>뽑기 씬에서 골드를 지불해 용병을 뽑을 수 있습니다.</div>
                </div>

                <div class="patch-entry">
                    <div class="patch-date">▶ 2026/3/9</div>
                    <div class="patch-item"><span class="patch-item-icon">🔄</span>편성 씬에서 바로 npc, 메시아 권능을 교체할 수 있습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">👥</span>뽑기 씬에서 보유중인 용병의 갯수가 확인 가능합니다.</div>
                </div>
                
                <div class="patch-entry">
                    <div class="patch-date">▶ 2026-03-08</div>
                    <div class="patch-item"><span class="patch-item-icon">❄️</span>[던전] 다섯 번째 던전 **[겨울의 나라]** 업데이트!</div>
                    <div class="patch-item"><span class="patch-item-icon">🚀</span>[성장] **용병 레벨 제한 해제!** 하드코딩 되어있던 40레벨 제한 삭제.</div>
                </div>
            </div>
        `;

        this.patchNotesContainer.innerHTML = html;
        const closeBtn = this.patchNotesContainer.querySelector('#territory-patch-close');
        if (closeBtn) {
            closeBtn.onclick = () => {
                this.patchNotesContainer.style.display = 'none';
            };
        }
    }
}
