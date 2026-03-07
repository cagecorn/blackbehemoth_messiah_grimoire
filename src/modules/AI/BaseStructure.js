import Phaser from 'phaser';
import HealthBar from '../UI/HealthBar.js';
import EventBus from '../Events/EventBus.js';
import ItemManager from '../Core/ItemManager.js';
import { StructureStats } from '../Core/EntityStats.js';
import DBManager from '../Database/DBManager.js';

/**
 * BaseStructure.js
 * Base class for all defense structures (Turrets, Barricades, etc.)
 */
export default class BaseStructure extends Phaser.GameObjects.Container {
    constructor(scene, x, y, instanceId, baseId) {
        super(scene, x, y);
        this.scene = scene;
        this.instanceId = instanceId;
        this.baseId = baseId;

        const config = StructureStats[baseId.toUpperCase()] || {
            name: 'Unknown Structure',
            hp: 100, maxHp: 100, atk: 10, def: 10, sprite: 'bow_turret_sprite'
        };
        this.config = config;

        // Visual Identity & Shadow
        if (this.scene.fxManager) {
            this.shadow = this.scene.fxManager.createShadow(this);
        }

        // Identity
        this.unitName = config.name;
        this.team = 'player'; // Structures are allies
        this.isBuilding = true; // For logic separation
        this.id = instanceId;
        this.hideInUI = config.hideInUI !== undefined ? config.hideInUI : true;

        // Stats
        this.maxHp = config.maxHp || 100;
        this.hp = config.hp || this.maxHp;
        this.atk = config.atk || 0;
        this.mAtk = config.mAtk || 0;
        this.def = config.def || 0;
        this.mDef = config.mDef || 0;
        this.atkSpd = config.atkSpd || 1500;
        this.atkRange = config.atkRange || 450;
        this.acc = config.acc || 100;
        this.crit = config.crit || 5;
        this.fireRes = config.fireRes || 0;
        this.iceRes = config.iceRes || 0;
        this.lightningRes = config.lightningRes || 0;

        // --- Standardized Bonus Stats (for BuffManager & Skills) ---
        this.bonusAtk = 0;
        this.bonusMAtk = 0;
        this.bonusDef = 0;
        this.bonusMDef = 0;
        this.bonusCrit = 0;
        this.bonusAtkSpd = 0; // Delay reduction
        this.bonusAtkRange = 0;
        this.bonusDR = 0;
        this.bonusEva = 0;
        this.bonusAcc = 0;
        this.bonusSpeed = 0;
        this.bonusCastSpd = 0;
        this.bonusFireRes = 0;
        this.bonusIceRes = 0;
        this.bonusLightningRes = 0;
        this.bonusRangeMax = 0;

        // --- Crowd Control Status ---
        this.isShocked = false;
        this.isStunned = false;
        this.isAsleep = false;
        this.isBurning = false;
        this.isFrozen = false;
        this.isAirborne = false;
        this.isKnockedBack = false;

        // --- Identity & Physical Properties ---
        this.isImmobile = true;           // Prevent SeparationManager from nudging
        this.isDisplacementImmune = true; // Prevent CCManager from lifting/pushing
        this.isCCImmune = false;         // Allow status CC (Shock, Burn, etc.)
        this.messiahEncouragementAmount = 0; // Tracking for Messiah power UI

        // Combat Timers
        this.lastAttackTime = 0;

        // Setup Physics & Rendering
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);

        this.sprite = this.scene.add.image(0, 0, config.sprite || 'bow_turret_sprite');
        const spriteSize = config.spriteSize || 64;
        this.sprite.setDisplaySize(spriteSize, spriteSize);
        this.add(this.sprite);

        const radius = config.physicsRadius || 25;
        this.body.setCircle(radius);
        this.body.setOffset(-radius, -radius);
        this.body.setImmovable(true); // Structures don't move
        this.body.setCollideWorldBounds(true);

        this.barYOffset = spriteSize / 2 + 20;
        this.healthBar = new HealthBar(scene, this, 0, -this.barYOffset, 56, 6);

        // Track stats for persistence
        this.lastSaveTime = 0;
        this.saveInterval = 2000; // Save HP every 2s if changed
        this.lastHp = this.hp;

