/**
 * SquadManager.js
 * 
 * 여러 분대(Squad)의 상태를 관리하고, 현재 화면에 보이는 분대(Active)와
 * 백그라운드 워커에서 돌아가는 분대(Inactive)들 간의 스위칭을 담당합니다.
 */
export default class SquadManager {
    constructor(scene) {
        this.scene = scene; // 메인 게임 씬 참조 (예: RealTimeArenaScene)

        // 분대별 상태 저장소
        // 구조: { squadId: { status: 'active' | 'background', mercenaries: [], monsters: [], worker: null } }
        this.squads = {};
        this.activeSquadId = null;
    }

    /**
     * 새로운 분대를 시스템에 등록합니다.
     */
    registerSquad(squadId, mercenaries = [], monsters = []) {
        this.squads[squadId] = {
            status: 'standby',
            mercenaries: mercenaries, // JSON State Array
            monsters: monsters,       // JSON State Array
            worker: null
        };
        console.log(`[SquadManager] Registered Squad ${squadId}`);
    }

    /**
     * 특정 분대를 화면(Main Thread)에 띄웁니다.
     * 이 때 기존 화면에 있던 분대는 백그라운드(Worker)로 보냅니다.
     */
    async switchToSquad(targetSquadId) {
        if (!this.squads[targetSquadId]) {
            console.error(`[SquadManager] Squad ${targetSquadId} does not exist.`);
            return;
        }

        if (this.activeSquadId === targetSquadId) {
            return; // Already active
        }

        // 1. 현재 화면에 있는 분대(Active)를 백그라운드로 전환
        if (this.activeSquadId) {
            this._sendActiveToBackground(this.activeSquadId);
        }

        // 2. 화면 페이드 아웃 연출 (Phaser Scene)
        await this._playFadeOut();

        // 3. 타겟 분대를 백그라운드(Worker)에서 정지시키고 최신 데이터 회수
        const targetData = await this._retrieveBackgroundData(targetSquadId);

        // 4. 화면(Main Thread)에 타겟 분대 스프라이트 생성/갱신 (심리스 렌더링)
        this._renderSquadToScene(targetData.mercenaries, targetData.monsters);

        this.activeSquadId = targetSquadId;
        this.squads[targetSquadId].status = 'active';

        // 5. 화면 페이드 인 연출
        await this._playFadeIn();

        console.log(`[SquadManager] Successfully switched view to Squad ${targetSquadId}`);
    }

    // =========================================================
    // Private Helpers
    // =========================================================

    /**
     * 현재 씬의 캐릭터들을 직렬화(Serialize)하여 워커를 생성하고 넘깁니다.
     */
    _sendActiveToBackground(squadId) {
        console.log(`[SquadManager] Sending Squad ${squadId} to background worker...`);

        // TODO: 실제 씬에 있는 Mercenary/BaseMonster 객체들의 .getState()를 호출해 배열로 모아야 합니다.
        // 현재는 예시 데이터
        const currentMercStates = []; // this.scene.mercenaries.map(m => m.getState());
        const currentMonStates = [];  // this.scene.monsters.map(m => m.getState());

        // 워커 생성 및 배정
        const worker = new Worker(new URL('../workers/SquadBattleWorker.js', import.meta.url), { type: 'module' });

        worker.onmessage = this._handleWorkerMessage.bind(this);

        worker.postMessage({
            type: 'INIT_BATTLE',
            payload: {
                squadId: squadId,
                mercenaries: currentMercStates,
                monsters: currentMonStates
            }
        });

        worker.postMessage({ type: 'START_BATTLE' });

        this.squads[squadId].worker = worker;
        this.squads[squadId].status = 'background';

        // 씬에서 스프라이트 제거
        // this.scene.mercenaries.forEach(m => m.destroy());
        // this.scene.monsters.forEach(m => m.destroy());
    }

    /**
     * 워커를 정지시키고 최신 JSON 배열 데이터를 뽑아옵니다.
     */
    _retrieveBackgroundData(squadId) {
        return new Promise((resolve) => {
            const squad = this.squads[squadId];

            if (squad.status !== 'background' || !squad.worker) {
                // 애초에 백그라운드에 없었으면 그냥 저장된 초기값 반환
                resolve({ mercenaries: squad.mercenaries, monsters: squad.monsters });
                return;
            }

            console.log(`[SquadManager] Retrieving data from Squad ${squadId} worker...`);

            // 일회성 리스너 부착
            const onMessage = (e) => {
                if (e.data.type === 'CURRENT_STATE') {
                    squad.worker.removeEventListener('message', onMessage);

                    // 워커 정지 및 파기
                    squad.worker.postMessage({ type: 'STOP_BATTLE' });
                    squad.worker.terminate();
                    squad.worker = null;

                    resolve(e.data.payload.state);
                }
            };

            squad.worker.addEventListener('message', onMessage);
            squad.worker.postMessage({ type: 'GET_STATE' });
        });
    }

    /**
     * 넘겨받은 JSON 상태 배열을 바탕으로 메인 씬에 Phaser 스프라이트를 다시 그립니다.
     */
    _renderSquadToScene(mercStates, monStates) {
        console.log(`[SquadManager] Rendering state to scene...`);
        // TODO: 씬에 스프라이트를 새로 스폰하고 applyState()를 호출하는 로직
        // 예시:
        // mercStates.forEach(state => {
        //     const newMerc = new Mercenary(this.scene, state.x, state.y, ...);
        //     newMerc.applyState(state);
        // });
    }

    _handleWorkerMessage(e) {
        const { type, payload, message } = e.data;
        if (type === 'LOG') {
            // console.log(message);
        } else if (type === 'BATTLE_WON') {
            console.log(`[SquadManager] 🎊 Background Squad ${payload.squadId} WON the battle!`);
        } else if (type === 'BATTLE_LOST') {
            console.log(`[SquadManager] 💀 Background Squad ${payload.squadId} LOST the battle!`);
        }
    }

    _playFadeOut() {
        return new Promise(resolve => {
            if (this.scene && this.scene.cameras) {
                this.scene.cameras.main.fadeOut(300, 0, 0, 0, (camera, progress) => {
                    if (progress === 1) resolve();
                });
            } else {
                resolve();
            }
        });
    }

    _playFadeIn() {
        return new Promise(resolve => {
            if (this.scene && this.scene.cameras) {
                this.scene.cameras.main.fadeIn(300, 0, 0, 0, (camera, progress) => {
                    if (progress === 1) resolve();
                });
            } else {
                resolve();
            }
        });
    }
}
