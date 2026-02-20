import Phaser from 'phaser';
import Mercenary from './Mercenary.js';
import applyRangedAI from '../AI/RangedAI.js';
import Blackboard from '../AI/Blackboard.js';
import { MercenaryClasses } from '../Core/EntityStats.js';

/**
 * Archer.js
 * Specialist in Ranged combat. Follows the Warrior and kites enemies.
 */
export default class Archer extends Mercenary {
    constructor(scene, x, y, warrior) {
        const config = MercenaryClasses.ARCHER;
        super(scene, x, y, config);
        this.warrior = warrior; // Reference to leader

        // Ranged specific stats
        this.atkSpd = config.atkSpd || 1000;
        this.lastFireTime = 0;

        this.initAI();
    }

    initAI() {
        this.blackboard = new Blackboard();
        this.blackboard.set('self', this);
        this.blackboard.set('ai_state', 'AGGRESSIVE');
        this.blackboard.set('target', null);

        applyRangedAI(this);
    }

    update() {
        super.update();

        // Target sharing logic: Target Warrior's target or nearest
        if (this.warrior && this.warrior.blackboard) {
            const warriorTarget = this.warrior.blackboard.get('target');
            if (warriorTarget && warriorTarget.active && warriorTarget.hp > 0) {
                this.blackboard.set('target', warriorTarget);
            } else {
                this.findNearestEnemy();
            }
        }
    }

    findNearestEnemy() {
        if (!this.scene.enemies) return;

        const enemies = this.scene.enemies.getChildren();
        if (enemies.length === 0) {
            this.blackboard.set('target', null);
            return;
        }

        let nearest = null;
        let minDist = Infinity;

        for (const enemy of enemies) {
            if (enemy.hp <= 0) continue;
            const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        }
        this.blackboard.set('target', nearest);
    }

    fireProjectile() {
        const now = this.scene.time.now;
        if (now - this.lastFireTime < this.atkSpd) return false;

        const target = this.blackboard.get('target');
        if (!target) return false;

        this.lastFireTime = now;
        this.scene.projectileManager.fire(this.x, this.y, target.x, target.y, this.atk, 'archer', false, null, this.className);
        return true;
    }
}
