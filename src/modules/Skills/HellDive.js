import Phaser from 'phaser';

/**
 * HellDive.js
 * King's Ultimate: "Hell Dive" (헬 다이브)
 *
 * Revised Implementation:
 * 1. Jump Phase: Jump up with a Phoenix overlay (Red Tint + Glow).
 * 2. Hang Time: Brief hover with intense visual effects.
 * 3. Descent Phase: Meteor overlay (Rotated to slide direction), Afterimages (Ghosting).
 * 4. Impact & Slide: Land, slide forward, creating friction dust and dealing Line Damage.
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

        // 2. Setup Variables
        caster.isStunned = true; // Block actions
        caster.body.setVelocity(0, 0);

        const jumpHeight = -300;
        const jumpDuration = 400; // Time to reach peak
        const hangTime = 200;      // Time at peak (intense glow)
        const descentDuration = 250; // Fast slam
        const slideDuration = 400; // Slide on ground
        const slideDistance = 250; // Distance to slide
        const originalY = caster.y;

        // Determine Direction (Left or Right)
        // Mercenary class uses scaleX to flip. Default sprite faces Left.
        // scaleX > 0 => Left. scaleX < 0 => Right.
        const isFacingLeft = caster.sprite ? (caster.sprite.scaleX > 0) : caster.flipX;
        const direction = isFacingLeft ? -1 : 1;
        const targetX = caster.x + (slideDistance * direction);

        // --- Jump Phase ---

        // Create Phoenix "Sprite" (Text treated as Sprite)
        const phoenix = scene.add.text(caster.x, caster.y - 50, '🐦‍🔥', {
            fontSize: '64px'
        }).setOrigin(0.5).setDepth(caster.depth + 10);

        // Initial Tween: Jump Up
        scene.tweens.add({
            targets: [caster, phoenix],
            y: caster.y + jumpHeight,
            duration: jumpDuration,
            ease: 'Back.easeOut'
        });

        // Wait for Jump to finish
        await new Promise(resolve => scene.time.delayedCall(jumpDuration, resolve));

        // --- Hang Time (Red Tint & Glow) ---

        // Apply Red Tint & Glow Pulse
        phoenix.setTint(0xff0000); // Red
        // Add a "Glow" effect via scale/alpha pulse
        scene.tweens.add({
            targets: phoenix,
            scale: 1.5,
            alpha: 1, // Ensure fully visible
            duration: hangTime,
            yoyo: true,
            repeat: 0,
            ease: 'Sine.easeInOut'
        });

        // Caster also glows red briefly
        const originalTint = caster.tint;
        caster.setTint(0xff0000);

        await new Promise(resolve => scene.time.delayedCall(hangTime, resolve));

        // --- Descent Phase ---

        // Swap Phoenix -> Meteor
        phoenix.destroy();

        const meteor = scene.add.text(caster.x, caster.y - 50, '☄️', {
            fontSize: '64px'
        }).setOrigin(0.5).setDepth(caster.depth + 10);

        // Rotate Meteor to match slide direction
        // '☄️' usually tails Top-Right, heads Bottom-Left.
        if (isFacingLeft) {
             // Sliding Left: Default orientation (Bottom-Left) matches well.
             // Just ensure scale is positive.
             meteor.setScale(1, 1);
             meteor.setAngle(0);
        } else {
             // Sliding Right: Flip horizontally to point Bottom-Right.
             meteor.setScale(-1, 1);
             meteor.setAngle(0);
        }

        // Add Red Tint/Glow to Meteor too
        meteor.setTint(0xff4400); // Orange-Red

        // Start Descent Tween
        let descentTween = scene.tweens.add({
            targets: [caster, meteor],
            y: originalY,
            duration: descentDuration,
            ease: 'Quad.easeIn' // Accelerate down
        });

        // Ghosting / Afterimage Effect during Descent
        const ghostInterval = scene.time.addEvent({
            delay: 40,
            repeat: Math.floor(descentDuration / 40),
            callback: () => {
                this.createGhost(scene, caster);
                // Also ghost the meteor?
                this.createGhostText(scene, meteor);
            }
        });

        await new Promise(resolve => descentTween.setCallback('onComplete', resolve));

        // Cleanup Descent
        meteor.destroy();
        ghostInterval.remove();
        caster.clearTint(); // Restore tint (or set to white)
        if (originalTint !== undefined && originalTint !== 0xffffff) caster.setTint(originalTint);

        // --- Impact & Slide Phase ---

        // 1. Initial Impact Visuals
        scene.cameras.main.shake(100, 0.02);
        this.createImpactExplosion(scene, caster.x, caster.y);

        // 2. Slide Tween
        // Slide caster to targetX
        scene.tweens.add({
            targets: caster,
            x: targetX,
            duration: slideDuration,
            ease: 'Power2'
        });

        // 3. Dust Particles (Friction)
        // We want particles to spawn continuously during the slide
        const dustEmitter = scene.add.particles(0, 0, 'emoji_wind', {
            follow: caster,
            followOffset: { x: 0, y: caster.height / 2 }, // At feet
            scale: { start: 0.5, end: 1.2 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 400,
            frequency: 40, // Frequent emission
            quantity: 2,
            tint: 0xdddddd,
            blendMode: 'ADD'
        });

        // 4. Line Damage Logic
        // We apply damage *along the path*.
        // Simplest way: Define a Rectangle and query overlap.
        // Center of the slide path:
        const centerX = (caster.x + targetX) / 2;
        const centerY = caster.y;
        const rectWidth = Math.abs(targetX - caster.x) + 60; // Include caster width
        const rectHeight = 80;

        // Visual debug (optional, usually commented out)
        // const debugRect = scene.add.rectangle(centerX, centerY, rectWidth, rectHeight, 0xff0000, 0.3);
        // scene.time.delayedCall(500, () => debugRect.destroy());

        this.applyLineDamage(scene, caster, centerX, centerY, rectWidth, rectHeight);

        // Wait for slide to finish
        await new Promise(resolve => scene.time.delayedCall(slideDuration, resolve));

        // Cleanup Slide
        dustEmitter.destroy();
        caster.isStunned = false;

        // --- Refresh Blood Rage (Existing Logic) ---
        if (caster.skill && caster.skill.constructor.name === 'BloodRage') {
            caster.skill.lastCastTime = 0;
            console.log(`[Hell Dive] Refreshing Blood Rage for ${caster.unitName}!`);
            caster.skill.execute(caster, null, true);
        }
    }

    createGhost(scene, target) {
        const textureKey = target.sprite ? target.sprite.texture.key : target.texture.key;
        const frameName = target.sprite ? target.sprite.frame.name : target.frame.name;

        const ghost = scene.add.sprite(target.x, target.y, textureKey, frameName);

        if (target.sprite) {
            ghost.setScale(target.sprite.scaleX, target.sprite.scaleY);
            ghost.setFlipX(target.sprite.flipX);
            ghost.setOrigin(target.sprite.originX, target.sprite.originY);
        } else {
            ghost.setScale(target.scaleX, target.scaleY);
            ghost.setFlipX(target.flipX);
            ghost.setOrigin(target.originX, target.originY);
        }

        ghost.setAlpha(0.5);
        ghost.setTint(0xff0000); // Red ghost
        ghost.setDepth(target.depth - 1);

        scene.tweens.add({
            targets: ghost,
            alpha: 0,
            scaleX: ghost.scaleX * 1.2,
            scaleY: ghost.scaleY * 1.2,
            duration: 300,
            onComplete: () => ghost.destroy()
        });
    }

    createGhostText(scene, targetText) {
        const ghost = scene.add.text(targetText.x, targetText.y, targetText.text, targetText.style);
        ghost.setOrigin(targetText.originX, targetText.originY);
        ghost.setScale(targetText.scaleX, targetText.scaleY);
        ghost.setAngle(targetText.angle);
        ghost.setAlpha(0.4);
        ghost.setTint(0xff4400);
        ghost.setDepth(targetText.depth - 1);

        scene.tweens.add({
            targets: ghost,
            alpha: 0,
            scaleX: targetText.scaleX * 1.5,
            scaleY: targetText.scaleY * 1.5,
            duration: 300,
            onComplete: () => ghost.destroy()
        });
    }

    createImpactExplosion(scene, x, y) {
        // Star/Spark burst
        const explosion = scene.add.particles(x, y, 'emoji_star', {
            speed: { min: 150, max: 350 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            tint: [0xff0000, 0xff8800], // Fire colors
            blendMode: 'ADD',
            quantity: 20,
            emitting: false
        });
        explosion.explode(20);
        scene.time.delayedCall(1000, () => explosion.destroy());
    }

    applyLineDamage(scene, caster, rectX, rectY, width, height) {
        const targets = caster.targetGroup.getChildren().filter(e => e.active && e.hp > 0);
        const damageRect = new Phaser.Geom.Rectangle(rectX - width / 2, rectY - height / 2, width, height);

        // Base Damage: (Atk * 3.5) + Execute
        const baseAtk = caster.getTotalAtk ? caster.getTotalAtk() : caster.atk;
        const baseDmg = baseAtk * 3.5;

        targets.forEach(e => {
            // Check if enemy center is inside the rectangle
            if (Phaser.Geom.Rectangle.Contains(damageRect, e.x, e.y)) {
                const missingHp = e.maxHp - e.hp;
                const executeDmg = missingHp * 0.3; // 30% missing HP
                const totalDmg = baseDmg + executeDmg;

                e.takeDamage(totalDmg, caster, true); // isUltimate=true

                // Extra visual hit effect
                if (scene.fxManager) {
                    scene.fxManager.createSlash(e.x, e.y); // Assuming a slash effect exists, or similar
                }
            }
        });
    }
}
