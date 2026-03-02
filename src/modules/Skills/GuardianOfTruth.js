import Phaser from 'phaser';
import EventBus from '../Events/EventBus.js';
import soundEffects from '../Core/SoundEffects.js';

/**
 * GuardianOfTruth.js
 * Veve's Ultimate Skill.
 * Transforms Veve into his enlightened form for 15 seconds.
 */
export default class GuardianOfTruth {
    constructor(caster) {
        this.id = 'guardian_of_truth';
        this.name = '진리의 파수꾼';
        this.caster = caster;
        this.duration = 15000;
        this.isActive = false;
    }

    /**
     * Executes the ultimate sequence.
     */
    async execute(scene, caster) {
        if (this.isActive) return false;

        console.log(`[Ultimate] ${caster.unitName} ACTIVATES Guardian of Truth!`);
        this.isActive = true;

        // 1. Cutscene Trigger (Global UI)
        EventBus.emit(EventBus.EVENTS.ULTIMATE_CAST, {
            unitName: caster.unitName,
            ultName: this.name,
            cutscene: caster.config.cutscene || 'veve_cutscene'
        });

        // 2. Sound
        if (soundEffects.playAaahSound) {
            soundEffects.playAaahSound();
        }
        // "Kiiiing!" sound effect simulation (High pitched pluck)
        if (soundEffects.playSylvieSorrySound) {
            soundEffects.playSylvieSorrySound();
        }

        // 3. Transformation Logic
        this.enterUltimateMode(scene, caster);

        // 4. Duration Timer
        scene.time.delayedCall(this.duration, () => {
            if (caster.active) {
                this.exitUltimateMode(scene, caster);
            }
        });

        return true;
    }

    enterUltimateMode(scene, caster) {
        caster.isUltimateActive = true;

        // Visual Transformation
        caster.sprite.setTexture('veve_ultimate_sprite');

        // Green Glow Effect (Aura)
        this.aura = scene.add.particles(0, 0, 'emoji_sparkle', {
            speed: { min: 20, max: 100 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 800,
            frequency: 50,
            blendMode: 'ADD',
            tint: 0x00ff00, // Green for "Truth/Guardian"
            follow: caster.sprite
        });
        this.aura.setDepth(caster.depth - 1);

        // Stat/Skill Buffs
        // Cyclone is modified in its own execute logic by checking caster.isUltimateActive
        // We can also reduce the caster's internal cooldown scaling if needed
        // But the simplest way is to check this flag in Veve.js or Cyclone.js

        const msg = `${caster.unitName}가 진리의 파수꾼으로 각성합니다! 👁️`;
        EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, msg);
    }

    exitUltimateMode(scene, caster) {
        this.isActive = false;
        caster.isUltimateActive = false;

        // Revert Visuals
        caster.sprite.setTexture('veve_sprite');
        if (this.aura) {
            this.aura.destroy();
        }

        EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `${caster.unitName}의 각성 상태가 해제되었습니다.`);
    }
}
