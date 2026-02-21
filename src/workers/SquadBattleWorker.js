import HeadlessCombatEngine from '../engine/HeadlessCombatEngine.js';

/**
 * SquadBattleWorker.js
 * 
 * 보이지 않는 분대의 자동 사냥을 백그라운드 스레드에서 시뮬레이션합니다.
 * 메인 객체(Phaser)나 Window 객체에 접근할 수 없는 독립된 공간입니다.
 */

const engine = new HeadlessCombatEngine({ tickRate: 100 });
let battleInterval = null;
let currentSquadId = null;

// Listen for messages from the main thread
self.onmessage = function (e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'INIT_BATTLE':
            // 1. Initialize engine with serialized states
            currentSquadId = payload.squadId;
            engine.setState(payload.mercenaries, payload.monsters);

            self.postMessage({
                type: 'LOG',
                message: `[SquadWorker] Squad ${currentSquadId} simulation initialized.`
            });
            break;

        case 'START_BATTLE':
            // 2. Start the simulation loop
            if (battleInterval) clearInterval(battleInterval);

            battleInterval = setInterval(() => {
                engine.update();

                // Periodically send snapshot back to main thread (e.g. every 1 second)
                // In a real scenario, this could be less frequent to save bandwidth
                if (Date.now() % 1000 < 100) {
                    self.postMessage({
                        type: 'BATTLE_UPDATE',
                        payload: {
                            squadId: currentSquadId,
                            state: engine.getState()
                        }
                    });
                }

                // Check win condition
                const state = engine.getState();
                if (state.monsters.length === 0) {
                    clearInterval(battleInterval);
                    self.postMessage({
                        type: 'BATTLE_WON',
                        payload: { squadId: currentSquadId }
                    });
                } else if (state.mercenaries.length === 0) {
                    clearInterval(battleInterval);
                    self.postMessage({
                        type: 'BATTLE_LOST',
                        payload: { squadId: currentSquadId }
                    });
                }

            }, engine.tickRate);

            self.postMessage({
                type: 'LOG',
                message: `[SquadWorker] Squad ${currentSquadId} simulation started.`
            });
            break;

        case 'STOP_BATTLE':
            // 3. Stop simulation
            if (battleInterval) {
                clearInterval(battleInterval);
                battleInterval = null;
            }
            break;

        case 'GET_STATE':
            // 4. Manual request for current state (useful for seamless transition)
            self.postMessage({
                type: 'CURRENT_STATE',
                payload: {
                    squadId: currentSquadId,
                    state: engine.getState()
                }
            });
            break;
    }
};
