import Phaser from 'phaser'; // Import Phaser from npm
import DBManager from './modules/Database/DBManager.js';

import BootScene from './scenes/BootScene.js';
import DungeonScene from './scenes/DungeonScene.js';
import TerritoryScene from './scenes/TerritoryScene.js';
import ArenaScene from './scenes/ArenaScene.js';
import RaidScene from './scenes/RaidScene.js';
import GachaScene from './scenes/GachaScene.js';
import UIManager from './modules/UI/UIManager.js';
import logManager from './modules/UI/LogManager.js';
import globalBlackboard from './modules/Events/GlobalBlackboard.js';
import embeddingGemma from './modules/AI/EmbeddingGemma.js';
import intentRouter from './modules/AI/IntentRouter.js';
import partyManager from './modules/Core/PartyManager.js';
import { Characters } from './modules/Core/EntityStats.js';
import EventBus from './modules/Events/EventBus.js';


const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: 'game-container',
        width: 600,
        height: 1067
    },
    // Locked resolution for maximum stability and performance
    resolution: 1,
    antialias: true,
    roundPixels: true,
    render: { powerPreference: 'high-performance' },
    fps: {
        target: 60,
        forceSetTimeOut: false, // Use requestAnimationFrame for mobile efficiency
        panicMax: 10,           // To prevent spiral of death
        smoothStep: true        // Ensure consistent frame timing
    },
    parent: 'game-container',
    backgroundColor: '#000000',
    scene: [BootScene, TerritoryScene, DungeonScene, ArenaScene, RaidScene, GachaScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    }
};

// Boot up DOM UI Systems outside of Phaser's context
const uiManager = new UIManager();
const logManagerInstance = logManager; // renamed to instance to avoid confusion if needed, but keeping it simple

(async () => {
    uiManager.init();
    logManagerInstance.init();

    // Boot up Global Managers
    globalBlackboard.init();
    // embeddingGemma.init(); // Disabled as per user request
    // intentRouter.init();  // Disabled as per user request
    await partyManager.init(Object.values(Characters));

    // Start the game after managers are ready
    const game = new Phaser.Game(config);

    // Attach managers to game instance for scene access
    game.uiManager = uiManager;
    game.logManager = logManagerInstance;
    game.partyManager = partyManager;
    game.dbManager = DBManager; // If needed, but DBManager is static usually

    // --- Developer Debug Commands ---
    window.addDiamonds = async (amount = 99999) => {
        const existing = await DBManager.getInventoryItem('emoji_gem');
        const currentAmount = existing ? existing.amount : 0;
        const newAmount = currentAmount + amount;
        await DBManager.saveInventoryItem('emoji_gem', newAmount);

        // Notify systems to refresh UI
        EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED, { id: 'emoji_gem', amount: newAmount });
        console.log(`%c[Cheat] Added ${amount} diamonds. Total: ${newAmount}`, "color: #00ffcc; font-weight: bold;");
    };
})();


function preload() {
    // Load assets here
}

function create() {
    this.cameras.main.setBackgroundColor('#2d2d2d');
    this.add.text(540, 320, 'Phaser 3.90.0 Initialized', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
}

function update() {
    // Game loop
}
