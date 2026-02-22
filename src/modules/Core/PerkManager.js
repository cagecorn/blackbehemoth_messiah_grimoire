/**
 * PerkManager.js
 * Central definitions and helper functions for the Perk system.
 */

export const PerkDefinitions = {
    archer: [
        {
            id: 'evasive_maneuvers',
            name: '회피 기동',
            description: '적에게 포위되었을 때 즉시 구르며 탈출합니다. (이동 중 유닛 통과, 이속 증가)',
            emoji: '🏃',
            requiredLevel: 1
        },
        {
            id: 'weakness_exploitation',
            name: '약자 멸시',
            description: '체력이 30% 이하인 적에게 주는 피해량이 20% 증가합니다.',
            emoji: '🎯',
            requiredLevel: 1
        },
        {
            id: 'hit_and_run',
            name: '히트 앤 런',
            description: '공격 시 짧은 시간 동안 이동 속도가 30% 증가합니다.',
            emoji: '👞',
            requiredLevel: 1
        }
    ],
    warrior: [],
    healer: [],
    wizard: [],
    bard: []
};

export default class PerkManager {
    static getPerksForClass(classId) {
        return PerkDefinitions[classId] || [];
    }

    static getPerkById(classId, perkId) {
        const perks = this.getPerksForClass(classId);
        return perks.find(p => p.id === perkId);
    }
}
