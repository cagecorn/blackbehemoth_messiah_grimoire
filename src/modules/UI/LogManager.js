import EventBus from '../Events/EventBus.js';
import functionRouter from '../AI/FunctionRouter.js';
import embeddingGemma from '../AI/EmbeddingGemma.js';
import localLLM from '../AI/LocalLLM.js';

class LogManager {
    constructor() {
        this.logContainer = document.getElementById('log-container');
        this.chatForm = document.getElementById('chat-form');
        this.chatInput = document.getElementById('chat-input');
    }

    init() {
        console.log('[LogManager] Initialized');

        EventBus.on(EventBus.EVENTS.ITEM_COLLECTED, this.handleItemCollected, this);
        EventBus.on(EventBus.EVENTS.MONSTER_KILLED, this.handleMonsterKilled, this);
        EventBus.on(EventBus.EVENTS.SYSTEM_MESSAGE, this.handleSystemMessage, this);
        EventBus.on('UNIT_DIED', this.handleUnitDied, this);

        if (this.chatForm) {
            this.chatForm.addEventListener('submit', this.handleChatSubmit.bind(this));
        }

        this.addLog('Welcome to Messiah Grimoire!', '#00ffcc');

        // Initialize the new FunctionGemma worker
        functionRouter.init();
    }

    addLog(text, color = '#e0e0e0') {
        if (!this.logContainer) return;

        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.style.color = color;
        entry.textContent = `> ${text}`;

        this.logContainer.appendChild(entry);

        // Limit log entries to prevent DOM bloating
        if (this.logContainer.children.length > 50) {
            this.logContainer.removeChild(this.logContainer.firstElementChild);
        }

        // Auto-scroll to latest
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }

    handleItemCollected(itemEmoji) {
        this.addLog(`Obtained ${itemEmoji}`, '#ffffbb');
    }

    handleSystemMessage(msg) {
        this.addLog(`[SYSTEM] ${msg}`, '#bb88ff');
    }

    handleMonsterKilled(payload) {
        const monsterId = payload.monsterId || payload;
        const monsterEmoji = (monsterId === 'goblin_sprite' || monsterId === 'monster') ? '👺' : '👾';
        this.addLog(`Defeated a monster! ${monsterEmoji}`, '#ffbbbb');
    }

    handleUnitDied(unitName) {
        this.addLog(`${unitName} has fallen in battle! 💀`, '#ff0000');
    }

    async handleChatSubmit(e) {
        e.preventDefault();
        const text = this.chatInput.value.trim();
        if (text) {
            this.addLog(`User: ${text}`, '#ffffff');
            this.chatInput.value = '';

            if (!functionRouter.isReady) {
                this.addLog(`[System] AI Commander is still booting up...`, '#aaaaaa');
                return;
            }

            this.addLog(`[System] Analyzing command...`, '#aaaaaa');
            try {
                // Returns parsed JSON function arguments or null
                const result = await functionRouter.execute(text);

                if (result) {
                    this.addLog(`[AI] Command Processed: ${JSON.stringify(result)}`, '#bb88ff');
                    // FunctionRouter handles emitting the actual EventBus messages
                } else {
                    // FALLBACK TO CHAT (RAG + LOCAL LLM)
                    this.addLog(`[System] Conversational intent detected. Consulting memory...`, '#aaaaaa');

                    const memories = await embeddingGemma.searchMemory(text);
                    const response = await localLLM.generateResponse(text, memories);

                    this.addLog(`[Mercenary] ${response}`, '#00ffcc');
                    EventBus.emit(EventBus.EVENTS.AI_RESPONSE, { agentId: 'warrior', text: response });
                }

            } catch (err) {
                this.addLog(`[AI Error] ${err.message}`, '#ff5555');
            }
        }
    }

    destroy() {
        EventBus.off(EventBus.EVENTS.ITEM_COLLECTED, this.handleItemCollected, this);
        EventBus.off(EventBus.EVENTS.MONSTER_KILLED, this.handleMonsterKilled, this);
        EventBus.off(EventBus.EVENTS.SYSTEM_MESSAGE, this.handleSystemMessage, this);
    }
}

const logManager = new LogManager();
export default logManager;
