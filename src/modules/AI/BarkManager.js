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
        this.barkIntervalMin = 8000; // 8 seconds
        this.barkIntervalMax = 15000; // 15 seconds
        this.barkBuffer = [];
        this.isGenerating = false;

        // Initial delay - trigger soon after entering
        this.setNextBarkTime(scene.time.now + 1500);

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

    async triggerBarkSequence() {
        if (!this.scene.mercenaries || this.scene.mercenaries.countActive(true) === 0) return;
        if (!localLLM.isReady || this.isGenerating) return;

        // 1. If buffer is empty, reload the magazine (batch generate)
        if (this.barkBuffer.length === 0) {
            console.log(`[BarkManager] Magazine empty. Reloading Dialogue Pistol...`);
            this.isGenerating = true;
            try {
                const activeMercs = this.scene.mercenaries.getChildren().filter(m => m.active && m.hp > 0);
                const activeConfigs = activeMercs.map(m => {
                    const charConfig = Object.values(Characters).find(c => c.id === m.characterId);
                    return { ...charConfig, level: m.level || 1, characterId: m.characterId };
                });

                const sceneType = this.getSceneType();
                const script = await localLLM.generatePartyBarks(activeConfigs, sceneType);

                if (script && script.length > 0) {
                    this.barkBuffer = script;
                    console.log(`[BarkManager] Pistol reloaded with ${this.barkBuffer.length} shots.`);
                } else {
                    console.warn("[BarkManager] Reload failed: empty script returned.");
                }
            } catch (err) {
                console.error("[BarkManager] Reload failed with error:", err);
            } finally {
                this.isGenerating = false;
            }
        }

        // 2. Fire the barks from the buffer
        if (this.barkBuffer.length > 0) {
            console.log(`[BarkManager] Firing sequence from buffer (${this.barkBuffer.length} lines left)`);

            let accumulatedDelay = 0;
            const currentSequence = [...this.barkBuffer];
            this.barkBuffer = []; // Clear buffer so next trigger reloads

            currentSequence.forEach((shot, index) => {
                this.scene.time.delayedCall(accumulatedDelay, () => {
                    const speaker = this.scene.mercenaries.getChildren().find(m => m.characterId === shot.characterId && m.active && m.hp > 0);
                    if (speaker) {
                        this.emitBarkEvent(speaker, shot.text);
                    }
                });

                // If it's the last bark, schedule the next sequence only after this one finishes
                if (index === currentSequence.length - 1) {
                    const finalDelay = accumulatedDelay + 5000; // Extra padding
                    this.setNextBarkTime(this.scene.time.now + finalDelay);
                }

                // Natural dialogue gap
                accumulatedDelay += Phaser.Math.Between(2500, 4000); // Slightly wider gap for readability
            });
        }
    }

    /**
     * Triggers a reaction bark from another mercenary.
     * Prioritizes mercenaries who have a relationship with the previous speaker.
     */
    async triggerReaction(prevSpeakerName, prevText, excludedIds = [], prevSpeakerId = null, activePartyIds = []) {
        // Try to find a reactor who knows the previous speaker
        const reactor = this.getBestReactor(excludedIds, prevSpeakerId);
        if (!reactor) return;

        const charConfig = Object.values(Characters).find(c => c.id === reactor.characterId);
        if (!charConfig) return;

        console.log(`[BarkManager] ${reactor.unitName} is reacting to ${prevSpeakerName}...`);

        try {
            // Use instance personality if it differs from static config (for Nana)
            const dynamicConfig = {
                ...charConfig,
                personality: reactor.personality || charConfig.personality
            };
            // Pass level and activePartyIds to generateReactionBark
            const reactionText = await localLLM.generateReactionBark(dynamicConfig, prevSpeakerName, prevText, prevSpeakerId, reactor.level || 1, activePartyIds);
            if (reactionText) {
                this.emitBarkEvent(reactor, reactionText);

                // Option for 3rd string chain (Chain reaction)
                const chainChance = 0.30; // 30% chance for a 3rd person to join
                if (Math.random() < chainChance) {
                    excludedIds.push(reactor.characterId);
                    this.scene.time.delayedCall(Phaser.Math.Between(2000, 3000), async () => {
                        // The current reactor becomes the previous speaker for the next link in the chain
                        await this.triggerReaction(reactor.unitName, reactionText, excludedIds, reactor.characterId, activePartyIds);
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
     * Gets character IDs of all currently active mercenaries in the scene.
     */
    getActivePartyIds() {
        if (!this.scene.mercenaries) return [];
        return this.scene.mercenaries.getChildren()
            .filter(m => m.active && m.hp > 0)
            .map(m => m.characterId);
    }

    /**
     * Identifies the current scene type for LLM context.
     */
    getSceneType() {
        if (!this.scene) return "";
        const className = this.scene.constructor.name;
        if (className === 'DungeonScene') return "던전 탐험 중";
        if (className === 'RaidScene') return "보스 레이드 중";
        if (className === 'ArenaScene') return "아레나 전투 중";
        return "전투 중";
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

        console.log(`[BarkManager] Primary bark: ${target.unitName} (LV ${target.level})`);
        try {
            // Use instance personality if it differs from static config (for Nana)
            const dynamicConfig = {
                ...charConfig,
                personality: target.personality || charConfig.personality,
                dialogueExamples: target.dialogueExamples || charConfig.dialogueExamples
            };
            const sceneType = this.getSceneType();
            const activeIds = this.getActivePartyIds();
            const barkText = await localLLM.generateBark(dynamicConfig, target.level || 1, sceneType, activeIds);
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
            agentId: target.id,
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
