import Phaser from 'phaser';
import DBManager from '../Database/DBManager.js';
import globalEventBus from '../Events/EventBus.js';
import { GameConfig, PetStats, StageConfigs } from '../Core/EntityStats.js';

export default class LootManager {
    constructor(scene) {
        this.scene = scene;
        this.lootGroup = this.scene.physics.add.group();

        // Specific Emoji keys we preloaded in BootScene
        this.drops = ['emoji_coin', 'emoji_gem', 'emoji_meat', 'emoji_wood', 'emoji_herb'];
    }

    // Called when an enemy dies
    spawnLoot(x, y, monster = null) {
        const monsterId = monster?.config?.id || 'unknown';
        const level = monster?.level || 1;
        const isElite = monster?.isElite || false;
        const isShadow = monsterId.includes('_shadow_');

        console.log(`[LootManager] Spawning items for ${monsterId} (Lv.${level}, Elite: ${isElite}, Shadow: ${isShadow}) at (${x.toFixed(1)}, ${y.toFixed(1)})`);

        // Base 1-3 drops, Elite/Shadow get more
        let dropCount = Phaser.Math.Between(1, 3);
        if (isShadow) dropCount += 2;
        else if (isElite) dropCount += 1;

        // Pet Bonus: e.g. Dog Pet +5% drop rate
        const partyManager = this.scene.game?.partyManager;
        if (partyManager) {
            const activePetId = partyManager.getActivePet();
            const petKey = activePetId?.toUpperCase();
            const petData = PetStats[petKey];
            if (petData && petData.passive?.effect?.dropRateMod) {
                if (Math.random() < petData.passive.effect.dropRateMod) {
                    dropCount++;
                    console.log(`[LootManager] Pet Passive (${petData.name}): Extra drop granted!`);
                }
            }
        }

        const isSkeleton = monsterId && monsterId.includes('skeleton');
        const stageConfig = StageConfigs[this.scene.dungeonType] || StageConfigs.CURSED_FOREST;
        const dungeonMult = stageConfig.goldMultiplier || 1.0;

        for (let i = 0; i < dropCount; i++) {
            let randomDrop;

            // --- Item Selection Logic ---
            // Increased gem chance for higher ranks
            const gemWeight = isShadow ? 0.4 : (isElite ? 0.3 : 0.2);

            if (isSkeleton && Math.random() < 0.6) {
                randomDrop = 'emoji_bone';
            } else if (this.scene.dungeonType === 'CURSED_FOREST' && Math.random() < 0.02) {
                randomDrop = 'emoji_ticket';
            } else if (Math.random() < gemWeight) {
                randomDrop = 'emoji_gem';
            } else if ((isElite || isShadow) && Math.random() < 0.05) {
                // 5% chance for Divine Essence from Elites/Shadows
                randomDrop = 'emoji_divine_essence';
            } else {
                // Pick from remaining (coin, meat, wood, herb)
                const others = ['emoji_coin', 'emoji_meat', 'emoji_wood', 'emoji_herb'];
                randomDrop = Phaser.Utils.Array.GetRandom(others);
            }

            // --- RAID BOSS SPECIAL DROP: Divine Essence ---
            if (monsterId === 'boss_goblin' && i === 0) {
                randomDrop = 'emoji_divine_essence';
            }
            // ----------------------------------------------

            // Spawn the Sprite
            const item = this.lootGroup.create(x, y, randomDrop);
            item.setDisplaySize(32, 32);
            item.setOrigin(0.5, 0.5);
            item.emojiId = randomDrop;
            item.isCollected = false;
            item.amount = 1; // Default

            // --- Dynamic Quantity Calculation ---
            if (randomDrop === 'emoji_coin') {
                // Base: 10 gold, Level +10%, Rank x3/x5, Dungeon 100%
                const levelBonus = 1 + (level - 1) * 0.1;
                const rankBonus = isShadow ? 5 : (isElite ? 3 : 1);
                item.amount = Math.ceil(10 * levelBonus * rankBonus * dungeonMult);
                console.log(`[LootManager] 💰 Gold: ${item.amount} (Lv: ${levelBonus.toFixed(2)}x, Rank: ${rankBonus}x, Dungeon: ${dungeonMult}x)`);
            } else if (randomDrop === 'emoji_gem') {
                // Base: 1 gem, Level +1%, Rank x1.2/x1.5, Dungeon 30%
                const levelBonus = 1 + (level - 1) * 0.01;
                const rankBonus = isShadow ? 1.5 : (isElite ? 1.2 : 1);
                const dungeonBonus = 1 + (dungeonMult - 1) * 0.3;
                item.amount = Math.ceil(1 * levelBonus * rankBonus * dungeonBonus);
                console.log(`[LootManager] 💎 Gem: ${item.amount} (Lv: ${levelBonus.toFixed(2)}x, Rank: ${rankBonus}x, Dungeon: ${dungeonBonus.toFixed(2)}x)`);
            } else if (randomDrop === 'emoji_divine_essence') {
                // Divine Essence: Amount scales with level
                item.amount = Math.floor(level * 1.5) + 10;
                console.log(`[LootManager] ✨ Divine Essence: ${item.amount} (Level: ${level})`);
            } else {
                // Standard Items: Base 1, Level +2%, Rank x1.5/x2, Dungeon 50%
                const levelBonus = 1 + (level - 1) * 0.02;
                const rankBonus = isShadow ? 2.0 : (isElite ? 1.5 : 1);
                const dungeonBonus = 1 + (dungeonMult - 1) * 0.5;
                item.amount = Math.ceil(1 * levelBonus * rankBonus * dungeonBonus);
                console.log(`[LootManager] 📦 Item (${randomDrop}): ${item.amount} (Lv: ${levelBonus.toFixed(2)}x, Rank: ${rankBonus}x, Dungeon: ${dungeonBonus.toFixed(2)}x)`);
            }

            // Physics & Interactions
            item.setBounce(1);
            item.setCollideWorldBounds(true);
            item.canBeCollected = false;
            const lootConfig = GameConfig.LOOT;
            this.scene.time.delayedCall(lootConfig.COLLECT_DELAY, () => {
                if (item && item.active) item.canBeCollected = true;
            });

            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const speed = Phaser.Math.Between(lootConfig.SPAWN_VELOCITY_MIN, lootConfig.SPAWN_VELOCITY_MAX);
            item.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            item.setDrag(100, 100);

            item.setInteractive({ useHandCursor: true });
            const collectHandler = () => {
                if (item.canBeCollected && !item.isCollected) {
                    this.scene.tweens.add({
                        targets: item,
                        scale: 1.5,
                        duration: 80,
                        yoyo: true,
                        onComplete: () => this.collectLoot(null, item)
                    });
                }
            };
            item.on('pointerdown', collectHandler);
            item.on('pointerover', (pointer) => { if (pointer.isDown) collectHandler(); });
        }
    }

