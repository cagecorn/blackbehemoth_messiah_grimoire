/**
 * CombatTrackerHeadlessTest.js
 * Verifies that the CombatTracker correctly aggregates data and calculates rankings.
 */
import EventBus from './src/modules/Events/EventBus.js';
import combatTracker from './src/modules/Core/CombatTracker.js';

console.log('--- Combat Tracker Headless Test Starting ---');

combatTracker.init();

const units = ['unit_aren', 'unit_boon', 'unit_sera', 'unit_nickle', 'unit_lute', 'unit_silvi'];
const results = {};

// Subscribe to updates
EventBus.on(EventBus.EVENTS.COMBAT_TRACKER_UPDATE, (update) => {
    Object.assign(results, update);
});

// Start Tracker
combatTracker.start();

console.log('Step 1: Simulating initial combat data (Damage only)...');
EventBus.emit(EventBus.EVENTS.COMBAT_DATA_RECORD, { type: 'damage', amount: 1000, unitId: 'unit_aren' });
EventBus.emit(EventBus.EVENTS.COMBAT_DATA_RECORD, { type: 'damage', amount: 500, unitId: 'unit_boon' });

setTimeout(() => {
    console.log('Aren DPS:', Math.round(results['unit_aren']?.dps || 0));
    console.log('Boon DPS:', Math.round(results['unit_boon']?.dps || 0));
    console.log('Aren DPS Rank:', results['unit_aren']?.dpsRank);
    console.log('Boon DPS Rank:', results['unit_boon']?.dpsRank);

    console.log('\nStep 2: Simulating healing and receiving damage...');
    EventBus.emit(EventBus.EVENTS.COMBAT_DATA_RECORD, { type: 'heal', amount: 2000, unitId: 'unit_sera' });
    EventBus.emit(EventBus.EVENTS.COMBAT_DATA_RECORD, { type: 'received', amount: 800, unitId: 'unit_aren' });

    setTimeout(() => {
        console.log('Sera HPS:', Math.round(results['unit_sera']?.hps || 0));
        console.log('Aren TPS:', Math.round(results['unit_aren']?.tps || 0));
        console.log('Sera HPS Rank:', results['unit_sera']?.hpsRank);

        console.log('\nStep 3: Verifying relative rankings...');
        EventBus.emit(EventBus.EVENTS.COMBAT_DATA_RECORD, { type: 'damage', amount: 5000, unitId: 'unit_nickle' });

        setTimeout(() => {
            console.log('Nickle DPS:', Math.round(results['unit_nickle']?.dps || 0));
            console.log('Nickle DPS Rank (Should be 1):', results['unit_nickle']?.dpsRank);
            console.log('Aren DPS Rank (Should be 2):', results['unit_aren']?.dpsRank);

            combatTracker.stop();
            console.log('\n--- Combat Tracker Headless Test Completed ---');
            process.exit(0);
        }, 600);
    }, 600);
}, 600);
