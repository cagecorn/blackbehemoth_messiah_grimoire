/**
 * HitAndRunTest.js
 */
(function verifyHitAndRun() {
    const scene = window.game.scene.getScenes(true)[0];
    if (!scene || !scene.mercenaries) {
        console.error("No active combat scene found!");
        return;
    }

    const archer = scene.mercenaries.getChildren().find(m => m.className === 'Archer' || m.characterId === 'ella');
    if (!archer) {
        console.error("Archer not found!");
        return;
    }

    if (!archer.activatedPerks.includes('hit_and_run')) {
        archer.activatedPerks.push('hit_and_run');
        console.log("Forced 'hit_and_run' perk on Archer.");
    }

    const originalSpeed = archer.speed;
    console.log(`Original Speed: ${originalSpeed}`);

    console.log("Waiting for Archer to attack...");

    let lastSpeed = archer.speed;
    const interval = setInterval(() => {
        if (archer.speed > originalSpeed) {
            console.log(`--- SPEED BOOST DETECTED: ${archer.speed} ---`);
            clearInterval(interval);
        }
    }, 100);

    setTimeout(() => {
        clearInterval(interval);
        console.log("Hit and Run test timeout.");
    }, 10000);
})();
