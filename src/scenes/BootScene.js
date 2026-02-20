import Phaser from 'phaser';
import semanticRouter from '../modules/AI/SemanticRouter.js';
import embeddingGemma from '../modules/AI/EmbeddingGemma.js';
import localLLM from '../modules/AI/LocalLLM.js';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // ... (preexisting code)
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        this.loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading Assets...',
            style: { font: '20px monospace', fill: '#ffffff' }
        }).setOrigin(0.5);

        const percentText = this.make.text({
            x: width / 2,
            y: height / 2,
            text: '0%',
            style: { font: '18px monospace', fill: '#ffffff' }
        }).setOrigin(0.5);

        this.load.on('progress', (value) => {
            percentText.setText(parseInt(value * 100) + '%');
            progressBar.clear();
            progressBar.fillStyle(0xbb88ff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            percentText.destroy();
            this.loadingText.setText('Initializing AI Models...');
        });

        // Load common emoji assets (Twemoji SVGs)
        this.load.svg('emoji_coin', 'assets/emojis/1fa99.svg', { width: 32, height: 32 });
        this.load.svg('emoji_gem', 'assets/emojis/1f48e.svg', { width: 32, height: 32 });
        this.load.svg('emoji_meat', 'assets/emojis/1f356.svg', { width: 32, height: 32 });
        this.load.svg('emoji_wood', 'assets/emojis/1fab5.svg', { width: 32, height: 32 });
        this.load.svg('emoji_sparkle', 'assets/emojis/2728.svg', { width: 32, height: 32 });
        this.load.svg('emoji_herb', 'assets/emojis/1f33f.svg', { width: 32, height: 32 });

        // Load Character Sprites
        this.load.image('warrior_sprite', 'assets/characters/party/warrior_sprite.png');
        this.load.image('archer_sprite', 'assets/characters/party/archer_sprite.png');
        this.load.image('healer_sprite', 'assets/characters/party/healer_sprite.png');
        this.load.image('goblin_sprite', 'assets/characters/enemies/goblin_sprite.png');
    }

    create() {
        console.log('BootScene assets loaded. Waiting for AI...');
        localLLM.checkStatus(); // Start checking LM Studio
        this.checkAIReadiness();
    }

    async checkAIReadiness() {
        const check = async () => {
            const routerReady = semanticRouter.isReady;
            const gemmaReady = embeddingGemma.isReady;
            const llmReady = localLLM.isReady;

            let status = 'AI Status: ';
            status += routerReady ? 'Router OK | ' : 'Router... | ';
            status += gemmaReady ? 'Gemma OK | ' : 'Gemma... | ';
            status += llmReady ? 'LM Studio OK' : 'LM Studio...';

            this.loadingText.setText(status);

            if (routerReady && gemmaReady && llmReady) {
                console.log('All AI Systems Ready. Transitioning.');
                this.scene.start('TerritoryScene');
            } else {
                setTimeout(check, 800);
            }
        };
        check();
    }
}
