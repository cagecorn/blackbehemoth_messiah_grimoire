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
                <div class="status-container" id="status-${id}"></div>
            </div>
            <div class="chat-log" id="log-${id}"></div>
            <form class="chat-form" id="form-${id}">
                <input type="text" placeholder="${name}에게 지시... (e.g. 공격!)" />
            </form>
        `;

        parentElement.appendChild(this.element);

        this.log = this.element.querySelector('.chat-log');
        this.form = this.element.querySelector('.chat-form');
        this.input = this.element.querySelector('input');
        this.statusContainer = this.element.querySelector('.status-container');
        this.characterSelect = this.element.querySelector('.chat-name-select');

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

    updateVisuals(name, spritePath) {
        this.name = name;
        this.input.placeholder = `${name}에게 지시... (e.g. 공격!)`;
        const img = this.element.querySelector('.chat-bg-sprite');
        if (img) img.src = spritePath;
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
        if (!this.statusContainer) return;

        this.statusContainer.innerHTML = ''; // Clear current statuses

        statuses.forEach(status => {
            const span = document.createElement('span');
            span.className = 'status-icon tooltip';
            span.textContent = status.emoji;

            const tooltipText = document.createElement('span');
            tooltipText.className = 'tooltiptext';
            tooltipText.innerHTML = `<strong style="color:#bb88ff">${status.name}</strong><br/>${status.description}`;
            span.appendChild(tooltipText);

            span.style.cursor = 'help';
            span.style.fontSize = '14px';
            span.style.marginLeft = '4px';
            this.statusContainer.appendChild(span);
        });
    }
}
