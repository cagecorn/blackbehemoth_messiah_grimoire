import DBManager from '../Database/DBManager.js';
import ChatChannel from './ChatChannel.js';
import EventBus from '../Events/EventBus.js';
import intentRouter from '../AI/IntentRouter.js';
import localLLM from '../AI/LocalLLM.js';
import embeddingGemma from '../AI/EmbeddingGemma.js';
import { MercenaryClasses } from '../Core/EntityStats.js';

export default class UIManager {
    constructor() {
        this.inventoryContainer = document.getElementById('inventory-list');
        this.chatContainer = document.getElementById('chat-container');
        this.channels = {};
        this.resizeObserver = null;
        this.inventoryDirty = true; // initially dirty to load first time
        this.isRefreshing = false;

        // Bind the RAF loop
        this.rafLoop = this.rafLoop.bind(this);
    }

    init() {
        console.log('[UIManager] Initialized DOM Overlay');

        this.setupChatChannels();

        // Listen for combat and loot events
        EventBus.on(EventBus.EVENTS.MONSTER_KILLED, this.handleMonsterKilled, this);
        EventBus.on(EventBus.EVENTS.ITEM_COLLECTED, this.handleItemCollected, this);
        EventBus.on(EventBus.EVENTS.INVENTORY_UPDATED, () => {
            this.inventoryDirty = true;
        });

        // Start render loop
        requestAnimationFrame(this.rafLoop);
    }

    rafLoop() {
        if (this.inventoryDirty && !this.isRefreshing) {
            this.inventoryDirty = false;
            this.refreshInventory();
        }

        // Only loop if not destroyed
        if (!this.destroyed) {
            requestAnimationFrame(this.rafLoop);
        }
    }

    setupChatChannels() {
        if (!this.chatContainer) return;

        // Dynamically create a chat channel for each configured Mercenary Class
        Object.values(MercenaryClasses).forEach(config => {
            const channelId = config.id;
            const channelName = config.name;
            const spritePath = `assets/characters/party/${config.sprite}.png`;

            this.channels[channelId] = new ChatChannel(channelId, channelName, spritePath, this.chatContainer, (text) => {
                this.handlePlayerCommand(channelId, text);
            });
        });

        this.addLog('warrior', 'Messiah Grimoire에 오신 것을 환영합니다!', '#00ffcc');
    }

    async handlePlayerCommand(agentId, text) {
        if (!intentRouter.isReady) {
            this.addLog(agentId, `[System] 지휘 시스템 준비 중...`, '#aaaaaa');
            return;
        }

        const result = await intentRouter.route(text);

        if (result.type === 'COMMAND') {
            this.addLog(agentId, `[System] 전술 지시 인식됨: ${result.intent}`, '#aaaaaa');

            // Emit the command event
            EventBus.emit(EventBus.EVENTS.AI_COMMAND, {
                command: result.action.name,
                args: result.action.arguments
            });

            this.addLog(agentId, `[AI] 전술 행동: ${JSON.stringify(result.action)}`, '#bb88ff');
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
        if (channel === 'wizard') name = '마법사';
        if (channel === 'bard') name = '바드';
        this.addLog(channel, `[${name}] 아이템을 획득했습니다: ${emoji} ✨`, '#ffffbb');
    }

    handleMonsterKilled(payload) {
        const { monsterId, attackerId } = payload;
        const targetChannel = attackerId || 'warrior';
        const monsterName = (monsterId === 'goblin_sprite') ? '고블린' : '적';

        let attackerName = '전사';
        if (targetChannel === 'archer') attackerName = '아처';
        if (targetChannel === 'healer') attackerName = '힐러';
        if (targetChannel === 'wizard') attackerName = '마법사';
        if (targetChannel === 'bard') attackerName = '바드';

        this.addLog(targetChannel, `[전투] ${attackerName}가 ${monsterName}을(를) 처치했습니다! 👺💥`, '#ffbbbb');
    }

    addLog(agentId, text, color) {
        if (this.channels[agentId]) {
            this.channels[agentId].addLog(text, color);
        }
    }

    async refreshInventory() {
        this.isRefreshing = true;
        try {
            const items = await DBManager.getAllInventory();
            if (!items || items.length === 0) return;

            // Ensure container exists
            if (!this.inventoryContainer) {
                this.inventoryContainer = document.getElementById('inventory-list');
                if (!this.inventoryContainer) return;
            }

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
        } finally {
            this.isRefreshing = false;
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
        this.destroyed = true;
    }
}
