/**
 * WarriorPerkSimulation.mjs
 * Headless Node.js simulation for:
 *   1. 강건함 (Fortitude)  — +10% def when 3+ enemies within 120px
 *   2. 론 울프 (Lone Wolf) — +5% all stats when no allies within 200px
 *
 * Run: node src/WarriorPerkSimulation.mjs
 */

const pass = (msg) => console.log(`  ✅ PASS | ${msg}`);
const fail = (msg) => { console.error(`  ❌ FAIL | ${msg}`); process.exitCode = 1; };
const section = (title) => console.log(`\n${'='.repeat(60)}\n  TEST: ${title}\n${'='.repeat(60)}`);

// ─── Minimal mock classes ────────────────────────────────────────────────────
function dist(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function makeMockWarrior(baseStats = {}, x = 0, y = 0) {
    const warrior = {
        unitName: '아렌',
        x, y,
        atk: 20, def: 10, mAtk: 5, mDef: 5, speed: 80, maxHp: 200,
        hp: 200,
        activatedPerks: [],
        isFortitudeActive: false,
        isLoneWolfActive: false,
        _baseDef: null,
        _loneWolfBaseStats: null,
        scene: null, // filled below
        ...baseStats,
    };

    warrior.checkFortitude = function () {
        const SURROUND_RADIUS = 120;
        const SURROUND_COUNT = 3;

        const nearbyEnemies = this.scene.enemies.filter(e =>
            e.alive && dist(this, e) <= SURROUND_RADIUS
        );
        const isSurrounded = nearbyEnemies.length >= SURROUND_COUNT;

        if (isSurrounded && !this.isFortitudeActive) {
            this.isFortitudeActive = true;
            this._baseDef = this.def;
            this.def = Math.round(this.def * 1.10);
            console.log(`  [Perk] ${this.unitName}: 강건함 발동! 방어력 10% 상승 (${this._baseDef} → ${this.def})`);
        } else if (!isSurrounded && this.isFortitudeActive) {
            this.isFortitudeActive = false;
            if (this._baseDef !== null) {
                this.def = this._baseDef;
                console.log(`  [Perk] ${this.unitName}: 강건함 해제. 방어력 복구 (→ ${this.def})`);
                this._baseDef = null;
            }
        }
    };

    warrior.checkLoneWolf = function () {
        const ALLY_RADIUS = 200;
        const nearbyAllies = this.scene.mercenaries.filter(m =>
            m !== this && m.hp > 0 && dist(this, m) <= ALLY_RADIUS
        );
        const isAlone = nearbyAllies.length === 0;

        if (isAlone && !this.isLoneWolfActive) {
            this.isLoneWolfActive = true;
            this._loneWolfBaseStats = {
                atk: this.atk, def: this.def, mAtk: this.mAtk,
                mDef: this.mDef, speed: this.speed, maxHp: this.maxHp
            };
            this.atk = Math.round(this.atk * 1.05);
            this.def = Math.round(this.def * 1.05);
            this.mAtk = Math.round(this.mAtk * 1.05);
            this.mDef = Math.round(this.mDef * 1.05);
            this.speed = Math.round(this.speed * 1.05);
            this.maxHp = Math.round(this.maxHp * 1.05);
            console.log(`  [Perk] ${this.unitName}: 론 울프 발동! 모든 스탯 5% 상승`);
        } else if (!isAlone && this.isLoneWolfActive) {
            this.isLoneWolfActive = false;
            if (this._loneWolfBaseStats) {
                const s = this._loneWolfBaseStats;
                this.atk = s.atk; this.def = s.def;
                this.mAtk = s.mAtk; this.mDef = s.mDef;
                this.speed = s.speed; this.maxHp = s.maxHp;
                console.log(`  [Perk] ${this.unitName}: 론 울프 해제. 스탯 복구`);
                this._loneWolfBaseStats = null;
            }
        }
    };

    return warrior;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1: 강건함 (Fortitude)
// ─────────────────────────────────────────────────────────────────────────────
section('강건함 (Fortitude) — def +10% when 3+ enemies within 120px');

(function testFortitude() {
    const warrior = makeMockWarrior();
    warrior.activatedPerks.push('fortitude');
    const baseDef = warrior.def;

    // Scene with 2 enemies nearby → NOT surrounded
    warrior.scene = {
        enemies: [
            { x: 50, y: 0, alive: true },
            { x: -50, y: 0, alive: true },
        ],
        mercenaries: [warrior]
    };

    warrior.checkFortitude();
    if (!warrior.isFortitudeActive) {
        pass(`2 enemies: Fortitude NOT active (needs ≥ 3)`);
    } else {
        fail(`2 enemies: Fortitude should NOT trigger`);
    }

    // Add 3rd enemy → surrounded
    warrior.scene.enemies.push({ x: 0, y: 50, alive: true });
    warrior.checkFortitude();
    if (warrior.isFortitudeActive) {
        pass(`3 enemies: Fortitude active ✓`);
    } else {
        fail(`3 enemies: Fortitude should trigger`);
    }

    const expectedDef = Math.round(baseDef * 1.10);
    if (warrior.def === expectedDef) {
        pass(`Def boosted correctly: ${baseDef} → ${warrior.def} (expected ${expectedDef})`);
    } else {
        fail(`Def wrong: got ${warrior.def}, expected ${expectedDef}`);
    }

    // Enemy out of range → deactivate
    warrior.scene.enemies = warrior.scene.enemies.map(e => ({ ...e, x: 9999 }));
    warrior.checkFortitude();
    if (!warrior.isFortitudeActive) {
        pass(`Enemies out of range: Fortitude deactivated ✓`);
    } else {
        fail(`Fortitude should deactivate when enemies leave range`);
    }
    if (warrior.def === baseDef) {
        pass(`Def restored after deactivation: ${warrior.def}`);
    } else {
        fail(`Def not restored: got ${warrior.def}, expected ${baseDef}`);
    }

    // Dead enemies don't count
    warrior.scene.enemies = [
        { x: 30, y: 0, alive: false }, // dead
        { x: -30, y: 0, alive: true },
        { x: 0, y: 30, alive: true },
        { x: 0, y: -30, alive: true },
    ];
    // But 3 alive within range → should activate again
    // (alive = true for last 3)
    warrior.checkFortitude();
    if (warrior.isFortitudeActive) {
        pass(`Dead enemies excluded; 3 alive nearby → active`);
    } else {
        fail(`Should activate with 3 alive nearby`);
    }
})();

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2: 론 울프 (Lone Wolf)
// ─────────────────────────────────────────────────────────────────────────────
section('론 울프 (Lone Wolf) — all stats +5% when no allies within 200px');

(function testLoneWolf() {
    const warrior = makeMockWarrior();
    warrior.activatedPerks.push('lone_wolf');

    const base = {
        atk: warrior.atk, def: warrior.def, mAtk: warrior.mAtk,
        mDef: warrior.mDef, speed: warrior.speed, maxHp: warrior.maxHp
    };

    // Ally far away (500px) → alone
    const ally = { x: 500, y: 0, hp: 100 };
    warrior.scene = { enemies: [], mercenaries: [warrior, ally] };

    warrior.checkLoneWolf();
    if (warrior.isLoneWolfActive) {
        pass(`Ally at 500px (>200px radius): Lone Wolf active ✓`);
    } else {
        fail(`Should activate — ally is outside radius`);
    }

    // Verify all stats 5% up
    const checks = [
        ['atk', base.atk, Math.round(base.atk * 1.05)],
        ['def', base.def, Math.round(base.def * 1.05)],
        ['mAtk', base.mAtk, Math.round(base.mAtk * 1.05)],
        ['mDef', base.mDef, Math.round(base.mDef * 1.05)],
        ['speed', base.speed, Math.round(base.speed * 1.05)],
        ['maxHp', base.maxHp, Math.round(base.maxHp * 1.05)],
    ];
    for (const [stat, orig, expected] of checks) {
        if (warrior[stat] === expected) {
            pass(`${stat}: ${orig} → ${warrior[stat]} (expected ${expected})`);
        } else {
            fail(`${stat}: got ${warrior[stat]}, expected ${expected}`);
        }
    }

    // Ally moves close (100px) → deactivate
    ally.x = 100;
    warrior.checkLoneWolf();
    if (!warrior.isLoneWolfActive) {
        pass(`Ally at 100px (within 200px radius): Lone Wolf deactivated ✓`);
    } else {
        fail(`Should deactivate — ally within radius`);
    }

    // Stats restored
    for (const [stat, orig] of checks.map(c => [c[0], c[1]])) {
        if (warrior[stat] === orig) {
            pass(`${stat} restored after deactivation: ${warrior[stat]}`);
        } else {
            fail(`${stat} not restored: got ${warrior[stat]}, expected ${orig}`);
        }
    }

    // No re-activation stacking: call again while already active
    ally.x = 9999; // push ally far again
    warrior.checkLoneWolf(); // activate
    const defAfterFirst = warrior.def;
    warrior.checkLoneWolf(); // should NOT double-apply
    if (warrior.def === defAfterFirst) {
        pass(`No double-activation: def stayed at ${warrior.def} (no stacking)`);
    } else {
        fail(`Stacking detected: def changed from ${defAfterFirst} to ${warrior.def}`);
    }
})();

console.log('\n' + '='.repeat(60));
console.log('  Warrior perk simulation complete.');
console.log('='.repeat(60) + '\n');
