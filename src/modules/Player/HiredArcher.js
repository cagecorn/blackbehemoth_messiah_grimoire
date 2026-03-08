import Archer from './Archer.js';
import { MercenaryClasses } from '../Core/EntityStats.js';

/**
 * HiredArcher.js
 * A high-end mercenary version of the Archer.
 * Fixed equipment, no ultimate, and scaled stats.
 */
export default class HiredArcher extends Archer {
    constructor(scene, x, y, warrior, characterConfig = {}) {
        // Use standard Archer base stats
        const config = {
            ...MercenaryClasses.ARCHER,
            ...characterConfig,
            id: 'hired_archer',
            name: '고용 아쳐',
            sprite: 'hired_archer_sprite',
            isSummoned: true,
            hideInUI: true // Hide from main party HUD
        };

        super(scene, x, y, warrior, config);

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

        console.log(`[HiredArcher] Initialized at level ${this.level}`);
    }

    // Override to prevent saving state for hired units
    saveState() {
        // Hired units are temporary and don't save their own state
    }
}
