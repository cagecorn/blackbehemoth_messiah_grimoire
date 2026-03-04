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
        if (this.navContainer) this.navContainer.remove();

        const wrap = document.createElement('div');
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
            } else if (b.id === 'pet') {
                el.addEventListener('click', () => {
                    if (this.game.uiManager) {
                        this.game.uiManager.showPetStorage();
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

        // Clean up on scene shutdown
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

    _buildBannerHTML(banner, index) {
        const delay = index * 80;
        return `
            <div
                id="banner-${banner.id}"
                class="territory-banner retro-scanline-overlay"
                style="
                    --accent: ${banner.accentColor};
                    animation-delay: ${delay}ms;
                ">
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
        if (this.patchNotesContainer) this.patchNotesContainer.remove();

        const wrap = document.createElement('div');
        wrap.id = 'territory-patch-notes';
        wrap.innerHTML = `
            <div id="territory-patch-tab">
                <span>📋 패치 내역</span>
                <button id="territory-patch-close" title="닫기">✕</button>
            </div>
            <div id="territory-patch-body">
                <div class="patch-entry">
                    <div class="patch-date">▶ 2026-03-05</div>
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
                    <div class="patch-item"><span class="patch-item-icon">🐾</span>펫 시스템 추가 : 이제 자원을 자동으로 루팅합니다. 펫을 눌러보세요!</div>
                    <div class="patch-item"><span class="patch-item-icon">🔍</span>카메라 확대/축소 시스템 추가</div>
                    <div class="patch-item"><span class="patch-item-icon">✨</span>용병 부활 시스템 추가 : 던전에서 골드를 지불하여 용병을 즉시 부활시킬 수 있습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">🔄</span>던전 전멸 시 무한 루프 시스템 추가 : 전멸 시 1라운드부터 즉시 재시작합니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">🔋</span>배터리 절약(방치) 모드 추가 : 설정에서 그래픽 효과를 켜고 끌 수 있습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">💾</span>용병 레벨/경험치 자동 저장 추가</div>
                    <div class="patch-item"><span class="patch-item-icon">🎨</span>상단 UI 허브 레드 벨벳 테마 적용</div>
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
