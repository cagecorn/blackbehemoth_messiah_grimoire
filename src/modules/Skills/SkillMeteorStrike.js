import Phaser from 'phaser';

/**
 * SkillMeteorStrike.js
 * Merlin's ultimate: Screen-clearing meteor rain.
 */
export default class SkillMeteorStrike {
    constructor() {
        this.name = "메테오 스트라이크";
        this.nameEng = "Meteor Strike";
    }

    /**
     * Execute the skill effect.
     * @param {Scene} scene - The current scene
     * @param {Mercenary} caster - Merlin
     */
    async execute(scene, caster) {
        if (!scene.ultimateManager) return;

        // 1. Play the cinematic
        console.log(`%c[Ultimate: ${this.name}] %c${caster.unitName} is unleashing meteor rain!`, 'color: #ffcc00; font-weight: bold;', 'color: #ffffff;');
        await scene.ultimateManager.playCutscene(caster, this.name);

        // 2. Spawn Meteors
        const meteorCount = 50; // Increased for screen-filling effect

        for (let i = 0; i < meteorCount; i++) {
            scene.time.delayedCall(i * 80, () => {
                this.spawnMeteor(scene, caster);
            });
        }
    }

    spawnMeteor(scene, caster) {
        const cam = scene.cameras.main;
        const view = cam.worldView;

        // Random target location within the current visible WORLD area
        const tx = Phaser.Math.Between(view.x - 100, view.x + view.width + 100);
        const ty = Phaser.Math.Between(view.y - 100, view.y + view.height + 100);

        // 1. Create the meteor high up and diagonally offset (relative to target world position)
        const startX = tx - 400;
        const startY = ty - 800;

        const meteor = scene.add.image(startX, startY, 'emoji_fire');
        const scale = Phaser.Math.FloatBetween(2.0, 4.5); // Even bigger!
        meteor.setDisplaySize(32 * scale, 32 * scale);
        meteor.setDepth(20000);
        meteor.setTint(0xff3300); // More intense red
        meteor.setAlpha(0.9);

        const duration = 600;

        // 2. Tween it dropping down
        scene.tweens.add({
            targets: meteor,
            x: tx,
            y: ty,
            duration: duration,
            ease: 'Sine.easeIn',
            onComplete: () => {
                if (meteor && meteor.destroy) meteor.destroy();
                this.detonate(scene, caster, tx, ty, scale);
            }
        });
    }

    detonate(scene, caster, x, y, scale) {
        if (!scene || !scene.scene || !scene.scene.isActive()) return;

        // 3. Logical Damage (AOE)
        const damage = caster.getTotalMAtk() * 0.85; // Increased impact
        const aoeRadius = 150; // Increased radius

        const targetGroup = caster.targetGroup;
        if (scene.aoeManager && targetGroup) {
            const hits = scene.aoeManager.triggerAoe(x, y, aoeRadius, damage, caster, targetGroup, true);
            if (hits.length > 0) {
                console.log(`%c[Ultimate: ${this.name}] %c${caster.unitName}%c HIT %c${hits.length}%c targets for %c${damage.toFixed(1)}%c damage!`,
                    'color: #ffcc00; font-weight: bold;',
                    'color: #38bdf8;',
                    'color: #ffffff;',
                    'color: #ff5555; font-weight: bold;',
                    'color: #ffffff;',
                    'color: #ffaa00; font-weight: bold;',
                    'color: #ffffff;'
                );
                // Shake camera slightly on hit for impact
                scene.cameras.main.shake(100, 0.002);
            }
        } else {
            console.warn(`[Ultimate: ${this.name}] No AoeManager or TargetGroup for ${caster.unitName}!`);
        }

        // 4. Visual Shatter Effect
        this.playShatterEffect(scene, x, y, scale);
    }

    playShatterEffect(scene, x, y, scale) {
        const emitter = scene.add.particles(x, y, 'emoji_fire', {
            speed: { min: 100, max: 300 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.4 * (scale / 2), end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 500,
            blendMode: 'ADD',
            tint: [0xff0000, 0xffaa00, 0xffff00],
            quantity: 15
        });

        emitter.explode(15);
        scene.time.delayedCall(800, () => {
            emitter.destroy();
        });
    }
}
