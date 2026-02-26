import Phaser from 'phaser';

export default class CarpetBombing {
    constructor(caster) {
        this.caster = caster;
        this.scene = caster.scene;
        this.name = 'Carpet Bombing';
        this.type = 'ULTIMATE';
        this.damageMultiplier = 3.5;
        this.burnDuration = 6000;
        this.aoeRadius = 120;
    }

    async execute(scene, caster) {
        if (!caster || !caster.active) return;
        if (!scene.ultimateManager) return;

        console.log(`[CarpetBombing] Executing ultimate for ${caster.unitName}`);

        // 1. Play dramatic cutscene
        await scene.ultimateManager.playCutscene(caster, this.name);

        // 2. Determine target area (usually centered on enemies)
        let targetX = 400; // default
        let targetY = 300;

        const targetGroup = caster.targetGroup;
        if (!targetGroup) return;

        const enemies = targetGroup.getChildren().filter(e => e.active && e.hp > 0);
        if (enemies.length > 0) {
            // Find centroid of enemies
            const avgX = enemies.reduce((sum, e) => sum + e.x, 0) / enemies.length;
            const avgY = enemies.reduce((sum, e) => sum + e.y, 0) / enemies.length;
            targetX = avgX;
            targetY = avgY;
        }

        // 2. Aircraft Flyover Visuals
        this.createPlanes(targetX);

        // 3. Bomb Drop Sequence
        // Drop 5 bombs in a line
        for (let i = 0; i < 5; i++) {
            const offsetX = (i - 2) * 60;
            const dropX = targetX + offsetX;
            const dropY = targetY;

            this.scene.time.delayedCall(200 + i * 150, () => {
                this.dropBomb(dropX, dropY, targetGroup);
            });
        }
    }

    createPlanes(centerX) {
        const height = this.scene.cameras.main.height;
        const width = this.scene.cameras.main.width;

        for (let i = 0; i < 3; i++) {
            const startX = width + 200 + i * 100;
            const startY = 50 + i * 40;
            const endX = -200;

            const plane = this.scene.add.image(startX, startY, 'emoji_plane')
                .setDepth(5000)
                .setScale(0.6)
                .setFlipX(true);

            plane.setTint(0x888888); // Darken for silhouette look

            this.scene.tweens.add({
                targets: plane,
                x: endX,
                duration: 2000,
                ease: 'Linear',
                onComplete: () => plane.destroy()
            });

            // Occasional contrails/clouds
            this.scene.time.addEvent({
                delay: 200,
                repeat: 5,
                callback: () => {
                    if (!plane.active) return;
                    const trail = this.scene.add.image(plane.x + 20, plane.y, 'emoji_cloud')
                        .setDepth(4999)
                        .setScale(0.15)
                        .setAlpha(0.6);

                    this.scene.tweens.add({
                        targets: trail,
                        alpha: 0,
                        scale: 0.1,
                        duration: 800,
                        onComplete: () => trail.destroy()
                    });
                }
            });
        }
    }

    dropBomb(x, y, targetGroup) {
        const bomb = this.scene.add.image(x, -50, 'emoji_bomb')
            .setDepth(3000)
            .setScale(0.4);

        this.scene.tweens.add({
            targets: bomb,
            y: y,
            angle: 360,
            duration: 600,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                bomb.destroy();
                this.explode(x, y, targetGroup);
            }
        });
    }

    explode(x, y, targetGroup) {
        // Visuals: Explosion Flash
        const flash = this.scene.add.circle(x, y, 10, 0xff3300, 0.8)
            .setDepth(3001);
        this.scene.tweens.add({
            targets: flash,
            radius: this.aoeRadius,
            alpha: 0,
            duration: 300,
            onComplete: () => flash.destroy()
        });

        // Visuals: Smoke
        for (let i = 0; i < 6; i++) {
            const smokeX = x + Phaser.Math.Between(-30, 30);
            const smokeY = y + Phaser.Math.Between(-20, 20);
            const smoke = this.scene.add.image(smokeX, smokeY, 'emoji_smoke')
                .setDepth(3002)
                .setScale(0.5)
                .setAlpha(0.8);

            this.scene.tweens.add({
                targets: smoke,
                y: smokeY - 40,
                alpha: 0,
                scale: 0.6,
                duration: 1000 + Phaser.Math.Between(0, 500),
                onComplete: () => smoke.destroy()
            });
        }

        // Camera Shake (Small per bomb)
        this.scene.cameras.main.shake(200, 0.005);

        // Damage & Status Application
        if (this.scene.aoeManager) {
            const damage = this.caster.getTotalAtk() * this.damageMultiplier;
            const hitUnits = this.scene.aoeManager.triggerAoe(x, y, this.aoeRadius, damage, this.caster, targetGroup, false, true, 'fire');

            // Apply Burn to those hit
            if (this.scene.ccManager) {
                hitUnits.forEach(u => this.scene.ccManager.applyBurn(u, this.burnDuration));
            }
        }

        // Debris Particles
        const debrisColors = [0x555555, 0x333333, 0x884400];
        for (let i = 0; i < 8; i++) {
            const color = debrisColors[Phaser.Math.Between(0, debrisColors.length - 1)];
            const debris = this.scene.add.rectangle(x, y, 4, 4, color)
                .setDepth(3001);

            const vx = Phaser.Math.Between(-150, 150);
            const vy = Phaser.Math.Between(-200, -100);

            this.scene.physics.add.existing(debris);
            debris.body.setVelocity(vx, vy);
            debris.body.setGravityY(500);
            debris.body.setBounce(0.5, 0.5);

            this.scene.time.delayedCall(1500, () => debris.destroy());
        }
    }
}
