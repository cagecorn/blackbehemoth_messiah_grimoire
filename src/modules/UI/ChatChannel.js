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
            <img class="chat-bg-sprite" src="${spritePath}" alt="bg" draggable="false">
            <div class="chat-header">
                <select class="chat-name-select" id="select-${id}">
                    ${optionsHtml}
                </select>
                <div class="header-toggles">
                    <button class="chat-view-toggle gear-toggle" data-view="gear" title="장비 보기">⚔️</button>
                    <button class="chat-view-toggle status-toggle" data-view="status" title="상세 능력치">📊</button>
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
        this.characterSelect = this.element.querySelector('.chat-name-select');
        this.gearToggleBtn = this.element.querySelector('.gear-toggle');
        this.statusToggleBtn = this.element.querySelector('.status-toggle');
        this.gearView = this.element.querySelector('.chat-gear-view');
        this.statusView = this.element.querySelector('.chat-status-view');
        this.currentView = 'chat'; // 'chat', 'gear', 'status'

        this.gearToggleBtn.addEventListener('click', () => {
            this.toggleView('gear');
        });

        this.statusToggleBtn.addEventListener('click', () => {
            this.toggleView('status');
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
    }

    toggleView(target) {
        if (this.currentView === target) {
            this.currentView = 'chat';
        } else {
            this.currentView = target;
        }

        // Sync Visuals
        this.log.style.display = (this.currentView === 'chat') ? 'flex' : 'none';
        this.form.style.display = (this.currentView === 'chat') ? 'block' : 'none';
        this.gearView.style.display = (this.currentView === 'gear') ? 'flex' : 'none';
        this.statusView.style.display = (this.currentView === 'status') ? 'block' : 'none';

        // Update Buttons
        this.gearToggleBtn.textContent = (this.currentView === 'gear') ? '💬' : '⚔️';
        this.statusToggleBtn.textContent = (this.currentView === 'status') ? '💬' : '📊';

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

        const statEntries = {
            hp: `${Math.round(stats.hp)}/${Math.round(stats.maxHp)}`,
            atk: stats.atk.toFixed(1),
            mAtk: stats.mAtk.toFixed(1),
            def: stats.def.toFixed(1),
            mDef: stats.mDef.toFixed(1),
            speed: stats.speed,
            atkSpd: stats.atkSpd,
            atkRange: stats.atkRange,
            rangeMin: stats.rangeMin,
            rangeMax: stats.rangeMax,
            castSpd: stats.castSpd,
            acc: stats.acc,
            eva: stats.eva,
            crit: `${stats.crit}%`
        };

        Object.entries(statEntries).forEach(([key, val]) => {
            const el = this.statusView.querySelector(`[data-stat="${key}"]`);
            if (el) el.textContent = val;
        });
    }
}
