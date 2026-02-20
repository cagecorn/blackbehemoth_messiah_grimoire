import globalEventBus from '../Events/EventBus.js';

export default class CombatManager {
    constructor(scene) {
        this.scene = scene;
        this.activeBattles = new Map();

        // Initialize Native Web Worker
        // Vite uses standard new URL syntax to package workers correctly
        this.worker = new Worker(new URL('../../workers/combatWorker.js', import.meta.url), {
            type: 'module'
        });

        this.worker.onmessage = this.handleWorkerMessage.bind(this);
    }

    // Pass data out of direct object scope into serializable JSON payload
    initiateBattle(partyObjects, enemyObject) {
        // Serialize party
        const partyData = partyObjects.map(p => ({
            id: p.id,
            hp: p.hp,
            maxHp: p.maxHp,
            atk: p.atk || 0,
            def: p.def || 0,
            mDef: p.mDef || 0,
            acc: p.acc || 100,
            eva: p.eva || 0,
            crit: p.crit || 0
        }));

        // Serialize enemy
        const enemyData = {
            id: enemyObject.id,
            hp: enemyObject.hp,
            maxHp: enemyObject.maxHp,
            atk: enemyObject.atk || 0,
            def: enemyObject.def || 0,
            mDef: enemyObject.mDef || 0,
            acc: enemyObject.acc || 100,
            eva: enemyObject.eva || 0,
            crit: enemyObject.crit || 0
        };

        // Cache references in Main Thread to play animations later
        this.activeBattles.set(enemyObject.id, {
            enemyRef: enemyObject,
            partyRefs: partyObjects // Assuming a global party
        });

        // Send to background thread
        this.worker.postMessage({
            action: 'START_BATTLE',
            payload: { party: partyData, enemy: enemyData }
        });
    }

    // Receive calculation results from background thread and apply purely visual FX
    handleWorkerMessage(e) {
        const { type, payload } = e.data;

        switch (type) {
            case 'DAMAGE_DEALT': {
                const battle = this.activeBattles.get(payload.targetId);
                if (battle) {
                    this.scene.fxManager.showDamageText(battle.enemyRef, payload.damage, '#ff0000');
                    // Sync structural HP
                    battle.enemyRef.hp = payload.remainingHp;
                    battle.enemyRef.updateHealthBar();
                }
                break;
            }
            case 'DAMAGE_TAKEN': {
                // Here you would find the specific party member UI and flash red
                console.log(`[Main] Party member ${payload.targetId} took ${payload.damage} damage! Remaining: ${payload.remainingHp}`);
                break;
            }
            case 'BATTLE_WON': {
                const battle = this.activeBattles.get(payload.enemyId);
                if (battle) {
                    this.activeBattles.delete(payload.enemyId);

                    battle.enemyRef.die('warrior'); // Play death animation, drop loot, and notify AI
                }
                break;
            }
            case 'BATTLE_LOST': {
                console.log("[Main] Party wiped out!");
                // Trigger game over flow
                this.scene.scene.start('BootScene'); // Restart for now
                break;
            }
        }
    }


    destroy() {
        this.worker.terminate();
    }
}
