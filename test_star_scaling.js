import { Characters, scaleStats } from './src/modules/Core/EntityStats.js';

console.log("==========================================");
console.log("      ⭐ Mercenary Star Scaling Test ⭐      ");
console.log("==========================================\n");

const testChar = Characters.AREN; // 테스트할 기본 캐릭터 (아렌)
console.log(`[Testing Character: ${testChar.name}]\n`);

const testLevels = [1, 5, 10]; // 레벨에 따른 스케일링도 복합적으로 잘 되는지 확인
const testStars = [1, 2, 3, 5, 10]; // 성급 변화 테스트

for (const level of testLevels) {
    console.log(`--- [Level ${level} Test] ---`);
    for (const star of testStars) {
        testChar.star = star;
        const scaledStats = scaleStats(testChar, level);
        console.log(`★${star} Star -> MaxHP: ${scaledStats.maxHp} | ATK: ${scaledStats.atk} | DEF: ${scaledStats.def} | MATK: ${scaledStats.mAtk}`);
    }
    console.log("");
}

console.log("==========================================");
console.log("                Test Complete             ");
console.log("==========================================");
