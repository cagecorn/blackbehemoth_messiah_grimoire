import Pet from './Pet.js';
import { PetStats } from '../Core/EntityStats.js';

/**
 * DogPet.js
 * Implementation of the "Dog Pet" unit.
 */
export default class DogPet extends Pet {
    constructor(scene, x, y) {
        const config = PetStats.DOG_PET;
        super(scene, x, y, config);

        console.log(`[DogPet] Created at (${x}, ${y})`);
    }

    // You can override specific behaviors here if needed
}
