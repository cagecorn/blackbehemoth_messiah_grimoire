import { Action, Sequence, Selector, Condition } from './BehaviorTreeManager.js';
import BehaviorTreeManager from './BehaviorTreeManager.js';
import Phaser from 'phaser';

/**
 * BardAI.js
 * Hybrid Support logic: Buffs allies first. If all allies are buffed, attacks enemies.
 */
export default function applyBardAI(unit, getAllyGroup, getEnemyGroup) {
    // 1. Conditions

    // Target Priority: Buffing Allies
    const needsBuff = new Condition(() => {
        const allies = typeof getAllyGroup === 'function' ? getAllyGroup(unit) : getAllyGroup;
        const children = allies.getChildren ? allies.getChildren() : allies;

        // Find the first ally who is alive, active, and does not have the 'Motivation' buff
        let unbuffedAlly = null;

        for (const ally of children) {
            if (!ally || !ally.active || ally.hp <= 0) continue;

            if (!unit.scene.buffManager || !unit.scene.buffManager.hasBuff(ally, 'Motivation')) {
                unbuffedAlly = ally;
                break;
            }
        }

        if (unbuffedAlly) {
            unit.blackboard.set('buff_target', unbuffedAlly);
            return true;
        }

        // Everyone has a buff, fallback to attack modes
        unit.blackboard.set('buff_target', null);
        return false;
    }, "Needs Buff?");

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

    const isAtIdealRange = new Condition(() => {
        // Can be either an ally for buff or an enemy for attack
        const buffTarget = unit.blackboard.get('buff_target');
        if (buffTarget) {
            const dist = Phaser.Math.Distance.Between(unit.x, unit.y, buffTarget.x, buffTarget.y);
            return dist <= (unit.config.atkRange || 200);
        }

        const enemyTarget = unit.blackboard.get('target');
        if (enemyTarget) {
            const dist = Phaser.Math.Distance.Between(unit.x, unit.y, enemyTarget.x, enemyTarget.y);
            return dist <= (unit.config.atkRange || 200);
        }

        return false;
    }, "In Range?");

    const isEnemyTooClose = new Condition(() => {
        const targetObj = unit.blackboard.get('target');
        if (!targetObj || !targetObj.active) return false;
        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, targetObj.x, targetObj.y);
        const rangeMin = unit.config.rangeMin || 150;
        return dist < rangeMin;
    }, "Enemy Too Close?");

    // 2. Actions

    const buffAction = new Action(() => {
        const target = unit.blackboard.get('buff_target');
        if (!target || !target.active || target.hp <= 0) return 2; // FAILED

        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, target.x, target.y);

        if (dist > (unit.config.atkRange || 200)) {
            unit.scene.physics.moveToObject(unit, target, unit.speed);
            return 1; // RUNNING
        } else {
            if (unit.body) unit.body.setVelocity(0, 0);
            const success = unit.castBuff(target);
            return success ? 0 : 2; // SUCCESS or FAILED
        }
    }, "Buffing Ally");

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

    const moveToRange = new Action(() => {
        let targetObj = unit.blackboard.get('buff_target');
        if (!targetObj) targetObj = unit.blackboard.get('target');
        if (!targetObj || !targetObj.active) return 2; // FAILED

        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, targetObj.x, targetObj.y);
        const atkRange = unit.config.atkRange || 200;
        if (dist > atkRange) {
            unit.scene.physics.moveToObject(unit, targetObj, unit.speed);
            return 1; // RUNNING
        }
        return 0; // SUCCESS
    }, "Moving to Target");

    const attackAction = new Action(() => {
        const stance = unit.blackboard.get('ai_state');
        if (stance === 'IDLE' || stance === 'MANUAL') return 2; // FAILED

        const target = unit.blackboard.get('target');
        if (!target || !target.active) return 2;

        if (unit.body) unit.body.setVelocity(0, 0);
        const success = unit.fireProjectile(target);
        return success ? 0 : 2; // SUCCESS or FAILED
    }, "Casting Note");

    const stopAction = new Action(() => {
        if (unit.body) unit.body.setVelocity(0, 0);
        return 0; // SUCCESS
    }, "Idle");

    // 3. Tree Construction
    const fleeSequence = new Sequence([isEnemyTooClose, fleeFromTarget], "Kite Logic");
    const buffSequence = new Sequence([needsBuff, buffAction], "Buff Logic");
    const attackSequence = new Sequence([hasEnemyTarget, isAtIdealRange, attackAction], "Attack Logic");
    const approachSequence = new Sequence([moveToRange], "Move Logic"); // Relies on buff/enemy targets being set

    const root = new Selector([
        fleeSequence,     // Always prioritize self-preservation
        buffSequence,     // Then prioritize buffing unbuffed allies
        attackSequence,   // Then attack if everyone is buffed
        approachSequence, // Move if not in range for either
        stopAction        // Default idle
    ], "Bard Root");

    unit.btManager = new BehaviorTreeManager(unit, unit.blackboard, root);
}
