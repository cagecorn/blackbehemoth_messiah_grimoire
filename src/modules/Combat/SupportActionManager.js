import EventBus from '../Events/EventBus.js';

export default class SupportActionManager {
    constructor(scene) {
        this.scene = scene;
        this.init();
    }

    init() {
        EventBus.on('BUILDING_ACTION_TRIGGERED', this.handleBuildingAction, this);
    }

    destroy() {
        EventBus.off('BUILDING_ACTION_TRIGGERED', this.handleBuildingAction, this);
    }

    handleBuildingAction(data) {
        // Ensure this manager only acts if the scene is active
        if (!this.scene || !this.scene.scene.isActive()) return;

        const { typeId, level, slotIndex } = data;

        switch (typeId) {
            case 'tree':
                this.executeTreeAction(level);
                break;
            case 'factory':
                this.executeFactoryAction(level);
                break;
            case 'bank':
                this.executeBankAction(level);
                break;
            case 'church':
                this.executeChurchAction(level);
                break;
            case 'camp':
                this.executeCampAction(level);
                break;
            case 'castle':
                this.executeCastleAction(level);
                break;
        }
    }

    executeTreeAction(level) {
        const scene = this.scene;

        // 1. Pick a random ally (mercenary or player)
        const allies = [];
        if (scene.mercenaries) {
            scene.mercenaries.getChildren().forEach(m => {
                if (m.active && m.hp > 0) allies.push(m);
            });
        }
        if (scene.player && scene.player.active && scene.player.hp > 0) {
            allies.push(scene.player);
        }

        if (allies.length === 0) return;
        const target = Phaser.Utils.Array.GetRandom(allies);

        // 2. Falling Fruit Logic (Phaser-based)
        const fruits = ['🍎', '🍊', '🍇', '🍒', '🍑', '🍐'];
        const emoji = Phaser.Utils.Array.GetRandom(fruits);

        // Create the fruit at the top of the camera view, above the target's x
        const startY = scene.cameras.main.worldView.y - 50;
        const startX = target.x + (Math.random() * 40 - 20);

        const fruitText = scene.add.text(startX, startY, emoji, { fontSize: '24px' })
            .setOrigin(0.5)
            .setDepth(2000);

        // 3. Animation: Fall to target
        scene.tweens.add({
            targets: fruitText,
            y: target.y - 20,
            x: target.x,
            duration: 1000,
            ease: 'Back.easeIn',
            onComplete: () => {
                fruitText.destroy();
                this.applyHeal(target, level);
            }
        });

        console.log(`[SupportAction] Tree building triggered healing fruit on ${target.config?.id || 'Player'}`);
    }

    executeFactoryAction(level) {
        const scene = this.scene;

        // 1. Pick a random enemy
        const enemies = [];
        if (scene.enemies) {
            scene.enemies.getChildren().forEach(e => {
                if (e.active && e.hp > 0) enemies.push(e);
            });
        }
        if (scene.boss && scene.boss.active && scene.boss.hp > 0) {
            enemies.push(scene.boss);
        }

        if (enemies.length === 0) return;
        const target = Phaser.Utils.Array.GetRandom(enemies);

        // 2. Rocket Projectile Logic
        const startY = scene.cameras.main.worldView.y - 100;
        const startX = target.x + (Math.random() * 200 - 100); // Varied starting horizontal offset

        const rocket = scene.add.text(startX, startY, '🚀', { fontSize: '28px' })
            .setOrigin(0.5)
            .setDepth(2000);

        // 3. Rotation: Calculate angle to target
        const angle = Phaser.Math.Angle.Between(startX, startY, target.x, target.y);
        // Rocket emoji (🚀) visually pointed top-right by default (~-45 deg)
        // Phaser 0 deg is right. 
        // We want the visual tip of the rocket to point towards 'angle'.
        // Tip is at -45 deg. To point tip at 'angle', we need rotation = angle + 45 deg offset.
        rocket.setRotation(angle + Math.PI / 4 + Math.PI / 2); // Adjustment for diagonal emoji

        // 4. Tween: Rocket flight
        scene.tweens.add({
            targets: rocket,
            x: target.x,
            y: target.y,
            duration: 800,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                rocket.destroy();
                this.applyDamage(target, level);
                this.showExplosion(target.x, target.y);
            }
        });

