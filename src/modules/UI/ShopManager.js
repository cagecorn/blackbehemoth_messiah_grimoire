import DBManager from '../Database/DBManager.js';
import EventBus from '../Events/EventBus.js';
import ItemManager from '../Core/ItemManager.js';
import CharmManager from '../Core/CharmManager.js';
import localizationManager from '../Core/LocalizationManager.js';

export default class ShopManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.shopOverlay = null;
        this.currentCategory = 'tickets';

        this.inventory = {
            tickets: [
                { id: 'emoji_ticket', price: 10, currency: 'emoji_coin', icon: '🎫' },
                { id: 'swampland_ticket', price: 100, currency: 'emoji_coin', icon: '🎫' },
                { id: 'lava_field_ticket', price: 500, currency: 'emoji_coin', icon: '🎫' },
                { id: 'winter_land_ticket', price: 1000, currency: 'emoji_coin', icon: '🎫' }
            ],
            charms: [
                { id: 'emoji_fireworks', price: 100000, currency: 'emoji_coin', icon: '🎆' },
                { id: 'emoji_koinobori', price: 100000, currency: 'emoji_coin', icon: '🎏' },
                { id: 'emoji_sparkler', price: 100000, currency: 'emoji_coin', icon: '🎇' },
                { id: 'emoji_burger', price: 100000, currency: 'emoji_coin', icon: '🍔' }
            ],
            food: [
                { id: 'food_choco_parfait', price: 2000, currency: 'emoji_coin', icon: 'choco_parfait' },
                { id: 'food_strawberry_cake', price: 2000, currency: 'emoji_coin', icon: 'strawberry_cake' }
            ],
            fishing: [
                { id: 'bamboo_fishing_rod', price: 20000, currency: 'emoji_coin', icon: 'bamboo_fishing_rod' }
            ],
            alchemy: [
                { id: 'alchemy_tool_basic', price: 90000, currency: 'emoji_coin', icon: 'alchemy_tool' }
            ]
        };
    }

    async show() {
        if (this.shopOverlay) return;

        const overlay = document.createElement('div');
        overlay.id = 'shop-overlay';
        overlay.className = 'shop-overlay retro-scanline-overlay';
        this.shopOverlay = overlay;

        overlay.innerHTML = `
            <div class="shop-container">
                <div class="shop-header">
                    <div class="shop-title">${localizationManager.t('shop_title')}</div>
                    <button class="shop-close-btn" id="shop-close">✕</button>
                </div>
                
                <div class="shop-body">
                    <div class="shop-sidebar">
                        <button class="shop-tab active" data-category="tickets">${localizationManager.t('shop_category_tickets')}</button>
                        <button class="shop-tab" data-category="charms">${localizationManager.t('shop_category_charms')}</button>
                        <button class="shop-tab" data-category="food">${localizationManager.t('shop_category_food')}</button>
                        <button class="shop-tab" data-category="fishing">${localizationManager.t('shop_category_fishing')}</button>
                        <button class="shop-tab" data-category="alchemy">${localizationManager.t('shop_category_alchemy')}</button>
                        <button class="shop-tab disabled" title="준비 중">${localizationManager.t('shop_category_materials')}</button>
                    </div>
                    
                    <div class="shop-content">
                        <div class="shop-item-grid" id="shop-item-grid">
                            ${this._renderCategory('tickets')}
                        </div>
                    </div>
                </div>
                
                <div class="shop-footer">
                    <div class="shop-currency" id="shop-gold-display">💰 0</div>
                    <div class="shop-currency" id="shop-gem-display">💎 0</div>
                </div>
            </div>
        `;

        document.getElementById('app-container').appendChild(overlay);
        this._attachEvents();
        this._updateCurrency();
    }

    _renderCategory(categoryId) {
        const items = this.inventory[categoryId] || [];
        return items.map(item => {
            const itemData = ItemManager.getItem(item.id);
            const iconPath = itemData?.customAsset || `assets/emojis/${ItemManager.getSVGFilename(item.id)}`;
            const currencySvg = ItemManager.getSVGFilename(item.currency);

            // Support bulk purchase for food category
            const isBulk = (categoryId === 'food');

            const itemName = ItemManager.getLocalizedName(item.id);

            return `
                <div class="shop-item-card" data-id="${item.id}" data-price="${item.price}" data-currency="${item.currency}">
                    <div class="shop-item-top">
                        <div class="shop-item-icon">
                            <img src="${iconPath}" alt="${itemName}" style="width: 32px; height: 32px; image-rendering: pixelated; object-fit: contain;">
                        </div>
                        <div class="shop-item-label">${itemName}</div>
                        <div class="shop-item-price">
                            <span class="price-val">${item.price}</span>
                            <img src="assets/emojis/${currencySvg}" alt="currency" style="width: 14px; height: 14px; margin-left: 2px;">
                        </div>
                    </div>
                    <div class="shop-buy-group" style="display: flex; gap: 4px; width: 100%;">
                        ${isBulk ? `
                            <button class="shop-buy-btn" data-qty="1" style="flex:1; font-size:9px; padding: 4px 0;">x1</button>
                            <button class="shop-buy-btn" data-qty="10" style="flex:1; font-size:9px; padding: 4px 0; background:#be123c;">x10</button>
                            <button class="shop-buy-btn" data-qty="100" style="flex:1; font-size:9px; padding: 4px 0; background:#9f1239;">x100</button>
                        ` : `
                            <button class="shop-buy-btn" data-qty="1" style="width: 100%;">${localizationManager.t('shop_buy')}</button>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    }

    _attachEvents() {
        const closeBtn = document.getElementById('shop-close');
        if (closeBtn) {
            closeBtn.onclick = () => this.hide();
        }

        const tabBtns = this.shopOverlay.querySelectorAll('.shop-tab');
        tabBtns.forEach(btn => {
            if (btn.classList.contains('disabled')) return;
            btn.onclick = () => {
                const category = btn.dataset.category;
                if (!category) return;

                this.currentCategory = category;

                // UI Refresh
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const grid = document.getElementById('shop-item-grid');
                if (grid) {
                    grid.innerHTML = this._renderCategory(category);
                }

                // Re-bind purchase events for new items
                this._attachPurchaseEvents();
            };
        });

        this._attachPurchaseEvents();

        // Close on overlay click (background)
        this.shopOverlay.onclick = (e) => {
            if (e.target === this.shopOverlay) this.hide();
        };
    }

    _attachPurchaseEvents() {
        const cards = this.shopOverlay.querySelectorAll('.shop-item-card');
        cards.forEach(card => {
            const buyBtns = card.querySelectorAll('.shop-buy-btn');
            buyBtns.forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const qty = parseInt(btn.dataset.qty) || 1;
                    this._handlePurchase(
                        card.dataset.id,
                        parseInt(card.dataset.price),
                        card.dataset.currency,
                        qty
                    );
                };
            });
        });
    }

    async _handlePurchase(itemId, price, currencyId, quantity = 1) {
        const currency = await DBManager.getInventoryItem(currencyId);
        const currentAmount = currency ? currency.amount : 0;
        const totalCost = price * quantity;

        if (currentAmount < totalCost) {
            this.uiManager.showToast(localizationManager.t('shop_low_resources'));
            return;
        }

        // Save Currency
        await DBManager.saveInventoryItem(currencyId, currentAmount - totalCost);

        const itemName = ItemManager.getLocalizedName(itemId);
        const qtyStr = quantity > 1 ? `x${quantity}` : '';

        const charmBase = CharmManager.getCharm(itemId);
        if (charmBase) {
            // Purchase Unique Charm Instances
            for (let i = 0; i < quantity; i++) {
                const rolledValue = Math.floor(Math.random() * (8 - 2 + 1)) + 2;
                const uniquePart = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().split('-')[0] : Math.floor(Math.random() * 1000000);
                const instanceId = `charm_${Date.now()}_${uniquePart}`;

                const charmInstance = {
                    instanceId: instanceId,
                    id: itemId,
                    stat: charmBase.stat,
                    value: rolledValue,
                    collectedAt: Date.now()
                };

                await DBManager.saveCharmInstance(charmInstance);
            }
            this.uiManager.showToast(localizationManager.t('shop_buy_success', [itemName, qtyStr]));
        } else {
            // Save Normal Stackable Item
            const existingItem = await DBManager.getInventoryItem(itemId);
            const newItemAmount = existingItem ? existingItem.amount + quantity : quantity;
            await DBManager.saveInventoryItem(itemId, newItemAmount);
            this.uiManager.showToast(localizationManager.t('shop_buy_success', [itemName, qtyStr]));
        }

        // Refresh
        this._updateCurrency();
        EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);
    }

    async _updateCurrency() {
        if (!this.shopOverlay) return;
        const gold = await DBManager.getInventoryItem('emoji_coin');
        const gem = await DBManager.getInventoryItem('emoji_gem');

        const goldDisplay = document.getElementById('shop-gold-display');
        const gemDisplay = document.getElementById('shop-gem-display');

        const coinSvg = ItemManager.getSVGFilename('emoji_coin');
        const gemSvg = ItemManager.getSVGFilename('emoji_gem');

        if (goldDisplay) {
            goldDisplay.innerHTML = `<img src="assets/emojis/${coinSvg}" style="width: 18px; vertical-align: middle; margin-right: 4px;"> ${gold ? gold.amount : 0}`;
        }
        if (gemDisplay) {
            gemDisplay.innerHTML = `<img src="assets/emojis/${gemSvg}" style="width: 18px; vertical-align: middle; margin-right: 4px;"> ${gem ? gem.amount : 0}`;
        }
    }

    hide() {
        if (!this.shopOverlay) return;
        this.shopOverlay.classList.add('fade-out');
        setTimeout(() => {
            if (this.shopOverlay) {
                this.shopOverlay.remove();
                this.shopOverlay = null;
            }
        }, 300);
    }
}
