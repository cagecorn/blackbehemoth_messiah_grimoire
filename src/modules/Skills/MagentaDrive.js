import Phaser from 'phaser';

/**
 * MagentaDrive.js
 * King's Ultimate: "Magenta Drive"
 * Dashes forward, slashing enemies and dealing execution damage.
 * Refreshes and casts Blood Rage.
 */
export default class MagentaDrive {
    constructor() {
        this.name = "마젠타 드라이브";
        this.nameEng = "Magenta Drive";
    }

    async execute(scene, caster) {
        if (!scene.ultimateManager) return;

        // 1. Play dramatic cutscene
        await scene.ultimateManager.playCutscene(caster, this.name);

        // 2. Setup Dash
        caster.isStunned = true; // Block actions during dash
        const startX = caster.x;
        const startY = caster.y;

        // Direction:
        // Mercenary.js logic: scaleX > 0 (1) is LEFT (-X), scaleX < 0 (-1) is RIGHT (+X).
        const directionX = (caster.sprite.scaleX > 0) ? -1 : 1;
        const dashDistance = 800; // Screen width-ish coverage
        const targetX = startX + (directionX * dashDistance);

        // Ensure targetX is within world bounds (optional, but good for camera/physics)
        // const clampedTargetX = Phaser.Math.Clamp(targetX, 0, scene.physics.world.bounds.width);
        // Actually, for an ultimate, going off-screen is fine visually, usually snaps back or handles itself.

        const dashDuration = 200; // Fast dash

        // 3. Dash Phase
        await new Promise(resolve => {
            // Afterimages for speed effect
            const timer = scene.time.addEvent({
                delay: 20,
                repeat: 8,
                callback: () => {
                    if (scene.fxManager && scene.fxManager.createAfterimage) {
                        scene.fxManager.createAfterimage(caster, 300, 0.6);
                    }
                }
            });

            scene.tweens.add({
                targets: caster,
                x: targetX,
                duration: dashDuration,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    timer.remove();
                    resolve();
                }
            });
        });

        // 4. Visuals: Red Slash Line & Blood
        this.createVisuals(scene, startX, startY, targetX, caster.y);

        // 5. Mechanics: Deal Damage
        this.applyDamage(scene, caster, startX, startY, targetX, caster.y);

        // 6. Blood Rage Refresh & Cast
        // Check if caster has BloodRage skill
        // Accessing the skill instance. We assume caster.skill is the assigned skill.
        if (caster.skill && (caster.skill.id === 'blood_rage' || caster.skill.name === '블러드 레이지')) {
            console.log(`[MagentaDrive] Refreshing Blood Rage for ${caster.unitName}`);

            // Reset Cooldown
            caster.skill.lastCastTime = 0;

            // Execute Immediately
            caster.skill.execute(caster);

            if (scene.fxManager) {
                scene.fxManager.showDamageText(caster, 'BLOOD RAGE!', '#ff0000');
            }
        }

        caster.isStunned = false;
    }

    createVisuals(scene, x1, y1, x2, y2) {
        // A. Red Slash Line (Graphics)
        const graphics = scene.add.graphics();
        graphics.lineStyle(40, 0xff0000, 1);
        graphics.beginPath();
        graphics.moveTo(x1, y1 - 30); // Offset slightly to center on body
        graphics.lineTo(x2, y2 - 30);
        graphics.strokePath();
        graphics.setDepth(100);

        // Fade out the line
        scene.tweens.add({
            targets: graphics,
            alpha: 0,
            scaleY: 0.1,
            duration: 600,
            ease: 'Quad.easeOut',
            onComplete: () => graphics.destroy()
        });

        // B. Blood Particle Explosion along the path
        const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
        const steps = Math.ceil(dist / 40); // One burst every 40px
        const dx = (x2 - x1) / steps;

        for (let i = 0; i <= steps; i++) {
            const px = x1 + dx * i;
            const py = y1 - 30;

            // Create a burst of blood drops
            const emitter = scene.add.particles(px, py, 'emoji_blood_drop', {
                speed: { min: 50, max: 250 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.5, end: 0 },
                alpha: { start: 1, end: 0 },
                lifespan: 800,
                gravityY: 400,
                quantity: 2, // 2 particles per step
                emitting: false
            });
            emitter.explode(2);

            // Cleanup emitter
            scene.time.delayedCall(1000, () => emitter.destroy());
        }
    }

    applyDamage(scene, caster, x1, y1, x2, y2) {
        // Hitbox: Rectangle covering the dash path
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = y1 - 60;
        const maxY = y1 + 60;

        const targets = caster.targetGroup.getChildren().filter(e => e.active && e.hp > 0);
        let hitCount = 0;

        targets.forEach(target => {
            // Check intersection (Simple AABB)
            if (target.x >= minX && target.x <= maxX &&
                target.y >= minY && target.y <= maxY) {

                // Damage Logic
                // 1. Base Damage: 3.5x Total Attack
                const baseDmg = caster.getTotalAtk() * 3.5;

                // 2. Execution Damage: 20% of Missing HP
                const missingHp = target.maxHp - target.hp;
                const executeDmg = missingHp * 0.20;

                const totalDmg = baseDmg + executeDmg;

                // Apply Damage (isUltimate = true)
                target.takeDamage(totalDmg, caster, true);
                hitCount++;

                // Visual Feedback on Hit
                if (scene.fxManager) {
                    scene.fxManager.showDamageText(target, `CRITICAL!`, '#ff0000');
                }
            }
        });

        if (hitCount > 0) {
            scene.cameras.main.shake(200, 0.01);
        }
    }
}
