import { Action, Sequence, Condition } from './BehaviorTreeManager.js';
import Phaser from 'phaser';

/**
 * node_hater (😠): Prioritize supports (healers/bards). +10% Damage.
 * node_blood (😡): Prioritize enemies HP <= 30%. Speed +30%.
 * node_guard (😎): Guard lowest HP ally.
 */
export const NODE_CHARMS = {
    'node_hater': 'node_hater',
    'node_blood': 'node_blood',
    'node_guard': 'node_guard'
};

export default class NodeCharmManager {

    /**
     * Builds and returns an array of Behavior Tree nodes based on the unit's equipped node charms.
     * @param {Object} agent The unit (Mercenary or BaseMonster)
     * @param {Task} moveAction The unit's standard BT move action
     * @param {Task} attackAction The unit's standard BT attack action
     * @returns {Array} List of BT nodes to be prepended to the Root Selector
     */
    static getBehaviors(agent, moveAction, attackAction) {
        if (!agent.nodeCharms) return [];

        const behaviors = [];

        for (const charm of agent.nodeCharms) {
            if (!charm) continue;

            if (charm === NODE_CHARMS.node_hater) {
                behaviors.push(this.createHaterBehavior(agent, moveAction, attackAction));
            } else if (charm === NODE_CHARMS.node_blood) {
                behaviors.push(this.createBloodBehavior(agent, moveAction, attackAction));
            } else if (charm === NODE_CHARMS.node_guard) {
                behaviors.push(this.createGuardBehavior(agent, moveAction, attackAction));
            }
        }

        return behaviors;
    }

    static createHaterBehavior(agent, moveAction, attackAction) {
        const findSupport = new Action((a, bb) => {
            const targets = a.targetGroup ? a.targetGroup.getChildren() : [];
            let bestSupport = null;
            let minDist = Infinity;

            for (const t of targets) {
                if (!t.active || t.hp <= 0) continue;
                if (t.team === a.team) continue;

                // Check if target is support
                const isSupport = t.config && (t.config.aiType === 'SUPPORT' || t.config.id === 'healer' || t.config.id === 'bard');

                if (isSupport) {
                    const dist = Phaser.Math.Distance.Between(a.x, a.y, t.x, t.y);
                    if (dist < minDist) {
                        minDist = dist;
                        bestSupport = t;
                    }
                }
            }

            if (bestSupport) {
                bb.set('target', bestSupport);
                // Flag for +10% damage multiplier in attack node if needed, though simple stat mod is cleaner
                bb.set('hater_active', true);
                return 0; // SUCCESS
            }

            bb.set('hater_active', false);
            return 2; // FAILED - No supports left, fallback to default AI
        }, "NodeCharm: Find Support");

        return new Sequence([findSupport, moveAction, attackAction], "Sequence: Hater");
    }

    static createBloodBehavior(agent, moveAction, attackAction) {
        const findLowHp = new Action((a, bb) => {
            const targets = a.targetGroup ? a.targetGroup.getChildren() : [];
            let bestTarget = null;
            let minDist = Infinity;

            for (const t of targets) {
                if (!t.active || t.hp <= 0) continue;
                if (t.team === a.team) continue;

                const hpPercent = t.hp / t.maxHp;
                if (hpPercent <= 0.3) {
                    const dist = Phaser.Math.Distance.Between(a.x, a.y, t.x, t.y);
                    if (dist < minDist) {
                        minDist = dist;
                        bestTarget = t;
                    }
                }
            }

            if (bestTarget) {
                bb.set('target', bestTarget);
                // Speed boost applied passively via buff or directly during move
                a.bonusSpeed = (a.bonusSpeed || 0) + 50;
                bb.set('blood_speed_buffed', true);
                return 0; // SUCCESS
            }

            if (bb.get('blood_speed_buffed')) {
                a.bonusSpeed = Math.max(0, (a.bonusSpeed || 0) - 50);
                bb.set('blood_speed_buffed', false);
            }

            return 2; // FAILED
        }, "NodeCharm: Find Low HP");

        return new Sequence([findLowHp, moveAction, attackAction], "Sequence: Blood Scent");
    }

    static createGuardBehavior(agent, moveAction, attackAction) {
        const findTargetToGuard = new Action((a, bb) => {
            const allies = a.allyGroup ? a.allyGroup.getChildren() : [];

            // Priority: healer (player) / shaman (monster) > bard > wizard > archer
            const priorities = ['healer', 'shaman', 'bard', 'wizard', 'archer'];
            let bestTarget = null;
            let highestPriorityIdx = -1;

            for (const ally of allies) {
                if (!ally.active || ally.hp <= 0 || ally === a) continue;

                const className = ally.className || (ally.config ? ally.config.id : '');
                const pIdx = priorities.indexOf(className);

                if (pIdx > highestPriorityIdx) {
                    highestPriorityIdx = pIdx;
                    bestTarget = ally;
                }
            }

            // Fallback: If no priority targets found, guard lowest HP ally
            if (!bestTarget) {
                let lowestHpPercent = 1.0;
                for (const ally of allies) {
                    if (!ally.active || ally.hp <= 0 || ally === a) continue;
                    const hpPercent = ally.hp / ally.maxHp;
                    if (hpPercent < lowestHpPercent) {
                        lowestHpPercent = hpPercent;
                        bestTarget = ally;
                    }
                }
            }

            const lowestHpAlly = bestTarget;

            if (!lowestHpAlly) return 2; // Failed, no one to guard

            // 1. Check if we need to move to the ally
            const distToAlly = Phaser.Math.Distance.Between(a.x, a.y, lowestHpAlly.x, lowestHpAlly.y);
            if (distToAlly > 150) {
                // Too far! Override target to the ally temporarily, but skip attack Action
                const currentSpeed = a.getTotalSpeed ? a.getTotalSpeed() : a.speed;

                // Add Safety limit
                const maxAllowedSpeed = 500;
                const safeSpeed = Math.min(currentSpeed, maxAllowedSpeed);

                a.scene.physics.moveToObject(a, lowestHpAlly, safeSpeed);
                // Return RUNNING so we keep moving and skip the actual attack/move sequences below
                return 1;
            }

            // 2. We are close to the ally. Find enemies threatening them.
            const enemies = a.targetGroup ? a.targetGroup.getChildren() : [];
            let closestEnemyToAlly = null;
            let minEnemyDist = Infinity;

            for (const enemy of enemies) {
                if (!enemy.active || enemy.hp <= 0) continue;
                const distToGuardTarget = Phaser.Math.Distance.Between(lowestHpAlly.x, lowestHpAlly.y, enemy.x, enemy.y);

                // If enemy is within 200px of the guarded ally, they are a threat
                if (distToGuardTarget < 200 && distToGuardTarget < minEnemyDist) {
                    minEnemyDist = distToGuardTarget;
                    closestEnemyToAlly = enemy;
                }
            }

            if (closestEnemyToAlly) {
                bb.set('target', closestEnemyToAlly);
                return 0; // SUCCESS -> proceeds to normal moveAction and attackAction
            }

            // If we are close to ally, and no enemies are near, we just idle (RUNNING so we don't fallback to Aggressive)
            if (a.body) a.body.setVelocity(0, 0);
            return 1;

        }, "NodeCharm: Guard Lowest HP Ally");

        return new Sequence([findTargetToGuard, moveAction, attackAction], "Sequence: Guard");
    }
}
