/**
 * ChatChannel
 * Represents a single chat interface for a party member.
 */
export default class ChatChannel {
    constructor(id, name, parentElement, onCommand) {
        this.id = id;
        this.name = name;
        this.onCommand = onCommand;

        this.element = document.createElement('div');
        this.element.className = 'chat-channel';
        this.element.innerHTML = `
            <div class="chat-header">${name}</div>
            <div class="chat-log" id="log-${id}"></div>
            <form class="chat-form" id="form-${id}">
                <input type="text" placeholder="${name}에게 지시... (e.g. 공격!)" />
            </form>
        `;

        parentElement.appendChild(this.element);

        this.log = this.element.querySelector('.chat-log');
        this.form = this.element.querySelector('.chat-form');
        this.input = this.element.querySelector('input');

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
}
