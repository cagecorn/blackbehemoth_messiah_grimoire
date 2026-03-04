import Phaser from 'phaser';
import EventBus from '../modules/Events/EventBus.js';

export default class TerritoryScene extends Phaser.Scene {
    constructor() {
        super('TerritoryScene');
        this.partyOverlay = null;
        this.navContainer = null;
    }

    create() {
        if (this.game.uiManager) {
            this.game.uiManager.scene = this;
        }
        const { width, height } = this.scale;

        // Play Territory BGM
        this.sound.stopAll();
        this.bgm = this.sound.add('territory_bgm', { volume: 0.4, loop: true });
        this.bgm.play();

        // Background
        const bg = this.add.image(0, 0, 'bg_territory').setOrigin(0, 0);
        bg.setDisplaySize(width, height);

        // Logo & Title
        const title = this.add.image(width / 2, height * 0.13, 'title_icon').setOrigin(0.5);
        const logo = this.add.image(width / 2, height * 0.25, 'logo_icon').setOrigin(0.5);

        // Animate both for a nice premium feel
        title.setAlpha(0).setScale(0.7);
        logo.setAlpha(0).setScale(0.8);

        this.tweens.add({
            targets: [title, logo],
            alpha: 1,
            scale: 1,
            duration: 1200,
            ease: 'Back.easeOut',
            delay: (target, key, index) => index * 300 // Stagger them
        });

        // [DOM UI Wrapper]
        this.createDOMNavigation();
        this.createPatchNotes();

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
            const combatScenes = ['DungeonScene', 'ArenaScene', 'RaidScene'];
            if (combatScenes.includes(targetScene)) {
                const partyManager = this.game.partyManager;
                if (partyManager && !partyManager.isPartyFull()) {
                    if (this.game.uiManager) {
                        this.game.uiManager.showToast("6명의 용병을 편성해주세요");
                        this.game.uiManager.showPartyFormation();
                    }
                    return;
                }
            }

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
            if (this.patchNotesContainer) {
                this.patchNotesContainer.remove();
                this.patchNotesContainer = null;
            }
        });
    }

    createPatchNotes() {
        if (this.patchNotesContainer) this.patchNotesContainer.remove();

        this.patchNotesContainer = document.createElement('div');
        this.patchNotesContainer.className = 'patch-notes-container';
        this.patchNotesContainer.style.cssText = `
            position: absolute;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            width: min(90vw, 420px);
            max-height: 180px;
            z-index: 1000;
        `;

        this.patchNotesContainer.innerHTML = `
            <div class="patch-notes-title">📋 패치 내역</div>
            <div class="patch-notes-body">
                <div class="patch-notes-content">
                    <div class="patch-entry">
                        <div class="patch-date">▶ 2026-03-04</div>
                        <div class="patch-item"><span class="patch-item-icon">🐾</span>펫 시스템 추가 : 이제 자원을 자동으로 루팅합니다. 펫을 눌러보세요!</div>
                        <div class="patch-item"><span class="patch-item-icon">🔍</span>카메라 확대/축소 시스템 추가</div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.patchNotesContainer);
        console.log('[PatchNotes] 2026-03-04 공지사항이 출력되었습니다. (펫 시스템 & 카메라 줌)');
    }

    async checkPartyStatus() {
        const partyManager = this.game.partyManager;
        const activeParty = partyManager.getActiveParty();

        // If party is completely empty
        if (activeParty.every(p => p === null)) {
            this.showPartySelection();
        }
    }

    async showPartySelection() {
        if (this.game.uiManager) {
            this.game.uiManager.showPartyFormation();
        }
    }
}
