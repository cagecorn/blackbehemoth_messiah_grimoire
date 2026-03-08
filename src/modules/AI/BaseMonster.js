import Phaser from 'phaser';
import HealthBar from '../UI/HealthBar.js';
import EventBus from '../Events/EventBus.js';
import CharmManager from '../Core/CharmManager.js';
import GrimoireManager from '../Core/GrimoireManager.js';
import equipmentManager from '../Core/EquipmentManager.js';
import DBManager from '../Database/DBManager.js';

/**
 * BaseMonster.js
 * Base class for all enemies (Goblin, Slime, etc.)
 */
export default class BaseMonster extends Phaser.GameObjects.Container {
    constructor(scene, x, y, config, target) {
        super(scene, x, y);
        this.scene = scene;
        this.config = config;
        this.target = target; // Usually the Warrior

        // Identity
        this.id = config.id + '_' + Phaser.Math.Between(1000, 9999);
        this.baseId = config.id;
        this.className = config.id;
        this.unitName = config.name;
        this.level = config.level || 1;
        if (this.level > 1) {
            this.unitName = `Lv.${this.level} ${config.name}`;
        }

        // --- Standardized 16 Stats Mapping ---
        this.maxHp = config.maxHp || 100;
        this.hp = config.hp !== undefined ? config.hp : this.maxHp;
        this.atk = config.atk || 0;
        this.mAtk = config.mAtk || 0;
        this.def = config.def || 0;
        this.mDef = config.mDef || 0;
        this.speed = config.speed || 50;
        this.atkSpd = config.atkSpd || 1500;
        this.atkRange = config.atkRange || 40;
        this.rangeMin = config.rangeMin || 0;
        this.rangeMax = config.rangeMax || this.atkRange;
        this.castSpd = config.castSpd || 1000;
        this.acc = config.acc || 100;
        this.eva = config.eva || 0;
        this.crit = config.crit || 0;
        this.ultChargeSpeed = config.ultChargeSpeed || 1.0;
        this.fireRes = config.fireRes || 0;
        this.iceRes = config.iceRes || 0;
        this.lightningRes = config.lightningRes || 0;
        // ------------------------------------
        // Status Tracking
        this.isStunned = false;
        this.isAirborne = false;
        this.isKnockedBack = false;
        this.isShocked = false; // Electric grenade shock CC
        this.isBloodRaging = false; // Blood rage lifesteal buff
        this.isTacticalCommandActive = false; // 50% basic attack boost
        this.isAsleep = false; // Sleep CC
        this.isFrozen = false; // Freeze CC

        // Elite & Epic System
        this.isElite = config.isElite || false;
        this.isEpic = config.type === 'EPIC' || false;
        this.skillGauge = 0;
        this.skillCooldown = 8000 + (Math.random() * 4000); // ms base cooldown
        this.skillTimer = 0;
        this.skillName = config.skillName || '';

        // --- Added for Pooling Reset ---
        this.resetSkillState = () => {
            this.skillGauge = 0;
            this.skillTimer = 0;
            if (this.healthBar) this.healthBar.draw();
        };

        GrimoireManager.initGrimoire(this);
        // Link legacy arrays to Grimoire chapters
        this.charms = this.grimoire[GrimoireManager.CHAPTERS.ACTIVE];
        this.nodeCharms = this.grimoire[GrimoireManager.CHAPTERS.TACTICAL];
        this.activatedPerks = this.grimoire[GrimoireManager.CHAPTERS.CLASS];

        GrimoireManager.applyAll(this);

        // Populate from config
        if (config.charms) {
            for (let i = 0; i < Math.min(config.charms.length, 9); i++) {
                this.grimoire[GrimoireManager.CHAPTERS.ACTIVE][i] = config.charms[i];
            }
        }
        if (config.nodeCharms) {
            for (let i = 0; i < Math.min(config.nodeCharms.length, 3); i++) {
                this.grimoire[GrimoireManager.CHAPTERS.TACTICAL][i] = config.nodeCharms[i];
            }
        }

        this.charmTimers = Array(9).fill(99999); // Initialized to high value to trigger immediately on spawn

        // Combat Timers
        this.lastAttackTime = 0;

        // Setup Physics & Rendering
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);

        this.sprite = this.scene.add.image(0, 0, config.sprite);
        const spriteSize = config.spriteSize || 64;
        const scale = config.scale || 1;
        this.sprite.setDisplaySize(spriteSize * scale, spriteSize * scale);
        this.add(this.sprite);

        const radius = (config.physicsRadius || 20) * scale;
        this.body.setCircle(radius);
        this.body.setOffset(-radius, -radius);
        this.body.setCollideWorldBounds(true);

        const displayHeight = spriteSize * scale;
        this.barYOffset = displayHeight / 2 + 20;

        this.healthBar = new HealthBar(scene, this, 0, -this.barYOffset, 48, 6);

        // AI Debug Text


