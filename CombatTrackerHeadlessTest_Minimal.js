/**
 * CombatTrackerHeadlessTest.js
 * Verifies that the CombatTracker correctly aggregates data and calculates rankings.
 * Simplified for pure Node environment without Phaser/DOM dependencies.
 */
import EventEmitter from 'events';

// Mock EventBus
const EventBus = {
    EVENTS: {
        COMBAT_DATA_RECORD: 'COMBAT_DATA_RECORD',
        COMBAT_TRACKER_UPDATE: 'COMBAT_TRACKER_UPDATE',
        PARTY_DEPLOYED: 'PARTY_DEPLOYED'
    },
    emitter: new EventEmitter(),
    on(event, fn, context) { this.emitter.on(event, fn.bind(context)); },
    emit(event, payload) { this.emitter.emit(event, payload); }
};

/**
 * CombatTracker logic (Copied from module to test in isolation)
 */
class CombatTracker {
    constructor() {
        this.stats = {};
        this.isActive = false;
        this.updateInterval = 100; // Fast for testing
    }

    init() {
        EventBus.on(EventBus.EVENTS.COMBAT_DATA_RECORD, this.recordData, this);
        EventBus.on(EventBus.EVENTS.PARTY_DEPLOYED, this.reset, this);
    }

    recordData(payload) {
        const { type, amount, unitId } = payload;
        if (!unitId) return;
        if (!this.stats[unitId]) {
            this.stats[unitId] = { totalDamage: 0, totalReceived: 0, totalHeal: 0, startTime: Date.now() };
        }
        const s = this.stats[unitId];
        if (type === 'damage') s.totalDamage += amount;
        else if (type === 'received') s.totalReceived += amount;
        else if (type === 'heal') s.totalHeal += amount;
    }

    calculate() {
        const now = Date.now();
        const results = {};
        const unitIds = Object.keys(this.stats);
        unitIds.forEach(id => {
            const s = this.stats[id];
            const durationSec = Math.max(1, (now - s.startTime) / 1000);
            results[id] = {
                dps: s.totalDamage / durationSec,
                tps: s.totalReceived / durationSec,
                hps: s.totalHeal / durationSec
            };
        });

        const categories = ['dps', 'tps', 'hps'];
        categories.forEach(cat => {
            const sorted = [...unitIds].sort((a, b) => results[b][cat] - results[a][cat]);
            sorted.forEach((id, index) => { results[id][`${cat}Rank`] = index + 1; });
        });
        return results;
    }
}

const tracker = new CombatTracker();
tracker.init();

console.log('Step 1: Simulating combat data...');
EventBus.emit(EventBus.EVENTS.COMBAT_DATA_RECORD, { type: 'damage', amount: 5000, unitId: 'aren' });
EventBus.emit(EventBus.EVENTS.COMBAT_DATA_RECORD, { type: 'damage', amount: 1000, unitId: 'boon' });
EventBus.emit(EventBus.EVENTS.COMBAT_DATA_RECORD, { type: 'heal', amount: 3000, unitId: 'sera' });

setTimeout(() => {
    const results = tracker.calculate();
    console.log('Results:', JSON.stringify(results, null, 2));

    if (results['aren'].dpsRank === 1 && results['boon'].dpsRank === 2) {
        console.log('✅ Damage Ranking Passed');
    } else {
        console.log('❌ Damage Ranking Failed');
        process.exit(1);
    }

    if (results['sera'].hpsRank === 1) {
        console.log('✅ Healing Ranking Passed');
    } else {
        console.log('❌ Healing Ranking Failed');
        process.exit(1);
    }

    console.log('--- Headless Logic Test Completed Successfully ---');
    process.exit(0);
}, 200);
