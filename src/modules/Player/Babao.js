import Phaser from 'phaser';
import Mercenary from './Mercenary.js';
import applyMeleeAI from '../AI/MeleeAI.js';
import { SummonStats } from '../Core/EntityStats.js';

/**
 * Babao.js
 * Bao's companion brother. 
 * Melee AI, stats scale with master's mAtk.
 * Special: 20% chance to knock targets airborne on basic attack.
 */
export default class Babao extends Mercenary {
    constructor(scene, x, y, master, options = {}) {
        const stats = SummonStats.BABAO;

        // Base config scaled by master (Bao)
        const config = {
            id: 'babao_' + Date.now(),
            name: stats.name,
            sprite: stats.sprite,
            maxHp: master.getTotalMAtk() * stats.hpMult,
            hp: master.getTotalMAtk() * stats.hpMult,
            atk: master.getTotalMAtk() * stats.atkMult,
            def: master.getTotalMDef() * stats.defMult,
            mDef: master.getTotalMDef() * stats.defMult,
            fireRes: master.getTotalMAtk() * 0.1,
            iceRes: master.getTotalMAtk() * 0.1,
            lightningRes: master.getTotalMAtk() * 0.1,
            speed: stats.speed,
            atkSpd: 1000,
            atkRange: stats.atkRange,
            physicsRadius: stats.physicsRadius,
            spriteSize: 64,
            team: master.team,
            aiType: stats.aiType,
            hideInUI: true // Prevent appearing in Chat/Party UI
        };

        super(scene, x, y, config);
        this.master = master;
        this.isSpinning = false; // For ultimate state

        this.initAI();

        // Custom scale for "little brother" feel
        this.setScale(0.85);
    }

    getWeaponPrefix() {
        return (this.master && this.master.getWeaponPrefix) ? this.master.getWeaponPrefix() : null;
    }

    initAI() {
        applyMeleeAI(
            this,
            (agent) => agent.targetGroup,
            'AGGRESSIVE'
        );
    }

    /**
     * Hook from MeleeAI (modified) called when a hit lands.
     */
    onHitDealt(target, damage) {
        if (!target || !target.active || target.hp <= 0) return;

        // Special Ability: 20% Precise Airborne chance
        if (Math.random() < 0.2) {
            console.log(`[Babao] AIRBORNE TRIGGERED on ${target.unitName}!`);
            if (this.scene.ccManager) {
                this.scene.ccManager.applyAirborne(target, 800, 40);
                if (this.scene.fxManager) {
                    this.scene.fxManager.showDamageText(target, 'AIRBORNE! ☁️', '#ffffff');
                }
            }
        }
    }

    /**
     * Babao is a companion and does not have his own ultimate.
     */
    gainUltGauge(amount) {
        // Do nothing. Babao doesn't accumulate gauge.
        return;
    }

    /**
     * Babao's stats scale with master's mAtk. 
     * Summoned companions do not gain independent EXP.
     */
    addExp(amount) {
        // Do nothing. Scaling is handled via master's stats.
        return;
    }

    // --- Dynamic Scaling ---
    getTotalMaxHp() {
        if (!this.master || !this.master.active) return super.getTotalMaxHp();
        return Math.floor(this.master.getTotalMAtk() * SummonStats.BABAO.hpMult);
    }

    getTotalAtk() {
        if (!this.master || !this.master.active) return super.getTotalAtk();
        const base = (this.master.getTotalMAtk() * SummonStats.BABAO.atkMult) + (this.bonusAtk || 0);
        const multipliers = (this.potionStacks.atk * 0.04);
        return Math.floor(base * (1 + multipliers));
    }

    getTotalDef() {
        if (!this.master || !this.master.active) return super.getTotalDef();
        const base = (this.master.getTotalMDef() * SummonStats.BABAO.defMult) + (this.bonusDef || 0);
        const multipliers = (this.potionStacks.def * 0.04);
        return Math.floor(base * (1 + multipliers));
    }

    getTotalMDef() {
        if (!this.master || !this.master.active) return super.getTotalMDef();
        const base = (this.master.getTotalMDef() * SummonStats.BABAO.defMult) + (this.bonusMDef || 0);
        const multipliers = (this.potionStacks.mDef * 0.04);
        return Math.floor(base * (1 + multipliers));
    }

    /**
     * Babao has a long respawn cooldown on death.
     */
    die() {
        console.log(`[Babao] Deafeated. Beginning long respawn...`);
        if (this.master && this.master.onBabaoDied) {
            this.master.onBabaoDied();
        }

        // Visual "poof" instead of just vanishing
        if (this.scene && this.scene.fxManager) {
            this.scene.fxManager.createSparkleEffect({ x: this.x, y: this.y, active: true });
        }

        super.die();
    }

    update(time, delta) {
        if (this.isSpinning) {
            // Ultimate logic handles movement/spin visuals
            // but we might want to block regular AI here
            return;
        }
        super.update(time, delta);
        if (!this.active || !this.scene) return;

        // Ensure HP stays within dynamic bounds
        const currentMax = this.getTotalMaxHp();
        if (this.hp > currentMax) this.hp = currentMax;
    }
}
