import Phaser from 'phaser';
import SoundEffects from '../Core/SoundEffects.js';
import TrackingEmoji from '../Combat/TrackingEmoji.js';

export default class HelpPlantFriends {
    constructor(options = {}) {
        this.cooldown = options.cooldown || 12000;
        this.lastCastTime = 0;

        this.plantPool = [
            { texture: 'emoji_kiwi', type: 'ally' },
            { texture: 'emoji_grapes', type: 'ally' },
            { texture: 'emoji_watermelon', type: 'ally' },
            { texture: 'emoji_pineapple', type: 'ally' },
            { texture: 'emoji_banana', type: 'enemy' },
            { texture: 'emoji_strawberry', type: 'enemy' }
        ];
    }

    getActualCooldown(castSpd) {
        const speedMultiplier = (castSpd || 1000) / 1000;
        return this.cooldown / Math.max(0.1, speedMultiplier);
    }

    getCooldownProgress(now, castSpd) {
        if (this.lastCastTime === 0) return 1;
        const cd = this.getActualCooldown(castSpd);
        const elapsed = now - this.lastCastTime;
        return Math.max(0, Math.min(1, elapsed / cd));
    }

    execute(caster) {
        if (!caster || !caster.active || caster.hp <= 0) return false;
        const now = caster.scene.time.now;
        if (this.getCooldownProgress(now, caster.castSpd) < 1) return false;

        this.lastCastTime = now;

        console.log(`[Skill] ${caster.unitName} uses Help! Plant Friends!`);
        SoundEffects.playCuteTtanTadanSound();

        const count = Phaser.Math.Between(3, 5);
        for (let i = 0; i < count; i++) {
            caster.scene.time.delayedCall(i * 100, () => {
                SoundEffects.playTtorureukSound();
                const plant = Phaser.Utils.Array.GetRandom(this.plantPool);
                const targetGroup = plant.type === 'ally' ? caster.allyGroup : caster.targetGroup;
                if (!targetGroup || !targetGroup.getChildren) return;

                const children = targetGroup.getChildren().filter(c => c.active && c.hp > 0);
                if (children.length === 0) return;

                const target = Phaser.Utils.Array.GetRandom(children);

                new TrackingEmoji(caster.scene, caster.x, caster.y, plant.texture, target, this.getEffect(plant.texture), caster);
            });
        }
        if (caster.sprite) {
            caster.scene.tweens.killTweensOf(caster.sprite);
            caster.sprite.y = 0;
            caster.scene.tweens.add({
                targets: caster.sprite,
                y: -15,
                duration: 100,
                yoyo: true
            });
        }
        return true;
    }

    getEffect(texture) {
        switch (texture) {
            case 'emoji_kiwi': return (target, owner, scene) => {
                target.gainUltGauge(5);
                scene.fxManager.showDamageText(target, 'ULT GAUGE UP!', '#ff00ff');
            };
            case 'emoji_grapes': return (target, owner, scene) => {
                const atkSpdBoost = Math.ceil(target.getTotalAtkSpd() * 0.2);
                scene.buffManager.applyBuff(target, owner, 'Plant_AtkSpd', 5000, 0, 0, 0, { bonusAtkSpd: atkSpdBoost });
                scene.fxManager.showDamageText(target, 'ATK SPD UP!', '#ffff88');
            };
            case 'emoji_watermelon': return (target, owner, scene) => {
                const defBoost = Math.ceil(target.getTotalDef() * 0.1);
                scene.buffManager.applyBuff(target, owner, 'Plant_Def', 5000, 0, 0, 0, { bonusDef: defBoost });
                scene.fxManager.showDamageText(target, 'DEF UP!', '#55ff55');
            };
            case 'emoji_pineapple': return (target, owner, scene) => {
                const critBoost = Math.ceil(target.getTotalCrit() * 0.1);
                scene.buffManager.applyBuff(target, owner, 'Plant_Crit', 5000, 0, 0, 0, { bonusCrit: critBoost });
                scene.fxManager.showDamageText(target, 'CRIT UP!', '#ff8888');
            };
            case 'emoji_banana': return (target, owner, scene) => {
                scene.ccManager.applyShock(target, 3000);
            };
            case 'emoji_strawberry': return (target, owner, scene) => {
                scene.ccManager.applyBurn(target, 5000);
            };
        }
    }
}
