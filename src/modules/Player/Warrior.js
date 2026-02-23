import Phaser from 'phaser';
import Mercenary from './Mercenary.js';
import applyMeleeAI from '../AI/MeleeAI.js';
import { MercenaryClasses } from '../Core/EntityStats.js';
import ChargeAttack from '../Skills/ChargeAttack.js';
import PlaceholderSkill from '../Skills/PlaceholderSkill.js';
import StoneSkin from '../Skills/StoneSkin.js';
import BloodRage from '../Skills/BloodRage.js';
import HolyAura from '../Skills/HolyAura.js';
import SkillMessiah from '../Skills/SkillMessiah.js';
import MagentaDrive from '../Skills/MagentaDrive.js';

/**
 * Warrior.js
 * Specialist in Melee combat. Supports manual WASD movement for debugging.
 */
export default class Warrior extends Mercenary {
    constructor(scene, x, y, characterConfig = {}) {
        const config = { ...MercenaryClasses.WARRIOR, ...characterConfig };
        super(scene, x, y, config);

        // Input setup for manual control
        this.cursors = this.scene.input.keyboard.createCursorKeys();
        this.wasd = this.scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        // Instantiate Skill dynamically
        if (config.skillName === 'ChargeAttack') {
            this.skill = new ChargeAttack({
                cooldown: 8000,
                damageMultiplier: 2.0,
                aoeRadius: 100,
                clusterRadius: 120, // look for goblins within 120px of each other
                dashSpeedMultiplier: 8, // fast dash
                ccDuration: 2000, // 2 second airborne
                ccHeight: 120 // launch them high
            });
        } else if (config.skillName === 'StoneSkin') {
            this.skill = new StoneSkin(scene, {
                cooldown: 10000,
                duration: 5000,
                damageReduction: 0.20
            });
        } else if (config.skillName === 'BloodRage') {
            this.skill = new BloodRage(scene, {
                cooldown: 12000,
                duration: 5000,
                atkBuffPercent: 0.5,
                spdBuffPercent: 0.5,
                atkSpdBuffPercent: 0.5
            });
        } else if (config.skillName === 'HolyAura') {
            this.skill = new HolyAura(scene, {
                cooldown: 15000,
                duration: 5000,
                tickRate: 1000,
                baseRadius: 100,
                radiusScale: 2.0,
                baseHeal: 5,
                healScale: 0.5
            });
        } else if (config.skillName === 'PlaceholderSkill') {
            this.skill = new PlaceholderSkill();
        }

        // Initialize Ultimate Skill
        if (this.characterId === 'aren') {
            this.ultimateSkill = new SkillMessiah();
        } else if (this.characterId === 'king') {
            this.ultimateSkill = new MagentaDrive();
        }

        console.log(`[Warrior] Initialized ${this.unitName} (${this.characterId}) with skill: ${this.skill ? this.skill.name || this.skill.constructor.name : 'NONE'}`);

        // Perk state
        this.isFortitudeActive = false;  // 강건함: def bonus active?
        this.isLoneWolfActive = false;   // 론 울프: stat bonus active?
        this._baseDef = null;            // cached base def for fortitude
        this._loneWolfBaseStats = null;  // cached base stats for lone wolf

        // Initialize Melee AI in Manual Mode by default
        this.initAI();
    }

    getSkillProgress() {
        if (!this.skill) return 0;
        return this.skill.getCooldownProgress(this.scene.time.now, this.castSpd);
    }

    initAI() {
        // Targets are entities in the dynamic targetGroup
        applyMeleeAI(this, (agent) => agent.targetGroup, 'AGGRESSIVE');
    }

    executeUltimate() {
        if (this.ultimateSkill) {
            this.ultimateSkill.execute(this.scene, this);
        }
    }

