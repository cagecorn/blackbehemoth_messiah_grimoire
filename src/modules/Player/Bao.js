import Phaser from 'phaser';
import Wizard from './Wizard.js';
import Babao from './Babao.js';
import SkillStoneBlast from '../Skills/SkillStoneBlast.js';
import SkillGoBabao from '../Skills/SkillGoBabao.js';
import { Characters } from '../Core/EntityStats.js';
import EventBus from '../Events/EventBus.js';

/**
 * Bao.js
 * Specialist bear wizard. Auto-summons his brother Babao and manages his respawn.
 */
export default class Bao extends Wizard {
    constructor(scene, x, y, warrior, characterConfig = {}) {
        // Use Bao's specific character config
        const config = { ...Characters.BAO, ...characterConfig };
        super(scene, x, y, warrior, config);

        this.babao = null;
        this.babaoRespawnTimer = null;
        this.isBabaoRespawning = false;

        // Skill initialization (Override Wizard defaults)
        this.skill = new SkillStoneBlast();
        this.ultimateSkill = new SkillGoBabao();

        this.shadowOffset = 32;

        // Re-initialize AI with the new skill
        this.initAI();

        // Initial summon
        this.summonBabao();
    }

    summonBabao() {
        if (!this.active) return;

        console.log(`[Bao] Summoning my dear brother Babao!`);

        // Spawn near Bao
        const spawnX = this.x - 40;
        const spawnY = this.y;

        const babao = this.spawnSummon(Babao, spawnX, spawnY);
        this.babao = babao;
        this.isBabaoRespawning = false;

        EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `${this.unitName}: 가라, 바바오! 형이 뒤에서 지켜줄게! 🐻`);
    }

    onBabaoDied() {
        if (this.isBabaoRespawning) return;

        this.babao = null;
        this.isBabaoRespawning = true;

        console.log(`[Bao] BABAO! NOOOO! I will bring you back... (30s Cooldown)`);

        // Long respawn (30 seconds)
        this.babaoRespawnTimer = this.scene.time.delayedCall(30000, () => {
            if (this.active) {
                this.summonBabao();
            }
        });
    }

    /**
     * If ultimate is used while Babao is dead, respawn him immediately first?
     * The requirement says: "If ultimate is used while Babao is dead, respawn him immediately".
     */
    executeUltimate() {
        if (!this.babao || !this.babao.active) {
            console.log(`[Bao] Emergency respawning Babao for ultimate!`);
            if (this.babaoRespawnTimer) this.babaoRespawnTimer.remove();
            this.summonBabao();
        }

        if (this.ultimateSkill) {
            this.ultimateSkill.execute(this.scene, this, this.babao);
        }
    }

    destroy(fromScene) {
        if (this.babaoRespawnTimer) this.babaoRespawnTimer.remove();
        if (this.babao && this.babao.active) {
            this.babao.destroy();
        }
        super.destroy(fromScene);
    }
}
