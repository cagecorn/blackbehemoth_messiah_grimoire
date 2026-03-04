import DBManager from '../Database/DBManager.js';
import EventBus from '../Events/EventBus.js';

/**
 * NPCManager.js
 * Manages hired non-combat NPCs and their abilities.
 */
class NPCManager {
    constructor() {
        this.hiredNPC = null; // { id, stacks, totalStacks }
        this.NPC_DATA = {
            'MISSIONARY': {
                id: 'MISSIONARY',
                name: '선교사',
                sprite: 'missionary_npc',
                cost: 10000,
                maxStacks: 50,
                description: '던전/레이드에서 용병 사망 시, 자동으로 풀 체력으로 부활 (50회)'
            },
            'NUN': {
                id: 'NUN',
                name: '수녀',
                sprite: 'nun_npc',
                cost: 50000,
                maxStacks: 50,
                description: '던전/레이드에서 패배 시, 1라운드가 아닌 현재 라운드에서 재시작 (50회)'
            }
        };
    }

    async init() {
        const savedNPC = await DBManager.getNPCState();
        if (savedNPC) {
            this.hiredNPC = savedNPC;
            console.log('[NPCManager] Loaded NPC state:', this.hiredNPC);
        }
    }

    async hireNPC(npcId) {
        const npcConfig = this.NPC_DATA[npcId.toUpperCase()];
        if (!npcConfig) return { success: false, message: 'Invalid NPC ID' };

        // Check gold
        const goldItem = await DBManager.getInventoryItem('emoji_coin');
        const currentGold = goldItem ? goldItem.amount : 0;

        if (currentGold < npcConfig.cost) {
            return { success: false, message: '골드가 부족합니다! 💰' };
        }

        // Deduct Gold
        await DBManager.saveInventoryItem('emoji_coin', currentGold - npcConfig.cost);
        EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);

        // Hire NPC (Replaces current)
        this.hiredNPC = {
            id: npcId.toUpperCase(),
            stacks: npcConfig.maxStacks,
            totalStacks: npcConfig.maxStacks
        };

        await DBManager.saveNPCState(this.hiredNPC);
        EventBus.emit('NPC_HIRED', this.hiredNPC);

        console.log(`[NPCManager] Hired ${npcConfig.name}. Stacks: ${this.hiredNPC.stacks}`);
        return { success: true, message: `${npcConfig.name}를 고용했습니다! ✨` };
    }

    getActiveNPC() {
        return this.hiredNPC;
    }

    async consumeStack() {
        if (!this.hiredNPC || this.hiredNPC.stacks <= 0) return false;

        this.hiredNPC.stacks--;
        console.log(`[NPCManager] Consumed stack for ${this.hiredNPC.id}. Remaining: ${this.hiredNPC.stacks}`);

        if (this.hiredNPC.stacks <= 0) {
            const oldName = this.NPC_DATA[this.hiredNPC.id].name;
            this.hiredNPC = null;
            await DBManager.saveNPCState(null);
            EventBus.emit('NPC_EXPIRED', { name: oldName });
            EventBus.emit('NPC_HIRED', null); // Clear UI
        } else {
            await DBManager.saveNPCState(this.hiredNPC);
            EventBus.emit('NPC_STACK_UPDATED', this.hiredNPC);
        }

        return true;
    }

    getNPCInfo(npcId) {
        return this.NPC_DATA[npcId.toUpperCase()];
    }
}

const npcManager = new NPCManager();
export default npcManager;
