import Pet from './Pet.js';
import { PetStats } from '../Core/EntityStats.js';

/**
 * OwlPet.js
 * High magic attack pet. Fires lasers. Increases ally mATK.
 */
export default class OwlPet extends Pet {
    constructor(scene, x, y, stats) {
        const config = PetStats.OWL_PET;
        super(scene, x, y, config, stats);
        this.className = 'pet';
        this.petId = 'owl_pet';
    }
}
