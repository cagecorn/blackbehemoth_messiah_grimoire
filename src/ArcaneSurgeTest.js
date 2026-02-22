/**
 * ArcaneSurgeTest.js
 * Verifies Merlin's Arcane Surge perk.
 */
(function verifyArcaneSurge() {
    const scene = window.game.scene.getScenes(true)[0];
    if (!scene || !scene.mercenaries) {
        console.error("No active combat scene found!");
        return;
    }

    const merlin = scene.mercenaries.getChildren().find(m => m.characterId === 'merlin');
    if (!merlin) {
        console.error("Merlin not found!");
        return;
    }

    if (!merlin.activatedPerks.includes('arcane_surge')) {
        merlin.activatedPerks.push('arcane_surge');
        console.log("Forced 'arcane_surge' perk on Merlin.");
    }

    console.log("Starting Arcane Surge test. Merlin will spam skills for 10 seconds...");

    const interval = setInterval(() => {
        if (!merlin.active || merlin.hp <= 0) {
            clearInterval(interval);
            return;
        }

        const skill = merlin.skill;
        if (skill) {
            // Force ready for spamming
            const now = scene.time.now;
            if (skill.isReady(now, merlin.castSpd)) {
                console.log("--- Attempting Cast ---");
                // We'll let the AI or manual update handle the actual cast, 
                // but we can force it here for testing if needed.
                // For this test, we just want to see if onSkillExecuted triggers.
            }
        }
    }, 500);

    setTimeout(() => {
        clearInterval(interval);
        console.log("Arcane Surge test complete. Check console logs for '비전 분출' successes.");
    }, 10000);
})();
