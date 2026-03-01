import { Action, Sequence, Condition } from './BehaviorTreeManager.js';
import Phaser from 'phaser';

/**
 * node_enraged (😠): Prioritize closest enemies. ATK increases based on missing HP.
 * node_blood (😡): Prioritize enemies HP <= 30%. Speed +30%.
 * node_guard (😎): Guard lowest HP ally. Defense +10%.
 */
export const NODE_CHARMS = {
    'node_enraged': 'emoji_pouting_face',
    'node_blood': 'emoji_enraged_face',
    'node_guard': 'emoji_smiling_face_with_sunglasses'
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

            console.log(`[NodeCharmManager] Proccessing charm: ${charm} for ${agent.unitName}`);

            if (charm === NODE_CHARMS.node_enraged) {
                behaviors.push(this.createEnragedBehavior(agent, moveAction, attackAction));
            } else if (charm === NODE_CHARMS.node_blood) {
                behaviors.push(this.createBloodBehavior(agent, moveAction, attackAction));
            } else if (charm === NODE_CHARMS.node_guard) {
                behaviors.push(this.createGuardBehavior(agent, moveAction, attackAction));
            } else {
                console.warn(`[NodeCharmManager] Unknown charm ID: ${charm}`);
            }
        }

        return behaviors;
    }

    static createEnragedBehavior(agent, moveAction, attackAction) {
        const findEnragedTarget = new Action((a, bb) => {
            const targets = a.targetGroup ? a.targetGroup.getChildren() : [];
            let bestTarget = null;
            let minDist = Infinity;

            // Priority targeting: Supporters (Healer, Shaman, Bard)
            const priorities = ['healer', 'shaman', 'bard'];
            let highestPriorityIdx = -1;

            for (const t of targets) {
                if (!t.active || t.hp <= 0) continue;
                if (t.team === a.team) continue;

                // Support targets have lower indices in the 'priorities' array
                const className = t.className || (t.config ? t.config.id : '');
                const pIdx = priorities.indexOf(className);

                if (pIdx !== -1) {
                    // Current target is a priority supporter
                    if (highestPriorityIdx === -1 || pIdx < highestPriorityIdx) {
                        // Found a higher priority supporter than we had before
                        highestPriorityIdx = pIdx;
                        bestTarget = t;
                        minDist = Phaser.Math.Distance.Between(a.x, a.y, t.x, t.y);
                    } else if (pIdx === highestPriorityIdx) {
                        // Same priority level (e.g. two shamans), pick the closest one
                        const dist = Phaser.Math.Distance.Between(a.x, a.y, t.x, t.y);
                        if (dist < minDist) {
                            minDist = dist;
                            bestTarget = t;
                        }
                    }
                } else if (highestPriorityIdx === -1) {
                    // No supporter found yet, maintain standard "closest enemy" tracking
                    const dist = Phaser.Math.Distance.Between(a.x, a.y, t.x, t.y);
                    if (dist < minDist) {
                        minDist = dist;
                        bestTarget = t;
                    }
                }
            }

            if (bestTarget) {
                bb.set('target', bestTarget);
                bb.set('enraged_active', true);
                return 0; // SUCCESS
            }

            bb.set('enraged_active', false);
            return 2; // FAILED - No enemies left
        }, "NodeCharm: Find Enraged Target");

        return new Sequence([findEnragedTarget, moveAction, attackAction], "Sequence: Enraged");
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
                bb.set('blood_active', true); // For UI reporting
                // Apply speed boost only ONCE while buffed
                if (!bb.get('blood_speed_buffed')) {
                    a.bonusSpeed = (a.bonusSpeed || 0) + 50;
                    bb.set('blood_speed_buffed', true);
                }
                return 0; // SUCCESS
            }

            bb.set('blood_active', false);
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

                if (pIdx !== -1) {
                    // Lower index = Higher priority (0: healer, 1: shaman, etc.)
                    if (highestPriorityIdx === -1 || pIdx < highestPriorityIdx) {
                        highestPriorityIdx = pIdx;
                        bestTarget = ally;
                    }
                }
            }

            if (!bestTarget) {
                // Fallback: If no priority targets found, guard lowest HP ally
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

            const guardTarget = bestTarget;
            if (!guardTarget) return 2; // Failed, no one to guard

            // Store current guard target for logging
            if (bb.get('guard_target') !== guardTarget) {
                bb.set('guard_target', guardTarget);
                const priorityStr = highestPriorityIdx !== -1 ? `Priority ${highestPriorityIdx}` : 'Lowest HP Fallback';
                console.log(`[Bodyguard] ${a.unitName} is now guarding ${guardTarget.unitName} (${priorityStr})`);
            }

            // 1. Check if we need to move back to the ally (Strict Leash: 150px)
            const distToAlly = Phaser.Math.Distance.Between(a.x, a.y, guardTarget.x, guardTarget.y);
            if (distToAlly > 150) {
                const currentSpeed = a.getTotalSpeed ? a.getTotalSpeed() : a.speed;
                const safeSpeed = Math.min(currentSpeed, 500);
                a.scene.physics.moveToObject(a, guardTarget, safeSpeed);
                bb.set('target', null); // Stop chasing enemy, return to base
                return 1;
            }

            // 2. We are close to the ally. Find enemies threatening them.
            const enemies = a.targetGroup ? a.targetGroup.getChildren() : [];
            let closestEnemyToAlly = null;
            let minEnemyDist = Infinity;

            for (const enemy of enemies) {
                if (!enemy.active || enemy.hp <= 0) continue;
                const distToGuardTarget = Phaser.Math.Distance.Between(guardTarget.x, guardTarget.y, enemy.x, enemy.y);

                // Threat Range: 220px around the ally
                if (distToGuardTarget < 220 && distToGuardTarget < minEnemyDist) {
                    minEnemyDist = distToGuardTarget;
                    closestEnemyToAlly = enemy;
                }
            }

            if (closestEnemyToAlly) {
                bb.set('target', closestEnemyToAlly);
                bb.set('guard_active', true); // Active while guarding
                return 0; // SUCCESS -> proceeds to normal moveAction and attackAction
            }

            // If we are close to ally, and no enemies are near, we just idle (RUNNING so we don't fallback to Aggressive)
            bb.set('guard_active', true); // Even while idling near protected, stay active
            if (a.body) a.body.setVelocity(0, 0);
            return 1;

        }, "NodeCharm: Guard");

        return new Sequence([findTargetToGuard, moveAction, attackAction], "Sequence: Guard");
    }
}
