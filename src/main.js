import Phaser from 'phaser'; // Import Phaser from npm

import BootScene from './scenes/BootScene.js';
import DungeonScene from './scenes/DungeonScene.js';
import TerritoryScene from './scenes/TerritoryScene.js';
import UIManager from './modules/UI/UIManager.js';
import logManager from './modules/UI/LogManager.js';
import globalBlackboard from './modules/Events/GlobalBlackboard.js';
import embeddingGemma from './modules/AI/EmbeddingGemma.js';
import intentRouter from './modules/AI/IntentRouter.js';

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game-container',
        width: '100%',
        height: '100%'
    },
    parent: 'game-container',
    backgroundColor: '#000000',
    scene: [BootScene, TerritoryScene, DungeonScene],
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
