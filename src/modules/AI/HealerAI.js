import Blackboard from './Blackboard.js';
import { Action, Sequence, Selector, Condition } from './BehaviorTreeManager.js';
import BehaviorTreeManager from './BehaviorTreeManager.js';
import NodeCharmManager from './NodeCharmManager.js';
import Phaser from 'phaser';

/**
 * HealerAI.js
 * Universal Support logic: Kites enemies and heals wounded allies.
 * @param {Entity} unit - The unit using this AI
 * @param {Function} getAllyGroup - Function that returns Phaser Group or Array of allies
 * @param {Function} getEnemyGroup - Function that returns Phaser Group or Array of enemies
 */
export default function applyHealerAI(unit, getAllyGroup, getEnemyGroup) {
    if (!unit.blackboard) {
        unit.blackboard = new Blackboard();
        unit.blackboard.set('self', unit);
        unit.blackboard.set('ai_state', 'AGGRESSIVE');
        unit.blackboard.set('target', null);
    }

    // 1. Conditions

    const checkLeash = new Condition(() => {
        if (unit.team !== 'player' || !unit.warrior || unit === unit.warrior) return false;
        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, unit.warrior.x, unit.warrior.y);
        return dist > 700; // Leash distance for healer
    }, "Too far from leader?");

    // Check if any ally needs healing
    const needsHeal = new Condition(() => {
        const allies = typeof getAllyGroup === 'function' ? getAllyGroup(unit) : getAllyGroup;
        const children = allies.getChildren ? allies.getChildren() : allies;

        // Find most wounded ally
        let wounded = null;
        let lowestHpRatio = 0.9; // Only heal if below 90%

        for (const ally of children) {
            if (!ally.active || ally.hp <= 0) continue;
            const ratio = ally.hp / ally.maxHp;
            if (ratio < lowestHpRatio) {
                lowestHpRatio = ratio;
                wounded = ally;
            }
        }

        if (wounded) {
            unit.blackboard.set('heal_target', wounded);
            return true;
        }
        return false;
    }, "Needs Heal?");

    const hasEnemyTarget = new Condition(() => {
        const enemies = typeof getEnemyGroup === 'function' ? getEnemyGroup(unit) : getEnemyGroup;
        const children = enemies.getChildren ? enemies.getChildren() : enemies;

        let nearest = null;
        let minDist = Infinity;
        for (const enemy of children) {
            if (!enemy.active || enemy.hp <= 0 || enemy.className === 'pet') continue;
            const dist = Phaser.Math.Distance.Between(unit.x, unit.y, enemy.x, enemy.y);

            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        }

        if (nearest) {
            unit.blackboard.set('target', nearest);
            return true;
        }
        return false;
    }, "Has Enemy?");

    const isEnemyTooClose = new Condition(() => {
        const targetObj = unit.blackboard.get('target');
        if (!targetObj || !targetObj.active) return false;
        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, targetObj.x, targetObj.y);

        // [Standardization Fix] Use center-to-center distance to match perk triggers
        const rangeMin = unit.getTotalRangeMin ? unit.getTotalRangeMin() : (unit.config.rangeMin || 180);
        return dist < rangeMin;
    }, "Enemy Too Close?");

    const isAtIdealAttackRange = new Condition(() => {
        const targetObj = unit.blackboard.get('target');
        if (!targetObj || !targetObj.active) return false;
        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, targetObj.x, targetObj.y);

        const atkRange = unit.getTotalAtkRange ? unit.getTotalAtkRange() : (unit.config.atkRange || 200);
        return dist <= atkRange;
    }, "In Attack Range?");

    // 2. Actions

    const healAction = new Action(() => {
        const target = unit.blackboard.get('heal_target');
        if (!target || !target.active || target.hp <= 0) return 2; // FAILED

        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, target.x, target.y);
        // Move to heal range if too far
        const atkRange = unit.getTotalAtkRange ? unit.getTotalAtkRange() : (unit.config.atkRange || 200);
        if (dist > atkRange) {
            const currentSpeed = unit.getTotalSpeed ? unit.getTotalSpeed() : unit.speed;
            unit.scene.physics.moveToObject(unit, target, currentSpeed);
            return 1; // RUNNING
        } else {
            if (unit.body) unit.body.setVelocity(0, 0);

            if (unit.isShocked) return 1; // Wait out shock before casting

            const success = unit.castHeal(target);
            return success ? 0 : 2; // SUCCESS or FAILED
        }
    }, "Healing Ally");

    const returnToLeader = new Action(() => {
        if (!unit.warrior || !unit.warrior.active) return 2;
        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, unit.warrior.x, unit.warrior.y);
        if (dist > 300) {
            unit.scene.physics.moveToObject(unit, unit.warrior, unit.getTotalSpeed ? unit.getTotalSpeed() : unit.speed);
            return 1; // RUNNING
        } else {
            if (unit.body) unit.body.setVelocity(0, 0);
            return 0; // SUCCESS
        }
    }, "Returning to Leader");

    const leashSequence = new Sequence([checkLeash, returnToLeader], "Leash Logic");

    const fleeFromTarget = new Action(() => {
        const targetObj = unit.blackboard.get('target');
        if (!targetObj || !targetObj.active) return 2; // FAILED

        const angle = Phaser.Math.Angle.Between(targetObj.x, targetObj.y, unit.x, unit.y);
        const currentSpeed = unit.getTotalSpeed ? unit.getTotalSpeed() : unit.speed;
        const vx = Math.cos(angle) * currentSpeed;
        const vy = Math.sin(angle) * currentSpeed;

        if (Math.abs(vx) > 500 || Math.abs(vy) > 500) {
            console.error(`[HealerAI] Warning: Flee speed glitch detected! currentSpeed: ${currentSpeed}, vx: ${vx}, vy: ${vy}`);
        }

        unit.body.setVelocity(vx, vy);
        return 1; // RUNNING
    }, "Kiting (Flee)");

    const moveToAttackRange = new Action(() => {
        const targetObj = unit.blackboard.get('target');
        if (!targetObj || !targetObj.active) return 2; // FAILED

        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, targetObj.x, targetObj.y);
        const atkRange = unit.getTotalAtkRange ? unit.getTotalAtkRange() : (unit.config.atkRange || 200);

        if (dist > atkRange) {
            const currentSpeed = unit.getTotalSpeed ? unit.getTotalSpeed() : unit.speed;
            unit.scene.physics.moveToObject(unit, targetObj, currentSpeed);
            return 1; // RUNNING
        } else {
            // [Momentum Fix] Stop moving once in range
            if (unit.body) unit.body.setVelocity(0, 0);
            return 0; // SUCCESS
        }
    }, "Moving to Enemy");

    const attackAction = new Action(() => {
        const stance = unit.blackboard.get('ai_state');
        if (stance === 'IDLE' || stance === 'MANUAL') return 2; // FAILED

        const target = unit.blackboard.get('target');
        if (!target || !target.active) return 2;

        if (unit.body) unit.body.setVelocity(0, 0);

        if (unit.isShocked) return 1; // Wait out shock

        // [NodeCharm] Hater Node (😠) damage bonus
        unit._haterDamageMult = unit.blackboard.get('hater_active') ? 1.1 : 1.0;

        const success = unit.castAttack(target);
        return success ? 0 : 2; // SUCCESS or FAILED
    }, "Casting Sparkle");

    const stopAction = new Action(() => {
        if (unit.body) unit.body.setVelocity(0, 0);
        return 0; // SUCCESS
    }, "Idle");

    // 3. Tree Construction
    const fleeSequence = new Sequence([isEnemyTooClose, fleeFromTarget], "Kite Logic");
    const healSequence = new Sequence([needsHeal, healAction], "Heal Logic");
    const attackSequence = new Sequence([hasEnemyTarget, isAtIdealAttackRange, attackAction], "Attack Logic");
    const approachSequence = new Sequence([hasEnemyTarget, moveToAttackRange], "Move Logic");

    const nodeCharmBehaviors = NodeCharmManager.getBehaviors(unit, moveToAttackRange, attackAction);

    const root = new Selector([
        leashSequence,
        ...nodeCharmBehaviors,
        fleeSequence, // Survival first
        healSequence,
        attackSequence,
        approachSequence,
        stopAction
    ], "Healer Root");

    unit.btManager = new BehaviorTreeManager(unit, unit.blackboard, root);
}
