import Phaser from 'phaser';

/**
 * ImSorry.js
 * Silvi's Ultimate: "I'm Sorry!" (죄송합니다!)
 * Silvi jumps in place and scatters sweat (1f4a6) and cry (1f62d) emojis.
 * Each emoji deals damage and knockback.
 */
export default class ImSorry {
    constructor(caster) {
        this.caster = caster;
        this.scene = caster.scene;
        this.name = '죄송합니다!';
        this.nameEng = "I'm Sorry!";
        this.duration = 4000; // 4 seconds total
        this.damageMultiplier = 1.2; // Damage per emoji hit
        this.knockbackForce = 150;
        this.isExecuting = false; // Guard
    }

    async execute(scene, caster) {
        if (!caster || !caster.active || this.isExecuting) return;
        if (!scene.ultimateManager) return;

        console.log(`[ImSorry] Executing ultimate for ${caster.unitName}`);
        this.isExecuting = true;

        // Kill any existing nudges and reset to baseline
        scene.tweens.killTweensOf(caster.sprite);
        caster.sprite.y = 0;
        caster.sprite.x = 0;

        // Store original state
        const originalScaleX = caster.sprite.scaleX;
        const originalScaleY = caster.sprite.scaleY;
        const originalY = 0; // Baseline is always 0 now

        // 1. Play dramatic cutscene
        await scene.ultimateManager.playCutscene(caster, this.name);

        caster.isStunned = true; // Block actions during sequence (except for our jumps)

        // Darken screen slightly locally around Silvi
        const aura = scene.add.circle(caster.x, caster.y, 250, 0x000000, 0.3).setDepth(caster.depth - 1);
        if (aura.postFX) {
            aura.postFX.addBlur(8, 2, 2);
        }

        // 2. Jumping and Emoji Scattering Sequence

        // Start jumping loop
        const jumpTween = scene.tweens.add({
            targets: caster.sprite,
            y: originalY - 40,
            scaleX: originalScaleX * 1.1,
            scaleY: originalScaleY * 0.9,
            duration: 150,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Scattering loop
        const scatterEvent = scene.time.addEvent({
            delay: 150,
            repeat: Math.floor(this.duration / 150),
            callback: () => {
                if (!caster.active) {
                    if (scatterEvent) scatterEvent.remove();
                    return;
                }
                this.spawnEmojis(scene, caster);
                aura.setPosition(caster.x, caster.y);
                scene.cameras.main.shake(100, 0.003);
            }
        });

        // Wait for duration
        await new Promise(resolve => scene.time.delayedCall(this.duration, () => {
            if (jumpTween) jumpTween.stop();
            if (scatterEvent) scatterEvent.remove();

            // Restore original state safely
            if (caster && caster.active && caster.sprite) {
                caster.sprite.setY(originalY);
                caster.sprite.scaleX = originalScaleX;
                caster.sprite.scaleY = originalScaleY;
            }

            if (aura) aura.destroy();
            resolve();
        }));

        caster.isStunned = false;
        this.isExecuting = false;
    }

    spawnEmojis(scene, caster) {
        // Spawn 3-4 emojis each tick
        const count = Phaser.Math.Between(3, 5);
        const emojiKeys = ['emoji_sweat', 'emoji_cry'];

        for (let i = 0; i < count; i++) {
            const key = Phaser.Math.RND.pick(emojiKeys);
            const angle = Phaser.Math.Between(0, 360);
            const speed = Phaser.Math.Between(200, 450);
            const rad = Phaser.Math.DegToRad(angle);

            const vx = Math.cos(rad) * speed;
            const vy = Math.sin(rad) * speed;

            const emoji = scene.add.image(caster.x, caster.y, key)
                .setDepth(caster.depth + 1)
                .setScale(0.8);

            scene.physics.add.existing(emoji);
            emoji.body.setVelocity(vx, vy);
            emoji.body.setDrag(100);

            // Damage logic (delayed slightly to represent flight)
            scene.time.delayedCall(100, () => {
                if (!emoji.active || !caster.active) return;
                this.checkHit(scene, caster, emoji);
            });

            // Fade out and destroy
            scene.tweens.add({
                targets: emoji,
                alpha: 0,
                scale: 1.5,
                duration: 600,
                delay: 200,
                onComplete: () => emoji.destroy()
            });
        }
    }

    checkHit(scene, caster, emoji) {
        const radius = 100;
        const targetGroup = caster.targetGroup;
        if (!targetGroup || !targetGroup.getChildren) return;
        const targets = targetGroup.getChildren().filter(e => e.active && e.hp > 0);
        const damage = caster.getTotalAtk() * this.damageMultiplier;

        // Check for weapon element synergy
        let weaponElement = null;
        if (caster && caster.getWeaponPrefix) {
            const prefix = caster.getWeaponPrefix();
            if (prefix) weaponElement = prefix.element;
        }

        targets.forEach(target => {
            const dist = Phaser.Math.Distance.Between(emoji.x, emoji.y, target.x, target.y);
            if (dist < radius) {
                // Set isUltimate to true to prevent recursive gauge gains
                target.takeDamage(damage, caster, true, weaponElement);

                // Knockback
                if (target.body) {
                    const angle = Phaser.Math.Angle.Between(caster.x, caster.y, target.x, target.y);
                    const kx = Math.cos(angle) * this.knockbackForce;
                    const ky = Math.sin(angle) * this.knockbackForce;

                    if (target.handleKnockback) {
                        target.handleKnockback(kx, ky, 200);
                    } else {
                        target.body.setVelocity(kx, ky);
                    }
                }

                if (scene.fxManager && scene.fxManager.createImpactEffect) {
                    scene.fxManager.createImpactEffect(target.x, target.y);
                }
            }
        });
    }
}
