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
    warrior: [
        {
            id: 'fortitude',
            name: '강건함',
            description: '주위에 다수의 적에게 포위당할 경우, 방어력이 10% 상승합니다.',
            emoji: '🛡️',
            requiredLevel: 1
        },
        {
            id: 'lone_wolf',
            name: '론 울프',
            description: '주위에 아군이 없을 경우, 모든 스탯이 5% 상승합니다.',
            emoji: '🐺',
            requiredLevel: 1
        }
    ],
    healer: [
        {
            id: 'salvation',
            name: '구원의 손길',
            description: '체력이 25% 이하인 아군을 회복시킬 때 회복량이 30% 증가합니다.',
            emoji: '💊',
            requiredLevel: 1
        },
        {
            id: 'purify',
            name: '정화',
            description: '평타 회복이 5%의 확률로 대상에 걸린 해로운 효과 1개를 해제합니다.',
            emoji: '✨',
            requiredLevel: 1
        }
    ],
    wizard: [
        {
            id: 'teleport',
            name: '텔레포트',
            description: '적에게 포위당하면 안전한 위치로 순식간에 이동합니다.',
            emoji: '✨',
            requiredLevel: 1
        },
        {
            id: 'arcane_surge',
            name: '비전 분출',
            description: '스킬 사용 시 20% 확률로 다음 재사용 대기시간이 50% 감소합니다.',
            emoji: '🌀',
            requiredLevel: 1
        }
    ],
    bard: [
        {
            id: 'inspiration',
            name: '고양',
            description: '평타 버프가 5% 확률로 대상의 스킬 재사용 대기시간을 15% 앞당깁니다.',
            emoji: '🎶',
            requiredLevel: 1
        }
    ]
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
