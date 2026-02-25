import Phaser from 'phaser';
import Bard from './Bard.js';
import HelpAnimalFriends from '../Skills/HelpAnimalFriends.js';
import EventBus from '../Events/EventBus.js';

export default class Noah extends Bard {
    constructor(scene, x, y, warrior, characterConfig = {}) {
        super(scene, x, y, warrior, characterConfig);

        // Override skill for Noah
        this.skill = new HelpAnimalFriends({ cooldown: 12000 });

        // Fix shadow grounding (high-res sprites often need larger offsets)
        this.shadowOffset = 15;
        if (this.shadow) {
            this.shadow.destroy();
            this.shadow = this.scene.fxManager.createShadow(this);
        }
    }

    async executeUltimate() {
        const scene = this.scene;
        const skillName = "노아의 방주";

        await scene.ultimateManager.playCutscene(this, skillName);

        const duration = 10000; // 10 seconds
        const allies = this.allyGroup.getChildren().filter(c => c.active && c.hp > 0);

        allies.forEach(ally => {
            // Noah's Ark: +15% to ALL stats
            const buffStats = {
                bonusCrit: ally.getTotalCrit() * 0.15,
                bonusEva: ally.getTotalEva() * 0.15,
                bonusSpeed: ally.getTotalSpeed() * 0.15,
                bonusDef: ally.getTotalDef() * 0.15,
                bonusMDef: ally.getTotalMDef() * 0.15,
                bonusAtkSpd: ally.getTotalAtkSpd() * 0.15,
                bonusAtkRange: ally.getTotalAtkRange() * 0.15,
                bonusRangeMin: ally.getTotalRangeMin() * 0.15,
                bonusRangeMax: ally.getTotalRangeMax() * 0.15,
                bonusCastSpd: ally.getTotalCastSpd() * 0.15,
                bonusAcc: ally.getTotalAcc() * 0.15
            };

            // Hybrid stats (atk, mAtk) are separate arguments in applyBuff for compatibility
            const amountAtk = ally.getTotalAtk() * 0.15;
            const amountMAtk = ally.getTotalMAtk() * 0.15;

            scene.buffManager.applyBuff(
                ally,
                this,
                'Noahs_Ark_Blessing',
                duration,
                amountAtk,
                amountMAtk,
                0, // DR
                buffStats
            );

            // Visual effect: Orbiting animals
            if (scene.fxManager) {
                const animalTextures = ['emoji_dog', 'emoji_cat', 'emoji_horse', 'emoji_pig', 'emoji_tiger', 'emoji_bison', 'emoji_sheep'];
                scene.fxManager.createOrbitEffect(ally, animalTextures, duration);
            }
        });

        EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `${this.unitName}가 노아의 방주(고대 종의 축복)를 소환했습니다! 🚢🐾`);
    }
}