    update() {
        super.update();

        // Handle Manual Movement Override
        let isMovingManually = false;
        let vx = 0;
        let vy = 0;

        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            vx = -this.speed;
            isMovingManually = true;
        } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
            vx = this.speed;
            isMovingManually = true;
        }

        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            vy = -this.speed;
            isMovingManually = true;
        } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
            vy = this.speed;
            isMovingManually = true;
        }

        if (isMovingManually) {
            // Manual Override: Cancel AI Aggression
            if (this.blackboard.get('ai_state') !== 'MANUAL') {
                this.blackboard.set('ai_state', 'MANUAL');
                console.log(`[${this.unitName}] Manual override engaged, AI disabled.`);
            }
            this.body.setVelocity(vx, vy);
            this.body.velocity.normalize().scale(this.speed);
        } else if (this.blackboard && this.blackboard.get('ai_state') !== 'AGGRESSIVE') {
            // Stop moving if purely manual and keys are released
            this.body.setVelocity(0);
        }

        // Auto-cast Skills when Aggressive (Not Manual)
        if (!isMovingManually && this.blackboard && this.blackboard.get('ai_state') === 'AGGRESSIVE') {
            // Only try if we can act and targetGroup exist
            const targets = this.targetGroup;
            if (!this.isAirborne && !this.isStunned && targets && this.skill) {
                this.skill.execute(this, targets.getChildren());
            }
        }

        // Perk: 강건함 (Fortitude)
        if (this.activatedPerks.includes('fortitude')) {
            this.checkFortitude();
        }

        // Perk: 론 울프 (Lone Wolf)
        if (this.activatedPerks.includes('lone_wolf')) {
            this.checkLoneWolf();
        }

        // Apply visual orientation after manual velocity has been calculated and applied
        this.updateVisualOrientation();
    }

    /**
     * 강건함 (Fortitude): +10% def when 3+ enemies are within 120px.
     */
    checkFortitude() {
        if (!this.scene.enemies) return;

        const SURROUND_RADIUS = 120;
        const SURROUND_COUNT = 3;

        const nearbyEnemies = this.scene.enemies.getChildren().filter(e =>
            e.active && e.hp > 0 &&
            Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y) <= SURROUND_RADIUS
        );

        const isSurrounded = nearbyEnemies.length >= SURROUND_COUNT;

        if (isSurrounded && !this.isFortitudeActive) {
            this.isFortitudeActive = true;
            this._baseDef = this.def;
            this.def = Math.round(this.def * 1.10);
            console.log(`[Perk] ${this.unitName}: 강건함 발동! 방어력 10% 상승 (${this._baseDef} → ${this.def})`);
            this.syncStatusUI();
        } else if (!isSurrounded && this.isFortitudeActive) {
            this.isFortitudeActive = false;
            if (this._baseDef !== null) {
                this.def = this._baseDef;
                console.log(`[Perk] ${this.unitName}: 강건함 해제. 방어력 복구 (→ ${this.def})`);
                this._baseDef = null;
                this.syncStatusUI();
            }
        }
    }

    /**
     * 론 울프 (Lone Wolf): +5% all stats when no allies are within 200px.
     */
    checkLoneWolf() {
        if (!this.scene.mercenaries) return;

        const ALLY_RADIUS = 200;

        const nearbyAllies = this.scene.mercenaries.getChildren().filter(m =>
            m !== this && m.active && m.hp > 0 &&
            Phaser.Math.Distance.Between(this.x, this.y, m.x, m.y) <= ALLY_RADIUS
        );

        const isAlone = nearbyAllies.length === 0;

        if (isAlone && !this.isLoneWolfActive) {
            this.isLoneWolfActive = true;
            this._loneWolfBaseStats = {
                atk: this.atk, def: this.def, mAtk: this.mAtk,
                mDef: this.mDef, speed: this.speed, maxHp: this.maxHp
            };
            this.atk = Math.round(this.atk * 1.05);
            this.def = Math.round(this.def * 1.05);
            this.mAtk = Math.round(this.mAtk * 1.05);
            this.mDef = Math.round(this.mDef * 1.05);
            this.speed = Math.round(this.speed * 1.05);
            this.maxHp = Math.round(this.maxHp * 1.05);
            console.log(`[Perk] ${this.unitName}: 론 울프 발동! 모든 스탯 5% 상승`);
            this.syncStatusUI();
        } else if (!isAlone && this.isLoneWolfActive) {
            this.isLoneWolfActive = false;
            if (this._loneWolfBaseStats) {
                const s = this._loneWolfBaseStats;
                this.atk = s.atk;
                this.def = s.def;
                this.mAtk = s.mAtk;
                this.mDef = s.mDef;
                this.speed = s.speed;
                this.maxHp = s.maxHp;
                console.log(`[Perk] ${this.unitName}: 론 울프 해제. 스탯 복구`);
                this._loneWolfBaseStats = null;
                this.syncStatusUI();
            }
        }
    }

    getCustomStatuses() {
        const statuses = super.getCustomStatuses();
        if (this.isFortitudeActive) {
            statuses.push({
                name: '강건함',
                description: '주변에 다수의 적이 있어 방어력이 10% 상승했습니다.',
                emoji: '🪨',
                category: 'buff'
            });
        }
        if (this.isLoneWolfActive) {
            statuses.push({
                name: '론 울프',
                description: '주변에 아군이 없어 모든 스탯이 5% 상승했습니다.',
                emoji: '🐺',
                category: 'buff'
            });
        }
        return statuses;
    }
}
