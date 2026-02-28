import Blackboard from './Blackboard.js';
import BehaviorTreeManager, { Selector, Sequence, Condition, Action } from './BehaviorTreeManager.js';
import NodeCharmManager from './NodeCharmManager.js';
import Phaser from 'phaser';

/**
 * ProtectAI.js
 * Specialized AI for protective summons.
 * Stays near a specific ally (priority: Healer -> Bard -> Wizard -> Archer)
 * and only attacks enemies that are close to the protected ally or the summon itself.
 */
export default function applyProtectAI(agent, allyGroupGetter, enemyGroupGetter) {
    agent.blackboard = new Blackboard();
    agent.blackboard.set('self', agent);
    agent.blackboard.set('ai_state', 'PROTECT');

    // --- Conditions ---

    // 1. Find the best ally to protect
    const findProtectTarget = new Condition((a, bb) => {
        const currentTarget = bb.get('protect_target');
        if (currentTarget && currentTarget.active && currentTarget.hp > 0) return true;

        const allies = allyGroupGetter(a);
        const children = allies.getChildren ? allies.getChildren() : allies;

        // Priority: healer > bard > wizard > archer
        const priorities = ['healer', 'bard', 'wizard', 'archer'];
        let bestTarget = null;
        let highestPriorityIdx = -1;

        for (const ally of children) {
            if (!ally.active || ally.hp <= 0 || ally === a) continue;

            const className = ally.className || (ally.config ? ally.config.id : '');
            const pIdx = priorities.indexOf(className);

            if (pIdx > highestPriorityIdx) {
                highestPriorityIdx = pIdx;
                bestTarget = ally;
            }
        }

        if (bestTarget) {
            bb.set('protect_target', bestTarget);
            return true;
        }
        return false;
    }, "Find Protect Target");

    // 2. Check if we are too far from our protect target
    const isLeashBroken = new Condition((a, bb) => {
        const target = bb.get('protect_target');
        if (!target) return false;

        const dist = Phaser.Math.Distance.Between(a.x, a.y, target.x, target.y);
        return dist > 120; // Max distance
    }, "Leash Broken?");

    // 3. Check if any enemy is threatening the protect target
    const findThreat = new Condition((a, bb) => {
        const protectTarget = bb.get('protect_target');
        if (!protectTarget) return false;

        const enemies = enemyGroupGetter(a);
        const children = enemies.getChildren ? enemies.getChildren() : enemies;

        let nearestThreat = null;
        let minDist = 200; // Only care about enemies within 200px of target

        for (const enemy of children) {
            if (!enemy.active || enemy.hp <= 0) continue;

            const distToAlly = Phaser.Math.Distance.Between(enemy.x, enemy.y, protectTarget.x, protectTarget.y);
            const distToMe = Phaser.Math.Distance.Between(enemy.x, enemy.y, a.x, a.y);

            if (distToAlly < minDist || distToMe < 100) {
                minDist = Math.min(distToAlly, distToMe);
                nearestThreat = enemy;
            }
        }

        if (nearestThreat) {
            bb.set('target', nearestThreat);
            return true;
        }
        return false;
    }, "Find Threat");

    // --- Actions ---

    // 1. Move toward protect target
    const moveNearAlly = new Action((a, bb) => {
        const target = bb.get('protect_target');
        if (!target) return 2;

        const dist = Phaser.Math.Distance.Between(a.x, a.y, target.x, target.y);

        if (dist > 60) {
            const currentSpeed = a.getTotalSpeed ? a.getTotalSpeed() : a.speed;
            a.scene.physics.moveToObject(a, target, currentSpeed);
            return 1; // RUNNING
        } else {
            a.body.setVelocity(0, 0);
            return 0; // SUCCESS
        }
    }, "Follow Ally");

    // 2. Chase and Attack Threat
    const chaseThreat = new Action((a, bb) => {
        const threat = bb.get('target');
        if (!threat || !threat.active || threat.hp <= 0) {
            bb.set('target', null);
            return 2;
        }

        const dist = Phaser.Math.Distance.Between(a.x, a.y, threat.x, threat.y);
        const range = a.getTotalAtkRange ? a.getTotalAtkRange() : (a.atkRange || 50);

        if (dist > range) {
            const currentSpeed = a.getTotalSpeed ? a.getTotalSpeed() : a.speed;
            a.scene.physics.moveToObject(a, threat, currentSpeed);
            return 1;
        } else {
            a.body.setVelocity(0, 0);
            return 0;
        }
    }, "Chase Threat");

    const attackThreat = new Action((a, bb) => {
        const threat = bb.get('target');
        if (!threat || !threat.active || threat.hp <= 0) return 2;

        const now = a.scene.time.now;
        if (!a.lastAttackTime) a.lastAttackTime = 0;

        if (now - a.lastAttackTime >= (a.atkSpd || 1000)) {
            a.lastAttackTime = now;

            // Basic melee attack logic
            a.scene.tweens.killTweensOf(a.sprite);
            a.sprite.x = 0;
            a.scene.tweens.add({
                targets: a.sprite,
                x: a.lastScaleX * 10,
                duration: 50,
                yoyo: true
            });

            let damage = a.getTotalAtk ? a.getTotalAtk() : a.atk;
            if (threat.takeDamage) {
                threat.takeDamage(damage, a);
            }
        }
        return 1;
    }, "Attack Threat");

    // 3. Use Skill (Holy Aura) if available
    const useSkill = new Action((a, bb) => {
        if (!a.skill) return 2;

        // Auto-cast when ready
        const success = a.skill.execute(a, allyGroupGetter(a).getChildren());
        return success ? 0 : 2;
    }, "Casting Aura");

    // --- BT Construction ---

    // Priority 1: Use Aura whenever possible
    const skillSequence = new Action((a, bb) => {
        if (a.skill && a.skill.execute(a, allyGroupGetter(a).getChildren())) {
            return 0;
        }
        return 2;
    }, "Auto Aura");

    // Priority 2: Stay near ally if leash is broken
    const followSequence = new Sequence([findProtectTarget, isLeashBroken, moveNearAlly], "Follow Flow");

    // Priority 3: Defend against threats
    const defendSequence = new Sequence([findProtectTarget, findThreat, chaseThreat, attackThreat], "Defend Flow");

    // Priority 4: Position properly if idle
    const idleSequence = new Sequence([findProtectTarget, moveNearAlly], "Idle Positioning");

    const nodeCharmBehaviors = NodeCharmManager.getBehaviors(agent, chaseThreat, attackThreat);

    const root = new Selector([
        ...nodeCharmBehaviors,
        skillSequence,
        followSequence,
        defendSequence,
        idleSequence,
        new Action((a) => { if (a.body) a.body.setVelocity(0, 0); return 0; })
    ], "Protect Root");

    agent.btManager = new BehaviorTreeManager(agent, agent.blackboard, root);
}
