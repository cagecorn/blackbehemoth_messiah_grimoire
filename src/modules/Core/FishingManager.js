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
        fishList: ['mackerel', 'herring', 'squid']
    }
};

/**
 * Fish Data & Buffs
 */
export const FISH_DATA = {
    'mackerel': {
        id: 'mackerel',
        name: '고등어',
        description: '싱싱한 고등어입니다.',
        buffDescription: '몬스터 출현 양 30% 상승',
        asset: 'assets/fish/mackerel.png',
        buffType: 'SPAWN_RATE',
        buffValue: 0.3
    },
    'herring': {
        id: 'herring',
        name: '청어',
        description: '빛나는 청어입니다.',
        buffDescription: '몬스터 레벨 1 상승',
        asset: 'assets/fish/herring.png',
        buffType: 'MONSTER_LEVEL',
        buffValue: 1
    },
    'squid': {
        id: 'squid',
        name: '오징어',
        description: '쫄깃한 오징어입니다.',
        buffDescription: '엘리트 출현율 30% 상승',
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
            rodDurability: 500, // Current active rod durability
            activeSpotId: 'lake',
            lastStaminaUpdate: Date.now(),
            unlockedFishermen: ['POLAR_BEAR'],
            autoConsume: true, // Auto consume fish for buffs in dungeon
            activeFishBuffs: {} // { buffType: { value: 0.3, expiresAtRound: 5 } }
        };

        this.isFishing = false;
        this.lastAttemptTime = 0;

        // Bind data constants to instance for UI access
        this.fishData = FISH_DATA;
        this.spots = FISHING_SPOTS;
        this.rods = FISHING_RODS;
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

    /**
     * Toggles auto-consumption of caught fish in dungeon.
     */
    toggleAutoConsume() {
        this.state.autoConsume = !this.state.autoConsume;
        this.save();
        EventBus.emit('FISHING_AUTO_CONSUME_TOGGLED', this.state.autoConsume);
        return this.state.autoConsume;
    }

    /**
     * Performs a fishing attempt during dungeon combat.
     * Consumes 1 stamina and 1-2 rod durability.
     */
    async performFishingTurn() {
        if (this.isFishing) return null;
        this.isFishing = true;

        try {
            const stats = this.getStats();

            // 1. Check Requirements
            if (this.state.currentStamina < 1) {
                return { success: false, reason: 'STAMINA', message: '스테미나 부족!' };
            }
            
            // Auto-equip rod from inventory if durability is 0
            if (this.state.rodDurability <= 0) {
                const rodId = this.state.activeRodId || 'bamboo_fishing_rod';
                let rodInventory = await DBManager.getInventoryItem(rodId);
                
                // Fallback: If active rod not found, look for any bamboo rod
                if ((!rodInventory || rodInventory.amount <= 0) && rodId !== 'bamboo_fishing_rod') {
                    rodInventory = await DBManager.getInventoryItem('bamboo_fishing_rod');
                }

                if (rodInventory && rodInventory.amount > 0) {
                    const actualRodId = rodInventory.id || 'bamboo_fishing_rod';
                    // Consume 1 rod from inventory
                    await DBManager.saveInventoryItem(actualRodId, rodInventory.amount - 1);
                    
                    // Refill durability
                    const rodData = FISHING_RODS[actualRodId] || FISHING_RODS['bamboo_fishing_rod'];
                    this.state.rodDurability = rodData.maxDurability;
                    this.state.activeRodId = actualRodId;
                    
                    console.log(`[FishingManager] 낚시대 자동 교체 성공: ${rodData.name}. 남은 수량: ${rodInventory.amount - 1}`);
                    EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);
                    EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[낚시] 낚시대를 자동으로 교체했습니다! 🎣`);
                } else {
                    return { success: false, reason: 'DURABILITY', message: '낚시대 파손!' };
                }
            }

            // 2. Consume Resources
            this.state.currentStamina -= 1;

            // Rod durability consumption logic
            let durabilityLoss = 1;
            const rodData = FISHING_RODS[this.state.activeRodId] || FISHING_RODS['bamboo_fishing_rod'];
            if (Math.random() < (rodData.doubleConsumeChance || 0.3)) durabilityLoss = 2;
            this.state.rodDurability = Math.max(0, this.state.rodDurability - durabilityLoss);

            // 3. Roll for success
            const roll = Math.random();
            const isSuccess = roll < stats.stats.fishingSuccessRate;

            // 4. Calculate EXP
            await this.addExp(this.state.activeFishermanId, isSuccess ? 10 : 2);

            let result = null;
            if (isSuccess) {
                // Pick a random fish from the current spot
                const spot = FISHING_SPOTS[this.state.activeSpotId] || FISHING_SPOTS['lake'];
                const fishId = spot.fishList[Math.floor(Math.random() * spot.fishList.length)];
                const fishData = FISH_DATA[fishId];

                // Calculate catch amount
                const catchRate = stats.stats.fishingCatchRate;
                const amount = Math.floor(catchRate + (Math.random() < (catchRate % 1) ? 1 : 0));

                // Save to inventory
                const existing = await DBManager.getInventoryItem(fishId);
                const newAmount = (existing ? existing.amount : 0) + amount;
                await DBManager.saveInventoryItem(fishId, newAmount);

                console.log(`%c[낚시 성공] ${fishData.name} x${amount} 획득!`, "color: #4ade80; font-weight: bold;");

                result = {
                    success: true,
                    fishId,
                    fishName: fishData.name,
                    amount,
                    asset: fishData.asset
                };

                EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);
            } else {
                result = { success: false, reason: 'MISS', message: '허탕쳤습니다...' };
            }

            this.save();
            EventBus.emit('FISHING_TURN_COMPLETED', result);
            return result;
        } catch (error) {
            console.error(`[FishingManager] Fishing turn error:`, error);
            return { success: false, reason: 'ERROR', message: '낚시 중 오류 발생' };
        } finally {
            this.isFishing = false;
        }
    }

    /**
     * Applies fish buffs if auto-consume is enabled.
     * Called at the start of a dungeon round.
     */
    async processAutoConsume(currentRound) {
        if (!this.state.autoConsume) return;

        const spot = FISHING_SPOTS[this.state.activeSpotId] || FISHING_SPOTS['lake'];
        for (const fishId of spot.fishList) {
            const inventory = await DBManager.getInventoryItem(fishId);
            if (inventory && inventory.amount > 0) {
                // Consume 1 fish
                await DBManager.saveInventoryItem(fishId, inventory.amount - 1);

                // Apply buff
                const fishData = FISH_DATA[fishId];
                this.state.activeFishBuffs[fishData.buffType] = {
                    id: fishId,
                    name: fishData.name,
                    value: fishData.buffValue,
                    expiresAtRound: currentRound + 1 // Lasts for 1 round
                };

                console.log(`%c[낚시 버프 활성화] ${fishData.name} 자동 소모 (라운드 ${currentRound})`, "background: #10b981; color: #fff; padding: 2px 5px; font-weight: bold;");
                console.log(` - 효과: ${fishData.buffDescription}`);
                EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);
                EventBus.emit('FISHING_BUFF_APPLIED', fishData);
            }
        }
    }

    /**
     * Clears expired buffs.
     */
    clearExpiredBuffs(currentRound) {
        let changed = false;
        for (const [type, buff] of Object.entries(this.state.activeFishBuffs)) {
            if (currentRound >= buff.expiresAtRound) {
                console.log(`%c[낚시 버프 만료] ${buff.name} (${type}) 효과가 종료되었습니다. (라운드 ${currentRound})`, "background: #475569; color: #fff; padding: 2px 5px;");
                delete this.state.activeFishBuffs[type];
                changed = true;
            }
        }
        if (changed) {
            EventBus.emit('FISHING_BUFF_EXPIRED');
        }
    }

    /**
     * Get active buffs for external systems (e.g., DungeonScene spawn logic)
     */
    getBuffValue(buffType) {
        return this.state.activeFishBuffs[buffType]?.value || 0;
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
