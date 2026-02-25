import EventBus from '../Events/EventBus.js';

/**
 * LocalLLM.js (Static Version)
 * Replaces the external LLM dependency with a local static dialogue system.
 * This version picks random lines from EntityStats.js instead of calling LM Studio.
 */
class LocalLLM {
    constructor() {
        this.isReady = true; // Always ready in static mode
        this.activeRequest = null;
    }

    /**
     * Dummy method for compatibility with existing check logic.
     */
    async checkStatus() {
        this.isReady = true;
        return true;
    }

    /**
     * Helper to process operations sequentially if needed.
     */
    async _enqueue(operation) {
        const previous = this.activeRequest || Promise.resolve();
        const current = (async () => {
            await previous.catch(() => { });
            return await operation();
        })();
        this.activeRequest = current;
        return current;
    }

    /**
     * Picks a random static bark from character config.
     */
    async generateBark(characterConfig, currentLevel = 1, situationalContext = "", activePartyIds = [], avoidList = []) {
        return this._enqueue(async () => {
            console.log(`[StaticLLM] Picking bark for ${characterConfig.name || "Unknown"}`);

            const examples = characterConfig.dialogueExamples || [];
            if (examples.length === 0) return "......";

            // Pick a random line from examples
            const randomIndex = Math.floor(Math.random() * examples.length);
            return examples[randomIndex];
        });
    }

    /**
     * Picks a random response for chat interactions.
     */
    async generateResponse(characterConfig, history, currentLevel = 1, situationalContext = "") {
        return this._enqueue(async () => {
            console.log(`[StaticLLM] Picking response for ${characterConfig.name}`);

            const examples = characterConfig.dialogueExamples || [];
            if (examples.length === 0) return "반갑습니다.";

            const randomIndex = Math.floor(Math.random() * examples.length);
            return examples[randomIndex];
        });
    }

    /**
     * Reaction barks also use static examples.
     */
    async generateReactionBark(characterConfig, eventType, eventText) {
        return this._enqueue(async () => {
            const examples = characterConfig.dialogueExamples || [];
            if (examples.length === 0) return "!";

            const randomIndex = Math.floor(Math.random() * examples.length);
            return examples[randomIndex];
        });
    }
}

const localLLM = new LocalLLM();
export default localLLM;
