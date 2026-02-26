/**
 * ChatChannel
 * Represents a single chat interface for a party member.
 */
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
                <div class="dashboard-grid">
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
                    <button class="dash-item highlight" data-view="perk">
                        <span class="dash-icon">🌟</span>
                        <span class="dash-label">퍽 [PERK]</span>
                    </button>
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
                    <div class="skill-section">
                        <div class="skill-header">
                            <span class="skill-emoji">✨</span>
                            <span class="skill-name">Skill Name</span>
                        </div>
                        <div class="skill-description">
                            Skill description goes here...
                        </div>
                    </div>
                    <div class="skill-section ultimate">
                        <div class="skill-header">
                            <span class="skill-emoji">🌟</span>
                            <span class="skill-name-ult">Ultimate Name</span>
                        </div>
                        <div class="skill-description-ult">
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
        this.statusContainer = this.element.querySelector('.status-container.status-effects');
        this.buffContainer = this.element.querySelector('.status-container.buffs');
        this.statusRow = this.element.querySelector('.status-row-second');
        this.characterSelect = this.element.querySelector('.chat-name-select');
        this.dashboardView = this.element.querySelector('.chat-dashboard-view');
        this.perkView = this.element.querySelector('.chat-perk-view');
        this.gearView = this.element.querySelector('.chat-gear-view');
        this.skillView = this.element.querySelector('.chat-skill-view');
        this.statusView = this.element.querySelector('.chat-status-view');
        this.narrativeView = this.element.querySelector('.chat-narrative-view');
        this.currentView = 'dashboard'; // Default view
        this.setupGearDragDrop();

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
        [this.perkView, this.gearView, this.skillView, this.statusView, this.narrativeView].forEach(view => {
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
        if (!this.statusContainer || !this.buffContainer) return;

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

    updateEquipment(equipment) {
        if (!equipment || !this.gearView) return;

        const slots = {
            weapon: equipment.weapon || 'Empty',
            armor: equipment.armor || 'Empty',
            necklace: equipment.necklace || 'Empty',
            ring: equipment.ring || 'Empty'
        };

        Object.keys(slots).forEach(key => {
            const slotEl = this.gearView.querySelector(`.gear-slot[data-slot="${key}"] .slot-value`);
            if (slotEl) {
                const item = slots[key];
                const displayName = (item && item.name) ? item.name : (typeof item === 'string' ? item : 'Empty');
                slotEl.textContent = displayName;
                slotEl.style.color = displayName === 'Empty' ? '#666' : '#fff';
            }
        });
    }

    updateStats(stats) {
        if (!stats || !this.statusView) return;

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
                const el = this.statusView.querySelector(`[data-stat="${entry.key}"]`);
                if (el) el.textContent = entry.val;
            }
        });

        // Update Perks if present in stats
        if (stats.perkPoints !== undefined) {
            this.updatePerks(stats.perkPoints, stats.activatedPerks || []);
        }
    }

    updateSkill(skillData) {
        if (!skillData || !this.skillView) return;

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

    updatePerks(perkPoints, activatedPerks) {
        if (!this.perkView) return;

        const ptsEl = this.perkView.querySelector('.perk-points');
        if (ptsEl) ptsEl.textContent = `Available: ${perkPoints}`;

        const container = this.perkView.querySelector('.perk-container');
        // Find or create perk list
        let list = container.querySelector('.perk-list');
        if (!list) {
            list = document.createElement('div');
            list.className = 'perk-list';
            container.appendChild(list);

            // Remove empty msg if list is added
            const emptyMsg = container.querySelector('.perk-empty-msg');
            if (emptyMsg) emptyMsg.style.display = 'none';
        }

        import('../Core/PerkManager.js').then(module => {
            const PerkDefinitions = module.PerkDefinitions;
            const perks = PerkDefinitions[this.classId] || [];

            list.innerHTML = '';
            perks.forEach(perk => {
                const isLearned = activatedPerks.includes(perk.id);
                const canLearn = !isLearned && perkPoints > 0;
                const row = document.createElement('div');
                row.className = `perk-row ${isLearned ? 'learned' : ''}`;
                row.innerHTML = `
                    <div class="perk-info">
                        <span class="perk-icon">${perk.emoji}</span>
                        <div class="perk-details">
                            <span class="perk-name">${perk.name}</span>
                            <span class="perk-desc">${perk.description}</span>
                        </div>
                    </div>
                    ${isLearned ? '<span class="perk-status">LEARNED</span>' :
                        canLearn ? `<button class="perk-learn-btn" data-perk="${perk.id}">ALLOCATE</button>` :
                            '<span class="perk-status locked">LOCKED</span>'}
                `;

                const btn = row.querySelector('.perk-learn-btn');
                if (btn) {
                    btn.addEventListener('click', () => {
                        import('../Events/EventBus.js').then(eb => {
                            eb.default.emit('PERK_LEARN', {
                                agentId: this.linkedUnitId || this.id,
                                perkId: perk.id
                            });
                        });
                    });
                }

                list.appendChild(row);
            });
        });
    }

    updateNarrative(unlocks, currentLevel) {
        if (!unlocks || !this.narrativeView) return;

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
        if (!this.ultGaugeOverlay) return;

        // progress is 0 to 100
        this.ultGaugeOverlay.style.height = `${progress}%`;

        if (progress >= 100) {
            this.element.classList.add('ult-ready-glow');
        } else {
            this.element.classList.remove('ult-ready-glow');
        }
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
        });
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
