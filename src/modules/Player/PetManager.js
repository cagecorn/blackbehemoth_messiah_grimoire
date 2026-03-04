import DogPet from './DogPet.js';

/**
 * PetManager.js
 * Manages active pets in the dungeon scene.
 */
export default class PetManager {
    constructor(scene) {
        this.scene = scene;
        this.pets = this.scene.physics.add.group();
        this.activePet = null;
    }

    /**
     * Spawns a pet for the player.
     * @param {string} petId - ID from PetStats
     * @param {number} x - Spawn X
     * @param {number} y - Spawn Y
     */
    spawnPet(petId, x, y) {
        if (this.activePet) {
            this.activePet.destroy();
        }

        console.log(`[PetManager] Spawning pet: ${petId}`);

        const partyManager = this.scene.game?.partyManager;
        const state = partyManager ? partyManager.getPetState(petId) : null;
        const stars = partyManager ? partyManager.getHighestPetStar(petId) : 1;
        const level = state ? (state.level || 1) : 1;

        if (petId === 'dog_pet') {
            this.activePet = new DogPet(this.scene, x, y, { level, stars });
            this.pets.add(this.activePet);
        } else {
            console.warn(`[PetManager] Unknown pet ID: ${petId}`);
        }

        return this.activePet;
    }

    update() {
        // Active pet handles its own inner update via scene events
    }

    destroy() {
        if (this.activePet) {
            this.activePet.destroy();
            this.activePet = null;
        }
    }
}
