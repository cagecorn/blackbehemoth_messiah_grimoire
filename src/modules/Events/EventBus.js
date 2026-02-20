import Phaser from 'phaser';

/**
 * A globally accessible Event Emitter.
 * Acts as the centralized communication hub for the entire game.
 */
class EventBus extends Phaser.Events.EventEmitter {
    constructor() {
        super();
        this.EVENTS = {
            ITEM_COLLECTED: 'ITEM_COLLECTED',
            MONSTER_KILLED: 'MONSTER_KILLED',
            SYSTEM_MESSAGE: 'SYSTEM_MESSAGE',
            AI_COMMAND: 'AI_COMMAND',
            AI_COMMAND_ARCHER: 'AI_COMMAND_ARCHER',
            AI_COMMAND_HEALER: 'AI_COMMAND_HEALER',
            AI_RESPONSE: 'AI_RESPONSE',
            UNIT_DIED: 'UNIT_DIED'
        };
    }
}

// Export a single instance to be shared across all modules
const globalEventBus = new EventBus();
export default globalEventBus;
