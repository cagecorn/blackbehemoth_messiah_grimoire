import Blackboard from './Blackboard.js';
import { Action, Sequence, Selector, Condition } from './BehaviorTreeManager.js';
import BehaviorTreeManager from './BehaviorTreeManager.js';
import NodeCharmManager from './NodeCharmManager.js';
import Phaser from 'phaser';

/**
 * RangedAI
 * Targets enemies but tries to maintain a safe distance (Kiting).
 */
export default function applyRangedAI(unit, skillNode = null) {
    if (!unit.blackboard) {
        unit.blackboard = new Blackboard();
        unit.blackboard.set('self', unit);
        unit.blackboard.set('ai_state', 'AGGRESSIVE');
        unit.blackboard.set('target', null);
    }

    // 1. Behavior Tree Nodes

    const checkLeash = new Condition(() => {
        if (unit.team !== 'player' || !unit.warrior || unit === unit.warrior) return false;
        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, unit.warrior.x, unit.warrior.y);
        return dist > 700; // Leash distance for ranged
    }, "Too far from leader?");

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

    const hasTarget = new Condition(() => unit.blackboard.get('target') != null, "Has Target?");

    const isEvasiveActive = new Condition(() => unit.isEvasiveManeuversActive, "Evasive Active?");

    const isTooClose = new Condition(() => {
        const targetObj = unit.blackboard.get('target');
        if (!targetObj) return false;
        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, targetObj.x, targetObj.y);

        // [Standardization Fix] Use center-to-center distance to match perk triggers 
        // and prevent "approach too close" bug where radius subtraction made reachDist too small.
        const rangeMin = unit.getTotalRangeMin ? unit.getTotalRangeMin() : (unit.rangeMin !== undefined ? unit.rangeMin : 150);
        return dist < rangeMin;
    }, "Enemy Too Close?");

    const isAtIdealRange = new Condition(() => {
        const targetObj = unit.blackboard.get('target');
        if (!targetObj) return false;
        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, targetObj.x, targetObj.y);

        const rangeMin = unit.getTotalRangeMin ? unit.getTotalRangeMin() : (unit.rangeMin !== undefined ? unit.rangeMin : 150);
        const rangeMax = unit.getTotalRangeMax ? unit.getTotalRangeMax() : (unit.rangeMax !== undefined ? unit.rangeMax : 300);
        return dist >= rangeMin && dist <= rangeMax;
    }, "In Ideal Range?");

    const fleeFromTarget = new Action(() => {
        const targetObj = unit.blackboard.get('target');
        if (!targetObj) return 2; // FAILED

        const angle = Phaser.Math.Angle.Between(targetObj.x, targetObj.y, unit.x, unit.y);
        const currentSpeed = unit.getTotalSpeed ? unit.getTotalSpeed() : unit.speed;
        unit.body.setVelocity(
            Math.cos(angle) * currentSpeed,
            Math.sin(angle) * currentSpeed
        );
        return 1; // RUNNING
    }, "Kiting (Flee)");

    const evasiveEscapeAction = new Action(() => {
        // Find all enemies within 120px
        const targetGroup = unit.targetGroup;
        if (!targetGroup) return 2;

        const enemies = targetGroup.getChildren();
        let avgX = 0;
        let avgY = 0;
        let count = 0;
        for (const enemy of enemies) {
            // 체력이 0 이하이거나 펫인 유닛 스킵
            if (!enemy.active || (enemy.hp !== undefined && enemy.hp <= 0) || enemy.className === 'pet') {
                continue;
            }
            const dist = Phaser.Math.Distance.Between(unit.x, unit.y, enemy.x, enemy.y);
            if (dist < 120) {
                avgX += enemy.x;
                avgY += enemy.y;
                count++;
            }
        }

        if (count > 0) {
            avgX /= count;
            avgY /= count;
            const angle = Phaser.Math.Angle.Between(avgX, avgY, unit.x, unit.y);
            const currentSpeed = unit.getTotalSpeed ? unit.getTotalSpeed() : unit.speed;
            unit.body.setVelocity(
                Math.cos(angle) * currentSpeed,
                Math.sin(angle) * currentSpeed
            );
        } else {
            // If no one is near, just move away from current target or leader
            const targetObj = unit.blackboard.get('target');
            if (targetObj) {
                const angle = Phaser.Math.Angle.Between(targetObj.x, targetObj.y, unit.x, unit.y);
                const currentSpeed = unit.getTotalSpeed ? unit.getTotalSpeed() : unit.speed;
                unit.body.setVelocity(Math.cos(angle) * currentSpeed, Math.sin(angle) * currentSpeed);
            }
        }
        return 1; // RUNNING
    }, "Evasive Roll");

    const moveToIdealRange = new Action(() => {
        const targetObj = unit.blackboard.get('target');
        if (!targetObj) return 2; // FAILED

        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, targetObj.x, targetObj.y);
        const rangeMax = unit.getTotalRangeMax ? unit.getTotalRangeMax() : (unit.rangeMax !== undefined ? unit.rangeMax : 300);

        if (dist > rangeMax) {
            const angle = Phaser.Math.Angle.Between(unit.x, unit.y, targetObj.x, targetObj.y);
            const currentSpeed = unit.getTotalSpeed ? unit.getTotalSpeed() : unit.speed;
            unit.body.setVelocity(
                Math.cos(angle) * currentSpeed,
                Math.sin(angle) * currentSpeed
            );
            return 1; // RUNNING
        } else {
            // [Momentum Fix] Stop moving once in range
            if (unit.body) unit.body.setVelocity(0, 0);
            return 0; // SUCCESS
        }
    }, "Moving to Target");

    const attackAction = new Action(() => {
        const stance = unit.blackboard.get('ai_state');
        if (stance === 'IDLE' || stance === 'MANUAL') return 2; // FAILED

        unit.body.setVelocity(0, 0); // Stop to fire

        // Prevent attack if shocked
        if (unit.isShocked) {
            return 1; // RUNNING
        }

        // [NodeCharm] Hater Node (😠) damage bonus
        // For ranged, we set a flag on the unit so fireProjectile can read it
        unit._haterDamageMult = unit.blackboard.get('hater_active') ? 1.1 : 1.0;

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
    const evasiveSequence = new Sequence([isEvasiveActive, evasiveEscapeAction], "Evasive Logic");
    const approachSequence = new Sequence([moveToIdealRange], "Approach Logic");

    const combatBehaviors = [];
    combatBehaviors.push(evasiveSequence); // Absolute priority!
    combatBehaviors.push(kitingSequence); // Survival first!

    if (skillNode) {
        combatBehaviors.push(skillNode); // Then skills
    }
    combatBehaviors.push(attackSequence, approachSequence, stopAction); // Then base attacks

    const autoBehavior = new Selector(combatBehaviors, "Combat Selector");

    // Extract behaviors from NodeCharms (Gambit Style Injection)
    // Note: Ranged uses approachSequence (moveToIdealRange) and attackAction (fireProjectile)
    const nodeCharmBehaviors = NodeCharmManager.getBehaviors(unit, approachSequence, attackAction);

    const root = new Selector([
        leashSequence,
        ...nodeCharmBehaviors,
        new Sequence([hasTarget, autoBehavior], "Main Loop"),
        stopAction
    ], "Ranged Root");

    // 3. Initialize Manager
    unit.btManager = new BehaviorTreeManager(unit, unit.blackboard, root);
}
