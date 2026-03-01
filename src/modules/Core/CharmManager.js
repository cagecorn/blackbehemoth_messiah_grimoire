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
            const healAmount = Math.floor(unit.maxHp * 0.02);
            if (healAmount > 0) {
                unit.heal(healAmount);
                SoundEffects.playBbyorongSound();
                console.log(`[Charm] ${unit.unitName} healed ${healAmount} by 🍔`);
            }
        },
        description: '10초마다 최대 체력의 2%를 회복합니다.'
    },
    'emoji_fireworks': {
        id: 'emoji_fireworks',
        name: 'Fire Nova (🎆)',
        emoji: '🎆',
        type: CHARM_EFFECT_TYPES.PERIODIC,
        interval: 15000, // 15 seconds
        effect: (unit) => {
            if (!unit.scene || !unit.scene.aoeManager) return;

            // 물리/마법 공격력 중 더 높은 쪽의 120% 계산
            const baseAtk = unit.getTotalAtk ? unit.getTotalAtk() : (unit.atk || 0);
            const baseMAtk = unit.getTotalMAtk ? unit.getTotalMAtk() : (unit.mAtk || 0);
            const power = Math.max(baseAtk, baseMAtk);
            const damage = power * 1.2;

            // 시각 효과 재생
            if (unit.scene.fxManager && unit.scene.fxManager.showElementalNovaEffect) {
                unit.scene.fxManager.showElementalNovaEffect(unit, 'fire');
                SoundEffects.playPapatSound();
            }

            // AOE 데미지 트리거 (반경 150, 불 속성)
            unit.scene.aoeManager.triggerAoe(
                unit.x, unit.y,
                150,
                damage,
                unit,
                unit.targetGroup,
                baseMAtk >= baseAtk, // 마법 공격력이 더 높으면 마법 판정
                false,
                'fire'
            );

            console.log(`[Charm] ${unit.unitName} triggered Fire Nova 🎆`);
        },
        description: '15초마다 주변에 강력한 불꽃 노바(공격력 120%)를 발산합니다.'
    },
    'emoji_sparkler': {
        id: 'emoji_sparkler',
        name: 'Spark Nova (🎇)',
        emoji: '🎇',
        type: CHARM_EFFECT_TYPES.PERIODIC,
        interval: 15000,
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
            console.log(`[Charm] ${unit.unitName} triggered Spark Nova 🎇`);
        },
        description: '15초마다 주변에 강력한 전격 노바(공격력 120%)를 발산합니다.'
    },
    'emoji_koinobori': {
        id: 'emoji_koinobori',
        name: 'Ice Nova (🎏)',
        emoji: '🎏',
        type: CHARM_EFFECT_TYPES.PERIODIC,
        interval: 15000,
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
            console.log(`[Charm] ${unit.unitName} triggered Ice Nova 🎏`);
        },
        description: '15초마다 주변에 강력한 냉기 노바(공격력 120%)를 발산합니다.'
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
