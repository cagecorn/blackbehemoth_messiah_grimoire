import intentRouter from '../modules/AI/IntentRouter.js';
import embeddingGemma from '../modules/AI/EmbeddingGemma.js';
import localLLM from '../modules/AI/LocalLLM.js';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const barWidth = 360;
        const barHeight = 12;
        const barX = width / 2 - barWidth / 2;
        const barY = height / 2 - barHeight / 2;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();

        // Modern translucent background box
        progressBox.fillStyle(0x0f0f1a, 0.85);
        progressBox.fillRoundedRect(barX - 20, barY - 50, barWidth + 40, barHeight + 80, 14);
        progressBox.lineStyle(1, 0xa78bfa, 0.2);
        progressBox.strokeRoundedRect(barX - 20, barY - 50, barWidth + 40, barHeight + 80, 14);

        this.loadingText = this.make.text({
            x: width / 2,
            y: barY - 28,
            text: 'Loading Assets...',
            style: {
                font: '16px Inter, sans-serif',
                fill: '#a78bfa',
                fontStyle: 'bold'
            }
        }).setOrigin(0.5);

        const percentText = this.make.text({
            x: width / 2,
            y: barY + barHeight + 18,
            text: '0%',
            style: {
                font: '13px Inter, sans-serif',
                fill: '#94a3b8'
            }
        }).setOrigin(0.5);

        this.load.on('progress', (value) => {
            percentText.setText(parseInt(value * 100) + '%');
            progressBar.clear();

            // Track background
            progressBar.fillStyle(0x1e1e3a, 1);
            progressBar.fillRoundedRect(barX, barY, barWidth, barHeight, barHeight / 2);

            // Progress fill (violet gradient feel)
            const fillWidth = barWidth * value;
            if (fillWidth > 0) {
                progressBar.fillStyle(0xa78bfa, 1);
                progressBar.fillRoundedRect(barX, barY, fillWidth, barHeight, barHeight / 2);

                // Highlight shine on top half
                progressBar.fillStyle(0xffffff, 0.15);
                progressBar.fillRoundedRect(barX + 2, barY + 1, Math.max(0, fillWidth - 4), barHeight / 2, barHeight / 2);
            }
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            percentText.destroy();
            this.loadingText.setText('Initializing AI Models...');
            this.loadingText.setColor('#38bdf8');
        });

        // Load common emoji assets (Twemoji SVGs)
        this.load.svg('emoji_coin', 'assets/emojis/1fa99.svg', { width: 32, height: 32 });
        this.load.svg('emoji_gem', 'assets/emojis/1f48e.svg', { width: 32, height: 32 });
        this.load.svg('emoji_meat', 'assets/emojis/1f356.svg', { width: 32, height: 32 });
        this.load.svg('emoji_wood', 'assets/emojis/1fab5.svg', { width: 32, height: 32 });
        this.load.svg('emoji_sparkle', 'assets/emojis/2728.svg', { width: 32, height: 32 });
        this.load.svg('emoji_herb', 'assets/emojis/1f33f.svg', { width: 32, height: 32 });
        this.load.svg('emoji_note', 'assets/emojis/1f3b5.svg', { width: 32, height: 32 });
        this.load.svg('emoji_buff', 'assets/emojis/1f4aa.svg', { width: 32, height: 32 });
        this.load.svg('emoji_fire', 'assets/emojis/1f525.svg', { width: 32, height: 32 });
        this.load.svg('emoji_lightning', 'assets/emojis/26a1.svg', { width: 32, height: 32 });
        this.load.svg('emoji_bomb', 'assets/emojis/1f4a3.svg', { width: 32, height: 32 });
        this.load.svg('emoji_blood_drop', 'assets/emojis/1fa78.svg', { width: 32, height: 32 });
        this.load.svg('emoji_sparkles', 'assets/emojis/2728.svg', { width: 32, height: 32 });
        this.load.svg('emoji_megaphone', 'assets/emojis/1f4e3.svg', { width: 32, height: 32 });
        this.load.svg('emoji_star', 'assets/emojis/2b50.svg', { width: 32, height: 32 });
        this.load.svg('emoji_wind', 'assets/emojis/1f4a8.svg', { width: 32, height: 32 });
        this.load.svg('emoji_sleep', 'assets/emojis/1f4a4.svg', { width: 32, height: 32 });

        // Load Character Sprites
        this.load.image('warrior_sprite', 'assets/characters/party/warrior_sprite.png');
        this.load.image('archer_sprite', 'assets/characters/party/archer_sprite.png');
        this.load.image('healer_sprite', 'assets/characters/party/healer_sprite.png');
        this.load.image('wizard_sprite', 'assets/characters/party/wizard_sprite.png');
        this.load.image('nickle_cutscene', 'assets/characters/party/nickle_cutscene.png');
        this.load.image('nickle_ultimate_sprite', 'assets/characters/party/nickle_ultimate_sprite.png');
        this.load.image('merlin_cutscene', 'assets/characters/party/merlin_cutscene.png');
        this.load.image('aren_cutscene', 'assets/characters/party/aren_cutscene.png');
        this.load.image('sera_cutscene', 'assets/characters/party/sera_cutscene.png');
        this.load.image('bard_sprite', 'assets/characters/party/bard_sprite.png');
        this.load.image('silvi_sprite', 'assets/characters/party/silvi_sprite.png');
        this.load.image('nickle_sprite', 'assets/characters/party/nickle_sprite.png');
        this.load.image('leona_sprite', 'assets/characters/party/leona_sprite.png');
        this.load.image('king_sprite', 'assets/characters/party/king_sprite.png');
        this.load.image('boon_sprite', 'assets/characters/party/boon_sprite.png');
        this.load.image('goblin_boss_sprite', 'assets/characters/enemies/goblin_cutscene.png');
        this.load.image('goblin_sprite', 'assets/characters/enemies/goblin_sprite.png');
        this.load.image('guadian_angel_sprite', 'assets/characters/party/guadian_angel_sprite.png');
        this.load.image('siren_sprite', 'assets/characters/party/siren_sprite.png');
        this.load.image('lute_cutscene', 'assets/characters/party/lute_cutscene.png');
        this.load.image('bao_sprite', 'assets/characters/party/bao_sprite.png');
        this.load.image('bao_cutscene', 'assets/characters/party/bao_cutscene.png');
        this.load.image('babao_sprite', 'assets/characters/party/babao_sprite.png');

        // Load effect emojis
        this.load.svg('emoji_rock', 'assets/emojis/1f5ff.svg', { width: 32, height: 32 });

        // Load Backgrounds
        this.load.image('bg_cursed_forest', 'assets/background/battle-stage-cursed-forest.png');
        this.load.image('bg_arena', 'assets/background/battle-stage-arena.png');
    }

    create() {
        console.log('BootScene assets loaded. Waiting for AI...');
        localLLM.checkStatus(); // Start checking LM Studio
        this.checkAIReadiness();
    }

    async checkAIReadiness() {
        const check = async () => {
            const intentReady = intentRouter.isReady;
            const gemmaReady = embeddingGemma.isReady;
            const llmReady = localLLM.isReady;

            let status = 'AI Status: ';
            status += intentReady ? 'Intent OK | ' : 'Intent... | ';
            status += gemmaReady ? 'Embedding OK | ' : 'Embedding... | ';
            status += llmReady ? 'LM Studio OK' : 'LM Studio...';

            this.loadingText.setText(status);

            if (intentReady && gemmaReady && llmReady) {
                console.log('All AI Systems Ready. Transitioning.');
                this.scene.start('TerritoryScene');
            } else {
                setTimeout(check, 800);
            }
        };
        check();
    }
}
