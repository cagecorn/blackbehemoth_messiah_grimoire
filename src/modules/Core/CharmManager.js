import SoundEffects from './SoundEffects.js';

/**
 * CharmManager.js
 * 
 * Defines and manages effects for emoji charms.
 */

export const CHARM_EFFECT_TYPES = {
    PASSIVE: 'passive',  // Stat boosts
    PERIODIC: 'periodic' // Cooldown-based effects
};

export const CHARM_DATABASE = {
    'emoji_burger': {
        id: 'emoji_burger',
        name: 'Hamburger (햄버거)',
        emoji: '🍔',
        type: CHARM_EFFECT_TYPES.PERIODIC,
        interval: 10000, // 10 seconds
        effect: (unit) => {
            const healAmount = Math.floor(unit.maxHp * 0.05) + 10;
            if (healAmount > 0) {
                unit.heal(healAmount);
                SoundEffects.playBbyorongSound();
                console.log(`[Charm] ${unit.unitName} healed ${healAmount} by 🍔`);
            }
        },
        description: '10초마다 최대 체력의 5% + 10을 회복합니다.'
    },
    'emoji_fireworks': {
        id: 'emoji_fireworks',
        name: 'Fire Nova (🎆)',
        emoji: '🎆',
        type: CHARM_EFFECT_TYPES.PERIODIC,
        interval: 12000,
        effect: (unit) => {
            if (!unit.scene || !unit.scene.aoeManager) return;

            const baseAtk = unit.getTotalAtk ? unit.getTotalAtk() : (unit.atk || 0);
            const baseMAtk = unit.getTotalMAtk ? unit.getTotalMAtk() : (unit.mAtk || 0);
            const power = Math.max(baseAtk, baseMAtk);
            const damage = power * 1.2; // REVERTED 2.5 -> 1.2

            if (unit.scene.fxManager && unit.scene.fxManager.showElementalNovaEffect) {
                unit.scene.fxManager.showElementalNovaEffect(unit, 'fire');
                SoundEffects.playPapatSound();
            }

            unit.scene.aoeManager.triggerAoe(
                unit.x, unit.y,
                150, // REVERTED 250 -> 150
                damage,
                unit,
                unit.targetGroup,
                baseMAtk >= baseAtk,
                false,
                'fire'
            );

            console.log(`[Charm] ${unit.unitName} triggered Fire Nova 🎆 (Dmg: ${Math.round(damage)})`);
        },
        description: '12초마다 주변에 불꽃 노바(공격력 120%)를 발산합니다.'
    },
    'emoji_sparkler': {
        id: 'emoji_sparkler',
        name: 'Spark Nova (🎇)',
        emoji: '🎇',
        type: CHARM_EFFECT_TYPES.PERIODIC,
        interval: 12000,
        effect: (unit) => {
            if (!unit.scene || !unit.scene.aoeManager) return;
            const baseAtk = unit.getTotalAtk ? unit.getTotalAtk() : (unit.atk || 0);
            const baseMAtk = unit.getTotalMAtk ? unit.getTotalMAtk() : (unit.mAtk || 0);
            const power = Math.max(baseAtk, baseMAtk);
            const damage = power * 1.2;

            if (unit.scene.fxManager && unit.scene.fxManager.showElementalNovaEffect) {
                unit.scene.fxManager.showElementalNovaEffect(unit, 'lightning');
                SoundEffects.playPapatSound();
            }

            unit.scene.aoeManager.triggerAoe(unit.x, unit.y, 150, damage, unit, unit.targetGroup, baseMAtk >= baseAtk, false, 'lightning');
            console.log(`[Charm] ${unit.unitName} triggered Spark Nova 🎇 (Dmg: ${Math.round(damage)})`);
        },
        description: '12초마다 주변에 전격 노바(공격력 120%)를 발산합니다.'
    },
    'emoji_koinobori': {
        id: 'emoji_koinobori',
        name: 'Ice Nova (🎏)',
        emoji: '🎏',
        type: CHARM_EFFECT_TYPES.PERIODIC,
        interval: 12000,
        effect: (unit) => {
            if (!unit.scene || !unit.scene.aoeManager) return;
            const baseAtk = unit.getTotalAtk ? unit.getTotalAtk() : (unit.atk || 0);
            const baseMAtk = unit.getTotalMAtk ? unit.getTotalMAtk() : (unit.mAtk || 0);
            const power = Math.max(baseAtk, baseMAtk);
            const damage = power * 1.2;

            if (unit.scene.fxManager && unit.scene.fxManager.showElementalNovaEffect) {
                unit.scene.fxManager.showElementalNovaEffect(unit, 'ice');
                SoundEffects.playPapatSound();
            }

            unit.scene.aoeManager.triggerAoe(unit.x, unit.y, 150, damage, unit, unit.targetGroup, baseMAtk >= baseAtk, false, 'ice');
            console.log(`[Charm] ${unit.unitName} triggered Ice Nova 🎏 (Dmg: ${Math.round(damage)})`);
        },
        description: '12초마다 주변에 냉기 노바(공격력 120%)를 발산합니다.'
    }
    // Add more charms here
};

export default class CharmManager {
    static getCharm(id) {
        return CHARM_DATABASE[id] || null;
    }

    static getAllCharms() {
        return Object.values(CHARM_DATABASE);
    }
}
