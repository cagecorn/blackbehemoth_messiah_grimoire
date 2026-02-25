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
        const mAtk = master.getTotalMAtk ? master.getTotalMAtk() : master.mAtk;

        const config = {
            id: 'boon_clone_' + Date.now(),
            name: '학습된 자의 분신',
            sprite: 'boon_sprite',
            maxHp: mAtk * 8,
            hp: mAtk * 8,
            atk: mAtk * 1.2,
            def: master.def * 0.8,
            mDef: master.mDef * 0.8,
            fireRes: mAtk * 0.1,
            iceRes: mAtk * 0.1,
            lightningRes: mAtk * 0.1,
            speed: master.speed * 1.1,
            atkSpd: 1000,
            atkRange: 50,
            physicsRadius: 24,
            spriteSize: 64,
            team: master.team,
            aiType: 'MELEE'
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
        if (!this.skill) return 0;
        return this.skill.getCooldownProgress(this.scene.time.now, this.castSpd);
    }

    die() {
        console.log(`[BoonClone] The clone has vanished.`);
        if (this.master && this.master.onCloneDied) {
            this.master.onCloneDied(this);
        }
        super.die();
    }
}
