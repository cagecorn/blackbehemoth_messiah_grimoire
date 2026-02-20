import Phaser from 'phaser';
import HealthBar from '../UI/HealthBar.js';
import EventBus from '../Events/EventBus.js';

/**
 * BaseMonster.js
 * Base class for all enemies (Goblin, Slime, etc.)
 */
export default class BaseMonster extends Phaser.GameObjects.Container {
    constructor(scene, x, y, config, target) {
        super(scene, x, y);
        this.scene = scene;
        this.config = config;
        this.target = target; // Usually the Warrior

        // Identity
        this.id = config.id + '_' + Phaser.Math.Between(1000, 9999);
        this.className = config.id; // Keeping original className
        this.unitName = config.name;

        // Stats
        this.maxHp = config.maxHp;
        this.hp = config.hp || config.maxHp;
        this.maxMp = config.maxMp || 0;
        this.mp = config.mp !== undefined ? config.mp : (config.maxMp || 0);

        this.atk = config.atk || 0;
        this.mAtk = config.mAtk || 0;
        this.def = config.def || 0;
        this.mDef = config.mDef || 0;

        this.speed = config.speed || 50;
        this.atkRange = config.atkRange || 40;
        this.atkSpd = config.atkSpd || 1500;

        this.acc = config.acc || 100;
        this.eva = config.eva || 0;
        this.crit = config.crit || 0;
        this.lastAttackTime = 0;

        // Setup Physics & Rendering
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);

        this.sprite = this.scene.add.image(0, 0, config.sprite);
        const spriteSize = config.spriteSize || 64;
        const scale = config.scale || 1;
        this.sprite.setDisplaySize(spriteSize * scale, spriteSize * scale);
        this.add(this.sprite);

        const radius = (config.physicsRadius || 20) * scale;
        this.body.setCircle(radius);
        this.body.setOffset(-radius, -radius);
        this.body.setCollideWorldBounds(true);

        this.healthBar = new HealthBar(scene, x, y - 48, 48, 6);

        // AI Debug Text
        this.aiDebugText = this.scene.add.text(0, -60, '', {
            fontSize: '11px',
            fill: '#ffcccc',
            backgroundColor: '#000000aa',
            padding: { x: 2, y: 1 }
        }).setOrigin(0.5);
        this.add(this.aiDebugText);

        // Store base scale for relative flipping
        this.baseScaleX = this.sprite.scaleX;
        this.baseScaleY = this.sprite.scaleY;
        this.lastScaleX = 1;
        this.lastFlipTime = 0;
        this.flipCooldown = 150; // ms

