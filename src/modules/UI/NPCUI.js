import DBManager from '../Database/DBManager.js';
import npcManager from '../Core/NPCManager.js';
import localizationManager from '../Core/LocalizationManager.js';

/**
 * NPCUI.js
 * Premium "Recruitment Hall" interface.
 * Handles NPC hiring, stack additions, and selection.
 */
export default class NPCUI {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    /**
     * Shows the NPC Recruitment popup.
     */
    async show() {
        console.log('[NPCUI] Opening Recruitment Hall...');
        
        const goldItem = await DBManager.getInventoryItem('emoji_coin');
        const gold = goldItem ? goldItem.amount : 0;
        
        const html = `
            <div id="npc-recruitment-wrapper" class="recruitment-hall-v1">
                <style>
                    .recruitment-hall-v1 {
                        display: flex;
                        flex-direction: column;
                        width: 100%;
                        height: 100%;
                        background: #1e1b4b; /* Deep Indigo/Purple */
                        color: #e0e7ff;
                        font-family: 'Outfit', sans-serif;
                        overflow: hidden;
                        border: 3px solid #8b5cf6;
                        box-sizing: border-box;
                    }

                    /* Header */
                    .hall-header {
                        height: 60px;
                        background: linear-gradient(to right, #4c1d95, #8b5cf6);
                        border-bottom: 2px solid #a78bfa;
                        display: flex;
                        align-items: center;
                        padding: 0 20px;
                    }
                    .hall-title {
                        font-family: 'Press Start 2P', cursive;
                        font-size: 16px;
                        color: #fbbf24;
                        text-shadow: 2px 2px #1e1b4b;
                        display: flex;
                        align-items: center;
                        gap: 15px;
                    }

                    /* Body */
                    .hall-body {
                        flex: 1;
                        padding: 25px;
                        overflow-y: auto;
                        background: radial-gradient(circle at center, #2e1065 0%, #1e1b4b 100%);
                    }

                    .npc-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                        gap: 20px;
                    }

                    /* NPC Card */
                    .npc-card {
                        background: rgba(30, 27, 75, 0.6);
                        border: 2px solid #4c1d95;
                        border-radius: 16px;
                        padding: 20px;
                        display: flex;
                        gap: 20px;
                        align-items: center;
                        position: relative;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        backdrop-filter: blur(10px);
                    }
                    .npc-card:hover {
                        border-color: #8b5cf6;
                        transform: translateY(-5px);
                        box-shadow: 0 10px 25px rgba(0,0,0,0.4), 0 0 15px rgba(139, 92, 246, 0.2);
                    }
                    .npc-card.active {
                        border-color: #fbbf24;
                        background: rgba(251, 191, 36, 0.05);
                        box-shadow: 0 0 20px rgba(251, 191, 36, 0.15);
                    }

                    .npc-icon-box {
                        background: rgba(0,0,0,0.4);
                        padding: 12px;
                        border-radius: 14px;
                        border: 1px solid rgba(255,255,255,0.1);
                        flex-shrink: 0;
                        box-shadow: inset 0 0 15px rgba(0,0,0,0.5);
                    }
                    .npc-icon {
                        width: 80px;
                        height: 80px;
                        object-fit: contain;
                        image-rendering: pixelated;
                    }

                    .npc-info {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }
                    .npc-name-row {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        font-size: 18px;
                        font-weight: bold;
                        color: #fbbf24;
                    }
                    .active-badge {
                        font-family: 'Press Start 2P', cursive;
                        font-size: 8px;
                        background: #fbbf24;
                        color: #000;
                        padding: 3px 6px;
                        border-radius: 4px;
                        box-shadow: 0 2px #b45309;
                    }

                    .npc-desc {
                        font-size: 13px;
                        color: #c7d2fe;
                        line-height: 1.5;
                        min-height: 40px;
                    }
                    .npc-status {
                        font-size: 12px;
                        font-weight: bold;
                        color: #6ee7b7;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }

                    /* Buttons */
                    .hall-btn-group {
                        display: flex;
                        gap: 10px;
                        margin-top: 10px;
                    }
                    .hall-btn {
                        padding: 10px 15px;
                        border-radius: 8px;
                        font-weight: bold;
                        font-size: 12px;
                        cursor: pointer;
                        transition: all 0.2s;
                        border: none;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 4px;
                        color: #fff !important;
                    }
                    
                    .btn-hire {
                        background: linear-gradient(to bottom, #d97706, #b45309);
                        flex: 2;
                        box-shadow: 0 4px #78350f;
                    }
                    .btn-hire:hover { background: #f59e0b; }
                    .btn-hire:active { transform: translateY(2px); box-shadow: 0 2px #78350f; }
                    .btn-hire:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(1); transform: none; box-shadow: none; }

                    .btn-select {
                        background: linear-gradient(to bottom, #2563eb, #1d4ed8);
                        flex: 1;
                        box-shadow: 0 4px #1e3a8a;
                    }
                    .btn-select:hover { background: #3b82f6; }
                    .btn-select:active { transform: translateY(2px); box-shadow: 0 2px #1e3a8a; }

                    /* Footer */
                    .hall-footer {
                        height: 60px;
                        background: rgba(0, 0, 0, 0.6);
                        border-top: 2px solid #8b5cf6;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 0 25px;
                    }
                    .footer-gold {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        font-weight: bold;
                        color: #fff;
                        font-size: 18px;
                    }
                    .footer-gold img { width: 28px; height: 28px; }

                    /* Scrollbar */
                    .recruitment-hall-v1 .hall-body::-webkit-scrollbar { width: 8px; }
                    .recruitment-hall-v1 .hall-body::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
                    .recruitment-hall-v1 .hall-body::-webkit-scrollbar-thumb { background: #4c1d95; border-radius: 4px; }
                    .recruitment-hall-v1 .hall-body::-webkit-scrollbar-thumb:hover { background: #8b5cf6; }
                </style>

                <div class="hall-header">
                    <div class="hall-title">
                        <span>🤝</span> ${localizationManager.t('ui_npc_hire_title', [], 'NPC RECRUITMENT')}
                    </div>
                </div>

                <div class="hall-body">
                    <div class="npc-grid" id="npc-recruitment-grid">
                        <!-- NPCs will be injected here -->
                    </div>
                </div>

                <div class="hall-footer">
                    <div class="footer-gold">
                        <img src="assets/emojis/1fa99.svg"> <span id="hall-gold-val">${gold.toLocaleString()}</span>
                    </div>
                    <div style="font-size: 12px; color: #a78bfa; opacity: 0.8; font-style: italic;">
                        ${localizationManager.t('ui_npc_footer_tip', [], 'Hired NPCs provide unique strategic advantages.')}
                    </div>
                </div>
            </div>
        `;

        this.uiManager.showPopup(html, true);
        
        // Wait for DOM
        requestAnimationFrame(() => {
            setTimeout(() => this._init(), 100);
        });
    }

