/**
 * test_dungeon_tickets.js
 * Headless test to verify dungeon ticket check and auto-switch logic.
 */

// Mock DBManager
const DBManager = {
    inventory: {
        'emoji_ticket': { amount: 0 }
    },
    getInventoryItem: async function (id) {
        return this.inventory[id] || null;
    }
};

// Mock EventBus
const EventBus = {
    emit: (event, payload) => console.log(`[EventBus] Emit: ${event}`, payload),
    EVENTS: {
        INVENTORY_UPDATED: 'INVENTORY_UPDATED',
        SYSTEM_MESSAGE: 'SYSTEM_MESSAGE'
    }
};

// Mock Scene
class MockDungeonScene {
    constructor(dungeonType = 'UNDEAD_GRAVEYARD') {
        this.dungeonType = dungeonType;
        this.currentRound = 1;
        this.game = {
            uiManager: {
                showToast: (msg) => console.log(`[UI] Toast: ${msg}`)
            }
        };
        this.scene = {
            start: (key, data) => {
                this.startedScene = key;
                this.startedData = data;
                console.log(`[Scene] Starting: ${key}`, data);
            },
            restart: (data) => {
                this.restarted = true;
                this.restartedData = data;
                console.log(`[Scene] Restarting with:`, data);
            }
        };
    }

    async initDungeon() {
        console.log(`\n--- Initializing Dungeon: ${this.dungeonType} (Round: ${this.currentRound}) ---`);
        if (this.dungeonType === 'UNDEAD_GRAVEYARD' && this.currentRound === 1) {
            const ticket = await DBManager.getInventoryItem('emoji_ticket');
            if (!ticket || ticket.amount <= 0) {
                console.log("[Logic] No tickets found. Switching to CURSED_FOREST.");
                if (this.game.uiManager) this.game.uiManager.showToast('입장권이 소진되어 [저주받은 숲]으로 이동합니다! 🎫');
                this.scene.start('DungeonScene', { dungeonType: 'CURSED_FOREST', startRound: 1 });
                return false;
            }
            console.log("[Logic] Ticket found. Proceeding.");
            return true;
        }
        return true;
    }

    // Simplified loop restart logic
    async handlePartyWipeout() {
        console.log(`\n--- Party Wipeout in: ${this.dungeonType} ---`);
        if (this.dungeonType === 'UNDEAD_GRAVEYARD') {
            const ticket = await DBManager.getInventoryItem('emoji_ticket');
            if (!ticket || ticket.amount <= 0) {
                console.log("[Logic] No tickets for restart. Switching to CURSED_FOREST.");
                if (this.game.uiManager) this.game.uiManager.showToast('입장권 소진으로 [저주받은 숲]으로 복귀합니다.');
                this.scene.start('DungeonScene', { dungeonType: 'CURSED_FOREST', startRound: 1 });
            } else {
                console.log("[Logic] Ticket found for restart. Restarting.");
                this.scene.restart({ dungeonType: this.dungeonType, startRound: 1 });
            }
        } else {
            this.scene.restart();
        }
    }
}

async function runTests() {
    console.log("Starting Dungeon Ticket & Auto-Switch Tests...");

    // Test 1: Entry with 0 tickets
    DBManager.inventory['emoji_ticket'].amount = 0;
    const entryTest1 = new MockDungeonScene('UNDEAD_GRAVEYARD');
    await entryTest1.initDungeon();
    if (entryTest1.startedScene === 'DungeonScene' && entryTest1.startedData.dungeonType === 'CURSED_FOREST') {
        console.log("✅ Test 1 Passed: Correctly switched to CURSED_FOREST on entry with 0 tickets.");
    } else {
        console.error("❌ Test 1 Failed: Did not switch correctly on entry.");
    }

    // Test 2: Entry with 1 ticket
    DBManager.inventory['emoji_ticket'].amount = 1;
    const entryTest2 = new MockDungeonScene('UNDEAD_GRAVEYARD');
    const allowed = await entryTest2.initDungeon();
    if (allowed && !entryTest2.startedScene) {
        console.log("✅ Test 2 Passed: Correctly allowed entry with 1 ticket.");
    } else {
        console.error("❌ Test 2 Failed: Blocked entry despite having a ticket.");
    }

    // Test 3: Wipeout with 0 tickets (Loop Switch)
    DBManager.inventory['emoji_ticket'].amount = 0;
    const loopTest1 = new MockDungeonScene('UNDEAD_GRAVEYARD');
    await loopTest1.handlePartyWipeout();
    if (loopTest1.startedScene === 'DungeonScene' && loopTest1.startedData.dungeonType === 'CURSED_FOREST') {
        console.log("✅ Test 3 Passed: Correctly switched to CURSED_FOREST on wipeout with 0 tickets.");
    } else {
        console.error("❌ Test 3 Failed: Did not switch correctly on loop.");
    }

    // Test 4: Wipeout with 1 ticket (Loop Restart)
    DBManager.inventory['emoji_ticket'].amount = 1;
    const loopTest2 = new MockDungeonScene('UNDEAD_GRAVEYARD');
    await loopTest2.handlePartyWipeout();
    if (loopTest2.restarted && loopTest2.restartedData.dungeonType === 'UNDEAD_GRAVEYARD') {
        console.log("✅ Test 4 Passed: Correctly restarted UNDEAD_GRAVEYARD with 1 ticket.");
    } else {
        console.error("❌ Test 4 Failed: Error in loop restart logic.");
    }

    // Test 5: Nun NPC Restart (Should NOT consume ticket if Round > 1)
    console.log("\nTesting Nun NPC Restart (Round 5)...");
    DBManager.inventory['emoji_ticket'].amount = 0;
    const nunTest = new MockDungeonScene('UNDEAD_GRAVEYARD');
    nunTest.currentRound = 5;
    // We simulate the Nun's restart call
    const nunAllowed = await nunTest.initDungeon();
    if (nunAllowed) {
        console.log("⚠️ Potential Bypass Bug: Nun restart (R5) allowed despite 0 tickets. (Wait, is it supposed to check?)");
    } else {
        console.log("⚠️ Nun Restart Blocked: Current logic blocks Nun if 0 tickets. This is a UX bug.");
    }
}

runTests();
