/**
 * PartyManager.js
 * Centralized state management for all mercenaries.
 * Tracks level, exp, hp, and equipment across scenes.
 */
class PartyManager {
    constructor() {
        this.mercenaryStates = {}; // Map of characterId -> state object (runtime stats)
        this.activeParty = [null, null, null, null, null]; // 5 slots for mercenary IDs
        this.roster = []; // 10 candidates
        this.CHARM_GRID_SIZE = 9;
    }

    init(allCharacters) {
        console.log('[PartyManager] Initialized');
        // Roster starts with the 10 available characters
        this.roster = allCharacters || [];
    }

    setPartySlot(index, characterId) {
        if (index >= 0 && index < 5) {
            this.activeParty[index] = characterId;
        }
    }

    getActiveParty() {
        return this.activeParty;
    }

    getRoster() {
        return this.roster;
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
            charms: state.charms || this.mercenaryStates[id]?.charms || Array(this.CHARM_GRID_SIZE).fill(null),
            lastUpdate: Date.now()
        };
    }

    /**
     * Retrieves the state for a mercenary by ID.
     * @param {string} id 
     * @returns {Object|null}
     */
    getState(id) {
        const state = this.mercenaryStates[id];
        if (state && !state.charms) {
            state.charms = Array(this.CHARM_GRID_SIZE).fill(null);
        }
        return state || null;
    }

    /**
     * Returns the entire roster state.
     */
    getAllStates() {
        return this.mercenaryStates;
    }

    /**
     * Calculates the average level of all known mercenaries in the party.
     * @returns {number}
     */
    getAveragePartyLevel() {
        const states = Object.values(this.mercenaryStates);
        if (states.length === 0) return 1;

        const totalLevels = states.reduce((sum, state) => sum + (state.level || 1), 0);
        return Math.floor(totalLevels / states.length);
    }

    /**
     * Heals all mercenaries in the state map to their maximum HP.
     */
    healAll() {
        console.log('[PartyManager] Healing all units...');
        Object.keys(this.mercenaryStates).forEach(id => {
            const state = this.mercenaryStates[id];
            if (state.maxHp) {
                state.hp = state.maxHp;
            }
        });
    }
}

const partyManager = new PartyManager();
export default partyManager;
