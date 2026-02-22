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
            // ★ 파괴/비활성 유닛은 반드시 먼저 스킵 (t.body 접근 전)
            if (!t || !t.active || !t.body) continue;
            // 체력이 0 이하인 유닛 스킵
            if (t.hp !== undefined && t.hp <= 0) continue;

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
            // 타겟이 바뀔 때만 로그 출력 (매 프레임 폭발 방지)
            const prevTarget = bb.get('target');
            if (prevTarget !== bestTarget) {
                console.log(`[MeleeAI] ${a.unitName} -> 새 타겟: ${bestTarget.unitName || bestTarget.id} (거리: ${Math.round(minDist)})`);
            }
            bb.set('target', bestTarget);
            return 0; // SUCCESS (Proceed to chase)
        }

        return 2; // FAILED (No valid target)
    }, "Finding Target");

    // 3. Chase the target
    const chaseTarget = new Action((a, bb) => {
        const target = bb.get('target');

        // ★ Phaser Container에서 scene 활성 체크는 scene.scene.isActive() 사용
        if (!target || !target.active || (target.hp !== undefined && target.hp <= 0)) {
            bb.set('target', null); // 죽은 타겟 클리어
            return 2; // Target dead or removed -> FAILED
        }

        // Physics move toward target if not close enough
        const dist = Phaser.Math.Distance.Between(a.x, a.y, target.x, target.y);
        const atkRange = a.config.atkRange || 50;

        // Account for collision radii for better combat depth/reach
        const r1 = a.body ? a.body.radius : 0;
        const r2 = target.body ? target.body.radius : 0;
        const reachDist = dist - r1 - r2;

        if (reachDist > atkRange) {
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

        // Prevent attack if shocked
        if (a.isShocked) {
            return 1; // RUNNING
        }

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
            let damage = a.getTotalAtk ? a.getTotalAtk() : a.atk;
            // Basic Accuracy / Crit check logic could go here
            if (Math.random() * 100 < a.crit) {
                damage *= 1.5;
            }

            if (target.takeDamage) {
                // Pass a so the kill is attributed correctly and Miss works
                target.takeDamage(damage, a);
            }
        }

        return 1; // RUNNING (Keep attacking as long as they are close)
    }, "Attacking");

    // 5. Idle fallback — stop moving when nothing to do
    const stopAction = new Action((a, bb) => {
        if (a.body) a.body.setVelocity(0, 0);
        bb.set('target', null);
        return 0; // SUCCESS
    }, "Idle");

    // Sequence: Must be AGGRESSIVE -> Find Target -> Move to Target -> Attack
    const huntSequence = new Sequence([checkStateAggressive, findTarget, chaseTarget, attackTarget], "Hunt Logic");

    // Root Selector — falls back to idle if no targets
    const rootSelector = new Selector([huntSequence, stopAction], "Melee Root");

    agent.btManager = new BehaviorTreeManager(agent, agent.blackboard, rootSelector);
}
