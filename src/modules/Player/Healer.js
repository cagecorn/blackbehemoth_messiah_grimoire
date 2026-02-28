import Phaser from 'phaser';
import Mercenary from './Mercenary.js';
import applyHealerAI from '../AI/HealerAI.js';
import Blackboard from '../AI/Blackboard.js';
import { MercenaryClasses } from '../Core/EntityStats.js';
import { HealerActions } from '../Combat/HealerActions.js';
import EventBus from '../Events/EventBus.js';
import MassHeal from '../Skills/MassHeal.js';
import PlaceholderSkill from '../Skills/PlaceholderSkill.js';
import GuardianAngel from './GuardianAngel.js';
import soundEffects from '../Core/SoundEffects.js';

/**
 * Healer.js
 * Support unit. Heals allies and uses magic attacks.
 */
export default class Healer extends Mercenary {
    constructor(scene, x, y, warrior, characterConfig = {}) {
        const config = { ...MercenaryClasses.HEALER, ...characterConfig };
        super(scene, x, y, config);
        this.warrior = warrior;

        this.mAtk = this.config.mAtk;
        this.atkSpd = this.config.atkSpd || 1200;
        this.castSpd = this.config.castSpd || 1000;
        this.lastActionTime = 0;

        // Instantiate Skill dynamically
        if (config.skillName === 'MassHeal') {
            this.skill = new MassHeal({
                cooldown: 8000,
                healMultiplier: 3.0
            });
        } else if (config.skillName === 'PlaceholderSkill') {
            this.skill = new PlaceholderSkill();
        }

        this.initAI();

        // Ultimate State
        this.summonedUnit = null;
        this.ultStage = 0; // 0: None, 1: Summoned, 2: Buff1, 3: Buff2
    }

    getSkillProgress() {
        if (!this.skill) return 0;
        return this.skill.getCooldownProgress(this.scene.time.now, this.castSpd);
    }

    initAI() {
        this.blackboard = new Blackboard();
        this.blackboard.set('self', this);
        this.blackboard.set('ai_state', 'AGGRESSIVE');
        this.blackboard.set('target', null);
        this.blackboard.set('heal_target', null);

        // Provides ally and enemy groups based on team
        applyHealerAI(
            this,
            (u) => u.allyGroup,
            (u) => u.targetGroup
        );
    }

    update() {
        super.update();

        // Auto-cast Mass Heal when off cooldown
        if (!this.isAirborne && !this.isStunned && !this.isKnockedBack && this.skill) {
            // We just cast it, the skill handles finding all allies and healing them
            // Only try if there are active allies taking damage (optional optimization, but we can just cast on cooldown for now)
            this.skill.execute(this);
        }

        // Always prioritize the nearest enemy to ensure proper kiting
        this.findNearestEnemy();
    }

    findNearestEnemy() {
        // AI now handles initial targeting via conditions, 
        // but we keep this for manual/shared logic if needed
        const targetGroup = this.targetGroup;
        if (!targetGroup) return;
        const enemies = targetGroup.getChildren();
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

    castHeal(target) {
        return HealerActions.castHeal(this, target);
    }

    castAttack(target) {
        return HealerActions.castAttack(this, target);
    }

    showHealFX(target) {
        HealerActions.showHealFX(this.scene, target);
    }

    /**
     * Sera's Ultimate: "Summon: Guardian Angel"
     */
    async executeUltimate() {
        if (this.characterId !== 'sera') {
            console.warn(`[Ultimate] ${this.unitName} (not Sera) triggered ultimate but has no implementation.`);
            return;
        }

        const scene = this.scene;
        const skillName = "소환 : 수호 천사";

        // Handle Stages
        if (this.ultStage === 0) {
            // First time: Summon
            await scene.ultimateManager.playCutscene(this, skillName);
            this.summonGuardianAngel();
            this.ultStage = 1;
        } else if (this.ultStage === 1) {
            // Second time: Buff 1
            await scene.ultimateManager.playCutscene(this, skillName + " (강화 1단계)");
            if (this.summonedUnit && this.summonedUnit.active) {
                this.summonedUnit.applyBuffStage(1);
            }
            this.ultStage = 2;
        } else if (this.ultStage === 2) {
            // Third time: Buff 2
            await scene.ultimateManager.playCutscene(this, skillName + " (강화 2단계)");
            if (this.summonedUnit && this.summonedUnit.active) {
                this.summonedUnit.applyBuffStage(2);
            }
            this.ultStage = 3;
        }
    }

    summonGuardianAngel() {
        // Spawn near Sera
        const x = this.x;
        const y = this.y - 100;

        soundEffects.playAngelSound();
        // Visual effect: Light descending
        this.createSummonEffect(x, y);

        // Delayed spawn to match effect
        this.scene.time.delayedCall(500, () => {
            if (!this.active) return;

            const angel = this.spawnSummon(GuardianAngel, x, y);
            this.summonedUnit = angel;

            console.log(`[Ultimate] Guardian Angel summoned for Sera!`);
            EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `${this.unitName}가 수호 천사를 소환했습니다! ✨`);
        });
    }

    createSummonEffect(x, y) {
        // Light Pillar
        const light = this.scene.add.rectangle(x, y - 400, 60, 800, 0xffffff, 0.6);
        light.setDepth(25000);
        light.setOrigin(0.5, 0.5);

        this.scene.tweens.add({
            targets: light,
            alpha: 0,
            scaleX: 2,
            duration: 800,
            ease: 'Expo.easeOut',
            onComplete: () => light.destroy()
        });

        // Sparkles at ground
        if (this.scene.fxManager) {
            for (let i = 0; i < 5; i++) {
                this.scene.time.delayedCall(i * 100, () => {
                    // Safety check: scene and fxManager still valid
                    if (this && this.active && this.scene && this.scene.fxManager) {
                        this.scene.fxManager.createSparkleEffect({ x, y, active: true });
                    }
                });
            }
        }
    }

    onSummonDied(summon) {
        if (this.summonedUnit === summon) {
            console.log(`[Ultimate] Sera's summon died. Resetting stage.`);
            this.summonedUnit = null;
            this.ultStage = 0;
            this.ultGauge = 0; // Ensure it starts from 0 again
        }
    }

    // Override gainUltGauge to clamp if max buffed
    gainUltGauge(amount) {
        if (this.characterId === 'sera' && this.ultStage >= 3) {
            return; // No more gauge at max stage
        }
        super.gainUltGauge(amount);
    }
}
