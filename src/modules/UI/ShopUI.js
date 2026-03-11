import DBManager from '../Database/DBManager.js';
import EventBus from '../Events/EventBus.js';
import ItemManager from '../Core/ItemManager.js';
import CharmManager from '../Core/CharmManager.js';
import localizationManager from '../Core/LocalizationManager.js';

/**
 * ShopUI.js
 * Premium "Royal Shop" interface.
 * Extracted and upgraded from ShopManager.js.
 */
export default class ShopUI {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.currentCategory = 'tickets';
        
        // Define shop inventory structure
        this.inventory = {
            tickets: [
                { id: 'emoji_ticket', price: 10, currency: 'emoji_coin' },
                { id: 'swampland_ticket', price: 100, currency: 'emoji_coin' },
                { id: 'lava_field_ticket', price: 500, currency: 'emoji_coin' },
                { id: 'winter_land_ticket', price: 1000, currency: 'emoji_coin' }
            ],
            charms: [
                { id: 'emoji_fireworks', price: 100000, currency: 'emoji_coin' },
                { id: 'emoji_koinobori', price: 100000, currency: 'emoji_coin' },
                { id: 'emoji_sparkler', price: 100000, currency: 'emoji_coin' },
                { id: 'emoji_burger', price: 100000, currency: 'emoji_coin' }
            ],
            food: [
                { id: 'food_choco_parfait', price: 2000, currency: 'emoji_coin' },
                { id: 'food_strawberry_cake', price: 2000, currency: 'emoji_coin' }
            ],
            fishing: [
                { id: 'bamboo_fishing_rod', price: 20000, currency: 'emoji_coin' }
            ],
            alchemy: [
                { id: 'alchemy_tool_basic', price: 90000, currency: 'emoji_coin' }
            ],
            materials: [
                 // Add material items if needed
            ]
        };
    }

    /**
     * Shows the Royal Shop popup.
     */
    async show() {
        console.log('[ShopUI] Opening Royal Shop...');
        const gold = await DBManager.getInventoryItem('emoji_coin');
        const gem = await DBManager.getInventoryItem('emoji_gem');
        const coinSvg = ItemManager.getSVGFilename('emoji_coin');
        const gemSvg = ItemManager.getSVGFilename('emoji_gem');

        const shopHtml = `
            <div id="royal-shop-wrapper" class="royal-shop-v3">
                <style>
                    .royal-shop-v3 {
                        display: flex;
                        flex-direction: column;
                        width: 100%;
                        height: 100%;
                        background: #1a0505;
                        color: #fef3c7;
                        font-family: 'Outfit', sans-serif;
                        overflow: hidden;
                        border: 2px solid #fbbf24;
                        box-sizing: border-box;
                    }

                    /* Constrain any auto-replaced emojis or global images */
                    .royal-shop-v3 img {
                        max-width: 100%;
                        max-height: 100%;
                        object-fit: contain;
                    }

                    /* Header */
                    .royal-header {
                        height: 50px;
                        min-height: 50px;
                        background: linear-gradient(to bottom, #450a0a, #7f1d1d);
                        border-bottom: 2px solid #fbbf24;
                        display: flex;
                        align-items: center;
                        padding: 0 16px;
                    }
                    .royal-title {
                        font-family: 'Press Start 2P', cursive;
                        font-size: 14px;
                        color: #fbbf24;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        text-shadow: 2px 2px #000;
                    }
                    /* Ensure emoji icons in title don't explode */
                    .royal-title img, .royal-title span {
                        width: 24px !important;
                        height: 24px !important;
                        display: inline-block;
                        max-width: 24px !important;
                        max-height: 24px !important;
                    }

                    .royal-body {
                        flex: 1;
                        display: flex;
                        overflow: hidden;
                        background: radial-gradient(circle at center, #2d0a0a 0%, #1a0505 100%);
                    }

                    /* Sidebar */
                    .royal-sidebar {
                        width: 160px;
                        background: rgba(0, 0, 0, 0.4);
                        border-right: 1px solid rgba(251, 191, 36, 0.3);
                        display: flex;
                        flex-direction: column;
                        padding: 10px 0;
                        flex-shrink: 0;
                    }
                    .royal-tab {
                        padding: 14px 16px;
                        border: none;
                        background: transparent;
                        color: #94a3b8;
                        text-align: left;
                        font-weight: bold;
                        cursor: pointer;
                        transition: all 0.2s;
                        font-size: 13px;
                        border-left: 4px solid transparent;
                    }
                    .royal-tab:hover { background: rgba(251, 191, 36, 0.05); color: #fef3c7; }
                    .royal-tab.active {
                        color: #fbbf24;
                        background: rgba(251, 191, 36, 0.15);
                        border-left: 4px solid #fbbf24;
                    }

                    /* Content Area */
                    .royal-content {
                        flex: 1;
                        padding: 20px;
                        overflow-y: auto;
                        display: flex;
                        flex-direction: column;
                    }
                    .royal-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                        gap: 16px;
                        align-content: start;
                    }

                    /* Item Card */
                    .royal-card {
                        background: rgba(0, 0, 0, 0.3);
                        border: 1px solid #78350f;
                        border-radius: 8px;
                        padding: 12px;
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                        transition: transform 0.1s;
                    }
                    .royal-card:hover { border-color: #fbbf24; background: rgba(251, 191, 36, 0.05); }

                    .card-top { display: flex; align-items: center; gap: 10px; }
                    .card-icon-box {
                        width: 44px; height: 44px;
                        background: #1e1b4b;
                        border: 1px solid #4338ca;
                        border-radius: 6px;
                        display: flex; align-items: center; justify-content: center;
                        flex-shrink: 0;
                    }
                    .card-icon { width: 32px; height: 32px; image-rendering: pixelated; }
                    
                    .card-info { flex: 1; min-width: 0; }
                    .card-name { font-weight: bold; font-size: 13px; color: #f8fafc; margin-bottom: 2px; }
                    .card-price { display: flex; align-items: center; gap: 4px; color: #fbbf24; font-size: 11px; font-weight: bold; }

                    /* Buttons */
                    .royal-btn {
                        background: #fbbf24;
                        border: none;
                        border-radius: 4px;
                        padding: 8px;
                        color: #451a03 !important;
                        font-weight: bold;
                        font-size: 11px;
                        cursor: pointer;
                        box-shadow: 0 3px #b45309;
                        text-align: center;
                    }
                    .royal-btn:active { transform: translateY(1px); box-shadow: 0 1px #b45309; }
                    
                    .bulk-group { display: flex; gap: 4px; }
                    .bulk-btn { 
                        flex: 1; padding: 6px 0; font-size: 10px; background: #fbbf24; 
                        color: #451a03; border: none; font-weight: bold; cursor: pointer;
                        border-radius: 4px; box-shadow: 0 2px #b45309; text-align: center;
                    }

                    /* Footer */
                    .royal-footer {
                        height: 48px;
                        min-height: 48px;
                        background: rgba(0, 0, 0, 0.6);
                        border-top: 2px solid #fbbf24;
                        display: flex;
                        align-items: center;
                        justify-content: flex-end;
                        gap: 20px;
                        padding: 0 24px;
                    }
                    .footer-val { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: bold; }
                    .footer-val img { width: 20px !important; height: 20px !important; image-rendering: pixelated; }
                </style>

                <div class="royal-header">
                    <div class="royal-title">
                        ${localizationManager.t('shop_title', [], '🏛️ ROYAL SHOP')}
                    </div>
                </div>

                <div class="royal-body">
                    <div class="royal-sidebar">
                        <div class="royal-tab ${this.currentCategory === 'tickets' ? 'active' : ''}" data-cat="tickets">${localizationManager.t('shop_category_tickets')}</div>
                        <div class="royal-tab ${this.currentCategory === 'charms' ? 'active' : ''}" data-cat="charms">${localizationManager.t('shop_category_charms')}</div>
                        <div class="royal-tab ${this.currentCategory === 'food' ? 'active' : ''}" data-cat="food">${localizationManager.t('shop_category_food')}</div>
                        <div class="royal-tab ${this.currentCategory === 'fishing' ? 'active' : ''}" data-cat="fishing">${localizationManager.t('shop_category_fishing')}</div>
                        <div class="royal-tab ${this.currentCategory === 'alchemy' ? 'active' : ''}" data-cat="alchemy">${localizationManager.t('shop_category_alchemy')}</div>
                        <div class="royal-tab disabled" title="준비 중">${localizationManager.t('shop_category_materials')}</div>
                    </div>

                    <div class="royal-content">
                        <div class="royal-grid" id="royal-shop-grid">
                            ${this._renderItems(this.currentCategory)}
                        </div>
                    </div>
                </div>

                <div class="royal-footer">
                    <div class="footer-val">
                        <img src="assets/emojis/${coinSvg}"> <span id="royal-gold-text">${gold ? gold.amount.toLocaleString() : 0}</span>
                    </div>
                    <div class="footer-val">
                        <img src="assets/emojis/${gemSvg}"> <span id="royal-gem-text">${gem ? gem.amount.toLocaleString() : 0}</span>
                    </div>
                </div>
            </div>
        `;

        this.uiManager.showPopup(shopHtml, true);
        
        // Re-attach events after a brief delay to ensure DOM is ready
        requestAnimationFrame(() => {
            setTimeout(() => this._initEvents(), 100);
        });
    }

    _renderItems(category) {
        const items = this.inventory[category] || [];
        return items.map(item => {
            const itemData = ItemManager.getItem(item.id);
            const iconPath = itemData?.customAsset || `assets/emojis/${ItemManager.getSVGFilename(item.id)}`;
            const currencyId = item.currency || 'emoji_coin';
            const currencySvg = ItemManager.getSVGFilename(currencyId);
            const itemName = ItemManager.getLocalizedName(item.id);
            const isBulk = (category === 'food');

            return `
                <div class="royal-card">
                    <div class="card-top">
                        <div class="card-icon-box">
                            <img src="${iconPath}" class="card-icon">
                        </div>
                        <div class="card-info">
                            <div class="card-name" title="${itemName}">${itemName}</div>
                            <div class="card-price">
                                ${item.price.toLocaleString()} <img src="assets/emojis/${currencySvg}" style="width:12px; height:12px;">
                            </div>
                        </div>
                    </div>
                    
                    ${isBulk ? `
                        <div class="bulk-group">
                            <div class="bulk-btn buy-btn" data-id="${item.id}" data-price="${item.price}" data-currency="${currencyId}" data-qty="1">x1</div>
                            <div class="bulk-btn buy-btn" data-id="${item.id}" data-price="${item.price}" data-currency="${currencyId}" data-qty="10" style="background:#ea580c; color:#fff;">x10</div>
                            <div class="bulk-btn buy-btn" data-id="${item.id}" data-price="${item.price}" data-currency="${currencyId}" data-qty="100" style="background:#c2410c; color:#fff;">x100</div>
                        </div>
                    ` : `
                        <div class="royal-btn buy-btn" data-id="${item.id}" data-price="${item.price}" data-currency="${currencyId}" data-qty="1">
                            ${localizationManager.t('shop_buy', [], 'BUY')}
                        </div>
                    `}
                </div>
            `;
        }).join('');
    }

    _initEvents() {
        const wrapper = document.getElementById('royal-shop-wrapper');
        if (!wrapper) {
            console.error('[ShopUI] Shop wrapper not found for events');
            return;
        }

        console.log('[ShopUI] Initializing events via delegation...');

        // Delegation for tabs and buttons
        wrapper.onclick = async (e) => {
            // Tab clicks
            const tab = e.target.closest('.royal-tab');
            if (tab && !tab.classList.contains('disabled')) {
                const cat = tab.dataset.cat;
                if (cat) {
                    console.log(`[ShopUI] Tab: ${cat}`);
                    this.currentCategory = cat;
                    wrapper.querySelectorAll('.royal-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    
                    const grid = wrapper.querySelector('#royal-shop-grid');
                    if (grid) grid.innerHTML = this._renderItems(cat);
                }
                return;
            }

            // Buy clicks
            const buyBtn = e.target.closest('.buy-btn');
            if (buyBtn) {
                const id = buyBtn.dataset.id;
                const price = parseInt(buyBtn.dataset.price);
                const currency = buyBtn.dataset.currency;
                const qty = parseInt(buyBtn.dataset.qty) || 1;
                console.log(`[ShopUI] Buy: ${id} x${qty}`);
                await this._handlePurchase(id, price, currency, qty);
            }
        };
    }

    async _handlePurchase(itemId, price, currencyId, quantity = 1) {
        const currency = await DBManager.getInventoryItem(currencyId);
        const currentAmount = currency ? currency.amount : 0;
        const totalCost = price * quantity;

        if (currentAmount < totalCost) {
            this.uiManager.showToast(localizationManager.t('shop_low_resources'));
            return;
        }

        await DBManager.saveInventoryItem(currencyId, currentAmount - totalCost);
        const itemName = ItemManager.getLocalizedName(itemId);
        const qtyStr = quantity > 1 ? `x${quantity}` : '';

        const charmBase = CharmManager.getCharm(itemId);
        if (charmBase) {
            for (let i = 0; i < quantity; i++) {
                const rolledValue = Math.floor(Math.random() * (8 - 2 + 1)) + 2;
                const uniquePart = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().split('-')[0] : Math.floor(Math.random() * 1000000);
                await DBManager.saveCharmInstance({
                    instanceId: `charm_${Date.now()}_${uniquePart}`,
                    id: itemId,
                    stat: charmBase.stat,
                    value: rolledValue,
                    collectedAt: Date.now()
                });
            }
        } else {
            const existingItem = await DBManager.getInventoryItem(itemId);
            await DBManager.saveInventoryItem(itemId, (existingItem ? existingItem.amount : 0) + quantity);
        }

        this.uiManager.showToast(localizationManager.t('shop_buy_success', [itemName, qtyStr]));
        this._updateCredits();
        EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);
    }

    async _updateCredits() {
        const gold = await DBManager.getInventoryItem('emoji_coin');
        const gem = await DBManager.getInventoryItem('emoji_gem');
        const goldEl = document.getElementById('royal-gold-text');
        const gemEl = document.getElementById('royal-gem-text');
        if (goldEl) goldEl.innerText = (gold ? gold.amount : 0).toLocaleString();
        if (gemEl) gemEl.innerText = (gem ? gem.amount : 0).toLocaleString();
    }
}
