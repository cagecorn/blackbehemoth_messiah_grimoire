import EventBus from '../Events/EventBus.js';
import embeddingGemma from './EmbeddingGemma.js'; // Fallback

/**
 * FunctionRouter.js
 * Bridges natural language commands to game logic via google/functiongemma-270m-it-ONNX.
 */
class FunctionRouter {
    constructor() {
        this.worker = new Worker(new URL('./FunctionGemma.js', import.meta.url), { type: 'module' });
        this.isReady = false;

        this.worker.addEventListener('message', (event) => {
            const { type, payload } = event.data;
            switch (type) {
                case 'READY':
                    console.log('[FunctionRouter] Model is fully loaded and ready.');
                    this.isReady = true;
                    EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, '지능형 지휘 시스템(FunctionGemma) 접속이 완료되었습니다.');
                    break;
                case 'PROGRESS':
                    if (payload.status === 'progress') {
                        // console.log(`[FunctionRouter] Loading ${payload.file}: ${Math.round(payload.progress)}%`);
                    } else if (payload.status === 'done') {
                        console.log(`[FunctionRouter] Loaded ${payload.file}`);
                    }
                    break;
                case 'ERROR':
                    console.error('[FunctionRouter] Worker error:', payload);
                    break;
            }
        });
    }

    init() {
        console.log('[FunctionRouter] Initializing worker...');
        EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, '지능형 지휘 시스템(FunctionGemma)을 활성화 중입니다...');
        this.worker.postMessage({ type: 'INIT' });
    }

    /**
     * Executes a command via FunctionGemma.
     */
    async execute(userInput) {
        if (!this.isReady) {
            console.warn('[FunctionRouter] Not ready. Returning null.');
            return null;
        }

        return new Promise((resolve) => {
            const onResult = (event) => {
                const { type, payload } = event.data;
                if (type === 'COMMAND_RESULT' && payload.original === userInput) {
                    this.worker.removeEventListener('message', onResult);
                    this.handleFunctionCall(payload.parsed);
                    resolve(payload.parsed);
                }
            };
            this.worker.addEventListener('message', onResult);
            this.worker.postMessage({ type: 'PROCESS_COMMAND', payload: userInput });
        });
    }

    handleFunctionCall(parsedData) {
        if (!parsedData || !parsedData.function_call) {
            console.log('[FunctionRouter] No valid function call determined.');
            return;
        }

        const funcName = parsedData.function_call.name;
        const args = parsedData.function_call.arguments || {};

        console.log(`[FunctionRouter] Executing API Call: ${funcName}`, args);

        if (funcName === 'attack_priority') {
            const role = args.role; // e.g. "SUPPORT"
            if (role) {
                EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `전술 변경: [${role}] 유형의 적을 최우선으로 타격합니다.`);
                EventBus.emit(EventBus.EVENTS.AI_COMMAND, {
                    name: 'change_target_priority',
                    args: { priority: role }
                });
            }
        } else if (funcName === 'set_ai_state') {
            const state = args.state;
            if (state) {
                EventBus.emit(EventBus.EVENTS.SYSTEM_MESSAGE, `진영 상태 변경: [${state}]`);
                EventBus.emit(EventBus.EVENTS.AI_COMMAND, {
                    name: 'change_mercenary_stance',
                    args: { stance: state }
                });
            }
        }
    }
}

const functionRouter = new FunctionRouter();
export default functionRouter;