    async _init() {
        const wrapper = document.getElementById('npc-recruitment-wrapper');
        if (!wrapper) return;

        console.log('[NPCUI] Initializing...');
        await this._refresh();
        this._attachEvents(wrapper);
    }

    async _refresh() {
        const wrapper = document.getElementById('npc-recruitment-wrapper');
        if (!wrapper) return;

        // 1. Data Fetch
        const goldItem = await DBManager.getInventoryItem('emoji_coin');
        const gold = goldItem ? goldItem.amount : 0;
        const roster = npcManager.roster;
        const activeId = npcManager.activeNPCId;

        // 2. Update Gold
        const goldVal = wrapper.querySelector('#hall-gold-val');
        if (goldVal) goldVal.innerText = gold.toLocaleString();

        // 3. Render Grid
        const grid = wrapper.querySelector('#npc-recruitment-grid');
        let html = '';

        Object.values(npcManager.constructor.NPC_DATA).forEach(npc => {
            const owned = roster[npc.id];
            const isActive = (npc.id === activeId);
            
            html += `
                <div class="npc-card ${isActive ? 'active' : ''}">
                    <div class="npc-icon-box">
                        <img src="assets/npc/${npc.sprite}.png" class="npc-icon">
                    </div>
                    <div class="npc-info">
                        <div class="npc-name-row">
                            ${npcManager.constructor.getLocalizedName(npc.id)}
                            ${isActive ? '<span class="active-badge">ACTIVE</span>' : ''}
                        </div>
                        <div class="npc-desc">${npcManager.constructor.getLocalizedDescription(npc.id)}</div>
                        
                        ${owned ? `
                            <div class="npc-status">
                                <span>📦</span> ${localizationManager.t('ui_npc_owned_stacks', [owned.stacks])}
                            </div>
                        ` : ''}

                        <div class="hall-btn-group">
                            <button class="hall-btn btn-hire action-hire" data-id="${npc.id}" ${gold < npc.cost ? 'disabled' : ''}>
                                <div style="display:flex; align-items:center; gap:6px;">
                                    <img src="assets/emojis/1fa99.svg" style="width:16px;">
                                    ${owned ? localizationManager.t('ui_npc_btn_add_stack', [npc.cost.toLocaleString()]) : localizationManager.t('ui_npc_btn_hire', [npc.cost.toLocaleString()])}
                                </div>
                            </button>
                            ${(owned && !isActive) ? `
                                <button class="hall-btn btn-select action-select" data-id="${npc.id}">
                                    ${localizationManager.t('ui_npc_btn_select', [], 'SELECT')}
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        if (grid) grid.innerHTML = html;
    }

    _attachEvents(wrapper) {
        wrapper.onclick = async (e) => {
            // 1. Hire/Add Stacks
            const hireBtn = e.target.closest('.action-hire');
            if (hireBtn) {
                const id = hireBtn.dataset.id;
                console.log(`[NPCUI] Hiring/Stacking: ${id}`);
                const result = await npcManager.hireNPC(id);
                this.uiManager.showToast(result.message);
                
                if (result.success) {
                    await this._refresh();
                    this.uiManager.updateNPCHUD();
                    if (this.uiManager.partyFormationOverlay) this.uiManager._updateNPCFormationSlot();
                }
                return;
            }

            // 2. Select NPC
            const selectBtn = e.target.closest('.action-select');
            if (selectBtn) {
                const id = selectBtn.dataset.id;
                console.log(`[NPCUI] Selecting active: ${id}`);
                if (npcManager.selectNPC(id)) {
                    await this._refresh();
                    this.uiManager.updateNPCHUD();
                    if (this.uiManager.partyFormationOverlay) this.uiManager._updateNPCFormationSlot();
                    const localizedName = npcManager.constructor.getLocalizedName(id);
                    this.uiManager.showToast(localizationManager.t('ui_npc_toast_activated', [localizedName]));
                }
                return;
            }
        };
    }
}
