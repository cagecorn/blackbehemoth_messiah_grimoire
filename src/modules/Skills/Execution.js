import Phaser from 'phaser';

/**
 * Execution.js
 * Wrinkle's Ultimate Skill. 
 * Spawns 12 homing "Guillotine Paper" projectiles that track targets.
 * Damage scales based on target's lost HP.
 * Each hit adds a Lightning Dash stack.
 */
export default class Execution {
    constructor(caster) {
        this.caster = caster;
        this.baseDamageMult = 1.5; // Base per projectile
        this.numProjectiles = 12;
    }

    execute(scene, caster) {
        if (!caster || !caster.active || caster.hp <= 0) return;

        console.log(`[Ultimate] ${caster.unitName} triggers Execution!`);

        // 1. Zoom and Dim effect for flamboyant entrance
        const mainCamera = scene.cameras.main;
        const originalZoom = mainCamera.zoom;
        const overlay = scene.add.rectangle(0, 0, scene.game.config.width, scene.game.config.height, 0x000000, 0.6)
            .setOrigin(0, 0).setDepth(15000).setAlpha(0);

        scene.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 300,
            yoyo: true,
            hold: 500
        });

        // 2. Play Ultimate Cutscene (provided in EntityStats)
        if (caster.characterId === 'wrinkle') {
            // Assume UIManager handles the cutscene overlay better, but we'll do a simple flash here
            if (scene.fxManager) {
                scene.fxManager.showElementalNovaEffect(caster, 'lightning');
            }
        }

        // 3. Spawn homing projectiles
        const enemies = caster.targetGroup.getChildren().filter(e => e.active && e.hp > 0);
        if (enemies.length === 0) return;

        for (let i = 0; i < this.numProjectiles; i++) {
            scene.time.delayedCall(100 + i * 80, () => {
                const target = enemies.length > 0 ? Phaser.Utils.Array.GetRandom(enemies) : null;
                if (target && target.active && target.hp > 0) {
                    this.fireHomingPaper(scene, caster, target);
                }
            });
        }
    }

    fireHomingPaper(scene, caster, target) {
        const startX = caster.x;
        const startY = caster.y;

        const paper = scene.add.text(startX, startY, '📄', { fontSize: '32px' }).setOrigin(0.5).setDepth(16000);
        paper.setTint(0xff0000);

        // Homing Tween
        scene.tweens.add({
            targets: paper,
            x: target.x || startX,
            y: target.y || startY,
            duration: 600,
            ease: 'Cubic.easeIn',
            onUpdate: (tween, targetObj) => {
                if (target && target.active) {
                    tween.updateTo('x', target.x, true);
                    tween.updateTo('y', target.y, true);
                    // Rotation towards target
                    const angle = Phaser.Math.Angle.Between(paper.x, paper.y, target.x, target.y);
                    paper.setRotation(angle + Math.PI / 4);
                }
            },
            onComplete: () => {
                if (target && target.active) {
                    this.handleImpact(scene, caster, target);
                }

                // Visual Impact
                if (scene.fxManager) {
                    scene.fxManager.spawnElementalParticles(paper.x, paper.y, 'fire');
                }

                paper.destroy();
            }
        });

        // Trail effect for each homing paper
        const paperTrail = scene.time.addEvent({
            delay: 30,
            callback: () => {
                if (paper.active) {
                    const t = scene.add.circle(paper.x, paper.y, 4, 0xff0000, 0.4);
                    scene.tweens.add({
                        targets: t,
                        alpha: 0,
                        scale: 0.1,
                        duration: 300,
                        onComplete: () => t.destroy()
                    });
                } else {
                    paperTrail.remove();
                }
            },
            loop: true
        });
    }

    handleImpact(scene, caster, target) {
        // Damage scales based on target's lost HP
        const lostHpRatio = 1 - (target.hp / target.maxHp);
        const damageMult = this.baseDamageMult * (1 + lostHpRatio * 1.5); // Up to 2.5x total
        const finalDamage = caster.getTotalAtk() * damageMult;

        const isCritical = Math.random() * 100 < caster.getTotalCrit();
        const damageToApply = isCritical ? finalDamage * 1.5 : finalDamage;

        if (target.takeDamage) {
            target.takeDamage(damageToApply, caster, true, 'fire', isCritical);
        }

        // Add Lightning Stack for Passive
        if (caster.addLightningStack) {
            caster.addLightningStack(target);
        }
    }
}