        // Add shadow via FXManager (Bosses might have config.scale)
        if (this.scene.fxManager) {
            const shadowScale = (this.config && this.config.scale) ? this.config.scale : 1;
            this.shadow = this.scene.fxManager.createShadow(this, shadowScale);
        }
    }

    takeDamage(amount, attackerId = null) {
        // Physical Damage is reduced by Def
        const finalDamage = Math.max(1, amount - this.def);
        this.hp -= finalDamage;
        if (this.hp < 0) this.hp = 0;
        this.updateHealthBar();

        if (this.scene.fxManager) {
            this.scene.fxManager.showDamageText(this, finalDamage, '#ff0000');
        }

        console.info(`%c[Combat] %c${this.unitName}%c was hit for %c${finalDamage.toFixed(1)}%c physical damage. (HP: ${this.hp.toFixed(1)}/${this.maxHp})`,
            'color: #ffaa00; font-weight: bold;',
            'color: #ff5555;',
            'color: #e0e0e0;',
            'color: #ffffff; font-weight: bold;',
            'color: #e0e0e0;'
        );

        this.playHitEffect();

        if (this.hp <= 0) {
            this.die(attackerId);
        }
    }

    takeMagicDamage(amount, attackerId = null) {
        // Magic Damage is reduced by mDef
        const finalDamage = Math.max(1, amount - this.mDef);
        this.hp -= finalDamage;
        if (this.hp < 0) this.hp = 0;
        this.updateHealthBar();

        if (this.scene.fxManager) {
            this.scene.fxManager.showDamageText(this, finalDamage, '#ff0000');
        }

        console.info(`%c[Combat] %c${this.unitName}%c was hit for %c${finalDamage.toFixed(1)}%c magic damage. (HP: ${this.hp.toFixed(1)}/${this.maxHp})`,
            'color: #ffaa00; font-weight: bold;',
            'color: #ff5555;',
            'color: #e0e0e0;',
            'color: #ffffff; font-weight: bold;',
            'color: #e0e0e0;'
        );

        this.playHitEffect();

        if (this.hp <= 0) {
            this.die(attackerId);
        }
    }

    playHitEffect() {
        this.scene.tweens.add({
            targets: this.sprite,
            tint: 0xff0000,
            duration: 100,
            yoyo: true,
            onComplete: () => {
                if (this.sprite) this.sprite.clearTint();
            }
        });
    }

    receiveHeal(amount) {
        this.hp += amount;
        if (this.hp > this.maxHp) this.hp = this.maxHp;
        this.updateHealthBar();
    }

    updateHealthBar() {
        if (this.healthBar) {
            this.healthBar.setValue((this.hp / this.maxHp) * 100);
        }
    }

    die(attackerId = null) {
        if (this.healthBar) this.healthBar.destroy();

        // --- Centralized Kill & Loot Logic ---
        EventBus.emit(EventBus.EVENTS.MONSTER_KILLED, {
            monsterId: this.sprite.texture.key,
            attackerId: attackerId
        });

        if (this.scene && this.scene.lootManager) {
            // Use container world coordinates (x, y) which are more stable during death
            console.log(`[BaseMonster] ${this.unitName} died at (${this.x.toFixed(1)}, ${this.y.toFixed(1)}). Spawning loot.`);
            this.scene.lootManager.spawnLoot(this.x, this.y);
        }

        // Stop logic
        this.btManager = null;

        // Visual death animation with safety check
        if (this.scene && this.scene.tweens) {
            this.scene.tweens.add({
                targets: this,
                scaleX: 0,
                scaleY: 0,
                angle: 180,
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    this.destroy();
                }
            });
        } else {
            this.destroy();
        }
    }

    update() {
        if (this.btManager) {
            this.btManager.step();
            this.handleAttack();
        }
        this.healthBar.setPos(this.x, this.y - 48);
        if (this.btManager && this.aiDebugText) {
            this.aiDebugText.setText(this.btManager.lastActiveNodeName || 'No Name');
        } else if (this.aiDebugText) {
            this.aiDebugText.setText('NO BT');
        }
        this.updateVisualOrientation();
    }

    updateVisualOrientation() {
        if (!this.body || !this.sprite) return;

        const vx = this.body.velocity.x;
        let targetScaleX = this.lastScaleX;

        // Increased threshold for monsters to prevent jittering (10 instead of 2)
        if (vx > 10) {
            targetScaleX = -1; // Moving Right -> Flip
        } else if (vx < -10) {
            targetScaleX = 1; // Moving Left -> Normal
        }

        if (targetScaleX !== this.lastScaleX) {
            const now = this.scene.time.now;
            if (now - this.lastFlipTime > this.flipCooldown) {
                this.lastScaleX = targetScaleX;
                this.lastFlipTime = now;
                // Quick flip tween (relative to base scale)
                this.scene.tweens.add({
                    targets: this.sprite,
                    scaleX: targetScaleX * this.baseScaleX,
                    duration: 150,
                    ease: 'Back.easeOut'
                });
            }
        }
    }

    handleAttack() {
        // Only Melee AI types use this manual attack logic (dash nudge).
        // Ranged/Support types handle their attacks via Behavior Trees.
        if (this.config.aiType !== 'MELEE') return;

        if (!this.target || !this.target.active || this.hp <= 0) return;

        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
        const now = this.scene.time.now;

        if (dist <= this.atkRange && now - this.lastAttackTime > this.atkSpd) {
            this.lastAttackTime = now;
            this.target.takeDamage(this.atk, this.id);

            // Visual attack nudge
            this.scene.tweens.add({
                targets: this,
                x: this.x + (this.target.x - this.x) * 0.2,
                y: this.y + (this.target.y - this.y) * 0.2,
                duration: 100,
                yoyo: true
            });
        }
    }
}
