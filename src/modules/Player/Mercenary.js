import Phaser from 'phaser';
import HealthBar from '../UI/HealthBar.js';
import CooldownBar from '../UI/CooldownBar.js';
import EventBus from '../Events/EventBus.js';
import SpeechBubble from '../UI/SpeechBubble.js';
// partyManager will be accessed via this.scene.game.partyManager
import ItemManager from '../Core/ItemManager.js';
import CharmManager from '../Core/CharmManager.js';
import GrimoireManager from '../Core/GrimoireManager.js';
import DBManager from '../Database/DBManager.js';
import soundEffects from '../Core/SoundEffects.js';
import equipmentManager from '../Core/EquipmentManager.js';
import { MercenaryClasses, Characters } from '../Core/EntityStats.js';


/**
 * Mercenary.js
 * Base class for all party members (Warrior, Archer, etc.)
 */
export default class Mercenary extends Phaser.GameObjects.Container {
    constructor(scene, x, y, config) {
        super(scene, x, y);
        this.scene = scene;
        this.config = config;

        // Identity - Use stable ID from config for data linking
        this.id = config.id || ('unit_' + Phaser.Math.Between(1000, 9999));
        this.className = config.classId || config.id; // e.g., 'warrior'
        this.characterId = config.id; // e.g., 'aren' or 'silvi'
        this.unitName = config.name;
        this.hideInUI = config.hideInUI || false;
        this.isSummoned = config.isSummoned || false;

        // Team selection ('player' or 'enemy')
        this.team = config.team || 'player';
        console.log(`[Mercenary] Created ${this.unitName} (${this.id}) on team: ${this.team}`);

        // Stats
        this.maxHp = config.maxHp;
        this.hp = config.hp || config.maxHp;

        // Level & EXP
        this.level = config.level || 1;
        this.exp = config.exp || 0;
        this.expToNextLevel = this.calculateExpToNextLevel(this.level);

        this.atk = config.atk || 0;
        this.mAtk = config.mAtk || 0;
        this.def = config.def || 0;
        this.mDef = config.mDef || 0;
        this.fireRes = config.fireRes || 0;
        this.iceRes = config.iceRes || 0;
        this.lightningRes = config.lightningRes || 0;
        this.acc = config.acc || 100;
        this.eva = config.eva || 0;
        this.crit = config.crit || 0;
        this.ultChargeSpeed = config.ultChargeSpeed || 1.0;
        this.maxHpMult = 1.0;
        this.castSpdMult = 1.0;

        // Dynamic Buffs
        this.bonusAtk = 0;
        this.bonusMAtk = 0;
        this.bonusDR = 0;
        this.bonusCrit = 0;
        this.bonusEva = 0;
        this.bonusSpeed = 0;
        this.bonusAtkSpd = 0;
        this.bonusDef = 0;
        this.bonusMDef = 0;
        this.bonusAtkRange = 0;
        this.bonusRangeMin = 0;
        this.bonusRangeMax = 0;
        this.bonusCastSpd = 0;
        this.bonusAcc = 0;
        this.bonusFireRes = 0;
        this.bonusIceRes = 0;
        this.bonusLightningRes = 0;
        this.bonusUltChargeSpeed = 0;
        this.bonusMaxHpMult = 0;
        this.bonusCastSpdMult = 0;
        this.isTacticalCommandActive = false;
        this.isBloodRaging = false;
        this.isStunned = false;
        this.isAirborne = false;
        this.isKnockedBack = false;
        this.isShocked = false;
        this.isBurning = false;
        this.isFrozen = false;

        this.speed = config.speed || 100;
        this.atkRange = config.atkRange || 40;
        this.rangeMin = config.rangeMin || 0;
        this.rangeMax = config.rangeMax || this.atkRange;
        this.atkSpd = config.atkSpd || 1000;
        this.castSpd = config.castSpd || 1000;
        this.skill = null; // To be initialized by subclasses

        // Perk System
        this.activatedPerks = config.activatedPerks || []; // List of perk IDs

        // Ultimate System
        this.ultGauge = 0;
        this.maxUltGauge = 100;
        this.autoUlt = true; // Auto-use by default

        this.equipment = {
            weapon: config.weapon || null,
            armor: config.armor || null,
            necklace: config.necklace || null,
            ring: config.ring || null
        };
        // Merge with existing equipment from config if any
        if (config.equipment) {
            this.equipment = { ...this.equipment, ...config.equipment };
        }

        // --- Grimoire System (Messiah Grimoire) ---
        GrimoireManager.initGrimoire(this);
        // Link legacy arrays to Grimoire chapters for backward compatibility
        this.charms = this.grimoire[GrimoireManager.CHAPTERS.ACTIVE];
        this.nodeCharms = this.grimoire[GrimoireManager.CHAPTERS.TACTICAL];
        this.activatedPerks = this.grimoire[GrimoireManager.CHAPTERS.CLASS];

        // If config provided old arrays, migrate them
        if (config.charms) {
            for (let i = 0; i < Math.min(config.charms.length, 9); i++) {
                this.grimoire[GrimoireManager.CHAPTERS.ACTIVE][i] = config.charms[i];
            }
        }
        if (config.nodeCharms) {
            for (let i = 0; i < Math.min(config.nodeCharms.length, 3); i++) {
                this.grimoire[GrimoireManager.CHAPTERS.TACTICAL] = config.nodeCharms;
            }
        }

        // Apply all grimoire effects
        GrimoireManager.applyAll(this);
        if (config.activatedPerks) {
            for (let i = 0; i < Math.min(config.activatedPerks.length, 6); i++) {
                this.grimoire[GrimoireManager.CHAPTERS.CLASS][i] = config.activatedPerks[i];
            }
        }

        this.charmTimers = Array(9).fill(99999);
        this.grimoireBonuses = {
            maxHpMult: 0,
            atkMult: 0,
            mAtkMult: 0,
            defMult: 0,
            mDefMult: 0,
            fireResAdd: 0,
            iceResAdd: 0,
            lightningResAdd: 0,
            speedAdd: 0,
            critAdd: 0
        };

        // Standard Bonus Properties
        this.bonusAtk = 0;
        this.bonusMAtk = 0;
        this.bonusCrit = 0;
        this.bonusEva = 0;
        this.bonusSpeed = 0;
        this.bonusDef = 0;
        this.bonusMDef = 0;
        this.bonusAtkSpd = 0;
        this.bonusAcc = 0;
        this.bonusDR = 0;
        this.bonusCastSpd = 0;
        this.bonusRangeMin = 0;
        this.bonusRangeMax = 0;
        this.bonusAtkRange = 0;
        this.bonusUltChargeSpeed = 0;
        this.bonusMaxHpMult = 0;
        this.bonusMaxHp = 0;

        this.acc = config.acc || 100;
        this.eva = config.eva || 0;
        this.crit = config.crit || 0;

        // Stat Growth Rates & Star Multiplier
        this.starLevel = config.star || 1;
        this.starMultiplier = Math.pow(1.2, this.starLevel - 1);
        this.growth = config.growth || { maxHp: 10, atk: 2, def: 1 };


        // Check for existing state in PartyManager (Only for player team)
        if (this.team === 'player') {
            const savedState = this.scene.game.partyManager.getState(this.id);

            if (savedState) {
                this.level = savedState.level || this.level;
                this.exp = savedState.exp || this.exp;
                this.hp = savedState.hp !== undefined ? savedState.hp : this.hp;
                this.maxHp = savedState.maxHp || this.maxHp;
                this.def = savedState.def || this.def;
                this.activatedPerks = savedState.activatedPerks || this.activatedPerks || [];
                this.equipment = savedState.equipment || this.equipment;
                // Sync persistent Grimoire state
                if (savedState.grimoire) {
                    this.grimoire = savedState.grimoire;
                    this.charms = this.grimoire[GrimoireManager.CHAPTERS.ACTIVE];
                    this.nodeCharms = this.grimoire[GrimoireManager.CHAPTERS.TACTICAL];
                    this.activatedPerks = this.grimoire[GrimoireManager.CHAPTERS.CLASS];
                } else {
                    // Fallback migration for old saves
                    if (savedState.charms) this.grimoire[GrimoireManager.CHAPTERS.ACTIVE] = savedState.charms;
                    if (savedState.nodeCharms) this.grimoire[GrimoireManager.CHAPTERS.TACTICAL] = savedState.nodeCharms;
                    if (savedState.activatedPerks) this.grimoire[GrimoireManager.CHAPTERS.CLASS] = savedState.activatedPerks;
                }
                this.expToNextLevel = this.calculateExpToNextLevel(this.level);
                this.syncStatusUI();
            }
        }

        // Apply all grimoire effects (Active, Tactical, Class, Trans)
        GrimoireManager.applyAll(this);

        // Setup Physics & Rendering
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);

        this.sprite = this.scene.add.image(0, 0, config.sprite);
        const spriteSize = config.spriteSize || 64;
        const scale = config.scale || 1;
        this.sprite.setDisplaySize(spriteSize * scale, spriteSize * scale);
        this.add(this.sprite);

        const radius = config.physicsRadius || 20;
        this.body.setCircle(radius);
        this.body.setOffset(-radius, -radius);
        this.body.setCollideWorldBounds(true);

        const displayHeight = spriteSize * scale;
        this.barYOffset = displayHeight / 2 + 24;

