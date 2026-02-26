import DBManager from '../Database/DBManager.js';
import ChatChannel from './ChatChannel.js';
import EventBus from '../Events/EventBus.js';
import intentRouter from '../AI/IntentRouter.js';
import localLLM from '../AI/LocalLLM.js';
import embeddingGemma from '../AI/EmbeddingGemma.js';
import { MercenaryClasses, Characters } from '../Core/EntityStats.js';
import partyManager from '../Core/PartyManager.js';
import ItemManager from '../Core/ItemManager.js';

export default class UIManager {
    constructor() {
        this.materialList = document.getElementById('material-list');
        this.gearList = document.getElementById('gear-list');
        this.chatContainer = document.getElementById('chat-container');
        this.channels = []; // Fixed array of 5 channels
        this.unitToChannel = {}; // unitId -> ChatChannel instance
        this.resizeObserver = null;
        this.inventoryDirty = true; // initially dirty to load first time
        this.isRefreshing = false;

        // Mobile HUD Elements
        this.hudGold = document.getElementById('hud-gold');
        this.hudGem = document.getElementById('hud-gem');
        this.portraitBar = document.getElementById('portrait-bar');
        this.popupOverlay = document.getElementById('popup-overlay');
        this.popupInner = document.getElementById('popup-inner');
        this.popupClose = document.getElementById('popup-close');
        this.btnInventory = document.getElementById('btn-inventory');
        this.btnParty = document.getElementById('btn-party');
        this.btnFullscreen = document.getElementById('btn-fullscreen');

        // Bind the RAF loop
        this.rafLoop = this.rafLoop.bind(this);
    }

