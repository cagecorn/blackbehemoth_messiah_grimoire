import Phaser from 'phaser';

/**
 * SkillMessiah.js
 * Aren's ultimate: "Messiah, for You!" (메시아를 위하여!)
 * High-impact jump slam with multi-CC.
 */
export default class SkillMessiah {
    constructor() {
        this.name = "메시아를 위하여!";
        this.nameEng = "Messiah, for You!";
    }

    async execute(scene, caster) {
        if (!scene.ultimateManager) return;

        // 1. Play dramatic cutscene
        await scene.ultimateManager.playCutscene(caster, this.name);

        // 2. Jump Phase
        caster.isStunned = true; // Block actions during jump
        caster.body.setVelocity(0, 0);

        const jumpHeight = -400;
        const jumpDuration = 500;

        await new Promise(resolve => {
            scene.tweens.add({
                targets: caster,
                y: caster.y + jumpHeight,
                alpha: 0,
                scaleX: 0.5,
                scaleY: 1.5,
                duration: jumpDuration,
                ease: 'Back.easeIn',
                onComplete: resolve
            });
        });

        // 3. Target Phase - Find densest area
        const targetPoint = this.findDensestEnemyArea(scene, caster);
        caster.setPosition(targetPoint.x, targetPoint.y - 800);

        // 4. Descent Phase
        await new Promise(resolve => {
            // Afterimage trailer
            const timer = scene.time.addEvent({
                delay: 30,
                repeat: 15,
                callback: () => {
                    if (scene.fxManager) scene.fxManager.createAfterimage(caster, 400, 0.6);
                }
            });

            scene.tweens.add({
                targets: caster,
                y: targetPoint.y,
                alpha: 1,
                scaleX: 1,
                scaleY: 1,
                duration: 400,
                ease: 'Expo.easeIn',
                onComplete: () => {
                    timer.remove();
                    resolve();
                }
            });
        });

        // 5. Impact Phase
        this.onImpact(scene, caster, targetPoint.x, targetPoint.y);

        caster.isStunned = false;
    }

    findDensestEnemyArea(scene, caster) {
        if (!caster || !caster.targetGroup) return { x: caster.x, y: caster.y };
        const enemies = caster.targetGroup.getChildren().filter(e => e.active && e.hp > 0);
        if (enemies.length === 0) return { x: caster.x, y: caster.y };

        // Simple heuristic: Most enemies within 150px
        let bestPoint = { x: caster.x, y: caster.y };
        let maxCount = -1;

        enemies.forEach(e => {
            const count = enemies.filter(other =>
                Phaser.Math.Distance.Between(e.x, e.y, other.x, other.y) < 150
            ).length;
            if (count > maxCount) {
                maxCount = count;
                bestPoint = { x: e.x, y: e.y };
            }
        });

        return bestPoint;
    }

    onImpact(scene, caster, x, y) {
        // Camera Shake
        scene.cameras.main.shake(300, 0.015);

        // Visuals: Shockwave
        const shockwave = scene.add.circle(x, y, 10, 0xffffff, 0.8);
        shockwave.setDepth(2000);
        scene.tweens.add({
            targets: shockwave,
            radius: 200,
            alpha: 0,
            duration: 400,
            onComplete: () => shockwave.destroy()
        });

        // Particles: Emoji Explosion
        const explosionCount = 30;
        const emitter = scene.add.particles(x, y, 'emoji_star', {
            speed: { min: 200, max: 600 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            gravityY: 400,
            tint: [0xff3300, 0xffcc00, 0xffff00],
            quantity: explosionCount
        });
        emitter.explode(explosionCount);
        scene.time.delayedCall(1000, () => emitter.destroy());

        // Impact secondary particles (dust/ground)
        const dust = scene.add.particles(x, y, 'emoji_wind', {
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 1.5 },
            alpha: { start: 0.5, end: 0 },
            lifespan: 800,
            quantity: 10
        });
        dust.explode(10);
        scene.time.delayedCall(1000, () => dust.destroy());

        // Logical Impact: AOE
        const damage = caster.getTotalAtk() * 4.0;
        const radius = 180;
        if (!caster.targetGroup) return;
        const targets = caster.targetGroup.getChildren().filter(e => e.active && e.hp > 0);

        // Check for weapon element
        let weaponElement = null;
        if (caster && caster.getWeaponPrefix) {
            const prefix = caster.getWeaponPrefix();
            if (prefix) weaponElement = prefix.element;
        }

        targets.forEach(e => {
            const dist = Phaser.Math.Distance.Between(x, y, e.x, e.y);
            if (dist <= radius) {
                // Damage (Pass isUltimate = true)
                e.takeDamage(damage, caster, true, weaponElement);

                // 1. Airborne CC
                e.isAirborne = true;
                const originalY = e.y;
                scene.tweens.add({
                    targets: e,
                    y: originalY - 150,
                    duration: 400,
                    yoyo: true,
                    ease: 'Quad.easeOut',
                    onComplete: () => {
                        e.isAirborne = false;
                        if (e.active && e.hp > 0) {
                            // 2. Stun CC on landing
                            e.isStunned = true;
                            if (scene.fxManager) {
                                scene.fxManager.createStunEffect(e, 500);
                            }
                        }
                    }
                });
            }
        });
    }
}
