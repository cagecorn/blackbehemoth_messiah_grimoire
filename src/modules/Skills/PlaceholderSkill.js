import Phaser from 'phaser';

/**
 * PlaceholderSkill.js
 * A temporary passive/blank skill used by some characters like Silvi.
 */
export default class PlaceholderSkill {
    constructor() {
        this.lastCastTime = 0;
        this.cooldown = 1000;
        this.type = 'PHYSICAL'; // Ensure no undefined errors
    }

    getCooldownProgress(currentTime, castSpd = 1000) {
        return 1; // Always "ready" or just full bar
    }

    execute(caster, target) {
        // Does nothing right now
        return false;
    }
}
