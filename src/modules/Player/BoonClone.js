import Phaser from 'phaser';
import Mercenary from './Mercenary.js';
import applyProtectAI from '../AI/ProtectAI.js';
import HolyAura from '../Skills/HolyAura.js';

/**
 * BoonClone.js
 * The protective clone summoned by Boon's ultimate.
 * Scaled by master's mAtk, uses Protect AI, and casts Holy Aura.
 */
export default class BoonClone extends Mercenary {
    constructor(scene, x, y, master) {
        // Stats scaled by master's mAtk
        const mAtk = master.getTotalMAtk();

        const config = {
            id: 'boon_clone_' + Date.now(),
            name: '학습된 자의 분신',
            sprite: 'boon_sprite',
            maxHp: mAtk * 8,
            hp: mAtk * 8,
            atk: mAtk * 1.2,
            def: master.getTotalDef() * 0.8,
            mDef: master.getTotalMDef() * 0.8,
            fireRes: mAtk * 0.1,
            iceRes: mAtk * 0.1,
            lightningRes: mAtk * 0.1,
            speed: master.getTotalSpeed() * 1.1,
            atkSpd: 1000,
            atkRange: 50,
            physicsRadius: 24,
            spriteSize: 64,
            team: master.team,
            aiType: 'MELEE',
            hideInUI: true  // Summon - Don't show in portrait bar
        };

        super(scene, x, y, config);
        this.master = master;

        // Visual: Golden Spectral look
        this.sprite.setTint(0xffcc00);
        this.sprite.setAlpha(0.7);

        // Instantiate Holy Aura (same as master but maybe faster cooldown or different scaling if needed)
        this.skill = new HolyAura(scene, {
            cooldown: 12000,
            duration: 4000,
            tickRate: 1000,
            baseRadius: 100,
            radiusScale: 1.5,
            baseHeal: mAtk * 0.3,
            healScale: 0.1
        });

        this.initAI();
    }

    initAI() {
        applyProtectAI(
            this,
            (agent) => agent.allyGroup,
            (agent) => agent.targetGroup
        );
    }

    getSkillProgress() {
        if (!this.skill || !this.scene || !this.scene.time) return 0;
        return this.skill.getCooldownProgress(this.scene.time.now, this.castSpd);
    }

    // --- Dynamic Scaling ---
    getTotalMaxHp() {
        if (!this.master || !this.master.active) return super.getTotalMaxHp();
        return Math.floor(this.master.getTotalMAtk() * 8);
    }

    getTotalAtk() {
        if (!this.master || !this.master.active) return super.getTotalAtk();
        const base = (this.master.getTotalMAtk() * 1.2) + (this.bonusAtk || 0);
        const multipliers = (this.potionStacks.atk * 0.04);
        return Math.floor(base * (1 + multipliers));
    }

    getTotalDef() {
        if (!this.master || !this.master.active) return super.getTotalDef();
        const base = (this.master.getTotalDef() * 0.8) + (this.bonusDef || 0);
        const multipliers = (this.potionStacks.def * 0.04);
        return Math.floor(base * (1 + multipliers));
    }

    getTotalMDef() {
        if (!this.master || !this.master.active) return super.getTotalMDef();
        const base = (this.master.getTotalMDef() * 0.8) + (this.bonusMDef || 0);
        const multipliers = (this.potionStacks.mDef * 0.04);
        return Math.floor(base * (1 + multipliers));
    }

    die() {
        console.log(`[BoonClone] The clone has vanished.`);
        if (this.master && this.master.onCloneDied) {
            this.master.onCloneDied(this);
        }
        super.die();
    }

    update(time, delta) {
        super.update(time, delta);
        if (!this.active || !this.scene) return;

        // Ensure HP stays within dynamic bounds
        const currentMax = this.getTotalMaxHp();
        if (this.hp > currentMax) this.hp = currentMax;
    }
}