    // Called during collision or click
    async collectLoot(collector, item) {
        if (!item.canBeCollected || item.isCollected) return;
        item.isCollected = true;

        const emojiId = item.emojiId;
        const amount = item.amount || 1;
        console.log(`[Loot] Collected ${emojiId} x${amount}`);

        const emojiMap = {
            'emoji_coin': '🪙',
            'emoji_gem': '💎',
            'emoji_meat': '🍖',
            'emoji_wood': '🪵',
            'emoji_herb': '🌿',
            'emoji_bone': '🦴',
            'emoji_ticket': '🎫',
            'emoji_divine_essence': '✨'
        };
        const unicodeEmoji = emojiMap[emojiId] || '❓';

        const collectorId = collector ? (collector.className || 'warrior') : 'player';
        globalEventBus.emit(globalEventBus.EVENTS.ITEM_COLLECTED, {
            emoji: unicodeEmoji,
            collectorId: collectorId,
            amount: amount
        });

        // UI Floating Text
        const displayAmount = amount > 1 ? `+${amount}` : '+1';
        let textColor = '#0f0';
        if (emojiId === 'emoji_coin') textColor = '#ffcc00';
        else if (emojiId === 'emoji_gem') textColor = '#00ffff';

        const text = this.scene.add.text(item.x, item.y - 10, displayAmount, {
            fontSize: '28px',
            fill: textColor,
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 4,
            resolution: 2
        }).setOrigin(0.5).setScale(0.5);

        this.scene.tweens.add({
            targets: text,
            y: item.y - 40,
            alpha: 0,
            duration: 800,
            onComplete: () => text.destroy()
        });

        this.scene.tweens.add({
            targets: item,
            y: item.y - 20,
            alpha: 0,
            duration: 300,
            onComplete: () => item.destroy()
        });

        // Backend Save
        try {
            const existing = await DBManager.getInventoryItem(emojiId);
            const newTotal = (existing ? existing.amount : 0) + amount;
            await DBManager.saveInventoryItem(emojiId, newTotal);
            console.log(`[DB] Saved ${emojiId}: ${newTotal} (+${amount})`);
            globalEventBus.emit(globalEventBus.EVENTS.INVENTORY_UPDATED);
        } catch (e) {
            console.error('[DB] Failed to save loot:', e);
        }
    }
}
