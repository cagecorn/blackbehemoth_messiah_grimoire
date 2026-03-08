import DBManager from '../Database/DBManager.js';
import EventBus from '../Events/EventBus.js';
import ItemManager from '../Core/ItemManager.js';
import CharmManager from '../Core/CharmManager.js';

export default class ShopManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.shopOverlay = null;
        this.currentCategory = 'tickets';

        this.inventory = {
            tickets: [
                { id: 'emoji_ticket', price: 10, currency: 'emoji_coin', label: '언데드 묘지 입장권', icon: '🎫' },
                { id: 'swampland_ticket', price: 100, currency: 'emoji_coin', label: '늪지대 입장권', icon: '🎫' },
                { id: 'lava_field_ticket', price: 500, currency: 'emoji_coin', label: '용암 지대 입장권', icon: '🎫' },
                { id: 'winter_land_ticket', price: 1000, currency: 'emoji_coin', label: '겨울의 나라 입장권', icon: '🎫' }
            ],
            charms: [
                { id: 'emoji_fireworks', price: 100000, currency: 'emoji_coin', label: '화염 저항의 참', icon: '🎆' },
                { id: 'emoji_koinobori', price: 100000, currency: 'emoji_coin', label: '냉기 저항의 참', icon: '🎏' },
                { id: 'emoji_sparkler', price: 100000, currency: 'emoji_coin', label: '번개 저항의 참', icon: '🎇' },
                { id: 'emoji_burger', price: 100000, currency: 'emoji_coin', label: '햄버거 참', icon: '🍔' }
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
                    <div class="shop-title">🏛️ ROYAL SHOP</div>
                    <button class="shop-close-btn" id="shop-close">✕</button>
                </div>
                
                <div class="shop-body">
                    <div class="shop-sidebar">
                        <button class="shop-tab active" data-category="tickets">🎫 입장권</button>
                        <button class="shop-tab" data-category="charms">✨ 부적</button>
                        <button class="shop-tab disabled" title="준비 중">🌿 재료</button>
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
            const iconSvg = ItemManager.getSVGFilename(item.id);
            const currencySvg = ItemManager.getSVGFilename(item.currency);

            return `
                <div class="shop-item-card" data-id="${item.id}" data-price="${item.price}" data-currency="${item.currency}">
                    <div class="shop-item-icon">
                        <img src="assets/emojis/${iconSvg}" alt="${item.label}" style="width: 32px; height: 32px; image-rendering: pixelated;">
                    </div>
                    <div class="shop-item-label">${item.label}</div>
                    <div class="shop-item-price">
                        <span class="price-val">${item.price}</span>
                        <img src="assets/emojis/${currencySvg}" alt="currency" style="width: 14px; height: 14px; margin-left: 2px;">
                    </div>
                    <button class="shop-buy-btn">구매</button>
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
            const buyBtn = card.querySelector('.shop-buy-btn');
            if (buyBtn) {
                buyBtn.onclick = (e) => {
                    e.stopPropagation();
                    this._handlePurchase(
                        card.dataset.id,
                        parseInt(card.dataset.price),
                        card.dataset.currency
                    );
                };
            }
        });
    }

    async _handlePurchase(itemId, price, currencyId) {
        const currency = await DBManager.getInventoryItem(currencyId);
        const currentAmount = currency ? currency.amount : 0;

        if (currentAmount < price) {
            this.uiManager.showToast('자원이 부족합니다! ⚠️');
            return;
        }

        // Save Currency
        await DBManager.saveInventoryItem(currencyId, currentAmount - price);

        const charmBase = CharmManager.getCharm(itemId);
        if (charmBase) {
            // Purchase Unique Charm Instance (Roll 2% ~ 8%)
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
            this.uiManager.showToast(`${ItemManager.getItem(itemId).name} (${rolledValue}%) 구매 완료! ✨`);
        } else {
            // Save Normal Stackable Item
            const existingItem = await DBManager.getInventoryItem(itemId);
            const newItemAmount = existingItem ? existingItem.amount + 1 : 1;
            await DBManager.saveInventoryItem(itemId, newItemAmount);
            this.uiManager.showToast(`${ItemManager.getItem(itemId).name} 구매 완료! ✨`);
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
