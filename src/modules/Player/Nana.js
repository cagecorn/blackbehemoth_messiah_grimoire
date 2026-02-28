import Phaser from 'phaser';
import Bard from './Bard.js';
import MusicalMagicalCritical from '../Skills/MusicalMagicalCritical.js';
import BloodThirst from '../Skills/BloodThirst.js';
import applyMeleeAI from '../AI/MeleeAI.js';
import applyBardAI from '../AI/BardAI.js';
import { Characters } from '../Core/EntityStats.js';
import EventBus from '../Events/EventBus.js';

/**
 * Nana.js
 * The Dual-Personality Bard. 
 * Can transform into a melee warrior via her ultimate.
 */
export default class Nana extends Bard {
    constructor(scene, x, y, warrior, characterConfig = {}) {
        const config = { ...Characters.NANA, ...characterConfig };
        super(scene, x, y, warrior, config);

        this.isBerserk = false;
        this.originalConfig = { ...config };

        // Skill overrides
        this.specialSkill = new MusicalMagicalCritical();
        this.ultimateSkill = new BloodThirst(this);

        // Personality storage
        this.normalPersonality = Characters.NANA.personality;
        this.berserkPersonality = Characters.NANA.berserkPersonality;
    }

    getSkillProgress() {
        if (this.isBerserk) return 0;
        return this.specialSkill.getCooldownProgress(this.scene.time.now, this.castSpd);
    }

    update(time, delta) {
        if (this.isBerserk) {
            super.update(time, delta); // Calls Bard.update -> Mercenary.update
            this.handleBerserkVisuals();
            return;
        }
        super.update(time, delta);

        // Special skill auto-cast (Normal mode only)
        if (!this.isAirborne && !this.isStunned && !this.isKnockedBack && !this.isBerserk) {
            this.specialSkill.execute(this);
        }
    }

    handleBerserkVisuals() {
        // Create red after-image if moving
        const velocity = this.body ? this.body.velocity : { x: 0, y: 0 };
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

        if (speed > 10) {
            const now = this.scene.time.now;
            if (!this.lastTraceTime) this.lastTraceTime = 0;

            if (now - this.lastTraceTime > 100) { // Every 100ms
                this.lastTraceTime = now;
                this.createAfterImage();
            }
        }
    }

    createAfterImage() {
        const afterImage = this.scene.add.image(this.x, this.y, 'nana_ultimate_sprite')
            .setDepth(this.depth - 1)
            .setScale(this.sprite.scaleX, this.sprite.scaleY)
            .setAlpha(0.5)
            .setTint(0xff0000);

        this.scene.tweens.add({
            targets: afterImage,
            alpha: 0,
            duration: 500,
            onComplete: () => afterImage.destroy()
        });
    }

    async executeUltimate() {
        if (this.isBerserk) return;
        await this.ultimateSkill.execute(this.scene, this);
    }

    enterBerserk(duration) {
        this.isBerserk = true;

        // 1. Visual change
        this.sprite.setTexture('nana_ultimate_sprite');

        // Save old stats
        this.oldStats = {
            atk: this.atk,
            atkSpd: this.atkSpd,
            speed: this.speed,
            crit: this.crit,
            eva: this.eva,
            atkRange: this.atkRange || 200,
            rangeMin: this.rangeMin || 150,
            rangeMax: this.rangeMax || 220
        };

        // 2. Stat boosts (Using Bonus Properties)
        this.bonusAtk += this.oldStats.atk * 1.5; // +150% = x2.5 total
        this.bonusAtkSpd += this.oldStats.atkSpd * 0.5; // Reduce delay by 50%
        this.bonusSpeed += 150;
        this.bonusCrit += 50;
        this.bonusEva += 40;

        // Range modification still done directly as it's a fixed mode-swap
        this.atkRange = 60;
        this.rangeMin = 0;
        this.rangeMax = 80;

        // Update config for AI visibility
        this.config.atkRange = this.atkRange;
        this.config.rangeMin = this.rangeMin;
        this.config.rangeMax = this.rangeMax;

        // 3. AI Swap
        // Melee AI for berserk mode
        applyMeleeAI(this, (u) => u.targetGroup, 'AGGRESSIVE');

        // 4. Personality Swap
        this.personality = this.berserkPersonality;
        this.config.dialogueExamples = Characters.NANA.berserkDialogueExamples;

        // 5. Visual Aura
        this.berserkAura = this.scene.add.particles(0, 0, 'emoji_blood_drop', {
            speed: 100,
            scale: { start: 1, end: 0 },
            alpha: { start: 0.5, end: 0 },
            lifespan: 1000,
            frequency: 100,
            follow: this.sprite
        }).setDepth(this.depth - 1);

        console.log(`[Nana] Berserk mode ACTIVE for ${duration}ms`);
        EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `${this.unitName}가 피에 굶주린 본성을 드러냅니다! 🩸`);
    }

    exitBerserk() {
        this.isBerserk = false;

        // 1. Visual Revert
        this.sprite.setTexture('nana_sprite');
        if (this.berserkAura) {
            this.berserkAura.destroy();
        }

        // 2. Stat Revert
        this.bonusAtk -= this.oldStats.atk * 1.5;
        this.bonusAtkSpd -= this.oldStats.atkSpd * 0.5;
        this.bonusSpeed -= 150;
        this.bonusCrit -= 50;
        this.bonusEva -= 40;

        this.atkRange = this.oldStats.atkRange;
        this.rangeMin = this.oldStats.rangeMin;
        this.rangeMax = this.oldStats.rangeMax;

        this.config.atkRange = this.oldStats.atkRange;
        this.config.rangeMin = this.oldStats.rangeMin;
        this.config.rangeMax = this.oldStats.rangeMax;

        // 3. AI Revert
        this.initAI(); // Back to Bard AI

        // 4. Personality Revert
        this.personality = this.normalPersonality;
        this.config.dialogueExamples = Characters.NANA.dialogueExamples;

        // 5. Penalty: Sleep for 2 seconds
        this.isAsleep = true;
        if (this.scene.fxManager) {
            this.scene.fxManager.showDamageText(this, 'EXHAUSTED... 💤', '#ffffff');
        }

        this.scene.time.delayedCall(2000, () => {
            this.isAsleep = false;
        });

        console.log(`[Nana] Berserk mode ended. Exhausted.`);
    }

    // Override for UI consistency (skill descriptions etc)
    getCustomStatuses() {
        if (this.isBerserk) {
            return [{
                name: '피의 갈망 (Berserk)',
                description: '이중인격 발현! 근접 공격력과 속도가 비약적으로 상승합니다.',
                emoji: '🩸',
                category: 'buff'
            }];
        }
        return [];
    }
}
