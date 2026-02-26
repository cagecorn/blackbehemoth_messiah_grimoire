import Phaser from 'phaser'; // Import Phaser from npm

import BootScene from './scenes/BootScene.js';
import DungeonScene from './scenes/DungeonScene.js';
import TerritoryScene from './scenes/TerritoryScene.js';
import ArenaScene from './scenes/ArenaScene.js';
import RaidScene from './scenes/RaidScene.js';
import UIManager from './modules/UI/UIManager.js';
import logManager from './modules/UI/LogManager.js';
import globalBlackboard from './modules/Events/GlobalBlackboard.js';
import embeddingGemma from './modules/AI/EmbeddingGemma.js';
import intentRouter from './modules/AI/IntentRouter.js';
import partyManager from './modules/Core/PartyManager.js';
import { Characters } from './modules/Core/EntityStats.js';

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: 'game-container',
        width: 600,
        height: 1067
    },
    // High DPI Support
    resolution: window.devicePixelRatio,
    antialias: true,
    roundPixels: true,
    parent: 'game-container',
    backgroundColor: '#000000',
    scene: [BootScene, TerritoryScene, DungeonScene, ArenaScene, RaidScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    }
};

const game = new Phaser.Game(config);

// Boot up DOM UI Systems outside of Phaser's context
const uiManager = new UIManager();
uiManager.init();
logManager.init();

// Boot up Global Managers
globalBlackboard.init();
embeddingGemma.init();
intentRouter.init();
partyManager.init(Object.values(Characters));

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