        this.healthBar = new HealthBar(scene, this, 0, -this.barYOffset, 64, 8);
        this.cooldownBar = new CooldownBar(scene, this, 0, -(this.barYOffset - 10), 64, 4); // Placed just below HP
        // Ultimate Bar: Purple (0xbb88ff) when charging, Gold (0xffcc00) when ready
        this.ultBar = new CooldownBar(scene, this, 0, -(this.barYOffset - 16), 64, 4, 0xbb88ff, 0xffcc00); // Ultimate Bar



        // Store base scale for relative flipping (important for high-res sprites)
        this.baseScaleX = this.sprite.scaleX;
        this.baseScaleY = this.sprite.scaleY;
        this.lastScaleX = 1;
        this.lastFlipTime = 0;
        this.flipCooldown = 150; // ms

        // Shadow & Groups
        if (this.scene.fxManager) {
            this.shadow = this.scene.fxManager.createShadow(this);
        }

        // ── Idle Bob Animation ───────────────────────────────────
        // 각 유닛마다 위상(phase offset)을 랜덤으로 달리해서
        // 화면 속 캐릭터들이 다같이 오르내리지 않고 자연스럽게.
        this._idleBobTween = null;
        this._idleBobPhaseOffset = Math.random() * 1200; // 0~1200ms 랜덤 지연
        this.scene.time.delayedCall(this._idleBobPhaseOffset, () => {
            if (this.active) this.startIdleBob();
        });
        // ─────────────────────────────────────────────────────────

