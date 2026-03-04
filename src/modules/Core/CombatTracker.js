import EventBus from '../Events/EventBus.js';

/**
 * CombatTracker.js
 * Specialized module for real-time combat stats (DPS, Tanking, Healing).
 * Optimized for performance using a rolling window or accumulating totals.
 */
class CombatTracker {
    constructor() {
        this.stats = {}; // unitId -> { totalDamage, totalReceived, totalHeal, startTime, lastUpdateTime }
        this.isActive = false;
        this.updateInterval = 500; // ms
        this.timer = null;
        this.lastGlobalUpdateTime = 0;
    }

    init() {
        EventBus.on(EventBus.EVENTS.COMBAT_DATA_RECORD, this.recordData, this);
        EventBus.on(EventBus.EVENTS.PARTY_DEPLOYED, this.reset, this);
        console.log('[CombatTracker] Initialized');
    }

    start() {
        if (this.isActive) return;
        this.isActive = true;
        this.timer = setInterval(() => this.calculateAndPublish(), this.updateInterval);
        console.log('[CombatTracker] Tracker Started');
    }

    stop() {
        this.isActive = false;
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
    }

    reset() {
        this.stats = {};
        this.lastGlobalUpdateTime = Date.now();
        console.log('[CombatTracker] Stats Reset');
    }

    recordData(payload) {
        const { type, amount, unitId } = payload;
        // console.log(`[CombatTracker] Received data: type=${type}, amount=${amount}, unitId=${unitId}`);
        if (!unitId) return;

        const now = Date.now();
        if (now - this.lastGlobalUpdateTime > 5000) {
            console.log('[CombatTracker] Out of combat detected (>5s gap). Resetting stats for new session.');
            this.stats = {};
        }
        this.lastGlobalUpdateTime = now;

        if (!this.stats[unitId]) {
            this.stats[unitId] = {
                totalDamage: 0,
                totalReceived: 0,
                totalHeal: 0,
                startTime: now,
                lastUpdateTime: now
            };
        }

        const s = this.stats[unitId];

        if (type === 'damage') s.totalDamage += amount;
        else if (type === 'received') s.totalReceived += amount;
        else if (type === 'heal') s.totalHeal += amount;

        // Auto-start on first data if not active
        if (!this.isActive && (type === 'damage' || type === 'received' || type === 'heal')) {
            console.log('[CombatTracker] Auto-starting tracker');
            this.start();
        }
    }

    calculateAndPublish() {
        const now = Date.now();
        const results = {};
        const unitIds = Object.keys(this.stats);
        if (unitIds.length === 0) return;

        // 1. Calculate DPS/HPS/TPS for each unit
        unitIds.forEach(id => {
            const s = this.stats[id];
            const durationSec = Math.max(1, (now - s.startTime) / 1000);

            results[id] = {
                dps: s.totalDamage / durationSec,
                tps: s.totalReceived / durationSec, // Tanking Per Second
                hps: s.totalHeal / durationSec,
                totalDamage: s.totalDamage,
                totalReceived: s.totalReceived,
                totalHeal: s.totalHeal
            };
        });

        // 2. Calculate Ranks (1-6)
        const categories = ['dps', 'tps', 'hps'];
        categories.forEach(cat => {
            const sorted = [...unitIds].sort((a, b) => results[b][cat] - results[a][cat]);
            sorted.forEach((id, index) => {
                results[id][`${cat}Rank`] = index + 1;
            });
        });

        // 3. Emit update
        EventBus.emit(EventBus.EVENTS.COMBAT_TRACKER_UPDATE, results);
    }
}

const combatTracker = new CombatTracker();
export default combatTracker;