        console.log(`[SupportAction] Factory building launched rocket at ${target.config?.id || 'Enemy'}`);
    }

    applyHeal(target, level) {
        // Heal amount: 15 base + 5 per extra level
        const amount = 15 + (level - 1) * 5;

        if (target.heal) {
            target.heal(amount);
        } else if (target.hp !== undefined && target.maxHp !== undefined) {
            target.hp = Math.min(target.hp + amount, target.maxHp);
            if (this.scene.showFloatingText) {
                this.scene.showFloatingText(target.x, target.y - 20, `+${Math.floor(amount)}`, 0x00ff00);
            }
        }

        // Play sound if possible
        if (this.scene.sound?.get('twinkle')) {
            this.scene.sound.play('twinkle', { volume: 0.5 });
        }
    }

    applyDamage(target, level) {
        // Damage amount: 10 base + 4 per level
        const amount = 10 + (level - 1) * 4;

        if (target.takeDamage) {
            target.takeDamage(amount);
        } else if (target.hp !== undefined) {
            target.hp -= amount;
            if (this.scene.showFloatingText) {
                this.scene.showFloatingText(target.x, target.y - 20, `-${Math.floor(amount)}`, 0xff0000);
            }
        }

        // Hit flash if target has sprite
        if (target.sprite) {
            target.sprite.setTintFill(0xffffff);
            this.scene.time.delayedCall(100, () => {
                if (target.sprite && target.sprite.active) target.sprite.clearTint();
            });
        }
    }

    executeBankAction(level) {
        const scene = this.scene;
        const amount = 50 + (level - 1) * 25;

        // Pick a random location within camera view
        const view = scene.cameras.main.worldView;
        const x = view.x + Math.random() * view.width;
        const y = view.y + Math.random() * view.height;

        this.spawnBouncingLoot(x, y, 'emoji_coin', amount);
        console.log(`[SupportAction] Bank generated ${amount} gold at (${x.toFixed(0)}, ${y.toFixed(0)})`);
    }

    executeChurchAction(level) {
        const scene = this.scene;

        // Pick random ally
        const allies = [];
        if (scene.mercenaries) {
            scene.mercenaries.getChildren().forEach(m => {
                if (m.active && m.hp > 0) allies.push(m);
            });
        }
        if (scene.player && scene.player.active && scene.player.hp > 0) allies.push(scene.player);

        if (allies.length === 0) return;
        const target = Phaser.Utils.Array.GetRandom(allies);

        // Cleanse
        if (target.cleanse) {
            target.cleanse();
        }

        // Light Pillar Effect (Simplified Sera Ult)
        const light = scene.add.rectangle(target.x, target.y - 400, 40, 800, 0xffffff, 0.5);
        light.setDepth(2000);
        scene.tweens.add({
            targets: light,
            alpha: 0,
            scaleX: 2,
            duration: 600,
            onComplete: () => light.destroy()
        });

        console.log(`[SupportAction] Church cleansed ${target.unitName || 'Player'}`);
    }

    executeCampAction(level) {
        const scene = this.scene;

        // Pick random enemy
        const enemies = [];
        if (scene.enemies) {
            scene.enemies.getChildren().forEach(e => {
                if (e.active && e.hp > 0) enemies.push(e);
            });
        }
        if (scene.boss && scene.boss.active && scene.boss.hp > 0) enemies.push(scene.boss);

        if (enemies.length === 0) return;
        const target = Phaser.Utils.Array.GetRandom(enemies);

        // Falling Rock
        const startY = scene.cameras.main.worldView.y - 50;
        const rock = scene.add.text(target.x, startY, '🪨', { fontSize: '24px' })
            .setOrigin(0.5)
            .setDepth(2000);

        scene.tweens.add({
            targets: rock,
            y: target.y - 10,
            duration: 600,
            ease: 'Back.easeIn',
            onComplete: () => {
                rock.destroy();

                // Damage
                const damage = 10 + (level - 1) * 3;
                this.applyDamage(target, level, damage); // Overload damage for camp

                // Stun (Skip in Raid)
                if (scene.scene.key !== 'RaidScene') {
                    const stunDuration = 1000 + (level - 1) * 200;
                    if (target.isStunned !== undefined) {
                        target.isStunned = true;
                        scene.time.delayedCall(stunDuration, () => {
                            if (target.active) target.isStunned = false;
                        });
                        console.log(`[SupportAction] Camp stunned ${target.unitName || 'Enemy'} for ${stunDuration}ms`);
                    }
                }
            }
        });
    }

    executeCastleAction(level) {
        const scene = this.scene;
        const amount = 1 + Math.floor((level - 1) / 5);

        // Random location
        const view = scene.cameras.main.worldView;
        const x = view.x + Math.random() * view.width;
        const y = view.y + Math.random() * view.height;

        this.spawnBouncingLoot(x, y, 'emoji_gem', amount);
        console.log(`[SupportAction] Castle generated ${amount} gems at (${x.toFixed(0)}, ${y.toFixed(0)})`);
    }

    spawnBouncingLoot(x, y, emojiKey, amount) {
        const scene = this.scene;

        // Start from sky
        const startY = scene.cameras.main.worldView.y - 50;
        const item = scene.add.image(x, startY, emojiKey)
            .setDisplaySize(32, 32)
            .setOrigin(0.5)
            .setDepth(2001);

        // Fall and Bounce
        scene.tweens.add({
            targets: item,
            y: y,
            duration: 800,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                // Ground Bounce
                scene.tweens.add({
                    targets: item,
                    y: y - 30,
                    duration: 200,
                    yoyo: true,
                    ease: 'Quad.easeOut',
                    onComplete: () => {
                        // Actually spawn the collectible via LootManager
                        if (scene.lootManager) {
                            // Manual spawn injection since spawnLoot usually takes monster
                            const lootGroup = scene.lootManager.lootGroup;
                            const drop = lootGroup.create(x, y, emojiKey);
                            drop.setDisplaySize(32, 32);
                            drop.emojiId = emojiKey;
                            drop.amount = amount;
                            drop.isCollected = false;
                            drop.canBeCollected = true;

                            // Physics setup
                            drop.setBounce(0.4);
                            drop.setCollideWorldBounds(true);
                            drop.setVelocity(Phaser.Math.Between(-50, 50), -100);
                            drop.setDrag(100, 100);
                            drop.setInteractive({ useHandCursor: true });

                            // Visual settling
                            const targetScale = drop.scaleX;
                            drop.setScale(targetScale * 1.5);
                            scene.tweens.add({
                                targets: drop,
                                scale: targetScale,
                                duration: 200,
                                ease: 'Back.easeOut'
                            });
                        }
                        item.destroy();
                    }
                });
            }
        });
    }

    applyDamage(target, level, overrideDamage) {
        // Damage amount: use override or standard factory formula
        const amount = overrideDamage !== undefined ? overrideDamage : (10 + (level - 1) * 4);

        if (target.takeDamage) {
            target.takeDamage(amount);
        } else if (target.hp !== undefined) {
            target.hp -= amount;
            if (this.scene.showFloatingText) {
                this.scene.showFloatingText(target.x, target.y - 20, `-${Math.floor(amount)}`, 0xff0000);
            }
        }

        // Hit flash
        if (target.sprite) {
            target.sprite.setTintFill(0xffffff);
            this.scene.time.delayedCall(100, () => {
                if (target.sprite && target.sprite.active) target.sprite.clearTint();
            });
        }
    }

    showExplosion(x, y) {
        const explosion = this.scene.add.circle(x, y, 5, 0xffa500, 0.8)
            .setDepth(2001);

        this.scene.tweens.add({
            targets: explosion,
            radius: 30,
            alpha: 0,
            duration: 300,
            ease: 'Cubic.easeOut',
            onComplete: () => explosion.destroy()
        });

        // Optional sound
        if (this.scene.sound?.get('explosion')) {
            this.scene.sound.play('explosion', { volume: 0.4 });
        }
    }
}
