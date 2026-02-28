import Phaser from 'phaser';
import Mercenary from './Mercenary.js';
import applyBardAI from '../AI/BardAI.js';
import Blackboard from '../AI/Blackboard.js';
import Siren from './Siren.js';
import EventBus from '../Events/EventBus.js';
import { MercenaryClasses } from '../Core/EntityStats.js';
import SongOfProtection from '../Skills/SongOfProtection.js';
import PlaceholderSkill from '../Skills/PlaceholderSkill.js';
import soundEffects from '../Core/SoundEffects.js';

/**
 * Bard.js
 * Hybrid Support: Applies ATK/mATK buffs to allies, then attacks with notes.
 */
export default class Bard extends Mercenary {
    constructor(scene, x, y, warrior, characterConfig = {}) {
        const config = { ...MercenaryClasses.BARD, ...characterConfig };
        super(scene, x, y, config);
        this.warrior = warrior;

        this.lastFireTime = 0;
        this.lastBuffTime = 0;

        // Instantiate Skill dynamically
        if (config.skillName === 'SongOfProtection') {
            this.skill = new SongOfProtection({
                cooldown: 10000,
                shieldMultiplier: 2.5,
                shieldDuration: 5000
            });
        } else if (config.skillName === 'PlaceholderSkill') {
            this.skill = new PlaceholderSkill();
        }

        // Ultimate State
        this.summonInstance = null;
        this.ultStage = 0; // 0: None, 1: Summoned, 2: Sleep Low, 3: Sleep High

        this.initAI();
    }

    getSkillProgress() {
        if (!this.skill || !this.scene || !this.scene.time) return 0;
        return this.skill.getCooldownProgress(this.scene.time.now, this.castSpd);
    }

    initAI() {
        this.blackboard = new Blackboard();
        this.blackboard.set('self', this);
        this.blackboard.set('ai_state', 'AGGRESSIVE');
        this.blackboard.set('target', null);
        this.blackboard.set('buff_target', null);

        // Provides getAllyGroup and getEnemyGroup based on team
        applyBardAI(this, (u) => u.allyGroup, (u) => u.targetGroup);
    }

    castBuff(target) {
        const now = this.scene.time.now;
        if (now - this.lastBuffTime < this.castSpd) return false;

        this.lastBuffTime = now;

        // Buff formulas: e.g., 20% of Bard's mAtk
        const buffAtk = Math.max(1, Math.floor(this.getTotalMAtk() * 0.2));
        const buffMAtk = Math.max(1, Math.floor(this.getTotalMAtk() * 0.25));

        const duration = 15000; // 15 seconds so Bard can buff everybody without looping endlessly

        this.scene.buffManager.applyBuff(target, this, 'Motivation', duration, buffAtk, buffMAtk);

        // Perk: 고양 (Inspiration) — 5% chance to advance target's skill cooldown by 15%
        if (this.activatedPerks.includes('inspiration') && target.skill) {
            const roll = Math.random();
            console.log(`[Perk] ${this.unitName}: 고양 확률 체크... (Roll: ${roll.toFixed(2)} / Threshold: 0.05)`);
            if (roll < 0.05) {
                const cd = target.skill.getActualCooldown
                    ? target.skill.getActualCooldown(target.castSpd)
                    : (target.skill.cooldown || 5000);
                // Push lastCastTime back by 15% of the cooldown
                const advance = cd * 0.15;
                target.skill.lastCastTime = (target.skill.lastCastTime || 0) - advance;
                console.log(`[Perk] ${this.unitName}: 고양 발동! ${target.unitName}의 스킬 쿨타임 15% 앞당김 (-${(advance / 1000).toFixed(1)}s)`);
                if (this.scene.fxManager) {
                    this.scene.fxManager.showDamageText(target, '고양! 🎶', '#ffff88');
                }
            }
        }

        // Visual cast bump
        this.scene.tweens.killTweensOf(this.sprite);
        this.sprite.y = 0;
        this.scene.tweens.add({
            targets: this.sprite,
            y: -15,
            duration: 100,
            yoyo: true
        });

        return true;
    }

