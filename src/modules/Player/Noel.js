import Phaser from 'phaser';
import Bard from './Bard.js';
import HelpPlantFriends from '../Skills/HelpPlantFriends.js';
import EventBus from '../Events/EventBus.js';

export default class Noel extends Bard {
    constructor(scene, x, y, warrior, characterConfig = {}) {
        super(scene, x, y, warrior, characterConfig);

        // Override skill for Noel
        this.skill = new HelpPlantFriends({ cooldown: 12000 });

        // Fix shadow grounding (high-res sprites often need larger offsets)
        this.shadowOffset = 15;
        if (this.shadow) {
            this.shadow.destroy();
            this.shadow = this.scene.fxManager.createShadow(this);
        }
    }

    /**
     * Noel's Ultimate: "Blessing of Spring" (봄의 축복)
     * Allies gain temporary HP regeneration, CC immunity, and cleansing.
     */
    async executeUltimate() {
        const scene = this.scene;
        const skillName = "봄의 축복";

        await scene.ultimateManager.playCutscene(this, skillName);

        const duration = 10000; // 10 seconds
        const allies = this.allyGroup.getChildren().filter(c => c.active && c.hp > 0);
        const noelMAtk = this.getTotalMAtk ? this.getTotalMAtk() : this.mAtk;

        allies.forEach(ally => {
            // Apply CC Immunity & Buff
            ally.isCCImmune = true;
            scene.buffManager.applyBuff(ally, this, 'Blessing_of_Spring', duration, 0, 0, 0.2, { bonusCrit: 10 });

            // Cleanse current CCs
            if (ally.cleanse) {
                ally.cleanse();
            }

            // Periodic Heal (Based on Noel's MAtk)
            for (let i = 1; i <= 10; i++) {
                scene.time.delayedCall(i * 1000, () => {
                    if (ally.active && ally.hp > 0) {
                        // Heal for 10% of Noel's MAtk per second
                        const heal = noelMAtk * 0.1;
                        ally.receiveHeal(heal);
                        if (scene.fxManager) scene.fxManager.showHealText(ally, `+${Math.round(heal)}`, '#55ff55');
                    }
                });
            }

            // Remove CC Immunity after duration
            scene.time.delayedCall(duration, () => {
                if (ally.active) ally.isCCImmune = false;
            });

            // Visual effect: Luxury Orbiting plants (6 symbols)
            if (scene.fxManager) {
                const plantTextures = [
                    'emoji_kiwi', 'emoji_grapes', 'emoji_watermelon',
                    'emoji_pineapple', 'emoji_banana', 'emoji_strawberry'
                ];
                scene.fxManager.createOrbitEffect(ally, plantTextures, duration);
            }
        });

        EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `${this.unitName}가 봄의 축복(MAtk 비례 치유 & CC 면역)을 내렸습니다! 🌸🌿`);
    }
}
