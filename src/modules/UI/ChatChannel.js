/**
 * ChatChannel
 * Represents a single chat interface for a party member.
 */
import ItemManager from '../Core/ItemManager.js';
import EventBus from '../Events/EventBus.js';

export default class ChatChannel {
    constructor(id, classId, characters, name, spritePath, parentElement, onCommand, onSwap, uiManager) {
        this.uiManager = uiManager;
        this.onCommand = onCommand;
        this.onSwap = onSwap;
        this.name = name;

        this.charactersByClass = {}; // Store characters grouped by class
        Object.values(import.meta.glob('../Core/EntityStats.js', { eager: true, import: 'Characters' })).forEach(chars => {
            // This is a bit complex in standard ESM, better to pass it in or fetch it.
        });

        // Let's assume we can access Characters from the global or imported context
        this.id = id;
        this.element = document.createElement('div');
        this.element.className = 'chat-channel empty'; // Start as empty
        this.linkedUnitId = null;
        this.classId = null;
        this.charms = Array(9).fill(null); // Track charms for quick lookup
        this.renderedCharms = Array(9).fill(undefined); // Dirty flag for UI performance

        this.nodeCharms = Array(3).fill(null); // 1x3 Tactical Node Charms
        this.renderedNodeCharms = Array(3).fill(undefined);

        // Performance Optimization: DOM Caching & Dirty Flags
        this.domCache = {
            stats: {},
            gear: {},
            perks: null,
            skill: {}
        };
        this.lastState = {
            stats: {},
            equipment: {},
            statuses: "",
            ultProgress: -1,
            narrativeKey: ""
        };
        this.lastGrimoireState = null; // For dirty flag optimization

        this.dirty = false;
        this.pendingData = {
            statuses: null,
            equipment: null,
            equipment: null,
            grimoire: null,
            stats: null,
            skill: null,
            narrative: { unlocks: null, level: null },
            ultProgress: null
        };

        // Generate character options for the dropdown
        let optionsHtml = '';
        if (characters && characters.length > 0) {
            characters.forEach(char => {
                const selected = char.name.includes(name) || char.id === name ? 'selected' : '';
                optionsHtml += `<option value="${char.id}" ${selected}>${char.name}</option>`;
            });
        } else {
            optionsHtml = `<option value="default">${name}</option>`;
        }

        this.element.innerHTML = `
            <div class="ult-gauge-overlay" id="ult-gauge-${id}"></div>
            <img class="chat-bg-sprite" src="${spritePath}" alt="bg" draggable="false">
            <div class="chat-header">
                <select class="chat-name-select" id="select-${id}">
                    ${optionsHtml}
                </select>
                <span class="nameplate-buff-icon" id="nameplate-buff-${id}" style="display:none; font-size: 16px; margin-left: 4px;" title="나나의 음악 버프 활성화!">🎵</span>
                <button class="ult-toggle-btn auto" id="ult-toggle-${id}" title="궁극기 사용 모드">AUTO</button>
            </div>
            <div class="status-row-second">
                <div class="status-container buffs" id="buffs-${id}"></div>
                <div class="status-container status-effects" id="status-${id}"></div>
            </div>

            <!-- Dashboard Menu View (Always Visible) -->
            <div class="chat-dashboard-view" id="dashboard-${id}" style="display: flex;">
                <!-- Combat Graph Window (Real-time Tracker) -->
                <div class="combat-graph-window" id="combat-graph-${id}">
                    <div class="combat-stat-row">
                        <span class="combat-icon">⚔️</span>
                        <div class="combat-bar-container">
                            <div class="combat-bar damage" id="bar-dmg-${id}" style="width: 0%"></div>
                            <span class="combat-label">DPS: <span id="val-dmg-${id}">0</span></span>
                        </div>
                        <span class="combat-rank rank-dmg" id="rank-dmg-${id}">-등</span>
                    </div>
                    <div class="combat-stat-row">
                        <span class="combat-icon">🛡️</span>
                        <div class="combat-bar-container">
                            <div class="combat-bar received" id="bar-rec-${id}" style="width: 0%"></div>
                            <span class="combat-label">TANK: <span id="val-rec-${id}">0</span></span>
                        </div>
                        <span class="combat-rank rank-rec" id="rank-rec-${id}">-등</span>
                    </div>
                    <div class="combat-stat-row">
                        <span class="combat-icon">✨</span>
                        <div class="combat-bar-container">
                            <div class="combat-bar heal" id="bar-heal-${id}" style="width: 0%"></div>
                            <span class="combat-label">HPS: <span id="val-heal-${id}">0</span></span>
                        </div>
                        <span class="combat-rank rank-heal" id="rank-heal-${id}">-등</span>
                    </div>
                </div>

                <div class="dashboard-grid">
                    <button class="dash-item highlight" data-view="grimoire">
                        <span class="dash-icon">📖</span>
                        <span class="dash-label">그리모어</span>
                    </button>
                    <button class="dash-item" data-view="gear">
                        <span class="dash-icon">⚔️</span>
                        <span class="dash-label">장비</span>
                    </button>
                    <button class="dash-item" data-view="skill">
                        <span class="dash-icon">💫</span>
                        <span class="dash-label">스킬</span>
                    </button>
                    <button class="dash-item" data-view="status">
                        <span class="dash-icon">📊</span>
                        <span class="dash-label">능력치</span>
                    </button>
                    <button class="dash-item" data-view="narrative">
                        <span class="dash-icon">📚</span>
                        <span class="dash-label">서사</span>
                    </button>
                </div>
            </div>

            <!-- Grimoire View (Messiah Grimoire) -->
            <div class="chat-grimoire-view" id="grimoire-${id}" style="display: none;">
                <div class="grimoire-book-bg"></div>
                <div class="grim-container">
                    <div class="grim-header-row">
                        <div class="grim-page-header">📖 MESSIAH GRIMOIRE</div>
                        <button class="grim-close-btn dash-back-btn" title="닫기">×</button>
                    </div>
                    
                    <div class="grim-page">
                        <div class="grim-chapter" data-chapter="A">
                            <div class="grim-chapter-label">CHAPTER A: ACTIVE (액티브)</div>
                            <div class="grim-grid" id="charms-a-${id}">
                                ${Array(9).fill(0).map((_, i) => `<div class="grim-slot" data-chapter="ACTIVE" data-index="${i}"></div>`).join('')}
                            </div>
                        </div>

                        <div class="grim-chapter-subgrid">
                            <div class="grim-chapter" data-chapter="B">
                                <div class="grim-chapter-label">CHAPTER B: TACTICAL (전술)</div>
                                <div class="grim-grid tactical-grid" id="charms-b-${id}">
                                    ${Array(3).fill(0).map((_, i) => `<div class="grim-slot node-charm-slot" data-chapter="TACTICAL" data-index="${i}"></div>`).join('')}
                                </div>
                            </div>

                            <div class="grim-chapter" data-chapter="C">
                                <div class="grim-chapter-label">CHAPTER C: CLASS (클래스)</div>
                                <div class="grim-grid class-grid" id="charms-c-${id}">
                                    ${Array(6).fill(0).map((_, i) => `<div class="grim-slot class-charm-slot" data-chapter="CLASS" data-index="${i}"></div>`).join('')}
                                </div>
                            </div>
                        </div>

                        <div class="grim-chapter" data-chapter="D">
                            <div class="grim-chapter-label">CHAPTER D: TRANSFORMATION (변신)</div>
                            <div class="grim-grid trans-grid" id="charms-d-${id}">
                                <div class="grim-slot trans-charm-slot" data-chapter="TRANSFORMATION" data-index="0"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Perk View -->
            <div class="chat-perk-view" id="perk-${id}" style="display: none;">
                <div class="perk-container">
                    <div class="perk-header">
                        <span class="perk-title">특수 능력 [PERK]</span>
                        <span class="perk-points">Available: 0</span>
                    </div>
                    <div class="perk-empty-msg">
                        아직 획득한 퍽이 없습니다.<br/>레벨업과 업적을 통해 퍽 포인트를 획득하세요.
                    </div>
                </div>
                <button class="dash-back-btn">돌아가기</button>
            </div>
            <div class="chat-gear-view" id="gear-${id}" style="display: none;">
                <div class="gear-slot" data-slot="weapon"><span class="slot-label">[무기]</span> <span class="slot-value">Empty</span></div>
                <div class="gear-slot" data-slot="armor"><span class="slot-label">[방어구]</span> <span class="slot-value">Empty</span></div>
                <div class="gear-slot" data-slot="necklace"><span class="slot-label">[목걸이]</span> <span class="slot-value">Empty</span></div>
                <div class="gear-slot" data-slot="ring"><span class="slot-label">[반지]</span> <span class="slot-value">Empty</span></div>
                
                <div class="gear-hint-msg" style="color: #888; font-size: 11px; margin-top: 15px; text-align: center;">참(Charm)은 '그리모어' 탭에서 관리할 수 있습니다.</div>
                <button class="dash-back-btn">돌아가기</button>
            </div>
            <div class="chat-status-view" id="stats-${id}" style="display: none;">
                <div class="stat-grid">
                    <div class="stat-item lv-exp-line"><span class="stat-label">LV</span><span class="stat-value" data-stat="level">1</span></div>
                    <div class="stat-item lv-exp-line"><span class="stat-label">EXP</span><span class="stat-value" data-stat="exp_display">0/0</span></div>
                    <div class="stat-item"><span class="stat-label">HP</span><span class="stat-value" data-stat="hp">0/0</span></div>
                    <div class="stat-item"><span class="stat-label">ATK</span><span class="stat-value" data-stat="atk">0</span></div>
                    <div class="stat-item"><span class="stat-label">mATK</span><span class="stat-value" data-stat="mAtk">0</span></div>
                    <div class="stat-item"><span class="stat-label">DEF</span><span class="stat-value" data-stat="def">0</span></div>
                    <div class="stat-item"><span class="stat-label">mDEF</span><span class="stat-value" data-stat="mDef">0</span></div>
                    <div class="stat-item"><span class="stat-label">FIRE RES</span><span class="stat-value" data-stat="fireRes">0</span>%</div>
                    <div class="stat-item"><span class="stat-label">ICE RES</span><span class="stat-value" data-stat="iceRes">0</span>%</div>
                    <div class="stat-item"><span class="stat-label">LTNG RES</span><span class="stat-value" data-stat="lightningRes">0</span>%</div>
                    <div class="stat-item"><span class="stat-label">SPD</span><span class="stat-value" data-stat="speed">0</span></div>
                    <div class="stat-item"><span class="stat-label">AtkSpd</span><span class="stat-value" data-stat="atkSpd">0</span></div>
                    <div class="stat-item"><span class="stat-label">AtkRange</span><span class="stat-value" data-stat="atkRange">0</span></div>
                    <div class="stat-item"><span class="stat-label">RangeMin</span><span class="stat-value" data-stat="rangeMin">0</span></div>
                    <div class="stat-item"><span class="stat-label">RangeMax</span><span class="stat-value" data-stat="rangeMax">0</span></div>
                    <div class="stat-item"><span class="stat-label">CastSpd</span><span class="stat-value" data-stat="castSpd">0</span></div>
                    <div class="stat-item"><span class="stat-label">ACC</span><span class="stat-value" data-stat="acc">0</span></div>
                    <div class="stat-item"><span class="stat-label">EVA</span><span class="stat-value" data-stat="eva">0</span></div>
                    <div class="stat-item"><span class="stat-label">CRIT</span><span class="stat-value" data-stat="crit">0</span></div>
                </div>
                <button class="dash-back-btn">돌아가기</button>
            </div>
            <div class="chat-skill-view" id="skill-${id}" style="display: none;">
                <div class="skill-info-container">
                    <div class="skill-section passive" style="display: none; border-left: 4px solid #3b82f6; margin-bottom: 12px; padding-left: 8px;">
                        <div class="skill-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span class="skill-emoji-passive" style="font-size: 1.2rem;">⚡</span>
                            <span class="skill-name-passive" style="font-weight: bold; color: #60a5fa;">Passive Name</span>
                        </div>
                        <div class="skill-description-passive" style="font-size: 0.9rem; color: #cbd5e1; line-height: 1.4;">
                            Passive description...
                        </div>
                    </div>
                    <div class="skill-section" style="border-left: 4px solid #f59e0b; margin-bottom: 12px; padding-left: 8px;">
                        <div class="skill-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span class="skill-emoji">✨</span>
                            <span class="skill-name">Skill Name</span>
                        </div>
                        <div class="skill-description" style="font-size: 0.9rem; color: #cbd5e1; line-height: 1.4;">
                            Skill description goes here...
                        </div>
                    </div>
                    <div class="skill-section ultimate" style="border-left: 4px solid #ef4444; padding-left: 8px;">
                        <div class="skill-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span class="skill-emoji">🌟</span>
                            <span class="skill-name-ult">Ultimate Name</span>
                        </div>
                        <div class="skill-description-ult" style="font-size: 0.9rem; color: #cbd5e1; line-height: 1.4;">
                            Ultimate description goes here...
                        </div>
                    </div>
                </div>
                <button class="dash-back-btn">돌아가기</button>
            </div>
            <div class="chat-narrative-view" id="narrative-${id}" style="display: none;">
                <!-- Narrative blocks injected here -->
                <button class="dash-back-btn">돌아가기</button>
            </div>
        `;

        parentElement.appendChild(this.element);

        this.setupDragDrop();
        EventBus.on(EventBus.EVENTS.COMBAT_TRACKER_UPDATE, this.handleCombatTrackerUpdate, this);
        this.statusContainer = this.element.querySelector('.status-container.status-effects');
        this.buffContainer = this.element.querySelector('.status-container.buffs');
        this.statusRow = this.element.querySelector('.status-row-second');
        this.characterSelect = this.element.querySelector('.chat-name-select');
        this.dashboardView = this.element.querySelector('.chat-dashboard-view');
        this.perkView = this.element.querySelector('.chat-perk-view');
        this.gearView = this.element.querySelector('.chat-gear-view');
        this.grimoireView = this.element.querySelector('.chat-grimoire-view');
        this.skillView = this.element.querySelector('.chat-skill-view');
        this.statusView = this.element.querySelector('.chat-status-view');
        this.narrativeView = this.element.querySelector('.chat-narrative-view');
        this.currentView = 'dashboard'; // Default view
        this.setupGearDragDrop();
        this.setupGrimoireDragDrop();

        // Bind dashboard grid items
        this.dashboardView.querySelectorAll('.dash-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-view');
                this.toggleView(target);
            });
        });

        // Bind back buttons
        this.element.querySelectorAll('.dash-back-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleView('dashboard');
            });
        });

        // Add context menu or "Back to Menu" logic for sub-views
        [this.perkView, this.gearView, this.grimoireView, this.skillView, this.statusView, this.narrativeView].forEach(view => {
            view.addEventListener('click', (e) => {
                // If clicking the view background (not its children), go back to dashboard
                if (e.target === view) {
                    this.toggleView('dashboard');
                }
            });
        });

        if (this.characterSelect) {
            this.characterSelect.addEventListener('change', (e) => {
                if (this.onSwap) {
                    this.onSwap(this.classId, e.target.value);
                }
            });
        }

        // Manual Ultimate Trigger (Clicking the channel itself)
        this.element.addEventListener('click', (e) => {
            // Avoid triggering if clicking on UI buttons or interactive areas
            if (e.target.closest('.chat-header') || e.target.closest('.chat-dashboard-view') ||
                e.target.closest('.chat-view-toggle')) return;

            if (this.element.classList.contains('ult-ready-glow')) {
                import('../Events/EventBus.js').then(eb => {
                    eb.default.emit('ULT_TRIGGER', {
                        agentId: this.linkedUnitId || this.classId
                    });
                });
            }
        });

        // Ultimate Toggle
        this.ultToggleBtn = this.element.querySelector('.ult-toggle-btn');
        this.ultGaugeOverlay = this.element.querySelector('.ult-gauge-overlay');
        this.isAutoUlt = true;

        this.ultToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.isAutoUlt = !this.isAutoUlt;
            this.updateUltToggleUI();

            // Emit event so Mercenary can sync
            import('../Events/EventBus.js').then(eb => {
                eb.default.emit('ULT_TOGGLE_AUTO', {
                    agentId: this.linkedUnitId || this.classId,
                    auto: this.isAutoUlt
                });
            });
        });
    }

    updateUltToggleUI() {
        if (this.isAutoUlt) {
            this.ultToggleBtn.textContent = 'AUTO';
            this.ultToggleBtn.classList.remove('manual');
            this.ultToggleBtn.classList.add('auto');
        } else {
            this.ultToggleBtn.textContent = 'MANUAL';
            this.ultToggleBtn.classList.remove('auto');
            this.ultToggleBtn.classList.add('manual');
        }
    }

    toggleView(target) {
        if (!target) target = 'dashboard';
        this.currentView = target;

        // Sync Visuals
        this.dashboardView.style.display = (this.currentView === 'dashboard') ? 'flex' : 'none';
        this.gearView.style.display = (this.currentView === 'gear') ? 'flex' : 'none';
        this.grimoireView.style.display = (this.currentView === 'grimoire') ? 'flex' : 'none';
        this.skillView.style.display = (this.currentView === 'skill') ? 'flex' : 'none';
        this.statusView.style.display = (this.currentView === 'status') ? 'block' : 'none';
        this.narrativeView.style.display = (this.currentView === 'narrative') ? 'block' : 'none';
        this.perkView.style.display = (this.currentView === 'perk') ? 'flex' : 'none';

        if (this.currentView !== 'dashboard') {
            this.element.classList.add('view-overlay');
        } else {
            this.element.classList.remove('view-overlay');
        }
    }

    updateVisuals(name, spritePath, characterId) {
        this.name = name;
        this.characterId = characterId;

        // Update name dropdown or text
        if (this.characterSelect) {
            // Find option and select it
            const option = Array.from(this.characterSelect.options).find(opt => opt.value === characterId);
            if (option) {
                option.selected = true;
            }
        }

        // Update background sprite (the faint mercenary image)
        const bgSprite = this.element.querySelector('.chat-bg-sprite');
        if (bgSprite) {
            bgSprite.src = spritePath;
        }

        // Update placeholder
        if (this.input) {
            this.input.placeholder = `${name}에게 지시... (e.g. 공격!)`;
        }
    }

    addLog(text, color = '#e0e0e0') {
        // No-op as chat is removed from detailed view
    }

    updateStatuses(statuses) {
        this.pendingData.statuses = statuses;
        this.dirty = true;
    }

    _applyStatuses(statuses) {
        if (!this.statusContainer || !this.buffContainer) return;

        const statusKey = statuses.map(s => s.id + s.emoji).join('|');
        if (this.lastState.statuses === statusKey) return;
        this.lastState.statuses = statusKey;

        this.statusContainer.innerHTML = '';
        this.buffContainer.innerHTML = '';

        const nameplateBuffIcon = this.element.querySelector('.nameplate-buff-icon');
        let hasNanaBuff = false;

        statuses.forEach(status => {
            if (status.name.includes('NanaCrit')) hasNanaBuff = true;

            const span = document.createElement('span');
            span.className = 'status-icon';
            span.textContent = status.emoji;
            span.style.cursor = 'pointer';
            span.style.fontSize = '18px';
            span.style.marginLeft = '6px';
            span.style.transition = 'transform 0.2s';

            span.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.uiManager && this.uiManager.showStatusTooltip) {
                    this.uiManager.showStatusTooltip(status, span);
                }
            });

            span.addEventListener('mouseenter', () => span.style.transform = 'scale(1.2)');
            span.addEventListener('mouseleave', () => span.style.transform = 'scale(1)');

            if (status.category === 'buff') {
                this.buffContainer.appendChild(span);
            } else {
                this.statusContainer.appendChild(span);
            }
        });

        if (nameplateBuffIcon) {
            nameplateBuffIcon.style.display = hasNanaBuff ? 'inline-block' : 'none';
        }
    }

    updateEquipment(equipment, grimoire) {
        if (equipment) this.pendingData.equipment = equipment;
        if (grimoire) this.pendingData.grimoire = grimoire;
        this.dirty = true;
    }

    _applyEquipment(equipment, grimoire) {
        if (!equipment || !this.gearView) return;
        this.grimoire = grimoire;

        const slots = {
            weapon: equipment.weapon || 'Empty',
            armor: equipment.armor || 'Empty',
            necklace: equipment.necklace || 'Empty',
            ring: equipment.ring || 'Empty'
        };

        Object.keys(slots).forEach(key => {
            const item = slots[key];
            const displayName = (item && item.name) ? item.name : (typeof item === 'string' ? item : 'Empty');

            // Dirty flag check
            if (this.lastState.equipment[key] === displayName) return;
            this.lastState.equipment[key] = displayName;

            // Cache-aware selector
            if (!this.domCache.gear[key]) {
                this.domCache.gear[key] = this.gearView.querySelector(`.gear-slot[data-slot="${key}"] .slot-value`);
            }

            const slotEl = this.domCache.gear[key];
            if (slotEl) {
                slotEl.textContent = displayName;
                slotEl.style.color = displayName === 'Empty' ? '#666' : '#fff';
            }
        });

        if (grimoire && this.grimoireView) {
            this.updateGrimoireGrid(grimoire);
        }
    }

    updateGrimoireGrid(grimoire) {
        // --- Dirty Flag Optimization ---
        const grimoireStr = JSON.stringify(grimoire);
        if (this.lastGrimoireState === grimoireStr) return;
        this.lastGrimoireState = grimoireStr;

        const slots = this.grimoireView.querySelectorAll('.grim-slot');
        slots.forEach(slot => {
            const chapter = slot.dataset.chapter;
            const index = parseInt(slot.dataset.index);
            const chapterKey = `chapter_${chapter.toLowerCase().substring(0, 1)}`; // chapter_a, etc. 
            // Correcting mapping: ACTIVE -> chapter_a, TACTICAL -> chapter_b, CLASS -> chapter_c, TRANSFORMATION -> chapter_d
            const chapterId = (chapter === 'ACTIVE') ? 'chapter_a' :
                (chapter === 'TACTICAL') ? 'chapter_b' :
                    (chapter === 'CLASS') ? 'chapter_c' : 'chapter_d';

            const itemId = grimoire[chapterId] ? grimoire[chapterId][index] : null;

            // Cache rendering to prevent flickering - Only return if THIS specific slot already matches this itemId
            if (!this.renderedGrimoireSlots) this.renderedGrimoireSlots = {};
            const slotKey = `${chapterId}_${index}`;
            if (this.renderedGrimoireSlots[slotKey] === itemId) return;
            this.renderedGrimoireSlots[slotKey] = itemId;

            slot.innerHTML = '';
            if (itemId) {
                const filename = ItemManager.getSVGFilename(itemId);
                const img = document.createElement('img');
                img.src = `assets/emojis/${filename}`;
                img.className = 'grim-icon';
                img.dataset.itemId = itemId;
                slot.appendChild(img);
            }
        });
    }

    updateStats(stats) {
        this.pendingData.stats = stats;
        this.dirty = true;
    }

    _applyStats(stats) {
        if (!stats || !this.statusView) return;

        // Sync logical ID and class if they changed
        if (stats.className) this.className = stats.className;
        if (stats.classId) this.classId = stats.classId;
        if (stats.characterId) this.characterId = stats.characterId;

        const statMappings = [
            { key: 'level', val: stats.level },
            { key: 'exp_display', val: (stats.exp !== undefined && stats.expToNextLevel !== undefined) ? `${Math.round(stats.exp)}/${Math.round(stats.expToNextLevel)}` : undefined },
            { key: 'hp', val: (stats.hp !== undefined && stats.maxHp !== undefined) ? `${Math.round(stats.hp)}/${Math.round(stats.maxHp)}` : undefined },
            { key: 'atk', val: stats.atk !== undefined ? stats.atk.toFixed(1) : undefined },
            { key: 'mAtk', val: stats.mAtk !== undefined ? stats.mAtk.toFixed(1) : undefined },
            { key: 'def', val: stats.def !== undefined ? stats.def.toFixed(1) : undefined },
            { key: 'mDef', val: stats.mDef !== undefined ? stats.mDef.toFixed(1) : undefined },
            { key: 'fireRes', val: stats.fireRes },
            { key: 'iceRes', val: stats.iceRes },
            { key: 'lightningRes', val: stats.lightningRes },
            { key: 'speed', val: stats.speed },
            { key: 'atkSpd', val: stats.atkSpd },
            { key: 'atkRange', val: stats.atkRange },
            { key: 'rangeMin', val: stats.rangeMin },
            { key: 'rangeMax', val: stats.rangeMax },
            { key: 'castSpd', val: stats.castSpd },
            { key: 'acc', val: stats.acc },
            { key: 'eva', val: stats.eva },
            { key: 'crit', val: stats.crit !== undefined ? `${stats.crit}%` : undefined }
        ];

        statMappings.forEach(entry => {
            if (entry.val !== undefined) {
                // Performance Check: Skip if value hasn't changed
                if (this.lastState.stats[entry.key] === entry.val) return;
                this.lastState.stats[entry.key] = entry.val;

                // Performance Check: Cache-aware selector
                if (!this.domCache.stats[entry.key]) {
                    this.domCache.stats[entry.key] = this.statusView.querySelector(`[data-stat="${entry.key}"]`);
                }

                const el = this.domCache.stats[entry.key];
                if (el) el.textContent = entry.val;
            }
        });

        // Update Perks if present in stats
        if (stats.perkPoints !== undefined) {
            this.updatePerks(stats.perkPoints, stats.activatedPerks || []);
        }
    }

    updateSkill(skillData) {
        this.pendingData.skill = skillData;
        this.dirty = true;
    }

    _applySkill(skillData) {
        if (!skillData || !this.skillView) return;

        // Passive
        const passiveSection = this.skillView.querySelector('.skill-section.passive');
        if (skillData.passiveName) {
            if (passiveSection) passiveSection.style.display = 'block';
            const pNameEl = this.skillView.querySelector('.skill-name-passive');
            const pEmojiEl = this.skillView.querySelector('.skill-emoji-passive');
            const pDescEl = this.skillView.querySelector('.skill-description-passive');
            if (pNameEl) pNameEl.textContent = skillData.passiveName;
            if (pEmojiEl) pEmojiEl.textContent = skillData.passiveEmoji || '⚡';
            if (pDescEl) pDescEl.textContent = skillData.passiveDescription || '';
        } else {
            if (passiveSection) passiveSection.style.display = 'none';
        }

        // Active
        const nameEl = this.skillView.querySelector('.skill-name');
        const emojiEl = this.skillView.querySelector('.skill-emoji');
        const descEl = this.skillView.querySelector('.skill-description');

        if (nameEl) nameEl.textContent = skillData.name || 'Unknown Skill';
        if (emojiEl) emojiEl.textContent = skillData.emoji || '💫';
        if (descEl) descEl.textContent = skillData.description || 'No description available.';

        // Update Ultimate Info if provided
        const ultNameEl = this.skillView.querySelector('.skill-name-ult');
        const ultDescEl = this.skillView.querySelector('.skill-description-ult');

        if (skillData.ultimateName) {
            if (ultNameEl) ultNameEl.textContent = skillData.ultimateName;
            if (ultDescEl) ultDescEl.textContent = skillData.ultimateDescription || '';

            // Also update the toggle button tooltip
            if (this.ultToggleBtn) {
                this.ultToggleBtn.title = `궁극기: ${skillData.ultimateName}\n${skillData.ultimateDescription}`;
            }
        }
    }

    updateNarrative(unlocks, level) {
        this.pendingData.narrative = { unlocks, level };
        this.dirty = true;
    }

    _applyNarrative(unlocks, currentLevel) {
        if (!unlocks || !this.narrativeView) return;

        const narrativeKey = `${currentLevel}|${unlocks.length}`;
        if (this.lastState.narrativeKey === narrativeKey) return;
        this.lastState.narrativeKey = narrativeKey;

        let html = '<div class="narrative-container">';
        unlocks.forEach(unlock => {
            const isUnlocked = currentLevel >= unlock.level;
            const lockClass = isUnlocked ? '' : 'is-locked';
            const icon = isUnlocked ? '🔓' : '🔒';
            const content = isUnlocked ? unlock.trait : '이 내용은 아직 잠겨 있습니다. 레벨을 더 높여 서사를 해금하세요.';

            html += `
                <div class="narrative-block ${lockClass}">
                    <div class="narrative-lv">Level ${unlock.level} ${icon}</div>
                    <div class="narrative-text">${content}</div>
                </div>
            `;
        });
        html += '</div>';
        this.narrativeView.innerHTML = html;
    }

    updateUltGauge(progress) {
        this.pendingData.ultProgress = progress;
        this.dirty = true;
    }

    _applyUltGauge(progress) {
        if (!this.ultGaugeOverlay) return;

        if (this.lastState.ultProgress === progress) return;
        this.lastState.ultProgress = progress;

        // progress is 0 to 100
        this.ultGaugeOverlay.style.height = `${progress}%`;

        if (progress >= 100) {
            this.element.classList.add('ult-ready-glow');
        } else {
            this.element.classList.remove('ult-ready-glow');
        }
    }

    update() {
        if (!this.dirty) return;
        this.dirty = false;

        const d = this.pendingData;
        if (d.statuses) this._applyStatuses(d.statuses);
        if (d.equipment || d.grimoire) this._applyEquipment(d.equipment, d.grimoire);
        if (d.stats) this._applyStats(d.stats);
        if (d.skill) this._applySkill(d.skill);
        if (d.narrative.unlocks) this._applyNarrative(d.narrative.unlocks, d.narrative.level);
        if (d.ultProgress !== null) this._applyUltGauge(d.ultProgress);

        // Reset some critical pending flags to null if they aren't 'cumulative'
        this.pendingData.stats = null;
        this.pendingData.statuses = null;
    }

    bindUnit(unitId, unitName, spritePath, skillData, narrativeUnlocks, characterId) {
        this.linkedUnitId = unitId;
        this.characterId = characterId || this.characterId;

        // Re-populate dropdown based on this class
        this.populateDropdown();

        this.updateVisuals(unitName, spritePath, this.characterId);
        if (skillData) this.updateSkill(skillData);
        if (narrativeUnlocks) this.updateNarrative(narrativeUnlocks, 1);
    }

    populateDropdown() {
        if (!this.characterSelect) return;

        // Dynamic import or global access to Characters
        import('../Core/EntityStats.js').then(module => {
            const Characters = module.Characters;
            const classChars = Object.values(Characters).filter(c => c.classId === this.classId);

            let optionsHtml = '';
            classChars.forEach(char => {
                const selected = char.id === this.characterId ? 'selected' : '';
                optionsHtml += `<option value="${char.id}" ${selected}>${char.name}</option>`;
            });
            this.characterSelect.innerHTML = optionsHtml;

            // Re-verify selection after innerHTML change
            if (this.characterId) {
                this.characterSelect.value = this.characterId;
            }
        });
    }

    setupDragDrop() {
        this.element.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.element.classList.add('drag-over');
        });

        this.element.addEventListener('dragleave', () => {
            this.element.classList.remove('drag-over');
        });

        this.element.addEventListener('drop', (e) => {
            e.preventDefault();
            this.element.classList.remove('drag-over');
            const characterId = e.dataTransfer.getData('characterId');
            if (characterId) {
                import('../Events/EventBus.js').then(module => {
                    const EventBus = module.default;
                    EventBus.emit('UI_SLOT_ASSIGNED', {
                        slotId: this.id,
                        characterId: characterId
                    });
                });
            }
        });
    }
    setupGearDragDrop() {
        if (!this.gearView) return;

        const slots = this.gearView.querySelectorAll('.gear-slot');
        slots.forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                slot.classList.add('drag-over');
            });

            slot.addEventListener('dragleave', (e) => {
                e.stopPropagation();
                slot.classList.remove('drag-over');
            });

            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                slot.classList.remove('drag-over');

                const itemId = e.dataTransfer.getData('itemId');
                if (itemId && this.linkedUnitId) {
                    import('../Events/EventBus.js').then(module => {
                        const EventBus = module.default;
                        EventBus.emit(EventBus.EVENTS.EQUIP_REQUEST, {
                            unitId: this.linkedUnitId,
                            itemId: itemId
                        });
                    });
                }
            });

            // Click to open inventory and mark as pending gear slot
            slot.addEventListener('click', () => {
                if (this.uiManager) {
                    const slotType = slot.dataset.slot;

                    // Clear any previous pending highlights (both gear and grimoire)
                    document.querySelectorAll('.gear-slot, .grim-slot').forEach(s => {
                        s.classList.remove('gear-slot-pending', 'grim-slot-pending');
                    });

                    // Mark this slot as pending for equip
                    this.uiManager.pendingGearSlot = {
                        unitId: this.linkedUnitId,
                        slot: slotType,
                        element: slot
                    };
                    slot.classList.add('gear-slot-pending');

                    console.log(`[Gear] Slot pending: ${slotType} for ${this.name}`);

                    this.uiManager.showPopup('inventory');
                    if (this.uiManager.switchInventoryTab) {
                        this.uiManager.switchInventoryTab('gear');
                    }
                }
            });
        });
    }

    setupGrimoireDragDrop() {
        if (!this.grimoireView) return;

        const slots = this.grimoireView.querySelectorAll('.grim-slot');
        slots.forEach(slot => {
            const index = parseInt(slot.dataset.index);
            const chapter = slot.dataset.chapter;

            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                slot.classList.add('drag-over');
            });

            slot.addEventListener('dragleave', (e) => {
                e.stopPropagation();
                slot.classList.remove('drag-over');
            });

            // Click to open inventory and mark as pending
            slot.addEventListener('click', () => {
                if (this.uiManager) {
                    // Clear any previous pending highlights
                    const allSlots = document.querySelectorAll('.grim-slot');
                    allSlots.forEach(s => s.classList.remove('grim-slot-pending'));

                    // Mark this slot as pending for equip
                    this.uiManager.pendingGrimoireSlot = {
                        unitId: this.linkedUnitId,
                        chapter: chapter,
                        index: index,
                        element: slot
                    };
                    slot.classList.add('grim-slot-pending');

                    console.log(`[Grimoire] Slot pending: ${chapter}[${index}] for ${this.name}`);

                    this.uiManager.showPopup('inventory');
                    if (this.uiManager.switchInventoryTab) {
                        // Map grimoire slot type to inventory filter
                        let filter = 'ALL';
                        const lowerChapter = chapter.toLowerCase();
                        if (lowerChapter.includes('active')) filter = 'ACTIVE';
                        else if (lowerChapter.includes('tactical')) filter = 'TACTICAL';
                        else if (lowerChapter.includes('class')) filter = 'CLASS';
                        else if (lowerChapter.includes('trans')) filter = 'TRANSFORMATION';

                        this.uiManager.switchInventoryTab('materials', filter);
                    }
                }
            });

            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                slot.classList.remove('drag-over');

                const itemId = e.dataTransfer.getData('itemId');
                if (itemId && this.linkedUnitId) {
                    import('../Events/EventBus.js').then(module => {
                        const EventBus = module.default;
                        // Map UI Chapter to Internal Event Type/Chapter
                        EventBus.emit('GRIMOIRE_REQUEST', {
                            unitId: this.linkedUnitId,
                            itemId: itemId,
                            chapter: chapter,
                            index: index,
                            action: 'set'
                        });
                    });
                }
            });

            // Right-click to remove
            slot.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (this.linkedUnitId) {
                    import('../Events/EventBus.js').then(module => {
                        const EventBus = module.default;
                        EventBus.emit('GRIMOIRE_REQUEST', {
                            unitId: this.linkedUnitId,
                            chapter: chapter,
                            index: index,
                            action: 'remove'
                        });
                    });
                }
            });
        });
    }

    findEmptyGrimoireSlot(chapter) {
        if (!this.grimoire) return -1;
        const chapterId = (chapter === 'ACTIVE') ? 'chapter_a' :
            (chapter === 'TACTICAL') ? 'chapter_b' :
                (chapter === 'CLASS') ? 'chapter_c' : 'chapter_d';

        const list = this.grimoire[chapterId];
        return list ? list.findIndex(c => c === null) : -1;
    }

    handleCombatTrackerUpdate(data) {
        const targetId = this.linkedUnitId || `unit_${this.characterId}`;
        console.log(`[ChatChannel ${this.id}] Update received for targetId: ${targetId}`, data);
        if (!data || !data[targetId]) return;
        const s = data[targetId];
        const id = this.id;

        // Update Values
        const dmgVal = document.getElementById(`val-dmg-${id}`);
        const recVal = document.getElementById(`val-rec-${id}`);
        const healVal = document.getElementById(`val-heal-${id}`);
        if (dmgVal) dmgVal.innerText = Math.round(s.dps).toLocaleString();
        if (recVal) recVal.innerText = Math.round(s.tps).toLocaleString();
        if (healVal) healVal.innerText = Math.round(s.hps).toLocaleString();

        // Update Ranks
        const dmgRank = document.getElementById(`rank-dmg-${id}`);
        const recRank = document.getElementById(`rank-rec-${id}`);
        const healRank = document.getElementById(`rank-heal-${id}`);
        if (dmgRank) dmgRank.innerText = `${s.dpsRank}등`;
        if (recRank) recRank.innerText = `${s.tpsRank}등`;
        if (healRank) healRank.innerText = `${s.hpsRank}등`;

        // Update Bar Widths (Relative to top performer in that category for visual scale)
        // Find max in each category
        let maxDps = 1, maxTps = 1, maxHps = 1;
        Object.values(data).forEach(u => {
            maxDps = Math.max(maxDps, u.dps);
            maxTps = Math.max(maxTps, u.tps);
            maxHps = Math.max(maxHps, u.hps);
        });

        const dmgBar = document.getElementById(`bar-dmg-${id}`);
        const recBar = document.getElementById(`bar-rec-${id}`);
        const healBar = document.getElementById(`bar-heal-${id}`);
        if (dmgBar) dmgBar.style.width = `${(s.dps / maxDps) * 100}%`;
        if (recBar) recBar.style.width = `${(s.tps / maxTps) * 100}%`;
        if (healBar) healBar.style.width = `${(s.hps / maxHps) * 100}%`;
    }

    findEmptyCharmSlot() {
        return this.charms.findIndex(c => c === null);
    }

    findEmptyNodeCharmSlot() {
        return this.nodeCharms.findIndex(c => c === null);
    }

    clear() {
        this.linkedUnitId = null;
        this.characterId = null;
        this.classId = null;
        this.element.classList.remove('has-unit');
        this.element.classList.add('empty');

        const bgSprite = this.element.querySelector('.chat-bg-sprite');
        if (bgSprite) bgSprite.src = '';

        const select = this.element.querySelector('.chat-name-select');
        if (select) select.innerHTML = '<option value="none">Empty Slot (배치 전)</option>';
    }
}
