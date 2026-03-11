import DBManager from '../Database/DBManager.js';
import EventBus from '../Events/EventBus.js';
import localizationManager from '../Core/LocalizationManager.js';
import messiahManager from '../Core/MessiahManager.js';

/**
 * MessiahUI
 * Encapsulates the Messiah Touch management UI and combat HUD.
 * Theme: Messiah Command (Gold/White/Divine)
 */
export default class MessiahUI {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.overlay = null;
        this.isRefreshing = false;
    }

    /**
     * Shows the Messiah Management Overlay
     */
    async show() {
        if (this.overlay) return;

        const overlay = document.createElement('div');
        overlay.id = 'messiah-overlay';
        overlay.className = 'messiah-command-overlay retro-scanline-overlay fade-in';
        this.overlay = overlay;

        // Divine/Messiah Command Styles
        overlay.innerHTML = `
            <style>
                .messiah-command-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(15, 23, 42, 0.85); z-index: 25000;
                    display: flex; justify-content: center; align-items: center;
                    backdrop-filter: blur(8px); font-family: var(--font-pixel);
                }
                .messiah-command-container {
                    width: 95vw; max-width: 850px; height: 90vh; max-height: 600px;
                    background: #1e293b; border: 2px solid #fbbf24; border-radius: 12px;
                    display: flex; flex-direction: column; overflow: hidden;
                    box-shadow: 0 0 30px rgba(251, 191, 36, 0.3), inset 0 0 15px rgba(251, 191, 36, 0.1);
                    position: relative;
                }
                .messiah-command-header {
                    background: linear-gradient(to right, #92400e, #fbbf24, #92400e);
                    padding: 15px 20px; border-bottom: 2px solid #fff;
                    display: flex; justify-content: space-between; align-items: center;
                }
                .messiah-command-title {
                    color: #fff; font-size: 18px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                    font-family: var(--font-pixel); letter-spacing: 1px;
                }
                .messiah-command-close {
                    background: transparent; border: none; color: #fff;
                    font-size: 24px; cursor: pointer; text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                }
                .messiah-command-body {
                    flex: 1; padding: 25px; display: grid; grid-template-columns: 1fr 1.6fr;
                    gap: 25px; overflow-y: auto;
                }
                
                /* Left Panel: Messiah Status */
                .messiah-status-panel {
                    background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(251, 191, 36, 0.3);
                    border-radius: 10px; padding: 20px; display: flex; flex-direction: column;
                    box-shadow: inset 0 0 10px rgba(251, 191, 36, 0.1);
                }
                .status-header {
                    color: #fbbf24; font-size: 14px; margin-bottom: 15px;
                    border-bottom: 1px solid rgba(251, 191, 36, 0.2); padding-bottom: 8px;
                    text-align: center;
                }
                .status-row {
                    display: flex; justify-content: space-between; padding: 6px 0;
                    font-size: 12px; border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                .status-label { color: #94a3b8; }
                .status-value { color: #f1f5f9; font-weight: bold; }
                
                .messiah-exp-section { margin-top: 20px; }
                .exp-bar-container {
                    width: 100%; height: 12px; background: rgba(0,0,0,0.5);
                    border-radius: 6px; border: 1px solid #fbbf24; overflow: hidden;
                    margin: 8px 0;
                }
                .exp-bar-fill {
                    height: 100%; background: linear-gradient(to right, #92400e, #fbbf24);
                    box-shadow: 0 0 10px rgba(251, 191, 36, 0.6); transition: width 0.4s ease-out;
                }

                /* Right Panel: Divine Powers */
                .messiah-powers-list { display: flex; flex-direction: column; gap: 15px; }
                .power-card {
                    background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 10px; padding: 15px; display: flex; align-items: center;
                    gap: 20px; transition: all 0.3s ease; position: relative;
                }
                .power-card.active {
                    border-color: #fbbf24; background: rgba(251, 191, 36, 0.1);
                    box-shadow: 0 0 15px rgba(251, 191, 36, 0.2);
                }
                .power-emoji {
                    font-size: 36px; filter: drop-shadow(0 0 5px rgba(255,255,255,0.3));
                }
                .power-info { flex: 1; }
                .power-name { color: #fff; font-size: 15px; font-weight: bold; margin-bottom: 4px; }
                .power-desc { color: #94a3b8; font-size: 11px; line-height: 1.4; }
                
                .power-actions { display: flex; flex-direction: column; gap: 8px; min-width: 100px; }
                .cmd-btn {
                    padding: 6px 10px; font-size: 11px; border-radius: 4px; border: 1px solid #fbbf24;
                    cursor: pointer; text-align: center; font-family: var(--font-pixel); transition: all 0.2s;
                }
                .btn-select { background: rgba(251, 191, 36, 0.1); color: #fbbf24; }
                .btn-select:hover { background: #fbbf24; color: #000; }
                .btn-select.active { background: #fbbf24; color: #000; cursor: default; }
                
                .btn-upgrade { background: #10b981; border-color: #34d399; color: #fff; }
                .btn-upgrade:hover { background: #059669; transform: scale(1.03); }

                .messiah-command-footer {
                    background: rgba(0, 0, 0, 0.6); padding: 15px 25px;
                    display: flex; justify-content: space-between; align-items: center;
                    border-top: 1px solid rgba(251, 191, 36, 0.3);
                }
                .essence-display {
                    color: #fbbf24; font-size: 16px; font-weight: bold;
                    display: flex; align-items: center; gap: 8px;
                }
                .essence-icon { width: 20px; height: 20px; }
                .cmd-btn.disabled {
                    background: rgba(100, 116, 139, 0.2);
                    border-color: #475569;
                    color: #94a3b8;
                    cursor: not-allowed;
                    filter: grayscale(1);
                    opacity: 0.6;
                }

                .power-card.capped {
                    border-color: rgba(148, 163, 184, 0.3);
                }

                .power-card.capped .power-emoji {
                    filter: grayscale(0.7) brightness(0.7);
                }
            </style>

            <div class="messiah-command-container">
                <div class="messiah-command-header">
                    <div class="messiah-command-title">✨ ${localizationManager.t('ui_messiah_title')}</div>
                    <button class="messiah-command-close" id="messiah-close">✕</button>
                </div>
                
                <div class="messiah-command-body">
                    <!-- Messiah Status Panel -->
                    <div class="messiah-status-panel">
                        <div class="status-header">${localizationManager.t('ui_messiah_status_header')}</div>
                        <div id="messiah-stats-list">
                            <!-- Injected by JS -->
                        </div>
                    </div>

                    <!-- Divine Powers List -->
                    <div class="messiah-powers-list" id="messiah-powers-list">
                        <!-- Injected by JS -->
                    </div>
                </div>
                
                <div class="messiah-command-footer">
                    <div class="essence-display">
                        <img src="assets/emojis/2728.svg" class="essence-icon">
                        <span id="messiah-essence-display">0</span>
                    </div>
                    <div style="font-size: 10px; color: #64748b; font-family: var(--font-pixel);">DIVINE MESSIAH COMMAND SYSTEM</div>
                </div>
            </div>
        `;

        document.getElementById('app-container').appendChild(overlay);

        // Bind Events using Delegation
        overlay.addEventListener('click', (e) => {
            if (e.target.id === 'messiah-close' || e.target === overlay) {
                this.hide();
                return;
            }

            const selectBtn = e.target.closest('.btn-select');
            if (selectBtn && !selectBtn.classList.contains('active')) {
                const powerId = selectBtn.dataset.id;
                this.handleSelectPower(powerId);
                return;
            }

            const upgradeBtn = e.target.closest('.btn-upgrade');
            if (upgradeBtn) {
                const powerId = upgradeBtn.dataset.id;
                this.handleUpgradePower(powerId);
                return;
            }
        });

        await this.refresh();
    }

    /**
     * Refreshes the Messiah Management UI content
     */
    async refresh() {
        if (!this.overlay || this.isRefreshing) return;
        this.isRefreshing = true;

        const mm = messiahManager;
        const stats = mm.getStats();
        const requiredExp = stats.level * 100;
        const expPct = Math.min(100, Math.floor((stats.exp / requiredExp) * 100));

        // Update Stats
        const statsContainer = document.getElementById('messiah-stats-list');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="status-row">
                    <span class="status-label">${localizationManager.t('ui_messiah_level')}</span>
                    <span class="status-value" style="color:#fbbf24;">Lv.${stats.level}</span>
                </div>
                <div class="status-row">
                    <span class="status-label">${localizationManager.t('ui_messiah_atk')}</span>
                    <span class="status-value">${stats.atk}</span>
                </div>
                <div class="status-row">
                    <span class="status-label">${localizationManager.t('ui_messiah_matk')}</span>
                    <span class="status-value">${stats.mAtk}</span>
                </div>
                <div class="status-row">
                    <span class="status-label">${localizationManager.t('ui_messiah_def')}</span>
                    <span class="status-value">${stats.def}</span>
                </div>
                <div class="status-row">
                    <span class="status-label">${localizationManager.t('ui_messiah_castspd')}</span>
                    <span class="status-value">${stats.castSpd}</span>
                </div>
                <div class="status-row">
                    <span class="status-label">${localizationManager.t('ui_messiah_acc')}</span>
                    <span class="status-value">${stats.acc}</span>
                </div>
                <div class="status-row">
                    <span class="status-label">${localizationManager.t('ui_messiah_crit')}</span>
                    <span class="status-value">${stats.crit}%</span>
                </div>

                <div class="messiah-exp-section">
                    <div style="display:flex; justify-content:space-between; font-size:10px; color:#fbbf24; margin-bottom:4px;">
                        <span>EXP PROGRESS</span><span>${stats.exp} / ${requiredExp}</span>
                    </div>
                    <div class="exp-bar-container">
                        <div class="exp-bar-fill" style="width: ${expPct}%"></div>
                    </div>
                    <div style="text-align:right; font-size:9px; color:#64748b;">${localizationManager.t('ui_messiah_next_level', [Math.max(0, requiredExp - stats.exp)])}</div>
                </div>

                <div style="margin-top:20px; font-size:10px; color:#94a3b8; line-height:1.5; background:rgba(255,255,255,0.05); padding:10px; border-radius:6px; border-left:2px solid #fbbf24;">
                    ${localizationManager.t('ui_messiah_desc')}
                </div>
            `;
        }

        // Update Essence
        const essenceItem = await DBManager.getInventoryItem('emoji_divine_essence');
        const essenceDisplay = document.getElementById('messiah-essence-display');
        if (essenceDisplay) essenceDisplay.innerText = essenceItem ? essenceItem.amount : 0;

        // Update Powers
        const powersContainer = document.getElementById('messiah-powers-list');
        if (powersContainer) {
            let powersHtml = '';
            Object.values(mm.powers).forEach(power => {
                const isActive = mm.activePowerId === power.id;
                const isCapped = power.level >= mm.stats.level;
                const upgradeCost = power.level * 10;
                const powerName = messiahManager.constructor.getLocalizedName(power.id);
                const upgradeBtnClass = isCapped ? 'cmd-btn btn-upgrade disabled' : 'cmd-btn btn-upgrade';
                const upgradeBtnText = isCapped 
                    ? `Lv.${mm.stats.level} MAX (Req. Messiah Lv.${mm.stats.level + 1})`
                    : localizationManager.t('ui_messiah_upgrade', [upgradeCost]);

                powersHtml += `
                    <div class="power-card ${isActive ? 'active' : ''} ${isCapped ? 'capped' : ''}">
                        <div class="power-emoji">${power.emoji}</div>
                        <div class="power-info">
                            <div class="power-name">${powerName}</div>
                            <div class="power-desc">${localizationManager.t('ui_messiah_power_status', [power.level, 10 + (power.level - 1) * 2])}</div>
                        </div>
                        <div class="power-actions">
                            <button class="cmd-btn btn-select ${isActive ? 'active' : ''}" data-id="${power.id}">
                                ${isActive ? localizationManager.t('ui_messiah_active') : localizationManager.t('ui_messiah_select')}
                            </button>
                            <button class="${upgradeBtnClass}" data-id="${power.id}" ${isCapped ? 'disabled' : ''}>
                                ${upgradeBtnText}
                            </button>
                        </div>
                    </div>
                `;
            });
            powersContainer.innerHTML = powersHtml;
        }

        this.isRefreshing = false;
    }

    /**
     * Hides the Messiah Management Overlay
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

    /**
     * Handles power selection
     */
    handleSelectPower(powerId) {
        if (messiahManager.setActivePower(powerId)) {
            const localizedName = messiahManager.constructor.getLocalizedName(powerId);
            this.uiManager.showToast(localizationManager.t('ui_messiah_selected_toast', [localizedName]));
            this.refresh();
            this.updateFormationSlot();
        }
    }

    /**
     * Handles power upgrade
     */
    async handleUpgradePower(powerId) {
        const success = await messiahManager.upgradePower(powerId);
        if (success) {
            const localizedName = messiahManager.constructor.getLocalizedName(powerId);
            this.uiManager.showToast(localizationManager.t('ui_messiah_upgraded_toast', [localizedName]));
            this.refresh();
            this.updateFormationSlot();
        } else {
            // Already handled by messiahManager (system message)
        }
    }

    /**
     * Updates the Messiah HUD during combat
     */
    updateHUD() {
        const mm = messiahManager;
        const hud = document.getElementById('messiah-hud');
        if (!hud) return;

        const power = mm.getActivePower();
        if (!power) return;

        // Update Icon
        const iconEl = document.getElementById('messiah-hud-icon');
        if (iconEl && iconEl.innerText !== power.emoji) {
            iconEl.innerText = power.emoji;
        }

        // Update Stacks
        const stacksEl = document.getElementById('messiah-hud-stacks');
        if (stacksEl) {
            stacksEl.innerText = mm.stacks;
        }

        // Update Cooldown Fill
        const fillEl = document.getElementById('messiah-cooldown-fill');
        if (fillEl) {
            const actualCooldown = mm.baseCooldown * (1000 / mm.stats.castSpd);
            const pct = Math.min(100, Math.floor((mm.cooldownTimer / actualCooldown) * 100));
            fillEl.style.width = `${pct}%`;
        }

        // Update Auto Button
        const autoBtn = document.getElementById('messiah-auto-btn');
        if (autoBtn) {
            autoBtn.classList.toggle('active', mm.isAutoMode);
        }
    }

    /**
     * Updates the Messiah slot in the formation screen
     */
    updateFormationSlot() {
        const slotEl = document.getElementById('formation-messiah-slot');
        if (!slotEl) return;

        const power = messiahManager.getActivePower();
        if (!power) return;

        const maxStacks = 10 + (power.level - 1) * 2;

        slotEl.style.position = 'relative';
        slotEl.style.display = 'flex';
        slotEl.style.flexDirection = 'column';
        slotEl.style.alignItems = 'center';
        slotEl.style.justifyContent = 'center';

        slotEl.innerHTML = `
            <div style="position:absolute; top:2px; left:4px; font-size:8px; font-weight:bold; color:#fff; text-shadow:0 1px 2px #000; z-index:10; background:rgba(0,0,0,0.5); padding:0 2px; border-radius:2px;">Lv.${power.level}</div>
            <div style="font-size: 28px;">${power.emoji}</div>
            <div style="position:absolute; bottom:2px; right:4px; font-size:8px; font-weight:bold; color:#fff; text-shadow:0 1px 2px #000; z-index:10;">${maxStacks}${localizationManager.t('ui_npc_stacks_unit')}</div>
        `;
        slotEl.classList.add('filled');
    }
}
