import DBManager from '../Database/DBManager.js';
import { Characters, PetStats } from './EntityStats.js';
import partyManager from './PartyManager.js';

export default class GachaManager {
    static COST_PER_PULL = 100; // 5회 뽑기 총 500 다이아
    static COST_PET_PULL = 1000; // 펫 1회 뽑기 1000 다이아

    /**
     * 다이아를 소모하여 가챠를 수행하고, 로스터를 자동 변합(Merge)합니다.
     * @param {number} pullCount - 뽑을 횟수 (기본 5)
     * @returns {Promise<{success: boolean, message: string, pulled: Array, mergeResults: Array}>}
     */
    static async performGacha(pullCount = 5) {
        // 1. 다이아 확인 및 차감
        const diamondData = await DBManager.getInventoryItem('emoji_gem');
        const currentDiamonds = diamondData ? diamondData.amount : 0;
        const totalCost = this.COST_PER_PULL * pullCount;

        if (currentDiamonds < totalCost) {
            return { success: false, message: '다이아가 부족합니다.' };
        }

        await DBManager.saveInventoryItem('emoji_gem', currentDiamonds - totalCost);

        // 2. 가챠 결과 도출 (확률 기반 레어리티 결정)
        const allCharIds = Object.keys(Characters);
        const normalChars = allCharIds.filter(id => Characters[id].rarity !== 'BLACK_BEHEMOTH');
        const behemothChars = allCharIds.filter(id => Characters[id].rarity === 'BLACK_BEHEMOTH');

        const pulled = [];
        for (let i = 0; i < pullCount; i++) {
            const roll = Math.random() * 100;
            let selectedCharId;

            if (roll < 2 && behemothChars.length > 0) {
                // 2% 확률로 블랙 베히모스 획득
                selectedCharId = behemothChars[Math.floor(Math.random() * behemothChars.length)];
            } else {
                // 98% 확률로 일반 캐릭터 획득
                selectedCharId = normalChars[Math.floor(Math.random() * normalChars.length)];
            }
            pulled.push(selectedCharId);
        }

        // 3. 로스터 불러오기 및 1성 병합 계산
        const roster = await DBManager.getMercenaryRoster();
        const mergeResults = [];

        pulled.forEach(charId => {
            if (!roster[charId]) {
                roster[charId] = { stars: {}, total: 0 };
            }
            // Ensure structure is correct (legacy data handles stars as the object)
            if (!roster[charId].stars) {
                roster[charId] = { stars: roster[charId], total: 0 };
            }

            roster[charId].stars['1'] = (roster[charId].stars['1'] || 0) + 1;
            roster[charId].total = (roster[charId].total || 0) + 1;
        });

        console.log(`[GachaManager] Pulled: ${pulled.join(', ')}`);
        console.log('[GachaManager] Roster before merges:', JSON.parse(JSON.stringify(roster)));

        // 4. 재귀적 3-Merge 룰 적용
        const distinctPulledIds = [...new Set(pulled)];
        for (const charId of distinctPulledIds) {
            this.processMergesForChar(charId, roster[charId].stars, mergeResults);
        }

        // 5. 업데이트된 로스터 저장
        await DBManager.saveMercenaryRoster(roster);
        await partyManager.reloadRoster();

        return {
            success: true,
            message: '가챠 완료!',
            pulled: pulled.map(id => Characters[id]), // UI에서 공개용 (Full Object)
            mergeResults: mergeResults // 연계된 이벤트 UI 용도
        };
    }

    /**
     * 특정 캐릭터의 성급 테이블을 탐색하여 [3개 = 상위 1개] 규칙을 연쇄 적용합니다.
     */
    static processMergesForChar(charId, starData, mergeResults) {
        let isMerging = true;
        while (isMerging) {
            isMerging = false;
            // 보유중인 성급 레벨 오름차순
            const starLevels = Object.keys(starData).map(Number).sort((a, b) => a - b);

            for (const star of starLevels) {
                if (starData[star] >= 3) {
                    const mergesToMake = Math.floor(starData[star] / 3);
                    const remainder = starData[star] % 3;

                    console.log(`[GachaManager] MERGE: ${charId} ${star}★ x${starData[star]} -> ${star + 1}★ x${mergesToMake} (Remainder: ${remainder})`);

                    starData[star] = remainder;
                    const nextStar = star + 1;
                    starData[nextStar] = (starData[nextStar] || 0) + mergesToMake;

                    // 병합 결과 기록 (애니메이션이나 시스템 로그용)
                    for (let i = 0; i < mergesToMake; i++) {
                        mergeResults.push({
                            charId,
                            charData: Characters[charId],
                            fromStar: star,
                            toStar: nextStar
                        });
                    }

                    isMerging = true; // 새로 승급한 별로 인해 다시루프
                    break;
                }
            }
        }
        console.log(`[GachaManager] Final star data for ${charId}:`, starData);
    }

    /**
     * Performs a single pet gacha pull.
     * @returns {Promise<{success: boolean, message: string, pulled: Object, mergeResult: Object}>}
     */
    static async performPetGacha() {
        // 1. Check & Deduct Diamonds
        const diamondData = await DBManager.getInventoryItem('emoji_gem');
        const currentDiamonds = diamondData ? diamondData.amount : 0;

        if (currentDiamonds < this.COST_PET_PULL) {
            return { success: false, message: '다이아가 부족합니다. (1,000 다이아 필요)' };
        }

        await DBManager.saveInventoryItem('emoji_gem', currentDiamonds - this.COST_PET_PULL);

        // 2. Random Selection
        const petIds = ['dog_pet', 'wolf_pet', 'owl_pet'];
        const selectedId = petIds[Math.floor(Math.random() * petIds.length)];

        // 3. Load Pet Roster
        const petRoster = await DBManager.get('settings', 'petRoster') || {};
        const mergeResults = [];

        if (!petRoster[selectedId]) {
            petRoster[selectedId] = {};
        }
        petRoster[selectedId]['1'] = (petRoster[selectedId]['1'] || 0) + 1;

        // 4. Merge Rule (3 -> 1)
        this.processMergesForPet(selectedId, petRoster[selectedId], mergeResults);

        // 5. Save
        await DBManager.set('settings', 'petRoster', petRoster);
        await partyManager.reloadPetRoster();

        return {
            success: true,
            message: '펫 뽑기 완료!',
            pulled: PetStats[selectedId.toUpperCase()],
            mergeResult: mergeResults.length > 0 ? mergeResults[mergeResults.length - 1] : null
        };
    }

    /**
     * Recursive 3-merge for pets.
     */
    static processMergesForPet(petId, starData, mergeResults) {
        let isMerging = true;
        while (isMerging) {
            isMerging = false;
            const starLevels = Object.keys(starData).map(Number).sort((a, b) => a - b);

            for (const star of starLevels) {
                if (starData[star] >= 3) {
                    starData[star] -= 3;
                    if (starData[star] === 0) delete starData[star];

                    const nextStar = star + 1;
                    starData[nextStar] = (starData[nextStar] || 0) + 1;

                    mergeResults.push({
                        petId,
                        petData: PetStats[petId.toUpperCase()],
                        fromStar: star,
                        toStar: nextStar
                    });

                    isMerging = true;
                    break;
                }
            }
        }
    }
}
