// Background Web Worker for 4-Party vs Monster auto-battles
let isBattling = false;
let battleData = null;
let tickTimer = null;

const TICK_RATE_MS = 1000; // 1 second intervals for auto-battles

// Listen for messages from the main Phaser thread
self.onmessage = function (e) {
    const { action, payload } = e.data;

    switch (action) {
        case 'START_BATTLE':
            startBattle(payload);
            break;
        case 'STOP_BATTLE':
            stopBattle();
            break;
    }
};

function startBattle({ party, enemy }) {
    if (isBattling) return;

    battleData = {
        party: party, // Array of 4 characters with HP, ATK, etc.
        enemy: enemy  // The enemy structural data
    };

    isBattling = true;
    console.log("[Worker] Battle Started!");
    tickTimer = setInterval(battleTick, TICK_RATE_MS);
}

function stopBattle() {
    isBattling = false;
    clearInterval(tickTimer);
    battleData = null;
    console.log("[Worker] Battle Stopped!");
}

function battleTick() {
    if (!isBattling || !battleData) return;

    // --- Advanced Auto Battle Logic ---
    // 1. Party attacks enemy
    let totalPartyDamage = 0;
    for (let char of battleData.party) {
        if (char.hp > 0) {
            // Accuracy Check
            const hitChance = char.acc - battleData.enemy.eva;
            if (Math.random() * 100 > hitChance) {
                console.log(`[Worker] ${char.id} missed!`);
                continue;
            }

            // Crit Check
            let damage = char.atk;
            if (Math.random() * 100 < char.crit) {
                damage *= 1.5;
                console.log(`[Worker] ${char.id} CRITICAL HIT!`);
            }

            // Physical Mitigation
            const effDmg = Math.max(1, damage - battleData.enemy.def);
            totalPartyDamage += effDmg;
        }
    }

    if (totalPartyDamage > 0) {
        battleData.enemy.hp -= totalPartyDamage;

        // Post Party Damage Event back to Main Thread
        self.postMessage({
            type: 'DAMAGE_DEALT',
            payload: { target: 'enemy', targetId: battleData.enemy.id, damage: totalPartyDamage, remainingHp: battleData.enemy.hp }
        });
    }

    // Check Enemy Death
    if (battleData.enemy.hp <= 0) {
        self.postMessage({ type: 'BATTLE_WON', payload: { enemyId: battleData.enemy.id } });
        stopBattle();
        return;
    }

    // 2. Enemy attacks a random living party member
    const livingMembers = battleData.party.filter(p => p.hp > 0);
    if (livingMembers.length > 0) {
        const target = livingMembers[Math.floor(Math.random() * livingMembers.length)];

        // Accuracy Check
        const hitChance = battleData.enemy.acc - target.eva;
        if (Math.random() * 100 <= hitChance) {
            // Crit Check
            let damage = battleData.enemy.atk;
            if (Math.random() * 100 < battleData.enemy.crit) {
                damage *= 1.5;
            }

            const enemyDmg = Math.max(1, damage - target.def);
            target.hp -= enemyDmg;

            self.postMessage({
                type: 'DAMAGE_TAKEN',
                payload: { target: 'party', targetId: target.id, damage: enemyDmg, remainingHp: target.hp }
            });
        }

        // Check Party Wipe
        if (battleData.party.every(p => p.hp <= 0)) {
            self.postMessage({ type: 'BATTLE_LOST' });
            stopBattle();
            return;
        }
    }
}
