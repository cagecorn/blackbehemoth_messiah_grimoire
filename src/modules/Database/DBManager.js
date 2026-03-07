import { openDB } from 'idb';

const DB_NAME = 'IsacRPG_DB';
const DB_VERSION = 6;

export default class DBManager {
    static async initDB() {
        if (this.db) {
            try {
                this.db.close();
            } catch (e) {
                // ignore close errors
            }
            this.db = null;
        }
        this.db = await openDB(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion) {
                // Emojis mapping (ID -> Amount)
                if (!db.objectStoreNames.contains('inventory')) {
                    db.createObjectStore('inventory', { keyPath: 'id' });
                }
                // Party stats and progress
                if (!db.objectStoreNames.contains('party')) {
                    db.createObjectStore('party', { keyPath: 'id' });
                }
                // Global game settings
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'id' });
                }
                // Mercenary roster for Gacha System
                if (!db.objectStoreNames.contains('mercenary_roster')) {
                    db.createObjectStore('mercenary_roster', { keyPath: 'charId' });
                }
                // Unique Equipment Instances (LV, EXP tracking)
                if (!db.objectStoreNames.contains('equipment_instances')) {
                    db.createObjectStore('equipment_instances', { keyPath: 'id' });
                }
                // Unique Defense Structure Instances
                if (!db.objectStoreNames.contains('structure_instances')) {
                    db.createObjectStore('structure_instances', { keyPath: 'id' });
                }

                // --- DB Version 6 Migration ---
                if (oldVersion < 6 && db.objectStoreNames.contains('charm_instances')) {
                    db.deleteObjectStore('charm_instances'); // Recreate with correct keyPath
                }

                // Unique Charm Instances (Randomized values)
                if (!db.objectStoreNames.contains('charm_instances')) {
                    db.createObjectStore('charm_instances', { keyPath: 'instanceId' });
                }
            },
        });
        console.log(`IndexedDB '${DB_NAME}' Initialized`);
    }

    // --- Inventory Operations ---
    static async getInventoryItem(emojiId) {
        if (!this.db) await this.initDB();
        try {
            return await this.db.get('inventory', emojiId);
        } catch (err) {
            await this.initDB();
            return await this.db.get('inventory', emojiId);
        }
    }

    static async saveInventoryItem(emojiId, amount) {
        if (!this.db) await this.initDB();
        try {
            await this.db.put('inventory', { id: emojiId, amount });
        } catch (err) {
            await this.initDB();
            await this.db.put('inventory', { id: emojiId, amount });
        }
    }

    static async deleteInventoryItem(emojiId) {
        if (!this.db) await this.initDB();
        await this.db.delete('inventory', emojiId);
    }

    static async getAllInventory() {
        if (!this.db) await this.initDB();
        try {
            return await this.db.getAll('inventory');
        } catch (err) {
            console.warn('[DBManager] DB access error. Reconnecting...', err);
            await this.initDB();
            return await this.db.getAll('inventory');
        }
    }

    // --- Generic Key/Value Operations (Settings/Party) ---
    static async get(storeName, key) {
        if (!this.db) await this.initDB();
        return await this.db.get(storeName, key);
    }

    static async save(storeName, id, data) {
        if (!this.db) await this.initDB();
        // Storage ID must come AFTER spread to avoid overwrite
        await this.db.put(storeName, { ...data, id });
    }

    static async set(storeName, id, data) {
        return this.save(storeName, id, data);
    }

    // --- Dungeon Progress ---
    static async getBestRound(dungeonId) {
        if (!this.db) await this.initDB();
        const data = await this.db.get('settings', `best_round_${dungeonId}`);
        return data ? data.round : 0;
    }

    static async saveBestRound(dungeonId, round) {
        if (!this.db) await this.initDB();
        const currentBest = await this.getBestRound(dungeonId);
        if (round > currentBest) {
            await this.db.put('settings', { id: `best_round_${dungeonId}`, round });
            console.log(`[DBManager] New best round for ${dungeonId}: ${round}`);
            return true;
        }
        return false;
    }

    // --- Party Persistence ---
    static async saveParty(activeParty) {
        if (!this.db) await this.initDB();
        await this.db.put('party', { id: 'activeParty', activeParty });
    }

    static async getParty() {
        if (!this.db) await this.initDB();
        const data = await this.db.get('party', 'activeParty');
        return data ? data.activeParty : null;
    }

    // --- Mercenary State Persistence ---
    static async saveMercenaryState(id, state) {
        if (!this.db) await this.initDB();
        // Create a copy without methods/circular refs
        const plainState = JSON.parse(JSON.stringify(state));
        // Important: Storage ID must come AFTER spread to avoid being overwritten by record.id
        await this.db.put('party', { ...plainState, id: `state_${id}` });
        console.log(`[DBManager] Saved mercenary state for ${id}:`, plainState);
    }

    static async getAllMercenaryStates() {
        if (!this.db) await this.initDB();
        const all = await this.db.getAll('party');
        const states = {};
        all.forEach(item => {
            if (item.id.startsWith('state_')) {
                const charId = item.id.replace('state_', '');
                states[charId] = { ...item };
                delete states[charId].id; // Remove the DB key
            }
        });
        return states;
    }

    // --- Equipment Instance Operations ---
    static async saveEquipmentInstance(instance) {
        if (!this.db) await this.initDB();
        await this.db.put('equipment_instances', instance);
    }

    static async getEquipmentInstance(id) {
        if (!this.db) await this.initDB();
        return await this.db.get('equipment_instances', id);
    }

    static async getAllEquipmentInstances() {
        if (!this.db) await this.initDB();
        return await this.db.getAll('equipment_instances');
    }

    static async deleteEquipmentInstance(id) {
        if (!this.db) await this.initDB();
        await this.db.delete('equipment_instances', id);
    }

    // --- Structure Instance Operations ---
    static async saveStructureInstance(instance) {
        if (!this.db) await this.initDB();
        await this.db.put('structure_instances', instance);
    }

    static async getStructureInstance(id) {
        if (!this.db) await this.initDB();
        return await this.db.get('structure_instances', id);
    }

    static async getAllStructureInstances() {
        if (!this.db) await this.initDB();
        return await this.db.getAll('structure_instances');
    }

    static async deleteStructureInstance(id) {
        if (!this.db) await this.initDB();
        await this.db.delete('structure_instances', id);
    }

    // --- Charm Instance Operations ---
    static async saveCharmInstance(instance) {
        if (!this.db) await this.initDB();
        await this.db.put('charm_instances', instance);
    }

    static async getCharmInstance(id) {
        if (!this.db) await this.initDB();
        return await this.db.get('charm_instances', id);
    }

    static async getAllCharmInstances() {
        if (!this.db) await this.initDB();
        return await this.db.getAll('charm_instances');
    }

    static async deleteCharmInstance(id) {
        if (!this.db) await this.initDB();
        await this.db.delete('charm_instances', id);
    }

    static async getStructuresByDungeon(dungeonId) {
        if (!this.db) await this.initDB();
        const all = await this.getAllStructureInstances();
        return all.filter(s => s.dungeonId === dungeonId);
    }

    // --- Mercenary Roster Operations ---
    static async getMercenaryRoster() {
        if (!this.db) await this.initDB();
        try {
            const all = await this.db.getAll('mercenary_roster');
            // Convert list to simple lookup Object: { "aren": {"1": 2, "2": 1}, "nickle": {"2": 1} }
            const roster = {};
            all.forEach(item => { roster[item.charId] = item.stars; });
            return roster;
        } catch (err) {
            console.error('[DBManager] getMercenaryRoster error', err);
            return {};
        }
    }

    static async saveMercenaryRoster(rosterObj) {
        if (!this.db) await this.initDB();
        const tx = this.db.transaction('mercenary_roster', 'readwrite');
        for (const [charId, stars] of Object.entries(rosterObj)) {
            tx.store.put({ charId, stars });
        }
        await tx.done;
    }

    // --- Hired NPC Persistence ---
    static async saveNPCState(state) {
        if (!this.db) await this.initDB();
        await this.db.put('settings', { id: 'hired_npc', state });
        console.log('[DBManager] saveNPCState - Data stored for "hired_npc":', JSON.stringify(state));
    }

    static async getNPCState() {
        if (!this.db) await this.initDB();
        const data = await this.db.get('settings', 'hired_npc');
        console.log('[DBManager] getNPCState - Raw record from "settings":', data);
        return data ? data.state : null;
    }
}
