
function getRequiredExpForLevel(level) {
    if (level <= 1) return 0;
    return Math.floor(25000 * Math.pow(1.3, level - 1));
}

function getAtkForLevel(level) {
    const levelBonus = 1 + (0.25 * (level - 1));
    return Math.floor(5 * levelBonus);
}

console.log("=== Wood Sword Scaling Test ===");
console.log("LV | Req EXP (for next) | Total ATK | Bonus %");
console.log("---------------------------------------------");

for (let lv = 1; lv <= 50; lv++) {
    const req = getRequiredExpForLevel(lv + 1);
    const atk = getAtkForLevel(lv);
    const bonus = Math.round((atk / 5 - 1) * 100);

    if (lv === 1 || lv === 2 || lv === 10 || lv === 20 || lv === 30 || lv === 40 || lv === 50) {
        console.log(`${lv.toString().padEnd(2)} | ${req.toLocaleString().padStart(17)} | ${atk.toString().padStart(9)} | +${bonus}%`);
    }
}
console.log("---------------------------------------------");