        console.log(`[BaseStructure] Created ${this.unitName} (${this.instanceId}) at ${x}, ${y}`);
    }

    get targetGroup() {
        if (!this.scene) return { getChildren: () => [] };
        return this.scene.enemies;
    }

    takeDamage(amount, attacker = null, isUltimate = false, element = null, isCritical = false) {
        if (!this.active || this.hp <= 0) return;

        // Evasion check (structures usually don't evade)
        const finalDamage = Math.max(1, amount - this.getTotalDef());
        this.hp -= finalDamage;
        if (this.hp < 0) this.hp = 0;

        this.updateHealthBar();

        if (this.scene.fxManager) {
            const color = isCritical ? '#ff0000' : '#ff5555';
            this.scene.fxManager.showDamageText(this, finalDamage, color, isCritical);
        }

        // Visual Hit Effect
        this.scene.tweens.add({
            targets: this.sprite,
            tint: 0xff0000,
            duration: 100,
            yoyo: true,
            onComplete: () => { if (this.sprite) this.sprite.clearTint(); }
        });

        if (this.hp <= 0) {
            this.die();
        }
    }

    receiveHeal(amount, healerId = null) {
        if (!this.active || this.hp <= 0) return;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        this.updateHealthBar();
        if (this.scene.fxManager) {
            this.scene.fxManager.showHealEffect(this);
        }
        // Optional: Record healing in EventBus if needed
    }

    updateHealthBar() {
        if (this.healthBar) {
            this.healthBar.setValue((this.hp / this.maxHp) * 100);
        }
    }

    update(time, delta) {
        if (!this.active || this.hp <= 0) return;

        // Check for incapacitating CC (Shock, Sleep, Stun)
        if (this.isShocked || this.isAsleep || this.isStunned) return;

        // Combat logic: Find target and attack
        this.handleCombat(time);
    }

    handleCombat(time) {
        if (time - this.lastAttackTime < this.getTotalAtkSpd()) return;

        const target = this.findNearestEnemy();
        if (target) {
            this.fireProjectile(target);
            this.lastAttackTime = time;
        }
    }

    findNearestEnemy() {
        const enemies = this.targetGroup.getChildren();
        let nearest = null;
        let minDist = this.getTotalAtkRange();

        for (const enemy of enemies) {
            if (!enemy.active || enemy.hp <= 0) continue;
            const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        }
        return nearest;
    }

    fireProjectile(target) {
        if (!this.scene.projectileManager) return;

        // Calculate Damage
        let damage = this.getTotalAtk();
        const isCritical = Math.random() * 100 < this.getTotalCrit();
        if (isCritical) damage *= 1.5;

        // Sprite facing check
        if (target.x < this.x) this.sprite.setScale(-Math.abs(this.sprite.scaleX), this.sprite.scaleY);
        else this.sprite.setScale(Math.abs(this.sprite.scaleX), this.sprite.scaleY);

        // Projectile Type & Behavior
        const projType = this.config.projectileType || 'laser';
        const isParabolic = projType === 'archer';

        this.scene.projectileManager.fire(
            this.x, this.y,
            target.x, target.y,
            damage,
            projType,
            false, // isMagic
            this.targetGroup,
            this,
            null, // onHitCallback
            false, // isUltimate
            null, // element
            isCritical
        );
    }

    die() {
        console.log(`[BaseStructure] ${this.unitName} destroyed!`);
        if (this.healthBar) this.healthBar.destroy();

        // Death Visual
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            scale: 1.5,
            duration: 500,
            onComplete: () => {
                this.destroy();
            }
        });

        // Permanently delete from DB when destroyed
        DBManager.deleteStructureInstance(this.instanceId);
    }

    heal(amount, isSilent = false, healerId = null) {
        if (!this.active || this.hp <= 0 || amount <= 0) return;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        this.updateHealthBar();
        if (this.scene.fxManager) {
            if (!isSilent) {
                this.scene.fxManager.showDamageText(this, '+' + Math.round(amount), '#00ff00');
            }
            this.scene.fxManager.showHealEffect(this);
        }
    }

    // --- Unit Interface Implementations (Fixes target.getTotalCrit is not a function) ---

    getTotalAtk() {
        return (this.atk || 0) + (this.bonusAtk || 0);
    }

    getTotalMAtk() {
        return (this.mAtk || 0) + (this.bonusMAtk || 0);
    }

    getTotalDef() {
        return (this.def || 0) + (this.bonusDef || 0);
    }

    getTotalMDef() {
        return (this.mDef || 0) + (this.bonusMDef || 0);
    }

    getTotalCrit() {
        return (this.crit || 0) + (this.bonusCrit || 0);
    }

    getTotalAtkSpd() {
        const base = (this.atkSpd || 1500) - (this.bonusAtkSpd || 0);
        let final = Math.max(200, base);
        // Apply Freeze penalty (50% speed reduction)
        if (this.isFrozen) final *= 2;
        return final;
    }

    getTotalAtkRange() {
        return (this.atkRange || 450) + (this.bonusAtkRange || 0);
    }

    getTotalDR() {
        return (this.dr || 0) + (this.bonusDR || 0);
    }

    getTotalEva() {
        return (this.eva || 0) + (this.bonusEva || 0);
    }

    getTotalAcc() {
        return (this.acc || 100) + (this.bonusAcc || 0);
    }

    getTotalMaxHp() {
        return this.maxHp || 1000;
    }

    gainUltGauge(amount) {
        // Structures don't have ultimates, but skills (like kiwi) might try to charge them.
        // We implement this as a dummy to avoid crashes.
    }

    getTotalSpeed() {
        return (this.speed || 0) + (this.bonusSpeed || 0);
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

    getTotalCastSpd() {
        const base = (this.castSpd || 1000) - (this.bonusCastSpd || 0);
        return Math.max(200, base);
    }

    getTotalRangeMin() {
        return Math.max(0, (this.rangeMin || 0) + (this.bonusRangeMin || 0));
    }

    getTotalRangeMax() {
        return (this.rangeMax || this.atkRange || 450) + (this.bonusRangeMax || 0);
    }

    getState() {
        return {
            id: this.id,
            className: 'BaseStructure',
            classId: this.baseId,
            hideInUI: !!this.hideInUI,
            unitName: this.unitName,
            x: this.x,
            y: this.y,
            hp: this.hp,
            maxHp: this.maxHp,
            atk: this.atk,
            def: this.def
        };
    }

    syncStatusUI() {
        // Dummy for interface compatibility
    }

    restoreSpriteTint() {
        this.sprite.clearTint();
    }
}
