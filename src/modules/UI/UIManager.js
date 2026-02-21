import DBManager from '../Database/DBManager.js';
import ChatChannel from './ChatChannel.js';
import EventBus from '../Events/EventBus.js';
import intentRouter from '../AI/IntentRouter.js';
import localLLM from '../AI/LocalLLM.js';
import embeddingGemma from '../AI/EmbeddingGemma.js';
import { MercenaryClasses, Characters } from '../Core/EntityStats.js';

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
        EventBus.on(EventBus.EVENTS.STATUS_UPDATED, (payload) => {
            const channel = this.channels[payload.agentId];
            if (channel) {
                channel.updateStatuses(payload.statuses);
                if (payload.equipment) {
                    channel.updateEquipment(payload.equipment);
                }
                if (payload.stats) {
                    channel.updateStats(payload.stats);
                }
            }
        });
        EventBus.on(EventBus.EVENTS.DEBUG_SWAP_CHARACTER, (payload) => {
            const { classId, characterId } = payload;
            const newConfig = Object.values(Characters).find(c => c.id === characterId);
            if (newConfig && this.channels[classId]) {
                const spritePath = `assets/characters/party/${newConfig.sprite}.png`;
                this.channels[classId].updateVisuals(newConfig.name, spritePath, characterId);
            }
        });

        EventBus.on(EventBus.EVENTS.UNIT_BARK, (payload) => {
            const { agentId, text, unitName } = payload;
            if (this.channels[agentId]) {
                this.channels[agentId].addLog(`[${unitName}] ${text}`, '#00ffcc');
            }
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

        // Group Characters by classId
        const charactersByClass = {};
        Object.values(Characters).forEach(char => {
            if (!charactersByClass[char.classId]) {
                charactersByClass[char.classId] = [];
            }
            charactersByClass[char.classId].push(char);
        });

        // Dynamically create a chat channel for each configured Mercenary Class
        Object.values(MercenaryClasses).forEach(config => {
            const classId = config.id;
            const channelName = config.name;
            const classChars = charactersByClass[classId] || [];

            // We default to the class sprite, but DungeonScene will update it on spawn 
            // if we want, or ChatChannel gets updated when swapped.
            const spritePath = `assets/characters/party/${config.sprite}.png`;

            this.channels[classId] = new ChatChannel(
                classId,
                classId,
                classChars,
                channelName,
                spritePath,
                this.chatContainer,
                (text) => {
                    this.handlePlayerCommand(classId, text);
                },
                (swapClassId, newCharacterId) => {
                    EventBus.emit(EventBus.EVENTS.DEBUG_SWAP_CHARACTER, {
                        classId: swapClassId,
                        characterId: newCharacterId
                    });
                }
            );
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

            const actionDesc = result.action.name === 'attack_priority'
                ? `${result.action.arguments.role} 우선 공격`
                : `${result.action.name}(${Object.entries(result.action.arguments).map(([key, value]) => `${key}: ${value}`).join(', ')})`;
            this.addLog(agentId, `[AI] 전술 행동: ${actionDesc}`, '#bb88ff');
        } else {
            this.addLog(agentId, `[System] 대화 모드 (기억 분석 중...)`, '#aaaaaa');


            try {
                // Find character config based on the agentId (classId)
                const channel = this.channels[agentId];
                const charName = channel ? channel.name : agentId;
                // Find character config by name or id
                const charConfig = Object.values(Characters).find(c => c.name.includes(charName) || c.id === charName.toLowerCase());

                const memories = await embeddingGemma.searchMemory(text);
                const response = await localLLM.generateResponse(charConfig, text, memories);

                this.addLog(agentId, `[${charName}] ${response}`, '#00ffcc');

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
        const { emoji, collectorId } = payload;
        const name = collectorId || 'someone';

        // Suppressed chat log as per user request, keep console debug
        console.log(`[Item] ${name} (${collectorId}) collected: ${emoji}`);
    }

    handleMonsterKilled(payload) {
        const { monsterId, attackerId } = payload;
        const attackerName = attackerId || 'warrior';
        const monsterName = (monsterId === 'goblin_sprite') ? '고블린' : '적';

        // Suppressed chat log as per user request, keep console debug
        console.log(`[Combat] ${attackerName} killed ${monsterName} (${monsterId})`);
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