    init() {
        console.log('[UIManager] Initialized DOM Overlay');

        this.createTooltip();
        this.setupChatChannels();
        this.setupMobileEvents();
        this.injectTestItems();

        // Listen for combat and loot events
        EventBus.on(EventBus.EVENTS.MONSTER_KILLED, this.handleMonsterKilled, this);
        EventBus.on(EventBus.EVENTS.ITEM_COLLECTED, this.handleItemCollected, this);
        EventBus.on(EventBus.EVENTS.INVENTORY_UPDATED, () => {
            this.inventoryDirty = true;
        });
        EventBus.on(EventBus.EVENTS.STATUS_UPDATED, (payload) => {
            const channel = this.unitToChannel[payload.agentId];
            if (channel) {
                if (payload.statuses) {
                    channel.updateStatuses(payload.statuses);
                }
                if (payload.equipment) {
                    channel.updateEquipment(payload.equipment);
                }
                if (payload.stats) {
                    channel.updateStats(payload.stats);
                    if (payload.stats.level !== undefined) {
                        channel.lastLevel = payload.stats.level;
                        let charConfig = null;
                        if (Characters && typeof Characters === 'object') {
                            charConfig = Object.values(Characters).find(c => c && c.id === channel.characterId);
                        }
                        if (charConfig && charConfig.narrativeUnlocks) {
                            channel.updateNarrative(charConfig.narrativeUnlocks, payload.stats.level);
                        }
                    }
                    if (payload.stats.ultGauge !== undefined) {
                        channel.updateUltGauge(payload.stats.ultGauge);
                    }
                }
            }
        });

        EventBus.on(EventBus.EVENTS.PARTY_DEPLOYED, (payload) => {
            if (payload.scene) {
                this.scene = payload.scene; // Store scene reference
            }

            const sceneKey = this.scene?.scene?.key || this.scene?.sys?.settings?.key;
            console.log(`[UIManager] Party deployed in scene: ${sceneKey}`);

            // Hide portrait bar in TerritoryScene to reduce clutter
            if (this.portraitBar) {
                if (sceneKey === 'TerritoryScene') {
                    this.portraitBar.style.display = 'none';
                } else {
                    this.portraitBar.style.display = 'flex';
                }
            }

            // payload: { mercenaries: [{ id, name, sprite, classId, ... }] }
            this.unitToChannel = {}; // Reset mapping

            const visibleMercs = payload.mercenaries.filter(m => !m.hideInUI);

            visibleMercs.forEach((merc, i) => {
                if (i < this.channels.length) {
                    const channel = this.channels[i];
                    // Link unit to channel EARLY so we can update it
                    this.unitToChannel[merc.id] = channel;

                    const charConfig = Object.values(Characters).find(c => c.id === merc.characterId) || merc;

                    // Store classId on the channel for dropdown population and swaps
                    channel.classId = merc.classId || charConfig.classId;

                    channel.bindUnit(
                        merc.id,
                        merc.unitName || merc.name,
                        `assets/characters/party/${charConfig.sprite}.png`,
                        {
                            name: charConfig.skillName,
                            emoji: charConfig.skillEmoji,
                            description: charConfig.skillDescription,
                            ultimateName: charConfig.ultimateName,
                            ultimateDescription: charConfig.ultimateDescription
                        },
                        charConfig.narrativeUnlocks,
                        merc.characterId
                    );

                    this.unitToChannel[merc.id] = channel;
                }
            });
        });
        EventBus.on(EventBus.EVENTS.DEBUG_SWAP_CHARACTER, (payload) => {
            const { classId, characterId, unitId } = payload;
            const charConfig = Characters[characterId.toUpperCase()];
            if (!charConfig) return;

            const channel = unitId ? this.unitToChannel[unitId] : this.channels.find(c => c.classId === classId);
            if (!channel) return;

            channel.updateVisuals(
                charConfig.name,
                `assets/characters/party/${charConfig.sprite}.png`,
                characterId
            );

            channel.updateSkill({
                name: charConfig.skillName,
                emoji: charConfig.skillEmoji,
                description: charConfig.skillDescription,
                ultimateName: charConfig.ultimateName,
                ultimateDescription: charConfig.ultimateDescription
            });

            if (charConfig.narrativeUnlocks) {
                channel.updateNarrative(charConfig.narrativeUnlocks, 1);
            }
        });

        EventBus.on(EventBus.EVENTS.UNIT_BARK, (payload) => {
            const { agentId, text, unitName } = payload;
            const channel = this.unitToChannel[agentId];
            if (channel) {
                channel.addLog(`[${unitName}] ${text}`, '#00ffcc');
            }
        });

        // Start render loop
        requestAnimationFrame(this.rafLoop);

        // Listen for Drag & Drop UI Assignment
        EventBus.on('UI_SLOT_ASSIGNED', (payload) => {
            this.handleSlotAssigned(payload.slotId, payload.characterId);
        });

        // Sync HUD stats periodically
        setInterval(() => this.updateMobileHUD(), 1000);
    }

