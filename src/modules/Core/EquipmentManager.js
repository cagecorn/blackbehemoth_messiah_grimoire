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

    static WEAPON_OPTION_POOL = [
        // Elements (Low probability)
        { id: 'fire', type: 'element', value: 'fire', weight: 5, label: '무기 속성: 불 🔥' },
        { id: 'ice', type: 'element', value: 'ice', weight: 5, label: '무기 속성: 얼음 ❄️' },
        { id: 'lightning', type: 'element', value: 'lightning', weight: 5, label: '무기 속성: 번개 ⚡' },
        // Multipliers
        { id: 'atkMult', type: 'mult', stat: 'atkMult', min: 0.1, max: 0.4, weight: 20, label: '공격력' },
        { id: 'mAtkMult', type: 'mult', stat: 'mAtkMult', min: 0.1, max: 0.4, weight: 20, label: '마법 공격력' },
        { id: 'castSpdMult', type: 'mult', stat: 'castSpdMult', min: 0.05, max: 0.3, weight: 15, label: '시전 속도' },
        { id: 'atkSpdMult', type: 'mult', stat: 'atkSpdMult', min: 0.05, max: 0.3, weight: 15, label: '공격 속도' },
        { id: 'atkRangeMult', type: 'mult', stat: 'atkRangeMult', min: 0.05, max: 0.15, weight: 10, label: '공격 사거리' },
        { id: 'accMult', type: 'mult', stat: 'accMult', min: 0.1, max: 0.5, weight: 15, label: '정확도' },
        { id: 'critMult', type: 'mult', stat: 'critMult', min: 0.05, max: 0.2, weight: 15, label: '치명타율' },
        // New Stat
        { id: 'ultChargeSpeedMult', type: 'mult', stat: 'ultChargeSpeedMult', min: 0.01, max: 0.05, weight: 10, label: '궁극기 충전 속도' }
    ];

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

        // --- Material Check (Hardcoded for Wood items initially) ---
        if (itemId === 'wood_sword' || itemId === 'wood_armor' || itemId === 'wood_wand') {
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

        // Check for 10-level milestones (10, 20, 30, 40, 50)
        if (instance.level > oldLevel) {
            const milestones = [10, 20, 30, 40, 50];
            for (const m of milestones) {
                if (oldLevel < m && instance.level >= m) {
                    await this._unlockRandomOption(instance);
                }
            }
        }

        await DBManager.saveEquipmentInstance(instance);

        // Emit general update for real-time UI (EXP bar)
        EventBus.emit('EQUIPMENT_EXP_UPDATED', {
            instanceId,
            level: instance.level,
            exp: instance.exp,
            status: status
        });

        if (instance.level > oldLevel) {
            console.log(`[EquipmentManager] Equipment ${instanceId} leveled up: ${oldLevel} -> ${instance.level}`);
            EventBus.emit('EQUIPMENT_LEVEL_UP', { instanceId, level: instance.level });
        }

        return instance;
    }

    /**
     * Internal method to unlock a random option for a weapon.
     */
    async _unlockRandomOption(instance) {
        if (!instance.randomOptions) instance.randomOptions = [];

        // Filter pool: exclude already possessed options.
        // Also, if an element is already present, exclude all other element options to maintain balance.
        const existingIds = instance.randomOptions.map(o => o.id);
        const hasElement = instance.randomOptions.some(o => o.type === 'element');

        const pool = (instance.slot === 'armor') ? EquipmentManager.ARMOR_OPTION_POOL : EquipmentManager.WEAPON_OPTION_POOL;

        const availablePool = pool.filter(o => {
            if (existingIds.includes(o.id)) return false;
            if (hasElement && o.type === 'element') return false;
            return true;
        });

        if (availablePool.length === 0) return;

        // Weighted random selection
        const totalWeight = availablePool.reduce((sum, o) => sum + o.weight, 0);
        let random = Math.random() * totalWeight;
        let selected = availablePool[0];

        for (const opt of availablePool) {
            if (random < opt.weight) {
                selected = opt;
                break;
            }
            random -= opt.weight;
        }

        let finalOpt = { ...selected };
        if (selected.type === 'mult') {
            // Random value within range
            const val = selected.min + Math.random() * (selected.max - selected.min);
            finalOpt.value = parseFloat(val.toFixed(3)); // 3 decimal places
        }

        instance.randomOptions.push(finalOpt);

        // Specific handling for elements: set as prefix if weapon has no prefix?
        if (selected.type === 'element') {
            instance.prefix = {
                name: selected.value === 'fire' ? '불타는' : (selected.value === 'ice' ? '빙결의' : '번개의'),
                element: selected.value,
                bonusAtk: 0
            };
        }

        console.log(`[EquipmentManager] Unlocked random option for ${instance.id}:`, finalOpt);
    }

    /**
     * Calculates current stats based on level.
     */
    static ARMOR_OPTION_POOL = [
        { id: 'hp_pct', label: '최대 체력', type: 'mult', stat: 'maxHpMult', min: 0.10, max: 0.30, weight: 15 },
        { id: 'def_pct', label: '방어력', type: 'mult', stat: 'defMult', min: 0.10, max: 0.40, weight: 15 },
        { id: 'mDef_pct', label: '마법 방어력', type: 'mult', stat: 'mDefMult', min: 0.10, max: 0.40, weight: 15 },
        { id: 'castSpd_pct', label: '시전 속도', type: 'mult', stat: 'castSpdMult', min: 0.05, max: 0.20, weight: 10 },
        { id: 'ult_charge', label: '궁극기 충전 속도', type: 'mult', stat: 'ultChargeSpeedMult', min: 0.01, max: 0.05, weight: 10 },
        { id: 'fire_res', label: '불 저항력', type: 'add', stat: 'fireRes', min: 10, max: 30, weight: 10 },
        { id: 'ice_res', label: '얼음 저항력', type: 'add', stat: 'iceRes', min: 10, max: 30, weight: 10 },
        { id: 'lightning_res', label: '번개 저항력', type: 'add', stat: 'lightningRes', min: 10, max: 30, weight: 10 }
    ];

    getEffectiveStats(instance, baseItem) {
        if (!instance || !baseItem) return {};

        const stats = { ...baseItem.stats };

        // Custom logic for Wood Sword
        if (instance.itemId === 'wood_sword') {
            // "atk": 공격력 + 5 (일부러 낮게 잡음) + 레벨일 오를 때마다 공격력 + 25%
            const levelBonus = 1 + (0.25 * (instance.level - 1));
            stats.atk = Math.round(5 * levelBonus);
        }

        // Custom logic for Wood Wand
        if (instance.itemId === 'wood_wand') {
            const levelBonus = 1 + (0.25 * (instance.level - 1));
            stats.mAtk = Math.round(5 * levelBonus);
        }

        // Custom logic for Wood Armor
        if (instance.itemId === 'wood_armor') {
            const levelBonus = 1 + (0.25 * (instance.level - 1));
            stats.def = Math.round(5 * levelBonus);
            stats.mDef = Math.round(2 * levelBonus);
        }

        // Apply Random Options
        if (instance.randomOptions && Array.isArray(instance.randomOptions)) {
            instance.randomOptions.forEach(opt => {
                if (opt.type === 'mult') {
                    stats[opt.stat] = (stats[opt.stat] || 0) + opt.value;
                } else if (opt.type === 'add') {
                    stats[opt.stat] = (stats[opt.stat] || 0) + opt.value;
                }
            });
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
        if (stats.mAtk) desc += `\n- 마법 공격력: +${stats.mAtk}`;
        if (stats.def) desc += `\n- 방어력: +${stats.def}`;
        if (stats.mDef) desc += `\n- 마법 방어력: +${stats.mDef}`;

        // Random Options
        desc += `\n\n[랜덤 옵션]`;
        const optionsConfig = [10, 20, 30, 40, 50];
        optionsConfig.forEach((reqLv, idx) => {
            if (instance.level >= reqLv) {
                const opt = (instance.randomOptions && instance.randomOptions[idx]) ? instance.randomOptions[idx] : null;
                if (opt) {
                    if (opt.type === 'mult') {
                        const percent = Math.round(opt.value * 100);
                        desc += `\n- 옵션 ${idx + 1}: ${opt.label} +${percent}%`;
                    } else if (opt.type === 'add') {
                        const suffix = opt.stat.toLowerCase().includes('res') ? '%' : '';
                        desc += `\n- 옵션 ${idx + 1}: ${opt.label} +${opt.value}${suffix}`;
                    } else {
                        desc += `\n- 옵션 ${idx + 1}: ${opt.label}`;
                    }
                } else {
                    desc += `\n- 옵션 ${idx + 1}: 활성화됨 (데이터 없음)`;
                }
            } else {
                desc += `\n- 옵션 ${idx + 1}: LV.${reqLv}에 개방`;
            }
        });

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
