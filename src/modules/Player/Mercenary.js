import Phaser from 'phaser';
import HealthBar from '../UI/HealthBar.js';
import CooldownBar from '../UI/CooldownBar.js';
import EventBus from '../Events/EventBus.js';
import SpeechBubble from '../UI/SpeechBubble.js';
import partyManager from '../Core/PartyManager.js';
import ItemManager from '../Core/ItemManager.js';

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
        this.perkPoints = config.perkPoints !== undefined ? config.perkPoints : 1;
        this.activatedPerks = config.activatedPerks || []; // List of perk IDs

        // Ultimate System
        this.ultGauge = 0;
        this.maxUltGauge = 100;
        this.autoUlt = true; // Auto-use by default

        this.equipment = {
            weapon: null,
            armor: null,
            accessory: null
        };

        this.acc = config.acc || 100;
        this.eva = config.eva || 0;
        this.crit = config.crit || 0;

        // Check for existing state in PartyManager (Only for player team)
        if (this.team === 'player') {
            const savedState = partyManager.getState(this.id);
            if (savedState) {
                console.log(`[Mercenary] Loading persistent state for ${this.unitName} (${this.id})`, savedState);
                this.level = savedState.level || this.level;
                this.exp = savedState.exp || this.exp;
                this.hp = savedState.hp !== undefined ? savedState.hp : this.hp;
                this.maxHp = savedState.maxHp || this.maxHp;
                this.def = savedState.def || this.def;
                this.perkPoints = savedState.perkPoints !== undefined ? savedState.perkPoints : (this.perkPoints || 1);
                this.activatedPerks = savedState.activatedPerks || this.activatedPerks || [];
                this.equipment = savedState.equipment || this.equipment;
                this.expToNextLevel = this.calculateExpToNextLevel(this.level);
            }
        }

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

        this.healthBar = new HealthBar(scene, x, y - this.barYOffset, 64, 8);
        this.cooldownBar = new CooldownBar(scene, x, y - (this.barYOffset - 10), 64, 4); // Placed just below HP
        this.ultBar = new CooldownBar(scene, x, y - (this.barYOffset - 16), 64, 4); // Ultimate Bar

        this.aiDebugText = this.scene.add.text(0, -(this.barYOffset + 14), '', {
            fontSize: '12px',
            fill: '#ffffff',
            backgroundColor: '#000000aa',
            padding: { x: 2, y: 1 }
        }).setOrigin(0.5);
        this.add(this.aiDebugText);

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

        this.setupBaseEventListeners();
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

        this.handleEquipRequest = (payload) => {
            if (payload.unitId === this.id) {
                const item = ItemManager.getItem(payload.itemId);
                if (item && item.type === 'equipment') {
                    this.equipItem(item.slot, item);
                }
            }
        };
        EventBus.on(EventBus.EVENTS.EQUIP_REQUEST, this.handleEquipRequest);
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
        for (const slot in this.equipment) {
            const item = this.equipment[slot];
            if (item && item.stats && item.stats[statName]) {
                total += item.stats[statName];
            }
        }
        return total;
    }

    getWeaponPrefix() {
        const weapon = this.equipment.weapon;
        return (weapon && weapon.prefix) ? weapon.prefix : null;
    }

    getTotalAtk() {
        const base = this.atk + (this.bonusAtk || 0) + this.getEquipmentBonus('atk');
        let final = this.isTacticalCommandActive ? base * 1.5 : base;
        return final;
    }

    getTotalMAtk() {
        const base = this.mAtk + (this.bonusMAtk || 0) + this.getEquipmentBonus('mAtk');
        let final = this.isTacticalCommandActive ? base * 1.5 : base;
        return final;
    }

    getTotalCrit() {
        return this.crit + (this.bonusCrit || 0);
    }

    getTotalDef() {
        return this.def + (this.bonusDef || 0);
    }

    getTotalEva() {
        return this.eva + (this.bonusEva || 0);
    }

    getTotalSpeed() {
        const base = this.speed + (this.bonusSpeed || 0);
        return this.isFrozen ? base * 0.5 : base;
    }

    getTotalMDef() {
        return this.mDef + (this.bonusMDef || 0);
    }

    getTotalAtkSpd() {
        // Lower is faster
        const base = Math.max(100, this.atkSpd - (this.bonusAtkSpd || 0));
        return this.isFrozen ? base * 2 : base;
    }

    getTotalAtkRange() {
        return this.atkRange + (this.bonusAtkRange || 0);
    }

    getTotalRangeMin() {
        return Math.max(0, this.rangeMin + (this.bonusRangeMin || 0));
    }

    getTotalRangeMax() {
        return Math.max(0, this.rangeMax + (this.bonusRangeMax || 0));
    }

    getTotalCastSpd() {
        const base = Math.max(100, this.castSpd - (this.bonusCastSpd || 0));
        return this.isFrozen ? base * 2 : base;
    }

    getTotalDR() {
        return (this.dr || 0) + (this.bonusDR || 0);
    }

    getTotalAcc() {
        return this.acc + (this.bonusAcc || 0);
    }

    /**
     * Returns the Phaser group that contains potential targets for this unit.
     */
    get targetGroup() {
        if (!this.scene || !this.scene.scene || !this.scene.scene.isActive()) {
            return null;
        }
        return (this.team === 'player') ? this.scene.enemies : this.scene.mercenaries;
    }

    /**
     * Returns the Phaser group that contains allies for this unit.
     */
    get allyGroup() {
        if (!this.scene) return null;
        return (this.team === 'player') ? this.scene.mercenaries : this.scene.enemies;
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
        const group = this.allyGroup;
        if (group) {
            group.add(summon);
        }
        return summon;
    }

    equipItem(slot, itemData) {
        if (this.equipment.hasOwnProperty(slot)) {
            this.equipment[slot] = itemData;
            this.syncStatusUI();
            return true;
        }
        return false;
    }

    unequipItem(slot) {
        if (this.equipment.hasOwnProperty(slot)) {
            this.equipment[slot] = null;
            this.syncStatusUI();
            return true;
        }
        return false;
    }

    takeDamage(amount, attacker = null, isUltimate = false, element = null, isCritical = false, delay = 0) {
        if (!this.active || !this.scene) return;

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
        if (this.scene.shieldManager) {
            finalDamage = this.scene.shieldManager.takeDamage(this, finalDamage);
        }

        if (finalDamage > 0) {
            this.hp -= finalDamage;
            if (this.hp < 0) this.hp = 0;

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

        console.info(`[Combat] ${this.unitName} took ${finalDamage.toFixed(1)} physical damage.`);

        this.playHitEffect();

        if (this.hp <= 0) {
            this.die();
        }
    }

    takeMagicDamage(amount, attacker = null, isUltimate = false, element = null, isCritical = false, delay = 0) {
        if (!this.active || !this.scene) return;

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
        if (this.scene.shieldManager) {
            finalDamage = this.scene.shieldManager.takeDamage(this, finalDamage);
        }

        if (finalDamage > 0) {
            this.hp -= finalDamage;
            if (this.hp < 0) this.hp = 0;

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

        console.info(`[Combat] ${this.unitName} took ${finalDamage.toFixed(1)} magic damage.`);

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
    }

    levelUp() {
        this.exp -= this.expToNextLevel;
        this.level++;
        this.expToNextLevel = this.calculateExpToNextLevel(this.level);

        // Stats increase on level up
        this.maxHp += 10;
        this.hp = this.maxHp;
        this.atk += 2;
        this.def += 1;

        // Perk points every 5 levels
        if (this.level % 5 === 0) {
            this.perkPoints += 1;
            console.log(`[Level] ${this.unitName} gained a Perk Point! Total: ${this.perkPoints}`);
        }

        console.log(`[Level] ${this.unitName} LEVELED UP to ${this.level}!`);

        if (this.scene.fxManager) {
            this.scene.fxManager.showDamageText(this, 'LEVEL UP!', '#ffff00');
        }

        EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `${this.unitName} 레벨 업! (LV ${this.level}) ✨`);
    }

    receiveHeal(amount) {
        this.hp += amount;
        if (this.hp > this.maxHp) this.hp = this.maxHp;
        this.updateHealthBar();
    }

    updateHealthBar() {
        if (this.healthBar) {
            const hpPercent = (this.hp / this.maxHp) * 100;
            let shieldPercent = 0;

            if (this.scene && this.scene.shieldManager) {
                const shieldAmount = this.scene.shieldManager.getShield(this);
                shieldPercent = (shieldAmount / this.maxHp) * 100;
            }

            this.healthBar.setValue(hpPercent, shieldPercent);
        }
    }

    heal(amount) {
        if (!this.active || this.hp <= 0 || amount <= 0) return;

        this.hp += amount;
        if (this.hp > this.maxHp) this.hp = this.maxHp;

        this.updateHealthBar();

        if (this.scene.fxManager) {
            this.scene.fxManager.showDamageText(this, '+' + amount.toFixed(0), '#00ff00');
        }

        if (this.syncStatusUI) this.syncStatusUI();
    }

    gainUltGauge(amount) {
        if (!this.active || this.hp <= 0) return;

        // console.log(`[Ult Debug] ${this.unitName} gain gauge: +${amount} (Current: ${this.ultGauge})`);
        this.ultGauge = Math.min(this.maxUltGauge, this.ultGauge + amount);

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

        // Trigger the skill logic
        if (this.executeUltimate) {
            this.executeUltimate();
        } else {
            console.warn(`[Ultimate] ${this.unitName} has no ultimate implementation!`);
        }
    }

    learnPerk(perkId) {
        if (this.perkPoints <= 0) return;
        if (this.activatedPerks.includes(perkId)) return;

        this.perkPoints -= 1;
        this.activatedPerks.push(perkId);
        console.log(`[Perk] ${this.unitName} learned perk: ${perkId}. Remaining points: ${this.perkPoints}`);

        if (this.scene.fxManager) {
            this.scene.fxManager.showDamageText(this, 'PERK ACTIVATED!', '#ffcc00');
        }

        this.syncStatusUI();
    }

    die() {
        if (!this.active) return;

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

        console.log(`[Mercenary] Cleaned up listeners for ${this.unitName}(${this.characterId})`);

        super.destroy(fromScene);
    }

    update() {
        if (!this.scene || !this.scene.scene || !this.scene.scene.isActive()) {
            console.warn(`[ZombieKiller] Destroying ${this.unitName} (Scene inactive)`);
            this.destroy();
            return;
        }

        // Burn DOT: 2% Max HP per second
        if (this.isBurning) {
            const dotValue = (this.maxHp * 0.02) * (this.scene.game.loop.delta / 1000);
            this.hp -= dotValue;
            if (this.hp < 0) this.hp = 0;
            this.updateHealthBar();

            // Subtle damage text or omit to prevent spam? 
            // Let's do it every 1s visually if needed, but for now just HP reduction.
            if (this.hp <= 0) this.die();
        }

        if (this.isAirborne || this.isStunned || this.isAsleep) {
            // Can't act while CC'd. Keep velocity at 0 unless knocked back (if applicable)
            this.body.setVelocity(0, 0);
            return; // Early return to block BT and orientation
        } else if (this.btManager) {
            this.btManager.step();
        }
        if (this.healthBar) {
            this.healthBar.setPos(this.x, this.y - this.barYOffset);
        }
        if (this.cooldownBar) {
            this.cooldownBar.setPos(this.x, this.y - (this.barYOffset - 10));
            if (this.getSkillProgress) {
                this.cooldownBar.setValue(this.getSkillProgress());
            } else {
                this.cooldownBar.setValue(0); // Empty if no skill
            }
        }
        if (this.ultBar) {
            this.ultBar.setPos(this.x, this.y - (this.barYOffset - 16));
            this.ultBar.setValue(this.ultGauge / this.maxUltGauge);
        }
        if (this.btManager && this.aiDebugText) {
            this.aiDebugText.setText(this.btManager.lastActiveNodeName || 'No Name');
        } else if (this.aiDebugText) {
            this.aiDebugText.setText('NO BT');
        }

        this.updateVisualOrientation();
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

    syncStatusUI() {
        if (!this.active || this.hp <= 0) return;

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

        // 1.1 Custom Character Statuses (like Perks or Transformation)
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
                if (buff.type === 'Stone Skin') {
                    emoji = '🪨';
                }

                statuses.push({
                    name: `${buff.type} (버프)`,
                    description: desc,
                    emoji: emoji,
                    category: 'buff'
                });
            });
        }

        // 3. Check Debuffs (Future-proofing)
        // ...

        const icon_atk_spd = (this.atkSpd / 1000).toFixed(1) + 's';

        const stats = {
            level: this.level,
            exp: this.exp,
            expToNextLevel: this.expToNextLevel,
            hp: this.hp,
            maxHp: this.maxHp,
            atk: this.getTotalAtk(),
            mAtk: this.getTotalMAtk(),
            def: this.def,
            mDef: this.mDef,
            speed: this.speed,
            atkSpd: icon_atk_spd,
            atkRange: this.atkRange,
            rangeMin: this.rangeMin,
            rangeMax: this.rangeMax,
            castSpd: this.castSpd,
            acc: this.acc,
            eva: this.eva,
            crit: this.getTotalCrit(),
            perkPoints: this.perkPoints,
            activatedPerks: this.activatedPerks
        };

        EventBus.emit(EventBus.EVENTS.STATUS_UPDATED, {
            agentId: this.id,
            statuses: statuses,
            equipment: this.equipment,
            stats: stats
        });

        // Save to PartyManager for persistent state linking (Only for player team)
        if (this.team === 'player') {
            partyManager.saveState(this.id, {
                ...this.getState(),
                ...stats
            });
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
            maxHp: this.maxHp,
            atk: this.atk,
            mAtk: this.mAtk,
            def: this.def,
            mDef: this.mDef,
            speed: this.speed,
            atkSpd: this.atkSpd,
            castSpd: this.castSpd,
            atkRange: this.atkRange,
            rangeMin: this.rangeMin,
            rangeMax: this.rangeMax,
            acc: this.acc,
            eva: this.eva,
            crit: this.crit,
            perkPoints: this.perkPoints,
            activatedPerks: this.activatedPerks,
            equipment: this.equipment,
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
