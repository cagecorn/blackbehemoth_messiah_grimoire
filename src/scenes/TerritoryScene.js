import Phaser from 'phaser';
import EventBus from '../modules/Events/EventBus.js';

// ============================================================
// Banner definitions — easy to extend by adding more entries
// ============================================================
const TERRITORY_BANNERS = [
    {
        id: 'companion',
        label: '용병 도감',
        sublabel: 'ROSTER',
        cutscene: 'assets/characters/party/king_cutscene.png',
        accentColor: '#c0843a',
        action: null, // 기능 미정
    },
    {
        id: 'shop',
        label: '상점',
        sublabel: 'SHOP',
        cutscene: 'assets/characters/party/lute_cutscene.png',
        accentColor: '#3a7fc0',
        action: null,
    },
    {
        id: 'equipment',
        label: '장비창',
        sublabel: 'EQUIPMENT',
        cutscene: 'assets/characters/party/aren_cutscene.png',
        accentColor: '#7a3ac0',
        action: null,
    },
    {
        id: 'pet',
        label: '펫 보관함',
        sublabel: 'PETS',
        cutscene: 'assets/characters/party/nana_cutscene.png',
        accentColor: '#3ac06e',
        action: null,
    },
    {
        id: 'npc-hire',
        label: 'NPC 고용',
        sublabel: 'NPC HIRE',
        cutscene: 'assets/characters/party/king_cutscene.png', // Temporary cutscene, will adjust or use NPC assets later
        accentColor: '#fbbf24',
        action: null,
    },
    {
        id: 'messiah',
        label: '메시아 권능 관리',
        sublabel: 'MESSIAH TOUCH',
        cutscene: 'assets/characters/party/messiah_cutscene.png', // Premium Messiah cutscene image
        accentColor: '#ffffff', // Radiant white
        action: null,
    },
    {
        id: 'achievement',
        label: '업적',
        sublabel: 'ACHIEVEMENTS',
        cutscene: 'assets/characters/party/silvi_cutscene.png',
        accentColor: '#c03a3a',
        action: null,
    },
];

export default class TerritoryScene extends Phaser.Scene {
    constructor() {
        super('TerritoryScene');
        this.navContainer = null;
        this.patchNotesContainer = null;
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

        // Solid dark background (canvas) — banners cover the viewport via DOM
        this.add.rectangle(0, 0, width, height, 0x0a0506).setOrigin(0, 0);


        // DOM layers
        this.createBannerList();
        this.createPatchNotes();

        // Suppress portrait bar
        this.events.once('update', () => {
            EventBus.emit('PARTY_DEPLOYED', { scene: this, mercenaries: [] });
        });

        console.log('[TerritoryScene] 영지 씬 생성 완료 — 키치 배너 레이아웃');
    }


    // ─── Kitsch Banner List ───────────────────────────────────────────────────
    createBannerList() {
        // --- DIRTY FLAG / REUSE LOGIC ---
        let wrap = document.getElementById('territory-banner-wrap');
        if (wrap) {
            console.log('[TerritoryScene] Reusing existing banner wrap.');
            wrap.style.display = 'block';
            this.navContainer = wrap;
            return; // Already exists, skipping intensive HTML build
        }

        console.log('[TerritoryScene] Creating new banner list.');
        wrap = document.createElement('div');
        wrap.id = 'territory-banner-wrap';
        wrap.innerHTML = `
            <div id="territory-banner-inner">
                ${TERRITORY_BANNERS.map((b, i) => this._buildBannerHTML(b, i)).join('')}
            </div>
        `;

        const container = document.getElementById('app-container') || document.body;
        container.appendChild(wrap);
        this.navContainer = wrap;

        // Attach click handlers
        TERRITORY_BANNERS.forEach((b) => {
            const el = document.getElementById(`banner-${b.id}`);
            if (!el) return;
            if (b.action) {
                el.addEventListener('click', () => b.action());
            } else if (b.id === 'shop') {
                el.addEventListener('click', () => {
                    if (this.game.uiManager) {
                        this.game.uiManager.showShop();
                    }
                });
            } else if (b.id === 'npc-hire') {
                el.addEventListener('click', () => {
                    if (this.game.uiManager) {
                        this.game.uiManager.showNPCHire();
                    }
                });
            } else if (b.id === 'pet') {
                el.addEventListener('click', () => {
                    if (this.game.uiManager) {
                        this.game.uiManager.showPetStorage();
                    }
                });
            } else if (b.id === 'messiah') {
                el.addEventListener('click', () => {
                    if (this.game.uiManager) {
                        this.game.uiManager.showMessiahManagement();
                    }
                });
            } else {
                el.addEventListener('click', () => {
                    if (this.game.uiManager) {
                        this.game.uiManager.showToast('준비 중입니다 🔧');
                    }
                    console.log(`[Territory] 배너 클릭: ${b.label} (기능 미정)`);
                });
            }
        });

        // Clean up on scene shutdown: ONLY HIDE, DON'T REMOVE (for faster re-entry)
        this.events.on('shutdown', () => {
            if (this.navContainer) {
                this.navContainer.style.display = 'none';
            }
            if (this.patchNotesContainer) {
                this.patchNotesContainer.style.display = 'none';
            }
        });
    }

