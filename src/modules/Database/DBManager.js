import { openDB } from 'idb';

const DB_NAME = 'IsacRPG_DB';
const DB_VERSION = 1;

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
}
