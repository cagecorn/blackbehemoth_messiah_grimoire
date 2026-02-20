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

        // Physics move toward target if not close enough
        const dist = Phaser.Math.Distance.Between(a.x, a.y, target.x, target.y);
        const atkRange = a.config.atkRange || 50;

        if (dist > atkRange) {
            a.scene.physics.moveToObject(a, target, a.speed);
            return 1; // RUNNING
        } else {
            // Reached target, stop moving
            a.body.setVelocity(0, 0);
            return 0; // SUCCESS
        }
    }, "Chasing");

    // 4. Attack the target (Real-Time Melee)
    const attackTarget = new Action((a, bb) => {
        const target = bb.get('target');

        if (!target || !target.scene || (target.hp !== undefined && target.hp <= 0)) {
            return 2; // Target dead -> FAILED
        }

        const now = a.scene.time.now;
        if (!a.lastAttackTime) a.lastAttackTime = 0;
        const atkSpd = a.atkSpd || 1000;

        if (now - a.lastAttackTime >= atkSpd) {
            a.lastAttackTime = now;

            // Hit Animation (Simple Tween)
            a.scene.tweens.add({
                targets: a.sprite,
                x: a.sprite.x + (a.lastScaleX * 10), // nudge forward
                duration: 50,
                yoyo: true
            });

            // Calculate and Apply Damage
            let damage = a.atk;
            // Basic Accuracy / Crit check logic could go here
            if (Math.random() * 100 < a.crit) {
                damage *= 1.5;
            }

            if (target.takeDamage) {
                // Pass a.className so the kill is attributed correctly
                target.takeDamage(damage, a.className);
            }
        }

        return 1; // RUNNING (Keep attacking as long as they are close)
    }, "Attacking");

    // Sequence: Must be AGGRESSIVE -> Find Target -> Move to Target -> Attack
    const huntSequence = new Sequence([checkStateAggressive, findTarget, chaseTarget, attackTarget], "Hunt Logic");

    // Root Selector
    const rootSelector = new Selector([huntSequence], "Melee Root");

    agent.btManager = new BehaviorTreeManager(agent, agent.blackboard, rootSelector);
}