    _buildBannerHTML(banner, index) {
        const delay = index * 80;

        // Configuration for Nebula Tinting (derive from accent)
        const nebulaTint1 = `${banner.accentColor}25`; // ~15% alpha hex
        const nebulaTint2 = `${banner.accentColor}15`; // ~8% alpha hex

        return `
            <div
                id="banner-${banner.id}"
                class="territory-banner retro-scanline-overlay"
                style="
                    --accent: ${banner.accentColor};
                    --nebula-color-1: ${nebulaTint1};
                    --nebula-color-2: ${nebulaTint2};
                    animation-delay: ${delay}ms;
                ">
                <!-- Optimized Background -->
                <div class="territory-banner-nebula-static" style="background: radial-gradient(circle at 20% 40%, ${nebulaTint1} 0%, transparent 70%); opacity: 0.3;"></div>
                <div class="territory-banner-img-wrap">
                    <img
                        src="${banner.cutscene}"
                        alt="${banner.label}"
                        class="territory-banner-img"
                        draggable="false"
                    />
                    <div class="territory-banner-shine"></div>
                </div>
                <div class="territory-banner-label-wrap">
                    <span class="territory-banner-sublabel">${banner.sublabel}</span>
                    <span class="territory-banner-label">${banner.label}</span>
                    <span class="territory-banner-arrow">▸</span>
                </div>
            </div>
        `;
    }

    // ─── Patch Notes floating tab ─────────────────────────────────────────────
    createPatchNotes() {
        // --- DIRTY FLAG / REUSE LOGIC ---
        let wrap = document.getElementById('territory-patch-notes');
        if (wrap) {
            wrap.style.display = 'block';
            this.patchNotesContainer = wrap;
            return;
        }

        wrap = document.createElement('div');
        wrap.id = 'territory-patch-notes';
        wrap.innerHTML = `
            <div id="territory-patch-tab">
                <span>📋 패치 내역</span>
                <button id="territory-patch-close" title="닫기">✕</button>
            </div>
            <div id="territory-patch-body">
                <div class="patch-entry">
                    <div class="patch-date">▶ 2026-03-05 (Latest)</div>
                    <div class="patch-item"><span class="patch-item-icon">🏰</span>[영지] 미니어처 자원 생산 건물 시스템 도입 : 12개 슬롯의 고밀도 그리드에서 6종의 자원을 생산하고 관리하세요!</div>
                    <div class="patch-item"><span class="patch-item-icon">📈</span>[영지] 건물 지수 성장 강화 시스템 : 1.5배 비용/1.2배 생산량 배율이 적용된 전략적 업그레이드 시스템이 구축되었습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">📱</span>[UI/UX] 모바일 콤팩트 미니어처 그리드 : 어떤 기기에서도 잘리지 않는 초정밀 영지 UI(21px 가로폭)를 구현했습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">🚩</span>[UI/UX] 트위터 스타일 SVG 이모지 완전 통일 : 최신 SVG 아이콘을 적용하여 게임 전체의 시각적 일관성을 확보했습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">👆</span>[메시아 권능] 시스템 도입 : 전투에 직접 개입하여 심판, 치료, 격려의 권능을 휘두르세요!</div>
                    <div class="patch-item"><span class="patch-item-icon">🤖</span>[메시아 오토] 기능 추가 : 권능 사용 자동화 및 전략적 무작위 시전 시스템이 추가되었습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">✨</span>[전능의 정수] & 업그레이드 : 정수를 획득하여 권능의 스택 한도를 강화할 수 있습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">🤝</span>[고용 NPC] 시스템 도입 : 선교사(부활), 수녀(라운드 재시작) 고용 기능이 추가되었습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">💎</span>[루트 강화] 몬스터 등급 및 스테이지별 보상 스케일링 : 이제 고레벨 던전과 정예 몬스터가 훨씬 많은 골드와 재료를 드랍합니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">🐾</span>펫 전투 시스템 도입 : 이제 자원을 루팅할 뿐만 아니라 함께 전투에 참여합니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">🎰</span>펫 뽑기 시스템 도입 : 새로운 펫 영입을 위한 소환 기능이 추가되었습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">📦</span>펫 보관함 UI 구현 : 영입한 펫을 관리하고 상세 정보를 확인할 수 있는 보관함이 추가되었습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">📊</span>전투 지표 그래프 패치 : 초당 공격력(DPS), 받은 데미지, 회복 수치를 실시간 그래프로 확인할 수 있습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">💀</span>신규 던전 "언데드 묘지" 패치 : 서늘한 기운이 감도는 신규 전장이 추가되었습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">💰</span>상점 기능 패치 : 각종 재화로 용병과 아이템을 구매할 수 있게 되었습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">⭐</span>용병 별(★) 승급 시스템 고도화 : 별 등급에 따른 능력치 배수 및 유틸리티(치명타, 정확도 등) 보너스가 강화되었습니다.</div>
                </div>
                <div class="patch-entry">
                    <div class="patch-date">▶ 2026-03-04</div>
                    <div class="patch-item"><span class="patch-item-icon">🎨</span>레드 벨벳 UI 리뉴얼 : 메인 HUD 및 가챠 씬에 고급스러운 벨벳 테마가 적용되었습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">⚙️</span>시스템 안정성 개선 : 메모리 누수 및 비정상 종료 버그들을 수정하였습니다.</div>
                </div>
            </div>
        `;

        const container = document.getElementById('app-container') || document.body;
        container.appendChild(wrap);
        this.patchNotesContainer = wrap;

        // X close button
        const closeBtn = document.getElementById('territory-patch-close');
        closeBtn.addEventListener('click', () => {
            wrap.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
            wrap.style.opacity = '0';
            wrap.style.transform = 'translateY(-12px)';
            setTimeout(() => wrap.remove(), 280);
            console.log('[PatchNotes] 패치 노트 닫힘');
        });

        EventBus.on(EventBus.EVENTS.BATTERY_SAVER_TOGGLED, (enabled) => {
            console.log('[Territory] Battery Saver toggled:', enabled);
        });

        console.log('[PatchNotes] 2026-03-04 패치 내역이 업데이트되었습니다.');
    }
}
