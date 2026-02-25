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
            aiType: 'MELEE'
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
        const multiplier = 1 + (stage * 0.3); // Stage 1: +30%, Stage 2: +60%

        const oldMaxHp = this.maxHp;
        const baseAtk = this.config.atk;

        this.maxHp = this.config.maxHp * multiplier;
        this.hp = (this.hp / oldMaxHp) * this.maxHp; // maintain percentage
        this.bonusAtk = baseAtk * (multiplier - 1);

        // Apply Tint for Buff Stages
        if (stage === 1) {
            this.sprite.setTint(0xfffacd); // Lemon Chiffon (Soft Gold)
        } else if (stage === 2) {
            this.sprite.setTint(0xffd700); // Gold (Stronger)
        }

        console.log(`[GuardianAngel] Buff Stage ${stage} applied. Atk: ${this.atk.toFixed(1)}`);

        // Visual feedback for buff
        if (this.scene.fxManager) {
            this.scene.fxManager.showDamageText(this, `STEP ${stage} UP!`, '#ffff00');
            this.scene.fxManager.createSparkleEffect(this);
        }
    }

    die() {
        console.log(`[GuardianAngel] Summon has been defeated.`);
        if (this.master && this.master.onSummonDied) {
            this.master.onSummonDied(this);
        }
        super.die();
    }
}
