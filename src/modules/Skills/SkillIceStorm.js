import Phaser from 'phaser';
import SoundEffects from '../Core/SoundEffects.js';
import EventBus from '../Events/EventBus.js';

/**
 * SkillIceStorm.js
 * Ultimate skill for Aina. Summons a tracking snow cloud.
 */
export default class SkillIceStorm {
    constructor() {
        this.id = 'skill_ice_storm';
        this.name = 'Ice Storm';
        this.duration = 15000;
        this.damageInterval = 500; // Drop a snowball every 0.5s
    }

    async execute(scene, caster) {
        if (!scene || !caster) return;

        // Show Cutscene if possible
        if (scene.ultimateManager) {
            await scene.ultimateManager.playCutscene(caster, this.name);
            SoundEffects.playWindSound();
        } else {
            EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `[궁극기] ${caster.unitName}: 아이스 스톰! 🌨️`);
        }

        // 1. Create a Container to hold all cloud layers
        // This allows us to move the container while clouds "float" relatively inside it.
        const cloudContainer = scene.add.container(caster.x, caster.y - 100);
        cloudContainer.setDepth(2000);

        const clouds = [];
        const layerCount = 5;
        const colors = [0xffffff, 0xddddff, 0xccccff, 0xbbddff, 0xeeeeff];
        const scales = [2.2, 1.8, 2.4, 2.0, 2.6];

