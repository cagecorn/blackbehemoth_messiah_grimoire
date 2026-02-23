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

        const directionX = (caster.sprite.scaleX > 0) ? -1 : 1;

        // Dash distance covers the entire screen width roughly mapped locally
        const dashDistance = scene.cameras.main.width + 200;
        const targetX = startX + (directionX * dashDistance);

        // Darken screen for dramatic wind-up
        const darkenRect = scene.add.rectangle(0, 0, scene.cameras.main.width, scene.cameras.main.height, 0x000000, 0.7);
        darkenRect.setOrigin(0, 0).setDepth(99);
        darkenRect.setScrollFactor(0);

        // Dramatic pause (Wind-up): scale down slightly as if charging
        const originalScaleX = caster.sprite.scaleX;
        const originalScaleY = caster.sprite.scaleY;
        caster.sprite.setTint(0xff0000);

        scene.tweens.add({
            targets: caster.sprite,
            scaleY: originalScaleY * 0.8,
            duration: 300,
            ease: 'Sine.easeOut'
        });

        await new Promise(resolve => scene.time.delayedCall(300, resolve));

        // Remove darkness
        darkenRect.destroy();

        // 3. Dash Phase - King rushing horizontally
        const dashDuration = 120; // VERY Fast dash

        // Add wind lines or stretch the sprite for motion blur
        caster.sprite.scaleX = originalScaleX * 1.5; // Stretch horizontally
        caster.sprite.scaleY = originalScaleY * 0.6; // Squish vertically

        const slashY = startY - 40; // Adjust closer to center body

        // 4. Visuals: Red Beam Splitting the Screen & Blood
        // Run AT THE SAME TIME as the dash
        this.createVisuals(scene, startX, slashY, targetX, slashY, directionX);

        await new Promise(resolve => {
            const timer = scene.time.addEvent({
                delay: 10,
                repeat: 12,
                callback: () => {
                    if (scene.fxManager && scene.fxManager.createAfterimage) {
                        scene.fxManager.createAfterimage(caster, 400, 0.8, 0xff0000); // Red tinted afterimage
                    }
                }
            });

            scene.tweens.add({
                targets: caster,
                x: targetX,
                duration: dashDuration,
                ease: 'Cubic.easeIn',
                onComplete: () => {
                    timer.remove();
                    caster.sprite.scaleX = originalScaleX; // Restore scale
                    caster.sprite.scaleY = originalScaleY;
                    caster.sprite.clearTint();
                    resolve();
                }
            });
        });

        // 5. Mechanics: Deal Damage
        this.applyDamage(scene, caster, startX, slashY, targetX, slashY);

        // 6. Blood Rage Refresh & Cast
        if (caster.skill && (caster.skill.id === 'blood_rage' || caster.skill.name === '블러드 레이지')) {
            caster.skill.lastCastTime = 0;
            caster.skill.execute(caster);
            if (scene.fxManager) {
                scene.fxManager.showDamageText(caster, 'BLOOD RAGE!', '#ff0000');
            }
        }

        caster.isStunned = false;
    }

    createVisuals(scene, x1, y1, x2, y2, directionX) {
        // A. Red Slash Line (Screen Splitting Red Beam)
        // We want a very thick red line + a bright white core
        const graphics = scene.add.graphics();

        // Use exact dash trajectory instead of extending infinitely
        const startExt = x1;
        const endExt = x2;

        // Outer Glow (Thick Red)
        graphics.lineStyle(60, 0xaa0000, 0.6);
        graphics.beginPath();
        graphics.moveTo(startExt, y1);
        graphics.lineTo(endExt, y2);
        graphics.strokePath();

        // Inner Beam (Bright Red/Magenta)
        graphics.lineStyle(20, 0xff0055, 1);
        graphics.beginPath();
        graphics.moveTo(startExt, y1);
        graphics.lineTo(endExt, y2);
        graphics.strokePath();

        // Core Beam (White)
        graphics.lineStyle(6, 0xffffff, 1);
        graphics.beginPath();
        graphics.moveTo(startExt, y1);
        graphics.lineTo(endExt, y2);
        graphics.strokePath();

        graphics.setDepth(100);

        // Screen Flash (White)
        const flash = scene.add.rectangle(0, 0, scene.cameras.main.width, scene.cameras.main.height, 0xffffff, 1);
        flash.setOrigin(0, 0).setDepth(200);
        flash.setScrollFactor(0);

        scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 150,
            onComplete: () => flash.destroy()
        });

        // Fade out the slash line dramatically
        scene.tweens.add({
            targets: graphics,
            alpha: 0,
            scaleY: 3, // Expand vertically as it fades
            y: y1 - (y1 * 3 - y1), // Keep centered
            duration: 500,
            ease: 'Expo.easeOut',
            onComplete: () => graphics.destroy()
        });

        // B. Blood Particle Explosion along the path
        // Violent bursting blood drop emojis jumping from the aura
        const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
        const steps = Math.ceil(dist / 30);
        const dx = (x2 - x1) / steps;

        for (let i = 0; i <= steps; i++) {
            const px = x1 + dx * i;
            const py = y1;

            const emitter = scene.add.particles(px, py, 'emoji_blood_drop', {
                speed: { min: 300, max: 900 }, // Super fast
                angle: { min: -150, max: -30 }, // Burst violently upwards
                scale: { start: 0.8, end: 0.1 },
                alpha: { start: 1, end: 0 },
                lifespan: { min: 400, max: 800 },
                gravityY: 1800, // Heavy gravity so they arc back down hard
                quantity: 4,
                rotate: { min: 0, max: 360 }, // Spin the emojis
                emitting: false,
                blendMode: 'NORMAL'
            });
            emitter.explode(4);

            scene.time.delayedCall(1000, () => emitter.destroy());
        }
    }

    applyDamage(scene, caster, x1, y1, x2, y2) {
        // Hitbox: Rectangle covering the dash path
        const minX = Math.min(x1, x2) - 1000; // expanded hitbox to catch everything in the slice
        const maxX = Math.max(x1, x2) + 1000;
        const minY = y1 - 100;
        const maxY = y1 + 100;

        const targets = caster.targetGroup.getChildren().filter(e => e.active && e.hp > 0);
        let hitCount = 0;

        targets.forEach(target => {
            if (target.x >= minX && target.x <= maxX &&
                target.y >= minY && target.y <= maxY) {

                const baseDmg = caster.getTotalAtk() * 3.5;
                const missingHp = target.maxHp - target.hp;
                const executeDmg = missingHp * 0.20;
                const totalDmg = baseDmg + executeDmg;

                target.takeDamage(totalDmg, caster, true);
                hitCount++;

                if (scene.fxManager) {
                    scene.fxManager.showDamageText(target, `CRITICAL!`, '#ff0000');
                    // Spark effect if available
                    if (scene.fxManager.createImpactEffect) {
                        scene.fxManager.createImpactEffect(target.x, target.y);
                    }
                }
            }
        });

        // Massive camera shake if hit
        if (hitCount > 0) {
            scene.cameras.main.shake(350, 0.035);
        } else {
            scene.cameras.main.shake(150, 0.015); // Powerful slash shakes screen even on miss
        }
    }
}
