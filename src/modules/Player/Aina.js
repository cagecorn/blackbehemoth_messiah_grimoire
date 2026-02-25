import Phaser from 'phaser';
import Wizard from './Wizard.js';
import { MercenaryClasses } from '../Core/EntityStats.js';
import SkillIceBall from '../Skills/SkillIceBall.js';
import SkillIceStorm from '../Skills/SkillIceStorm.js';

/**
 * Aina.js
 * The Ice Queen Wizard.
 */
export default class Aina extends Wizard {
    constructor(scene, x, y, warrior, characterConfig = {}) {
        // Use Aina specific stats or fallback to Wizard
        const config = { ...MercenaryClasses.WIZARD, ...characterConfig };
        super(scene, x, y, warrior, config);

        // Override Skill
        this.skill = new SkillIceBall();

        // Override Ultimate
        this.ultimateSkill = new SkillIceStorm();

        // Re-initialize AI with new skill node
        this.initAI();
    }

    // Aina might have special logic if needed, but for now Wizard base is fine
}
