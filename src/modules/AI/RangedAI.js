import { Action, Sequence, Selector, Condition } from './BehaviorTreeManager.js';
import BehaviorTreeManager from './BehaviorTreeManager.js';
import Phaser from 'phaser';

/**
 * RangedAI
 * Targets enemies but tries to maintain a safe distance (Kiting).
 */
export default function applyRangedAI(unit, skillNode = null) {
    // 1. Behavior Tree Nodes

    const hasTarget = new Condition(() => unit.blackboard.get('target') != null, "Has Target?");

    const isTooClose = new Condition(() => {
        const targetObj = unit.blackboard.get('target');
        if (!targetObj) return false;
        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, targetObj.x, targetObj.y);
        const r1 = unit.body ? unit.body.radius : 0;
        const r2 = targetObj.body ? targetObj.body.radius : 0;
        const reachDist = dist - r1 - r2;

        const rangeMin = unit.config.rangeMin || 150;
        return reachDist < rangeMin;
    }, "Enemy Too Close?");

    const isAtIdealRange = new Condition(() => {
        const targetObj = unit.blackboard.get('target');
        if (!targetObj) return false;
        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, targetObj.x, targetObj.y);
        const r1 = unit.body ? unit.body.radius : 0;
        const r2 = targetObj.body ? targetObj.body.radius : 0;
        const reachDist = dist - r1 - r2;

        const rangeMin = unit.config.rangeMin || 150;
        const rangeMax = unit.config.rangeMax || 300;
        return reachDist >= rangeMin && reachDist <= rangeMax;
    }, "In Ideal Range?");

    const fleeFromTarget = new Action(() => {
        const targetObj = unit.blackboard.get('target');
        if (!targetObj) return 2; // FAILED

        const angle = Phaser.Math.Angle.Between(targetObj.x, targetObj.y, unit.x, unit.y);
        unit.body.setVelocity(
            Math.cos(angle) * unit.speed,
            Math.sin(angle) * unit.speed
        );
        return 1; // RUNNING
    }, "Kiting (Flee)");

    const moveToIdealRange = new Action(() => {
        const targetObj = unit.blackboard.get('target');
        if (!targetObj) return 2; // FAILED

        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, targetObj.x, targetObj.y);
        const r1 = unit.body ? unit.body.radius : 0;
        const r2 = targetObj.body ? targetObj.body.radius : 0;
        const reachDist = dist - r1 - r2;

        const rangeMax = unit.config.rangeMax || 300;
        if (reachDist > rangeMax) {
            const angle = Phaser.Math.Angle.Between(unit.x, unit.y, targetObj.x, targetObj.y);
            unit.body.setVelocity(
                Math.cos(angle) * unit.speed,
                Math.sin(angle) * unit.speed
            );
            return 1; // RUNNING
        }
        return 0; // SUCCESS
    }, "Moving to Target");

    const attackAction = new Action(() => {
        const stance = unit.blackboard.get('ai_state');
        if (stance === 'IDLE' || stance === 'MANUAL') return 2; // FAILED

        unit.body.setVelocity(0, 0); // Stop to fire

        // Prevent attack if shocked
        if (unit.isShocked) {
            return 1; // RUNNING
        }

        const success = unit.fireProjectile();
        return success ? 0 : 2; // SUCCESS or FAILED
    }, "Sniping (Attack)");

    const stopAction = new Action(() => {
        if (unit.body) unit.body.setVelocity(0, 0);
        return 0; // SUCCESS
    }, "Idle");

    // 2. Build the Tree
    const attackSequence = new Sequence([isAtIdealRange, attackAction], "Sniping Logic");
    const kitingSequence = new Sequence([isTooClose, fleeFromTarget], "Kite Logic");
    const approachSequence = new Sequence([moveToIdealRange], "Approach Logic");

    const combatBehaviors = [];
    combatBehaviors.push(kitingSequence); // Survival first!

    if (skillNode) {
        combatBehaviors.push(skillNode); // Then skills
    }
    combatBehaviors.push(attackSequence, approachSequence, stopAction); // Then base attacks

    const autoBehavior = new Selector(combatBehaviors, "Combat Selector");

    const root = new Selector([
        new Sequence([hasTarget, autoBehavior], "Main Loop"),
        stopAction
    ], "Ranged Root");

    // 3. Initialize Manager
    unit.btManager = new BehaviorTreeManager(unit, unit.blackboard, root);
}
