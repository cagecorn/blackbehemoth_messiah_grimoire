/**
 * HeadlessCombatEngine.js
 * 
 * Phaser 렌더링에 일절 의존하지 않는 순수 수학적 전투 연산 엔진입니다.
 * 웹 워커 내부에서 호출되어 1분대 이외의 2, 3분대 자동 사냥을 시뮬레이션합니다.
 * EntityStats(hp, x, y, atk 등) JSON 객체 배열만을 매개변수로 받아 연산합니다.
 */
export default class HeadlessCombatEngine {
    constructor(config = {}) {
        this.tickRate = config.tickRate || 100;
        this.units = []; // Unified unit storage with team property
        this.lastTime = Date.now();
        this.logs = [];
    }

    /**
     * @param {Array<Object>} playerStates Array of unit states for the player team
     * @param {Array<Object>} enemyStates Array of unit states for the enemy team
     */
    setState(playerStates, enemyStates) {
        this.units = [
            ...(playerStates || []).map(s => ({ ...s, team: 'player' })),
            ...(enemyStates || []).map(s => ({ ...s, team: 'enemy' }))
        ];
    }

    getState() {
        return {
            player: this.units.filter(u => u.team === 'player'),
            enemy: this.units.filter(u => u.team === 'enemy')
        };
    }

    update() {
        const now = Date.now();
        const delta = now - this.lastTime;
        this.lastTime = now;

        this.units.forEach(unit => {
            if (unit.hp <= 0) return;

            // Handle CC (Simplified)
            if (unit.isStunned || unit.isShocked || unit.isAirborne) return;

            const targets = this.units.filter(u => u.team !== unit.team && u.hp > 0);
            const target = this.findClosestTarget(unit, targets);
            if (!target) return;

            const dist = this.getDistance(unit, target);

            // Skill Logic (Simplified)
            if (unit.skillName && now - (unit._lastSkillTime || 0) > 8000) {
                unit._lastSkillTime = now;
                this.performSkill(unit, target);
            }
            // Move or Basic Attack
            else if (dist > unit.atkRange) {
                this.moveTowards(unit, target, delta);
            } else {
                if (now - (unit._lastAttackTime || 0) > unit.atkSpd) {
                    unit._lastAttackTime = now;
                    this.performAttack(unit, target);
                }
            }
        });

        // Cleanup dead
        this.units = this.units.filter(u => u.hp > 0);
    }

    performAttack(attacker, target) {
        const hitChance = Math.max(0.05, Math.min(1.0, (attacker.acc - target.eva) / 100.0));
        if (Math.random() > hitChance) {
            this.log(`[Attack] ${attacker.unitName} MISSED ${target.unitName}`);
            return;
        }

        let damage = Math.max(1, attacker.atk - target.def);
        if (attacker.crit > 0 && Math.random() * 100 < attacker.crit) {
            damage *= 1.5;
        }

        target.hp -= damage;
        this.log(`[Attack] ${attacker.unitName} hit ${target.unitName} for ${damage.toFixed(1)}`);
    }

    performSkill(attacker, target) {
        this.log(`[Skill] ${attacker.unitName} uses ${attacker.skillName}!`);
        // Simple hit for simulation purposes
        let damage = (attacker.mAtk || attacker.atk) * 2;
        target.hp -= damage;
        this.log(`[Skill] ${attacker.skillName} hit ${target.unitName} for ${damage.toFixed(1)}`);
    }

    moveTowards(entity, target, deltaMs) {
        const speedPerMs = entity.speed / 1000;
        const moveDist = speedPerMs * deltaMs;
        const dx = target.x - entity.x;
        const dy = target.y - entity.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            const ratio = moveDist / distance;
            entity.x += dx * ratio;
            entity.y += dy * ratio;
        }
    }

    getDistance(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    findClosestTarget(entity, targetArray) {
        let minTarget = null;
        let minD = Infinity;
        for (const t of targetArray) {
            const d = this.getDistance(entity, t);
            if (d < minD) {
                minD = d;
                minTarget = t;
            }
        }
        return minTarget;
    }

    log(msg) {
        this.logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
        console.info(msg);
    }
}
