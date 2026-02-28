import Phaser from 'phaser';

export default class TerritoryScene extends Phaser.Scene {
    constructor() {
        super('TerritoryScene');
        this.partyOverlay = null;
        this.navContainer = null;
    }

    create() {
        console.log('TerritoryScene started');
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Background
        const bg = this.add.image(0, 0, 'bg_territory').setOrigin(0, 0);
        bg.setDisplaySize(width, height);

        // Title
        this.add.text(width / 2, 80, '영지 (Territory)', {
            fontSize: '48px',
            fill: '#e2e8f0',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // [DOM UI Wrapper]
        this.createDOMNavigation();

        // Initialize Party Selection if not set
        this.checkPartyStatus();
    }

    createDOMNavigation() {
        if (this.navContainer) this.navContainer.remove();

        this.navContainer = document.createElement('div');
        this.navContainer.className = 'territory-nav-container';
        this.navContainer.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            display: flex;
            gap: 20px;
            z-index: 1000;
        `;

        const buttons = [
            { label: '🏰 던전 입장', color: '#3b82f6', scene: 'DungeonScene' },
            { label: '⚔️ 아레나 입장', color: '#ef4444', scene: 'ArenaScene' },
            { label: '👺 레이드 입장', color: '#9333ea', scene: 'RaidScene' }
        ];

        buttons.forEach(btn => {
            const el = document.createElement('button');
            el.innerText = btn.label;
            el.className = 'territory-btn';
            el.style.cssText = `
                padding: 15px 30px;
                font-size: 20px;
                font-weight: bold;
                color: white;
                background: ${btn.color};
                border: none;
                border-radius: 12px;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
                text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            `;
            el.onmouseover = () => { el.style.transform = 'scale(1.05)'; };
            el.onmouseout = () => { el.style.transform = 'scale(1)'; };
            el.onclick = () => {
                if (this.navContainer) this.navContainer.remove();
                this.navContainer = null;
                this.scene.start(btn.scene);
            };
            this.navContainer.appendChild(el);
        });

        document.body.appendChild(this.navContainer);

        this.events.on('shutdown', () => {
            if (this.navContainer) {
                this.navContainer.remove();
                this.navContainer = null;
            }
        });
    }

    async checkPartyStatus() {
        const { default: partyManager } = await import('../modules/Core/PartyManager.js');
        const activeParty = partyManager.getActiveParty();

        // If party is completely empty
        if (activeParty.every(p => p === null)) {
            this.showPartySelection();
        }
    }

    async showPartySelection() {
        if (this.partyOverlay) return;

        const { Characters } = await import('../modules/Core/EntityStats.js');
        const { default: partyManager } = await import('../modules/Core/PartyManager.js');
        const { default: EventBus } = await import('../modules/Events/EventBus.js');

        this.partyOverlay = document.createElement('div');
        this.partyOverlay.className = 'party-selection-overlay';

        let candidatesHtml = '';
        Object.values(Characters).forEach(char => {
            candidatesHtml += `
                <div class="mercenary-card" draggable="true" data-id="${char.id}">
                    <img src="assets/characters/party/${char.sprite}.png" alt="${char.name}">
                    <div class="merc-name">${char.name.split(' (')[0]}</div>
                </div>
            `;
        });

        this.partyOverlay.innerHTML = `
            <div class="party-selection-title">원정대 편성 (슬롯에 드래그하거나 클릭하여 배치)</div>
            
            <div class="party-slots">
                <div class="party-slot" data-slot="0">1</div>
                <div class="party-slot" data-slot="1">2</div>
                <div class="party-slot" data-slot="2">3</div>
                <div class="party-slot" data-slot="3">4</div>
                <div class="party-slot" data-slot="4">5</div>
                <div class="party-slot" data-slot="5">6</div>
            </div>

            <div class="mercenary-candidates">
                ${candidatesHtml}
            </div>
            
            <button class="party-confirm-btn">편성 완료</button>
        `;

        document.body.appendChild(this.partyOverlay);

        const currentSlots = [...partyManager.getActiveParty()];
        const slotEls = this.partyOverlay.querySelectorAll('.party-slot');
        const cards = this.partyOverlay.querySelectorAll('.mercenary-card');

        const updateSlotUI = (index) => {
            const charId = currentSlots[index];
            const slotEl = slotEls[index];
            if (charId) {
                const char = Object.values(Characters).find(c => c.id === charId);
                slotEl.innerHTML = `<img src="assets/characters/party/${char.sprite}.png" alt="${char.name}">`;
                slotEl.classList.add('filled');
            } else {
                slotEl.innerHTML = `${index + 1}`;
                slotEl.classList.remove('filled');
            }
        };

        // Initialize slots
        currentSlots.forEach((_, i) => updateSlotUI(i));

        // Drag & Drop
        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('characterId', card.dataset.id);
            });
            // Click to pick
            card.onclick = () => {
                const charId = card.dataset.id;
                // Find first empty slot or replace selected
                let emptyIndex = currentSlots.indexOf(null);
                if (emptyIndex !== -1) {
                    currentSlots[emptyIndex] = charId;
                    updateSlotUI(emptyIndex);
                }
            };
        });

        slotEls.forEach((slot, i) => {
            slot.addEventListener('dragover', (e) => e.preventDefault());
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                const charId = e.dataTransfer.getData('characterId');
                if (charId) {
                    currentSlots[i] = charId;
                    updateSlotUI(i);
                }
            });
            slot.onclick = () => {
                currentSlots[i] = null;
                updateSlotUI(i);
            };
        });

        const confirmBtn = this.partyOverlay.querySelector('.party-confirm-btn');
        confirmBtn.addEventListener('click', () => {
            // Save to PartyManager
            currentSlots.forEach((id, i) => {
                partyManager.setPartySlot(i, id);
            });

            this.partyOverlay.remove();
            this.partyOverlay = null;

            // Sync with Mobile HUD
            EventBus.emit(EventBus.EVENTS.PARTY_DEPLOYED, {
                scene: this,
                mercenaries: currentSlots
                    .filter(id => id !== null)
                    .map(id => {
                        const char = Object.values(Characters).find(c => c.id === id);
                        return {
                            id: `init-${id}`,
                            characterId: id,
                            unitName: char.name,
                            sprite: char.sprite,
                            hp: 100, maxHp: 100 // Dummy for HUD display
                        };
                    })
            });

            console.log('[Territory] Party selection confirmed.');
        });
    }
}
