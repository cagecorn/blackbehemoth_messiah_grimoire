import EventBus from '../Events/EventBus.js';

/**
 * Manager class on the main thread to handle communication with the Embedding Web Worker.
 * Acts as an observer to the EventBus.
 */
class EmbeddingGemmaManager {
    constructor() {
        this.worker = null;
        this.isReady = false;
        this.pendingSearch = null;
    }

    init() {
        // Disable heavy AI to prevent freezing (esp. on mobile)
        // Since it's a web build, we'll keep it disabled for now as per user request
        console.log('[EmbeddingGemma] Resource-heavy AI Worker is disabled for stability.');
        this.isReady = true; // Set to ready so dependents don't wait forever

        /* 
        console.log('[EmbeddingGemma] Initializing...');
        // Vite specific worker instantiation
        try {
            this.worker = new Worker(new URL('../../workers/embeddingWorker.js', import.meta.url), { type: 'module' });
            this.worker.onmessage = (e) => this.handleWorkerMessage(e);
            this.worker.onerror = (err) => console.error('[EmbeddingGemma] Worker Error:', err);
            // Tell worker to start loading the model
            this.worker.postMessage({ type: 'INIT' });
        } catch (e) {
            console.error('[EmbeddingGemma] Failed to start worker:', e);
            this.isReady = true;
        }
        */

        // Subscribe to Global Event Bus (Keep subscriptions so methods don't error)
        EventBus.on(EventBus.EVENTS.ITEM_COLLECTED, this.handleItemCollected, this);
        EventBus.on(EventBus.EVENTS.MONSTER_KILLED, this.handleMonsterKilled, this);
        EventBus.on(EventBus.EVENTS.SYSTEM_MESSAGE, this.handleSystemMessage, this);
        EventBus.on(EventBus.EVENTS.UNIT_DIED, this.handleUnitDied, this);
    }

    handleWorkerMessage(event) {
        const { type, payload } = event.data;
        if (type === 'READY') {
            this.isReady = true;
            console.log('[EmbeddingGemma] Model loaded. Assistant is now observing.');
        } else if (type === 'PROGRESS') {
            // Optional: update a loading bar in the UI
            // console.log(`[EmbeddingGemma] Loading: ${payload.file} - ${Math.round(payload.progress)}%`);
        } else if (type === 'EVENT_PROCESSED') {
            console.log(`[EmbeddingGemma] AI Memory Updated. (Memory Size: ${payload.memorySize})`);
        } else if (type === 'SEARCH_RESULT') {
            if (this.pendingSearch && this.pendingSearch.query === payload.query) {
                this.pendingSearch.resolve(payload.results);
                this.pendingSearch = null;
            }
        } else if (type === 'ERROR') {
            console.error('[EmbeddingGemma] Extraction Error:', payload);
        }
    }

    sendToAI(eventString) {
        if (!this.isReady) {
            console.warn('[EmbeddingGemma] Model mapping is still loading, skipped event:', eventString);
            return;
        }

        console.log(`[EmbeddingGemma] Notified: ${eventString}`);
        this.worker.postMessage({ type: 'PROCESS_EVENT', payload: eventString });
    }

    /**
     * Search the AI memory for relevant context based on a query string.
     * @param {string} query 
     * @returns {Promise<Array>}
     */
    async searchMemory(query) {
        if (!this.isReady) return [];

        return new Promise((resolve) => {
            this.pendingSearch = { query, resolve };
            this.worker.postMessage({ type: 'SEARCH_MEMORY', payload: query });
        });
    }

    // Callbacks for the EventBus
    handleItemCollected(payload) {
        const { emoji, collectorId } = payload;
        const name = (collectorId === 'archer') ? '아처' : '전사';
        this.sendToAI(`${name}가 아이템을 획득했습니다: ${emoji}`);
    }

    handleMonsterKilled(payload) {
        const { monsterId, attackerId } = payload;
        const targetChannel = attackerId || 'warrior';
        const monsterEmoji = (monsterId === 'goblin_sprite' || monsterId === 'monster') ? '👺' : '👾';

        let attackerName = '전사';
        if (targetChannel === 'archer') attackerName = '아처';
        if (targetChannel === 'healer') attackerName = '힐러';
        if (targetChannel === 'wizard') attackerName = '마법사';
        if (targetChannel === 'bard') attackerName = '바드';

        this.sendToAI(`${attackerName}(이)가 몬스터를 처치했습니다: ${monsterEmoji}`);
    }

    handleSystemMessage(msg) {
        // Record all system messages as "big things" to memory
        this.sendToAI(`시스템 보고: ${msg}`);
    }

    handleUnitDied(unitName) {
        this.sendToAI(`아군 사망 경보: ${unitName}가 전사했습니다! 💀`);
    }

    destroy() {
        EventBus.off(EventBus.EVENTS.ITEM_COLLECTED, this.handleItemCollected, this);
        EventBus.off(EventBus.EVENTS.MONSTER_KILLED, this.handleMonsterKilled, this);
        EventBus.off(EventBus.EVENTS.SYSTEM_MESSAGE, this.handleSystemMessage, this);
        EventBus.off(EventBus.EVENTS.UNIT_DIED, this.handleUnitDied, this);
        if (this.worker) this.worker.terminate();
    }
}

const embeddingGemma = new EmbeddingGemmaManager();
export default embeddingGemma;
