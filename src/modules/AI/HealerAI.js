import { Action, Sequence, Selector, Condition } from './BehaviorTreeManager.js';
import BehaviorTreeManager from './BehaviorTreeManager.js';
import Phaser from 'phaser';

/**
 * HealerAI.js
 * Universal Support logic: Kites enemies and heals wounded allies.
 * @param {Entity} unit - The unit using this AI
 * @param {Function} getAllyGroup - Function that returns Phaser Group or Array of allies
 * @param {Function} getEnemyGroup - Function that returns Phaser Group or Array of enemies
 */
export default function applyHealerAI(unit, getAllyGroup, getEnemyGroup) {
    // 1. Conditions

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
            if (!enemy.active || enemy.hp <= 0) continue;
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
        const rangeMin = unit.config.rangeMin || 180;
        return dist < rangeMin;
    }, "Enemy Too Close?");

    const isAtIdealAttackRange = new Condition(() => {
        const targetObj = unit.blackboard.get('target');
        if (!targetObj || !targetObj.active) return false;
        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, targetObj.x, targetObj.y);
        return dist <= (unit.config.atkRange || 200);
    }, "In Attack Range?");

    // 2. Actions

    const healAction = new Action(() => {
        const target = unit.blackboard.get('heal_target');
        if (!target || !target.active || target.hp <= 0) return 2; // FAILED

        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, target.x, target.y);

        // Move to heal range if too far
        if (dist > (unit.config.atkRange || 200)) {
            unit.scene.physics.moveToObject(unit, target, unit.speed);
            return 1; // RUNNING
        } else {
            if (unit.body) unit.body.setVelocity(0, 0);

            if (unit.isShocked) return 1; // Wait out shock before casting

            const success = unit.castHeal(target);
            return success ? 0 : 2; // SUCCESS or FAILED
        }
    }, "Healing Ally");

    const fleeFromTarget = new Action(() => {
        const targetObj = unit.blackboard.get('target');
        if (!targetObj || !targetObj.active) return 2; // FAILED

        const angle = Phaser.Math.Angle.Between(targetObj.x, targetObj.y, unit.x, unit.y);
        unit.body.setVelocity(
            Math.cos(angle) * unit.speed,
            Math.sin(angle) * unit.speed
        );
        return 1; // RUNNING
    }, "Kiting (Flee)");

    const moveToAttackRange = new Action(() => {
        const targetObj = unit.blackboard.get('target');
        if (!targetObj || !targetObj.active) return 2; // FAILED

        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, targetObj.x, targetObj.y);
        const atkRange = unit.config.atkRange || 200;
        if (dist > atkRange) {
            unit.scene.physics.moveToObject(unit, targetObj, unit.speed);
            return 1; // RUNNING
        }
        return 0; // SUCCESS
    }, "Moving to Enemy");

    const attackAction = new Action(() => {
        const stance = unit.blackboard.get('ai_state');
        if (stance === 'IDLE' || stance === 'MANUAL') return 2; // FAILED

        const target = unit.blackboard.get('target');
        if (!target || !target.active) return 2;

        if (unit.body) unit.body.setVelocity(0, 0);

        if (unit.isShocked) return 1; // Wait out shock

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

    const root = new Selector([
        fleeSequence, // Survival first
        healSequence,
        attackSequence,
        approachSequence,
        stopAction
    ], "Healer Root");

    unit.btManager = new BehaviorTreeManager(unit, unit.blackboard, root);
}
