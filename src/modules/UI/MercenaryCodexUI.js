import DBManager from '../Database/DBManager.js';
import { MercenaryClasses, Characters, Skins } from '../Core/EntityStats.js';
import localizationManager from '../Core/LocalizationManager.js';
import EventBus from '../Events/EventBus.js';

/**
 * MercenaryCodexUI
 * Handles the Hero Roster / Mercenary Codex UI.
 * Extracted from UIManager.js for better modularity.
 */
export default class MercenaryCodexUI {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.currentRosterSelection = null;
    }

    /**
     * Shows the Mercenary Roster popup.
     */
    async showMercenaryRoster() {
        if (!this.uiManager.popupOverlay) return;

        const rosterData = await DBManager.getMercenaryRoster();
        const mercsToShow = [Characters.NICKLE, Characters.NANA];
        this.currentRosterSelection = mercsToShow[0].id;

        const renderStat = (label, value) => `
            <div class="merc-stat-item">
                <span class="stat-label">${label}</span>
                <span class="stat-value">${value}</span>
            </div>
        `;

        const renderMercDetail = (m) => {
            const rosterItem = rosterData[m.id] || rosterData[m.id.toUpperCase()] || { stars: {}, total: 0 };
            const totalPulls = rosterItem.total || 0;
            const classConfig = MercenaryClasses[m.classId.toUpperCase()];

            // Stats mapping
            const stats = [
                { label: 'HP', val: classConfig.maxHp },
                { label: 'ATK', val: m.atk || classConfig.atk },
                { label: 'M.ATK', val: m.mAtk || classConfig.mAtk },
                { label: 'DEF', val: m.def || classConfig.def },
                { label: 'M.DEF', val: m.mDef || classConfig.mDef },
                { label: 'SPD', val: m.speed || classConfig.speed },
                { label: 'ATK.SPD', val: m.atkSpd || classConfig.atkSpd },
                { label: 'RANGE', val: m.atkRange || classConfig.atkRange },
                { label: 'CAST', val: m.castSpd || classConfig.castSpd },
                { label: 'ACC', val: m.acc || classConfig.acc },
                { label: 'EVA', val: m.eva || classConfig.eva },
                { label: 'CRIT', val: (m.crit || classConfig.crit) + '%' }
            ];

            return `
                <div class="merc-detail-view" id="merc-detail-${m.id}">
                    <div class="merc-detail-header">
                        <div class="merc-detail-left-col">
                            <div class="merc-detail-sprite-wrap">
                                <img src="assets/characters/party/${m.sprite}.png" class="merc-detail-sprite">
                            </div>
                            <button class="theme-skin-btn active-btn" onclick="window.uiManager.mercenaryCodexUI.openSkinSelector('${m.id}')">${localizationManager.t('ui_btn_theme_skin')}</button>
                        </div>
                        <div class="merc-detail-title-info">
                            <div class="merc-detail-name-row">
                                <span class="merc-detail-name">${localizationManager.t('char_' + m.id + '_name', [], m.name)}</span>
                                <span class="merc-detail-count">${localizationManager.t('ui_roster_owned', [totalPulls])}</span>
                            </div>
                            <div class="merc-detail-desc">${localizationManager.t('char_' + m.id + '_personality', [], m.personality)}</div>
                        </div>
                    </div>
                    
                    <div class="merc-detail-columns">
                        <div class="merc-stats-section">
                            <div class="section-title">${localizationManager.t('ui_roster_stats')}</div>
                            <div class="merc-stats-grid">
                                ${stats.map(s => renderStat(s.label, s.val)).join('')}
                            </div>
                        </div>

                        <div class="merc-skills-section">
                            <div class="section-title">${localizationManager.t('ui_roster_skills')}</div>
                            <div class="merc-skills-grid">
                                <div class="merc-skill-card">
                                    <div class="skill-header">
                                        <span class="skill-emoji">${m.skillEmoji}</span>
                                        <span class="skill-name">${localizationManager.t('char_' + m.id + '_skill_name', [], m.skillName)}</span>
                                    </div>
                                    <div class="skill-desc">${localizationManager.t('char_' + m.id + '_skill_desc', [], m.skillDescription)}</div>
                                </div>
                                <div class="merc-skill-card ultimate">
                                    <div class="skill-header">
                                        <span class="skill-emoji">✨</span>
                                        <span class="skill-name">${localizationManager.t('char_' + m.id + '_ult_name', [], m.ultimateName)}</span>
                                    </div>
                                    <div class="skill-desc">${localizationManager.t('char_' + m.id + '_ult_desc', [], m.ultimateDescription)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        };

        const rosterHtml = `
            <div class="mercenary-roster-v2">
                <style>
                    .mercenary-roster-v2 {
                        display: flex;
                        width: 100%;
                        height: 100%;
                        background: #0f172a;
                        color: #e2e8f0;
                        font-family: 'Outfit', sans-serif;
                        overflow: hidden;
                    }
                    /* Sidebar */
                    .roster-sidebar {
                        width: 100px;
                        background: rgba(30, 41, 59, 0.8);
                        border-right: 2px solid #334155;
                        display: flex;
                        flex-direction: column;
                        padding: 10px;
                        gap: 10px;
                        overflow-y: auto;
                        flex-shrink: 0;
                    }
                    .sidebar-item {
                        width: 70px;
                        height: 70px;
                        background: #1e293b;
                        border: 2px solid #475569;
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        flex-shrink: 0;
                        position: relative;
                    }
                    .sidebar-item:hover { transform: scale(1.05); border-color: #94a3b8; }
                    .sidebar-item.active { border-color: #fbbf24; background: #334155; box-shadow: 0 0 10px rgba(251, 191, 36, 0.3); }
                    .sidebar-thumb { width: 48px; height: 48px; image-rendering: pixelated; }

                    /* Content */
                    .roster-content {
                        flex: 1;
                        min-width: 0;
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                        overflow: hidden;
                    }
                    .merc-detail-view {
                        flex: 1;
                        padding: 24px;
                        overflow-y: auto;
                        display: flex;
                        flex-direction: column;
                        gap: 20px;
                        min-width: 0;
                    }
                    .section-title {
                        font-family: 'Press Start 2P', cursive;
                        font-size: 10px;
                        color: #64748b;
                        margin-bottom: 10px;
                        letter-spacing: 1px;
                        border-left: 3px solid #fbbf24;
                        padding-left: 8px;
                    }

                    /* Detail Header */
                    .merc-detail-header { display: flex; gap: 15px; align-items: flex-start; flex-wrap: wrap; }
                    .merc-detail-left-col { display: flex; flex-direction: column; gap: 12px; width: 110px; align-items: center; flex-shrink: 0; }
                    .merc-detail-sprite-wrap {
                        width: 100%; height: 110px;
                        background: radial-gradient(circle, #334155 0%, #0f172a 100%);
                        border: 2px solid #475569;
                        border-radius: 12px;
                        display: flex; align-items: center; justify-content: center;
                    }
                    .merc-detail-sprite { width: 90px; height: 90px; image-rendering: pixelated; }
                    .merc-detail-title-info { flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 150px; }
                    .merc-detail-name-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 5px; }
                    .merc-detail-name { font-size: 24px; font-weight: 900; color: #fbbf24; text-shadow: 0 2px 4px rgba(0,0,0,0.5); word-break: keep-all; }
                    .merc-detail-count { background: #7c3aed; padding: 2px 6px; border-radius: 6px; font-size: 11px; font-weight: bold; white-space: nowrap; }
                    .merc-detail-desc { 
                        font-size: 13px; color: #cbd5e1; line-height: 1.5; font-style: italic; 
                        max-height: 100px; overflow-y: auto; padding-right: 5px;
                        word-break: break-word;
                    }
                    .merc-detail-desc::-webkit-scrollbar { width: 4px; }
                    .merc-detail-desc::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }

                    /* Stats Grid */
                    .merc-stats-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(50px, 1fr));
                        gap: 8px;
                        background: rgba(30, 41, 59, 0.5);
                        padding: 12px;
                        border-radius: 12px;
                        border: 1px solid #334155;
                    }
                    .merc-stat-item { display: flex; flex-direction: column; gap: 4px; align-items: center; text-align: center; }
                    .stat-label { font-size: 9px; color: #94a3b8; font-weight: bold; }
                    .stat-value { color: #f8fafc; font-weight: 800; font-family: 'Press Start 2P', cursive; font-size: 9px; }

                    /* Skills */
                    .merc-skills-section { display: flex; flex-direction: column; gap: 10px; }
                    .merc-skills-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
                    .merc-skill-card {
                        background: #1e293b;
                        border: 1px solid #334155;
                        border-radius: 10px;
                        padding: 12px;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }
                    .merc-skill-card.ultimate { border-color: #fbbf24; background: rgba(251, 191, 36, 0.05); }
                    .skill-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
                    .skill-emoji { font-size: 18px; }
                    .skill-name { font-size: 15px; font-weight: bold; color: #fbbf24; }
                    .skill-desc { font-size: 12px; color: #cbd5e1; line-height: 1.5; }

                    /* Desktop Columns */
                    .merc-detail-columns {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                        margin-top: 10px;
                    }
                    @media (max-width: 800px) {
                        .merc-detail-columns {
                            grid-template-columns: 1fr;
                        }
                    }

                    .theme-skin-btn {
                        background: #1e293b; border: 1px solid #fbbf24; border-radius: 6px;
                        color: #fbbf24; padding: 6px 4px; cursor: pointer; font-weight: bold;
                        transition: all 0.2s; font-family: 'Press Start 2P', cursive; font-size: 7px;
                        width: 100%; text-align: center; white-space: normal; line-height: 1.2;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        display: flex; align-items: center; justify-content: center; min-height: 30px;
                    }
                    .theme-skin-btn.active-btn { border-color: #fbbf24; color: #fbbf24; background: rgba(251, 191, 36, 0.1); box-shadow: 0 0 10px rgba(251, 191, 36, 0.15); }
                    .theme-skin-btn.active-btn:hover { background: #fbbf24; color: #0f172a; box-shadow: 0 0 15px rgba(251, 191, 36, 0.4); transform: translateY(-2px); }

                    /* Skin Selector Modal */
                    .skin-selector-overlay {
                        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                        background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 30000;
                        backdrop-filter: blur(8px);
                    }
                    .skin-selector-card {
                        background: #1e293b; border: 2px solid #fbbf24; border-radius: 16px;
                        width: 500px; padding: 25px; display: flex; flex-direction: column; gap: 20px;
                        box-shadow: 0 0 30px rgba(251, 191, 36, 0.2);
                    }
                    .skin-selector-header { display: flex; justify-content: space-between; align-items: center; }
                    .skin-selector-title { font-size: 20px; color: #fbbf24; font-weight: bold; }
                    .skin-selector-close { cursor: pointer; color: #94a3b8; font-size: 24px; }
                    
                    .skin-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
                    .skin-item {
                        border: 2px solid #334155; border-radius: 12px; padding: 10px;
                        display: flex; flex-direction: column; align-items: center; gap: 10px;
                        transition: all 0.2s; cursor: pointer; background: rgba(15, 23, 42, 0.5);
                    }
                    .skin-item:hover { transform: translateY(-5px); border-color: #475569; }
                    .skin-item.owned { border-color: #fbbf24; }
                    .skin-item.equipped { background: rgba(251, 191, 36, 0.1); border-color: #fbbf24; box-shadow: 0 0 10px rgba(251, 191, 36, 0.2); }
                    
                    .skin-thumb { width: 80px; height: 80px; image-rendering: pixelated; }
                    .skin-name { font-size: 14px; font-weight: bold; color: #f8fafc; text-align: center; }
                    .skin-price { color: #fbbf24; font-size: 12px; font-weight: bold; display: flex; align-items: center; gap: 4px; }
                    .skin-equipped-tag { font-size: 10px; color: #fbbf24; font-weight: bold; }
                    .skin-bonus { font-size: 11px; color: #94a3b8; text-align: center; font-style: italic; }
                </style>

                <div class="roster-sidebar">
                    ${mercsToShow.map(m => `
                        <div class="sidebar-item ${m.id === this.currentRosterSelection ? 'active' : ''}" 
                             id="roster-item-${m.id}" 
                             onclick="window.uiManager.mercenaryCodexUI.switchRosterSelection('${m.id}')">
                            <img src="assets/characters/party/${m.sprite}.png" class="sidebar-thumb">
                        </div>
                    `).join('')}
                </div>

                <div class="roster-content" id="roster-detail-container">
                    ${renderMercDetail(mercsToShow.find(m => m.id === this.currentRosterSelection))}
                </div>
            </div>
        `;

        this.uiManager.showPopup(rosterHtml, true);

        // Bind helper methods for dynamic updates
        this.renderMercDetail = renderMercDetail;
        this.mercsToShow = mercsToShow;
    }

    /**
     * Internal: Switches the current roster selection.
     */
    switchRosterSelection(id) {
        const m = this.mercsToShow.find(merc => merc.id === id);
        if (!m) return;

        this.currentRosterSelection = id;

        // Update sidebar active state
        document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
        const activeItem = document.getElementById(`roster-item-${id}`);
        if (activeItem) activeItem.classList.add('active');
        
        // Update content
        const container = document.getElementById('roster-detail-container');
        if (container) {
            container.innerHTML = this.renderMercDetail(m);
        }
    }

    /**
     * Opens the skin selector for a mercenary.
     */
    async openSkinSelector(charId) {
        const skinData = await DBManager.getMercenarySkinData(charId);
        const availableSkins = Object.values(Skins).filter(s => s.characterId === charId);

        const modal = document.createElement('div');
        modal.className = 'skin-selector-overlay';

        modal.innerHTML = `
            <div class="skin-selector-card">
                <div class="skin-selector-header">
                    <span class="skin-selector-title">${localizationManager.t('ui_skin_selector_title', [charId.toUpperCase()])}</span>
                    <span class="skin-selector-close" onclick="this.closest('.skin-selector-overlay').remove()">×</span>
                </div>
                <div class="skin-list">
                    <!-- Default Skin -->
                    <div class="skin-item ${!skinData.equippedSkin ? 'equipped owned' : 'owned'}" 
                         onclick="window.uiManager.mercenaryCodexUI.handleSkinAction('${charId}', 'default')">
                        <img src="assets/characters/party/${charId}_sprite.png" class="skin-thumb">
                        <span class="skin-name">${localizationManager.t('ui_skin_default')}</span>
                        ${!skinData.equippedSkin ? `<span class="skin-equipped-tag">${localizationManager.t('ui_skin_equipped')}</span>` : ''}
                    </div>
                    
                    ${availableSkins.map(s => {
            const isOwned = skinData.ownedSkins.includes(s.id);
            const isEquipped = skinData.equippedSkin === s.id;
            return `
                            <div class="skin-item ${isOwned ? 'owned' : ''} ${isEquipped ? 'equipped' : ''}"
                                 onclick="window.uiManager.mercenaryCodexUI.handleSkinAction('${charId}', '${s.id}')">
                                <img src="assets/characters/skin/${s.sprite}.png" class="skin-thumb">
                                <span class="skin-name">${localizationManager.t('skin_' + s.id + '_name', [], s.name)}</span>
                                <span class="skin-bonus">${localizationManager.t('skin_' + s.id + '_bonus', [], s.abilityBonus.bonusText)}</span>
                                ${isEquipped ? `<span class="skin-equipped-tag">${localizationManager.t('ui_skin_equipped')}</span>` :
                    isOwned ? `<span class="skin-price">${localizationManager.t('ui_skin_owned')}</span>` :
                        `<span class="skin-price">💎 ${s.price.toLocaleString()}</span>`}
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Handles skin selection or purchase action.
     */
    async handleSkinAction(charId, skinId) {
        const skinData = await DBManager.getMercenarySkinData(charId);
        const skinIdx = Object.values(Skins).findIndex(s => s.id === skinId);
        const skin = skinIdx !== -1 ? Object.values(Skins)[skinIdx] : null;

        if (skinId === 'default') {
            await DBManager.setEquippedSkin(charId, null);
            this.updateSkinUI(charId, null);
        } else if (skinData.ownedSkins.includes(skinId)) {
            await DBManager.setEquippedSkin(charId, skinId);
            this.updateSkinUI(charId, skinId);
        } else if (skin) {
            // Buy logic
            const confirmMsg = localizationManager.t('ui_skin_buy_confirm', [skin.name, skin.price.toLocaleString()]);
            this.uiManager.showConfirm(confirmMsg, async () => {
                const result = await DBManager.buySkin(charId, skinId, skin.price);
                if (result.success) {
                    this.uiManager.showToast(localizationManager.t('ui_skin_buy_success'), 'success');
                    await DBManager.setEquippedSkin(charId, skinId);
                    EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);
                    this.updateSkinUI(charId, skinId);
                } else {
                    this.uiManager.showToast(result.message, 'error');
                }
            });
        }
    }

    /**
     * Updates the UI after a skin change.
     */
    async updateSkinUI(charId, skinId) {
        // Update PartyManager cache immediately if possible
        if (window._partyManagerInstance) {
            await window._partyManagerInstance.loadSkinData(charId);
        }

        // Refresh
        document.querySelector('.skin-selector-overlay')?.remove();
        await this.showMercenaryRoster();

        // Notify game to update sprites if in scene
        EventBus.emit('SKIN_CHANGED', { charId, skinId });
    }
}
