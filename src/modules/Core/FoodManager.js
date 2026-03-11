import DBManager from '../Database/DBManager.js';
import ItemManager from './ItemManager.js';
import EventBus from '../Events/EventBus.js';
import localizationManager from './LocalizationManager.js';

/**
 * FoodManager.js
 * 
 * Manages food crafting, recipes, and active buff states.
 */
export const FOOD_RECIPES = {
    'food_choco_parfait': {
        id: 'food_choco_parfait',
        name: '초코 파르페',
        description: '달콤한 초코 파르페입니다. 한 라운드 동안 파티 획득 경험치가 10% 상승합니다.',
        icon: 'choco_parfait',
        asset: 'assets/food/choco_parfait.png',
        requirements: {
            'emoji_meat': 500,
            'emoji_herb': 400
        },
        buffType: 'PARTY_EXP',
        buffValue: 0.1
    },
    'food_strawberry_cake': {
        id: 'food_strawberry_cake',
        name: '딸기 케이크',
        description: '상큼한 딸기 케이크입니다. 한 라운드 동안 장비(무기/방어구) 획득 경험치가 10% 상승합니다.',
        icon: 'strawberry_cake',
        asset: 'assets/food/strawberry_cake.png',
        requirements: {
            'emoji_meat': 1000,
            'emoji_herb': 800
        },
        buffType: 'EQUIP_EXP',
        buffValue: 0.1
    }
};

class FoodManager {
    /**
     * Crafts food items in bulk.
     * @param {string} foodId 
     * @param {number} count 
     */
    async craftFood(foodId, count = 1) {
        const recipe = FOOD_RECIPES[foodId];
        if (!recipe) return { success: false, message: 'Invalid recipe' };

        // 1. Check materials
        for (const [matId, reqAmount] of Object.entries(recipe.requirements)) {
            const item = await DBManager.getInventoryItem(matId);
            if (!item || item.amount < reqAmount * count) {
                const matName = ItemManager.getItem(matId)?.name || matId;
                const localizedMatName = localizationManager.t('item_name_' + matId, [], matName);
                return { 
                    success: false, 
                    message: localizationManager.t('ui_kitchen_insufficient_materials').replace('{0}', localizedMatName) 
                };
            }
        }

        // 2. Deduct materials
        for (const [matId, reqAmount] of Object.entries(recipe.requirements)) {
            const item = await DBManager.getInventoryItem(matId);
            await DBManager.saveInventoryItem(matId, item.amount - (reqAmount * count));
        }

        // 3. Add food to inventory
        const existingFood = await DBManager.getInventoryItem(foodId);
        const currentAmount = existingFood ? existingFood.amount : 0;
        await DBManager.saveInventoryItem(foodId, currentAmount + count);

        console.log(`[FoodManager] Crafted ${count}x ${recipe.name}. Total: ${currentAmount + count}`);
        EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);

        return { success: true, name: recipe.name, total: currentAmount + count };
    }

    /**
     * Gets all owned food items and their counts.
     */
    async getOwnedFood() {
        const foodIds = Object.keys(FOOD_RECIPES);
        const owned = {};
        for (const id of foodIds) {
            const record = await DBManager.getInventoryItem(id);
            owned[id] = record ? record.amount : 0;
        }
        return owned;
    }

    /**
     * Consumes one of each active food type at the start of a round.
     * Returns the list of active buffs for that round.
     */
    async consumeForRound() {
        const owned = await this.getOwnedFood();
        const activeBuffs = {
            PARTY_EXP_BONUS: 0,
            EQUIP_EXP_BONUS: 0
        };

        for (const [foodId, amount] of Object.entries(owned)) {
            if (amount > 0) {
                const recipe = FOOD_RECIPES[foodId];
                // Consume 1
                await DBManager.saveInventoryItem(foodId, amount - 1);

                // Apply buff
                if (recipe.buffType === 'PARTY_EXP') {
                    activeBuffs.PARTY_EXP_BONUS += recipe.buffValue;
                } else if (recipe.buffType === 'EQUIP_EXP') {
                    activeBuffs.EQUIP_EXP_BONUS += recipe.buffValue;
                }

                console.log(`[FoodManager] Consumed 1x ${recipe.name}. Remaining: ${amount - 1}`);
            }
        }

        if (activeBuffs.PARTY_EXP_BONUS > 0 || activeBuffs.EQUIP_EXP_BONUS > 0) {
            EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);
        }

        return activeBuffs;
    }

    /**
     * Just peek at current food counts without consuming.
     */
    async getActiveFoodCounts() {
        return await this.getOwnedFood();
    }
}

const foodManager = new FoodManager();
export default foodManager;
