import DBManager from '../Database/DBManager.js';
import ItemManager, { ITEM_TYPES, EQUIP_SLOTS } from './ItemManager.js';
import EventBus from '../Events/EventBus.js';

/**
 * EquipmentManager.js
 * 
 * Manages unique equipment instances that can level up and gain EXP.
 * Weapons gain EXP from damage dealt.
 * Armor gains EXP from damage received.
 */
class EquipmentManager {
    constructor() {
        this.instances = {}; // Cache of active instances if needed
    }

    /**
     * EXP Curve: Astronomical requirements for equipment.
     * Level 50 is the goal.
     */
    getRequiredExpForLevel(level) {
        if (level <= 1) return 0;
        // Exponential growth: starts manageable, becomes massive.
        // Level 2: 50,000
        // Level 10: ~5,000,000
        // Level 50: ~1.5 Trillion (Very hard)
        return Math.floor(25000 * Math.pow(1.3, level - 1));
    }

    getTotalRequiredExp(level) {
        let total = 0;
        for (let i = 1; i <= level; i++) {
            total += this.getRequiredExpForLevel(i);
        }
        return total;
    }

    calculateLevelFromExp(exp) {
        let level = 1;
        let remainingExp = exp;
        while (true) {
            const req = this.getRequiredExpForLevel(level + 1);
            if (remainingExp >= req) {
                remainingExp -= req;
                level++;
                if (level >= 50) break; // Hard cap for now
            } else {
                break;
            }
        }
        return { level, currentExp: remainingExp, nextLevelExp: this.getRequiredExpForLevel(level + 1) };
    }

    /**
     * Crafts a new equipment instance.
     * @param {string} itemId Mapping to ITEM_DATABASE
     */
    async craftItem(itemId) {
        const baseItem = ItemManager.getItem(itemId);
        if (!baseItem || baseItem.type !== ITEM_TYPES.EQUIPMENT) {
            return { success: false, reason: 'Invalid equipment ID' };
        }

        // --- Material Check (Hardcoded for Wood Sword initially) ---
        if (itemId === 'wood_sword') {
            const wood = await DBManager.getInventoryItem('emoji_wood');
            if (!wood || wood.amount < 500) {
                return { success: false, reason: '나무 재료가 부족합니다! (500개 필요)' };
            }
            // Consume
            await DBManager.saveInventoryItem('emoji_wood', wood.amount - 500);
            EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);
        } else {
            return { success: false, reason: '제작법이 아직 개방되지 않았습니다.' };
        }

        // Create Instance
        const instance = {
            id: `eq_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            itemId: itemId,
            level: 1,
            exp: 0,
            ownerId: null,
            randomOptions: [] // To be implemented later
        };

        await DBManager.saveEquipmentInstance(instance);
        console.log(`[EquipmentManager] Crafted new ${baseItem.name}:`, instance);

        return { success: true, instance };
    }

    /**
     * Adds EXP to an equipment instance.
     */
    async addExp(instanceId, amount) {
        const instance = await DBManager.getEquipmentInstance(instanceId);
        if (!instance) return;

        const oldLevel = instance.level;
        instance.exp += Math.floor(amount);

        const status = this.calculateLevelFromExp(instance.exp);
        instance.level = status.level;

        await DBManager.saveEquipmentInstance(instance);

        if (instance.level > oldLevel) {
            console.log(`[EquipmentManager] Equipment ${instanceId} leveled up: ${oldLevel} -> ${instance.level}`);
            EventBus.emit('EQUIPMENT_LEVEL_UP', { instanceId, level: instance.level });
        }

        return instance;
    }

    /**
     * Calculates current stats based on level.
     */
    getEffectiveStats(instance, baseItem) {
        if (!instance || !baseItem) return {};

        const stats = { ...baseItem.stats };

        // Custom logic for Wood Sword
        if (instance.itemId === 'wood_sword') {
            // "atk": 공격력 + 5 (일부러 낮게 잡음) + 레벨일 오를 때마다 공격력 + 25%
            // interpretation: Base is 5. Total = 5 * (1 + 0.25 * (level - 1))
            const levelBonus = 1 + (0.25 * (instance.level - 1));
            stats.atk = Math.floor(5 * levelBonus);
        }

        return stats;
    }

    /**
     * Returns description including level and perks.
     */
    getDisplayInfo(instance) {
        const baseItem = ItemManager.getItem(instance.itemId);
        const { currentExp, nextLevelExp } = this.calculateLevelFromExp(instance.exp);
        const stats = this.getEffectiveStats(instance, baseItem);

        let desc = baseItem.description || '';
        desc += `\n\n[성장 정보]`;
        desc += `\n- 레벨: LV.${instance.level}`;
        desc += `\n- 경험치: ${instance.exp.toLocaleString()} / ${nextLevelExp.toLocaleString()}`;

        if (stats.atk) desc += `\n- 공격력: +${stats.atk}`;
        if (stats.def) desc += `\n- 방어력: +${stats.def}`;

        // Random Options
        desc += `\n\n[랜덤 옵션]`;
        for (let i = 1; i <= 5; i++) {
            const reqLv = i * 10;
            if (instance.level >= reqLv) {
                desc += `\n- 옵션 ${i}: 활성화됨 (추후 추가)`;
            } else {
                desc += `\n- 옵션 ${i}: LV.${reqLv}에 개방`;
            }
        }

        return {
            name: `${baseItem.name} LV.${instance.level}`,
            description: desc,
            stats: stats,
            expInLevel: currentExp,
            requiredExp: nextLevelExp
        };
    }
}

const equipmentManager = new EquipmentManager();
export default equipmentManager;
