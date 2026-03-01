import Phaser from 'phaser';
import SoundEffects from '../Core/SoundEffects.js';

/**
 * BloodThirst.js
 * Nana's Ultimate: "Give me blood! Hahaha!" (피를 다오! 크하하하!)
 * Transforms Nana into a berserker warrior.
 */
export default class BloodThirst {
    constructor(caster) {
        this.caster = caster;
        this.name = '피를 다오! 크하하하!';
        this.duration = 20000; // 20 seconds
        this.isExecuting = false;

        // Stat boosts during berserk
        this.atkMultiplier = 2.5;
        this.atkSpdBoost = 0.5; // Reduced cooldown by 50%
        this.speedBoost = 150;
        this.critBoost = 50; // +50% Crit
    }

    async execute(scene, caster) {
        if (this.isExecuting || !caster.active) return;
        this.isExecuting = true;

        console.log(`[BloodThirst] Nana is going BERSERK!`);

        // 1. Play dramatic cutscene
        await scene.ultimateManager.playCutscene(caster, this.name);
        SoundEffects.playSpookyJjijingSound();

        // 2. Start Transformation
        caster.enterBerserk(this.duration);

        // 3. Wait for duration
        await new Promise(resolve => scene.time.delayedCall(this.duration, () => {
            if (caster.active) {
                caster.exitBerserk();
            }
            this.isExecuting = false;
            resolve();
        }));
    }
}
