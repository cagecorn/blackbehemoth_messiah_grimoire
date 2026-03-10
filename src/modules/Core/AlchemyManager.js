import DBManager from '../Database/DBManager.js';
import EventBus from '../Events/EventBus.js';

/**
 * AlchemyManager.js
 * Manages the alchemy system, alchemist stats, and potion crafting.
 */

export const STAMINA_RECOVERY_PER_HEALTH = 0.05; // Stamina recovered per health point per minute

/**
 * Alchemy Tools Data
 */
export const ALCHEMY_TOOLS = {
    'alchemy_tool_basic': {
        id: 'alchemy_tool_basic',
        name: '평범한 연금도구',
        description: '평범한 연금도구입니다.',
        asset: 'assets/item/alchemi_tool.png',
        maxDurability: 500,
        doubleConsumeChance: 0.5, // 50% chance to consume 2 durability
        requirements: {
            'emoji_candle': 5000,
            'eternal_ice': 3000
        },
        price: 90000
    }
};

/**
 * Alchemy Recipes Data
 */
export const ALCHEMY_RECIPES = {
    'basic_recipe': {
        id: 'basic_recipe',
        name: '기본 레시피',
        description: '기초적인 포션들을 제작할 수 있는 레시피입니다.',
        potions: ['atk_potion', 'def_potion', 'mAtk_potion', 'mDef_potion']
    }
};

/**
 * Potion Data & Buffs
 */
export const POTION_DATA = {
    'atk_potion': {
        id: 'atk_potion',
        name: '공격력 포션',
        description: '공격력이 4% 일시적으로 증가합니다.',
        asset: 'assets/potion/atk_potion.png',
        buffType: 'ATK_MULT',
        buffValue: 0.04
    },
    'def_potion': {
        id: 'def_potion',
        name: '방어력 포션',
        description: '방어력이 4% 일시적으로 증가합니다.',
        asset: 'assets/potion/def_potion.png',
        buffType: 'DEF_MULT',
        buffValue: 0.04
    },
    'mAtk_potion': {
        id: 'mAtk_potion',
        name: '마법공격력 포션',
        description: '마법공격력이 4% 일시적으로 증가합니다.',
        asset: 'assets/potion/mAtk_potion.png',
        buffType: 'MATK_MULT',
        buffValue: 0.04
    },
    'mDef_potion': {
        id: 'mDef_potion',
        name: '마법방어력 포션',
        description: '마법방어력이 4% 일시적으로 증가합니다.',
        asset: 'assets/potion/mDef_potion.png',
        buffType: 'MDEF_MULT',
        buffValue: 0.04
    }
};

class AlchemyManager {
    constructor() {
        this.alchemists = {
            'GRUMPY_RABBIT': {
                id: 'GRUMPY_RABBIT',
                name: '뾰로퉁 토끼씨',
                icon: 'assets/npc/rabbit.png',
                description: '레벨이 오를수록 연금 성공률이 오르는 연금술사입니다.',
                baseStats: {
                    speed: 1.0,
                    successRate: 0.4, // Base success rate
                    productionCount: 1.0,
                    maxStamina: 100,
                    health: 10 // Recovery rate
                },
                growth: {
                    speed: 0.01,
                    successRate: 0.015, // Higher growth for rabbit
                    productionCount: 0.01,
                    maxStamina: 15,
                    health: 5
                }
            }
        };

        this.state = {
            activeAlchemistId: 'GRUMPY_RABBIT',
            levels: { 'GRUMPY_RABBIT': 1 },
            exp: { 'GRUMPY_RABBIT': 0 },
            currentStamina: 100,
            activeToolId: 'alchemy_tool_basic',
            toolDurability: 500,
            activeRecipeId: 'basic_recipe',
            lastStaminaUpdate: Date.now(),
            unlockedAlchemists: ['GRUMPY_RABBIT'],
            autoConsume: true,
            activePotionBuffs: {} 
        };

        this.isCrafting = false;
        
        // Bind data constants
        this.potionData = POTION_DATA;
        this.recipes = ALCHEMY_RECIPES;
        this.tools = ALCHEMY_TOOLS;
    }

    async init() {
        const saved = await DBManager.get('settings', 'alchemy_state');
        if (saved && saved.value) {
            this.state = { ...this.state, ...saved.value };
            this.recoverStaminaOffline();
        }
        this.startStaminaRecovery();
    }

    async save() {
        await DBManager.save('settings', 'alchemy_state', { value: this.state });
    }

    getStats(alchemistId = this.state.activeAlchemistId) {
        const alchemist = this.alchemists[alchemistId];
        const level = this.state.levels[alchemistId] || 1;

        return {
            level: level,
            exp: this.state.exp[alchemistId] || 0,
            nextLevelExp: level * 100,
            stats: {
                alchemySpeed: alchemist.baseStats.speed + (level - 1) * alchemist.growth.speed,
                alchemySuccessRate: Math.min(0.95, alchemist.baseStats.successRate + (level - 1) * alchemist.growth.successRate),
                productionCount: alchemist.baseStats.productionCount + (level - 1) * alchemist.growth.productionCount,
                maxStamina: alchemist.baseStats.maxStamina + (level - 1) * alchemist.growth.maxStamina,
                health: alchemist.baseStats.health + (level - 1) * alchemist.growth.health,
            },
            currentStamina: this.state.currentStamina,
            maxStamina: alchemist.baseStats.maxStamina + (level - 1) * alchemist.growth.maxStamina
        };
    }

    startStaminaRecovery() {
        setInterval(() => {
            this.recoverStamina(1);
        }, 1000);
    }

