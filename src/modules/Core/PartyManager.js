/**
 * PartyManager.js
 * Centralized state management for all mercenaries.
 * Tracks level, exp, hp, and equipment across scenes.
 */
import DBManager from '../Database/DBManager.js';

class PartyManager {
    constructor() {
        this.mercenaryStates = {}; // Map of characterId -> state object (runtime stats)
        this.activeParty = [null, null, null, null, null, null]; // 6 slots for mercenary IDs
        this.roster = []; // 10 candidates
        this.CHARM_GRID_SIZE = 9;
    }

    async init(allCharacters) {
        console.log('[PartyManager] Initialized');
        // Roster starts with the 10 available characters
        this.roster = allCharacters || [];
        this.playerRoster = await DBManager.getMercenaryRoster();
    }

    async reloadRoster() {
        this.playerRoster = await DBManager.getMercenaryRoster();
    }

    getHighestStar(charId) {
        if (!this.playerRoster || !this.playerRoster[charId]) {
            return charId.toLowerCase() === 'aren' ? 1 : 0; // 주인공 Aren은 기본 1성 지급
        }
        const stars = Object.keys(this.playerRoster[charId]).map(Number);
        return stars.length > 0 ? Math.max(...stars) : 1;
    }

    setPartySlot(index, characterId) {
        if (index >= 0 && index < 6) {
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
