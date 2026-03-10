import DBManager from '../Database/DBManager.js';
import EventBus from '../Events/EventBus.js';

/**
 * FishingManager.js
 * Manages the fishing system, fisherman stats, and progression.
 */

export const STAMINA_RECOVERY_PER_HEALTH = 0.05; // Stamina recovered per health point per minute

/**
 * Fishing Rods Data
 */
export const FISHING_RODS = {
    'bamboo_fishing_rod': {
        id: 'bamboo_fishing_rod',
        name: '대나무 낚시대',
        description: '평범한 대나무로 만든 낚시대입니다.',
        asset: 'assets/item/bamboo_fishing_rod.png',
        maxDurability: 500,
        doubleConsumeChance: 0.3, // 30% chance to consume 2 durability
        requirements: {
            'emoji_wood': 3000,
            'emoji_clover': 1000
        },
        price: 20000
    }
};

/**
 * Fishing Spots Data
 */
export const FISHING_SPOTS = {
    'lake': {
        id: 'lake',
        name: '호숫가',
        description: '고요한 호숫가입니다. 다양한 물고기가 서식합니다.',
        asset: 'assets/location/lake.png',
        fishList: ['fish_mackerel', 'fish_herring', 'fish_squid']
    }
};

/**
 * Fish Data & Buffs
 */
export const FISH_DATA = {
    'fish_mackerel': {
        id: 'fish_mackerel',
        name: '고등어',
        description: '싱싱한 고등어입니다. 던전 라운드당 1마리 소모하여 몬스터 출현율을 30% 상승시킵니다.',
        asset: 'assets/fish/mackerel.png',
        buffType: 'SPAWN_RATE',
        buffValue: 0.3
    },
    'fish_herring': {
        id: 'fish_herring',
        name: '청어',
        description: '빛나는 청어입니다. 던전 라운드당 1마리 소모하여 몬스터 레벨을 1 상승시킵니다.',
        asset: 'assets/fish/herring.png',
        buffType: 'MONSTER_LEVEL',
        buffValue: 1
    },
    'fish_squid': {
        id: 'fish_squid',
        name: '오징어',
        description: '쫄깃한 오징어입니다. 던전 라운드당 1마리 소모하여 엘리트 출현율을 30% 상승시킵니다.',
        asset: 'assets/fish/squid.png',
        buffType: 'ELITE_RATE',
        buffValue: 0.3
    }
};

class FishingManager {
    constructor() {
        this.fishermen = {
            'POLAR_BEAR': {
                id: 'POLAR_BEAR',
                name: '북극곰 아저씨',
                icon: 'assets/npc/polar_bear.png',
                description: '레벨이 오를수록 체력과 스테미나가 월등히 오르는 낚시꾼입니다.',
                baseStats: {
                    speed: 1.0,
                    successRate: 0.5,
                    catchRate: 1.0,
                    maxStamina: 100,
                    health: 10 // Recovery rate
                },
                growth: {
                    speed: 0.01,
                    successRate: 0.005,
                    catchRate: 0.01,
                    maxStamina: 20,
                    health: 5
                }
            }
        };

        this.state = {
            activeFishermanId: 'POLAR_BEAR',
            levels: { 'POLAR_BEAR': 1 },
            exp: { 'POLAR_BEAR': 0 },
            currentStamina: 100,
            activeRodId: 'bamboo_fishing_rod',
            activeSpotId: 'lake',
            lastStaminaUpdate: Date.now(),
            unlockedFishermen: ['POLAR_BEAR']
        };

        this.isFishing = false;
        this.lastAttemptTime = 0;
    }

    async init() {
        const saved = await DBManager.get('settings', 'fishing_state');
        if (saved && saved.value) {
            // Merge saved state into default state to handle new properties
            this.state = { ...this.state, ...saved.value };
            this.recoverStaminaOffline();
        }

        // Start stamina recovery loop
        this.startStaminaRecovery();
    }

    async save() {
        await DBManager.save('settings', 'fishing_state', { value: this.state });
    }

    getStats(fishermanId = this.state.activeFishermanId) {
        const fisherman = this.fishermen[fishermanId];
        const level = this.state.levels[fishermanId] || 1;

        return {
            level: level,
            exp: this.state.exp[fishermanId] || 0,
            nextLevelExp: level * 100,
            stats: {
                fishingSpeed: fisherman.baseStats.speed + (level - 1) * fisherman.growth.speed,
                fishingSuccessRate: Math.min(0.95, fisherman.baseStats.successRate + (level - 1) * fisherman.growth.successRate),
                fishingCatchRate: fisherman.baseStats.catchRate + (level - 1) * fisherman.growth.catchRate,
                maxStamina: fisherman.baseStats.maxStamina + (level - 1) * fisherman.growth.maxStamina,
                health: fisherman.baseStats.health + (level - 1) * fisherman.growth.health,
            },
            currentStamina: this.state.currentStamina,
            maxStamina: fisherman.baseStats.maxStamina + (level - 1) * fisherman.growth.maxStamina
        };
    }

