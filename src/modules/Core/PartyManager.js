/**
 * PartyManager.js
 * Centralized state management for all mercenaries.
 * Tracks level, exp, hp, and equipment across scenes.
 */
class PartyManager {
    constructor() {
        this.mercenaryStates = {}; // Map of characterId -> state object
    }

    init() {
        console.log('[PartyManager] Initialized');
    }

    /**
     * Updates or creates the state for a mercenary.
     * @param {string} id 
     * @param {Object} state 
     */
    saveState(id, state) {
        this.mercenaryStates[id] = {
            ...this.mercenaryStates[id],
            ...state,
            lastUpdate: Date.now()
        };
    }

    /**
     * Retrieves the state for a mercenary by ID.
     * @param {string} id 
     * @returns {Object|null}
     */
    getState(id) {
        return this.mercenaryStates[id] || null;
    }

    /**
     * Returns the entire roster state.
     */
    getAllStates() {
        return this.mercenaryStates;
    }
}

const partyManager = new PartyManager();
export default partyManager;
