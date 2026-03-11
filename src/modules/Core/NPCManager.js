import DBManager from '../Database/DBManager.js';
import EventBus from '../Events/EventBus.js';
import localizationManager from './LocalizationManager.js';

/**
 * NPCManager.js
 * Manages hired non-combat NPCs and their abilities.
 */
class NPCManager {
    static NPC_DATA = {
        'MISSIONARY': {
            id: 'MISSIONARY',
            name: '선교사',
            sprite: 'missionary_npc',
            icon: 'assets/npc/missionary_npc.png',
            cost: 10000,
            maxStacks: 50,
            description: '던전/레이드에서 용병 사망 시, 자동으로 풀 체력으로 부활 (50회)'
        },
        'NUN': {
            id: 'NUN',
            name: '수녀',
            sprite: 'nun_npc',
            icon: 'assets/npc/nun_npc.png',
            cost: 50000,
            maxStacks: 50,
            description: '던전/레이드에서 패배 시, 1라운드가 아닌 현재 라운드에서 재시작 (50회)'
        },
        'HIRED_WARRIOR': {
            id: 'HIRED_WARRIOR',
            name: '고용 전사',
            sprite: 'hired_warrior_sprite',
            icon: 'assets/npc/hired_warrior_sprite.png',
            cost: 50000,
            maxStacks: 10,
            description: '전투에 직접 참여하는 강력한 전사. 사망 시 스택을 소모해 즉시 부활합니다. (10회)',
            isCombatant: true,
            classId: 'warrior'
        },
        'HIRED_ARCHER': {
            id: 'HIRED_ARCHER',
            name: '고용 아쳐',
            sprite: 'hired_archer_sprite',
            icon: 'assets/npc/hired_archer_sprite.png',
            cost: 50000,
            maxStacks: 10,
            description: '전투에 직접 참여하는 강력한 아쳐. 사망 시 스택을 소모해 즉시 부활합니다. (10회)',
            isCombatant: true,
            classId: 'archer'
        }
    };

    constructor() {
        this.roster = {}; // { npcId: { id, stacks } }
        this.activeNPCId = null;
        // NPC_DATA is now static
    }

    static getLocalizedName(npcId) {
        if (!npcId) return '';
        const key = `npc_name_${npcId.toLowerCase()}`;
        // Fallback to internal data if key missing
        const internal = NPCManager.NPC_DATA[npcId.toUpperCase()];
        return localizationManager.t(key, null, internal ? internal.name : npcId);
    }

    static getLocalizedDescription(npcId) {
        if (!npcId) return '';
        const key = `npc_desc_${npcId.toLowerCase()}`;
        const internal = NPCManager.NPC_DATA[npcId.toUpperCase()];
        return localizationManager.t(key, null, internal ? internal.description : '');
    }

    async init() {
        const savedState = await DBManager.getNPCState();
        if (savedState) {
            // Handle legacy format (single object) or new format (roster object)
            if (savedState.id && savedState.stacks !== undefined) {
                // Legacy
                this.roster = { [savedState.id]: savedState };
                this.activeNPCId = savedState.id;
                console.log('[NPCManager] init - Migrated legacy NPC state:', savedState);
                await this.saveState(); // Save back in new format
            } else {
                // New format: { roster, activeNPCId }
                this.roster = savedState.roster || {};
                this.activeNPCId = savedState.activeNPCId || null;
                console.log('[NPCManager] init - Loaded NPC roster:', JSON.stringify(this.roster), 'Active:', this.activeNPCId);
            }
        } else {
            console.log('[NPCManager] init - No saved state found. Roster empty.');
        }
    }

    async saveState() {
        const state = {
            roster: this.roster,
            activeNPCId: this.activeNPCId
        };
        await DBManager.saveNPCState(state);
    }

    async hireNPC(npcId) {
        npcId = npcId.toUpperCase();
        const npcConfig = NPCManager.NPC_DATA[npcId];
        if (!npcConfig) return { success: false, message: 'Invalid NPC ID' };

        // Check gold
        const goldItem = await DBManager.getInventoryItem('emoji_coin');
        const currentGold = goldItem ? goldItem.amount : 0;

        if (currentGold < npcConfig.cost) {
            return { success: false, message: localizationManager.t('ui_npc_low_gold') };
        }

        // Deduct Gold
        await DBManager.saveInventoryItem('emoji_coin', currentGold - npcConfig.cost);
        EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);

        // Stacking Logic
        if (!this.roster[npcId]) {
            this.roster[npcId] = {
                id: npcId,
                stacks: npcConfig.maxStacks
            };
        } else {
            this.roster[npcId].stacks += npcConfig.maxStacks;
        }

        // Automatically set as active when hired
        this.activeNPCId = npcId;

        await this.saveState();
        EventBus.emit('NPC_HIRED', this.getHiredNPC());
        EventBus.emit('NPC_STACK_UPDATED', this.roster[npcId]);

        console.log(`[NPCManager] Hired/Stacked ${npcConfig.name}. Total Stacks: ${this.roster[npcId].stacks}`);
        const localizedName = NPCManager.getLocalizedName(npcId);
        return { success: true, message: localizationManager.t('ui_npc_hire_success', [localizedName, this.roster[npcId].stacks]) };
    }

    selectNPC(npcId) {
        npcId = npcId.toUpperCase();
        if (this.roster[npcId]) {
            this.activeNPCId = npcId;
            this.saveState();
            EventBus.emit('NPC_HIRED', this.getHiredNPC());
            console.log(`[NPCManager] Selected active NPC: ${npcId}`);
            return true;
        }
        return false;
    }

    getActiveNPC() {
        if (!this.activeNPCId) return null;
        return this.roster[this.activeNPCId];
    }

    /**
     * returns fuller object for the ACTIVE NPC
     */
    getHiredNPC() {
        const active = this.getActiveNPC();
        if (!active) return null;
        const data = NPCManager.NPC_DATA[active.id];
        return {
            ...active,
            ...data,
            currentStacks: active.stacks
        };
    }

    /**
     * returns all hired NPCs for UI listing
     */
    getAllHiredNPCs() {
        return Object.values(this.roster).map(npc => ({
            ...npc,
            ...NPCManager.NPC_DATA[npc.id]
        }));
    }

    async consumeStack() {
        const active = this.getActiveNPC();
        if (!active || active.stacks <= 0) return false;

        active.stacks--;
        console.log(`[NPCManager] Consumed stack for ${active.id}. Remaining: ${active.stacks}`);

        if (active.stacks <= 0) {
            const oldName = NPCManager.getLocalizedName(active.id);
            delete this.roster[active.id];

            // If active was deleted, pick another if available
            if (this.activeNPCId === active.id) {
                const keys = Object.keys(this.roster);
                this.activeNPCId = keys.length > 0 ? keys[0] : null;
            }

            await this.saveState();
            EventBus.emit('NPC_EXPIRED', { name: oldName });
            EventBus.emit('NPC_HIRED', this.getHiredNPC()); // Update UI to new active or null
        } else {
            await this.saveState();
            EventBus.emit('NPC_STACK_UPDATED', active);
        }

        return true;
    }

    getNPCInfo(npcId) {
        return NPCManager.NPC_DATA[npcId.toUpperCase()];
    }
}

// Singleton Guard: Ensure only one instance exists across modules
if (!window._npcManagerInstance) {
    window._npcManagerInstance = new NPCManager();
}
const npcManager = window._npcManagerInstance;
export default npcManager;
