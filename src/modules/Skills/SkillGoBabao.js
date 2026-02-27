import Phaser from 'phaser';

/**
 * SkillGoBabao.js
 * Bao's ultimate: Babao turns into a high-speed spinning whirlwind of destruction.
 * - Forces Babao to spin and move erratically at high speed for 8 seconds.
 * - Damages and knocks up enemies in a whirlwind radius.
 * - Adds a motion blur/afterimage effect.
 * - Stuns Babao for 2 seconds after the skill ends.
 */
export default class SkillGoBabao {
    constructor() {
        this.name = "가라! 바바오!";
        this.nameEng = "Go! Babao!";
        this.duration = 8000;
        this.aoeRadius = 150;
    }

    async execute(scene, caster, babao) {
        if (!scene.ultimateManager || !babao || !babao.active) return;

        // 1. Play Cutscene
        await scene.ultimateManager.playCutscene(caster, this.name);

        console.log(`[Ultimate] ${caster.unitName}: GO BABAO! SPIN FOR YOUR BROTHER!`);

        // 2. Setup Spinning State
        babao.isSpinning = true;
        if (babao.body) babao.body.stop();

        // Visual: Fast spinning (flipX toggle)
        const spinTimer = scene.time.addEvent({
            delay: 50,
            callback: () => {
                if (babao && babao.active) {
                    babao.sprite.setFlipX(!babao.sprite.flipX);
                }
            },
            repeat: -1
        });

        // Whirlwind Particles
        const whirlwindEmitter = scene.add.particles(0, 0, 'emoji_wind', {
            speed: { min: 100, max: 300 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 1.5 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 600,
            follow: babao,
            frequency: 50,
            quantity: 2
        });
        whirlwindEmitter.setDepth(babao.depth - 1);

        // Afterimage Logic
        const ghosts = [];
        const ghostTimer = scene.time.addEvent({
            delay: 100,
            callback: () => {
                if (!babao || !babao.active) return;
                const ghost = scene.add.image(babao.x, babao.y, babao.config.sprite);
                ghost.setScale(babao.scaleX, babao.scaleY);
                ghost.setAlpha(0.5);
                ghost.setDepth(babao.depth - 1);
                ghost.setTint(0x88ccff);
                ghosts.push(ghost);
                scene.tweens.add({
                    targets: ghost,
                    alpha: 0,
                    duration: 400,
                    onComplete: () => {
                        ghost.destroy();
                        ghosts.splice(ghosts.indexOf(ghost), 1);
                    }
                });
            },
            repeat: -1
        });

        // 3. Enemy Seeking Movement
        const moveTimer = scene.time.addEvent({
            delay: 400, // Faster reactions
            callback: () => {
                if (!babao || !babao.active || !scene.scene.isActive()) return;

                // Find nearest enemy from targetGroup
                let nearestEnemy = null;
                let minDist = Infinity;
                if (!babao.targetGroup || !babao.targetGroup.getChildren) return;
                const enemies = babao.targetGroup.getChildren();

                enemies.forEach(enemy => {
                    if (enemy.active && enemy.hp > 0) {
                        const d = Phaser.Math.Distance.Between(babao.x, babao.y, enemy.x, enemy.y);
                        if (d < minDist) {
                            minDist = d;
                            nearestEnemy = enemy;
                        }
                    }
                });

                let tx = babao.x;
                let ty = babao.y;

                if (nearestEnemy) {
                    // Chase enemy (slightly lead them or just go straight)
                    tx = nearestEnemy.x;
                    ty = nearestEnemy.y;
                } else {
                    // Random wander if no enemies
                    const margin = 100;
                    tx = Phaser.Math.Between(margin, scene.cameras.main.width - margin);
                    ty = Phaser.Math.Between(margin, scene.cameras.main.height - margin);
                }

                scene.tweens.add({
                    targets: babao,
                    x: tx,
                    y: ty,
                    duration: 350,
                    ease: 'Sine.easeInOut',
                    onStart: () => {
                        // Trigger AOE once at the start of the dash
                        if (scene.aoeManager && babao.active) {
                            const damage = caster.getTotalMAtk() * 2.0; // Significant single hit instead of many tiny ticks
                            scene.aoeManager.triggerAoe(babao.x, babao.y, this.aoeRadius, damage, caster, babao.targetGroup, true, true);

                            // Airborne chance on dash start
                            enemies.forEach(enemy => {
                                if (enemy.active && Phaser.Math.Distance.Between(babao.x, babao.y, enemy.x, enemy.y) < this.aoeRadius) {
                                    if (Math.random() < 0.2 && scene.ccManager) {
                                        scene.ccManager.applyAirborne(enemy, 500, 20);
                                    }
                                }
                            });
                        }
                    }
                });
            },
            repeat: Math.floor(this.duration / 400) - 1
        });

        // 4. Cleanup & Stun After 8s
        scene.time.delayedCall(this.duration, () => {
            babao.isSpinning = false;
            spinTimer.remove();
            ghostTimer.remove();
            moveTimer.remove();
            whirlwindEmitter.destroy();

            // Clean up any remaining ghosts
            ghosts.forEach(g => g.destroy());

            console.log(`[Ultimate] Go Babao! finished. Babao is dizzy...`);

            if (babao && babao.active) {
                babao.sprite.setFlipX(false);
                if (scene.ccManager) {
                    scene.ccManager.applyAirborne(babao, 400, 10); // Dizzy hop
                    scene.time.delayedCall(400, () => {
                        scene.ccManager.applyShock(babao, 2000); // 2s Stun (reuse Shock for incapacity)
                        if (scene.fxManager) {
                            scene.fxManager.showDamageText(babao, 'DIZZY... @.@', '#ffff00');
                        }
                    });
                }
            }
        });
    }
}
