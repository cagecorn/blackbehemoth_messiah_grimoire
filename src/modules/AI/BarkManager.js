import EventBus from '../Events/EventBus.js';
import localLLM from './LocalLLM.js';
import { Characters } from '../Core/EntityStats.js';

/**
 * BarkManager.js
 * Periodically selects a random mercenary to "bark" (say something) using LLM.
 */
export default class BarkManager {
    constructor(scene) {
        this.scene = scene;
        this.nextBarkTime = 0;
        this.barkIntervalMin = 15000; // 15 seconds
        this.barkIntervalMax = 30000; // 30 seconds

        // Initial delay
        this.setNextBarkTime(scene.time.now + 10000);

        console.log('[BarkManager] Initialized');
    }

    setNextBarkTime(now) {
        const delay = Phaser.Math.Between(this.barkIntervalMin, this.barkIntervalMax);
        this.nextBarkTime = now + delay;
    }

    async update(time, delta) {
        if (time >= this.nextBarkTime) {
            this.setNextBarkTime(time);
            await this.triggerRandomBark();
        }
    }

    async triggerRandomBark() {
        if (!this.scene.mercenaries || this.scene.mercenaries.countActive(true) === 0) return;
        if (!localLLM.isReady) return;

        // Pick a random active mercenary
        const activeMercs = this.scene.mercenaries.getChildren().filter(m => m.active && m.hp > 0);
        if (activeMercs.length === 0) return;

        const target = Phaser.Utils.Array.GetRandom(activeMercs);

        // Find the character configuration to get the personality
        const charConfig = Object.values(Characters).find(c => c.id === target.characterId);
        if (!charConfig || !charConfig.personality) return;

        console.log(`[BarkManager] Attempting bark for ${target.unitName}...`);

        try {
            const barkText = await localLLM.generateBark(charConfig);
            if (barkText) {
                // Emit event for UI and the unit itself
                EventBus.emit(EventBus.EVENTS.UNIT_BARK, {
                    agentId: target.className, // warrior, archer, etc.
                    characterId: target.characterId, // aren, silvi, etc.
                    unitName: target.unitName,
                    text: barkText
                });
            }
        } catch (error) {
            console.error('[BarkManager] Bark generation failed:', error);
        }
    }
}
