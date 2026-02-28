import Blackboard from './Blackboard.js';
import { Action, Sequence, Selector, Condition } from './BehaviorTreeManager.js';
import BehaviorTreeManager from './BehaviorTreeManager.js';
import NodeCharmManager from './NodeCharmManager.js';
import Phaser from 'phaser';

/**
 * BardAI.js
 * Hybrid Support logic: Buffs allies first. If all allies are buffed, attacks enemies.
 */
export default function applyBardAI(unit, getAllyGroup, getEnemyGroup) {
    if (!unit.blackboard) {
        unit.blackboard = new Blackboard();
        unit.blackboard.set('self', unit);
        unit.blackboard.set('ai_state', 'AGGRESSIVE');
        unit.blackboard.set('target', null);
    }

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
            const r1 = unit.body ? unit.body.radius : 0;
            const r2 = enemy.body ? enemy.body.radius : 0;
            const reachDist = dist - r1 - r2;

            if (reachDist < minDist) {
                minDist = reachDist;
                nearest = enemy;
            }
        }

        if (nearest) {
            unit.blackboard.set('target', nearest);
            return true;
        }
        return false;
    }, "Has Enemy?");

    const isAtIdealBuffRange = new Condition(() => {
        const buffTarget = unit.blackboard.get('buff_target');
        if (!buffTarget) return false;

        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, buffTarget.x, buffTarget.y);
        const r1 = unit.body ? unit.body.radius : 0;
        const r2 = buffTarget.body ? buffTarget.body.radius : 0;
        const reachDist = dist - r1 - r2;

        return reachDist <= (unit.config.atkRange || 200);
    }, "In Buff Range?");

    const isAtIdealAttackRange = new Condition(() => {
        const enemyTarget = unit.blackboard.get('target');
        if (!enemyTarget) return false;

        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, enemyTarget.x, enemyTarget.y);
        const r1 = unit.body ? unit.body.radius : 0;
        const r2 = enemyTarget.body ? enemyTarget.body.radius : 0;
        const reachDist = dist - r1 - r2;
        const atkRange = unit.config.atkRange || 200;

        return reachDist <= atkRange;
    }, "In Attack Range?");

    const isEnemyTooClose = new Condition(() => {
        const targetObj = unit.blackboard.get('target');
        if (!targetObj || !targetObj.active) return false;
        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, targetObj.x, targetObj.y);
        const r1 = unit.body ? unit.body.radius : 0;
        const r2 = targetObj.body ? targetObj.body.radius : 0;
        const reachDist = dist - r1 - r2;

        const rangeMin = unit.config.rangeMin || 150;
        return reachDist < rangeMin;
    }, "Enemy Too Close?");

    // 2. Actions

    const buffAction = new Action(() => {
        const target = unit.blackboard.get('buff_target');
        if (!target || !target.active || target.hp <= 0) return 2; // FAILED

        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, target.x, target.y);
        const r1 = unit.body ? unit.body.radius : 0;
        const r2 = target.body ? target.body.radius : 0;
        const reachDist = dist - r1 - r2;

        if (reachDist > (unit.config.atkRange || 200)) {
            const currentSpeed = unit.getTotalSpeed ? unit.getTotalSpeed() : unit.speed;
            unit.scene.physics.moveToObject(unit, target, currentSpeed);
            return 1; // RUNNING
        } else {
            if (unit.body) unit.body.setVelocity(0, 0);

            if (unit.isShocked) return 1; // Wait out shock

            const success = unit.castBuff(target);
            return success ? 0 : 2; // SUCCESS or FAILED
        }
    }, "Buffing Ally");

    const fleeFromTarget = new Action(() => {
        const targetObj = unit.blackboard.get('target');
        if (!targetObj || !targetObj.active) return 2; // FAILED

        const angle = Phaser.Math.Angle.Between(targetObj.x, targetObj.y, unit.x, unit.y);
        const currentSpeed = unit.getTotalSpeed ? unit.getTotalSpeed() : unit.speed;
        unit.body.setVelocity(
            Math.cos(angle) * currentSpeed,
            Math.sin(angle) * currentSpeed
        );
        return 1; // RUNNING
    }, "Kiting (Flee)");

    const moveToRange = new Action(() => {
        let targetObj = unit.blackboard.get('buff_target');
        if (!targetObj) targetObj = unit.blackboard.get('target');
        if (!targetObj || !targetObj.active) return 2; // FAILED

        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, targetObj.x, targetObj.y);
        const r1 = unit.body ? unit.body.radius : 0;
        const r2 = targetObj.body ? targetObj.body.radius : 0;
        const reachDist = dist - r1 - r2;

        const atkRange = unit.getTotalAtkRange ? unit.getTotalAtkRange() : (unit.config.atkRange || 200);
        if (reachDist > atkRange) {
            const currentSpeed = unit.getTotalSpeed ? unit.getTotalSpeed() : unit.speed;
            unit.scene.physics.moveToObject(unit, targetObj, currentSpeed);
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

        if (unit.isShocked) return 1; // Wait out shock

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
    const attackSequence = new Sequence([hasEnemyTarget, isAtIdealAttackRange, attackAction], "Attack Logic");
    const approachSequence = new Sequence([moveToRange], "Move Logic"); // Relies on buff/enemy targets being set

    const nodeCharmBehaviors = NodeCharmManager.getBehaviors(unit, moveToRange, attackAction);

    const root = new Selector([
        ...nodeCharmBehaviors,
        fleeSequence,     // Always prioritize self-preservation
        buffSequence,     // Then prioritize buffing unbuffed allies
        attackSequence,   // Then attack if everyone is buffed
        approachSequence, // Move if not in range for either
        stopAction        // Default idle
    ], "Bard Root");

    unit.btManager = new BehaviorTreeManager(unit, unit.blackboard, root);
}
