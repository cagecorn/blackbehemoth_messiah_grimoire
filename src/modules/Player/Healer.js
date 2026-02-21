import Phaser from 'phaser';
import Mercenary from './Mercenary.js';
import applyHealerAI from '../AI/HealerAI.js';
import Blackboard from '../AI/Blackboard.js';
import { MercenaryClasses } from '../Core/EntityStats.js';
import { HealerActions } from '../Combat/HealerActions.js';
import EventBus from '../Events/EventBus.js';
import MassHeal from '../Skills/MassHeal.js';
import PlaceholderSkill from '../Skills/PlaceholderSkill.js';

/**
 * Healer.js
 * Support unit. Heals allies and uses magic attacks.
 */
export default class Healer extends Mercenary {
    constructor(scene, x, y, warrior, characterConfig = {}) {
        const config = { ...MercenaryClasses.HEALER, ...characterConfig };
        super(scene, x, y, config);
        this.warrior = warrior;

        this.mAtk = this.config.mAtk;
        this.atkSpd = this.config.atkSpd || 1200;
        this.castSpd = this.config.castSpd || 1000;
        this.lastActionTime = 0;

        // Instantiate Skill dynamically
        if (config.skillName === 'MassHeal') {
            this.skill = new MassHeal({
                cooldown: 8000,
                healMultiplier: 3.0
            });
        } else if (config.skillName === 'PlaceholderSkill') {
            this.skill = new PlaceholderSkill();
        }

        this.initAI();
    }

    getSkillProgress() {
        if (!this.skill) return 0;
        return this.skill.getCooldownProgress(this.scene.time.now, this.castSpd);
    }

    initAI() {
        this.blackboard = new Blackboard();
        this.blackboard.set('self', this);
        this.blackboard.set('ai_state', 'AGGRESSIVE');
        this.blackboard.set('target', null);
        this.blackboard.set('heal_target', null);

        // Provides ally and enemy groups based on team
        applyHealerAI(
            this,
            (u) => u.allyGroup,
            (u) => u.targetGroup
        );
    }

    update() {
        super.update();

        // Auto-cast Mass Heal when off cooldown
        if (!this.isAirborne && !this.isStunned && !this.isKnockedBack && this.skill) {
            // We just cast it, the skill handles finding all allies and healing them
            // Only try if there are active allies taking damage (optional optimization, but we can just cast on cooldown for now)
            this.skill.execute(this);
        }

        // Always prioritize the nearest enemy to ensure proper kiting
        this.findNearestEnemy();
    }

    findNearestEnemy() {
        // AI now handles initial targeting via conditions, 
        // but we keep this for manual/shared logic if needed
        const targetGroup = this.targetGroup;
        if (!targetGroup) return;
        const enemies = targetGroup.getChildren();
        let nearest = null;
        let minDist = Infinity;
        for (const enemy of enemies) {
            if (!enemy.active || enemy.hp <= 0) continue;
            const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        }
        this.blackboard.set('target', nearest);
    }

    castHeal(target) {
        return HealerActions.castHeal(this, target);
    }

    castAttack(target) {
        return HealerActions.castAttack(this, target);
    }

    showHealFX(target) {
        HealerActions.showHealFX(this.scene, target);
    }
}
