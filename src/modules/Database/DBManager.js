import { openDB } from 'idb';

const DB_NAME = 'IsacRPG_DB';
const DB_VERSION = 7;

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

                // --- DB Version 7 Migration ---
                // Mercenary Skins (Owned skins and equipped skin per character)
                if (!db.objectStoreNames.contains('mercenary_skins')) {
                    db.createObjectStore('mercenary_skins', { keyPath: 'charId' });
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
        return await this.save(storeName, id, data);
    }

    static async getSelectedDifficulty(dungeonId = 'GLOBAL') {
        let data = await this.get('settings', `selected_difficulty_${dungeonId}`);

        // --- Migration Fallback ---
        if (!data) {
            // 1. Try Global setting if per-dungeon is missing
            if (dungeonId !== 'GLOBAL') {
                data = await this.get('settings', 'selected_difficulty_GLOBAL');
            }
            // 2. Try legacy keys (un-suffixed or camelCase)
            if (!data) data = await this.get('settings', 'selected_difficulty');
            if (!data) data = await this.get('settings', 'selectedDifficulty');

            // Auto-migrate if found
            if (data && dungeonId !== 'GLOBAL') {
                await this.saveSelectedDifficulty(data.value, dungeonId);
            }
        }

        return data ? data.value : 'NORMAL';
    }

    static async saveSelectedDifficulty(value, dungeonId = 'GLOBAL') {
        await this.save('settings', `selected_difficulty_${dungeonId}`, { value });
        console.log(`[DBManager] Saved difficulty for ${dungeonId}: ${value}`);
    }

    // --- Dungeon Progress ---
    static async getBestRound(dungeonId, difficulty = 'NORMAL') {
        if (!this.db) await this.initDB();

        const compositeKey = `best_round_${dungeonId}_${difficulty}`;
        let data = await this.db.get('settings', compositeKey);

        // --- Migration Fallback for NORMAL difficulty ---
        if (!data && (difficulty === 'NORMAL' || difficulty === 'normal')) {
            const legacyKey = `best_round_${dungeonId}`;
            data = await this.db.get('settings', legacyKey);

            if (data) {
                console.log(`[DBManager] Migrating legacy record for ${dungeonId}: Round ${data.round}`);
                // Auto-migrate to new format
                await this.db.put('settings', { id: compositeKey, round: data.round });
            }
        }

        return data ? data.round : 0;
    }

    static async saveBestRound(dungeonId, round, difficulty = 'NORMAL') {
        if (!this.db) await this.initDB();
        const currentBest = await this.getBestRound(dungeonId, difficulty);
        if (round > currentBest) {
            const compositeKey = `best_round_${dungeonId}_${difficulty}`;
            await this.db.put('settings', { id: compositeKey, round });
            console.log(`[DBManager] New best round for ${dungeonId} (${difficulty}): ${round}`);
            return true;
        }
        return false;
    }

    // --- Achievements Persistence ---
    static async getClaimedAchievements() {
        if (!this.db) await this.initDB();
        const data = await this.db.get('settings', 'claimed_achievements');
        return data ? data.levels : {};
    }

    static async saveClaimedAchievements(levelsObj) {
        if (!this.db) await this.initDB();
        await this.db.put('settings', { id: 'claimed_achievements', levels: levelsObj });
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
            const roster = {};
            const keysToDelete = [];

            all.forEach(item => {
                const rawId = item.charId;
                const charId = rawId.toUpperCase();

                // If it's a lowercase key, mark for cleanup
                if (rawId !== charId) {
                    keysToDelete.push(rawId);
                }

                const stars = item.stars || {};
                let total = item.total || 0;

                // --- Legacy Data Support ---
                if (total === 0 && Object.keys(stars).length > 0) {
                    for (const [star, count] of Object.entries(stars)) {
                        const starLevel = parseInt(star);
                        total += count * Math.pow(3, starLevel - 1);
                    }
                }

                if (!roster[charId]) {
                    roster[charId] = { stars: {}, total: 0 };
                }

                // Merge stars and total if we encounter duplicates (e.g. 'lute' and 'LUTE')
                for (const [star, count] of Object.entries(stars)) {
                    roster[charId].stars[star] = (roster[charId].stars[star] || 0) + count;
                }
                roster[charId].total += total;
            });

            // Cleanup lowercase duplicates in DB
            if (keysToDelete.length > 0) {
                console.warn('[DBManager] Deleting duplicate lowercase roster keys:', keysToDelete);
                const tx = this.db.transaction('mercenary_roster', 'readwrite');
                for (const key of keysToDelete) {
                    tx.store.delete(key);
                }
                // Also ensure the merged uppercase version is saved back
                for (const key of keysToDelete) {
                    const normalized = key.toUpperCase();
                    tx.store.put({ charId: normalized, ...roster[normalized] });
                }
                await tx.done;
            }

            console.log('[DBManager] Mercenary Roster Loaded (Normalized \u0026 Merged):', JSON.parse(JSON.stringify(roster)));
            return roster;
        } catch (err) {
            console.error('[DBManager] getMercenaryRoster error', err);
            return {};
        }
    }

    static async saveMercenaryRoster(rosterObj) {
        if (!this.db) await this.initDB();
        console.log('[DBManager] Saving Mercenary Roster:', JSON.parse(JSON.stringify(rosterObj)));
        const tx = this.db.transaction('mercenary_roster', 'readwrite');
        for (const [charId, data] of Object.entries(rosterObj)) {
            const normalizedId = charId.toUpperCase();
            const stars = data.stars || data;
            const total = data.total || 0;
            console.log(`[DBManager] ROSTER_PUT: ${normalizedId}`, { stars, total });
            tx.store.put({ charId: normalizedId, stars, total });
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

    // --- Mercenary Skin Operations ---
    static async getMercenarySkinData(charId) {
        if (!this.db) await this.initDB();
        const ID = charId.toUpperCase();
        return await this.db.get('mercenary_skins', ID) || { charId: ID, ownedSkins: [], equippedSkin: null };
    }

    static async setEquippedSkin(charId, skinId) {
        if (!this.db) await this.initDB();
        const data = await this.getMercenarySkinData(charId);
        data.equippedSkin = skinId;
        await this.db.put('mercenary_skins', data);
        console.log(`[DBManager] ${charId} equipped skin: ${skinId}`);
    }

    static async buySkin(charId, skinId, cost) {
        if (!this.db) await this.initDB();

        // 1. Deduct cost
        const diamondData = await this.getInventoryItem('emoji_gem');
        const currentDiamonds = diamondData ? diamondData.amount : 0;
        if (currentDiamonds < cost) return { success: false, message: '다이아가 부족합니다.' };

        await this.saveInventoryItem('emoji_gem', currentDiamonds - cost);

        // 2. Add to owned skins
        const data = await this.getMercenarySkinData(charId);
        if (!data.ownedSkins.includes(skinId)) {
            data.ownedSkins.push(skinId);
        }
        await this.db.put('mercenary_skins', data);
        console.log(`[DBManager] ${charId} purchased skin: ${skinId}`);
        return { success: true };
    }

    // --- Monster Achievements ---
    static async recordMonsterKill(monsterId) {
        if (!this.db) await this.initDB();
        const ID = monsterId.toUpperCase();
        const data = await this.db.get('settings', 'monster_kills') || { id: 'monster_kills', counts: {} };
        const counts = data.counts || {};
        counts[ID] = (counts[ID] || 0) + 1;
        await this.db.put('settings', { id: 'monster_kills', counts });
    }

    static async getMonsterKills() {
        if (!this.db) await this.initDB();
        const data = await this.db.get('settings', 'monster_kills');
        return data ? data.counts : {};
    }

    static async getClaimedMonsterAchievements() {
        if (!this.db) await this.initDB();
        const data = await this.db.get('settings', 'claimed_monster_achievements');
        return data ? data.claims : {};
    }

    static async saveClaimedMonsterAchievements(claimsObj) {
        if (!this.db) await this.initDB();
        await this.db.put('settings', { id: 'claimed_monster_achievements', claims: claimsObj });
    }
}
