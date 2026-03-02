import Phaser from 'phaser';
import Wizard from './Wizard.js';
import Cyclone from '../Skills/Cyclone.js';
import GuardianOfTruth from '../Skills/GuardianOfTruth.js';
import { Characters } from '../Core/EntityStats.js';

/**
 * Veve.js
 * The Nomad Eagle Wizard.
 * Specializes in wind magic and rapid-fire cyclones during ultimate.
 */
export default class Veve extends Wizard {
    constructor(scene, x, y, warrior, characterConfig = {}) {
        // Merge base VEVE stats with any overrides
        const config = { ...Characters.VEVE, ...characterConfig };
        super(scene, x, y, warrior, config);

        // Character unique state
        this.isUltimateActive = false;

        // Reset skills to Veve's specific skills
        this.skill = new Cyclone({
            cooldown: 7000,
            damageMultiplier: 1.8
        });

        this.ultimateSkill = new GuardianOfTruth(this);

        // Re-initialize AI because Wizard.js constructor calls initAI() BEFORE we assign Veve's unique skills
        this.initAI();

        console.log(`[Veve] The wanderer seeking truth has arrived.`);
    }

    /**
     * Override getSkillProgress to reflect the 50% cooldown reduction during ultimate.
     */
    getSkillProgress() {
        if (!this.skill || !this.scene || !this.scene.time) return 0;

        let castSpd = this.castSpd;
        // If ultimate is active, effectively double the cast speed for 50% CD reduction
        if (this.isUltimateActive) {
            castSpd *= 2;
        }

        return this.skill.getCooldownProgress(this.scene.time.now, castSpd);
    }

    /**
     * Override update to ensure AI logic sees the modified cooldown if needed,
     * though Wizard.js/RangedAI usually rely on getSkillProgress or isReady.
     */
    update(time, delta) {
        super.update(time, delta);
        if (!this.active || !this.scene) return;

        // During ultimate, we might want some additional visual flair on the caster itself
        if (this.isUltimateActive) {
            if (time % 500 < 50) {
                // Occasional green flash
                this.sprite.setTint(0x00ff00);
                this.scene.time.delayedCall(100, () => {
                    if (this.active) this.sprite.clearTint();
                });
            }
        }
    }

    /**
     * Custom status for UI
     */
    getCustomStatuses() {
        if (this.isUltimateActive) {
            return [{
                name: '진리의 권능',
                description: '진리에 도달한 상태. 싸이클론을 5발씩 발사하며 재사용 대기시간이 50% 감소합니다.',
                emoji: '👁️',
                category: 'buff'
            }];
        }
        return [];
    }
}
