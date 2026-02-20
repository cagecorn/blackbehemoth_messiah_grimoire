import DBManager from '../Database/DBManager.js';
import ChatChannel from './ChatChannel.js';
import EventBus from '../Events/EventBus.js';
import semanticRouter from '../AI/SemanticRouter.js';
import localLLM from '../AI/LocalLLM.js';
import embeddingGemma from '../AI/EmbeddingGemma.js';

export default class UIManager {
    constructor() {
        this.inventoryContainer = document.getElementById('inventory-list');
        this.chatContainer = document.getElementById('chat-container');
        this.channels = {};
        this.updateInterval = null;
        this.resizeObserver = null;
    }

    // Call this from main.js or a global bootloader
    init() {
        console.log('[UIManager] Initialized DOM Overlay');
        this.refreshInventory();

        this.setupChatChannels();

        // Simple polling for now
        this.updateInterval = setInterval(() => this.refreshInventory(), 2000);

        // Listen for combat and loot events
        EventBus.on(EventBus.EVENTS.MONSTER_KILLED, this.handleMonsterKilled, this);
        EventBus.on(EventBus.EVENTS.ITEM_COLLECTED, this.handleItemCollected, this);
    }

    setupChatChannels() {
        if (!this.chatContainer) return;

        // Channel for the Warrior
        this.channels['warrior'] = new ChatChannel('warrior', 'Warrior (전사)', this.chatContainer, (text) => {
            this.handlePlayerCommand('warrior', text);
        });

        // Channel for the Archer
        this.channels['archer'] = new ChatChannel('archer', 'Archer (아처)', this.chatContainer, (text) => {
            this.handlePlayerCommand('archer', text);
        });

        // Channel for the Healer
        this.channels['healer'] = new ChatChannel('healer', 'Healer (힐러)', this.chatContainer, (text) => {
            this.handlePlayerCommand('healer', text);
        });

        this.addLog('warrior', 'Messiah Grimoire에 오신 것을 환영합니다!', '#00ffcc');
    }

    async handlePlayerCommand(agentId, text) {
        if (!semanticRouter.isReady) {
            this.addLog(agentId, `[System] 시맨틱 분석 준비 중...`, '#aaaaaa');
            return;
        }

        const result = await semanticRouter.route(text);

        if (result.intent !== 'NONE' && result.intent !== 'CHAT') {
            this.addLog(agentId, `[AI] 명령 해석: ${result.intent} (${(result.score * 100).toFixed(1)}%)`, '#bb88ff');

            let eventType;
            if (agentId === 'warrior') eventType = EventBus.EVENTS.AI_COMMAND;
            else if (agentId === 'archer') eventType = EventBus.EVENTS.AI_COMMAND_ARCHER;
            else if (agentId === 'healer') eventType = EventBus.EVENTS.AI_COMMAND_HEALER;

            EventBus.emit(eventType, {
                function: 'change_mercenary_stance',
                args: { stance: result.intent }
            });
        } else {
            this.addLog(agentId, `[System] 대화 모드 (기억 분석 중...)`, '#aaaaaa');

            try {
                const memories = await embeddingGemma.searchMemory(text);
                const response = await localLLM.generateResponse(text, memories);

                this.addLog(agentId, `[${agentId.toUpperCase()}] ${response}`, '#00ffcc');

                // Let the specific mercenary "say" it in a speech bubble if needed
                EventBus.emit(EventBus.EVENTS.AI_RESPONSE, {
                    agentId: agentId,
                    text: response
                });
            } catch (err) {
                this.addLog(agentId, `[AI Error] ${err.message}`, '#ff5555');
            }
        }
    }

    handleItemCollected(payload) {
        // Items can be collected by the Warrior or Archer
        const { emoji, collectorId } = payload;
        const channel = collectorId || 'warrior';
        let name = '전사';
        if (channel === 'archer') name = '아처';
        if (channel === 'healer') name = '힐러';
        this.addLog(channel, `[${name}] 아이템을 획득했습니다: ${emoji} ✨`, '#ffffbb');
    }

    handleMonsterKilled(payload) {
        const { monsterId, attackerId } = payload;
        const targetChannel = attackerId || 'warrior';
        const monsterName = (monsterId === 'goblin_sprite') ? '고블린' : '적';

        let attackerName = '전사';
        if (targetChannel === 'archer') attackerName = '아처';
        if (targetChannel === 'healer') attackerName = '힐러';

        this.addLog(targetChannel, `[전투] ${attackerName}가 ${monsterName}을(를) 처치했습니다! 👺💥`, '#ffbbbb');
    }

    addLog(agentId, text, color) {
        if (this.channels[agentId]) {
            this.channels[agentId].addLog(text, color);
        }
    }

    async refreshInventory() {
        try {
            const items = await DBManager.getAllInventory();
            if (!items || items.length === 0) return;

            // Clear current list
            this.inventoryContainer.innerHTML = '';

            // Sort by amount descending
            items.sort((a, b) => b.amount - a.amount);

            items.forEach(item => {
                // Determine SVG mapping (our keys are 'emoji_coin', DB stores that)
                // We need to map 'emoji_coin' back to '1fa99.svg'
                // For a robust system, the ID should ideally just be the filename or we keep a dictionary
                const filename = this.getSVGFilename(item.id);

                const div = document.createElement('div');
                div.className = 'inv-item';
                div.innerHTML = `
                    <img class="inv-icon" src="assets/emojis/${filename}" alt="${item.id}" draggable="false">
                    <span class="inv-amount">${item.amount}</span>
                `;
                this.inventoryContainer.appendChild(div);
            });
        } catch (e) {
            console.error('[UIManager] Error refreshing inventory UI:', e);
        }
    }

    // Temporary mapping helper from Phaser Cache Key to actual SVG filename
    getSVGFilename(key) {
        const map = {
            'emoji_coin': '1fa99.svg',
            'emoji_gem': '1f48e.svg',
            'emoji_meat': '1f356.svg',
            'emoji_wood': '1fab5.svg',
            'emoji_herb': '1f33f.svg'
        };
        return map[key] || 'unknown.svg';
    }

    destroy() {
        if (this.updateInterval) clearInterval(this.updateInterval);
    }
}
