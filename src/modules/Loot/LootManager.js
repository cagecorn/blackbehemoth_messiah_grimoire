import Phaser from 'phaser';
import DBManager from '../Database/DBManager.js';
import globalEventBus from '../Events/EventBus.js';
import { GameConfig } from '../Core/EntityStats.js';

export default class LootManager {
    constructor(scene) {
        this.scene = scene;
        this.lootGroup = this.scene.physics.add.group();

        // Specific Emoji keys we preloaded in BootScene
        this.drops = ['emoji_coin', 'emoji_gem', 'emoji_meat', 'emoji_wood', 'emoji_herb'];
    }

    // Called when an enemy dies
    spawnLoot(x, y, monsterId = null) {
        console.log(`[LootManager] Spawning items for ${monsterId} at (${x.toFixed(1)}, ${y.toFixed(1)})`);
        // Randomly pick 1 to 3 items to drop
        const dropCount = Phaser.Math.Between(1, 3);

        const isSkeleton = monsterId && monsterId.includes('skeleton');

        for (let i = 0; i < dropCount; i++) {
            let randomDrop;

            // Skeleton specific logic: Increased chance for bones
            if (isSkeleton && Math.random() < 0.6) {
                randomDrop = 'emoji_bone';
            } else {
                randomDrop = Phaser.Utils.Array.GetRandom(this.drops);
            }

            // Spawn the Sprite
            const item = this.lootGroup.create(x, y, randomDrop);
            item.setDisplaySize(32, 32); // Set explicitly
            item.setOrigin(0.5, 0.5); // Ensure center is anchored
            item.emojiId = randomDrop;   // Store the id for the DB

            // Physics properties for a "pop" out effect
            item.setBounce(1);
            item.setCollideWorldBounds(true);

            // Add a short delay before it can be collected from GameConfig
            item.canBeCollected = false;
            const lootConfig = GameConfig.LOOT;
            this.scene.time.delayedCall(lootConfig.COLLECT_DELAY, () => {
                if (item && item.active) item.canBeCollected = true;
            });

            // Pop out random velocity
            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const speed = Phaser.Math.Between(lootConfig.SPAWN_VELOCITY_MIN, lootConfig.SPAWN_VELOCITY_MAX);
            item.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            item.setDrag(100, 100); // Slow down over time

            // Make interactive for "Clicker" feel
            item.setInteractive({ useHandCursor: true });
            item.on('pointerdown', () => {
                if (item.canBeCollected && !item.isCollected) {
                    // Visual feedback "Pop"
                    this.scene.tweens.add({
                        targets: item,
                        scale: 1.5,
                        duration: 80,
                        yoyo: true,
                        onComplete: () => {
                            this.collectLoot(null, item);
                        }
                    });
                }
            });

            // Touch-Drag Collection
            item.on('pointerover', (pointer) => {
                if (pointer.isDown && item.canBeCollected && !item.isCollected) {
                    this.scene.tweens.add({
                        targets: item,
                        scale: 1.5,
                        duration: 80,
                        yoyo: true,
                        onComplete: () => {
                            this.collectLoot(null, item);
                        }
                    });
                }
            });
        }
    }

    // Called during collision between a Unit (Warrior/Archer) and LootGroup
    async collectLoot(collector, item) {
        // Prevent instant collection right when spawning or double triggering
        if (!item.canBeCollected || item.isCollected) return;

        item.isCollected = true;

        const emojiId = item.emojiId;
        console.log(`[Loot] Picked up ${emojiId}`);

        // Helper to convert internal key to actual Unicode Emoji to save DB/AI tokens
        const emojiMap = {
            'emoji_coin': '🪙',
            'emoji_gem': '💎',
            'emoji_meat': '🍖',
            'emoji_wood': '🪵',
            'emoji_herb': '🌿',
            'emoji_bone': '🦴'
        };
        const unicodeEmoji = emojiMap[emojiId] || '❓';

        // Notify the Global Event Bus
        // Include who collected it for localized UI logs
        const collectorId = collector ? (collector.className || 'warrior') : 'player';
        globalEventBus.emit(globalEventBus.EVENTS.ITEM_COLLECTED, {
            emoji: unicodeEmoji,
            collectorId: collectorId
        });

        // High-Resolution crisp text rendering technique
        const text = this.scene.add.text(item.x, item.y - 10, '+1', {
            fontSize: '28px', // 2x of 14px
            fill: '#0f0',
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

        // Backend Save to IndexedDB
        try {
            const existing = await DBManager.getInventoryItem(emojiId);
            const newAmount = existing ? existing.amount + 1 : 1;
            await DBManager.saveInventoryItem(emojiId, newAmount);
            console.log(`[DB] Saved ${emojiId}: ${newAmount}`);
            globalEventBus.emit(globalEventBus.EVENTS.INVENTORY_UPDATED);
        } catch (e) {
            console.error('[DB] Failed to save loot:', e);
        }
    }
}
