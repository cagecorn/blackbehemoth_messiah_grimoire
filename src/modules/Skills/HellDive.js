import Phaser from 'phaser';

/**
 * HellDive.js
 * King's Ultimate: "Hell Dive" (헬 다이브)
 * Jumps up with a Phoenix overlay, lands with a Comet overlay, deals execute damage, and refreshes Blood Rage.
 */
export default class HellDive {
    constructor() {
        this.name = "헬 다이브";
        this.nameEng = "Hell Dive";
    }

    async execute(scene, caster) {
        if (!scene.ultimateManager) return;

        // 1. Play dramatic cutscene
        await scene.ultimateManager.playCutscene(caster, this.name);

        // 2. Jump Phase
        caster.isStunned = true; // Block actions
        caster.body.setVelocity(0, 0);

        const jumpHeight = -300;
        const jumpDuration = 400;
        const originalY = caster.y;

        // Phoenix Overlay 🐦‍🔥
        const phoenixText = scene.add.text(caster.x, caster.y - 50, '🐦‍🔥', {
            fontSize: '64px'
        }).setOrigin(0.5).setDepth(caster.depth + 10);

        // Tween caster and overlay up
        await new Promise(resolve => {
            scene.tweens.add({
                targets: [caster, phoenixText],
                y: caster.y + jumpHeight,
                duration: jumpDuration,
                ease: 'Back.easeOut',
                onComplete: resolve
            });
        });

        // Hover briefly
        await new Promise(resolve => scene.time.delayedCall(200, resolve));

        // 3. Target Phase (Find enemies nearby or just land at current X)
        // User said: "Slides on the ground... AoE". We can target current position or nearest enemy.
        // Let's target the current X, but we need to land.
        // Also remove Phoenix, add Comet ☄️
        phoenixText.destroy();

        const cometText = scene.add.text(caster.x, caster.y - 50, '☄️', {
            fontSize: '64px'
        }).setOrigin(0.5).setDepth(caster.depth + 10);

        // 4. Descent Phase
        await new Promise(resolve => {
            scene.tweens.add({
                targets: [caster, cometText],
                y: originalY,
                duration: 300,
                ease: 'Quad.easeIn',
                onComplete: resolve
            });
        });

        // 5. Impact Phase
        this.onImpact(scene, caster, caster.x, caster.y);
        cometText.destroy();

        // 6. Slide Phase (Slide forward in facing direction)
        const slideDist = caster.flipX ? -150 : 150; // Assuming flipX means facing left?
        // Usually: flipX=true is left if sprite is right-facing.
        // Let's check a standard sprite. Usually right-facing.
        // If flipX is true, it faces left.

        await new Promise(resolve => {
            scene.tweens.add({
                targets: caster,
                x: caster.x + slideDist,
                duration: 300,
                ease: 'Power2',
                onComplete: resolve
            });

            // Dust particles during slide
            const dust = scene.add.particles(0, 0, 'emoji_wind', {
                follow: caster,
                scale: { start: 0.5, end: 1 },
                alpha: { start: 0.5, end: 0 },
                lifespan: 300,
                frequency: 50,
                duration: 300
            });
        });

        caster.isStunned = false;

        // 7. Refresh Blood Rage
        if (caster.skill && caster.skill.constructor.name === 'BloodRage') {
            // Reset Cooldown
            caster.skill.lastCastTime = 0;
            // Force Execute
            console.log(`[Hell Dive] Refreshing Blood Rage for ${caster.unitName}!`);
            caster.skill.execute(caster, null, true); // force=true
        }
    }

    onImpact(scene, caster, x, y) {
        // Camera Shake
        scene.cameras.main.shake(200, 0.01);

        // Visuals: Explosion
        const explosionCount = 20;
        const emitter = scene.add.particles(x, y, 'emoji_star', {
            speed: { min: 100, max: 300 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 500,
            tint: [0xff4400, 0xff8800], // Fire colors
            quantity: explosionCount
        });
        emitter.explode(explosionCount);
        scene.time.delayedCall(1000, () => emitter.destroy());

        // Logical Impact: AOE
        const radius = 160;
        const targets = caster.targetGroup.getChildren().filter(e => e.active && e.hp > 0);

        // Damage Formula: (Atk * 3.0) + (MissingHP * 0.3)
        const baseAtk = caster.getTotalAtk ? caster.getTotalAtk() : caster.atk;
        const baseDmg = baseAtk * 3.0;

        targets.forEach(e => {
            const dist = Phaser.Math.Distance.Between(x, y, e.x, e.y);
            if (dist <= radius) {
                const missingHp = e.maxHp - e.hp;
                const executeDmg = missingHp * 0.3;
                const totalDmg = baseDmg + executeDmg;

                // Apply Damage
                e.takeDamage(totalDmg, caster, true); // isUltimate=true

                // Visual text for "Execute" bonus if significant
                if (executeDmg > 10 && scene.fxManager) {
                    // Maybe show a special text? default takeDamage shows text.
                }
            }
        });
    }
}
