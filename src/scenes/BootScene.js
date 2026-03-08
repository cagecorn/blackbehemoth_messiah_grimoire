import intentRouter from '../modules/AI/IntentRouter.js';
import embeddingGemma from '../modules/AI/EmbeddingGemma.js';
import localLLM from '../modules/AI/LocalLLM.js';
import EventBus from '../modules/Events/EventBus.js';

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
        this.load.svg('emoji_coin', 'assets/emojis/1fa99.svg', { width: 64, height: 64 });
        this.load.svg('emoji_gem', 'assets/emojis/1f48e.svg', { width: 64, height: 64 });
        this.load.svg('emoji_diamond', 'assets/emojis/1f48e.svg', { width: 64, height: 64 });
        this.load.svg('emoji_meat', 'assets/emojis/1f356.svg', { width: 64, height: 64 });
        this.load.svg('emoji_wood', 'assets/emojis/1fab5.svg', { width: 64, height: 64 });
        this.load.svg('emoji_bone', 'assets/emojis/1f9b4.svg');
        this.load.svg('emoji_clover', 'assets/emojis/2618.svg');
        this.load.svg('emoji_brick', 'assets/emojis/1f9f1.svg', { width: 64, height: 64 });
        this.load.svg('emoji_divine_essence', 'assets/emojis/2728.svg', { width: 64, height: 64 });
        this.load.svg('emoji_sparkle', 'assets/emojis/2728.svg', { width: 64, height: 64 });
        this.load.svg('emoji_herb', 'assets/emojis/1f33f.svg', { width: 64, height: 64 });
        this.load.svg('emoji_note', 'assets/emojis/1f3b5.svg', { width: 64, height: 64 });
        this.load.svg('emoji_buff', 'assets/emojis/1f4aa.svg', { width: 64, height: 64 });
        this.load.svg('emoji_fire', 'assets/emojis/1f525.svg', { width: 64, height: 64 });
        this.load.svg('emoji_lightning', 'assets/emojis/26a1.svg', { width: 64, height: 64 });
        this.load.svg('emoji_bomb', 'assets/emojis/1f4a3.svg', { width: 64, height: 64 });
        this.load.svg('emoji_blood_drop', 'assets/emojis/1fa78.svg', { width: 64, height: 64 });
        this.load.svg('emoji_sparkles', 'assets/emojis/2728.svg', { width: 64, height: 64 });
        this.load.svg('emoji_megaphone', 'assets/emojis/1f4e3.svg', { width: 64, height: 64 });
        this.load.svg('emoji_star', 'assets/emojis/2b50.svg', { width: 64, height: 64 });
        this.load.svg('emoji_wind', 'assets/emojis/1f4a8.svg', { width: 64, height: 64 });
        this.load.svg('emoji_sleep', 'assets/emojis/1f4a4.svg', { width: 64, height: 64 });
        this.load.svg('emoji_plane', 'assets/emojis/2708.svg', { width: 128, height: 128 });
        this.load.svg('emoji_cloud', 'assets/emojis/2601.svg', { width: 128, height: 128 });
        this.load.svg('emoji_smoke', 'assets/emojis/1f4ad.svg', { width: 64, height: 64 });
        this.load.svg('emoji_sweat', 'assets/emojis/1f4a6.svg', { width: 64, height: 64 });
        this.load.svg('emoji_cry', 'assets/emojis/1f62d.svg', { width: 64, height: 64 });
        this.load.svg('emoji_heart', 'assets/emojis/2764.svg', { width: 64, height: 64 });
        this.load.svg('emoji_snowball', 'assets/emojis/2744.svg', { width: 64, height: 64 });
        this.load.svg('emoji_snowman', 'assets/emojis/26c4.svg', { width: 64, height: 64 });
        this.load.svg('emoji_snowcloud', 'assets/emojis/1f328.svg', { width: 128, height: 128 });
        this.load.svg('emoji_burger', 'assets/emojis/1f354.svg', { width: 64, height: 64 });
        this.load.svg('emoji_fireworks', 'assets/emojis/1f386.svg', { width: 64, height: 64 });
        this.load.svg('emoji_sparkler', 'assets/emojis/1f387.svg', { width: 64, height: 64 });
        this.load.svg('emoji_koinobori', 'assets/emojis/1f38f.svg', { width: 64, height: 64 });
        this.load.svg('emoji_ticket', 'assets/emojis/1f3ab.svg', { width: 64, height: 64 }); // 🎫

        // Tactical Node Charms Emojis
        this.load.svg('emoji_smiling_face_with_sunglasses', 'assets/emojis/1f60e.svg', { width: 64, height: 64 }); // 😎

        // Class Charms (Chapter C)
        this.load.svg('emoji_running_shoe', 'assets/emojis/1f45f.svg', { width: 64, height: 64 }); // 🏃
        this.load.svg('emoji_bullseye', 'assets/emojis/1f3af.svg', { width: 64, height: 64 });    // 🎯
        this.load.svg('emoji_shoe', 'assets/emojis/1f45e.svg', { width: 64, height: 64 });        // 👞
        this.load.svg('emoji_shield', 'assets/emojis/1f6e1.svg', { width: 64, height: 64 });      // 🛡️
        this.load.svg('emoji_wolf', 'assets/emojis/1f43a.svg', { width: 64, height: 64 });        // 🐺
        this.load.svg('emoji_pill', 'assets/emojis/1f48a.svg', { width: 64, height: 64 });        // 💊
        this.load.svg('emoji_bubbles', 'assets/emojis/1fae7.svg', { width: 64, height: 64 });     // 🫧
        this.load.svg('emoji_milky_way', 'assets/emojis/1f30c.svg', { width: 64, height: 64 });   // 🌌
        this.load.svg('emoji_cyclone', 'assets/emojis/1f300.svg', { width: 64, height: 64 });     // 🌀
        this.load.svg('emoji_musical_note', 'assets/emojis/1f3b6.svg', { width: 64, height: 64 }); // 🎶
        this.load.svg('emoji_candle', 'assets/emojis/1f56f.svg', { width: 64, height: 64 });

        this.load.on('loaderror', (file) => {
            console.error(`[BootScene] Error loading asset: ${file.key} from ${file.src}`);
        });

        // Noah's Animals
        this.load.svg('emoji_dog', 'assets/emojis/1f415.svg', { width: 64, height: 64 });
        this.load.svg('emoji_cat', 'assets/emojis/1f408.svg', { width: 64, height: 64 });
        this.load.svg('emoji_horse', 'assets/emojis/1f40e.svg', { width: 64, height: 64 });
        this.load.svg('emoji_pig', 'assets/emojis/1f416.svg', { width: 64, height: 64 });
        this.load.svg('emoji_tiger', 'assets/emojis/1f405.svg', { width: 64, height: 64 });
        this.load.svg('emoji_bison', 'assets/emojis/1f9ac.svg', { width: 64, height: 64 });
        this.load.svg('emoji_sheep', 'assets/emojis/1f411.svg', { width: 64, height: 64 });

        // Noel's Plants
        this.load.svg('emoji_kiwi', 'assets/emojis/1f95d.svg', { width: 64, height: 64 });
        this.load.svg('emoji_grapes', 'assets/emojis/1f347.svg', { width: 64, height: 64 });
        this.load.svg('emoji_watermelon', 'assets/emojis/1f349.svg', { width: 64, height: 64 });
        this.load.svg('emoji_pineapple', 'assets/emojis/1f34d.svg', { width: 64, height: 64 });
        this.load.svg('emoji_banana', 'assets/emojis/1f34c.svg', { width: 64, height: 64 });
        this.load.svg('emoji_strawberry', 'assets/emojis/1f353.svg', { width: 64, height: 64 });

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
        this.load.image('silvi_cutscene', 'assets/characters/party/silvi_cutscene.png');
        this.load.image('nickle_sprite', 'assets/characters/party/nickle_sprite.png');
        this.load.image('leona_sprite', 'assets/characters/party/leona_sprite.png');
        this.load.image('leona_cutscene', 'assets/characters/party/leona_cutscene.png');
        this.load.image('ella_cutscene', 'assets/characters/party/ella_cutscene.png');
        this.load.image('king_sprite', 'assets/characters/party/king_sprite.png');
        this.load.image('king_cutscene', 'assets/characters/party/king_cutscene.png');
        this.load.image('boon_sprite', 'assets/characters/party/boon_sprite.png');
        this.load.image('boon_cutscene', 'assets/characters/party/boon_cutscene.png');
        this.load.image('goblin_boss_sprite', 'assets/characters/enemies/goblin_cutscene.png');
        this.load.image('crocodile_warrior_sprite', 'assets/characters/enemies/crocodile_warrior_sprite.png');
        this.load.image('crocodile_archer_sprite', 'assets/characters/enemies/crocodile_archer_sprite.png');
        this.load.image('crocodile_healer_sprite', 'assets/characters/enemies/crocodile_healer_sprite.png');

        // Lava Field: Fire Spirits
        this.load.image('fire_spirit_warrior_sprite', 'assets/characters/enemies/fire_spirit_warrior_sprite.png');
        this.load.image('fire_spirit_archer_sprite', 'assets/characters/enemies/fire_spirit_archer_sprite.png');
        this.load.image('fire_spirit_wizard_sprite', 'assets/characters/enemies/fire_spirit_wizard_sprite.png');
        this.load.image('goblin_sprite', 'assets/characters/enemies/goblin_sprite.png');
        this.load.image('orc_sprite', 'assets/characters/enemies/orc_sprite.png');
        this.load.image('skeleton_warrior_sprite', 'assets/characters/enemies/skeleton_warrior_sprite.png');
        this.load.image('skeleton_wizard_sprite', 'assets/characters/enemies/skeleton_wizard_sprite.png');
        this.load.image('guadian_angel_sprite', 'assets/characters/party/guadian_angel_sprite.png');
        this.load.image('siren_sprite', 'assets/characters/party/siren_sprite.png');
        this.load.image('lute_cutscene', 'assets/characters/party/lute_cutscene.png');
        this.load.image('bao_sprite', 'assets/characters/party/bao_sprite.png');
        this.load.image('bao_cutscene', 'assets/characters/party/bao_cutscene.png');
        this.load.image('babao_sprite', 'assets/characters/party/babao_sprite.png');
        this.load.image('nana_sprite', 'assets/characters/party/nana_sprite.png');
        this.load.image('nana_cutscene', 'assets/characters/party/nana_cutscene.png');
        this.load.image('nana_ultimate_sprite', 'assets/characters/party/nana_ultimate_sprite.png');
        this.load.image('noah_sprite', 'assets/characters/party/noah_sprite.png');
        this.load.image('noah_cutscene', 'assets/characters/party/noah_cutscene.png');
        this.load.image('noel_sprite', 'assets/characters/party/noel_sprite.png');
        this.load.image('noel_cutscene', 'assets/characters/party/noel_cutscene.png');
        this.load.image('aina_sprite', 'assets/characters/party/aina_sprite.png');
        this.load.image('aina_cutscene', 'assets/characters/party/aina_cutscene.png');
        this.load.image('wrinkle_sprite', 'assets/characters/party/wrinkle_sprite.png');
        this.load.image('wrinkle_cutscene', 'assets/characters/party/wrinkle_cutscene.png');
        this.load.image('veve_sprite', 'assets/characters/party/veve_sprite.png');
        this.load.image('veve_cutscene', 'assets/characters/party/veve_cutscene.png');
        this.load.image('veve_ultimate_sprite', 'assets/characters/party/veve_ultimate_sprite.png');

        // Hired Mercenary Sprites
        this.load.image('hired_warrior_sprite', 'assets/npc/hired_warrior_sprite.png');
        this.load.image('hired_archer_sprite', 'assets/npc/hired_archer_sprite.png');

        // Pet Assets
        this.load.image('dog_pet', 'assets/pet/dog_pet.png');
        this.load.image('wolf_pet', 'assets/pet/wolf_pet.png');
        this.load.image('owl_pet', 'assets/pet/owl_pet.png');
        this.load.image('bow_turret_sprite', 'assets/structures/bow_turret_sprite.png');
        this.load.image('healing_turret_sprite', 'assets/structures/healing_turret_sprite.png');

        // Load effect sprites
        this.load.image('guillotine_paper', 'assets/effect/guillotine_paper.png');
        this.load.svg('emoji_rock', 'assets/emojis/1f5ff.svg', { width: 32, height: 32 });

        // Load Backgrounds
        this.load.image('bg_territory', 'assets/background/terretory_background.png');
        this.load.image('bg_gacha', 'assets/background/gacha_background.png');
        this.load.image('bg_cursed_forest', 'assets/background/battle-stage-cursed-forest.png');
        this.load.image('bg_swampland', 'assets/background/battle-stage-swampland.png');
        this.load.image('bg_lava_field', 'assets/background/battle-stage-lava-field.png');
        this.load.image('bg_raid', 'assets/background/battle_stage_raid.png');
        this.load.image('bg_undead_graveyard', 'assets/background/battle-stage-graveyard.png');
        this.load.image('bg_arena', 'assets/background/battle-stage-arena.png');

        // Load UI/Icon assets
        this.load.image('logo_icon', 'assets/icon/logo_icon.png');
        this.load.image('title_icon', 'assets/icon/title_icon.png');

        // Load BGM
        this.load.audio('main_battle_bgm_1', 'assets/BGM/main_battle_bgm_1.mp3');
        this.load.audio('main_battle_bgm_2', 'assets/BGM/main_battle_bgm_2.mp3');
        this.load.audio('main_battle_bgm_3', 'assets/BGM/main_battle_bgm_3.mp3');
        this.load.audio('territory_bgm', 'assets/BGM/terretory_bgm.mp3');
    }

    async create() {
        console.log('BootScene assets loaded. Transitioning to game world.');

        if (this.game.uiManager) {
            this.game.uiManager.scene = this;
        }

        // Apply sound settings
        const bgmVol = localStorage.getItem('bgmVolume');
        const bgmMuted = localStorage.getItem('bgmMuted');
        if (bgmVol !== null) this.sound.setVolume(parseFloat(bgmVol));
        if (bgmMuted !== null) this.sound.setMute(bgmMuted === 'true');

        // Initialize Global Cinematic Filters (Persistent across all scenes)
        this.setupFakeAestheticOverlays();

        // Initialize starter items if not present
        try {
            const DBManager = (await import('../modules/Database/DBManager.js')).default;
            const partyManager = (await import('../modules/Core/PartyManager.js')).default;
            const { Characters } = await import('../modules/Core/EntityStats.js');

            const existingDivinaEssence = await DBManager.getInventoryItem('emoji_divine_essence');
            if (!existingDivinaEssence) {
                console.log('[BootScene] Initializing starter ✨ x50');
                await DBManager.saveInventoryItem('emoji_divine_essence', 50);
            }

            // Demo Version: Give 2000 diamonds for starter
            const existingGem = await DBManager.getInventoryItem('emoji_gem');
            if (!existingGem) {
                console.log('[BootScene] Initializing demo starter 💎 x2000');
                await DBManager.saveInventoryItem('emoji_gem', 2000);
            }

            // --- Default Roster (New Players) ---
            const existingRoster = await DBManager.getMercenaryRoster();
            if (Object.keys(existingRoster).length === 0) {
                console.log('[BootScene] Initializing default roster: [Aren, Ella, Sera, Merlin, Lute, Silvi]');
                const defaultRoster = {
                    'aren': { '1': 1 },
                    'ella': { '1': 1 },
                    'sera': { '1': 1 },
                    'merlin': { '1': 1 },
                    'lute': { '1': 1 },
                    'silvi': { '1': 1 }
                };
                await DBManager.saveMercenaryRoster(defaultRoster);
            }

            // --- Default Active Party (New Players) ---
            const existingParty = await DBManager.getParty();
            if (!existingParty) {
                console.log('[BootScene] Initializing default active party');
                const defaultParty = ['aren', 'ella', 'sera', 'merlin', 'lute', 'silvi'];
                await DBManager.saveParty(defaultParty);
            }

            // --- Default Pet (New Players) ---
            const existingPets = await DBManager.get('settings', 'playerPets');
            if (!existingPets) {
                console.log('[BootScene] Initializing default pet: dog_pet');
                await DBManager.save('settings', 'playerPets', { pets: ['dog_pet'], activePet: 'dog_pet' });
            }

            // --- Re-sync Managers ---
            // Important: We need to tell PartyManager to reload its data from DB after we seeded it.
            await partyManager.init(Object.values(Characters));

            // --- UI Sync ---
            // Ensure UIManager HUD reflects the newly added starter items/diamonds immediately
            EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);
        } catch (e) {
            console.error('[BootScene] Failed to initialize starter items', e);
        }

        // Show UI Elements now that the game is ready
        setTimeout(() => {
            const sidebar = document.getElementById('sidebar-right');
            const chatContainer = document.getElementById('chat-container');
            if (sidebar) sidebar.classList.add('ready');
            if (chatContainer) chatContainer.classList.add('ready');
        }, 300);

        this.scene.start('TerritoryScene');
    }

    /**
     * Re-using our premium aesthetic system globally.
     * Appends the filter system to #game-container which persists across scene changes.
     */
    setupFakeAestheticOverlays() {
        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) return;

        // Cleanup if already present (to prevent duplicates during dev/reloads)
        const existing = gameContainer.querySelectorAll('.fake-filter-system');
        existing.forEach(el => el.remove());

        const wrapper = document.createElement('div');
        wrapper.className = 'fake-filter-system';

        // 1. Ambient Bloom Tint (Warm Golden Glow)
        const bloom = document.createElement('div');
        bloom.className = 'fake-bloom-tint';
        wrapper.appendChild(bloom);

        // 2. The Balanced "Screenshot 2" Chromatic Overlays
        wrapper.appendChild(this.createFilterLayer('cinematic-layer rgb-red-shift'));
        wrapper.appendChild(this.createFilterLayer('cinematic-layer rgb-blue-shift'));

        // 3. Deep Cinematic Vignette
        const vignette = document.createElement('div');
        vignette.className = 'fake-vignette-overlay';
        wrapper.appendChild(vignette);

        gameContainer.appendChild(wrapper);
        console.log('[Visuals] Global Cinematic Engine Active! 🎬🚀 (Screenshot 2 Aesthetic)');
    }

    createFilterLayer(className) {
        const div = document.createElement('div');
        div.className = className;
        return div;
    }

}
