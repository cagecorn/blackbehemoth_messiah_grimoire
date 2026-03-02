import { openDB } from 'idb';

const DB_NAME = 'IsacRPG_DB';
const DB_VERSION = 2;

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
            upgrade(db) {
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
        await this.db.put(storeName, { id, ...data });
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
        // Create a copy without methods/circular refs if any
        const plainState = JSON.parse(JSON.stringify(state));
        await this.db.put('party', { id: `state_${id}`, ...plainState });
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
}
