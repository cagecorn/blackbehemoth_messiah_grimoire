import Pet from './Pet.js';
import { PetStats } from '../Core/EntityStats.js';

/**
 * WolfPet.js
 * High physical attack pet. Increases ally ATK.
 */
export default class WolfPet extends Pet {
    constructor(scene, x, y, stats) {
        const config = PetStats.WOLF_PET;
        super(scene, x, y, config, stats);
        this.className = 'pet';
        this.petId = 'wolf_pet';
    }
}