        this.setupBaseEventListeners();
        this.setupGrowthEventListeners();
    }

    // ================================================================
    //  Idle Bob: 살아있는 숨 쉬는 느낌의 스프라이트 상하 움직임.
    //  옥토패스 트래블러 스타일 -- 아이들 상태에서만 동작.
    //  ● 이동 중 / 공중 상태 / 스킬 시전 중에는 자동으로 멈춤.
    //  ● sprite.y만 움직이므로 HealthBar, Shadow 위치에 영향 없음.
    // ================================================================

    /**
     * Idle Bob 시작. 이미 실행 중이면 무시.
     */
    startIdleBob() {
        if (!this.sprite || !this.active || this._idleBobTween) return;
        if (this.isAirborne || this.isKnockedBack) return;

        const bobAmount = 3;    // ±3px (너무 크면 허전한 느낌)
        const bobDuration = 900; // 한 사이클 900ms = 1.1회/초

        this._idleBobTween = this.scene.tweens.add({
            targets: this.sprite,
            y: { from: 0, to: -bobAmount },
            duration: bobDuration,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
        });

        // console.log(`[IdleBob] ${this.unitName} 아이들 밥 시작 ✨`);
    }

    /**
     * Idle Bob 정지 후 sprite.y를 원위치로 복귀.
     * @param {boolean} [snapBack=true] - sprite.y를 즉시 0으로 복귀할지 여부
     */
    stopIdleBob(snapBack = true) {
        if (this._idleBobTween) {
            this._idleBobTween.stop();
            this._idleBobTween = null;
        }
        if (snapBack && this.sprite) {
            this.sprite.y = 0;
        }
    }

    setupGrowthEventListeners() {
        this._onEquipmentLevelUp = (payload) => {
            const { instanceId, level } = payload;

            // Check if this mercenary is wearing the leveled-up item
            for (const slot in this.equipment) {
                const item = this.equipment[slot];
                if (!item) continue;

                const equippedId = (typeof item === 'string') ? item : (item.instanceId || item.id);
                if (equippedId === instanceId) {
                    const baseItem = ItemManager.getItem(item.itemId || item.id);
                    if (baseItem) {
                        // 1. Update memory state
                        item.level = level;
                        item.stats = equipmentManager.getEffectiveStats(item, baseItem);

                        // 2. Log for Rule #4 (Debug)
                        console.log(`%c[Mercenary] %c${this.unitName}%c의 장비 [${baseItem.name}] 레벨업! (Lv.${level}) 능력치를 동기화합니다.`,
                            'color: #00ffcc; font-weight: bold;',
                            'color: #ffffff;',
                            'color: #00ffcc;'
                        );

                        // 3. Sync UI (effective stats)
                        this.syncStatusUI();
                    }
                    break;
                }
            }
        };

        EventBus.on('EQUIPMENT_LEVEL_UP', this._onEquipmentLevelUp);
    }

    setupBaseEventListeners() {
        // AI Commands are routed by class ID or globally
        EventBus.on(EventBus.EVENTS.AI_COMMAND, this.handleAICommand, this);
        EventBus.on(EventBus.EVENTS.AI_RESPONSE, this.handleAIResponse, this);
        EventBus.on(EventBus.EVENTS.UNIT_BARK, this.handleUnitBark, this);

        // Listen for UI toggle commands
        this.handleUltToggleAuto = (payload) => {
            if (payload.agentId === this.id) {
                this.autoUlt = payload.auto;
                console.log(`[Ultimate] ${this.unitName} auto-ult set to: ${this.autoUlt}`);
            }
        };
        EventBus.on(EventBus.EVENTS.ULT_TOGGLE_AUTO, this.handleUltToggleAuto);

        this.handleUltTrigger = (payload) => {
            if (payload.agentId === this.id) {
                this.useUltimate();
            }
        };
        EventBus.on(EventBus.EVENTS.ULT_TRIGGER, this.handleUltTrigger);

        this.handlePerkLearn = (payload) => {
            if (payload.agentId === this.id) {
                this.learnPerk(payload.perkId);
            }
        };
        EventBus.on('PERK_LEARN', this.handlePerkLearn);

        this.handleEquipRequest = async (payload) => {
            if (payload.unitId === this.id) {
                console.log(`[Mercenary] handleEquipRequest received for ${this.unitName} (${this.id})`, payload);
                let item;
                if (!payload.itemId && payload.slot) {
                    await this.unequipItem(payload.slot);
                    console.log(`[Mercenary] Unequipped slot ${payload.slot} via request`);
                    return;
                }

                if (payload.itemId && payload.itemId.startsWith('eq_')) {
                    const inst = await DBManager.getEquipmentInstance(payload.itemId);
                    if (inst) {
                        item = { ...ItemManager.getItem(inst.itemId), ...inst, instanceId: inst.id };
                    }
                } else {
                    item = ItemManager.getItem(payload.itemId);
                }

                if (item && item.type === 'equipment') {
                    // --- Toggle Unequip Logic ---
                    const currentEquipped = this.equipment[item.slot];
                    const isSameItem = currentEquipped && (
                        (item.instanceId && currentEquipped.instanceId === item.instanceId) ||
                        (!item.instanceId && currentEquipped.id === item.id)
                    );

                    if (isSameItem) {
                        await this.unequipItem(item.slot);
                        console.log(`[Mercenary] Unequipped ${item.id || item.instanceId} from ${item.slot}`);
                    } else {
                        await this.equipItem(item.slot, item);
                    }
                }
            }
        };
        EventBus.on(EventBus.EVENTS.EQUIP_REQUEST, this.handleEquipRequest);

        this.handleGrimoireRequest = async (payload) => {
            if (payload.unitId === this.id) {
                if (payload.action === 'set') {
                    await this.setGrimoireItem(payload.chapter, payload.index, payload.itemId);
                } else if (payload.action === 'remove') {
                    await this.removeGrimoireItem(payload.chapter, payload.index);
                }
            }
        };
        EventBus.on('GRIMOIRE_REQUEST', this.handleGrimoireRequest);
    }

    handleAICommand(cmd) {
        // If cmd has agentId, only process if it matches mine
        if (cmd.agentId && cmd.agentId !== this.id) return;

        const funcName = cmd.command || cmd.function || cmd.name;

        if (funcName === 'set_ai_state' || funcName === 'change_mercenary_stance') {
            const args = cmd.args || cmd.parameters || cmd;
            if (args && args.state && this.blackboard) {
                const newStance = args.state.toUpperCase();
                this.blackboard.set('ai_state', newStance);
            } else if (args && args.stance && this.blackboard) {
                const newStance = args.stance.toUpperCase();
                this.blackboard.set('ai_state', newStance);
            }
        } else if (funcName === 'attack_priority' || funcName === 'change_target_priority') {
            const args = cmd.args || cmd.parameters || cmd;
            if (args && args.role && this.blackboard) {
                const newPriority = args.role.toUpperCase();
                this.blackboard.set('target_priority', newPriority);
            } else if (args && args.priority && this.blackboard) {
                const newPriority = args.priority.toUpperCase();
                this.blackboard.set('target_priority', newPriority);
            }
        }
    }

    handleAIResponse(payload) {
        if (!this.active || !this.scene) return;
        // payload should be { agentId: '...', text: '...' }
        if (payload && typeof payload === 'object') {
            if (payload.agentId === this.id) {
                this.showSpeechBubble(payload.text);
            }
        }
    }

    handleUnitBark(payload) {
        if (!this.active || !this.scene) return;
        // payload: { agentId, characterId, unitName, text }
        if (payload && payload.characterId === this.characterId) {
            this.showSpeechBubble(payload.text);
        }
    }

    showSpeechBubble(text) {
        if (!this.active || !this.scene) return;
        if (this.currentBubble) this.currentBubble.destroy();
        this.currentBubble = new SpeechBubble(this.scene, this, text);
    }

    getEquipmentBonus(statName) {
        let total = 0;
        // 1. Regular Equipment
        for (const slot in this.equipment) {
            const item = this.equipment[slot];
            if (item && item.stats && item.stats[statName]) {
                total += item.stats[statName];
            }
        }
        // 2. Emoji Charms
        this.charms.forEach(itemId => {
            if (itemId) {
                const charm = CharmManager.getCharm(itemId);
                if (charm && charm.stats && charm.stats[statName]) {
                    total += charm.stats[statName];
                }
            }
        });
        return total;
    }

    getWeaponPrefix() {
        const weapon = this.equipment.weapon;
        return (weapon && weapon.prefix) ? weapon.prefix : null;
    }

    // --- Standardized 16 Stats Getters ---
    getTotalMaxHp() {
        const base = (this.maxHp || 100) + this.bonusMaxHp;
        const multipliers = (this.maxHpMult - 1) + (this.bonusMaxHpMult || 0) + (this.grimoireBonuses?.maxHpMult || 0);
        const petBonus = this.scene?.game?.partyManager?.getGlobalPetBonus('maxHpMult') || 0;
        const transMult = this.grimoire_transmult || 1.0;
        return Math.floor(base * (1 + multipliers + petBonus) * transMult);
    }

    getTotalAtk() {
        const base = (this.atk || 0) + this.getEquipmentBonus('atk') + (this.bonusAtk || 0);
        let multipliers = (this.getEquipmentBonus('atkMult') || 0) + (this.grimoireBonuses?.atkMult || 0);

        if (this.blackboard && this.blackboard.get('enraged_active')) {
            const missingHpRatio = 1 - (this.hp / this.getTotalMaxHp());
            multipliers += missingHpRatio * 0.15;
        }

        const transMult = this.grimoire_transmult || 1.0;
        const petBonus = this.scene?.game?.partyManager?.getGlobalPetBonus('atkMult') || 0;
        return Math.floor(base * (1 + multipliers + petBonus) * transMult);
    }

    getTotalMAtk() {
        const base = (this.mAtk || 0) + this.getEquipmentBonus('mAtk') + (this.bonusMAtk || 0);
        let multipliers = (this.getEquipmentBonus('mAtkMult') || 0) + (this.grimoireBonuses?.mAtkMult || 0);

        if (this.isTacticalCommandActive) multipliers += 0.5;

        const transMult = this.grimoire_transmult || 1.0;
        const petBonus = this.scene?.game?.partyManager?.getGlobalPetBonus('mAtkMult') || 0;
        return Math.floor(base * (1 + multipliers + petBonus) * transMult);
    }

    getTotalDef() {
        const base = (this.def || 0) + this.getEquipmentBonus('def') + (this.bonusDef || 0);
        let multipliers = (this.getEquipmentBonus('defMult') || 0) + (this.grimoireBonuses?.defMult || 0);

        if (this.blackboard && this.blackboard.get('guard_active')) multipliers += 0.1;

        return Math.floor(base * (1 + multipliers));
    }

    getTotalMDef() {
        const base = (this.mDef || 0) + this.getEquipmentBonus('mDef') + (this.bonusMDef || 0);
        let multipliers = (this.getEquipmentBonus('mDefMult') || 0) + (this.grimoireBonuses?.mDefMult || 0);
        return Math.floor(base * (1 + multipliers));
    }

    getTotalSpeed() {
        const base = (this.speed || 100) + (this.bonusSpeed || 0) + (this.grimoireBonuses?.speedAdd || 0);
        let multipliers = 0;
        if (this.grimoire_transmult) multipliers += (this.grimoire_transmult - 1);
        const petBonus = this.scene?.game?.partyManager?.getGlobalPetBonus('speedMult') || 0;
        return Math.floor(base * (1 + multipliers + petBonus));
    }

    getTotalAtkSpd() {
        const base = Math.max(100, (this.atkSpd || 1000) + this.getEquipmentBonus('atkSpd') - (this.bonusAtkSpd || 0));
        const multipliers = this.getEquipmentBonus('atkSpdMult') || 0;
        const result = base * (1 - multipliers);
        return this.isFrozen ? result * 2 : result;
    }

    getTotalCrit() {
        const base = (this.crit || 0) + this.getEquipmentBonus('crit') + (this.bonusCrit || 0) + (this.grimoireBonuses?.critAdd || 0);
        const multipliers = this.getEquipmentBonus('critMult') || 0;
        return Math.min(100, base * (1 + multipliers));
    }

    getTotalAcc() {
        const base = (this.acc || 100) + this.getEquipmentBonus('acc') + (this.bonusAcc || 0);
        const multipliers = this.getEquipmentBonus('accMult') || 0;
        return base * (1 + multipliers);
    }

    getTotalEva() {
        const base = (this.eva || 0) + this.getEquipmentBonus('eva') + (this.bonusEva || 0);
        const multipliers = this.getEquipmentBonus('evaMult') || 0;
        return base * (1 + multipliers);
    }

    getTotalAtkRange() {
        return (this.atkRange || 100) + (this.bonusAtkRange || 0);
    }

    getTotalRangeMin() {
        return Math.max(0, (this.rangeMin || 0) + (this.bonusRangeMin || 0));
    }

    getTotalRangeMax() {
        return Math.max(0, (this.rangeMax || 100) + (this.bonusRangeMax || 0));
    }

    getTotalCastSpd() {
        const base = Math.max(100, (this.castSpd || 1000) + this.getEquipmentBonus('castSpd') - (this.bonusCastSpd || 0));
        const multipliers = (this.castSpdMult - 1) + (this.bonusCastSpdMult || 0) + (this.getEquipmentBonus('castSpdMult') || 0);
        const result = base / (1 + multipliers);
        return this.isFrozen ? result * 2 : result;
    }

    getTotalFireRes() {
        return Math.min(90, (this.fireRes || 0) + (this.grimoireBonuses?.fireResAdd || 0));
    }

    getTotalIceRes() {
        return Math.min(90, (this.iceRes || 0) + (this.grimoireBonuses?.iceResAdd || 0));
    }

    getTotalLightningRes() {
        return Math.min(90, (this.lightningRes || 0) + (this.grimoireBonuses?.lightningResAdd || 0));
    }

    getTotalUltChargeSpeed() {
        const base = (this.ultChargeSpeed || 1.0) + this.getEquipmentBonus('ultChargeSpeed') + (this.bonusUltChargeSpeed || 0);
        const multipliers = this.getEquipmentBonus('ultChargeSpeedMult') || 0;
        return base * (1 + multipliers);
    }

    getTotalDR() {
        return (this.dr || 0) + (this.bonusDR || 0);
    }

    /**
     * Returns the Phaser group that contains potential targets for this unit.
     */
    get targetGroup() {
        if (!this.scene || !this.scene.scene || !this.scene.scene.isActive()) {
            return { getChildren: () => [] };
        }
        const group = (this.team === 'player') ? this.scene.enemies : this.scene.mercenaries;
        return group || { getChildren: () => [] };
    }

    /**
     * Returns the Phaser group that contains allies for this unit.
     */
    get allyGroup() {
        if (!this.scene) return { getChildren: () => [] };
        const group = (this.team === 'player') ? this.scene.mercenaries : this.scene.enemies;
        return group || { getChildren: () => [] };
    }

    /**
     * Generic summoning method.
     * @param {Class} SummonClass - The class to instantiate
     * @param {number} x - Spawn X
     * @param {number} y - Spawn Y
     * @param {Object} options - Additional config for the summon
     * @returns {Object} The spawned unit
     */
    spawnSummon(SummonClass, x, y, options = {}) {
        const summon = new SummonClass(this.scene, x, y, this, options);
        summon.isSummoned = true;
        const group = this.allyGroup;
        if (group) {
            group.add(summon);
        }
        return summon;
    }

    async equipItem(slot, itemData) {
        if (this.equipment.hasOwnProperty(slot)) {
            const oldItem = this.equipment[slot];

            // 1. If there was an old growth instance, clear its owner
            if (oldItem && oldItem.instanceId) {
                const oldInst = await DBManager.getEquipmentInstance(oldItem.instanceId);
                if (oldInst) {
                    oldInst.ownerId = null;
                    await DBManager.saveEquipmentInstance(oldInst);
                }
            }

            // 2. Set new equipment
            this.equipment[slot] = itemData;

            // 3. If new item is a growth instance, set its owner
            const newId = (typeof itemData === 'string') ? itemData : (itemData.instanceId || itemData.id);
            if (newId && typeof newId === 'string' && newId.startsWith('eq_')) {
                const newInst = await DBManager.getEquipmentInstance(newId);
                if (newInst) {
                    newInst.ownerId = this.id;
                    await DBManager.saveEquipmentInstance(newInst);
                }
            }

            this.syncStatusUI();
            EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED); // Refresh UI to hide equipped item
            return true;
        }
        return false;
    }

    async unequipItem(slot) {
        if (this.equipment.hasOwnProperty(slot)) {
            const oldItem = this.equipment[slot];

            // If it was a growth instance, clear its owner in DB
            const oldId = (typeof oldItem === 'string') ? oldItem : (oldItem.instanceId || oldItem.id);
            if (oldId && typeof oldId === 'string' && oldId.startsWith('eq_')) {
                const inst = await DBManager.getEquipmentInstance(oldId);
                if (inst) {
                    inst.ownerId = null;
                    await DBManager.saveEquipmentInstance(inst);
                }
            }

            this.equipment[slot] = null;
            this.syncStatusUI();
            EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED); // Refresh UI to show unequipped item
            return true;
        }
        return false;
    }

    async setCharm(index, itemId) {
        if (index >= 0 && index < 9) {
            // 1. Consume from inventory
            const invItem = await DBManager.getInventoryItem(itemId);
            console.log(`[Mercenary] setCharm check: itemId=${itemId}, invItem=`, invItem);

            if (!invItem || invItem.amount === undefined || invItem.amount <= 0) {
                console.warn(`[Mercenary] Not enough ${itemId} in inventory to equip. Amount: ${invItem ? invItem.amount : 'N/A'}`);
                return false;
            }

            // 2. Return old charm if any
            const oldId = this.charms[index];
            if (oldId) {
                const oldInv = await DBManager.getInventoryItem(oldId);
                await DBManager.saveInventoryItem(oldId, (oldInv ? oldInv.amount : 0) + 1);
            }

            // 3. Decrement and save
            await DBManager.saveInventoryItem(itemId, invItem.amount - 1);

            this.charms[index] = itemId;
            this.syncStatusUI();

            // Trigger UI inventory refresh
            EventBus.emit('UI_REFRESH_INVENTORY');
            return true;
        }
        return false;
    }

    async removeCharm(index) {
        if (index >= 0 && index < 9 && this.charms[index]) {
            const itemId = this.charms[index];

            // Return to inventory
            const invItem = await DBManager.getInventoryItem(itemId);
            await DBManager.saveInventoryItem(itemId, (invItem ? invItem.amount : 0) + 1);

            this.charms[index] = null;
            this.syncStatusUI();

            // Trigger UI inventory refresh
            EventBus.emit('UI_REFRESH_INVENTORY');
            return true;
        }
        return false;
    }

    /**
     * Equips a Tactical Node Charm to the 1x3 nodeCharms slots
     */
    async equipNodeCharm(itemId, index) {
        if (!itemId || index < 0 || index > 2) return false;

        // If replacing an existing node charm, return the old one back to inventory
        if (this.nodeCharms[index]) {
            await this.removeNodeCharm(index); // Use the new removeNodeCharm
        }

        // Deduct from inventory
        if (this.scene.inventory) {
            this.scene.inventory.removeItem(itemId, 1);
        } else {
            // Fallback to DBManager if inventory not available (e.g., for initial load)
            const DBManager = (await import('../Database/DBManager.js')).default;
            const invItem = await DBManager.getInventoryItem(itemId);
            if (!invItem || invItem.amount <= 0) {
                this.scene.fxManager?.showDamageText(this, 'Not enough items!', '#ff0000');
                return false;
            }
            await DBManager.saveInventoryItem(itemId, invItem.amount - 1);
        }

        // Equip the new one
        this.nodeCharms[index] = itemId;
        console.log(`[Mercenary] ${this.unitName} equipped Node Charm: ${itemId} at slot ${index}`);

        // Apply visual logic
        this.scene.fxManager?.showEmojiPopup(this, '🧠');

        // Re-inject AI Node Charms into BT dynamically
        if (this.initAI) {
            this.initAI(); // Re-build the tree with new node logic
        }

        this.syncStatusUI();
        EventBus.emit('UI_REFRESH_INVENTORY');
        return true;
    }

    /**
     * Removes a Tactical Node Charm and returns it to inventory
     */
    async removeNodeCharm(index) {
        if (index < 0 || index > 2 || !this.nodeCharms[index]) return false;

        const itemId = this.nodeCharms[index];

        // Add back to inventory
        if (this.scene.inventory) {
            this.scene.inventory.addItem(itemId, 1);
        } else {
            // Fallback to DBManager if inventory not available
            const DBManager = (await import('../Database/DBManager.js')).default;
            const invItem = await DBManager.getInventoryItem(itemId);
            await DBManager.saveInventoryItem(itemId, (invItem ? invItem.amount : 0) + 1);
        }

        console.log(`[Mercenary] ${this.unitName} removed Node Charm: ${itemId} from slot ${index}`);
        this.nodeCharms[index] = null;

        // Re-inject AI Node Charms
        if (this.initAI) {
            this.initAI();
        }

        this.syncStatusUI();
        EventBus.emit('UI_REFRESH_INVENTORY');
        return true;
    }

    takeDamage(amount, attacker = null, isUltimate = false, element = null, isCritical = false, delay = 0) {
        if (!this.active || !this.scene) return;
        if (amount <= 0 && !element) {
            return; // Ignore pure-pulse effects that deal 0 dmg
        }

        // --- 0. Accuracy vs Evasion Check ---
        const myEva = this.getTotalEva ? this.getTotalEva() : (this.eva || 0);
        if (attacker && typeof attacker === 'object' && attacker.acc !== undefined) {
            const hitChance = Math.max(0.05, Math.min(1.0, (attacker.acc - myEva) / 100.0));
            if (Math.random() > hitChance) {
                // MISS!
                if (this.scene.fxManager) {
                    this.scene.fxManager.showDamageText(this, 'MISS!', '#ffffff');
                }
                console.info(`[Combat] ${attacker.unitName || 'Enemy'} missed ${this.unitName}!`);
                return;
            }
        }

        // Gain gauge when hit (unless it's an ultimate)
        if (!isUltimate) {
            this.gainUltGauge(1);
        }

        const attackerId = (attacker && typeof attacker === 'object') ? (attacker.id || attacker.className) : attacker;

        // 1. Physical Damage is reduced by Def
        let finalDamage = Math.max(1, amount - this.getTotalDef());

        // 1.2 Elemental Resistance
        if (element) {
            let res = 0;
            if (element === 'fire') res = this.getTotalFireRes();
            else if (element === 'ice') res = this.getTotalIceRes();
            else if (element === 'lightning') res = this.getTotalLightningRes();
            finalDamage *= (1 - (res / 100));
        }

        // 1.5 Damage Reduction Buff
        if (this.bonusDR > 0) {
            finalDamage = finalDamage * (1 - this.bonusDR);
        }

        // 2. Intercept with Shield
        let damageBeforeShield = finalDamage;
        let absorbedByShield = 0;
        if (this.scene.shieldManager) {
            finalDamage = this.scene.shieldManager.takeDamage(this, finalDamage);
            absorbedByShield = damageBeforeShield - finalDamage;
        }

        // --- Growth Gear EXP ---
        const armor = this.equipment ? this.equipment.armor : null;
        if (armor) {
            const armorId = (typeof armor === 'string') ? armor : (armor.instanceId || armor.id);
            if (armorId && typeof armorId === 'string' && armorId.startsWith('eq_')) {
                equipmentManager.addExp(armorId, amount);
            }
        }

        // Record damage received for combat tracker (including what was absorbed by shield)
        if (damageBeforeShield > 0) {
            EventBus.emit(EventBus.EVENTS.COMBAT_DATA_RECORD, { type: 'received', amount: damageBeforeShield, unitId: this.id });
        }

        if (finalDamage > 0) {
            this.hp -= finalDamage;
            if (this.hp < 0) this.hp = 0;

            // --- Growth Gear Weapon EXP (for Attacker) ---
            if (attacker && typeof attacker === 'object' && attacker.team === 'player' && attacker.equipment && attacker.equipment.weapon) {
                const weapon = attacker.equipment.weapon;
                const weaponId = (typeof weapon === 'string') ? weapon : (weapon.instanceId || weapon.id);
                if (weaponId && typeof weaponId === 'string' && weaponId.startsWith('eq_')) {
                    equipmentManager.addExp(weaponId, finalDamage);
                }
            }

            // Lifesteal for Blood Rage
            if (attacker && typeof attacker === 'object' && attacker.isBloodRaging && attacker.heal) {
                attacker.heal(finalDamage * 0.35);
            }

            // Wake up from sleep on damage
            if (this.isAsleep && this.wakeUp) {
                this.wakeUp();
            }
        }

        this.updateHealthBar();

        if (this.scene.fxManager) {
            const primaryColor = isCritical ? '#ff0000' : '#ffffff'; // Mercenary Physical: White/Red
            this.scene.fxManager.showDamageText(this, finalDamage, primaryColor, isCritical, 0, delay);

            // Calculate and show Elemental Bonus Damage (Prefix)
            if (element) {
                // For synergistic hits (amount = 0), use attacker power as baseline
                const basePower = (attacker && attacker.getTotalAtk) ? attacker.getTotalAtk() : 100;
                const synergyDmg = (amount === 0) ? (basePower * 0.3) : finalDamage;
                const extraDmg = synergyDmg * (0.1 + Math.random() * 0.4);

                const elementColor = this.scene.fxManager.getElementColor(element) || '#ffffff';
                this.scene.fxManager.showDamageText(this, extraDmg, elementColor, isCritical, 30, delay);
                this.scene.fxManager.spawnElementalParticles(this.x, this.y, element);
            }
        }

        const elementTag = element ? `[${element.toUpperCase()}] ` : '';
        const shieldInfo = absorbedByShield > 0 ? ` (Shield absorbed ${absorbedByShield.toFixed(1)})` : '';
        const damageMsg = finalDamage > 0
            ? `took ${finalDamage.toFixed(1)} ${elementTag}physical damage${shieldInfo}.`
            : `completely absorbed ${elementTag}physical damage via Defense/Shield!`;

        console.log(`[Combat] ${this.unitName} ${damageMsg}`);

        this.playHitEffect();

        if (this.hp <= 0) {
            this.die();
        }
    }

    /**
     * Cleanses harmful status effects (Stun, Shock, Sleep, Burn, Freeze).
     */
    cleanse() {
        if (!this.active || this.hp <= 0) return;

        let cleansedAny = false;

        // Reset status flags
        if (this.isStunned) { this.isStunned = false; cleansedAny = true; }
        if (this.isShocked) { this.isShocked = false; cleansedAny = true; }
        if (this.isAsleep) { this.isAsleep = false; cleansedAny = true; }
        if (this.isBurning) { this.isBurning = false; cleansedAny = true; }
        if (this.isFrozen) { this.isFrozen = false; cleansedAny = true; }

        if (cleansedAny) {
            console.log(`[Status] ${this.unitName} was cleansed! ✨`);
            if (this.scene && this.scene.fxManager) {
                this.scene.fxManager.showDamageText(this, 'CLEANSED! ✨', '#ffffff');
            }
            this.restoreSpriteTint();
            this.syncStatusUI();
        }
    }

    takeMagicDamage(amount, attacker = null, isUltimate = false, element = null, isCritical = false, delay = 0) {
        if (!this.active || !this.scene) return;
        if (amount <= 0 && !element) {
            return; // Ignore pure-pulse effects that deal 0 dmg
        }

        // 1. Magic Damage is reduced by mDef
        let finalDamage = Math.max(1, amount - this.getTotalMDef());

        // 1.2 Elemental Resistance
        if (element) {
            let res = 0;
            if (element === 'fire') res = this.getTotalFireRes();
            else if (element === 'ice') res = this.getTotalIceRes();
            else if (element === 'lightning') res = this.getTotalLightningRes();
            finalDamage *= (1 - (res / 100));
        }

        // 1.5 Damage Reduction Buff
        if (this.bonusDR > 0) {
            finalDamage = finalDamage * (1 - this.bonusDR);
        }

        // 2. Intercept with Shield
        let damageBeforeShield = finalDamage;
        let absorbedByShield = 0;
        if (this.scene.shieldManager) {
            finalDamage = this.scene.shieldManager.takeDamage(this, finalDamage);
            absorbedByShield = damageBeforeShield - finalDamage;
        }

        // --- Growth Gear EXP ---
        const armor = this.equipment ? this.equipment.armor : null;
        if (armor) {
            const armorId = (typeof armor === 'string') ? armor : (armor.instanceId || armor.id);
            if (armorId && typeof armorId === 'string' && armorId.startsWith('eq_')) {
                equipmentManager.addExp(armorId, amount);
            }
        }

        // Record damage received for combat tracker (including what was absorbed by shield)
        if (damageBeforeShield > 0) {
            EventBus.emit(EventBus.EVENTS.COMBAT_DATA_RECORD, { type: 'received', amount: damageBeforeShield, unitId: this.id });
        }

        if (finalDamage > 0) {
            this.hp -= finalDamage;
            if (this.hp < 0) this.hp = 0;

            // --- Growth Gear Weapon EXP (for Attacker) ---
            if (attacker && typeof attacker === 'object' && attacker.team === 'player' && attacker.equipment && attacker.equipment.weapon) {
                const weapon = attacker.equipment.weapon;
                const weaponId = (typeof weapon === 'string') ? weapon : (weapon.instanceId || weapon.id);
                if (weaponId && typeof weaponId === 'string' && weaponId.startsWith('eq_')) {
                    equipmentManager.addExp(weaponId, finalDamage);
                }
            }

            // Lifesteal for Blood Rage
            if (attacker && typeof attacker === 'object' && attacker.isBloodRaging && attacker.heal) {
                attacker.heal(finalDamage * 0.35);
            }

            // Wake up from sleep on damage
            if (this.isAsleep && this.wakeUp) {
                this.wakeUp();
            }
        }

        // Gain gauge when hit by magic (unless it's an ultimate)
        if (!isUltimate) {
            this.gainUltGauge(1);
        }

        this.updateHealthBar();

        if (this.scene.fxManager) {
            const primaryColor = isCritical ? '#ff0000' : '#cc88ff'; // Mercenary Magic: Purple/Red
            this.scene.fxManager.showDamageText(this, finalDamage, primaryColor, isCritical, 0, delay);

            // Calculate and show Elemental Bonus Damage (Prefix)
            if (element) {
                // For synergistic hits (amount = 0), use attacker power as baseline
                const basePower = (attacker && attacker.getTotalMAtk) ? attacker.getTotalMAtk() : 100;
                const synergyDmg = (amount === 0) ? (basePower * 0.3) : finalDamage;
                const extraDmg = synergyDmg * (0.1 + Math.random() * 0.4);

                const elementColor = this.scene.fxManager.getElementColor(element) || '#ffffff';
                this.scene.fxManager.showDamageText(this, extraDmg, elementColor, isCritical, 30, delay);
                this.scene.fxManager.spawnElementalParticles(this.x, this.y, element);
            }
        }

        const elementTag = element ? `[${element.toUpperCase()}] ` : '';
        const shieldInfo = absorbedByShield > 0 ? ` (Shield absorbed ${absorbedByShield.toFixed(1)})` : '';
        const damageMsg = finalDamage > 0
            ? `took ${finalDamage.toFixed(1)} ${elementTag}magic damage${shieldInfo}.`
            : `completely absorbed ${elementTag}magic damage via MDef/Shield!`;

        console.log(`[Combat] ${this.unitName} ${damageMsg}`);

        this.playHitEffect();

        if (this.hp <= 0) {
            this.die();
        }
    }

    playHitEffect() {
        if (!this.sprite) return;

        this.scene.tweens.add({
            targets: this.sprite,
            tint: 0xff0000,
            duration: 100,
            yoyo: true,
            onComplete: () => this.restoreSpriteTint(),
            onStop: () => this.restoreSpriteTint(),
            onTerminate: () => this.restoreSpriteTint()
        });
    }

    getTotalFireRes() {
        return Math.min(75, (this.fireRes || 0) + (this.bonusFireRes || 0));
    }

    getTotalIceRes() {
        return Math.min(75, (this.iceRes || 0) + (this.bonusIceRes || 0));
    }

    getTotalLightningRes() {
        return Math.min(75, (this.lightningRes || 0) + (this.bonusLightningRes || 0));
    }

    restoreSpriteTint() {
        if (!this.sprite) return;

        if (this.isShocked) {
            this.sprite.setTint(0xffff00);
        } else if (this.isBurning) {
            this.sprite.setTint(0xffaa88);
        } else if (this.isFrozen) {
            this.sprite.setTint(0x8888ff);
        } else {
            this.sprite.clearTint();
        }
    }

    calculateExpToNextLevel(level) {
        // Simple scaling: 100, 250, 450, 700... (Level^2 * 50 + 50)
        return (level * level * 50) + 50;
    }

    addExp(amount) {
        if (!this.active || this.hp <= 0) return;

        this.exp += amount;
        console.log(`[Level] ${this.unitName} gained ${amount} EXP. (${this.exp}/${this.expToNextLevel})`);

        while (this.exp >= this.expToNextLevel && this.level < 40) {
            this.levelUp();
        }

        this.syncStatusUI();

        // Auto-save EXP and Level progress to Database (Player only)
        if (this.team === 'player' && DBManager) {
            DBManager.saveMercenaryState(this.id, this.getState());
        }
    }

    levelUp() {
        this.exp -= this.expToNextLevel;
        this.level++;
        this.expToNextLevel = this.calculateExpToNextLevel(this.level);

        // Stats increase on level up using growth rates from EntityStats.js
        // Multiplied by starMultiplier for consistent scaling with stars
        const growth = this.growth || { maxHp: 10, atk: 2, def: 1 };
        const multi = this.starMultiplier || 1.0;

        if (growth.maxHp) this.maxHp += Math.floor(growth.maxHp * multi);
        this.hp = this.maxHp;
        if (growth.atk) this.atk += growth.atk * multi;
        if (growth.mAtk) this.mAtk += growth.mAtk * multi;
        if (growth.def) this.def += growth.def * multi;
        if (growth.mDef) this.mDef += growth.mDef * multi;
        if (growth.speed) this.speed += growth.speed * multi;
        if (growth.atkSpd) this.atkSpd += growth.atkSpd * multi;
        if (growth.castSpd) this.castSpd += growth.castSpd * multi;
        if (growth.acc) this.acc += growth.acc * multi;
        if (growth.eva) this.eva += growth.eva * multi;
        if (growth.crit) this.crit += growth.crit * multi;

        console.log(`[Level] ${this.unitName} LEVELED UP to ${this.level}!`);

        if (this.scene.fxManager) {
            this.scene.fxManager.showDamageText(this, 'LEVEL UP!', '#ffff00');
        }

        EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `${this.unitName} 레벨 업! (LV ${this.level}) ✨`);
    }

    receiveHeal(amount, healerId = null) {
        // Record healing for combat tracker
        if (healerId && amount > 0) {
            EventBus.emit(EventBus.EVENTS.COMBAT_DATA_RECORD, { type: 'heal', amount: amount, unitId: healerId });
        }

        this.hp += amount;
        if (this.hp > this.maxHp) this.hp = this.maxHp;
        this.updateHealthBar();
    }

    updateHealthBar() {
        if (this.healthBar) {
            const maxHp = this.getTotalMaxHp();
            const hpPercent = (this.hp / maxHp) * 100;
            let shieldPercent = 0;

            if (this.scene && this.scene.shieldManager) {
                const shieldAmount = this.scene.shieldManager.getShield(this);
                shieldPercent = (shieldAmount / maxHp) * 100;
            }

            this.healthBar.setValue(hpPercent, shieldPercent);
        }
    }

    heal(amount, isSilent = false, healerId = null) {
        if (!this.active || this.hp <= 0 || amount <= 0) {
            return;
        }

        // Record healing for combat tracker
        if (healerId) {
            EventBus.emit(EventBus.EVENTS.COMBAT_DATA_RECORD, { type: 'heal', amount: amount, unitId: healerId });
        }

        const maxHp = this.getTotalMaxHp();
        this.hp += amount;
        if (this.hp > maxHp) this.hp = maxHp;

        this.updateHealthBar();

        if (this.scene.fxManager) {
            if (!isSilent) {
                this.scene.fxManager.showHealText(this, amount);
            }
            this.scene.fxManager.showHealEffect(this);
        }

        if (this.syncStatusUI) this.syncStatusUI();
    }

    gainUltGauge(amount) {
        if (!this.active || this.hp <= 0) return;

        const effectiveAmount = amount * this.getTotalUltChargeSpeed();
        // console.log(`[Ult Debug] ${this.unitName} gain gauge: +${effectiveAmount} (Current: ${this.ultGauge})`);
        this.ultGauge = Math.min(this.maxUltGauge, this.ultGauge + effectiveAmount);

        EventBus.emit(EventBus.EVENTS.STATUS_UPDATED, {
            agentId: this.id,
            stats: { ultGauge: this.ultGauge }
        });

        if (this.ultGauge >= this.maxUltGauge) {
            this.onUltimateReady();
        }
    }

    onUltimateReady() {
        console.log(`[Ultimate] ${this.unitName} is READY! (Auto: ${this.autoUlt}, Team: ${this.team})`);
        if (this.autoUlt) {
            this.useUltimate();
        }
    }

    useUltimate() {
        if (this.ultGauge < this.maxUltGauge) return;

        // Reset gauge first to avoid double calls
        this.ultGauge = 0;

        EventBus.emit(EventBus.EVENTS.STATUS_UPDATED, {
            agentId: this.id,
            stats: { ultGauge: this.ultGauge }
        });

        // 콰창~ 브라우저 오디오 시스템 재생 (Web Audio API)
        soundEffects.playUltimateSound();

        // Trigger the skill logic
        if (this.executeUltimate) {
            this.executeUltimate();
        } else {
            console.warn(`[Ultimate] ${this.unitName} has no ultimate implementation!`);
        }
    }

    die() {
        if (!this.active) return;

        // --- Missionary NPC Ability (Auto-Revive) ---
        const npcManager = this.scene?.game?.npcManager;
        const isMainPartyPlayer = this.team === 'player' && !this.hideInUI && !this.isSummoned;

        if (isMainPartyPlayer && npcManager && npcManager.getActiveNPC() && npcManager.getActiveNPC().id === 'MISSIONARY') {
            // NPC Abilities NOT available in Arena (정정당당 컨셉)
            if (this.scene?.scene?.key === 'ArenaScene') return;

            const missionary = npcManager.getActiveNPC();
            const stacks = missionary.stacks || 0;

            if (stacks > 0) {
                console.log(`%c[NPC] Missionary Intervention for ${this.unitName}! Stacks: ${stacks} -> ${stacks - 1}`, "color: #ff9d00; font-weight: bold;");

                // Healer Full Revive
                this.hp = this.maxHp;
                this.active = true;

                // Visual feedback
                if (this.scene.fxManager) {
                    this.scene.fxManager.spawnHolyAura(this.x, this.y);
                    this.scene.fxManager.showDamageText(this, 'REVIVED!', '#ffffff');
                }

                // Shake effect
                if (this.scene.cameras.main) {
                    this.scene.cameras.main.flash(500, 255, 215, 0, 0.3);
                }

                // Consume stack and sync UI
                npcManager.consumeStack().then(() => {
                    console.log(`[NPC] Missionary Stack Consumed. Remaining for ${this.unitName}: ${missionary.stacks}`);
                });

                // Emit sound
                soundEffects.playUltimateSound();

                this.updateHealthBar();
                return; // Exit die(), mercenary survives!
            }
        }

        // Clean up all CC visuals and timers immediately
        if (this.scene && this.scene.ccManager) {
            this.scene.ccManager.cleanUpAllCC(this);
        }

        console.error(`%c[Dead] %c${this.unitName} has been defeated!`, 'color: #ff0000; font-weight: bold;', 'color: #ffffff;');

        EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `${this.unitName}가 쓰러졌습니다! 💀`);
        EventBus.emit(EventBus.EVENTS.UNIT_DIED, this.unitName);

        if (this.healthBar) this.healthBar.destroy();
        if (this.cooldownBar) this.cooldownBar.destroy();
        if (this.ultBar) this.ultBar.destroy();
        this.destroy();
    }

    cleanse() {
        if (this.wakeUp) this.wakeUp();
        if (this._shockCleanupTimer) {
            this.isShocked = false;
            if (this.sprite) {
                this.sprite.clearTint();
                this.sprite.x = 0;
            }
            if (this._shockShakeTween) this._shockShakeTween.stop();
            if (this._shockEmitter) this._shockEmitter.destroy();
            this._shockCleanupTimer.remove();
            this._shockCleanupTimer = null;
        }
        if (this._burnCleanupTimer) {
            this.isBurning = false;
            if (this.sprite) this.sprite.clearTint();
            if (this._burnEmitter) this._burnEmitter.destroy();
            this._burnCleanupTimer.remove();
            this._burnCleanupTimer = null;
        }
        if (this._freezeCleanupTimer) {
            this.isFrozen = false;
            if (this.sprite) this.sprite.clearTint();
            if (this._freezeEmitter) this._freezeEmitter.destroy();
            this._freezeCleanupTimer.remove();
            this._freezeCleanupTimer = null;
        }
        if (this.isAirborne) this.isAirborne = false;
        if (this.isStunned) this.isStunned = false;

        if (this.syncStatusUI) this.syncStatusUI();
        console.log(`[Mercenary] ${this.unitName} has been cleansed.`);
    }

    async setGrimoireItem(chapter, index, itemId) {
        if (!this.grimoire) GrimoireManager.initGrimoire(this);

        const chapterId = (chapter === 'ACTIVE') ? GrimoireManager.CHAPTERS.ACTIVE :
            (chapter === 'TACTICAL') ? GrimoireManager.CHAPTERS.TACTICAL :
                (chapter === 'CLASS') ? GrimoireManager.CHAPTERS.CLASS :
                    GrimoireManager.CHAPTERS.TRANSFORMATION;

        // Class validation (Chapter C)
        if (chapter === 'CLASS' || chapterId === GrimoireManager.CHAPTERS.CLASS) {
            const item = ItemManager.getItem(itemId);
            if (item && item.classId && item.classId !== this.className) {
                console.warn(`[Grimoire] Class mismatch! ${itemId} requires ${item.classId}, but ${this.unitName} is ${this.className}`);
                if (this.scene.fxManager) {
                    this.scene.fxManager.showDamageText(this, 'Wrong Class!', '#ff4444');
                }
                return false;
            }
        }

        // Return old item if any
        const oldItemId = this.grimoire[chapterId][index];
        if (oldItemId && typeof oldItemId === 'string' && oldItemId.startsWith('charm_')) {
            const DBManager = (await import('../Database/DBManager.js')).default;
            const oldInst = await DBManager.getCharmInstance(oldItemId);
            if (oldInst) {
                oldInst.ownerId = null;
                await DBManager.saveCharmInstance(oldInst);
            }
        }

        this.grimoire[chapterId][index] = itemId;

        // Set ownerId for new item if it's a charm instance
        if (itemId && typeof itemId === 'string' && itemId.startsWith('charm_')) {
            const DBManager = (await import('../Database/DBManager.js')).default;
            const newInst = await DBManager.getCharmInstance(itemId);
            if (newInst) {
                newInst.ownerId = this.id;
                await DBManager.saveCharmInstance(newInst);
            }
        }

        // Re-apply grimoire effects
        GrimoireManager.applyAll(this);

        if (this.syncStatusUI) this.syncStatusUI();
        import('../Events/EventBus.js').then(module => module.default.emit('UI_REFRESH_INVENTORY'));
        console.log(`[Grimoire] ${this.unitName} set ${chapter} slot ${index} to ${itemId}`);
    }

    async removeGrimoireItem(chapter, index) {
        if (!this.grimoire) return;

        const chapterId = (chapter === 'ACTIVE') ? GrimoireManager.CHAPTERS.ACTIVE :
            (chapter === 'TACTICAL') ? GrimoireManager.CHAPTERS.TACTICAL :
                (chapter === 'CLASS') ? GrimoireManager.CHAPTERS.CLASS :
                    GrimoireManager.CHAPTERS.TRANSFORMATION;

        const oldItemId = this.grimoire[chapterId][index];
        if (oldItemId && typeof oldItemId === 'string' && oldItemId.startsWith('charm_')) {
            const DBManager = (await import('../Database/DBManager.js')).default;
            const oldInst = await DBManager.getCharmInstance(oldItemId);
            if (oldInst) {
                oldInst.ownerId = null;
                await DBManager.saveCharmInstance(oldInst);
            }
        }

        this.grimoire[chapterId][index] = null;

        // Re-apply grimoire effects
        GrimoireManager.applyAll(this);

        if (this.syncStatusUI) this.syncStatusUI();
        import('../Events/EventBus.js').then(module => module.default.emit('UI_REFRESH_INVENTORY'));
        console.log(`[Grimoire] ${this.unitName} removed ${chapter} slot ${index}`);
    }

    destroy(fromScene) {
        // Remove global event listeners to prevent memory leaks and zombie calls
        const commandEvent = (this.className === 'archer')
            ? EventBus.EVENTS.AI_COMMAND_ARCHER
            : (this.className === 'healer')
                ? EventBus.EVENTS.AI_COMMAND_HEALER
                : EventBus.EVENTS.AI_COMMAND;

        EventBus.off(commandEvent, this.handleAICommand, this);
        EventBus.off(EventBus.EVENTS.AI_RESPONSE, this.handleAIResponse, this);
        EventBus.off(EventBus.EVENTS.UNIT_BARK, this.handleUnitBark, this);
        EventBus.off(EventBus.EVENTS.ULT_TOGGLE_AUTO, this.handleUltToggleAuto);
        EventBus.off(EventBus.EVENTS.ULT_TRIGGER, this.handleUltTrigger);
        EventBus.off('PERK_LEARN', this.handlePerkLearn);
        EventBus.off('GRIMOIRE_REQUEST', this.handleGrimoireRequest);
        if (this._onEquipmentLevelUp) {
            EventBus.off('EQUIPMENT_LEVEL_UP', this._onEquipmentLevelUp);
        }

        console.log(`[Mercenary] Cleaned up listeners for ${this.unitName}(${this.characterId})`);

        super.destroy(fromScene);
    }

    update(time, delta) {
        if (!this.scene || !this.scene.scene || !this.scene.scene.isActive()) {
            console.warn(`[ZombieKiller] Destroying ${this.unitName} (Scene inactive)`);
            this.destroy();
            return;
        }

        // --- Charm Effects ---
        this.updateCharmEffects(delta);

        if (this.isAirborne || this.isStunned || this.isAsleep) {
            // Can't act while CC'd. Keep velocity at 0
            if (this.body && !this.isKnockedBack) {
                this.body.setVelocity(0, 0);
            }
            // Update bars even while CC'd
            this.updateBars();
            return;
        } else if (this.btManager) {
            this.btManager.step();
        }

        if (!this.active || !this.scene) return;

        this.updateBars();
        this.updateVisualOrientation();
    }

    updateBars() {
        if (this.cooldownBar) {
            if (this.getSkillProgress) {
                this.cooldownBar.setValue(this.getSkillProgress());
            } else {
                this.cooldownBar.setValue(0);
            }
        }
        if (this.ultBar) {
            this.ultBar.setValue(this.ultGauge / this.maxUltGauge);
        }
    }

    updateCharmEffects(delta) {
        // [Passive Refactor] Chapter A charms are now passive and don't require periodic execution.
        // Keeping this method as a stub for future periodic effects (Chapter B/C if needed).
        return;
    }

    updateVisualOrientation() {
        if (!this.body || !this.sprite) return;

        const vx = this.body.velocity.x;
        let targetScaleX = this.lastScaleX;

        // Increased threshold to prevent jittering during repulsion
        if (vx > 10) {
            targetScaleX = -1; // Moving Right -> Flip (since default is Left)
        } else if (vx < -10) {
            targetScaleX = 1; // Moving Left -> Normal
        }

        if (targetScaleX !== this.lastScaleX) {
            const now = this.scene.time.now;
            if (now - this.lastFlipTime > this.flipCooldown) {
                this.lastScaleX = targetScaleX;
                this.lastFlipTime = now;
                // Quick flip tween (relative to base scale)
                this.sprite.scaleX = targetScaleX * this.baseScaleX;
            }
        }
    }

    /**
     * Hook called after a skill is executed.
     * @param {Object} skill The skill instance that was executed
     */
    onSkillExecuted(skill) {
        // To be overridden by subclasses (e.g. Wizard for Arcane Surge)
    }

    getStatuses() {
        const statuses = [];

        // 1. Check Crowd Control
        if (this.isAirborne) {
            statuses.push({
                name: '에어본 (Airborne)',
                description: '공중에 떠올라 행동할 수 없습니다.',
                emoji: '🌪️',
                category: 'status'
            });
        }
        if (this.isStunned) {
            statuses.push({
                name: '기절 (Stunned)',
                description: '기동 불능 상태입니다.',
                emoji: '💫',
                category: 'status'
            });
        }
        if (this.isKnockedBack) {
            statuses.push({
                name: '넉백 (Knockback)',
                description: '뒤로 밀려나고 있습니다.',
                emoji: '💨',
                category: 'status'
            });
        }
        if (this.isShocked) {
            statuses.push({
                name: '감전 (Shock)',
                description: '전기 충격으로 인해 기본 공격이 불가능합니다.',
                emoji: '⚡',
                category: 'status'
            });
        }
        if (this.isAsleep) {
            statuses.push({
                name: '수면 (Sleep)',
                description: '잠들어서 행동할 수 없습니다. 피해를 입으면 깨어납니다.',
                emoji: '💤',
                category: 'status'
            });
        }
        if (this.isBurning) {
            statuses.push({
                name: '화상 (Burn)',
                description: '매초 최대 체력의 2%에 해당하는 피해를 입습니다.',
                emoji: '🔥',
                category: 'status'
            });
        }
        if (this.isFrozen) {
            statuses.push({
                name: '동결 (Freeze)',
                description: '공격 속도와 이동 속도가 50% 감소합니다.',
                emoji: '❄️',
                category: 'status'
            });
        }
        if (this.isBloodRaging) {
            statuses.push({
                name: '피의 갈망 (Blood Rage)',
                description: '공격력/이속 상승, 피해량 흡혈.',
                emoji: '🩸',
                category: 'buff'
            });
        }
        if (this.isHolyAuraActive) {
            statuses.push({
                name: '홀리 오라 (Holy Aura)',
                description: '신성한 기운으로 주변 아군의 체력을 지속 회복시킵니다.',
                emoji: '✨',
                category: 'buff'
            });
        }
        if (this.isTacticalCommandActive) {
            statuses.push({
                name: '전술 지휘 (Tactical Command)',
                description: '기본 공격/마법/회복 위력이 50% 증가합니다.',
                emoji: '📢',
                category: 'buff'
            });
        }

        // 1.2 Node Charm Buffs (Tactical AI Effects)
        if (this.blackboard) {
            if (this.blackboard.get('enraged_active')) {
                statuses.push({
                    name: '분노 (Enraged)',
                    description: '가장 가까운 적 추적 및 잃은 체력 비례 공격력 상승',
                    emoji: '😠',
                    category: 'buff'
                });
            }
            if (this.blackboard.get('blood_active')) {
                statuses.push({
                    name: '피냄새 (Blood Scent)',
                    description: '추격 시 이동 속도 대폭 증가',
                    emoji: '😡',
                    category: 'buff'
                });
            }
            if (this.blackboard.get('guard_active')) {
                statuses.push({
                    name: '경호원 (Bodyguard)',
                    description: '아군 호위 중이며 방어력 10% 증가',
                    emoji: '😎',
                    category: 'buff'
                });
            }
        }

        // 1.1 Custom Character Statuses (Passives/Perks)
        const customStatuses = this.getCustomStatuses();
        if (customStatuses && customStatuses.length > 0) {
            statuses.push(...customStatuses);
        }

        // 2. Check Shields
        if (this.scene.shieldManager && this.scene.shieldManager.getShield(this) > 0) {
            const shieldAmt = this.scene.shieldManager.getShield(this);
            statuses.push({
                name: '보호막 (Shield)',
                description: `피해를 흡수합니다. (${shieldAmt.toFixed(0)})`,
                emoji: '🛡️',
                category: 'status'
            });
        }

        // 3. Check Buffs
        if (this.scene.buffManager) {
            const myBuffs = this.scene.buffManager.activeBuffs.filter(b => b.target === this);
            myBuffs.forEach(buff => {
                let desc = '';
                if (buff.amountAtk > 0 || buff.amountMAtk > 0) {
                    desc = `공격력 + ${buff.amountAtk}, 마법공격력 + ${buff.amountMAtk} `;
                }
                if (buff.amountDR > 0) {
                    desc += (desc ? ', ' : '') + `피해 감소 + ${(buff.amountDR * 100).toFixed(0)}% `;
                }

                let emoji = '💪';
                if (buff.type === 'Stone Skin') emoji = '🪨';

                statuses.push({
                    name: `${buff.type} (버프)`,
                    description: desc,
                    emoji: emoji,
                    category: 'buff'
                });
            });
        }

        // Messiah: Encouragement check
        if (this.messiahEncouragementAmount > 0) {
            statuses.push({
                name: '메시아의 격려 (Boon)',
                description: `메시아의 가호로 인해 공격력과 마법공격력이 증가했습니다! (+${this.messiahEncouragementAmount.toFixed(1)} ATK/mATK)`,
                emoji: '✨',
                category: 'buff'
            });
        }

        return statuses;
    }

    syncStatusUI() {
        if (!this.active || this.hp <= 0) return;

        // 1. Stat Sanitization - Prevent "Stat Explosion" by ensuring base stats are within theoretical limits
        // This is a safety measure requested for all classes.
        this.sanitizeStats();

        const statuses = this.getStatuses();

        const icon_atk_spd = (this.atkSpd / 1000).toFixed(1) + 's';

        const stats = {
            level: this.level,
            exp: this.exp,
            expToNextLevel: this.expToNextLevel,
            hp: this.hp,
            maxHp: this.maxHp,
            atk: this.getTotalAtk(),
            mAtk: this.getTotalMAtk(),
            def: this.getTotalDef(),
            mDef: this.getTotalMDef(),
            speed: this.speed,
            atkSpd: icon_atk_spd,
            atkRange: this.atkRange,
            rangeMin: this.rangeMin,
            rangeMax: this.rangeMax,
            castSpd: this.castSpd,
            acc: this.acc,
            eva: this.eva,
            crit: this.getTotalCrit(),
            fireRes: this.fireRes + (this.bonusFireRes || 0),
            iceRes: this.iceRes + (this.bonusIceRes || 0),
            lightningRes: this.lightningRes + (this.bonusLightningRes || 0),
            ultChargeSpeed: this.getTotalUltChargeSpeed(),
            className: this.className,
            classId: this.className,
            characterId: this.characterId,
            activatedPerks: this.activatedPerks
        };

        // Proactive Sanity Check: Remove any equipment that no longer exists in the database (e.g., deleted test items)
        if (this.equipment) {
            Object.keys(this.equipment).forEach(slot => {
                const item = this.equipment[slot];
                if (item && item !== 'Empty') {
                    // Fix: Use item.itemId for growth instances to check against ItemManager
                    const baseId = (typeof item === 'string' ? item : (item.itemId || item.id));
                    if (!ItemManager.getItem(baseId)) {
                        console.warn(`[Mercenary] Auto-unequipping obsolete item from ${slot}: ${baseId}`);
                        this.equipment[slot] = null;
                    }
                }
            });
        }

        EventBus.emit(EventBus.EVENTS.STATUS_UPDATED, {
            agentId: this.id,
            statuses: statuses,
            equipment: this.equipment,
            grimoire: this.grimoire, // Send full Grimoire instead of just legacy parts
            stats: stats
        });

        // Save to PartyManager for persistent state linking (Only for player team)
        if (this.team === 'player') {
            // FIX: DO NOT spread 'stats' here. Only save base state to prevent derived stats 
            // from being saved as base stats (the "Stat Explosion" bug).
            this.scene?.game?.partyManager?.saveState(this.id, this.getState());
        }
    }

    /**
     * Safety Measure: Validates current base stats against theoretical maximums.
     * Resets corrupted stats to sane values derived from Level, Class info, and Star Rank.
     */
    sanitizeStats() {
        // Only run for player mercenaries to prevent save corruption
        if (this.team !== 'player' || !this.active) return;

        // Retrieve theoretical base values from EntityStats for comparison
        const classConfig = MercenaryClasses[this.className.toUpperCase()];
        const charConfig = Characters[this.characterId.toUpperCase()];

        if (!classConfig) return;

        // Determine correct base stats (Character override OR Class base)
        const getBase = (stat) => (charConfig && charConfig[stat] !== undefined) ? charConfig[stat] : classConfig[stat];

        const baseMaxHp = getBase('maxHp') || 100;
        const baseAtk = getBase('atk') || 10;
        const baseDef = getBase('def') || 5;
        const baseMDef = getBase('mDef') || 5;
        const baseMAtk = getBase('mAtk') || 5;
        const baseSpeed = getBase('speed') || 100;
        const baseAcc = getBase('acc') || 90;
        const baseEva = getBase('eva') || 5;
        const baseCrit = getBase('crit') || 5;

        const growth = charConfig?.growth || classConfig.growth || { maxHp: 10, atk: 2, def: 1 };
        const multi = this.starMultiplier || 1.0;
        const levelFactor = this.level - 1;

        // Theoretical maximums (no bonus multipliers included)
        const expectedMaxHp = baseMaxHp + (Math.floor((growth.maxHp || 0) * multi) * levelFactor);
        const expectedDef = baseDef + ((growth.def || 0) * multi * levelFactor);
        const expectedAtk = baseAtk + ((growth.atk || 0) * multi * levelFactor);
        const expectedMDef = baseMDef + ((growth.mDef || 0) * multi * levelFactor);
        const expectedMAtk = baseMAtk + ((growth.mAtk || 0) * multi * levelFactor);
        const expectedSpeed = baseSpeed + ((growth.speed || 0) * multi * levelFactor);
        const expectedAcc = baseAcc + ((growth.acc || 0) * multi * levelFactor);
        const expectedEva = baseEva + ((growth.eva || 0) * multi * levelFactor);
        const expectedCrit = baseCrit + ((growth.crit || 0) * multi * levelFactor);

        // Allow a small margin (5%) for floating point drift, but anything significantly higher is corruption
        const margin = 1.05;
        let corrected = false;

        const checkAndFix = (statName, current, expected) => {
            if (current > expected * margin) {
                console.warn(`%c[Stat-Sanitizer] %c${this.unitName}%c의 ${statName.toUpperCase()} 수치 오염 감지(${current.toFixed(1)} > Max ${expected.toFixed(1)}). 정상 수치로 복구합니다.`,
                    'color: #ff9d00; font-weight: bold;', 'color: #ffffff;', 'color: #ff9d00;');
                this[statName] = expected;
                corrected = true;
            }
        };

        checkAndFix('maxHp', this.maxHp, expectedMaxHp, true);
        checkAndFix('def', this.def, expectedDef);
        checkAndFix('atk', this.atk, expectedAtk);
        checkAndFix('mDef', this.mDef, expectedMDef);
        checkAndFix('mAtk', this.mAtk, expectedMAtk);
        checkAndFix('speed', this.speed, expectedSpeed);
        checkAndFix('acc', this.acc, expectedAcc);
        checkAndFix('eva', this.eva, expectedEva);
        checkAndFix('crit', this.crit, expectedCrit);

        if (corrected) {
            if (this.hp > this.maxHp) this.hp = this.maxHp;
            this.scene?.game?.partyManager?.saveState(this.id, this.getState());
        }
    }

    /**
     * @returns {Object} JSON-serializable snapshot of logical combat state
     */
    getState() {
        return {
            id: this.id,
            className: this.className,
            classId: this.className, // Add classId for UI compatibility
            characterId: this.characterId,
            hideInUI: !!this.config.hideInUI,
            unitName: this.unitName,
            x: this.x,
            y: this.y,
            hp: this.hp,
            maxHp: this.getTotalMaxHp(),
            level: this.level,
            exp: this.exp,
            atk: this.getTotalAtk(),
            mAtk: this.getTotalMAtk(),
            def: this.getTotalDef(),
            mDef: this.getTotalMDef(),
            speed: this.getTotalSpeed(),
            atkSpd: this.getTotalAtkSpd(),
            castSpd: this.getTotalCastSpd(),
            atkRange: this.getTotalAtkRange(),
            rangeMin: this.rangeMin,
            rangeMax: this.rangeMax,
            acc: this.getTotalAcc(),
            eva: this.getTotalEva(),
            crit: this.getTotalCrit(),
            ultChargeSpeed: this.getTotalUltChargeSpeed(),
            fireRes: this.getTotalFireRes(),
            iceRes: this.getTotalIceRes(),
            lightningRes: this.getTotalLightningRes(),
            activatedPerks: this.activatedPerks,
            equipment: this.equipment,
            grimoire: this.grimoire,
            charms: this.charms,
            nodeCharms: this.nodeCharms,
            // Logic flags
            isAirborne: !!this.isAirborne,
            isStunned: !!this.isStunned,
            isKnockedBack: !!this.isKnockedBack,
            isShocked: !!this.isShocked,
            isAsleep: !!this.isAsleep
        };
    }

    /**
     * @param {Object} stateData - The snapshot from Headless Worker to apply
     */
    applyState(stateData) {
        if (!stateData) return;

        // Visual position update
        if (stateData.x !== undefined && stateData.y !== undefined) {
            this.setPosition(stateData.x, stateData.y);
            if (this.body) {
                this.body.reset(stateData.x, stateData.y);
            }
        }

        // Logical state update
        if (stateData.hp !== undefined) this.hp = stateData.hp;

        // Usually buffs/flags fade out or remain, depending on implementation
        if (stateData.isAirborne !== undefined) this.isAirborne = stateData.isAirborne;
        if (stateData.isStunned !== undefined) this.isStunned = stateData.isStunned;
        if (stateData.isKnockedBack !== undefined) this.isKnockedBack = stateData.isKnockedBack;
        if (stateData.isShocked !== undefined) this.isShocked = stateData.isShocked;
        if (stateData.isAsleep !== undefined) this.isAsleep = stateData.isAsleep;

        this.updateHealthBar();
        this.syncStatusUI();
    }

    /**
     * Hook for subclasses to return custom status objects for the Chat UI.
     * @returns {Array} Array of status objects { name, description, emoji, category }
     */
    getCustomStatuses() {
        return [];
    }
}
