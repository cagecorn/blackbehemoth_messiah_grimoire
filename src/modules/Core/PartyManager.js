/**
 * PartyManager.js
 * Centralized state management for all mercenaries.
 * Tracks level, exp, hp, and equipment across scenes.
 */
import DBManager from '../Database/DBManager.js';
import { PetStats } from './EntityStats.js';
import EventBus from '../Events/EventBus.js';

class PartyManager {
    constructor() {
        this.mercenaryStates = {}; // Map of characterId -> state object (runtime stats)
        this.activeParty = [null, null, null, null, null, null]; // 6 slots for mercenary IDs
        this.roster = []; // 10 candidates
        this.activePet = 'dog_pet'; // Default pet
        this.petStates = {}; // Map of petId -> state object
        this.playerPetRoster = {}; // Map of petId -> { star: count } similar to mercenaries
        this.CHARM_GRID_SIZE = 9;
    }

    async init(allCharacters) {
        console.log('[PartyManager] Initialized');
        // Roster starts with the 10 available characters
        this.roster = allCharacters || [];
        this.playerRoster = await DBManager.getMercenaryRoster();
        this.playerPetRoster = await DBManager.get('settings', 'petRoster') || {};

        // Ensure Dog Pet is in roster if empty or missing
        if (Object.keys(this.playerPetRoster).length === 0 || !this.playerPetRoster['dog_pet']) {
            this.playerPetRoster['dog_pet'] = { '1': 1 };
            await DBManager.set('settings', 'petRoster', this.playerPetRoster);
        }

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

        const savedPetStates = await DBManager.get('settings', 'petStates');
        if (savedPetStates) {
            this.petStates = savedPetStates;
            console.log('[PartyManager] Loaded saved pet states');
        }

        // Load Pet State
        const petData = await DBManager.get('settings', 'playerPets');
        if (petData && petData.activePet) {
            this.activePet = petData.activePet;
            console.log('[PartyManager] Loaded active pet:', this.activePet);
        }
    }

    async reloadRoster() {
        this.playerRoster = await DBManager.getMercenaryRoster();
        EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);
    }

    async reloadPetRoster() {
        this.playerPetRoster = await DBManager.get('settings', 'petRoster') || {};
        EventBus.emit('PET_ROSTER_UPDATED');
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

    getHighestPetStar(petId) {
        const rosterData = this.playerPetRoster[petId];
        if (!rosterData) return 0; // Return 0 if not owned
        const stars = Object.keys(rosterData).map(Number);
        return stars.length > 0 ? Math.max(...stars) : 0;
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

    getActivePet() {
        return this.activePet;
    }

    async setActivePet(petId) {
        this.activePet = petId;
        // Persist pet change
        const petData = (await DBManager.get('settings', 'playerPets')) || { activePet: 'dog_pet' };
        petData.activePet = petId;
        await DBManager.set('settings', 'playerPets', petData);
        console.log('[PartyManager] Active pet updated and saved:', petId);

        // Re-sync UI or notify scene to update stats
        EventBus.emit('PET_CHANGED', petId);
    }

    /**
     * Summons a random pet.
     * Cost is 1000 diamonds (checked in UI usually, but we handle logic here)
     */
    async summonPet() {
        const petIds = ['dog_pet', 'wolf_pet', 'owl_pet'];
        const randomId = petIds[Math.floor(Math.random() * petIds.length)];

        await this.addPetToRoster(randomId, 1);
        return randomId;
    }

    async addPetToRoster(petId, starCount = 1) {
        if (!this.playerPetRoster[petId]) {
            this.playerPetRoster[petId] = {};
        }

        this.playerPetRoster[petId][starCount] = (this.playerPetRoster[petId][starCount] || 0) + 1;

        // Handle Star Up: 3 same star = 1 higher star
        let currentStar = starCount;
        while (this.playerPetRoster[petId][currentStar] >= 3) {
            this.playerPetRoster[petId][currentStar] -= 3;
            if (this.playerPetRoster[petId][currentStar] === 0) {
                delete this.playerPetRoster[petId][currentStar];
            }

            currentStar++;
            this.playerPetRoster[petId][currentStar] = (this.playerPetRoster[petId][currentStar] || 0) + 1;
            console.log(`[PartyManager] Pet ${petId} Upgraded to ${currentStar} Star!`);
        }

        await DBManager.set('settings', 'petRoster', this.playerPetRoster);
        EventBus.emit('PET_ROSTER_UPDATED');
        return currentStar;
    }

    /**
     * Feeds the pet monster meat to level it up.
     */
    async feedPet(petId, amount = 1) {
        const state = this.getPetState(petId);
        const cost = this.getPetLevelUpCost(petId, state.level);

        // We assume inventory check is done in UI, but here we just update state
        state.level += 1;
        // Add some small stat bonus or just level up
        await this.savePetState(petId, state);
        return state;
    }

    getPetLevelUpCost(petId, level) {
        // Base(20) * (1.5 ^ (level - 1))
        return Math.floor(20 * Math.pow(1.5, level - 1));
    }

    /**
     * Returns global bonuses from the active pet.
     */
    getGlobalPetBonus(statName) {
        if (!this.activePet) return 0;

        // Dynamically get the passive from PetStats
        const petKey = this.activePet.toUpperCase();
        const petConfig = PetStats[petKey]; // PetStats is already imported

        if (!petConfig || !petConfig.passive || !petConfig.passive.effect) return 0;

        const effect = petConfig.passive.effect;
        if (statName === 'atkMult' && effect.atkMult) return effect.atkMult;
        if (statName === 'mAtkMult' && effect.mAtkMult) return effect.mAtkMult;
        if (statName === 'dropRateMod' && effect.dropRateMod) return effect.dropRateMod;

        return 0;
    }

    async savePetState(id, state) {
        this.petStates[id] = {
            ...this.petStates[id],
            ...state,
            lastUpdate: Date.now()
        };
        await DBManager.set('settings', 'petStates', this.petStates);
    }

    getPetState(id) {
        return this.petStates[id] || { level: 1, exp: 0 };
    }

    isPartyFull() {
        return this.activeParty.filter(p => p !== null).length === 6;
    }

    getRoster() {
        return this.roster;
    }

    /**
     * Updates or creates the state for a mercenary.
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