        // Store base scale for relative flipping
        this.baseScaleX = this.sprite.scaleX;
        this.baseScaleY = this.sprite.scaleY;
        this.lastScaleX = 1;
        this.lastFlipTime = 0;
        this.flipCooldown = 150; // ms

        // Add shadow via FXManager (Bosses might have config.scale)
        if (this.scene.fxManager) {
            const shadowScale = (this.config && this.config.scale) ? this.config.scale : 1;
            this.shadow = this.scene.fxManager.createShadow(this, shadowScale);
        }

        // Set team for monsters (defaults to 'enemy')
        this.team = config.team || 'enemy';

        if (this.isElite) {
            this.setElite(true);
        }
    }

    /**
     * Resets the monster state for reuse in a pool.
     * @param {number} x - New X position
     * @param {number} y - New Y position
     * @param {Object} config - New config (level scaling, etc.)
     * @param {Object} target - New target
     */
    reset(x, y, config, target) {
        this.setPosition(x, y);
        this.config = config;
        this.target = target;

        // Reset Identity
        this.id = config.id + '_' + Phaser.Math.Between(1000, 9999);
        this.baseId = config.id;
        this.className = config.id;
        this.unitName = config.name;
        this.level = config.level || 1;
        if (this.level > 1) {
            this.unitName = `Lv.${this.level} ${config.name}`;
        }

        // Reset Stats
        this.maxHp = config.maxHp || 100;
        this.hp = config.hp !== undefined ? config.hp : this.maxHp;
        this.atk = config.atk || 0;
        this.mAtk = config.mAtk || 0;
        this.def = config.def || 0;
        this.mDef = config.mDef || 0;
        this.speed = config.speed || 50;
        this.atkSpd = config.atkSpd || 1500;
        this.atkRange = config.atkRange || 40;
        this.rangeMin = config.rangeMin || 0;
        this.rangeMax = config.rangeMax || this.atkRange;
        this.castSpd = config.castSpd || 1000;
        this.acc = config.acc || 100;
        this.eva = config.eva || 0;
        this.crit = config.crit || 0;
        this.ultChargeSpeed = config.ultChargeSpeed || 1.0;
        this.fireRes = config.fireRes || 0;
        this.iceRes = config.iceRes || 0;
        this.lightningRes = config.lightningRes || 0;

        // Reset Status Tracking
        this.isStunned = false;
        this.isAirborne = false;
        this.isKnockedBack = false;
        this.isShocked = false;
        this.isBloodRaging = false;
        this.isTacticalCommandActive = false;
        this.isAsleep = false;
        this.isFrozen = false;

        // Reset Grimoire/Charms
        this.isElite = config.isElite || false;
        this.isEpic = config.type === 'EPIC' || false;
        this.skillGauge = 0;
        this.skillTimer = 0;
        this.skillCooldown = 8000 + Math.random() * 4000;
        this.skillName = config.skillName || '';

        GrimoireManager.initGrimoire(this);
        this.charms = this.grimoire[GrimoireManager.CHAPTERS.ACTIVE];
        this.nodeCharms = this.grimoire[GrimoireManager.CHAPTERS.TACTICAL];
        this.activatedPerks = this.grimoire[GrimoireManager.CHAPTERS.CLASS];

        if (config.charms) {
            for (let i = 0; i < Math.min(config.charms.length, 9); i++) {
                this.grimoire[GrimoireManager.CHAPTERS.ACTIVE][i] = config.charms[i];
            }
        }
        if (config.nodeCharms) {
            for (let i = 0; i < Math.min(config.nodeCharms.length, 3); i++) {
                this.grimoire[GrimoireManager.CHAPTERS.TACTICAL][i] = config.nodeCharms[i];
            }
        }
        GrimoireManager.applyAll(this);
        this.charmTimers = Array(9).fill(99999);

        // Reset Combat Timers
        this.lastAttackTime = 0;

        // Reset Sprite & Shadow
        if (this.sprite) {
            this.sprite.setTexture(config.sprite);
            const spriteSize = config.spriteSize || 64;
            const scale = config.scale || 1;
            this.sprite.setDisplaySize(spriteSize * scale, spriteSize * scale);
            this.sprite.clearTint();
            this.sprite.setAlpha(1);
            this.sprite.angle = 0;
            this.sprite.setScale(this.baseScaleX, this.baseScaleY);
        }

        if (this.shadow) {
            const shadowScale = (this.config && this.config.scale) ? this.config.scale : 1;
            this.shadow.setScale(shadowScale);
            this.shadow.setVisible(true);
            this.shadow.setAlpha(0.4); // Standard shadow alpha
        }

        this.setScale(1);
        this.setAlpha(1);
        this.angle = 0;

        // Reset Physics
        if (this.body) {
            this.body.reset(x, y);
            const scale = config.scale || 1;
            const radius = (config.physicsRadius || 20) * scale;
            this.body.setCircle(radius);
            this.body.setOffset(-radius, -radius);
            this.body.setCollideWorldBounds(true);
            this.body.enable = true;
        }

        // Reset UI
        if (this.healthBar) {
            this.healthBar.setVisible(true);
            const spriteSize = config.spriteSize || 64;
            const scale = config.scale || 1;
            const displayHeight = spriteSize * scale;
            this.barYOffset = displayHeight / 2 + 20;
            this.healthBar.setPos(0, -this.barYOffset);
            this.updateHealthBar();
        }

        this.setActive(true);
        this.setVisible(true);

        if (this.isElite) {
            this.setElite(true);
        }

        // Reset Skill Logic for Epics
        if (this.isEpic) {
            this.skillTimer = 0;
            this.skillGauge = 0;
            this.skillName = config.skillName || '';
        }

        // Re-init AI (Subclasses should handle this)
        if (this.initAI) this.initAI();
    }

    setElite(isElite) {
        this.isElite = isElite;
        if (isElite) {
            // Visual Indicator: Gold Tint + Larger Scale
            this.sprite.setTint(0xffcc00);
            this.setScale(1.2);
            if (this.unitName && !this.unitName.includes('✦')) {
                this.unitName = `✦ ${this.unitName} ✦`;
            }
            // Stats are scaled in DungeonScene.js before creation normally, 
            // but we can add secondary bonus here if needed.
        }
    }

    get targetGroup() {
        if (!this.scene) return null;
        return (this.team === 'player') ? this.scene.enemies : this.scene.mercenaries;
    }

    get allyGroup() {
        if (!this.scene) return null;
        return (this.team === 'player') ? this.scene.mercenaries : this.scene.enemies;
    }

    spawnSummon(SummonClass, x, y, options = {}) {
        const summon = new SummonClass(this.scene, x, y, this, options);
        const group = this.allyGroup;
        if (group) {
            group.add(summon);
        }
        return summon;
    }

    takeDamage(amount, attacker = null, isUltimate = false, element = null, isCritical = false, delay = 0) {
        if (!this.active || !this.scene) return;
        if (amount <= 0 && !element) return;

        // --- 0. Accuracy vs Evasion Check ---
        const myEva = this.getTotalEva();
        if (attacker && typeof attacker === 'object' && attacker.acc !== undefined) {
            const hitChance = Math.max(0.05, Math.min(1.0, (attacker.acc - myEva) / 100.0));
            if (Math.random() > hitChance) {
                // MISS!
                if (this.scene.fxManager) {
                    this.scene.fxManager.showDamageText(this, 'MISS!', '#ffffff');
                }
                console.info(`[Combat] ${attacker.unitName || 'Mercenary'} missed ${this.unitName}!`);
                return;
            }
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
        if (this.getTotalDR() > 0) {
            finalDamage = finalDamage * (1 - this.getTotalDR());
        }

        // 2. Intercept with Shield
        let damageBeforeShield = finalDamage;
        let absorbedByShield = 0;
        if (this.scene.shieldManager) {
            finalDamage = this.scene.shieldManager.takeDamage(this, finalDamage);
            absorbedByShield = damageBeforeShield - finalDamage;
        }

        if (finalDamage > 0) {
            this.hp -= finalDamage;
            if (this.hp < 0) this.hp = 0;

            // Record damage dealt for the attacker (mercenary)
            const attackerId = (attacker && typeof attacker === 'object') ? (attacker.id || attacker.className) : (attacker);
            if (attackerId && attacker && typeof attacker === 'object' && attacker.team === 'player') {
                EventBus.emit(EventBus.EVENTS.COMBAT_DATA_RECORD, { type: 'damage', amount: finalDamage, unitId: attackerId });

                // --- Growth Gear Weapon EXP ---
                if (attacker.equipment && attacker.equipment.weapon) {
                    const weapon = attacker.equipment.weapon;
                    const weaponId = (typeof weapon === 'string') ? weapon : (weapon.instanceId || weapon.id);
                    if (weaponId && typeof weaponId === 'string' && weaponId.startsWith('eq_')) {
                        equipmentManager.addExp(weaponId, finalDamage);
                    }
                }
            }

            // Lifesteal for Blood Rage
            if (attacker && typeof attacker === 'object' && attacker.isBloodRaging && attacker.heal) {
                attacker.heal(finalDamage * 0.35);
            }

            // Attacker gains gauge when hitting monster (unless it's an ultimate)
            if (attacker && typeof attacker.gainUltGauge === 'function' && !isUltimate) {
                attacker.gainUltGauge(2);
            }

            // Wake up from sleep on damage
            if (this.isAsleep && this.wakeUp) {
                this.wakeUp();
            }
        }

        this.updateHealthBar();

        if (this.scene.fxManager) {
            const primaryColor = isCritical ? '#ff0000' : '#ff3333'; // Physical: Red/Stronger Red
            this.scene.fxManager.showDamageText(this, finalDamage, primaryColor, isCritical, 0, delay);

            // Calculate and show Elemental Bonus Damage (Prefix)
            if (element) {
                // For synergistic hits (amount = 0), we use a base percentage of the attacker's power
                const basePower = (attacker && attacker.getTotalAtk) ? attacker.getTotalAtk() : (this.atk || 100);
                const synergyDmg = (amount === 0) ? (basePower * 0.3) : finalDamage;
                const extraDmg = synergyDmg * (0.1 + Math.random() * 0.4); // 10% - 50% bonus
                const elementColor = this.scene.fxManager.getElementColor(element) || '#ffffff';
                this.scene.fxManager.showDamageText(this, extraDmg, elementColor, isCritical, 30, delay);
                this.scene.fxManager.spawnElementalParticles(this.x, this.y, element);
            }
        }

        const elementTag = element ? `[${element.toUpperCase()}] ` : '';
        const shieldInfolocal = absorbedByShield > 0 ? ` (Shield absorbed ${absorbedByShield.toFixed(1)})` : '';
        const damageMsg = finalDamage > 0
            ? `was hit for ${finalDamage.toFixed(1)} ${elementTag}physical damage${shieldInfolocal}.`
            : `completely absorbed ${elementTag}physical damage via Defense/Shield!`;

        console.info(`%c[Combat] %c${this.unitName}%c ${damageMsg} (HP: ${this.hp.toFixed(1)}/${this.getTotalMaxHp()})`,
            'color: #ffaa00; font-weight: bold;',
            'color: #ff5555;',
            'color: #e0e0e0;'
        );

        this.playHitEffect();

        // Bourne Identity Shake: Stronger shake for critical hits or high damage
        if (this.scene && EventBus) {
            let shakeIntensity = isCritical ? 8 : 3;
            if (finalDamage > this.getTotalMaxHp() * 0.1) shakeIntensity += 5; // Extra shake for big hits
            EventBus.emit(EventBus.EVENTS.CAMERA_SHAKE, { intensity: shakeIntensity });
        }

        if (this.hp <= 0) {
            this.die(attackerId);
        }
    }

    // --- Standardized 16 Stats Getters ---
    getTotalMaxHp() {
        return Math.floor((this.maxHp + (this.bonusMaxHp || 0)) * (1 + (this.grimoireBonuses?.maxHpMult || 0)));
    }

    getTotalAtk() {
        return Math.floor(((this.atk || 0) + (this.bonusAtk || 0)) * (1 + (this.grimoireBonuses?.atkMult || 0)));
    }

    getTotalMAtk() {
        return Math.floor(((this.mAtk || 0) + (this.bonusMAtk || 0)) * (1 + (this.grimoireBonuses?.mAtkMult || 0)));
    }

    getTotalDef() {
        const base = (this.def || 0) + (this.bonusDef || 0);
        return Math.floor(base * (1 + (this.grimoireBonuses?.defMult || 0)));
    }

    getTotalMDef() {
        const base = (this.mDef || 0) + (this.bonusMDef || 0);
        return Math.floor(base * (1 + (this.grimoireBonuses?.mDefMult || 0)));
    }

    getTotalSpeed() {
        const base = (this.speed || 50) + (this.bonusSpeed || 0) + (this.grimoireBonuses?.speedAdd || 0);
        return base;
    }

    getTotalAtkSpd() {
        const base = (this.atkSpd || 1500);
        return Math.max(200, base - (this.bonusAtkSpd || 0));
    }

    getTotalCrit() {
        return Math.min(100, (this.crit || 0) + (this.bonusCrit || 0) + (this.grimoireBonuses?.critAdd || 0));
    }

    getTotalAcc() {
        return (this.acc || 100) + (this.bonusAcc || 0);
    }

    getTotalEva() {
        return (this.eva || 0) + (this.bonusEva || 0);
    }

    getTotalFireRes() {
        return Math.min(90, (this.fireRes || 0) + (this.bonusFireRes || 0) + (this.grimoireBonuses?.fireResAdd || 0));
    }

    getTotalIceRes() {
        return Math.min(90, (this.iceRes || 0) + (this.bonusIceRes || 0) + (this.grimoireBonuses?.iceResAdd || 0));
    }

    getTotalLightningRes() {
        return Math.min(90, (this.lightningRes || 0) + (this.bonusLightningRes || 0) + (this.grimoireBonuses?.lightningResAdd || 0));
    }

    getTotalDR() {
        return (this.dr || 0) + (this.bonusDR || 0);
    }

    takeMagicDamage(amount, attacker = null, isUltimate = false, element = null, isCritical = false, delay = 0) {
        if (!this.active || !this.scene) return;
        if (amount <= 0 && !element) return;

        const attackerId = (attacker && typeof attacker === 'object') ? (attacker.id || attacker.className) : attacker;

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
        if (this.getTotalDR() > 0) {
            finalDamage = finalDamage * (1 - this.getTotalDR());
        }

        // 2. Intercept with Shield
        let damageBeforeShield = finalDamage;
        let absorbedByShield = 0;
        if (this.scene.shieldManager) {
            finalDamage = this.scene.shieldManager.takeDamage(this, finalDamage);
            absorbedByShield = damageBeforeShield - finalDamage;
        }

        if (finalDamage > 0) {
            this.hp -= finalDamage;
            if (this.hp < 0) this.hp = 0;

            // Record damage dealt for the attacker (mercenary)
            const attackerId = (attacker && typeof attacker === 'object') ? (attacker.id || attacker.className) : (attacker);
            if (attackerId && attacker && typeof attacker === 'object' && attacker.team === 'player') {
                EventBus.emit(EventBus.EVENTS.COMBAT_DATA_RECORD, { type: 'damage', amount: finalDamage, unitId: attackerId });

                // --- Growth Gear Weapon EXP ---
                if (attacker.equipment && attacker.equipment.weapon) {
                    const weapon = attacker.equipment.weapon;
                    const weaponId = (typeof weapon === 'string') ? weapon : (weapon.instanceId || weapon.id);
                    if (weaponId && typeof weaponId === 'string' && weaponId.startsWith('eq_')) {
                        equipmentManager.addExp(weaponId, finalDamage);
                    }
                }
            }

            // Lifesteal for Blood Rage
            if (attacker && typeof attacker === 'object' && attacker.isBloodRaging && attacker.heal) {
                attacker.heal(finalDamage * 0.35);
            }

            // Attacker gains gauge when hitting monster with magic (unless it's an ultimate)
            if (attacker && typeof attacker.gainUltGauge === 'function' && !isUltimate) {
                attacker.gainUltGauge(2);
            }

            // Wake up from sleep on damage
            if (this.isAsleep && this.wakeUp) {
                this.wakeUp();
            }
        }

        this.updateHealthBar();

        if (this.scene.fxManager) {
            const primaryColor = isCritical ? '#ff0000' : '#cc88ff'; // Magic: Purple/Red
            this.scene.fxManager.showDamageText(this, finalDamage, primaryColor, isCritical, 0, delay);

            // Calculate and show Elemental Bonus Damage (Prefix)
            if (element) {
                // For synergistic hits (amount = 0), use attacker power as baseline
                const basePower = (attacker && attacker.getTotalMAtk) ? attacker.getTotalMAtk() : (this.mAtk || 100);
                const synergyDmg = (amount === 0) ? (basePower * 0.3) : finalDamage;
                const extraDmg = synergyDmg * (0.1 + Math.random() * 0.4); // 10% - 50% bonus
                const elementColor = this.scene.fxManager.getElementColor(element) || '#ffffff';
                this.scene.fxManager.showDamageText(this, extraDmg, elementColor, isCritical, 30, delay);
                this.scene.fxManager.spawnElementalParticles(this.x, this.y, element);
            }
        }

        const elementTag = element ? `[${element.toUpperCase()}] ` : '';
        const shieldInfolocal = absorbedByShield > 0 ? ` (Shield absorbed ${absorbedByShield.toFixed(1)})` : '';
        const damageMsg = finalDamage > 0
            ? `was hit for ${finalDamage.toFixed(1)} ${elementTag}magic damage${shieldInfolocal}.`
            : `completely absorbed ${elementTag}magic damage via MDef/Shield!`;

        console.info(`%c[Combat] %c${this.unitName}%c ${damageMsg} (HP: ${this.hp.toFixed(1)}/${this.getTotalMaxHp()})`,
            'color: #ffaa00; font-weight: bold;',
            'color: #ff5555;',
            'color: #e0e0e0;'
        );

        this.playHitEffect();

        // Bourne Identity Shake for Magic Damage
        if (this.scene && EventBus) {
            let shakeIntensity = isCritical ? 10 : 4; // Magic impacts feel "heavier"
            if (finalDamage > this.getTotalMaxHp() * 0.1) shakeIntensity += 6;
            EventBus.emit(EventBus.EVENTS.CAMERA_SHAKE, { intensity: shakeIntensity });
        }

        if (this.hp <= 0) {
            this.die(attackerId);
        }
    }

    playHitEffect() {
        this.scene.tweens.add({
            targets: this.sprite,
            tint: 0xff0000,
            duration: 100,
            yoyo: true,
            onComplete: () => {
                if (this.sprite) {
                    if (this.isFrozen) {
                        this.sprite.setTint(0x8888ff);
                    } else {
                        this.sprite.clearTint();
                    }
                }
            }
        });
    }

    receiveHeal(amount) {
        const maxHp = this.getTotalMaxHp();
        this.hp += amount;
        if (this.hp > maxHp) this.hp = maxHp;
        this.updateHealthBar();
    }

    /**
     * Standard heal method used by managers and charms.
     */
    heal(amount, isSilent = false) {
        if (!this.active || this.hp <= 0 || amount <= 0) return;

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
    }

    updateHealthBar() {
        if (this.healthBar) {
            const hpPercent = (this.hp / this.getTotalMaxHp()) * 100;
            let shieldPercent = 0;

            if (this.scene && this.scene.shieldManager) {
                const shieldAmount = this.scene.shieldManager.getShield(this);
                shieldPercent = (shieldAmount / this.getTotalMaxHp()) * 100;
            }

            this.healthBar.setValue(hpPercent, shieldPercent);
        }
    }

    fireProjectile() {
        const now = this.scene.time.now;
        if (now - this.lastAttackTime < this.atkSpd) return false;

        const target = this.blackboard.get('target');
        if (!target || !target.active || target.hp <= 0) return false;

        this.lastAttackTime = now;

        const isMagic = this.config.aiType === 'RANGED_MAGIC' || this.config.aiType === 'SUPPORT';

        // Calculate Damage
        let finalDmg = isMagic ? this.getTotalMAtk() : this.getTotalAtk();
        const currentCrit = this.getTotalCrit();
        const isCritical = Math.random() * 100 < currentCrit;
        if (isCritical) {
            finalDmg *= 1.5;
        }

        // Apply Hater Node bonus if active
        if (this._haterDamageMult) {
            finalDmg *= this._haterDamageMult;
        }

        // Basic projectile firing via ProjectileManager
        // For monsters, we use 'laser' for magic types, 'archer' for others
        const projectileType = isMagic ? 'laser' : 'archer';
        const element = this.config.element || null;
        const freezeChance = this.config.freezeChance || 0;

        const onHit = (t, d, isUlt) => {
            if (freezeChance > 0 && Math.random() < freezeChance) {
                if (this.scene.ccManager) {
                    this.scene.ccManager.applyFreeze(t, 3000);
                }
            }
        };

        this.scene.projectileManager.fire(this.x, this.y, target.x, target.y, finalDmg, projectileType, isMagic, this.targetGroup, this, onHit, false, element, isCritical);

        return true;
    }

    findNearestEnemy() {
        const targetGroup = this.targetGroup;
        if (!targetGroup) return;

        const enemies = targetGroup.getChildren();
        if (enemies.length === 0) {
            this.blackboard.set('target', null);
            return;
        }

        let nearest = null;
        let minDist = Infinity;

        for (const enemy of enemies) {
            if (!enemy.active || enemy.hp <= 0) continue;
            const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        }
        this.blackboard.set('target', nearest);
    }

    die(attackerId = null) {
        if (this.healthBar) this.healthBar.setVisible(false);

        // --- Centralized Kill & Loot Logic ---
        EventBus.emit(EventBus.EVENTS.MONSTER_KILLED, {
            monsterId: this.sprite.texture.key,
            attackerId: attackerId,
            level: this.level,
            id: this.config.id,
            isElite: this.isElite,
            isEpic: this.config.id?.startsWith('epic_') || false,
            expReward: this.config.expReward || null
        });

        // Persistent kill tracking for achievements
        DBManager.recordMonsterKill(this.config.id);

        if (this.scene && this.scene.lootManager) {
            // Use container world coordinates (x, y) which are more stable during death
            // Passing 'this' to provide full context (level, isElite, id, etc.)
            console.log(`[BaseMonster] ${this.unitName} (Lv.${this.level}) died at (${this.x.toFixed(1)}, ${this.y.toFixed(1)}). Spawning loot.`);
            this.scene.lootManager.spawnLoot(this.x, this.y, this);
        }

        // Clean up all CC visuals and timers immediately
        if (this.scene && this.scene.ccManager) {
            this.scene.ccManager.cleanUpAllCC(this);
        }

        // Stop logic
        this.btManager = null;

        // Visual death animation with safety check
        if (this.scene && this.scene.tweens) {
            this.scene.tweens.add({
                targets: this,
                scaleX: 0,
                scaleY: 0,
                angle: 180,
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    this.setActive(false);
                    this.setVisible(false);
                    if (this.body) this.body.enable = false;
                    if (this.healthBar) this.healthBar.setVisible(false);
                }
            });
        } else {
            this.setActive(false);
            this.setVisible(false);
            if (this.body) this.body.enable = false;
            if (this.healthBar) this.healthBar.setVisible(false);
        }
    }

    update(time, delta) {
        if (this.isAirborne || this.isStunned || this.isAsleep) {
            // Can't act while CC'd. Keep velocity at 0 unless knocked back.
            if (this.body) this.body.setVelocity(0, 0);
            return; // Early return to block BT and orientation
        } else if (this.btManager) {
            this.btManager.step();
            this.handleAttack();
        }

        // --- Update Charm Effects ---
        this.updateCharmEffects(delta);

        // --- Update Epic Skill Logic ---
        if (this.isEpic && this.hp > 0 && !this.isStunned && !this.isAsleep) {
            this.updateEpicSkill(delta);
        }

        this.updateVisualOrientation();
    }

    updateEpicSkill(delta) {
        if (!this.isEpic) return;

        this.skillTimer += delta;
        this.skillGauge = Math.min(100, (this.skillTimer / this.skillCooldown) * 100);

        if (this.skillGauge >= 100) {
            this.executeEpicSkill();
            this.skillTimer = 0;
            this.skillGauge = 0;
        }

        // Redraw health bar to show skill gauge
        if (this.healthBar) this.healthBar.draw();
    }

    executeEpicSkill() {
        if (!this.skillName) return;

        const normalizedSkill = this.skillName.replace(/\s+/g, '').toLowerCase();

        console.info(`%c[Skill] %c${this.unitName}%c executes %c${this.skillName}!`,
            'color: #ff00ff; font-weight: bold;',
            'color: #ff5555;',
            'color: #e0e0e0;',
            'color: #ffaa00; font-weight: bold;'
        );

        if (normalizedSkill === 'bloodrage') {
            this.executeBloodRage();
        } else if (normalizedSkill === 'electricgrenade') {
            this.executeElectricGrenade(this.target);
        }
    }

    executeBloodRage() {
        // Visual Effect: Blood Drops
        const particleX = this.x;
        const particleY = this.y - 20;

        // Create blood particles manually (similar to BloodRage skill)
        const emitter = this.scene.add.particles(0, 0, 'emoji_blood_drop', {
            speed: { min: 20, max: 80 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.3 * (this.config.scale || 1), end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 1000,
            frequency: 150,
            follow: this,
            followOffset: { x: 0, y: -20 }
        });
        emitter.setDepth(this.depth + 1);

        // Shout
        if (this.barkManager) {
            this.barkManager.showBark(this, "RUAAAARGH! 🩸", "#ff0000");
        }

        // Stat Buff: Increase speed and attack speed for a duration
        const originalSpeed = this.speed;
        const originalAtkSpd = this.atkSpd;

        this.speed *= 1.8;
        this.atkSpd *= 0.5; // Half delay = double speed
        this.sprite.setTint(0xff0000);
        this.isBloodRaging = true;

        this.scene.time.delayedCall(5000, () => {
            if (!this.active) return;
            this.speed = originalSpeed;
            this.atkSpd = originalAtkSpd;
            this.sprite.clearTint();
            if (this.isEpic) this.sprite.setTint(0xff5555); // Restore Epic tint
            this.isBloodRaging = false;
            emitter.destroy();
        });
    }

    executeElectricGrenade(target) {
        if (!target || !target.active) return;

        if (this.barkManager) {
            this.barkManager.showBark(this, "SHOCKING! ⚡", "#ffff00");
        }

        const startX = this.x;
        const startY = this.y;
        const targetX = target.x;
        const targetY = target.y;

        // Create Grenade Sprite
        const grenade = this.scene.add.image(startX, startY, 'emoji_bomb');
        grenade.setTint(0xffff00);
        grenade.setDepth(2000);
        grenade.setDisplaySize(32, 32);

        // Parabolic Flight
        const curve = new Phaser.Curves.QuadraticBezier(
            new Phaser.Math.Vector2(startX, startY),
            new Phaser.Math.Vector2((startX + targetX) / 2, Math.min(startY, targetY) - 150),
            new Phaser.Math.Vector2(targetX, targetY)
        );

        const duration = 600;
        const path = { t: 0 };

        this.scene.tweens.add({
            targets: path,
            t: 1,
            duration: duration,
            ease: 'Cubic.easeOut',
            onUpdate: () => {
                const p = curve.getPoint(path.t);
                grenade.x = p.x;
                grenade.y = p.y;
                grenade.angle += 10;
            },
            onComplete: () => {
                grenade.destroy();
                this.explodeElectricGrenade(targetX, targetY);
            }
        });
    }

    explodeElectricGrenade(x, y) {
        if (!this.scene || !this.active) return;

        const aoeRadius = 100;
        const shockDuration = 3000;
        const damageMultiplier = 1.5;

        // 1. Visual Effect (Explosion)
        const flash = this.scene.add.circle(x, y, aoeRadius, 0xffff00, 0.4);
        flash.setDepth(3000);
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 1.5,
            duration: 400,
            onComplete: () => { if (flash) flash.destroy(); }
        });

        // 2. Electric Particles
        const emitter = this.scene.add.particles(x, y, 'emoji_lightning', {
            speed: { min: 100, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            quantity: 20
        });
        emitter.setDepth(3000);
        emitter.explode(20);
        this.scene.time.delayedCall(1000, () => { if (emitter) emitter.destroy(); });

        // 3. AOE Damage & CC
        if (this.scene.aoeManager) {
            const damage = this.atk * damageMultiplier;
            const opposingGroup = this.scene.mercenaries; // Monsters target Mercenaries
            const hitAllies = this.scene.aoeManager.triggerAoe(x, y, aoeRadius, damage, this, opposingGroup, false, false, 'lightning');

            if (this.scene.ccManager) {
                hitAllies.forEach(merc => {
                    this.scene.ccManager.applyShock(merc, shockDuration);
                });
            }
        }
    }

    updateCharmEffects(delta) {
        // [Passive Refactor] Chapter A charms are now passive.
        return;
    }

    updateVisualOrientation() {
        if (!this.body || !this.sprite) return;

        const vx = this.body.velocity.x;
        let targetScaleX = this.lastScaleX;

        // Increased threshold for monsters to prevent jittering (10 instead of 2)
        if (vx > 10) {
            targetScaleX = -1; // Moving Right -> Flip
        } else if (vx < -10) {
            targetScaleX = 1; // Moving Left -> Normal
        }

        if (targetScaleX !== this.lastScaleX) {
            const now = this.scene.time.now;
            if (now - this.lastFlipTime > this.flipCooldown) {
                this.lastScaleX = targetScaleX;
                this.lastFlipTime = now;
                // Quick flip tween (relative to base scale)
                this.scene.tweens.add({
                    targets: this.sprite,
                    scaleX: targetScaleX * this.baseScaleX,
                    duration: 150,
                    ease: 'Back.easeOut'
                });
            }
        }
    }

    handleAttack() {
        // Only Melee AI types use this manual attack logic (dash nudge).
        // Ranged/Support types handle their attacks via Behavior Trees.
        if (this.config.aiType !== 'MELEE') return;

        if (!this.target || !this.target.active || this.hp <= 0) return;

        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
        const r1 = this.body ? this.body.radius : 0;
        const r2 = this.target.body ? this.target.body.radius : 0;
        const reachDist = dist - r1 - r2;

        const now = this.scene.time.now;

        if (reachDist <= this.atkRange && now - this.lastAttackTime > this.atkSpd) {
            // Prevent attack if shocked
            if (this.isShocked) return;

            this.lastAttackTime = now;

            // Calculate Critical
            let damage = this.getTotalAtk();
            const currentCrit = this.getTotalCrit();
            const isCritical = Math.random() * 100 < currentCrit;
            if (isCritical) {
                damage *= 1.5;
            }

            const element = this.config.element || null;
            this.target.takeDamage(damage, this, false, element, isCritical);

            // Freeze Application for Melee
            const freezeChance = this.config.freezeChance || 0;
            if (freezeChance > 0 && Math.random() < freezeChance) {
                if (this.scene.ccManager) {
                    this.scene.ccManager.applyFreeze(this.target, 3000);
                }
            }

            // Visual attack nudge
            this.scene.tweens.add({
                targets: this,
                x: this.x + (this.target.x - this.x) * 0.2,
                y: this.y + (this.target.y - this.y) * 0.2,
                duration: 100,
                yoyo: true
            });
        }
    }

    getTotalAtk() {
        const base = this.atk + (this.bonusAtk || 0);
        let nodeMult = 1.0;
        if (this.blackboard && this.blackboard.get('enraged_active')) {
            const missingHpRatio = 1 - (this.hp / this.getTotalMaxHp());
            nodeMult += missingHpRatio * 0.15; // Max 1.15x at 0% HP
        }
        const tactMult = this.isTacticalCommandActive ? 1.5 : 1.0;
        const transMult = this.grimoire_transmult || 1.0;
        return base * nodeMult * tactMult * transMult;
    }

    getTotalMAtk() {
        const base = this.mAtk + (this.bonusMAtk || 0);
        return this.isTacticalCommandActive ? base * 1.5 : base;
    }

    getTotalDef() {
        const base = (this.def || 0) + (this.bonusDef || 0);
        // [NodeCharm] Bodyguard (😎) defense bonus for Elites
        const nodeMult = (this.blackboard && this.blackboard.get('guard_active')) ? 1.1 : 1.0;
        const transMult = this.grimoire_transmult || 1.0;
        return base * nodeMult * transMult;
    }

    getTotalMDef() {
        return (this.mDef || 0) + (this.bonusMDef || 0);
    }

    getTotalCrit() {
        return (this.crit || 0) + (this.bonusCrit || 0);
    }

    getTotalEva() {
        return (this.eva || 0) + (this.bonusEva || 0);
    }

    getTotalAcc() {
        return (this.acc || 0) + (this.bonusAcc || 0);
    }

    getTotalDR() {
        return (this.dr || 0) + (this.bonusDR || 0);
    }

    getTotalSpeed() {
        const base = this.speed + (this.bonusSpeed || 0);
        return this.isFrozen ? base * 0.5 : base;
    }

    getTotalAtkSpd() {
        const base = Math.max(100, (this.atkSpd || 1500) - (this.bonusAtkSpd || 0));
        return this.isFrozen ? base * 2 : base;
    }

    getTotalCastSpd() {
        const base = Math.max(100, (this.castSpd || 1000) - (this.bonusCastSpd || 0));
        return this.isFrozen ? base * 2 : base;
    }

    getTotalAtkRange() {
        return this.atkRange + (this.bonusAtkRange || 0);
    }

    /**
     * @returns {Object} JSON-serializable snapshot of logical combat state
     */
    getCombatSnapshot() {
        return {
            id: this.id,
            className: this.className,
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

        if (stateData.isAirborne !== undefined) this.isAirborne = stateData.isAirborne;
        if (stateData.isStunned !== undefined) this.isStunned = stateData.isStunned;
        if (stateData.isKnockedBack !== undefined) this.isKnockedBack = stateData.isKnockedBack;
        if (stateData.isShocked !== undefined) this.isShocked = stateData.isShocked;
        if (stateData.isAsleep !== undefined) this.isAsleep = stateData.isAsleep;

        this.updateHealthBar();
    }
}