    setupMobileEvents() {
        if (this.btnInventory) {
            this.btnInventory.onclick = () => this.showPopup('inventory');
        }
        if (this.btnParty) {
            this.btnParty.onclick = () => this.showPopup('party');
        }
        if (this.popupClose) {
            this.popupClose.onclick = () => this.hidePopup();
        }
        if (this.popupOverlay) {
            this.popupOverlay.onclick = (e) => {
                if (e.target === this.popupOverlay) this.hidePopup();
            };
        }
        if (this.btnFullscreen) {
            this.btnFullscreen.onclick = () => this.toggleFullscreen();
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.warn(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    showPopup(type) {
        if (!this.popupOverlay || !this.popupInner) return;
        this.popupInner.innerHTML = '';

        if (type === 'inventory') {
            // Move original inventory sections into popup
            const invContent = document.getElementById('sidebar-right');
            if (invContent) {
                // Clone or move
                this.popupInner.appendChild(invContent);
                invContent.style.display = 'flex';
                invContent.style.height = '100%';
                invContent.style.background = 'transparent';
                invContent.style.border = 'none';
                invContent.style.boxShadow = 'none';
            }
        } else if (type === 'party') {
            const chatContent = document.getElementById('chat-container');
            if (chatContent) {
                this.popupInner.appendChild(chatContent);
                chatContent.style.display = 'flex';
                chatContent.style.height = '100%';
                chatContent.style.background = 'transparent';
            }
        } else if (type === 'character') {
            // Detailed character view...
        }

        this.popupOverlay.style.display = 'flex';
    }

    hidePopup() {
        if (this.popupOverlay) this.popupOverlay.style.display = 'none';
    }

    updateMobileHUD() {
        // Update Gold/Gem from DBManager or similar
        // For now dummy update
        if (this.hudGold) {
            DBManager.getInventoryItem('emoji_coin').then(item => {
                this.hudGold.textContent = item ? item.amount : 0;
            });
        }
        if (this.hudGem) {
            DBManager.getInventoryItem('emoji_gem').then(item => {
                this.hudGem.textContent = item ? item.amount : 0;
            });
        }

        this.updatePortraitBar();
    }

    updatePortraitBar() {
        if (!this.portraitBar) return;

        // Ensure we have correct number of portraits
        let activeMercs = [];
        try {
            if (this.scene && this.scene.mercenaries && typeof this.scene.mercenaries.getChildren === 'function') {
                activeMercs = this.scene.mercenaries.getChildren().filter(m => m && !m.hideInUI);
            }
        } catch (e) {
            console.warn('[UIManager] Error getting active mercenaries:', e);
        }

        // Clear and rebuild for simplicity or keep track
        // Rebuilding is safer for dynamic scaling
        this.portraitBar.innerHTML = '';
        activeMercs.forEach(merc => {
            if (!merc) return;

            let charConfig = merc;
            try {
                if (Characters && typeof Characters === 'object') {
                    charConfig = Object.values(Characters).find(c => c && c.id === merc.characterId) || merc;
                }
            } catch (e) {
                console.warn('[UIManager] Error finding character config:', e);
            }

            const portrait = document.createElement('div');
            portrait.className = 'unit-portrait';
            if (merc.hp !== undefined && merc.hp <= 0) portrait.style.filter = 'grayscale(100%) opacity(0.5)';

            const hpPercent = (merc.hp / merc.maxHp) * 100;

            portrait.innerHTML = `
                <img src="assets/characters/party/${charConfig.sprite}.png" alt="${merc.unitName}">
                <div class="portrait-hp-ring" style="border-top-color: ${this.getHPColor(hpPercent)}; border-width: 3px; clip-path: inset(0 0 ${100 - hpPercent}% 0);"></div>
            `;

            portrait.onclick = () => {
                // Show character detail or select
                const channel = this.unitToChannel[merc.id];
                if (channel) {
                    this.showCharacterDetail(channel);
                }
            };

            this.portraitBar.appendChild(portrait);
        });
    }

    getHPColor(percent) {
        if (percent > 60) return '#00ffcc';
        if (percent > 30) return '#ffcc00';
        return '#ff5555';
    }

    showCharacterDetail(channel) {
        if (!this.popupOverlay || !this.popupInner) return;
        this.popupInner.innerHTML = '';
        this.popupInner.appendChild(channel.element);
        channel.element.style.display = 'flex';
        channel.element.style.height = '100%';
        channel.element.classList.add('has-unit');

        // Auto-switch to dashboard for easier mobile access
        if (channel.currentView === 'chat') {
            channel.toggleView('dashboard');
        }

        this.popupOverlay.style.display = 'flex';
    }

    handleSlotAssigned(slotId, characterId) {
        const charConfig = Characters[characterId.toUpperCase()];
        if (!charConfig) return;

        const slotIndex = parseInt(slotId.replace('slot', ''));
        const channel = this.channels[slotIndex];

        // Save to PartyManager
        import('../Core/PartyManager.js').then(module => {
            const partyManager = module.default;
            partyManager.setPartySlot(slotIndex, characterId);

            // Bind the UI slot immediately for feedback
            channel.classId = charConfig.classId;
            channel.bindUnit(
                `preview-${characterId}`, // Temporary ID for preview
                charConfig.name,
                `assets/characters/party/${charConfig.sprite}.png`,
                {
                    name: charConfig.skillName,
                    emoji: charConfig.skillEmoji,
                    description: charConfig.skillDescription,
                    ultimateName: charConfig.ultimateName,
                    ultimateDescription: charConfig.ultimateDescription
                },
                charConfig.narrativeUnlocks,
                characterId
            );
            channel.element.classList.add('has-unit');
            channel.element.classList.remove('empty');
        });
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

        // Create 5 fixed chat channels
        for (let i = 0; i < 5; i++) {
            const id = `slot${i}`;
            const channel = new ChatChannel(
                id,
                null, // classId
                [],   // characters
                `용병 ${i + 1}`,
                '',   // No sprite initially
                this.chatContainer,
                (text) => {
                    this.handlePlayerCommand(channel.linkedUnitId || id, text);
                },
                (swapClassId, newCharacterId) => {
                    EventBus.emit(EventBus.EVENTS.DEBUG_SWAP_CHARACTER, {
                        classId: channel.classId,
                        unitId: channel.linkedUnitId,
                        characterId: newCharacterId
                    });
                }
            );
            channel.clear(); // Ensure it starts empty
            this.channels.push(channel);
        }

        this.addLog('slot0', 'Messiah Grimoire에 오신 것을 환영합니다!', '#00ffcc');
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
                agentId: agentId,
                command: result.action.name,
                args: result.action.arguments
            });

            const args = result.action.arguments || {};
            const actionDesc = result.action.name === 'attack_priority'
                ? `${args.role || 'target'} 우선 공격`
                : `${result.action.name}(${Object.entries(args).map(([key, value]) => `${key}: ${value}`).join(', ')})`;
            this.addLog(agentId, `[AI] 전술 행동: ${actionDesc}`, '#bb88ff');
        } else {
            this.addLog(agentId, `[System] 대화 모드 (맥락 분석 중...)`, '#aaaaaa');

            try {
                // Find character config based on the agentId
                const channel = this.unitToChannel[agentId] || this.channels.find(c => c.id === agentId);
                const charName = channel ? (channel.name || agentId) : agentId;
                const charId = channel ? channel.characterId : agentId;

                // Find character config by name or id
                let charConfig = null;
                if (Characters && typeof Characters === 'object') {
                    charConfig = Object.values(Characters).find(c =>
                        c && ((charId && c.id === charId.toLowerCase()) ||
                            c.name.includes(charName) ||
                            c.id === charName.toLowerCase())
                    );
                }

                if (!channel.chatHistory) channel.chatHistory = [];

                const memories = await embeddingGemma.searchMemory(text);

                // Construct a dynamic config if the unit exists in the scene
                const unit = this.scene && this.scene.mercenaries ? this.scene.mercenaries.getChildren().find(m => m.id === agentId) : null;
                const dynamicConfig = unit ? {
                    ...unit.config,
                    personality: unit.personality || unit.config.personality
                } : charConfig;

                const activePartyIds = partyManager.getActiveParty().filter(id => id !== null);
                const response = await localLLM.generateResponse(dynamicConfig, text, memories, channel.chatHistory, channel.lastLevel || 1, activePartyIds);

                this.addLog(agentId, `[${charName}] ${response}`, '#00ffcc');

                // Update history (max 3 pairs)
                channel.chatHistory.push({ role: 'user', text: text });
                channel.chatHistory.push({ role: 'assistant', text: response });
                if (channel.chatHistory.length > 6) channel.chatHistory.splice(0, 2);

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

    createTooltip() {
        if (document.getElementById('inv-tooltip')) return;
        this.tooltipEl = document.createElement('div');
        this.tooltipEl.id = 'inv-tooltip';
        this.tooltipEl.className = 'inv-tooltip';
        document.body.appendChild(this.tooltipEl);

        document.addEventListener('mousemove', (e) => {
            if (this.tooltipEl.style.display === 'flex') {
                this.tooltipEl.style.left = e.clientX + 'px';
                this.tooltipEl.style.top = e.clientY + 'px';
            }
        });
    }

    showTooltip(itemId) {
        const item = ItemManager.getItem(itemId);
        if (!item || !this.tooltipEl) return;

        let statsHtml = '';
        if (item && item.stats && typeof item.stats === 'object') {
            Object.entries(item.stats).forEach(([key, val]) => {
                const label = key.toUpperCase();
                statsHtml += `<div class="stat-line"><span class="stat-label">${label}</span><span class="stat-value">+${val}</span></div>`;
            });
        }

        this.tooltipEl.innerHTML = `
            <div class="item-name">${item.name}</div>
            <div class="item-type">${item.slot || 'ITEM'}</div>
            <div class="item-stats">
                ${statsHtml}
            </div>
            <div class="item-description">${item.description || ''}</div>
        `;
        this.tooltipEl.style.display = 'flex';
    }

    hideTooltip() {
        if (this.tooltipEl) {
            this.tooltipEl.style.display = 'none';
        }
    }

    addLog(agentId, text, color) {
        const channel = this.unitToChannel[agentId] || (this.channels.find(c => c.id === agentId));
        if (channel) {
            channel.addLog(text, color);
        }
    }

    async injectTestItems() {
        try {
            const testItems = [
                'test_sword_fire', 'test_sword_ice', 'test_sword_lightning',
                'test_staff_fire', 'test_staff_ice', 'test_staff_lightning'
            ];

            for (const id of testItems) {
                const item = await DBManager.getInventoryItem(id);
                if (!item) {
                    await DBManager.saveInventoryItem(id, 1);
                }
            }

            this.inventoryDirty = true;
        } catch (e) {
            console.error('[UIManager] Error injecting test items:', e);
        }
    }

    async refreshInventory() {
        this.isRefreshing = true;
        try {
            const items = await DBManager.getAllInventory();

            if (!this.materialList) this.materialList = document.getElementById('material-list');
            if (!this.gearList) this.gearList = document.getElementById('gear-list');
            if (!this.materialList || !this.gearList) return;

            this.materialList.innerHTML = '';
            this.gearList.innerHTML = '';

            items.sort((a, b) => b.amount - a.amount);

            items.forEach(item => {
                const itemData = ItemManager.getItem(item.id);
                if (!itemData) return;

                const filename = ItemManager.getSVGFilename(item.id);
                const div = document.createElement('div');
                div.className = 'inv-item';
                div.draggable = true;
                const elementalBadge = (itemData.prefix && itemData.prefix.emoji)
                    ? `<div class="item-element-badge">${itemData.prefix.emoji}</div>`
                    : '';

                div.innerHTML = `
                    <img class="inv-icon" src="assets/emojis/${filename}" alt="${item.id}" draggable="false">
                    <span class="inv-amount">${item.amount}</span>
                    ${elementalBadge}
                `;

                div.ondragstart = (e) => {
                    e.dataTransfer.setData('itemId', item.id);
                    e.dataTransfer.effectAllowed = 'copyMove';
                };

                div.onmouseenter = () => this.showTooltip(item.id);
                div.onmouseleave = () => this.hideTooltip();

                if (itemData.type === 'equipment') {
                    div.classList.add('is-gear');
                    div.onclick = () => this.handleItemClick(item.id);
                    this.gearList.appendChild(div);
                } else {
                    this.materialList.appendChild(div);
                }
            });
        } catch (e) {
            console.error('[UIManager] Error refreshing inventory UI:', e);
        } finally {
            this.isRefreshing = false;
        }
    }

    handleItemClick(itemId) {
        // Equip to the currently "active" or first applicable mercenary
        // For now, let's find a channel that is focused or just the first one
        const activeChannel = this.channels.find(c => c.active);
        if (activeChannel && activeChannel.boundUnitId) {
            EventBus.emit(EventBus.EVENTS.EQUIP_REQUEST, {
                unitId: activeChannel.boundUnitId,
                itemId: itemId
            });
        } else {
            console.log('[UIManager] No active/focused character to equip to.');
            // Fallback: try to find any bound channel
            const firstBound = this.channels.find(c => c.boundUnitId);
            if (firstBound) {
                EventBus.emit(EventBus.EVENTS.EQUIP_REQUEST, {
                    unitId: firstBound.boundUnitId,
                    itemId: itemId
                });
            }
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
