import Phaser from 'phaser';
import HealthBar from '../UI/HealthBar.js';
import CooldownBar from '../UI/CooldownBar.js';
import EventBus from '../Events/EventBus.js';
import SpeechBubble from '../UI/SpeechBubble.js';

/**
 * Mercenary.js
 * Base class for all party members (Warrior, Archer, etc.)
 */
export default class Mercenary extends Phaser.GameObjects.Container {
    constructor(scene, x, y, config) {
        super(scene, x, y);
        this.scene = scene;
        this.config = config;

        // Identity
        this.id = config.id + '_' + Phaser.Math.Between(1000, 9999);
        this.className = config.id;
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

        // Dynamic Buffs
        this.bonusAtk = 0;
        this.bonusMAtk = 0;

        this.speed = config.speed || 100;
        this.atkRange = config.atkRange || 40;
        this.atkSpd = config.atkSpd || 1000;
        this.castSpd = config.castSpd || 1000;

        this.acc = config.acc || 100;
        this.eva = config.eva || 0;
        this.crit = config.crit || 0;

        // Setup Physics & Rendering
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);

        this.sprite = this.scene.add.image(0, 0, config.sprite);
        this.sprite.setDisplaySize(config.spriteSize || 64, config.spriteSize || 64);
        this.add(this.sprite);

        const radius = config.physicsRadius || 20;
        this.body.setCircle(radius);
        this.body.setOffset(-radius, -radius);
        this.body.setCollideWorldBounds(true);

        this.healthBar = new HealthBar(scene, x, y - 56, 64, 8); // Moved up slightly
        this.cooldownBar = new CooldownBar(scene, x, y - 46, 64, 4); // Placed just below HP

        // AI Debug Text (only visible if we want, but keeping it simple for now)
        this.aiDebugText = this.scene.add.text(0, -60, '', {
            fontSize: '12px',
            fill: '#ffffff',
            backgroundColor: '#000000aa',
            padding: { x: 2, y: 1 }
        }).setOrigin(0.5);
        this.add(this.aiDebugText);

        // Store base scale for relative flipping (important for high-res sprites)
        this.baseScaleX = this.sprite.scaleX;
        this.baseScaleY = this.sprite.scaleY;
        this.lastScaleX = 1;
        this.lastFlipTime = 0;
        this.flipCooldown = 150; // ms

        // Add shadow via FXManager
        if (this.scene.fxManager) {
            this.shadow = this.scene.fxManager.createShadow(this);
        }

        this.setupBaseEventListeners();
    }

    setupBaseEventListeners() {
        // AI Commands are routed by class ID or globally
        const commandEvent = (this.className === 'archer')
            ? EventBus.EVENTS.AI_COMMAND_ARCHER
            : (this.className === 'healer')
                ? EventBus.EVENTS.AI_COMMAND_HEALER
                : EventBus.EVENTS.AI_COMMAND;

        EventBus.on(commandEvent, this.handleAICommand, this);
        EventBus.on(EventBus.EVENTS.AI_RESPONSE, this.handleAIResponse, this);
    }

    handleAICommand(cmd) {
        const funcName = cmd.command || cmd.function || cmd.name;

        if (funcName === 'set_ai_state' || funcName === 'change_mercenary_stance') {
            const args = cmd.args || cmd.parameters || cmd;
            if (args && args.state && this.blackboard) {
                const newStance = args.state.toUpperCase();
                this.blackboard.set('ai_state', newStance);
            } else if (args && args.stance && this.blackboard) {
                const newStance = args.stance.toUpperCase();
                this.blackboard.set('ai_state', newStance);
            }
        } else if (funcName === 'attack_priority' || funcName === 'change_target_priority') {
            const args = cmd.args || cmd.parameters || cmd;
            if (args && args.role && this.blackboard) {
                const newPriority = args.role.toUpperCase();
                this.blackboard.set('target_priority', newPriority);
            } else if (args && args.priority && this.blackboard) {
                const newPriority = args.priority.toUpperCase();
                this.blackboard.set('target_priority', newPriority);
            }
        }
    }

    handleAIResponse(payload) {
        // payload should be { agentId: '...', text: '...' }
        if (payload && typeof payload === 'object') {
            if (payload.agentId === this.className) {
                this.showSpeechBubble(payload.text);
            }
        }
    }

    showSpeechBubble(text) {
        new SpeechBubble(this.scene, this.x, this.y, text);
    }

    getTotalAtk() {
        return this.atk + this.bonusAtk;
    }

    getTotalMAtk() {
        return this.mAtk + this.bonusMAtk;
    }

    takeDamage(amount, attackerId = null) {
        // Physical Damage is reduced by Def
        const finalDamage = Math.max(1, amount - this.def);
        this.hp -= finalDamage;
        if (this.hp < 0) this.hp = 0;
        this.updateHealthBar();

        if (this.scene.fxManager) {
            this.scene.fxManager.showDamageText(this, finalDamage, '#ffaa00');
        }

        console.info(`[Combat] ${this.unitName} took ${finalDamage.toFixed(1)} physical damage.`);

        this.playHitEffect();

        if (this.hp <= 0) {
            this.die();
        }
    }

    takeMagicDamage(amount, attackerId = null) {
        // Magic Damage is reduced by mDef
        const finalDamage = Math.max(1, amount - this.mDef);
        this.hp -= finalDamage;
        if (this.hp < 0) this.hp = 0;
        this.updateHealthBar();

        if (this.scene.fxManager) {
            this.scene.fxManager.showDamageText(this, finalDamage, '#ffaa00');
        }

        console.info(`[Combat] ${this.unitName} took ${finalDamage.toFixed(1)} magic damage.`);

        this.playHitEffect();

        if (this.hp <= 0) {
            this.die();
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

    die() {
        console.error(`%c[Dead] %c${this.unitName} has been defeated!`, 'color: #ff0000; font-weight: bold;', 'color: #ffffff;');

        EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `${this.unitName}가 쓰러졌습니다! 💀`);
        EventBus.emit(EventBus.EVENTS.UNIT_DIED, this.unitName);

        if (this.healthBar) this.healthBar.destroy();
        if (this.cooldownBar) this.cooldownBar.destroy();
        this.destroy();
    }

    update() {
        if (this.isAirborne || this.isStunned) {
            // Can't act while CC'd. Keep velocity at 0 unless knocked back.
            this.body.setVelocity(0, 0);
        } else if (this.btManager) {
            this.btManager.step();
        }
        if (this.healthBar) {
            this.healthBar.setPos(this.x, this.y - 56);
        }
        if (this.cooldownBar) {
            this.cooldownBar.setPos(this.x, this.y - 46);
            if (this.getSkillProgress) {
                this.cooldownBar.setValue(this.getSkillProgress());
            } else {
                this.cooldownBar.setValue(0); // Empty if no skill
            }
        }
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

        // Increased threshold to prevent jittering during repulsion
        if (vx > 10) {
            targetScaleX = -1; // Moving Right -> Flip (since default is Left)
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
}
