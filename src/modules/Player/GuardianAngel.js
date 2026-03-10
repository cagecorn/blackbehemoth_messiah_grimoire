import Phaser from 'phaser';
import Mercenary from './Mercenary.js';
import applyMeleeAI from '../AI/MeleeAI.js';

/**
 * GuardianAngel.js
 * Summoned unit for Sera's ultimate skill.
 * Melee AI, high speed, stat scaling based on master's mAtk.
 */
export default class GuardianAngel extends Mercenary {
    constructor(scene, x, y, master, options = {}) {
        // Base config for Guardian Angel
        const config = {
            id: 'guardian_angel_' + Date.now(),
            name: '수호 천사',
            sprite: 'guadian_angel_sprite',
            maxHp: master.getTotalMAtk() * 10,
            hp: master.getTotalMAtk() * 10,
            atk: master.getTotalMAtk() * 1.5,
            def: master.getTotalMDef(),
            mDef: master.getTotalMDef(),
            fireRes: master.getTotalMAtk() * 0.1,
            iceRes: master.getTotalMAtk() * 0.1,
            lightningRes: master.getTotalMAtk() * 0.1,
            speed: 180,              // Faster than average
            atkSpd: 800,             // Fast attacks
            atkRange: 60,
            physicsRadius: 24,
            spriteSize: 64,
            team: master.team,
            aiType: 'MELEE',
            hideInUI: true  // Summon - Don't show in portrait bar
        };

        super(scene, x, y, config);
        this.master = master;
        this.buffStage = 0;

        // Visual orientation tweak (if needed)
        this.sprite.setTint(0xffffff);

        // Auto-initialize AI
        this.initAI();
    }

    getWeaponPrefix() {
        return (this.master && this.master.getWeaponPrefix) ? this.master.getWeaponPrefix() : null;
    }

    initAI() {
        // Use generic Melee AI
        applyMeleeAI(
            this,
            (agent) => agent.targetGroup,
            'AGGRESSIVE'
        );
    }

    applyBuffStage(stage) {
        this.buffStage = stage;

        // Apply Tint for Buff Stages
        if (stage === 1) {
            this.sprite.setTint(0xfffacd); // Lemon Chiffon (Soft Gold)
        } else if (stage === 2) {
            this.sprite.setTint(0xffd700); // Gold (Stronger)
        }

        console.log(`[GuardianAngel] Buff Stage ${stage} applied. Atk: ${this.getTotalAtk().toFixed(1)}`);

        // Visual feedback for buff
        if (this.scene && this.scene.fxManager) {
            this.scene.fxManager.showDamageText(this, `STEP ${stage} UP!`, '#ffff00');
            this.scene.fxManager.createSparkleEffect(this);
        }

        this.syncStatusUI();
    }

    // --- Dynamic Scaling ---
    get stageMultiplier() {
        return 1 + (this.buffStage * 0.3);
    }

    getTotalMaxHp() {
        if (!this.master || !this.master.active) return super.getTotalMaxHp();
        const base = this.master.getTotalMAtk() * 10;
        return Math.floor(base * this.stageMultiplier);
    }

    getTotalAtk() {
        if (!this.master || !this.master.active) return super.getTotalAtk();
        const base = (this.master.getTotalMAtk() * 1.5) + (this.bonusAtk || 0);
        const multipliers = (this.potionStacks.atk * 0.04);
        return Math.floor(base * this.stageMultiplier * (1 + multipliers));
    }

    getTotalDef() {
        if (!this.master || !this.master.active) return super.getTotalDef();
        const base = this.master.getTotalMDef() + (this.bonusDef || 0);
        const multipliers = (this.potionStacks.def * 0.04);
        return Math.floor(base * (1 + multipliers));
    }

    getTotalMDef() {
        if (!this.master || !this.master.active) return super.getTotalMDef();
        const base = this.master.getTotalMDef() + (this.bonusMDef || 0);
        const multipliers = (this.potionStacks.mDef * 0.04);
        return Math.floor(base * (1 + multipliers));
    }

    die() {
        console.log(`[GuardianAngel] Summon has been defeated.`);
        if (this.master && this.master.onSummonDied) {
            this.master.onSummonDied(this);
        }
        super.die();
    }

    update(time, delta) {
        super.update(time, delta);
        if (!this.active || !this.scene) return;

        // Ensure HP stays within dynamic bounds if max HP changes
        const currentMax = this.getTotalMaxHp();
        if (this.hp > currentMax) this.hp = currentMax;
    }
}
