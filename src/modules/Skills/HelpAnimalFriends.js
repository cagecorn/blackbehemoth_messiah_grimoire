import Phaser from 'phaser';
import SoundEffects from '../Core/SoundEffects.js';
import TrackingEmoji from '../Combat/TrackingEmoji.js';

export default class HelpAnimalFriends {
    constructor(options = {}) {
        this.cooldown = options.cooldown || 12000;
        this.lastCastTime = 0;

        this.animalPool = [
            { texture: 'emoji_dog', type: 'ally' },
            { texture: 'emoji_cat', type: 'ally' },
            { texture: 'emoji_horse', type: 'ally' },
            { texture: 'emoji_pig', type: 'ally' },
            { texture: 'emoji_tiger', type: 'enemy' },
            { texture: 'emoji_bison', type: 'enemy' },
            { texture: 'emoji_sheep', type: 'enemy' }
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

        console.log(`[Skill] ${caster.unitName} uses Help! Animal Friends!`);
        SoundEffects.playCuteTtanTadanSound();

        const count = Phaser.Math.Between(3, 5);
        for (let i = 0; i < count; i++) {
            caster.scene.time.delayedCall(i * 100, () => {
                SoundEffects.playTtorureukSound();
                const animal = Phaser.Utils.Array.GetRandom(this.animalPool);
                const targetGroup = animal.type === 'ally' ? caster.allyGroup : caster.targetGroup;
                if (!targetGroup || !targetGroup.getChildren) return;

                const children = targetGroup.getChildren().filter(c => c.active && c.hp > 0);
                if (children.length === 0) return;

                const target = Phaser.Utils.Array.GetRandom(children);

                new TrackingEmoji(caster.scene, caster.x, caster.y, animal.texture, target, this.getEffect(animal.texture), caster);
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
            case 'emoji_dog': return (target, owner, scene) => {
                if (target.skill) {
                    const cd = target.skill.getActualCooldown ? target.skill.getActualCooldown(target.castSpd) : (target.skill.cooldown || 8000);
                    target.skill.lastCastTime = (target.skill.lastCastTime || 0) - cd * 0.3;
                    scene.fxManager.showDamageText(target, 'CD REDUCED!', '#ffff00');
                }
            };
            case 'emoji_cat': return (target, owner, scene) => {
                const evaBoost = Math.ceil(target.getTotalEva() * 0.1);
                scene.buffManager.applyBuff(target, owner, 'Animal_Evasion', 5000, 0, 0, 0, { bonusEva: evaBoost });
                scene.fxManager.showDamageText(target, 'EVA UP!', '#55ff55');
            };
            case 'emoji_horse': return (target, owner, scene) => {
                const speedBoost = Math.ceil(target.getTotalSpeed() * 0.1);
                scene.buffManager.applyBuff(target, owner, 'Animal_Speed', 5000, 0, 0, 0, { bonusSpeed: speedBoost });
                scene.fxManager.showDamageText(target, 'SPEED UP!', '#55ff55');
            };
            case 'emoji_pig': return (target, owner, scene) => {
                const heal = target.maxHp * 0.2;
                target.receiveHeal(heal);
                scene.fxManager.showHealText(target, `+${Math.round(heal)}`, '#55ff55');
            };
            case 'emoji_tiger': return (target, owner, scene) => {
                const matk = (owner && owner.getTotalMAtk) ? owner.getTotalMAtk() : 20;
                target.takeDamage(matk * 2.0, owner, false);
            };
            case 'emoji_bison': return (target, owner, scene) => {
                scene.ccManager.applyAirborne(target, 1000);
            };
            case 'emoji_sheep': return (target, owner, scene) => {
                scene.ccManager.applySleep(target, 3000);
            };
        }
    }
}
