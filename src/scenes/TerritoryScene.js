import Phaser from 'phaser';
import EventBus from '../modules/Events/EventBus.js';

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

        // Logo
        const logo = this.add.image(width / 2, height * 0.22, 'logo_icon').setOrigin(0.5);
        // Optional: Animate the logo slightly for a nice intro effect
        logo.setAlpha(0);
        logo.setScale(0.8);
        this.tweens.add({
            targets: logo,
            alpha: 1,
            scale: 1,
            duration: 1000,
            ease: 'Back.easeOut'
        });

        // [DOM UI Wrapper]
        this.createDOMNavigation();

        // Initialize Party Selection if not set (이제 자동 생성 안 함, 유저가 직접 아이콘을 눌러야 함)
        // this.checkPartyStatus();

        this.createSparkleParticles();

        // Force UI sync to hide portrait bar
        this.events.once('update', () => {
            EventBus.emit('PARTY_DEPLOYED', {
                scene: this,
                mercenaries: []
            });
        });
    }

    createSparkleParticles() {
        const particles = this.add.particles(0, 0, 'emoji_sparkles', {
            x: { min: 0, max: this.cameras.main.width },
            y: { min: 0, max: this.cameras.main.height },
            lifespan: { min: 2000, max: 4000 },
            speedY: { min: -10, max: -30 }, // Drift upwards slowly
            speedX: { min: -10, max: 10 },  // Slight horizontal drift
            scale: { start: 0.1, end: 0.8 },
            alpha: {
                onEmit: () => 0,
                onUpdate: (particle, key, t) => {
                    // Fast fade in for 20%, slow fade out for remaining 80%
                    if (t < 0.2) return t * 5;
                    return 1 - ((t - 0.2) / 0.8);
                }
            },
            blendMode: 'ADD',
            frequency: 300, // Spawn a new particle every 300ms
            tint: 0xffffff  // White sparkles
        });

        // Effect for Sparkles
        if (particles.postFX) {
            particles.postFX.addBlur(1, 1, 1);
            particles.postFX.addGlow(0xffffff, 2.5, 0, false, 0.1, 10);
        }

        // Add a secondary subtle glowing orb effect
        const orbs = this.add.particles(0, 0, 'emoji_crystal_ball', {
            x: { min: 0, max: this.cameras.main.width },
            y: { min: 0, max: this.cameras.main.height },
            lifespan: { min: 4000, max: 8000 },
            speedY: { min: -5, max: -15 },
            speedX: { min: -20, max: 20 },
            scale: { start: 0.05, end: 0.3 },
            alpha: {
                onEmit: () => 0,
                onUpdate: (particle, key, t) => {
                    // Slower fade in, smooth fade out, max opacity 0.4
                    return Math.sin(t * Math.PI) * 0.4;
                }
            },
            blendMode: 'SCREEN',
            frequency: 800,
            tint: 0xddffff // Slight cyan tint for magical feel
        });

        // Effect for Orbs
        if (orbs.postFX) {
            orbs.postFX.addBlur(2, 1, 1);
            orbs.postFX.addGlow(0xddffff, 3.0, 0, false, 0.1, 12);
        }
    }

    createDOMNavigation() {
        if (this.navContainer) this.navContainer.remove();

        this.navContainer = document.createElement('div');
        this.navContainer.className = 'territory-nav-container';
        this.navContainer.style.cssText = `
            position: absolute;
            top: 55%;
            left: 50%;
            transform: translate(-50%, -50%);
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            grid-template-rows: repeat(3, 1fr);
            gap: 15px;
            z-index: 1000;
            width: min(90vw, 420px);
            aspect-ratio: 1 / 1;
            pointer-events: none;
        `;

        const handleSceneChange = (targetScene) => {
            if (this.navContainer) this.navContainer.remove();
            this.navContainer = null;
            this.scene.start(targetScene);
        };

        const buttons = [
            // Row 1
            { id: 'gacha', icon: 'gacha_icon.png', label: '용병 뽑기', action: () => handleSceneChange('GachaScene') },
            { id: 'party', icon: 'party_management_icon.png', label: '파티 편성', action: () => this.showPartySelection() },
            null,
            // Row 2
            { id: 'dungeon', icon: 'dungeon_icon.png', label: '던전 입장', action: () => handleSceneChange('DungeonScene') },
            { id: 'arena', icon: 'arena_icon.png', label: '아레나 입장', action: () => handleSceneChange('ArenaScene') },
            { id: 'raid', icon: 'raid_icon.png', label: '레이드 입장', action: () => handleSceneChange('RaidScene') },
            // Row 3
            null, null, null
        ];

        buttons.forEach((btn, index) => {
            const cell = document.createElement('div');
            cell.style.cssText = `
                width: 100%;
                height: 100%;
                border-radius: 16px;
                display: flex;
                justify-content: center;
                align-items: center;
                position: relative;
                transition: all 0.2s;
            `;

            if (btn) {
                // 활성화된 버튼 셀
                cell.style.background = 'rgba(0, 0, 0, 0.4)';
                cell.style.border = '2px solid rgba(255, 255, 255, 0.3)';
                cell.style.pointerEvents = 'auto';
                cell.style.cursor = 'pointer';
                cell.style.boxShadow = '0 4px 10px rgba(0,0,0,0.5)';

                const img = document.createElement('img');
                img.src = `assets/icon/${btn.icon}`;
                img.alt = btn.label;
                img.style.cssText = 'width: 70%; height: 70%; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8));';
                cell.appendChild(img);

                // Tooltip (Optional, shows on hover)
                cell.title = btn.label;

                cell.onmouseover = () => {
                    cell.style.transform = 'scale(1.05) translateY(-2px)';
                    cell.style.borderColor = 'rgba(255, 255, 255, 0.8)';
                    cell.style.background = 'rgba(0, 0, 0, 0.6)';
                    cell.style.boxShadow = '0 6px 15px rgba(0,0,0,0.7)';
                };
                cell.onmouseout = () => {
                    cell.style.transform = 'scale(1) translateY(0)';
                    cell.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    cell.style.background = 'rgba(0, 0, 0, 0.4)';
                    cell.style.boxShadow = '0 4px 10px rgba(0,0,0,0.5)';
                };
                cell.onclick = btn.action;
            } else {
                // 빈 그리드 셀 (투명도 더 낮게)
                cell.style.background = 'rgba(0, 0, 0, 0.15)';
                cell.style.border = '1px dashed rgba(255, 255, 255, 0.1)';
            }
            this.navContainer.appendChild(cell);
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

        // 가챠 씬에서 변경된 Roster 갱신
        await partyManager.reloadRoster();

        this.partyOverlay = document.createElement('div');
        this.partyOverlay.className = 'party-selection-overlay';

        let candidatesHtml = '';
        Object.values(Characters).forEach(char => {
            const star = partyManager.getHighestStar(char.id);
            if (star === 0) return; // 미보유 상태인 영웅은 후보군에서 제외

            const starHtml = star > 0 ? `<div style="position:absolute; top:4px; right:4px; font-size:12px; font-weight:bold; color:#fbbf24; text-shadow:0 1px 2px #000;">★${star}</div>` : '';
            candidatesHtml += `
                <div class="mercenary-card" draggable="true" data-id="${char.id}" style="position:relative;">
                    ${starHtml}
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
                const star = partyManager.getHighestStar(charId);
                const starHtml = star > 0 ? `<div style="position:absolute; bottom:2px; right:4px; font-size:14px; font-weight:bold; color:#fbbf24; text-shadow:0 1px 2px #000; z-index:10;">★${star}</div>` : '';
                slotEl.style.position = 'relative';
                slotEl.innerHTML = `
                    ${starHtml}
                    <img src="assets/characters/party/${char.sprite}.png" alt="${char.name}">
                `;
                slotEl.classList.add('filled');
            } else {
                slotEl.innerHTML = `${index + 1} `;
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
                            id: `init - ${id} `,
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
