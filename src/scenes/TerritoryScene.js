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
            <div class="party-selection-title">원정대 편성 (드래그하여 슬롯에 배치)</div>
            <div class="mercenary-candidates">
                ${candidatesHtml}
            </div>
            <button class="party-confirm-btn">편성 완료</button>
        `;

        document.body.appendChild(this.partyOverlay);

        // Add drag start listeners
        const cards = this.partyOverlay.querySelectorAll('.mercenary-card');
        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('characterId', card.dataset.id);
            });
        });

        const confirmBtn = this.partyOverlay.querySelector('.party-confirm-btn');
        confirmBtn.addEventListener('click', () => {
            this.partyOverlay.remove();
            this.partyOverlay = null;
            console.log('[Territory] Party selection confirmed.');
        });
    }
}
