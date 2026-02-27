import Phaser from 'phaser';
import BoonClone from '../Player/BoonClone.js';

/**
 * ProveExistence.js
 * Boon's Ultimate: "너의 존재를 증명하라!"
 * Dual Mode:
 * 1. Summon protective clone if none exists.
 * 2. Execute Smite (Lightning) if clone is active.
 */
export default class ProveExistence {
    constructor(caster) {
        this.caster = caster;
        this.scene = caster.scene;
        this.name = "너의 존재를 증명하라!";
        this.nameSmite = "스마이트";

        this.activeClone = null;

        // Smite settings
        this.smiteDamageMultiplier = 3.0; // Based on mAtk
        this.smiteRadius = 150;

        // Custom logic for caster to track clone death
        this.caster.onCloneDied = () => {
            this.activeClone = null;
        };
    }

    async execute(scene, caster) {
        if (!scene.ultimateManager) return;

        const isCloneActive = this.activeClone && this.activeClone.active && this.activeClone.hp > 0;

        if (!isCloneActive) {
            // --- SUMMON MODE ---
            await scene.ultimateManager.playCutscene(caster, this.name);
            this.summonClone();
        } else {
            // --- SMITE MODE ---
            // Maybe a smaller cutscene or just the text/fx for Smite?
            // User requested "Smite instead", let's do a quick text/flash.
            console.log("[ProveExistence] Clone active, executing Smite!");
            this.executeSmite();
        }
    }

    summonClone() {
        const x = this.caster.x + 50;
        const y = this.caster.y;

        this.activeClone = new BoonClone(this.scene, x, y, this.caster);

        // Add to appropriate groups
        if (this.scene.mercenaries) {
            this.scene.mercenaries.add(this.activeClone);
        }

        // Visual summon effect
        this.scene.fxManager.createMagicCircle(this.activeClone, 0xffcc00);
        this.scene.fxManager.showDamageText(this.activeClone, 'PROVE!', '#ffffff');
    }

    executeSmite() {
        // Find center of most enemies
        const targetGroup = this.caster.targetGroup;
        if (!targetGroup) return;

        const enemies = targetGroup.getChildren().filter(e => e.active && e.hp > 0);
        if (enemies.length === 0) return;

        // Find enemy centroid
        const avgX = enemies.reduce((sum, e) => sum + e.x, 0) / enemies.length;
        const avgY = enemies.reduce((sum, e) => sum + e.y, 0) / enemies.length;

        // Visual FX: Lightning strike (Layered Pillar)
        const layers = 5;
        const lightningSprites = [];

        for (let i = 0; i < layers; i++) {
            const scale = 1.5 + (i * 0.4);
            const alpha = 1.0 - (i * 0.15);
            const lightning = this.scene.add.image(avgX, avgY - 400, 'emoji_lightning')
                .setDepth(3002 + i)
                .setScale(scale)
                .setAlpha(alpha)
                .setTint(0xffffff)
                .setBlendMode('ADD');

            lightningSprites.push(lightning);

            this.scene.tweens.add({
                targets: lightning,
                y: avgY,
                alpha: { start: alpha, end: 0 },
                duration: 300 + (i * 50),
                ease: 'Expo.easeIn',
                onComplete: () => {
                    lightning.destroy();
                    if (i === 0) {
                        this.smiteImpact(avgX, avgY);
                    }
                }
            });
        }

        // Flash and Camera Shake
        this.scene.cameras.main.shake(200, 0.01);
        this.scene.fxManager.showDamageText({ x: avgX, y: avgY }, '[ SMITE ]', '#ffff00');
    }

    smiteImpact(x, y) {
        // Visual: Blast circle
        const circle = this.scene.add.circle(x, y, 10, 0xffffff, 0.8)
            .setDepth(3001);
        this.scene.tweens.add({
            targets: circle,
            radius: this.smiteRadius,
            alpha: 0,
            duration: 400,
            onComplete: () => circle.destroy()
        });

        // Damage logic
        const mAtk = this.caster.getTotalMAtk ? this.caster.getTotalMAtk() : this.caster.mAtk;
        const damage = mAtk * this.smiteDamageMultiplier;

        const targetGroup = this.caster.targetGroup;
        if (!targetGroup || !targetGroup.getChildren) return;
        const enemies = targetGroup.getChildren();

        // Check for weapon element
        let weaponElement = null;
        if (this.caster && this.caster.getWeaponPrefix) {
            const prefix = this.caster.getWeaponPrefix();
            if (prefix) weaponElement = prefix.element;
        }

        enemies.forEach(enemy => {
            if (!enemy.active || enemy.hp <= 0) return;
            const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
            if (dist <= this.smiteRadius) {
                // Magic damage
                if (enemy.takeMagicDamage) {
                    enemy.takeMagicDamage(damage, this.caster, true, weaponElement);
                } else if (enemy.takeDamage) {
                    enemy.takeDamage(damage, this.caster, true, weaponElement);
                }
            }
        });
    }
}
