import Phaser from 'phaser';
import soundEffects from '../Core/SoundEffects.js';

/**
 * FatesString.js
 * Ella's Ultimate: "Fate's String" (운명의 끈)
 * 1. Gather energy (visual particles)
 * 2. Fire an initial horizontal red trajectory.
 * 3. Generate crisscrossing red trajectories that damage enemies.
 */
export default class FatesString {
    constructor(caster) {
        this.caster = caster;
        this.scene = caster.scene;
        this.name = '운명의 끈';
        this.nameEng = "Fate's String";
        this.damageMultiplier = 3.0; // Total damage multiplier per strike
    }

    async execute(scene, caster) {
        if (!caster || !caster.active) return;
        if (!scene.ultimateManager) return;

        console.log(`[FatesString] Executing ultimate for ${caster.unitName}`);

        // 1. Play dramatic cutscene
        await scene.ultimateManager.playCutscene(caster, this.name);

        caster.isStunned = true; // Block actions during sequence

        // 2. Energy Gathering Phase
        await this.gatherEnergy(scene, caster);

        // 3. Initial Shot
        await this.fireInitialShot(scene, caster);

        // 4. Fate's Crisscross Phase
        await this.executeCrisscross(scene, caster);

        caster.isStunned = false;
    }

    async gatherEnergy(scene, caster) {
        // Create red/magenta particles around Ella
        const particles = scene.add.particles(caster.x, caster.y, 'emoji_sparkle', {
            speed: { min: -100, max: 100 },
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 800,
            gravityY: 0,
            quantity: 2,
            tint: 0xff0055,
            blendMode: 'ADD'
        });

        // Pull them towards the center (simple simulation)
        scene.tweens.add({
            targets: particles,
            x: caster.x,
            y: caster.y,
            duration: 1000
        });

        // Scale Ella up slightly
        scene.tweens.add({
            targets: caster.sprite,
            scaleX: caster.sprite.scaleX * 1.2,
            scaleY: caster.sprite.scaleY * 1.2,
            duration: 500,
            yoyo: true,
            ease: 'Back.easeIn'
        });

        await new Promise(resolve => scene.time.delayedCall(1000, () => {
            particles.destroy();
            resolve();
        }));
    }

    async fireInitialShot(scene, caster) {
        const startX = caster.x;
        const startY = caster.y;

        const cam = scene.cameras.main;
        const view = cam.worldView;

        // Initial shot goes horizontally across the visible screen
        const direction = (caster.sprite.scaleX > 0) ? -1 : 1;
        const endX = direction === -1 ? view.left - 200 : view.right + 200;
        const endY = startY;

        soundEffects.playWhipSound();
        this.createTrajectoryLine(scene, startX, startY, endX, endY, 600);
        this.applyLineDamage(scene, caster, startX, startY, endX, endY);

        await new Promise(resolve => scene.time.delayedCall(300, resolve));
    }

    async executeCrisscross(scene, caster) {
        const cam = scene.cameras.main;
        const view = cam.worldView;
        const padding = 200; // Extend well beyond the screen edges

        // Number of lines
        const lineCount = 12; // Increased from 8 for more coverage

        for (let i = 0; i < lineCount; i++) {
            let startX, startY, endX, endY;

            // Pick a random starting edge
            const side = Phaser.Math.Between(0, 3); // 0:Left, 1:Right, 2:Top, 3:Bottom
            if (side === 0) { startX = view.left - padding; startY = Phaser.Math.Between(view.top, view.bottom); }
            else if (side === 1) { startX = view.right + padding; startY = Phaser.Math.Between(view.top, view.bottom); }
            else if (side === 2) { startX = Phaser.Math.Between(view.left, view.right); startY = view.top - padding; }
            else { startX = Phaser.Math.Between(view.left, view.right); startY = view.bottom + padding; }

            // 70% chance to target an enemy, otherwise random crisscross
            const enemies = caster.targetGroup.getChildren().filter(e => e.active && e.hp > 0);
            if (Math.random() < 0.7 && enemies.length > 0) {
                const target = Phaser.Utils.Array.GetRandom(enemies);
                // Extend the line through the target
                const angle = Phaser.Math.Angle.Between(startX, startY, target.x, target.y);
                const length = 2500; // Long enough to cross screen
                endX = startX + Math.cos(angle) * length;
                endY = startY + Math.sin(angle) * length;
            } else {
                // Original random logic
                const oppositeSide = (side + 2) % 4; // Roughly opposite
                if (oppositeSide === 0) { endX = view.left - padding; endY = Phaser.Math.Between(view.top, view.bottom); }
                else if (oppositeSide === 1) { endX = view.right + padding; endY = Phaser.Math.Between(view.top, view.bottom); }
                else if (oppositeSide === 2) { endX = Phaser.Math.Between(view.left, view.right); endY = view.top - padding; }
                else { endX = Phaser.Math.Between(view.left, view.right); endY = view.bottom + padding; }
            }

            // Stagger the lines
            scene.time.delayedCall(i * 150, () => {
                soundEffects.playWhipSound();
                soundEffects.vibrate(50);
                this.createTrajectoryLine(scene, startX, startY, endX, endY, 400);
                this.applyLineDamage(scene, caster, startX, startY, endX, endY);
                scene.cameras.main.shake(100, 0.005);
            });
        }

        await new Promise(resolve => scene.time.delayedCall(lineCount * 150 + 500, resolve));
    }

    createTrajectoryLine(scene, x1, y1, x2, y2, duration) {
        const graphics = scene.add.graphics().setDepth(100);

        // Core line
        graphics.lineStyle(2, 0xffffff, 1);
        graphics.beginPath();
        graphics.moveTo(x1, y1);
        graphics.lineTo(x2, y2);
        graphics.strokePath();

        // Glow line
        graphics.lineStyle(12, 0xff0000, 0.4); // Thicker glow
        graphics.beginPath();
        graphics.moveTo(x1, y1);
        graphics.lineTo(x2, y2);
        graphics.strokePath();

        // Secondary inner glow
        graphics.lineStyle(6, 0xff00bb, 0.6);
        graphics.beginPath();
        graphics.moveTo(x1, y1);
        graphics.lineTo(x2, y2);
        graphics.strokePath();

        scene.tweens.add({
            targets: graphics,
            alpha: 0,
            duration: duration,
            ease: 'Expo.easeOut',
            onComplete: () => graphics.destroy()
        });

        // Add some "string" particles along the way if possible
    }

    applyLineDamage(scene, caster, x1, y1, x2, y2) {
        if (!caster || !caster.active || !caster.targetGroup) return;

        const targets = caster.targetGroup.getChildren().filter(e => e.active && e.hp > 0);
        const damage = caster.getTotalAtk() * this.damageMultiplier;

        // Check for weapon element
        let weaponElement = null;
        if (caster && caster.getWeaponPrefix) {
            const prefix = caster.getWeaponPrefix();
            if (prefix) weaponElement = prefix.element;
        }

        targets.forEach(target => {
            // Simple distance from point to line segment check
            const dist = this.getPointLineDistance(target.x, target.y, x1, y1, x2, y2);
            if (dist < 60) { // Increased hit detection width from 40 to 60
                target.takeDamage(damage, caster, true, weaponElement);
                if (scene.fxManager && scene.fxManager.createImpactEffect) {
                    scene.fxManager.createImpactEffect(target.x, target.y);
                }
            }
        });
    }

    getPointLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        if (len_sq !== 0) param = dot / len_sq;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
