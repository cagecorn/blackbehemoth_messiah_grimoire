import Blackboard from './Blackboard.js';
import BehaviorTreeManager, { Selector, Sequence, Condition, Action } from './BehaviorTreeManager.js';
import Phaser from 'phaser';

/**
 * Injects a Blackboard and BehaviorTreeManager into an agent (Player or Enemy).
 * Creates a standard "Aggressive Melee" AI loop that chases the nearest valid target.
 * 
 * @param {Phaser.GameObjects.Container} agent - The entity to be controlled
 * @param {Function} targetListGetter - A function returning an array of potential targets: `(agent) => [targets]`
 * @param {String} initialState - e.g. 'AGGRESSIVE', 'MANUAL', 'IDLE'
 */
export default function applyMeleeAI(agent, targetListGetter, initialState = 'AGGRESSIVE') {
    agent.blackboard = new Blackboard();
    agent.blackboard.set('self', agent);
    agent.blackboard.set('ai_state', initialState);

    // Behavior Tree Nodes

    // 1. Check AI State
    const checkStateAggressive = new Condition((a, bb) => bb.get('ai_state') === 'AGGRESSIVE', "Aggressive?");

    // 2. Find the nearest valid target
    const findTarget = new Action((a, bb) => {
        let targets = targetListGetter(a);
        if (!targets) return 2; // FAILED

        // Handle Phaser Groups
        if (targets.getChildren) {
            targets = targets.getChildren();
        }

        if (targets.length === 0) return 2; // FAILED

        let priorityRole = bb.get('target_priority');
        let closestPriority = null;
        let priorityMinDist = Infinity;
        let closest = null;
        let minDist = Infinity;

        for (let t of targets) {
            // Ignore dead targets or targets currently in active combat (frozen)
            if (t.hp !== undefined && t.hp <= 0) continue;
            // Hacky check for active combat (a cleaner way would be reading a state)
            if (t.body.velocity.x === 0 && t.body.velocity.y === 0 && t.activeCombat) continue;

            const dist = Phaser.Math.Distance.Between(a.x, a.y, t.x, t.y);

            // Check if this target matches the commander's priority
            if (priorityRole && t.config && t.config.aiType === priorityRole) {
                if (dist < priorityMinDist) {
                    priorityMinDist = dist;
                    closestPriority = t;
                }
            }

            if (dist < minDist) {
                minDist = dist;
                closest = t;
            }
        }

        // Pick the closest priority target if available, otherwise just closest
        const bestTarget = closestPriority || closest;

        if (bestTarget) {
            bb.set('target', bestTarget);
            return 0; // SUCCESS (Proceed to chase)
        }

        return 2; // FAILED (No valid target)
    }, "Finding Target");

    // 3. Chase the target
    const chaseTarget = new Action((a, bb) => {
        const target = bb.get('target');

        if (!target || !target.scene || (target.hp !== undefined && target.hp <= 0)) {
            return 2; // Target dead or removed -> FAILED
        }

        // Physics move toward target
        a.scene.physics.moveToObject(a, target, a.speed);
        return 1; // RUNNING
    }, "Chasing");

    // Sequence: Must be AGGRESSIVE -> Find Target -> Move to Target
    const huntSequence = new Sequence([checkStateAggressive, findTarget, chaseTarget], "Hunt Logic");

    // Root Selector
    const rootSelector = new Selector([huntSequence], "Melee Root");

    agent.btManager = new BehaviorTreeManager(agent, agent.blackboard, rootSelector);
}
