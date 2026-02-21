/**
 * HeadlessCombatEngine.js
 * 
 * Phaser 렌더링에 일절 의존하지 않는 순수 수학적 전투 연산 엔진입니다.
 * 웹 워커 내부에서 호출되어 1분대 이외의 2, 3분대 자동 사냥을 시뮬레이션합니다.
 * EntityStats(hp, x, y, atk 등) JSON 객체 배열만을 매개변수로 받아 연산합니다.
 */
export default class HeadlessCombatEngine {
    constructor(config = {}) {
        this.tickRate = config.tickRate || 100; // ms 단위 연산 주기

        // Data arrays explicitly containing exported "state" objects, NOT Phaser classes.
        this.mercenaries = [];
        this.monsters = [];

        this.lastTime = Date.now();
    }

    /**
     * @param {Array<Object>} mercStates Array of Mercenary.getState() objects
     * @param {Array<Object>} monStates Array of BaseMonster.getState() objects
     */
    setState(mercStates, monStates) {
        this.mercenaries = mercStates || [];
        this.monsters = monStates || [];
    }

    /**
     * @returns {Object} { mercenaries: [...], monsters: [...] }
     */
    getState() {
        return {
            mercenaries: this.mercenaries,
            monsters: this.monsters
        };
    }

    /**
     * 1 틱(Tick)을 전진시킵니다.
     * 웹 워커의 setInterval 루프 안에서 주기적으로 호출됩니다.
     */
    update() {
        const now = Date.now();
        const delta = now - this.lastTime;
        this.lastTime = now;

        // --- 1. Mercenary Logic ---
        this.mercenaries.forEach(merc => {
            if (merc.hp <= 0) return;

            // Find closest monster
            const target = this.findClosestTarget(merc, this.monsters);
            if (!target) return; // No enemies

            const dist = this.getDistance(merc, target);

            // If out of range, move towards
            if (dist > merc.atkRange) {
                this.moveTowards(merc, target, delta);
            }
            // If in range and attack delay passed, Attack!
            else {
                if (now - (merc._lastAttackTime || 0) > merc.atkSpd) {
                    merc._lastAttackTime = now;
                    this.performAttack(merc, target);
                }
            }
        });

        // --- 2. Monster Logic ---
        this.monsters.forEach(mon => {
            if (mon.hp <= 0) return;

            const target = this.findClosestTarget(mon, this.mercenaries);
            if (!target) return;

            const dist = this.getDistance(mon, target);

            if (dist > mon.atkRange) {
                this.moveTowards(mon, target, delta);
            } else {
                if (now - (mon._lastAttackTime || 0) > mon.atkSpd) {
                    mon._lastAttackTime = now;
                    this.performAttack(mon, target);
                }
            }
        });

        // --- 3. Remove Dead Units ---
        this.mercenaries = this.mercenaries.filter(m => m.hp > 0);
        this.monsters = this.monsters.filter(m => m.hp > 0);
    }

    /**
     * 데미지 공식을 적용하여 타겟의 체력을 깎습니다.
     * Phaser의 CombatManager와 동일한 공식을 사용해야 합니다.
     */
    performAttack(attacker, target) {
        // --- Accuracy vs Evasion Check ---
        const hitChance = Math.max(0.05, Math.min(1.0, (attacker.acc - target.eva) / 100.0));
        if (Math.random() > hitChance) {
            // Miss - Do nothing mathematically
            return;
        }

        // --- Physical Damage Calculation ---
        let damage = Math.max(1, attacker.atk - target.def);

        // Critical hit
        if (attacker.crit > 0 && Math.random() * 100 < attacker.crit) {
            damage *= 1.5;
        }

        target.hp -= damage;
        if (target.hp < 0) target.hp = 0;
    }

    /**
     * 이동 연산 (간단한 선형 보간 이동)
     */
    moveTowards(entity, target, deltaMs) {
        // speed is typically pixels per second
        const speedPerSec = entity.speed;
        const speedPerMs = speedPerSec / 1000;
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

    /**
     * 가장 가까운 타겟 계산
     */
    getDistance(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    findClosestTarget(entity, targetArray) {
        let minTarget = null;
        let minD = Infinity;

        for (const t of targetArray) {
            if (t.hp <= 0) continue;
            const d = this.getDistance(entity, t);
            if (d < minD) {
                minD = d;
                minTarget = t;
            }
        }
        return minTarget;
    }
}
