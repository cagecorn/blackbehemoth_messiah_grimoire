import DBManager from '../Database/DBManager.js';
import EventBus from '../Events/EventBus.js';
import localizationManager from '../Core/LocalizationManager.js';
import messiahManager from '../Core/MessiahManager.js';
import { MonsterClasses, StageConfigs } from '../Core/EntityStats.js';

/**
 * AchievementUI
 * Modularized Achievement system with Grand Archivist theme.
 */
export default class AchievementUI {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.overlay = null;
        this.currentTab = 'DUNGEON'; // 'DUNGEON' or 'MONSTER'
    }

    /**
     * Shows the Achievement UI
     */
    async show() {
        if (this.overlay) return;

        const overlay = document.createElement('div');
        overlay.id = 'achievements-overlay';
        overlay.className = 'fade-in';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.85); display: flex; align-items: center;
            justify-content: center; z-index: 25000; backdrop-filter: blur(8px);
        `;

        const style = document.createElement('style');
        style.textContent = `
            .archivist-container {
                background: linear-gradient(135deg, #2d0a0a 0%, #1a0505 100%);
                border: 2px solid #991b1b;
                box-shadow: 0 0 30px rgba(153, 27, 27, 0.4), inset 0 0 20px rgba(0,0,0,0.8);
                border-radius: 12px;
                padding: 24px;
                max-width: 600px; width: 95vw;
                position: relative;
                font-family: var(--font-pixel);
                color: #fca5a5;
                animation: divineslideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }

            .archivist-header {
                display: flex; justify-content: space-between; align-items: center;
                margin-bottom: 20px; border-bottom: 1px solid rgba(153, 27, 27, 0.5);
                padding-bottom: 12px;
            }

            .archivist-title {
                font-size: 20px; color: #fecaca; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
                letter-spacing: 1px;
            }

            .archivist-close {
                background: none; border: none; color: #ef4444; font-size: 24px;
                cursor: pointer; transition: 0.2s;
            }
            .archivist-close:hover { transform: scale(1.1); color: #f87171; }

            .archivist-tabs {
                display: flex; gap: 8px; margin-bottom: 20px;
            }

            .archivist-tab-btn {
                flex: 1; padding: 10px; background: rgba(0,0,0,0.4);
                border: 1px solid #7f1d1d; color: #991b1b; cursor: pointer;
                font-size: 11px; border-radius: 6px; transition: all 0.2s;
            }
            .archivist-tab-btn.active {
                background: rgba(153, 27, 27, 0.3); border-color: #ef4444; color: #fca5a5;
                text-shadow: 0 0 5px rgba(252, 165, 165, 0.5);
            }

            .archivist-desc {
                font-size: 12px; color: #fca5a5; text-align: center;
                margin-bottom: 24px; line-height: 1.6; opacity: 0.9;
            }

            .archivist-list {
                display: flex; flex-direction: column; gap: 12px;
                max-height: 50vh; overflow-y: auto; padding-right: 8px;
            }
            .archivist-list::-webkit-scrollbar { width: 4px; }
            .archivist-list::-webkit-scrollbar-thumb { background: #7f1d1d; border-radius: 2px; }

            .achievement-card {
                background: rgba(0, 0, 0, 0.4);
                border: 1px solid rgba(153, 27, 27, 0.3);
                border-radius: 8px; padding: 16px;
                display: flex; justify-content: space-between; align-items: center;
                transition: 0.3s;
            }
            .achievement-card.claimable {
                border-color: #ef4444; background: rgba(153, 27, 27, 0.1);
                box-shadow: 0 0 15px rgba(239, 68, 68, 0.1);
            }

            .achieve-info { display: flex; flex-direction: column; gap: 6px; }
            .achieve-goal { color: #fca5a5; font-size: 14px; font-weight: bold; }
            .achieve-milestone { color: #fbbf24; font-size: 11px; margin-left: 5px; }
            .achieve-reward { color: #cbd5e1; font-size: 11px; display: flex; align-items: center; gap: 4px; }

            .claim-btn {
                background: #ef4444; border: 1px solid #fca5a5;
                color: #fff; padding: 8px 20px; font-size: 12px;
                border-radius: 4px; cursor: pointer; transition: all 0.2s;
            }
            .claim-btn:hover { background: #dc2626; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(220, 38, 38, 0.4); }
            .claim-btn:disabled {
                background: #10b981 !important; border-color: #34d399 !important;
                opacity: 0.8; cursor: default; transform: none !important; box-shadow: none !important;
            }

            .progress-label { color: #94a3b8; font-size: 13px; }

            @keyframes divineslideIn {
                from { opacity: 0; transform: scale(0.9) translateY(20px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }
        `;

        overlay.innerHTML = `
            <div class="archivist-container">
                <div class="archivist-header">
                    <div class="archivist-title">🏛️ ${localizationManager.t('ui_achievements_title')}</div>
                    <button class="archivist-close" id="archivist-close">✕</button>
                </div>

                <div class="archivist-desc">
                    ${localizationManager.t('ui_achievements_desc')}
                </div>

                <div class="archivist-tabs">
                    <button class="archivist-tab-btn active" data-tab="DUNGEON">${localizationManager.t('ui_achievements_tab_dungeon')}</button>
                    <button class="archivist-tab-btn" data-tab="MONSTER">${localizationManager.t('ui_achievements_tab_monster')}</button>
                </div>

                <div id="archivist-list" class="archivist-list">
                    <!-- Injected by JS -->
                </div>
            </div>
        `;

        overlay.appendChild(style);
        document.getElementById('app-container').appendChild(overlay);
        this.overlay = overlay;

        // Bind Events
        document.getElementById('archivist-close').onclick = () => this.hide();
        overlay.onclick = (e) => { if (e.target === overlay) this.hide(); };

        const tabs = overlay.querySelectorAll('.archivist-tab-btn');
        tabs.forEach(tab => {
            tab.onclick = () => {
                const targetTab = tab.dataset.tab;
                if (this.currentTab === targetTab) return;
                
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentTab = targetTab;
                this.refreshList();
            };
        });

        // Event Delegation for Claim Buttons
        const listContainer = document.getElementById('archivist-list');
        listContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.claim-btn');
            if (btn && !btn.disabled) {
                this.handleClaim(btn);
            }
        });

        await this.refreshList();
    }

    /**
     * Refreshes the achievement list
     */
    async refreshList() {
        if (!this.overlay) return;
        const listContainer = document.getElementById('archivist-list');
        listContainer.innerHTML = `<div style="text-align: center; color: #94a3b8; font-size: 14px; padding: 20px;">${localizationManager.t('ui_achievements_loading')}</div>`;

        if (this.currentTab === 'DUNGEON') {
            await this._renderDungeonList(listContainer);
        } else {
            await this._renderMonsterList(listContainer);
        }
    }

    async _renderDungeonList(container) {
        const claimed = await DBManager.getClaimedAchievements();
        const targets = Object.keys(StageConfigs).map(key => ({
            id: key,
            name: StageConfigs[key].name,
            icon: StageConfigs[key].icon || '⚔️'
        }));

        let html = '';
        for (const t of targets) {
            const bestRound = await DBManager.getBestRound(t.id, 'NORMAL');
            const currentClaimed = claimed[t.id] || 0;
            const targetRound = currentClaimed === 0 ? 20 : (currentClaimed + 10);
            const canClaim = bestRound >= targetRound;

            html += `
                <div class="achievement-card ${canClaim ? 'claimable' : ''}">
                    <div class="achieve-info">
                        <div class="achieve-goal">
                            ${t.icon} ${t.name} <span class="achieve-milestone">(${localizationManager.t('ui_achievements_dungeon_goal', [targetRound])})</span>
                        </div>
                        <div class="achieve-reward">✨ ${localizationManager.t('ui_achievements_reward_label', [100])}</div>
                    </div>
                    <div>
                        ${canClaim ?
                            `<button class="claim-btn" data-type="DUNGEON" data-id="${t.id}" data-target="${targetRound}">${localizationManager.t('ui_achievements_claim_btn')}</button>` :
                            `<div class="progress-label">${localizationManager.t('ui_achievements_progress_label', [bestRound, targetRound])}</div>`
                        }
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
    }

    async _renderMonsterList(container) {
        const kills = await DBManager.getMonsterKills();
        const claimed = await DBManager.getClaimedMonsterAchievements();

        const targets = Object.keys(MonsterClasses).map(key => {
            const m = MonsterClasses[key];
            let icon = '👺';
            if (m.id.includes('shaman')) icon = '🧙‍♂️';
            if (m.id.includes('orc')) icon = '🏹';
            if (m.id.includes('skeleton')) icon = '💀';
            if (m.id.includes('boss')) icon = '👑';
            return { id: m.id.toUpperCase(), name: localizationManager.t(`monster_${m.id}`), icon };
        });

        let html = '';
        for (const t of targets) {
            const currentKills = kills[t.id] || 0;
            const currentClaimed = claimed[t.id] || 0;
            let nextMilestone = 100;
            if (currentClaimed >= 100) nextMilestone = 1000;
            if (currentClaimed >= 1000) nextMilestone = 10000;
            if (currentClaimed >= 10000) nextMilestone = currentClaimed + 10000;

            const canClaim = currentKills >= nextMilestone;

            html += `
                <div class="achievement-card ${canClaim ? 'claimable' : ''}">
                    <div class="achieve-info">
                        <div class="achieve-goal">
                            ${t.icon} ${t.name} <span class="achieve-milestone">(${nextMilestone})</span>
                        </div>
                        <div class="achieve-reward">✨ ${localizationManager.t('ui_achievements_reward_label', [150])}</div>
                    </div>
                    <div>
                        ${canClaim ?
                            `<button class="claim-btn" data-type="MONSTER" data-id="${t.id}" data-target="${nextMilestone}">${localizationManager.t('ui_achievements_claim_btn')}</button>` :
                            `<div class="progress-label">${currentKills} / ${nextMilestone}</div>`
                        }
                    </div>
                </div>
            `;
        }
        container.innerHTML = html || `<div style="text-align: center; color: #94a3b8; font-size: 14px; padding: 20px;">${localizationManager.t('ui_achievements_no_kills')}</div>`;
    }

    /**
     * Handles achievement claiming logic
     */
    async handleClaim(btn) {
        const type = btn.dataset.type;
        const id = btn.dataset.id;
        const targetReached = parseInt(btn.dataset.target);
        
        btn.disabled = true;
        btn.innerText = '✨ Claiming...';

        try {
            if (type === 'DUNGEON') {
                const current = await DBManager.getClaimedAchievements();
                current[id] = targetReached;
                await DBManager.saveClaimedAchievements(current);
                // AWARD REWARD: Use directly imported messiahManager for reliability
                await messiahManager.addExp(100);
            } else {
                const current = await DBManager.getClaimedMonsterAchievements();
                current[id] = targetReached;
                await DBManager.saveClaimedMonsterAchievements(current);
                // AWARD REWARD: Use directly imported messiahManager for reliability
                await messiahManager.addExp(150);
            }

            this.uiManager.showToast(localizationManager.t('ui_achievements_toast_success'));
            btn.innerText = localizationManager.t('ui_achievements_claimed_status');
            
            // Refresh visuals after a short delay
            setTimeout(() => this.refreshList(), 800);
        } catch (e) {
            console.error('[AchievementUI] Error claiming achievement:', e);
            btn.disabled = false;
            btn.innerText = 'Retry';
        }
    }

    /**
     * Hides the UI
     */
    hide() {
        if (!this.overlay) return;
        this.overlay.classList.remove('fade-in');
        this.overlay.classList.add('fade-out');
        setTimeout(() => {
            if (this.overlay) {
                this.overlay.remove();
                this.overlay = null;
            }
        }, 300);
    }
}