    recoverStaminaOffline() {
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - this.state.lastStaminaUpdate) / 1000);
        if (elapsedSeconds > 0) {
            const stats = this.getStats();
            const recoveryRaw = (stats.stats.health / 60) * elapsedSeconds;
            this.state.currentStamina = Math.min(stats.maxStamina, this.state.currentStamina + recoveryRaw);
            this.state.lastStaminaUpdate = now;
            this.save();
        }
    }

    recoverStamina(deltaSeconds) {
        const stats = this.getStats();
        if (this.state.currentStamina < stats.maxStamina) {
            const recovery = (stats.stats.health / 60) * deltaSeconds;
            this.state.currentStamina = Math.min(stats.maxStamina, this.state.currentStamina + recovery);
            this.state.lastStaminaUpdate = Date.now();
            EventBus.emit('ALCHEMY_STAMINA_UPDATED', {
                current: this.state.currentStamina,
                max: stats.maxStamina
            });
        }
    }

    async addExp(alchemistId, amount) {
        const stats = this.getStats(alchemistId);
        if (!this.state.exp[alchemistId]) this.state.exp[alchemistId] = 0;
        if (!this.state.levels[alchemistId]) this.state.levels[alchemistId] = 1;

        this.state.exp[alchemistId] += amount;

        if (this.state.exp[alchemistId] >= stats.nextLevelExp) {
            this.state.exp[alchemistId] -= stats.nextLevelExp;
            this.state.levels[alchemistId] += 1;
            EventBus.emit('ALCHEMY_LEVEL_UP', {
                alchemistId,
                level: this.state.levels[alchemistId]
            });
            EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[연금술] ${this.alchemists[alchemistId].name}의 레벨이 ${this.state.levels[alchemistId]}이 되었습니다! 🐰`);
        }
        await this.save();
    }

    /**
     * Toggles auto-consumption of brewed potions in dungeon.
     */
    toggleAutoConsume() {
        this.state.autoConsume = !this.state.autoConsume;
        this.save();
        EventBus.emit('ALCHEMY_AUTO_CONSUME_TOGGLED', this.state.autoConsume);
        return this.state.autoConsume;
    }

    /**
     * Performs an alchemy attempt.
     * Consumes 1 stamina and potential tool durability.
     */
    async performAlchemyTurn() {
        if (this.isCrafting) return null;
        this.isCrafting = true;

        const stats = this.getStats();

        if (this.state.currentStamina < 1) {
            this.isCrafting = false;
            return { success: false, reason: 'STAMINA', message: '스테미나 부족!' };
        }
        if (this.state.toolDurability <= 0) {
            this.isCrafting = false;
            return { success: false, reason: 'DURABILITY', message: '연금도구 파손!' };
        }

        this.state.currentStamina -= 1;

        const tool = ALCHEMY_TOOLS[this.state.activeToolId] || ALCHEMY_TOOLS['alchemy_tool_basic'];
        let durabilityLoss = 1;
        if (Math.random() < tool.doubleConsumeChance) durabilityLoss = 2;
        this.state.toolDurability = Math.max(0, this.state.toolDurability - durabilityLoss);

        const roll = Math.random();
        const isSuccess = roll < stats.stats.alchemySuccessRate;

        await this.addExp(this.state.activeAlchemistId, isSuccess ? 12 : 3);

        let result = null;
        if (isSuccess) {
            const recipe = ALCHEMY_RECIPES[this.state.activeRecipeId] || ALCHEMY_RECIPES['basic_recipe'];
            const potionId = recipe.potions[Math.floor(Math.random() * recipe.potions.length)];
            const pData = POTION_DATA[potionId];

            const prodRate = stats.stats.productionCount;
            const amount = Math.floor(prodRate + (Math.random() < (prodRate % 1) ? 1 : 0));

            const existing = await DBManager.getInventoryItem(potionId);
            const newAmount = (existing ? existing.amount : 0) + amount;
            await DBManager.saveInventoryItem(potionId, newAmount);

            console.log(`%c[연금술 성공] ${pData.name} x${amount} 제작!`, "color: #a78bfa; font-weight: bold;");

            result = {
                success: true,
                potionId,
                potionName: pData.name,
                amount,
                asset: pData.asset
            };

            EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);
        } else {
            result = { success: false, reason: 'MISS', message: '제작에 실패했습니다...' };
        }

        this.save();
        this.isCrafting = false;

        EventBus.emit('ALCHEMY_TURN_COMPLETED', result);
        return result;
    }

    /**
     * Crafts an alchemy tool.
     */
    async craftTool(toolId) {
        const tool = ALCHEMY_TOOLS[toolId];
        if (!tool) return { success: false, message: 'Invalid tool recipe' };

        for (const [matId, reqAmount] of Object.entries(tool.requirements)) {
            const item = await DBManager.getInventoryItem(matId);
            if (!item || item.amount < reqAmount) {
                const matName = matId === 'emoji_candle' ? '양초' : '영원한 얼음';
                return { success: false, message: `${matName} 재료가 부족합니다.` };
            }
        }

        for (const [matId, reqAmount] of Object.entries(tool.requirements)) {
            const item = await DBManager.getInventoryItem(matId);
            await DBManager.saveInventoryItem(matId, item.amount - reqAmount);
        }

        const existingTool = await DBManager.getInventoryItem(toolId);
        const currentAmount = existingTool ? existingTool.amount : 0;
        await DBManager.saveInventoryItem(toolId, currentAmount + 1);

        EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);
        return { success: true, message: `${tool.name} 제작 완료! ⚗️` };
    }
}

// Singleton
if (!window._alchemyManagerInstance) {
    window._alchemyManagerInstance = new AlchemyManager();
}
const alchemyManager = window._alchemyManagerInstance;
export default alchemyManager;
