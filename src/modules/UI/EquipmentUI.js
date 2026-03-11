import DBManager from '../Database/DBManager.js';
import EventBus from '../Events/EventBus.js';
import ItemManager, { ITEM_TYPES } from '../Core/ItemManager.js';
import EquipmentManager from '../Core/EquipmentManager.js';
import localizationManager from '../Core/LocalizationManager.js';

/**
 * EquipmentUI.js
 * Premium "Equipment Sanctuary" interface.
 * Handles crafting, character equipment management, and instance details.
 */
export default class EquipmentUI {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.currentCraftFilter = null;
        this.currentEquipSelection = null;
    }

    /**
     * Shows the Equipment Crafting/Management popup.
     */
    async show() {
        console.log('[EquipmentUI] Opening Equipment Sanctuary...');
        
        const wood = await DBManager.getInventoryItem('emoji_wood');
        const woodSvg = ItemManager.getSVGFilename('emoji_wood');

        const html = `
            <div id="equipment-sanctuary-wrapper" class="equip-sanctuary-v1">
                <style>
                    .equip-sanctuary-v1 {
                        display: flex;
                        flex-direction: column;
                        width: 100%;
                        height: 100%;
                        background: #11001c;
                        color: #e9d5ff;
                        font-family: 'Outfit', sans-serif;
                        overflow: hidden;
                        border: 2px solid #7c3aed;
                        box-sizing: border-box;
                    }

                    /* Constrain images */
                    .equip-sanctuary-v1 img {
                        max-width: 100%;
                        object-fit: contain;
                    }

                    /* Header */
                    .sanctuary-header {
                        height: 50px;
                        background: linear-gradient(to right, #4c1d95, #7c3aed);
                        border-bottom: 2px solid #a78bfa;
                        display: flex;
                        align-items: center;
                        padding: 0 16px;
                    }
                    .sanctuary-title {
                        font-family: 'Press Start 2P', cursive;
                        font-size: 14px;
                        color: #fef08a;
                        text-shadow: 2px 2px #000;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }

                    .sanctuary-body {
                        flex: 1;
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                        padding: 20px;
                        overflow: hidden;
                        background: radial-gradient(circle at center, #2e1065 0%, #11001c 100%);
                    }

                    /* Scrollable areas */
                    .sanctuary-scroll {
                        overflow-y: auto;
                        padding-right: 10px;
                    }
                    .sanctuary-scroll::-webkit-scrollbar { width: 6px; }
                    .sanctuary-scroll::-webkit-scrollbar-thumb { background: #7c3aed; border-radius: 3px; }

                    .section-label {
                        font-family: 'Press Start 2P', cursive;
                        font-size: 10px;
                        color: #a78bfa;
                        margin-bottom: 12px;
                        text-transform: uppercase;
                    }

                    /* Recipe List */
                    .recipe-grid { display: flex; flex-direction: column; gap: 12px; }
                    .recipe-card {
                        background: rgba(0, 0, 0, 0.4);
                        border: 1px solid #4c1d95;
                        border-radius: 12px;
                        padding: 12px;
                        display: flex;
                        align-items: center;
                        gap: 16px;
                        cursor: pointer;
                        transition: all 0.2s;
                        position: relative;
                    }
                    .recipe-card:hover { border-color: #a78bfa; background: rgba(124, 58, 237, 0.1); }
                    .recipe-card.active { 
                        border-color: #fef08a; 
                        background: rgba(254, 240, 138, 0.05);
                        box-shadow: 0 0 15px rgba(124, 58, 237, 0.3);
                    }
                    .recipe-card.active::after {
                        content: '★';
                        position: absolute;
                        top: 8px;
                        right: 12px;
                        color: #fef08a;
                        font-size: 10px;
                    }

                    .card-icon-box {
                        width: 50px; height: 50px;
                        background: #000;
                        border: 1px solid #7c3aed;
                        border-radius: 8px;
                        display: flex; align-items: center; justify-content: center;
                        flex-shrink: 0;
                    }
                    .card-icon { width: 36px; height: 36px; image-rendering: pixelated; }

                    .card-main { flex: 1; min-width: 0; }
                    .card-name { font-weight: bold; font-size: 14px; color: #f3f4f6; margin-bottom: 4px; }
                    .card-req { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: bold; }

                    /* Owned List */
                    .owned-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
                        gap: 12px;
                        align-content: start;
                    }
                    .owned-card {
                        background: rgba(0, 0, 0, 0.3);
                        border: 1px solid #4c1d95;
                        border-radius: 8px;
                        padding: 8px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 4px;
                        cursor: pointer;
                        transition: all 0.1s;
                        position: relative;
                        text-align: center;
                    }
                    .owned-card:hover { border-color: #a78bfa; background: rgba(124, 58, 237, 0.1); }
                    .owned-card.active { 
                        border-color: #fef08a; 
                        background: rgba(254, 240, 138, 0.2);
                        box-shadow: 0 0 10px rgba(254, 240, 138, 0.3);
                    }
                    .owned-lv {
                        position: absolute; top: -5px; right: -5px;
                        background: #7c3aed; color: #fff;
                        font-size: 8px; font-weight: bold;
                        padding: 2px 5px; border-radius: 4px;
                        border: 1px solid rgba(255, 255, 255, 0.3);
                    }
                    .owned-icon { width: 40px; height: 40px; image-rendering: pixelated; }
                    .owned-name { font-size: 9px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
                    .owned-tag { font-size: 8px; padding: 1px 4px; border-radius: 3px; font-weight: bold; margin-top: 2px; }

                    /* Buttons */
                    .sanctuary-btn {
                        background: #7c3aed;
                        border: none;
                        border-radius: 6px;
                        padding: 10px 16px;
                        color: #fff !important;
                        font-weight: bold;
                        font-size: 12px;
                        cursor: pointer;
                        box-shadow: 0 4px #4c1d95;
                        text-align: center;
                    }
                    .sanctuary-btn:hover { background: #8b5cf6; }
                    .sanctuary-btn:active { transform: translateY(2px); box-shadow: 0 2px #4c1d95; }
                    .sanctuary-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; pointer-events: none; }

                    /* Control Panel */
                    .control-panel {
                        margin-top: 15px;
                        padding: 16px;
                        background: rgba(124, 58, 237, 0.1);
                        border: 1px dashed #7c3aed;
                        border-radius: 12px;
                        display: none;
                        flex-direction: column;
                        gap: 12px;
                    }
                    .selected-info { font-weight: bold; font-size: 12px; color: #fef08a; }

                    /* Footer */
                    .sanctuary-footer {
                        height: 50px;
                        background: rgba(0, 0, 0, 0.5);
                        border-top: 2px solid #7c3aed;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 0 20px;
                    }
                    .footer-mat { display: flex; align-items: center; gap: 8px; font-weight: bold; color: #ddd; }
                    .footer-mat img { width: 22px; height: 22px; image-rendering: pixelated; }
                    .footer-tip { font-size: 11px; opacity: 0.7; font-style: italic; }
                </style>

                <div class="sanctuary-header">
                    <div class="sanctuary-title">
                        <span>⚔️</span> ${localizationManager.t('ui_craft_title', [], 'EQUIPMENT SANCTUARY')}
                    </div>
                </div>

                <div class="sanctuary-body">
                    <div class="sanctuary-scroll">
                        <div class="section-label">${localizationManager.t('ui_craft_list_header')}</div>
                        <div class="recipe-grid" id="recipe-grid-container">
                            <!-- Recipes will be injected here -->
                        </div>
                    </div>

                    <div class="sanctuary-scroll">
                        <div class="section-label">${localizationManager.t('ui_owned_growth_header')}</div>
                        <div id="owned-equip-grid" class="owned-grid">
                            <!-- Owned items will be injected here -->
                        </div>

                        <div id="sanctuary-controls" class="control-panel">
                            <div id="sanctuary-selected-name" class="selected-info">NONE SELECTED</div>
                            <div style="display: flex; gap: 10px;">
                                <button class="sanctuary-btn action-detail" style="flex: 1; background: #4f46e5; box-shadow: 0 4px #3730a3;">${localizationManager.t('ui_craft_detail_btn')}</button>
                                <button class="sanctuary-btn action-destroy" style="flex: 1; background: #dc2626; box-shadow: 0 4px #991b1b;">${localizationManager.t('ui_craft_destroy_btn')}</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="sanctuary-footer">
                    <div class="footer-mat">
                        <img src="assets/emojis/${woodSvg}"> <span id="sanctuary-wood-val">${wood ? wood.amount.toLocaleString() : 0}</span>
                    </div>
                    <div class="footer-tip text-purple-200">
                        ${localizationManager.t('ui_craft_footer_tip')}
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
        const wrapper = document.getElementById('equipment-sanctuary-wrapper');
        if (!wrapper) return;

        console.log('[EquipmentUI] Initializing...');
        await this._refresh();
        this._attachEvents(wrapper);
    }

    async _refresh() {
        const wrapper = document.getElementById('equipment-sanctuary-wrapper');
        if (!wrapper) return;

        // 1. Data Fetch
        const wood = await DBManager.getInventoryItem('emoji_wood');
        const allItems = ItemManager.getAllItems();
        const instances = await DBManager.getAllEquipmentInstances();

        // 2. Refresh Wood display
        const woodVal = wrapper.querySelector('#sanctuary-wood-val');
        if (woodVal) woodVal.innerText = (wood ? wood.amount : 0).toLocaleString();

        // 3. Render Recipes
        const recipes = [];
        for (const id in allItems) {
            if (allItems[id].type === ITEM_TYPES.EQUIPMENT) {
                recipes.push({ id, reqWood: 500 });
            }
        }

        if (!this.currentCraftFilter && recipes.length > 0) {
            this.currentCraftFilter = recipes[0].id;
        }

        const recipeHtml = recipes.map(r => {
            const item = ItemManager.getItem(r.id);
            const canCraft = wood && wood.amount >= r.reqWood;
            const iconUrl = item.customAsset || `assets/emojis/${ItemManager.getSVGFilename(r.id)}`;
            const isSelected = this.currentCraftFilter === r.id;

            return `
                <div class="recipe-card ${isSelected ? 'active' : ''}" data-id="${r.id}">
                    <div class="card-icon-box">
                        <img src="${iconUrl}" class="card-icon">
                    </div>
                    <div class="card-main">
                        <div class="card-name">${ItemManager.getLocalizedName(r.id)}</div>
                        <div class="card-req" style="color: ${canCraft ? '#e9d5ff' : '#ef4444'}">
                            <img src="assets/emojis/${ItemManager.getSVGFilename('emoji_wood')}" style="width:14px; height:14px;"> ${r.reqWood}
                        </div>
                    </div>
                    <button class="sanctuary-btn action-craft" data-id="${r.id}" ${canCraft ? '' : 'disabled'}>
                        ${localizationManager.t('ui_craft_btn')}
                    </button>
                </div>
            `;
        }).join('');
        
        const recipeGrid = wrapper.querySelector('#recipe-grid-container');
        if (recipeGrid) recipeGrid.innerHTML = recipeHtml;

        // 4. Render Owned Items (Filtered)
        let filteredInstances = instances;
        if (this.currentCraftFilter) {
            filteredInstances = instances.filter(i => i.itemId === this.currentCraftFilter);
        }
        filteredInstances.sort((a, b) => b.level - a.level);

        const ownedHtml = filteredInstances.map(inst => {
            const item = ItemManager.getItem(inst.itemId);
            const iconUrl = item.customAsset || `assets/emojis/${ItemManager.getSVGFilename(inst.itemId)}`;
            const isSelected = this.currentEquipSelection === inst.id;
            
            let tagHtml = '';
            if (inst.ownerId) {
                tagHtml = `<div class="owned-tag" style="background:rgba(251,191,36,0.3); color:#fef08a; border:1px solid rgba(251,191,36,0.5);">${localizationManager.t('ui_craft_equipped', [inst.ownerId])}</div>`;
            } else {
                tagHtml = `<div class="owned-tag" style="background:rgba(16,185,129,0.3); color:#34d399; border:1px solid rgba(16,185,129,0.5);">${localizationManager.t('ui_craft_in_inventory')}</div>`;
            }

            return `
                <div class="owned-card ${isSelected ? 'active' : ''}" data-inst-id="${inst.id}">
                    <div class="owned-lv">LV.${inst.level}</div>
                    <img src="${iconUrl}" class="owned-icon">
                    <div class="owned-name">${ItemManager.getLocalizedName(inst.itemId)}</div>
                    ${tagHtml}
                </div>
            `;
        }).join('');

        const ownedGrid = wrapper.querySelector('#owned-equip-grid');
        if (ownedGrid) {
            if (filteredInstances.length === 0) {
                ownedGrid.innerHTML = `<div style="grid-column: 1/-1; padding: 40px; text-align: center; opacity: 0.5; font-size: 13px;">${localizationManager.t('ui_craft_in_inventory', [], 'No items in inventory.')}</div>`;
            } else {
                ownedGrid.innerHTML = ownedHtml;
            }
        }

        // 5. Update Control Panel
        const controlPanel = wrapper.querySelector('#sanctuary-controls');
        const selectedName = wrapper.querySelector('#sanctuary-selected-name');
        
        if (this.currentEquipSelection) {
            const selectedInst = instances.find(i => i.id === this.currentEquipSelection);
            if (selectedInst) {
                controlPanel.style.display = 'flex';
                selectedName.innerText = `[SELECTED] ${ItemManager.getLocalizedName(selectedInst.itemId)} (LV.${selectedInst.level})`;
            } else {
                this.currentEquipSelection = null;
                controlPanel.style.display = 'none';
            }
        } else {
            controlPanel.style.display = 'none';
        }
    }

    _attachEvents(wrapper) {
        wrapper.onclick = async (e) => {
            // 1. Recipe Selection
            const recipeCard = e.target.closest('.recipe-card');
            if (recipeCard && !e.target.closest('.action-craft')) {
                const id = recipeCard.dataset.id;
                console.log(`[EquipmentUI] Filter: ${id}`);
                this.currentCraftFilter = id;
                this.currentEquipSelection = null; // Clear selection when filter changes
                await this._refresh();
                return;
            }

            // 2. Craft Action
            const craftBtn = e.target.closest('.action-craft');
            if (craftBtn) {
                const id = craftBtn.dataset.id;
                console.log(`[EquipmentUI] Craft: ${id}`);
                const result = await EquipmentManager.craftItem(id);
                if (result.success) {
                    this.uiManager.showToast(localizationManager.t('ui_craft_success', [ItemManager.getLocalizedName(id)]));
                    await this._refresh();
                } else {
                    this.uiManager.showToast(result.reason);
                }
                return;
            }

            // 3. Owned Item Selection
            const ownedCard = e.target.closest('.owned-card');
            if (ownedCard) {
                const instId = ownedCard.dataset.instId;
                console.log(`[EquipmentUI] Select: ${instId}`);
                this.currentEquipSelection = (this.currentEquipSelection === instId) ? null : instId;
                await this._refresh();
                return;
            }

            // 4. Detail Action
            const detailBtn = e.target.closest('.action-detail');
            if (detailBtn && this.currentEquipSelection) {
                const inst = await DBManager.getEquipmentInstance(this.currentEquipSelection);
                if (inst) {
                    const info = EquipmentManager.getDisplayInfo(inst);
                    const itemBase = ItemManager.getItem(inst.itemId);
                    const iconUrl = itemBase.customAsset || `assets/emojis/${ItemManager.getSVGFilename(inst.itemId)}`;
                    
                    const detailHtml = `
                        <div class="equip-detail-popup" style="padding: 24px; color: #f3f4f6; font-family: 'Outfit', sans-serif;">
                            <style>
                                .detail-header { display: flex; align-items: center; gap: 20px; border-bottom: 2px solid #7c3aed; padding-bottom: 16px; margin-bottom: 20px; }
                                .detail-icon { width: 64px; height: 64px; image-rendering: pixelated; background: #000; border-radius: 12px; border: 2px solid #7c3aed; padding: 10px; }
                                .detail-title { font-size: 20px; font-weight: bold; color: #fef08a; margin-bottom: 4px; }
                                .detail-subtitle { font-size: 13px; color: #a78bfa; }
                                .detail-section { background: rgba(0,0,0,0.4); padding: 16px; border-radius: 12px; border: 1px solid rgba(124,58,237,0.3); font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
                            </style>
                            <div class="detail-header">
                                <img src="${iconUrl}" class="detail-icon">
                                <div>
                                    <div class="detail-title">${ItemManager.getLocalizedName(inst.itemId)} (LV.${inst.level})</div>
                                    <div class="detail-subtitle">${localizationManager.t('ui_craft_unique_growth')}</div>
                                </div>
                            </div>
                            <div class="detail-section">${info.description}</div>
                            <div style="margin-top: 15px; text-align: center; font-size: 11px; opacity: 0.6;">${localizationManager.t('ui_craft_growth_tip')}</div>
                        </div>
                    `;
                    this.uiManager.showPopup(detailHtml);
                }
                return;
            }

            // 5. Destroy Action
            const destroyBtn = e.target.closest('.action-destroy');
            if (destroyBtn && this.currentEquipSelection) {
                const inst = await DBManager.getEquipmentInstance(this.currentEquipSelection);
                if (inst) {
                    const itemName = ItemManager.getLocalizedName(inst.itemId);
                    this.uiManager.showConfirm(localizationManager.t('ui_craft_destroy_confirm', [itemName, inst.level]), async () => {
                        // Unequip if needed
                        if (inst.ownerId) {
                            const partyManager = this.uiManager.scene?.game?.partyManager;
                            if (partyManager) {
                                const state = partyManager.getState(inst.ownerId);
                                if (state && state.equipment) {
                                    for (const [slot, item] of Object.entries(state.equipment)) {
                                        if (item && item.instanceId === inst.id) {
                                            await partyManager.unequipItem(inst.ownerId, slot);
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        
                        await DBManager.deleteEquipmentInstance(inst.id);
                        this.uiManager.showToast(localizationManager.t('ui_craft_destroy_success', [itemName]));
                        this.currentEquipSelection = null;
                        await this._refresh();
                    });
                }
                return;
            }
        };
    }
}
