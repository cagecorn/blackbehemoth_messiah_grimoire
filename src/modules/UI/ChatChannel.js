/**
 * ChatChannel
 * Represents a single chat interface for a party member.
 */
export default class ChatChannel {
    constructor(id, classId, characters, name, spritePath, parentElement, onCommand, onSwap) {
        this.id = id;
        this.classId = classId;
        this.name = name;
        this.onCommand = onCommand;
        this.onSwap = onSwap;

        this.element = document.createElement('div');
        this.element.className = 'chat-channel';

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
                <button class="ult-toggle-btn auto" id="ult-toggle-${id}" title="궁극기 사용 모드">AUTO</button>
                <div class="header-toggles">
                    <button class="chat-view-toggle gear-toggle" data-view="gear" title="장비 보기">⚔️</button>
                    <button class="chat-view-toggle skill-toggle" data-view="skill" title="스킬 정보">💫</button>
                    <button class="chat-view-toggle status-toggle" data-view="status" title="상세 능력치">📊</button>
                    <button class="chat-view-toggle narrative-toggle" data-view="narrative" title="서사 보기">📚</button>
                </div>
            </div>
            <div class="status-row-second">
                <div class="status-container buffs" id="buffs-${id}"></div>
                <div class="status-container status-effects" id="status-${id}"></div>
            </div>
            <div class="chat-log" id="log-${id}"></div>
            <div class="chat-gear-view" id="gear-${id}" style="display: none;">
                <div class="gear-slot" data-slot="weapon"><span class="slot-label">[무기]</span> <span class="slot-value">Empty</span></div>
                <div class="gear-slot" data-slot="armor"><span class="slot-label">[방어구]</span> <span class="slot-value">Empty</span></div>
                <div class="gear-slot" data-slot="necklace"><span class="slot-label">[목걸이]</span> <span class="slot-value">Empty</span></div>
                <div class="gear-slot" data-slot="ring"><span class="slot-label">[반지]</span> <span class="slot-value">Empty</span></div>
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
            </div>
            <div class="chat-skill-view" id="skill-${id}" style="display: none;">
                <div class="skill-info-container">
                    <div class="skill-header">
                        <span class="skill-emoji">✨</span>
                        <span class="skill-name">Skill Name</span>
                    </div>
                    <div class="skill-description">
                        Skill description goes here...
                    </div>
                </div>
            </div>
            <div class="chat-narrative-view" id="narrative-${id}" style="display: none;">
                <!-- Narrative blocks will be injected here -->
            </div>
            <form class="chat-form" id="form-${id}">
                <input type="text" placeholder="${name}에게 지시... (e.g. 공격!)" />
            </form>
        `;

        parentElement.appendChild(this.element);

        this.log = this.element.querySelector('.chat-log');
        this.form = this.element.querySelector('.chat-form');
        this.input = this.element.querySelector('input');
        this.buffContainer = this.element.querySelector('.status-container.buffs');
        this.statusContainer = this.element.querySelector('.status-container.status-effects');
        this.statusRow = this.element.querySelector('.status-row-second');
        this.characterSelect = this.element.querySelector('.chat-name-select');
        this.gearToggleBtn = this.element.querySelector('.gear-toggle');
        this.skillToggleBtn = this.element.querySelector('.skill-toggle');
        this.statusToggleBtn = this.element.querySelector('.status-toggle');
        this.narrativeToggleBtn = this.element.querySelector('.narrative-toggle');
        this.gearView = this.element.querySelector('.chat-gear-view');
        this.skillView = this.element.querySelector('.chat-skill-view');
        this.statusView = this.element.querySelector('.chat-status-view');
        this.narrativeView = this.element.querySelector('.chat-narrative-view');
        this.currentView = 'chat'; // 'chat', 'gear', 'skill', 'status', 'narrative'

        this.gearToggleBtn.addEventListener('click', () => {
            this.toggleView('gear');
        });

        this.statusToggleBtn.addEventListener('click', () => {
            this.toggleView('status');
        });

        this.skillToggleBtn.addEventListener('click', () => {
            this.toggleView('skill');
        });

        this.narrativeToggleBtn.addEventListener('click', () => {
            this.toggleView('narrative');
        });

        this.characterSelect.addEventListener('change', (e) => {
            if (this.onSwap) {
                this.onSwap(this.classId, e.target.value);
            }
        });

        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = this.input.value.trim();
            if (text) {
                this.addLog(`지휘: ${text}`, '#ffffff');
                this.onCommand(text);
                this.input.value = '';
            }
        });

        // Manual Ultimate Trigger (Clicking the channel itself)
        this.element.addEventListener('click', (e) => {
            // Avoid triggering if clicking on UI buttons or inputs
            if (e.target.closest('.chat-header') || e.target.closest('.header-toggles') ||
                e.target.closest('.chat-form') || e.target.closest('.chat-view-toggle')) return;

            if (this.element.classList.contains('ult-ready-glow')) {
                import('../Events/EventBus.js').then(eb => {
                    eb.default.emit('ULT_TRIGGER', {
                        agentId: this.classId
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
                    agentId: this.classId,
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
        if (this.currentView === target) {
            this.currentView = 'chat';
        } else {
            this.currentView = target;
        }

        // Sync Visuals
        const isChat = this.currentView === 'chat';
        this.log.style.display = isChat ? 'flex' : 'none';
        this.form.style.display = isChat ? 'block' : 'none';
        this.statusRow.style.display = isChat ? 'flex' : 'none';

        this.gearView.style.display = (this.currentView === 'gear') ? 'flex' : 'none';
        this.skillView.style.display = (this.currentView === 'skill') ? 'flex' : 'none';
        this.statusView.style.display = (this.currentView === 'status') ? 'block' : 'none';
        this.narrativeView.style.display = (this.currentView === 'narrative') ? 'block' : 'none';

        // Update Buttons
        this.gearToggleBtn.textContent = (this.currentView === 'gear') ? '💬' : '⚔️';
        this.skillToggleBtn.textContent = (this.currentView === 'skill') ? '💬' : '💫';
        this.statusToggleBtn.textContent = (this.currentView === 'status') ? '💬' : '📊';
        this.narrativeToggleBtn.textContent = (this.currentView === 'narrative') ? '💬' : '📚';

        if (this.currentView !== 'chat') {
            this.element.classList.add('view-overlay');
        } else {
            this.element.classList.remove('view-overlay');
        }
    }

    updateVisuals(name, spritePath, characterId) {
        this.name = name;
        this.input.placeholder = `${name}에게 지시... (e.g. 공격!)`;
        const img = this.element.querySelector('.chat-bg-sprite');
        if (img) img.src = spritePath;

        // Sync dropdown selection
        if (this.characterSelect && characterId) {
            this.characterSelect.value = characterId;
        } else if (this.characterSelect) {
            // Fallback: match by name
            for (let i = 0; i < this.characterSelect.options.length; i++) {
                if (this.characterSelect.options[i].text.includes(name)) {
                    this.characterSelect.selectedIndex = i;
                    break;
                }
            }
        }
    }

    addLog(text, color = '#e0e0e0') {
        const entry = document.createElement('div');
        entry.style.color = color;
        entry.textContent = `> ${text}`;
        this.log.appendChild(entry);

        if (this.log.children.length > 50) {
            this.log.removeChild(this.log.firstElementChild);
        }
        this.log.scrollTop = this.log.scrollHeight;
    }

    updateStatuses(statuses) {
        if (!this.statusContainer || !this.buffContainer) return;

        this.statusContainer.innerHTML = '';
        this.buffContainer.innerHTML = '';

        statuses.forEach(status => {
            const span = document.createElement('span');
            span.className = 'status-icon tooltip';
            span.textContent = status.emoji;

            const tooltipText = document.createElement('span');
            tooltipText.className = 'tooltiptext';
            const titleColor = status.category === 'buff' ? '#00ffcc' : '#ff5555';
            tooltipText.innerHTML = `<strong style="color:${titleColor}">${status.name}</strong><br/>${status.description}`;
            span.appendChild(tooltipText);

            span.style.cursor = 'help';
            span.style.fontSize = '14px';
            span.style.marginLeft = '4px';

            if (status.category === 'buff') {
                this.buffContainer.appendChild(span);
            } else {
                this.statusContainer.appendChild(span);
            }
        });
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
                slotEl.textContent = slots[key];
                slotEl.style.color = slots[key] === 'Empty' ? '#666' : '#fff';
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
    }

    updateSkill(skillData) {
        if (!skillData || !this.skillView) return;

        const nameEl = this.skillView.querySelector('.skill-name');
        const emojiEl = this.skillView.querySelector('.skill-emoji');
        const descEl = this.skillView.querySelector('.skill-description');

        if (nameEl) nameEl.textContent = skillData.name || 'Unknown Skill';
        if (emojiEl) emojiEl.textContent = skillData.emoji || '💫';
        if (descEl) descEl.textContent = skillData.description || 'No description available.';
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
}
