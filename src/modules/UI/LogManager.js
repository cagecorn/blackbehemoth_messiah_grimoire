import EventBus from '../Events/EventBus.js';
import intentRouter from '../AI/IntentRouter.js';
import embeddingGemma from '../AI/EmbeddingGemma.js';
import localLLM from '../AI/LocalLLM.js';
import { Characters } from '../Core/EntityStats.js';

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
        EventBus.on(EventBus.EVENTS.UNIT_BARK, (payload) => {
            this.addLog(`[${payload.unitName}] ${payload.text}`, '#00ffcc');
        });

        if (this.chatForm) {
            this.chatForm.addEventListener('submit', this.handleChatSubmit.bind(this));
        }

        this.addLog('Welcome to Messiah Grimoire!', '#00ffcc');

        // Initialize the new FunctionGemma worker
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
        const { monsterId, attackerId } = payload;
        const targetChannel = attackerId || 'warrior';
        const monsterEmoji = (monsterId === 'goblin_sprite' || monsterId === 'monster') ? '👺' : '👾';

        let attackerName = 'Warrior';
        if (targetChannel === 'archer') attackerName = 'Archer';
        if (targetChannel === 'healer') attackerName = 'Healer';
        if (targetChannel === 'wizard') attackerName = 'Wizard';
        if (targetChannel === 'bard') attackerName = 'Bard';

        this.addLog(`${attackerName} defeated a monster! ${monsterEmoji}`, '#ffbbbb');
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

            if (!intentRouter.isReady) {
                this.addLog(`[System] AI Commander is still booting up...`, '#aaaaaa');
                return;
            }

            try {
                const result = await intentRouter.route(text);

                if (result.type === 'COMMAND') {
                    this.addLog(`[System] Tactical command recognized: ${result.intent}`, '#aaaaaa');

                    // Emit the command event directly
                    EventBus.emit(EventBus.EVENTS.AI_COMMAND, {
                        command: result.action.name,
                        args: result.action.arguments
                    });

                    this.addLog(`[AI] Executing: ${JSON.stringify(result.action)}`, '#bb88ff');
                } else {
                    // FALLBACK TO CHAT (RAG + LOCAL LLM)
                    this.addLog(`[System] Conversational intent detected. Consulting memory...`, '#aaaaaa');

                    const memories = await embeddingGemma.searchMemory(text);
                    // Defaulting to AREN (Warrior) personality for the main chat fallback
                    const charConfig = Characters.AREN;
                    const response = await localLLM.generateResponse(charConfig, text, memories);

                    this.addLog(`[${charConfig.name}] ${response}`, '#00ffcc');
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
