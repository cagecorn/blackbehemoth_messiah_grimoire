import Phaser from 'phaser';
import soundEffects from '../Core/SoundEffects.js';

/**
 * SongOfProtection.js
 * A skill for the Bard that grants a party-wide shield based on magic attack,
 * featuring musical visual effects.
 */
export default class SongOfProtection {
    constructor(options = {}) {
        this.cooldown = options.cooldown || 10000;
        this.shieldMultiplier = options.shieldMultiplier || 2.5;
        this.shieldDuration = options.shieldDuration || 5000; // 5 seconds
        this.lastCastTime = 0;
    }

    /**
     * Calculates the actual cooldown taking the unit's castSpd into account.
     */
    getActualCooldown(castSpd) {
        const speedMultiplier = (castSpd || 1000) / 1000;
        return this.cooldown / Math.max(0.1, speedMultiplier);
    }

    getCooldownProgress(now, castSpd) {
        if (this.lastCastTime === 0) return 1; // Ready immediately
        const cd = this.getActualCooldown(castSpd);
        const elapsed = now - this.lastCastTime;
        return Math.max(0, Math.min(1, elapsed / cd));
    }

    isReady(now, castSpd) {
        return this.getCooldownProgress(now, castSpd) >= 1;
    }

    /**
     * Executes the Song of Protection.
     * @param {Phaser.GameObjects.Container} caster - Who is using the skill
     */
    execute(caster) {
        if (!caster || !caster.active || caster.hp <= 0) return false;

        const now = caster.scene.time.now;
        if (!this.isReady(now, caster.castSpd)) {
            return false; // Still on cooldown
        }

        this.lastCastTime = now;

        console.log(`[Skill] ${caster.unitName} uses Song of Protection!`);
        soundEffects.playHarpSound();

        // Determine the allied group dynamically
        const alliedGroup = caster.allyGroup;

        const totalMAtk = caster.getTotalMAtk();
        const shieldAmount = totalMAtk * this.shieldMultiplier;

        // if (caster.showSpeechBubble) {
        //     caster.showSpeechBubble("수호의 선율이여...!");
        // }

        // Apply shield to all active allies
        if (alliedGroup && alliedGroup.getChildren) {
            const allies = alliedGroup.getChildren();
            let shieldedCount = 0;
            allies.forEach(ally => {
                // Phaser Container에서 씬 활성 체크: scene.scene.isActive() 사용
                const sceneOk = ally.scene && ally.scene.scene && ally.scene.scene.isActive();
                if (ally && ally.active && ally.hp > 0 && sceneOk) {
                    // Apply shield via ShieldManager
                    if (caster.scene && caster.scene.shieldManager) {
                        caster.scene.shieldManager.applyShield(ally, shieldAmount, this.shieldDuration);
                        shieldedCount++;
                    }

                    // Show text
                    if (caster.scene && caster.scene.fxManager) {
                        caster.scene.fxManager.showHealText(ally, `SHIELD`, '#ffff00');
                    }

                    // Flashy individual effect
                    if (ally.sprite && ally.scene) {
                        ally.scene.tweens.add({
                            targets: ally.sprite,
                            tint: 0xffff00,
                            duration: 200,
                            yoyo: true,
                            onComplete: () => {
                                if (ally && ally.sprite && ally.active) ally.sprite.clearTint();
                            }
                        });
                    }

                    // Music particle burst
                    if (caster.scene) {
                        this.playMusicAuraEffect(caster.scene, ally.x, ally.y);
                    }
                }
            });
            console.log(`[SongOfProtection] ${caster.unitName} -> ${shieldedCount}명에게 배리어 적용 (${Math.round(shieldAmount)})`);
        }

        // Giant screen-wide central flash (optional, just centered on the caster)
        const flash = caster.scene.add.circle(caster.x, caster.y, 10, 0xffff00, 0.6);
        if (flash.postFX) {
            flash.postFX.addBlur(4, 2, 1);
        }
        caster.scene.tweens.add({
            targets: flash,
            scale: 60,
            alpha: 0,
            duration: 1000,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                if (flash && flash.destroy) flash.destroy();
            }
        });

        return true;
    }

    playMusicAuraEffect(scene, x, y) {
        try {
            // Phaser 3.60+ 파티클 에미터 API
            const emitter = scene.add.particles(x, y, 'emoji_note', {
                speed: { min: 40, max: 100 },
                angle: { min: 200, max: 340 }, // pointing upwards
                scale: { start: 0.6, end: 0.2 },
                alpha: { start: 0.8, end: 0 },
                lifespan: 1200,
                gravityY: -40,
                blendMode: 'NORMAL',
                quantity: 6,
                emitting: false // explode 방식 사용
            });

            // 유닛 depth(= y좌표)보다 위에 렌더링되도록 높은 depth 부여
            emitter.setDepth(y + 100);
            emitter.explode(6);

            // Auto cleanup
            scene.time.delayedCall(1500, () => {
                if (emitter && emitter.destroy) emitter.destroy();
            });
        } catch (e) {
            console.warn('[SongOfProtection] playMusicAuraEffect 파티클 생성 실패:', e.message);
        }
    }
}