    fireProjectile(target) {
        const now = this.scene.time.now;
        if (now - this.lastFireTime < this.getTotalAtkSpd()) return false;

        this.lastFireTime = now;

        this.scene.tweens.killTweensOf(this.sprite);
        this.sprite.x = 0;
        this.scene.tweens.add({
            targets: this.sprite,
            x: this.lastScaleX * 10,
            duration: 50,
            yoyo: true
        });

        const prefix = this.getWeaponPrefix();
        const element = prefix ? prefix.element : null;

        this.scene.projectileManager.fire(
            this.x, this.y, target.x, target.y,
            this.getTotalAtk(), 'emoji_note', false, this.targetGroup, this, null, false, element
        );

        return true;
    }

    update(time, delta) {
        super.update(time, delta);
        if (!this.active || !this.scene) return;

        // Auto-cast Song of Protection when off cooldown
        if (!this.isAirborne && !this.isStunned && !this.isKnockedBack && this.skill) {
            this.skill.execute(this);
        }
    }

    /**
     * Lute's Ultimate: "Summon: Siren"
     */
    async executeUltimate() {
        if (this.characterId !== 'lute') return;

        const scene = this.scene;
        const skillName = "소환 : 사이렌";

        if (this.ultStage === 0) {
            // First time: Summon
            await scene.ultimateManager.playCutscene(this, skillName);
            this.summonSiren();
            this.ultStage = 1;
        } else if (this.ultStage === 1) {
            // Second time: Buff 1 (20% Sleep)
            await scene.ultimateManager.playCutscene(this, skillName + " (수면 선율 1단계)");
            if (this.summonInstance && this.summonInstance.active) {
                this.summonInstance.sleepChance = 0.2;
                this.summonInstance.sprite.setTint(0xaaaaff);
                if (this.scene.fxManager) {
                    this.scene.fxManager.showDamageText(this.summonInstance, 'SLEEP CHANCE ON!', '#33ccff');
                }
            }
            this.ultStage = 2;
        } else if (this.ultStage === 2) {
            // Third time: Buff 2 (50% Sleep)
            await scene.ultimateManager.playCutscene(this, skillName + " (수면 선율 2단계)");
            if (this.summonInstance && this.summonInstance.active) {
                this.summonInstance.sleepChance = 0.5;
                this.summonInstance.sprite.setTint(0x8888ff);
                if (this.scene.fxManager) {
                    this.scene.fxManager.showDamageText(this.summonInstance, 'MAX SLEEP CHANCE!', '#0000ff');
                }
            }
            this.ultStage = 3;
        }
    }

    summonSiren() {
        // Spawn near Lute
        const x = this.x;
        const y = this.y - 100;

        soundEffects.playHarpSound();
        // Visual effect
        this.createSummonEffect(x, y);

        // Delayed spawn
        this.scene.time.delayedCall(500, () => {
            if (!this.active) return;

            const siren = this.spawnSummon(Siren, x, y, { sleepChance: 0 });
            this.summonInstance = siren;

            console.log(`[Ultimate] Siren summoned for Lute!`);
            EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `${this.unitName}가 사이렌을 소환했습니다! 🧜‍♀️`);
        });
    }

    createSummonEffect(x, y) {
        // Cyan Ripple/Column
        const ripple = this.scene.add.circle(x, y, 10, 0x00ffff, 0.4);
        ripple.setDepth(25000);

        this.scene.tweens.add({
            targets: ripple,
            radius: 120,
            alpha: 0,
            duration: 1000,
            onComplete: () => ripple.destroy()
        });

        if (this.scene.fxManager) {
            this.scene.fxManager.createSparkleEffect({ x, y, active: true });
        }
    }

    onSummonDied(summon) {
        if (this.summonInstance === summon) {
            console.log(`[Ultimate] Lute's summon died. Resetting stage.`);
            this.summonInstance = null;
            this.ultStage = 0;
            this.ultGauge = 0;
        }
    }

    // Override gainUltGauge to clamp if max buffed
    gainUltGauge(amount) {
        if (this.characterId === 'lute' && this.ultStage >= 3) {
            return;
        }
        super.gainUltGauge(amount);
    }
}
