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
            await this.triggerBarkSequence();
        }
    }

    /**
     * Triggers a sequence of barks (Initial + optional reactions)
     */
    async triggerBarkSequence() {
        if (!this.scene.mercenaries || this.scene.mercenaries.countActive(true) === 0) return;
        if (!localLLM.isReady) return;

        // 1. Initial Bark
        const firstSpeaker = this.getRandomActiveMercenary();
        if (!firstSpeaker) return;

        const firstBarkText = await this.performBark(firstSpeaker);
        if (!firstBarkText) return;

        // 2. Roll for Reaction (Baton Pass)
        const reactionChance = 0.60; // Increased chance for chemistry check
        if (Math.random() < reactionChance) {
            // Wait 1.5 - 2.5 seconds before the reaction
            this.scene.time.delayedCall(Phaser.Math.Between(1500, 2500), async () => {
                await this.triggerReaction(firstSpeaker.unitName, firstBarkText, [firstSpeaker.characterId], firstSpeaker.characterId);
            });
        }
    }

    /**
     * Triggers a reaction bark from another mercenary.
     * Prioritizes mercenaries who have a relationship with the previous speaker.
     */
    async triggerReaction(prevSpeakerName, prevText, excludedIds = [], prevSpeakerId = null) {
        // Try to find a reactor who knows the previous speaker
        const reactor = this.getBestReactor(excludedIds, prevSpeakerId);
        if (!reactor) return;

        const charConfig = Object.values(Characters).find(c => c.id === reactor.characterId);
        if (!charConfig) return;

        console.log(`[BarkManager] ${reactor.unitName} is reacting to ${prevSpeakerName}...`);

        try {
            // Pass prevSpeakerId to generateReactionBark so it can look up relationships
            const reactionText = await localLLM.generateReactionBark(charConfig, prevSpeakerName, prevText, prevSpeakerId);
            if (reactionText) {
                this.emitBarkEvent(reactor, reactionText);

                // Option for 3rd string chain (Chain reaction)
                const chainChance = 0.30; // 30% chance for a 3rd person to join
                if (Math.random() < chainChance) {
                    excludedIds.push(reactor.characterId);
                    this.scene.time.delayedCall(Phaser.Math.Between(2000, 3000), async () => {
                        // The current reactor becomes the previous speaker for the next link in the chain
                        await this.triggerReaction(reactor.unitName, reactionText, excludedIds, reactor.characterId);
                    });
                }
            }
        } catch (error) {
            console.error('[BarkManager] Reaction failed:', error);
        }
    }

    /**
     * Selects a random active mercenary.
     */
    getRandomActiveMercenary(excludedIds = []) {
        const activeMercs = this.scene.mercenaries.getChildren().filter(m =>
            m.active && m.hp > 0 && !excludedIds.includes(m.characterId)
        );
        if (activeMercs.length === 0) return null;
        return Phaser.Utils.Array.GetRandom(activeMercs);
    }

    /**
     * Selects a reactor, prioritizing those with a relationship to the previous speaker.
     */
    getBestReactor(excludedIds, previousSpeakerId) {
        const activeMercs = this.scene.mercenaries.getChildren().filter(m =>
            m.active && m.hp > 0 && !excludedIds.includes(m.characterId)
        );

        if (activeMercs.length === 0) return null;

        // If we know who spoke last, look for someone who has a relationship with them
        if (previousSpeakerId) {
            const relatedMercs = activeMercs.filter(m => {
                const config = Object.values(Characters).find(c => c.id === m.characterId);
                return config && config.relationships && config.relationships[previousSpeakerId];
            });

            if (relatedMercs.length > 0) {
                console.log(`[BarkManager] Found ${relatedMercs.length} related mercenaries for ${previousSpeakerId}. Picking one.`);
                return Phaser.Utils.Array.GetRandom(relatedMercs);
            }
        }

        // Fallback to random
        return Phaser.Utils.Array.GetRandom(activeMercs);
    }

    async performBark(target) {
        const charConfig = Object.values(Characters).find(c => c.id === target.characterId);
        if (!charConfig || !charConfig.personality) return null;

        console.log(`[BarkManager] Primary bark: ${target.unitName}`);
        try {
            const barkText = await localLLM.generateBark(charConfig);
            if (barkText) {
                this.emitBarkEvent(target, barkText);
                return barkText;
            }
        } catch (error) {
            console.error('[BarkManager] Primary bark failed:', error);
        }
        return null;
    }

    emitBarkEvent(target, text) {
        EventBus.emit(EventBus.EVENTS.UNIT_BARK, {
            agentId: target.className,
            characterId: target.characterId,
            unitName: target.unitName,
            text: text
        });
    }

    // Keep triggerRandomBark for compatibility or remove it if unused
    async triggerRandomBark() {
        return this.triggerBarkSequence();
    }
}
