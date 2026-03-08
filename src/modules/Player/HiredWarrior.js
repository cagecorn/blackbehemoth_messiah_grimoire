import Warrior from './Warrior.js';
import { MercenaryClasses } from '../Core/EntityStats.js';

/**
 * HiredWarrior.js
 * A high-end mercenary version of the Warrior.
 * Fixed equipment, no ultimate, and scaled stats.
 */
export default class HiredWarrior extends Warrior {
    constructor(scene, x, y, characterConfig = {}) {
        // Use standard Warrior base stats
        const config = {
            ...MercenaryClasses.WARRIOR,
            ...characterConfig,
            id: 'hired_warrior',
            name: '고용 전사',
            sprite: 'hired_warrior_sprite',
            isSummoned: true, // Treated as a summoned/special unit
            hideInUI: true   // Hide from main party HUD
        };

        super(scene, x, y, config);

        // Hired units do not have player-changeable equipment
        this.equipment = {
            weapon: null,
            armor: null,
            necklace: null,
            ring: null
        };

        // Hired units cannot use Ultimates
        this.ultimateSkill = null;
        this.maxUltGauge = 0;
        this.ultGauge = 0;

        console.log(`[HiredWarrior] Initialized at level ${this.level}`);
    }

    // Override to prevent saving state for hired units
    saveState() {
        // Hired units are temporary and don't save their own state
    }
}
