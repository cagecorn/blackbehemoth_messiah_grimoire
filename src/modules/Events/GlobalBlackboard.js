import EventBus from './EventBus.js';

/**
 * The Global Blackboard acts as the game's short-term memory.
 * It listens to the EventBus and records major events in a fixed-size queue.
 */
class GlobalBlackboard {
    constructor() {
        this.memoryLimit = 50; // Keep track of the last 50 events
        this.eventsQueue = [];
    }

    init() {
        console.log('[Blackboard] Initialized and listening to EventBus.');

        // Subscribe to events
        EventBus.on(EventBus.EVENTS.ITEM_COLLECTED, this.handleItemCollected, this);
        EventBus.on(EventBus.EVENTS.MONSTER_KILLED, this.handleMonsterKilled, this);
        EventBus.on(EventBus.EVENTS.SYSTEM_MESSAGE, this.handleSystemMessage, this);
        EventBus.on(EventBus.EVENTS.UNIT_DIED, this.handleUnitDied, this);
    }

    addEvent(eventString) {
        this.eventsQueue.push(eventString);

        // Enforce FIFO limit
        if (this.eventsQueue.length > this.memoryLimit) {
            this.eventsQueue.shift();
        }

        console.log(`[Blackboard] Update: ${eventString}`);
    }

    handleItemCollected(payload) {
        const { emoji, collectorId } = payload;
        const name = (collectorId === 'archer') ? 'Archer' : 'Warrior';
        this.addEvent(`${name} collected: ${emoji}`);
    }

    handleMonsterKilled(payload) {
        const monsterId = payload.monsterId || payload;
        const monsterEmoji = (monsterId === 'goblin_sprite' || monsterId === 'monster') ? '👺' : '👾';
        this.addEvent(`A monster ${monsterEmoji} was killed.`);
    }

    handleSystemMessage(msg) {
        // Record significant system status updates
        this.addEvent(`System Report: ${msg}`);
    }

    handleUnitDied(unitName) {
        this.addEvent(`PARTY ALERT: ${unitName} died! 💀`);
    }

    getRecentEvents() {
        return [...this.eventsQueue];
    }

    destroy() {
        EventBus.off(EventBus.EVENTS.ITEM_COLLECTED, this.handleItemCollected, this);
        EventBus.off(EventBus.EVENTS.MONSTER_KILLED, this.handleMonsterKilled, this);
        EventBus.off(EventBus.EVENTS.SYSTEM_MESSAGE, this.handleSystemMessage, this);
        EventBus.off(EventBus.EVENTS.UNIT_DIED, this.handleUnitDied, this);
    }
}

// Export a single instance
const globalBlackboard = new GlobalBlackboard();
export default globalBlackboard;