        for (let i = 0; i < layerCount; i++) {
            // Positions are relative to container (0, 0)
            const cloud = scene.add.image(0, 0, 'emoji_snowcloud');
            cloud.setScale(0);
            cloud.setAlpha(0.25); // Lower alpha for better layering with ADD
            cloud.setTint(colors[i]);
            cloud.setBlendMode('ADD'); // Glow effect

            cloudContainer.add(cloud);

            scene.tweens.add({
                targets: cloud,
                scale: scales[i],
                duration: 800,
                ease: 'Back.easeOut',
                delay: i * 120
            });

            // "Floating" animation (relative movement inside container)
            scene.tweens.add({
                targets: cloud,
                y: '-=15',
                x: i % 2 === 0 ? '+=20' : '-=20',
                duration: 2500 + (i * 400),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            clouds.push(cloud);
        }

        // 1.5 Internal Sparkles: Tiny ice grains/sparkles inside the cloud
        const internalSparkles = scene.add.particles(0, 0, 'emoji_sparkles', {
            speed: { min: 20, max: 80 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 1500,
            frequency: 100,
            blendMode: 'ADD',
            emitZone: {
                type: 'random',
                source: new Phaser.Geom.Circle(0, 0, 80)
            }
        });
        cloudContainer.add(internalSparkles);
        internalSparkles.setDepth(1); // Above the clouds

        // 2. Tracking & Dropping Logic
        const totalMAtk = caster.getTotalMAtk ? caster.getTotalMAtk() : caster.mAtk;
        const damage = totalMAtk * 0.45;
        const interval = 200;

        const dropTimer = scene.time.addEvent({
            delay: interval,
            callback: () => {
                if (!cloudContainer.active) return;
                this.dropSnowball(scene, caster, cloudContainer, damage);
            },
            repeat: Math.floor(this.duration / interval) - 1
        });

        // Tracking loop (update container position)
        const trackUpdate = (time, delta) => {
            if (!cloudContainer || !cloudContainer.active) {
                scene.events.off('update', trackUpdate);
                return;
            }

            // Find target cluster or nearest enemy
            const target = this.findCloudTarget(caster, cloudContainer);
            if (target) {
                const targetY = target.y - 180;
                const speed = 180;

                const angle = Phaser.Math.Angle.Between(cloudContainer.x, cloudContainer.y, target.x, targetY);
                const dist = Phaser.Math.Distance.Between(cloudContainer.x, cloudContainer.y, target.x, targetY);

                if (dist > 10) {
                    cloudContainer.x += Math.cos(angle) * speed * (delta / 1000);
                    cloudContainer.y += Math.sin(angle) * speed * (delta / 1000);
                }
            } else {
                // [DEBUG] If no target, cloud should ideally float or move toward center, NOT track caster
                // console.log(`[IceStorm Debug] No target found for cloud at (${Math.round(cloudContainer.x)}, ${Math.round(cloudContainer.y)})`);
            }
        };
        scene.events.on('update', trackUpdate);

        // 3. Cleanup
        scene.time.delayedCall(this.duration, () => {
            if (cloudContainer && cloudContainer.active) {
                scene.tweens.add({
                    targets: cloudContainer,
                    alpha: 0,
                    scale: 0.5,
                    duration: 800,
                    onComplete: () => {
                        cloudContainer.destroy();
                        scene.events.off('update', trackUpdate);
                    }
                });
            }
        });
    }

    findCloudTarget(caster, cloud) {
        const group = caster.targetGroup;
        if (!group) {
            // console.warn(`[IceStorm Debug] ${caster.unitName} has no targetGroup! Team: ${caster.team}`);
            return null;
        }

        const allChildren = group.getChildren();
        // Defensive filter: check active, hp > 0, and body existence
        const activeEnemies = allChildren.filter(e => e.active && (e.hp === undefined || e.hp > 0) && e.body);

        if (activeEnemies.length === 0) {
            // Keep the log the user asked for to debug tracking
            if (allChildren.length > 0) {
                const s = allChildren[0];
                console.log(`[아이스스톰 디버그] 적 ${allChildren.length}명 감지됨, 하지만 추적 대상 없음 (상태 불량). 예시: ${s.unitName}, 활성: ${s.active}, HP: ${s.hp}`);
            }
            return null;
        }

        // Find nearest enemy to the CLOUD, not the caster
        let nearest = null;
        let minDist = Infinity;
        for (const e of activeEnemies) {
            // EXCLUDE CASTER HERSELF (Safety check)
            if (e === caster) continue;

            const d = Phaser.Math.Distance.Between(cloud.x, cloud.y, e.x, e.y);
            if (d < minDist) {
                minDist = d;
                nearest = e;
            }
        }

        if (nearest) {
            // console.log(`[아이스스톰 디버그] 대상 발견: ${nearest.unitName} (거리: ${Math.round(minDist)})`);
        }
        return nearest;
    }

    dropSnowball(scene, caster, cloud, damage) {
        // Drop at random offset under the cloud
        const startX = cloud.x + Phaser.Math.Between(-60, 60);
        const startY = cloud.y + 40;

        // Random target near the cloud's footprint
        const targetX = startX + Phaser.Math.Between(-80, 80);
        const targetY = startY + 200 + Phaser.Math.Between(-30, 30);

        scene.projectileManager.fire(
            startX, startY, targetX, targetY,
            damage, 'emoji_snowball', true, caster.targetGroup, caster,
            {
                speed: 600, // Faster drop
                pierceCount: 3, // Hits up to 3 times (multi-hit)
                hitCooldown: 250, // Per-unit hit cooldown
                onHit: (hitTarget) => {
                    // Logic: AOE + Freeze
                    if (scene.aoeManager) {
                        scene.aoeManager.triggerAoe(
                            hitTarget.x, hitTarget.y, 100,
                            damage * 0.5, caster, caster.targetGroup, true, true, 'ice'
                        );
                    }
                    if (hitTarget.applyFreeze) {
                        hitTarget.applyFreeze(3000); // 3s freeze
                    }

                    // Impact Shard Particles
                    const shardCount = 6;
                    const emitter = scene.add.particles(hitTarget.x, hitTarget.y, 'emoji_snowball', {
                        speed: { min: 100, max: 300 },
                        angle: { min: 0, max: 360 },
                        scale: { start: 0.2, end: 0 },
                        alpha: { start: 0.8, end: 0 },
                        lifespan: 400,
                        gravityY: 400,
                        tint: 0xccddff,
                        quantity: shardCount
                    });
                    emitter.explode(shardCount);
                    // Single burst cleanup handled by Phaser internally if not looping,
                    // but we'll destroy it after lifespan just to be safe.
                    scene.time.delayedCall(500, () => emitter.destroy());
                }
            },
            true, 'ice' // isUltimate, element
        );
    }
}
