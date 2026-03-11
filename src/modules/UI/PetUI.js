import DBManager from '../Database/DBManager.js';
import EventBus from '../Events/EventBus.js';
import { PetStats, scaleStats } from '../Core/EntityStats.js';
import localizationManager from '../Core/LocalizationManager.js';

/**
 * PetUI.js
 * Premium "Pet Oasis" interface.
 * Handles pet roster, details, and feeding (level-up).
 */
export default class PetUI {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.selectedPetId = null;
    }

    /**
     * Shows the Pet Storage popup.
     */
    async show() {
        console.log('[PetUI] Opening Pet Oasis...');
        
        const meat = await DBManager.getInventoryItem('emoji_meat');
        
        const html = `
            <div id="pet-oasis-wrapper" class="pet-oasis-v1">
                <style>
                    .pet-oasis-v1 {
                        display: flex;
                        flex-direction: column;
                        width: 100%;
                        height: 100%;
                        background: #064e3b; /* Deep Emerald */
                        color: #ecfdf5;
                        font-family: 'Outfit', sans-serif;
                        overflow: hidden;
                        border: 3px solid #10b981;
                        box-sizing: border-box;
                    }

                    /* Header */
                    .oasis-header {
                        height: 60px;
                        background: linear-gradient(to right, #065f46, #10b981);
                        border-bottom: 2px solid #34d399;
                        display: flex;
                        align-items: center;
                        padding: 0 20px;
                    }
                    .oasis-title {
                        font-family: 'Press Start 2P', cursive;
                        font-size: 16px;
                        color: #fbbf24;
                        text-shadow: 2px 2px #064e3b;
                        display: flex;
                        align-items: center;
                        gap: 15px;
                    }

                    /* Body */
                    .oasis-body {
                        flex: 1;
                        display: grid;
                        grid-template-columns: 1fr 1.2fr;
                        gap: 0;
                        overflow: hidden;
                        background: url('assets/ui/nature_bg.png'), radial-gradient(circle at center, #064e3b 0%, #022c22 100%);
                        background-blend-mode: overlay;
                        background-size: cover;
                    }

                    /* Left: Roster */
                    .oasis-roster {
                        border-right: 1px solid rgba(52, 211, 153, 0.2);
                        padding: 20px;
                        overflow-y: auto;
                        display: flex;
                        flex-direction: column;
                        gap: 20px;
                    }
                    .roster-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                        gap: 15px;
                    }
                    .section-label {
                        font-family: 'Press Start 2P', cursive;
                        font-size: 10px;
                        color: #a7f3d0;
                        margin-bottom: 5px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }

                    .pet-card {
                        background: rgba(0, 0, 0, 0.4);
                        border: 2px solid #065f46;
                        border-radius: 12px;
                        padding: 12px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 8px;
                        cursor: pointer;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                        position: relative;
                        text-align: center;
                    }
                    .pet-card:hover { 
                        border-color: #34d399; 
                        background: rgba(16, 185, 129, 0.1);
                        transform: translateY(-3px);
                        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                    }
                    .pet-card.active { 
                        border-color: #fbbf24; 
                        background: rgba(251, 191, 36, 0.1);
                        box-shadow: 0 0 20px rgba(251, 191, 36, 0.2);
                    }
                    .pet-card.active::after {
                        content: '🐾';
                        position: absolute;
                        bottom: -10px;
                        font-size: 14px;
                        filter: drop-shadow(0 0 5px #fbbf24);
                    }

                    .pet-star {
                        position: absolute; top: 8px; right: 8px;
                        color: #fbbf24; font-weight: bold; font-size: 12px;
                        text-shadow: 1px 1px 2px #000;
                    }
                    .pet-icon { width: 64px; height: 64px; image-rendering: pixelated; object-fit: contain; }
                    .pet-name-sm { font-size: 11px; font-weight: bold; color: #fff; }

                    /* Right: Detail */
                    .oasis-detail {
                        padding: 30px;
                        display: flex;
                        flex-direction: column;
                        gap: 25px;
                        background: rgba(2, 44, 34, 0.6);
                        backdrop-filter: blur(5px);
                        overflow-y: auto;
                    }
                    .detail-empty {
                        margin: auto;
                        text-align: center;
                        color: #6ee7b7;
                        font-family: 'Press Start 2P', cursive;
                        font-size: 14px;
                        line-height: 2;
                        opacity: 0.6;
                    }

                    .detail-header {
                        text-align: center;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 15px;
                        animation: fadeInDown 0.4s ease-out;
                    }
                    .detail-title { color: #fbbf24; font-size: 24px; font-weight: 900; letter-spacing: 1px; }
                    .detail-icon-box {
                        background: rgba(0,0,0,0.4);
                        padding: 20px;
                        border-radius: 20px;
                        border: 2px solid rgba(52, 211, 153, 0.3);
                        box-shadow: inset 0 0 30px rgba(0,0,0,0.5);
                    }
                    .detail-icon-lg { width: 120px; height: 120px; image-rendering: pixelated; object-fit: contain; }
                    .detail-lv { 
                        font-family: 'Press Start 2P', cursive;
                        font-size: 12px;
                        color: #34d399;
                        background: rgba(0,0,0,0.3);
                        padding: 6px 15px;
                        border-radius: 20px;
                    }

                    .stat-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 10px;
                    }
                    .stat-row {
                        background: rgba(0,0,0,0.3);
                        padding: 10px 15px;
                        border-radius: 10px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        font-size: 13px;
                    }
                    .stat-label { color: #a7f3d0; opacity: 0.8; }
                    .stat-value { font-weight: bold; color: #fff; }

                    .passive-box {
                        background: rgba(16, 185, 129, 0.1);
                        border-left: 4px solid #fbbf24;
                        padding: 15px;
                        border-radius: 8px;
                        font-size: 14px;
                        line-height: 1.6;
                    }
                    .passive-header { font-weight: bold; color: #fbbf24; margin-bottom: 5px; font-size: 12px; text-transform: uppercase; }

                    /* Footer */
                    .oasis-footer {
                        height: 60px;
                        background: rgba(0, 0, 0, 0.6);
                        border-top: 2px solid #10b981;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 0 25px;
                    }
                    .footer-currency {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        font-weight: bold;
                        color: #fff;
                        font-size: 18px;
                    }
                    .footer-currency img { width: 28px; height: 28px; }

                    /* Button */
                    .oasis-btn {
                        background: linear-gradient(to bottom, #10b981, #059669);
                        border: none;
                        border-radius: 10px;
                        padding: 15px 25px;
                        color: #fff !important;
                        font-weight: bold;
                        font-size: 16px;
                        cursor: pointer;
                        box-shadow: 0 5px #064e3b;
                        transition: all 0.1s;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 4px;
                        margin-top: auto;
                    }
                    .oasis-btn:hover { background: #34d399; }
                    .oasis-btn:active { transform: translateY(3px); box-shadow: 0 2px #064e3b; }
                    .oasis-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; filter: grayscale(1); }

                    @keyframes fadeInDown {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                </style>

                <div class="oasis-header">
                    <div class="oasis-title">
                        <span>🌿</span> ${localizationManager.t('ui_pet_storage_title', [], 'PET OASIS')}
                    </div>
                </div>

                <div class="oasis-body">
                    <div class="oasis-roster sanctuary-scroll">
                        <div class="section-label">${localizationManager.t('ui_pet_list_header', [], 'Companion Roster')}</div>
                        <div class="roster-grid" id="pet-roster-grid">
                            <!-- Pets will be injected here -->
                        </div>
                    </div>

                    <div class="oasis-detail sanctuary-scroll" id="pet-detail-container">
                        <div class="detail-empty">
                            ${localizationManager.t('ui_pet_empty_selection', [], 'SELECT A PET<br>TO INSPECT')}
                        </div>
                    </div>
                </div>

                <div class="oasis-footer">
                    <div class="footer-currency">
                        <img src="assets/emojis/1f356.svg"> <span id="oasis-meat-val">${meat ? meat.amount.toLocaleString() : 0}</span>
                    </div>
                    <div style="font-size: 11px; color: #34d399; opacity: 0.8; font-style: italic;">
                        ${localizationManager.t('ui_pet_footer_tip', [], 'Nurture your companions with meat to grow their power.')}
                    </div>
                </div>
            </div>
        `;

        this.uiManager.showPopup(html, true);
        
        // Wait for DOM to be ready
        requestAnimationFrame(() => {
            setTimeout(() => this._init(), 100);
        });
    }

    async _init() {
        const wrapper = document.getElementById('pet-oasis-wrapper');
        if (!wrapper) return;

        console.log('[PetUI] Initializing...');
        await this._refresh();
        this._attachEvents(wrapper);
    }

    async _refresh() {
        const wrapper = document.getElementById('pet-oasis-wrapper');
        if (!wrapper) return;

        // 1. Data Fetch
        const partyManager = this.uiManager.scene?.game?.partyManager;
        if (!partyManager) return;

        const petRoster = partyManager.playerPetRoster || {};
        const meat = await DBManager.getInventoryItem('emoji_meat');

        // 2. Update Meat Display
        const meatVal = wrapper.querySelector('#oasis-meat-val');
        if (meatVal) meatVal.innerText = (meat ? meat.amount : 0).toLocaleString();

        // 3. Render Roster
        const grid = wrapper.querySelector('#pet-roster-grid');
        let html = '';

        Object.keys(PetStats).forEach(key => {
            const pet = PetStats[key];
            const starData = petRoster[pet.id];

            if (starData) {
                const highestStar = Math.max(...Object.keys(starData).map(Number));
                const isSelected = this.selectedPetId === pet.id;
                html += `
                    <div class="pet-card ${isSelected ? 'active' : ''}" data-id="${pet.id}">
                        <div class="pet-star">★${highestStar}</div>
                        <img src="assets/pet/${pet.sprite}.png" class="pet-icon">
                        <div class="pet-name-sm">${localizationManager.t('pet_name_' + pet.id)}</div>
                    </div>
                `;
            }
        });

        if (grid) {
            if (html === '') {
                grid.innerHTML = `<div style="grid-column: 1/-1; padding: 40px; text-align: center; opacity: 0.5; font-size: 12px; color: #a7f3d0;">${localizationManager.t('ui_pet_no_owned', [], 'Venture into the wild to find companions.')}</div>`;
            } else {
                grid.innerHTML = html;
            }
        }

        // 4. Render Detail
        this._updateDetail();
    }

    async _updateDetail() {
        const wrapper = document.getElementById('pet-oasis-wrapper');
        const container = wrapper?.querySelector('#pet-detail-container');
        if (!container) return;

        if (!this.selectedPetId) {
            container.innerHTML = `<div class="detail-empty">${localizationManager.t('ui_pet_empty_selection', [], 'SELECT A PET<br>TO INSPECT')}</div>`;
            return;
        }

        const partyManager = this.uiManager.scene?.game?.partyManager;
        const petId = this.selectedPetId;
        const state = partyManager.getPetState(petId);
        const baseConfig = PetStats[petId.toUpperCase()];
        const highestStar = partyManager.getHighestPetStar(petId);
        const cost = partyManager.getPetLevelUpCost(petId, state.level);

        // Scale stats
        const scaledConfig = scaleStats({ ...baseConfig, star: highestStar }, state.level);

        container.innerHTML = `
            <div class="detail-header">
                <div class="detail-title">★${highestStar} ${localizationManager.t('pet_name_' + petId)}</div>
                <div class="detail-icon-box">
                    <img src="assets/pet/${baseConfig.sprite}.png" class="detail-icon-lg">
                </div>
                <div class="detail-lv">LEVEL ${state.level}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-row">
                    <span class="stat-label">⚔️ ATK</span>
                    <span class="stat-value" style="color: #ef4444;">${scaledConfig.atk}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">🔮 MATK</span>
                    <span class="stat-value" style="color: #3b82f6;">${scaledConfig.mAtk}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">👟 SPEED</span>
                    <span class="stat-value">${scaledConfig.speed}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">⏱️ COOLDOWN</span>
                    <span class="stat-value">${scaledConfig.atkSpd}ms</span>
                </div>
            </div>

            <div class="passive-box">
                <div class="passive-header">🌟 PASSIVE: ${localizationManager.t('pet_passive_name_' + petId)}</div>
                <div style="color: #ecfdf5; opacity: 0.9;">${localizationManager.t('pet_passive_desc_' + petId)}</div>
            </div>

            <button class="oasis-btn action-feed" data-pet-id="${petId}">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <img src="assets/emojis/1f356.svg" style="width:20px; height:20px;">
                    ${localizationManager.t('ui_pet_feed_btn', [], 'Nurture Companion')}
                </div>
                <div style="font-size: 11px; opacity: 0.9; font-weight: normal;">
                    ${localizationManager.t('ui_pet_feed_cost', [cost.toLocaleString()], 'Requires {0} Meat')}
                </div>
            </button>
        `;

        // Check meat again for button state
        const meat = await DBManager.getInventoryItem('emoji_meat');
        const feedBtn = container.querySelector('.action-feed');
        if (feedBtn && (!meat || meat.amount < cost)) {
            feedBtn.disabled = true;
        }
    }

    _attachEvents(wrapper) {
        wrapper.onclick = async (e) => {
            // 1. Pet Selection
            const petCard = e.target.closest('.pet-card');
            if (petCard) {
                const id = petCard.dataset.id;
                console.log(`[PetUI] Select: ${id}`);
                this.selectedPetId = (this.selectedPetId === id) ? null : id;
                await this._refresh();
                return;
            }

            // 2. Feed Action
            const feedBtn = e.target.closest('.action-feed');
            if (feedBtn) {
                const petId = feedBtn.dataset.petId;
                const partyManager = this.uiManager.scene?.game?.partyManager;
                if (!partyManager) return;

                const state = partyManager.getPetState(petId);
                const cost = partyManager.getPetLevelUpCost(petId, state.level);
                
                const meatItem = await DBManager.getInventoryItem('emoji_meat');
                if (!meatItem || meatItem.amount < cost) {
                    this.uiManager.showToast(localizationManager.t('ui_pet_low_meat'));
                    return;
                }

                // Deduct meat
                await DBManager.saveInventoryItem('emoji_meat', meatItem.amount - cost);

                // Level Up
                await partyManager.feedPet(petId);
                this.uiManager.showToast(localizationManager.t('ui_pet_lvl_up_success', [localizationManager.t('pet_name_' + petId)]));

                // Refresh UI
                await this._refresh();
                return;
            }
        };
    }
}
