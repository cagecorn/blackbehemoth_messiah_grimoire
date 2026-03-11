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
            UNIT_DIED: 'UNIT_DIED',
            INVENTORY_UPDATED: 'INVENTORY_UPDATED',
            STATUS_UPDATED: 'STATUS_UPDATED',
            DEBUG_SWAP_CHARACTER: 'DEBUG_SWAP_CHARACTER',
            UNIT_BARK: 'UNIT_BARK',
            ULT_GAUGE_UPDATED: 'ULT_GAUGE_UPDATED',
            ULT_TOGGLE_AUTO: 'ULT_TOGGLE_AUTO',
            ULT_TRIGGER: 'ULT_TRIGGER',
            PARTY_DEPLOYED: 'PARTY_DEPLOYED',
            CAMERA_SHAKE: 'CAMERA_SHAKE',
            MERCENARY_RESURRECT: 'MERCENARY_RESURRECT',
            BATTERY_SAVER_TOGGLED: 'BATTERY_SAVER_TOGGLED',
            COMBAT_DATA_RECORD: 'COMBAT_DATA_RECORD', // { type: 'damage'|'received'|'heal', amount, unitId }
            COMBAT_TRACKER_UPDATE: 'COMBAT_TRACKER_UPDATE', // { unitId: { dps, hps, tps, dpsRank, ... } }
            SCENE_CHANGED: 'SCENE_CHANGED',
            EQUIP_REQUEST: 'EQUIP_REQUEST',
            LANGUAGE_CHANGED: 'LANGUAGE_CHANGED' // { language: 'KR' | 'EN' }
        };
    }
}

// Export a single instance to be shared across all modules
const globalEventBus = new EventBus();
export default globalEventBus;
