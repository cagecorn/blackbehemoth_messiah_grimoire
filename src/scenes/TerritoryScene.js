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
        id: 'defense',
        label: '방어 시설 관리',
        sublabel: 'STRUCTURES',
        cutscene: 'assets/characters/party/boon_cutscene.png',
        accentColor: '#4ade80',
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

        // Ensure UI is synced for initial boot (BootScene -> TerritoryScene direct transition)
        EventBus.emit(EventBus.EVENTS.SCENE_CHANGED, 'TerritoryScene');

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

        // Clean up on scene shutdown/sleep: ONLY HIDE, DON'T REMOVE (for faster re-entry)
        const cleanup = () => {
            if (this.navContainer) this.navContainer.style.display = 'none';
            if (this.patchNotesContainer) this.patchNotesContainer.style.display = 'none';
        };
        this.events.on('shutdown', cleanup);
        this.events.on('sleep', cleanup);

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
            } else if (b.id === 'equipment') {
                el.addEventListener('click', () => {
                    if (this.game.uiManager) {
                        this.game.uiManager.showEquipmentCrafting();
                    }
                });
            } else if (b.id === 'defense') {
                el.addEventListener('click', () => {
                    if (this.game.uiManager) {
                        this.game.uiManager.showDefenseManagement();
                    }
                });
            } else if (b.id === 'companion') {
                el.addEventListener('click', () => {
                    if (this.game.uiManager) {
                        this.game.uiManager.showMercenaryRoster();
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
                <div class="patch-entry" style="border: 2px solid #3a7fc0; background: rgba(58, 127, 192, 0.1); padding: 10px; margin-bottom: 10px; border-radius: 8px;">
                    <div class="patch-item" style="color: #ffffff; line-height: 1.5; font-size: 13px; text-align: center;">
                        앞으로 패치노트는 공식 카페에 기재됩니다. 이곳을 이용해주세요~<br>
                        <a href="https://cafe.naver.com/blackbehemothmessiah" target="_blank" style="color: #60a5fa; text-decoration: underline; font-weight: bold; display: inline-block; margin-top: 5px;">https://cafe.naver.com/blackbehemothmessiah</a>
                    </div>
                </div>
                <div class="patch-entry" style="border: 2px solid #ff4444; background: rgba(255, 68, 68, 0.1); padding: 5px;">
                    <div class="patch-date" style="color: #ff4444;">📢 **필독 공지**</div>
                    <div class="patch-item" style="color: #ffffff; line-height: 1.4;">- 그동안 용병의 레벨과 별 등급이 올라도, 실제 스탯에는 반영이 되지 않는 어처구니 없는 실수를 방치하고 있었습니다. 게임의 핵심적인 요소를 놓쳐 플레이어분들의 핵심 재미를 상실하게 만든 점, 깊이 죄송합니다. -</div>
                </div>
                <div class="patch-entry">
                    <div class="patch-date">▶ 2026-03-08 (Latest)</div>
                    <div class="patch-item"><span class="patch-item-icon">❄️</span>[던전] 다섯 번째 던전 **[겨울의 나라]** 업데이트! 극한의 추위 속 새로운 모험이 시작됩니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">🧊</span>[몬스터] 얼음 정령 전사, 마법사, 힐러 3종 등장. 처치 시 **[영원한 얼음]** 획득 가능.</div>
                    <div class="patch-item"><span class="patch-item-icon">🥶</span>[상태이상] 신규 효과 **[빙결]** 도입! 몬스터의 공격 시 일정 확률로 이동/공격 속도가 50% 감소합니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">🚀</span>[성장] **용병 레벨 제한 해제!** 하드코딩 되어있던 40레벨 제한이 삭제되어, 이제 무한히 스케일링하며 성장할 수 있습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">⚔️</span>[용병] **고급 고용 용병 2종 추가!** [고용 전사], [고용 아쳐]가 새롭게 합류했습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">✨</span>[용병] **압도적인 전력!** 평균 파티 레벨의 2배 규모로 스케일링되어 전장에 투입됩니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">🔄</span>[용병] **자동 부활 시스템!** 보유 스택을 소모하여 사망 시 즉시 풀 체력으로 부활합니다.</div>
                </div>
                <div class="patch-entry">
                    <div class="patch-date">▶ 2026-03-07</div>
                    <div class="patch-item"><span class="patch-item-icon">📜</span>[공지] **참(Grimoire) 시스템 개편!** 햄버거 및 노바 3종(🎆,🎏,🎇,🍔) 참이 전면 개편되었습니다. 기존 인벤토리에 10개씩 지급되었던 테스트용 아이템은 '버리기' 기능을 통해 정리해 주시길 권장합니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">🧚</span>[영지] **힐링 터렛** 업데이트! 아군을 치유하는 새로운 방어 시설을 건설해보세요. (✨ 반짝이 투사체 적용)</div>
                    <div class="patch-item"><span class="patch-item-icon">🔥</span>[던전] 네 번째 던전 **[용암 지대]** 업데이트! 뜨거운 전장의 막이 열렸습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">🕯️</span>[몬스터] 화염 정령 전사, 궁수, 마법사 3종 등장. 처치 시 **[양초]** 획득 가능.</div>
                    <div class="patch-item"><span class="patch-item-icon">🛡️</span>[영지] **방어 시설 관리** 시스템 도입! 보우건 터렛을 제작하여 전투를 지원하세요.</div>
                    <div class="patch-item"><span class="patch-item-icon">🐊</span>[던전] 세 번째 던전 **[늪지대]** 업데이트! 새로운 중반부 전장이 추가되었습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">⚔️</span>[몬스터] 악어 전사, 궁수, 힐러 3종 추가. 기존보다 강력한 능력치를 보유합니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">🎫</span>[입장권] 상점 구매 또는 언데드 묘지에서 늪지대 입장권을 획득하세요.</div>
                    <div class="patch-item"><span class="patch-item-icon">☘️</span>[전리품] 신규 재료 클로버 및 상향된 보상을 획득 가능합니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">🪄</span>[장비창] 우드완드 추가 및 마법 공격력 특화 성장 무기 제작 가능.</div>
                    <div class="patch-item"><span class="patch-item-icon">🛠️</span>[장비창] 기능 신설. 재료 아이템으로 장비 제작 및 장착이 가능합니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">🧱</span>[던전] 몬스터들이 낮은 확률로 벽돌 재료를 드랍하기 시작했습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">❄️</span>[버그] 노아, 노엘 형제의 스킬 사용 시 프리징 현상을 해결했습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">🔋</span>설정 탭에서 [배터리 절약 방치 모드] 설정 가능.</div>
                </div>
                <div class="patch-entry">
                    <div class="patch-date">▶ 2026-03-06</div>
                    <div class="patch-item"><span class="patch-item-icon">🏗️</span>[영지] 생산 시설 전투 지원 시스템 개편 : 기존의 단순 자원 생산 건물들이 전장에 직접 개입하여 지원하는 시스템으로 전면 개편되었습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">🪙</span>[영지] 은행 골드 생산량 밸런싱 : 은행의 골드 생산 수치를 기존 대비 50% 하향 조정하고, 드랍되는 코인의 시각적 크기 및 애니메이션을 최적으로 최적화했습니다.</div>
                    <div class="patch-item"><span class="patch-item-icon">🚀</span>[전투] 건물별 고유 액션 추가 : 로켓 폭격(공장), 상태이상 정화(성당), 바위 투척/기절(캠프), 다이아 드랍(성) 기능이 활성화되었습니다.</div>
                </div>
                <div class="patch-entry">
                    <div class="patch-date">▶ 2026-03-05</div>
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

        console.log('[PatchNotes] 2026-03-08 패치 내역이 업데이트되었습니다.');
    }
}
