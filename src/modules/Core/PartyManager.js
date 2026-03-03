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

        // Load Persistent State
        const savedParty = await DBManager.getParty();
        if (savedParty) {
            this.activeParty = savedParty;
            console.log('[PartyManager] Loaded saved party:', this.activeParty);
        }

        const savedStates = await DBManager.getAllMercenaryStates();
        if (savedStates) {
            this.mercenaryStates = savedStates;
            console.log('[PartyManager] Loaded saved mercenary states');
        }
    }

    async reloadRoster() {
        this.playerRoster = await DBManager.getMercenaryRoster();
    }

    getHighestStar(charId) {
        const key = charId.toUpperCase();
        if (!this.playerRoster || (!this.playerRoster[key] && !this.playerRoster[charId])) {
            return charId.toLowerCase() === 'aren' ? 1 : 0; // 주인공 Aren은 기본 1성 지급
        }

        // 데이터가 key(대문자)로 들어갔는지 charId(원형)로 들어갔는지 안전하게 체크
        const rosterData = this.playerRoster[key] || this.playerRoster[charId];
        const stars = Object.keys(rosterData).map(Number);
        return stars.length > 0 ? Math.max(...stars) : 1;
    }

    async setPartySlot(index, characterId) {
        if (index >= 0 && index < 6) {
            // Duplicate prevention: if this character is already in another slot, clear it
            if (characterId !== null) {
                const existingIndex = this.activeParty.indexOf(characterId);
                if (existingIndex !== -1 && existingIndex !== index) {
                    this.activeParty[existingIndex] = null;
                }
            }

            this.activeParty[index] = characterId;
            // Persist party change
            await DBManager.saveParty(this.activeParty);
        }
    }

    getActiveParty() {
        return this.activeParty;
    }

    /**
     * Checks if all 6 slots in the active party are filled.
     * @returns {boolean}
     */
    isPartyFull() {
        return this.activeParty.filter(p => p !== null).length === 6;
    }

    getRoster() {
        return this.roster;
    }

    /**
     * Updates or creates the state for a mercenary.
     * @param {string} id 
     * @param {Object} state 
     */
    async saveState(id, state) {
        this.mercenaryStates[id] = {
            ...this.mercenaryStates[id],
            ...state,
            grimoire: state.grimoire || this.mercenaryStates[id]?.grimoire,
            lastUpdate: Date.now()
        };

        // Persist state change
        await DBManager.saveMercenaryState(id, this.mercenaryStates[id]);
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