    startStaminaRecovery() {
        setInterval(() => {
            this.recoverStamina(1); // Small incremental recovery
        }, 1000);
    }

    recoverStaminaOffline() {
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - this.state.lastStaminaUpdate) / 1000);
        if (elapsedSeconds > 0) {
            const stats = this.getStats();
            // Recovery per second = health / 60
            const recoveryRaw = (stats.stats.health / 60) * elapsedSeconds;
            this.state.currentStamina = Math.min(stats.maxStamina, this.state.currentStamina + recoveryRaw);
            this.state.lastStaminaUpdate = now;
            this.save();
        }
    }

    recoverStamina(deltaSeconds) {
        const stats = this.getStats();
        if (this.state.currentStamina < stats.maxStamina) {
            // Recovery per second = health / 60
            const recovery = (stats.stats.health / 60) * deltaSeconds;
            this.state.currentStamina = Math.min(stats.maxStamina, this.state.currentStamina + recovery);
            this.state.lastStaminaUpdate = Date.now();
            EventBus.emit('FISHING_STAMINA_UPDATED', {
                current: this.state.currentStamina,
                max: stats.maxStamina
            });
        }
    }

    async addExp(fishermanId, amount) {
        const stats = this.getStats(fishermanId);
        if (!this.state.exp[fishermanId]) this.state.exp[fishermanId] = 0;
        if (!this.state.levels[fishermanId]) this.state.levels[fishermanId] = 1;

        this.state.exp[fishermanId] += amount;

        if (this.state.exp[fishermanId] >= stats.nextLevelExp) {
            this.state.exp[fishermanId] -= stats.nextLevelExp;
            this.state.levels[fishermanId] += 1;
            EventBus.emit('FISHING_LEVEL_UP', {
                fishermanId,
                level: this.state.levels[fishermanId]
            });
            EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[낚시] ${this.fishermen[fishermanId].name}의 레벨이 ${this.state.levels[fishermanId]}이 되었습니다! 🎣`);
        }
        await this.save();
    }

    async attemptFishing() {
        const stats = this.getStats();
        if (this.state.currentStamina < 1) return { success: false, reason: 'STAMINA' };

        this.state.currentStamina -= 1;
        const roll = Math.random();
        const isSuccess = roll < stats.stats.fishingSuccessRate;

        // Gain some EXP regardless of success
        await this.addExp(this.state.activeFishermanId, isSuccess ? 10 : 2);

        if (isSuccess) {
            const amount = Math.floor(stats.stats.fishingCatchRate + (Math.random() < (stats.stats.fishingCatchRate % 1) ? 1 : 0));
            // Placeholder for fish items
            // await this.addFish('BASIC_FISH', amount);
            return { success: true, amount };
        }

        return { success: false, reason: 'MISS' };
    }

    /**
     * Crafts a fishing rod.
     * @param {string} rodId 
     */
    async craftRod(rodId) {
        const rod = FISHING_RODS[rodId];
        if (!rod) return { success: false, message: 'Invalid rod recipe' };

        // 1. Check materials
        for (const [matId, reqAmount] of Object.entries(rod.requirements)) {
            const item = await DBManager.getInventoryItem(matId);
            if (!item || item.amount < reqAmount) {
                const matName = require('./ItemManager.js').default.getItem(matId)?.name || matId;
                return { success: false, message: `${matName} 재료가 부족합니다.` };
            }
        }

        // 2. Deduct materials
        for (const [matId, reqAmount] of Object.entries(rod.requirements)) {
            const item = await DBManager.getInventoryItem(matId);
            await DBManager.saveInventoryItem(matId, item.amount - reqAmount);
        }

        // 3. Add rod to inventory
        const existingRod = await DBManager.getInventoryItem(rodId);
        const currentAmount = existingRod ? existingRod.amount : 0;
        await DBManager.saveInventoryItem(rodId, currentAmount + 1);

        console.log(`[FishingManager] Crafted ${rod.name}. Total: ${currentAmount + 1}`);
        EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);

        return { success: true, message: `${rod.name} 제작 완료! 🎣` };
    }
}

// Singleton
if (!window._fishingManagerInstance) {
    window._fishingManagerInstance = new FishingManager();
}
const fishingManager = window._fishingManagerInstance;
export default fishingManager;
