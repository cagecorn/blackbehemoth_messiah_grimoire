import embeddingGemma from './EmbeddingGemma.js';

/**
 * IntentRouter.js
 * A lightweight router that uses EmbeddingGemma (Xenova/all-MiniLM-L6-v2) to 
 * classify input as either a 'COMMAND' (for FunctionGemma) or 'CHAT' (for LocalLLM).
 */
class IntentRouter {
    constructor() {
        this.intents = [
            { id: 'ATTACK_SUPPORT', examples: ["적의 힐러를 노려라", "지원가를 먼저 잡아", "마법사를 공격해", "힐러부터 죽여", "주술사를 점사해", "적의 후열을 쳐", "주술사를 먼저 공격해라"] },
            { id: 'ATTACK_MELEE', examples: ["전사들에게 집중해라", "앞라인부터 녹여", "근접 공격수들을 공격해", "방패병을 쳐라", "가까운 적부터", "전사를 잡아"] },
            { id: 'ATTACK_RANGED', examples: ["궁수를 잡아라", "원거리 딜러부터 공격해", "활잡이를 죽여", "저격수를 먼저 쳐"] },
            { id: 'FLEE', examples: ["후퇴해", "도망쳐", "전원 뒤로 빠져", "살아남아라", "일보 후퇴", "뒤로 가"] },
            { id: 'IDLE', examples: ["대기해", "멈춰", "공격 중지", "가만히 있어", "그대로 대기"] },
            { id: 'CHAT', examples: ["안녕", "뭐해", "반가워", "배고파", "오늘 날씨 어때?", "고생했어", "잘 지내?", "이름이 뭐야?"] }
        ];
        this.intentVectors = new Map();
        this.isReady = false;

    }

    async init() {
        // Wait for EmbeddingGemma to be ready
        await this.waitForEmbeddingGemma();

        if (!embeddingGemma.worker) {
            console.log('[IntentRouter] EmbeddingGemma worker is not available. Running in basic CHAT mode.');
            this.isReady = true;
            return;
        }

        // Listen to EmbeddingGemma for vector results
        embeddingGemma.worker.addEventListener('message', (event) => {
            const { type, payload } = event.data;
            if (type === 'VECTOR_RESULT') {
                // If it's one of our setup vectors, store it
                for (const intent of this.intents) {
                    const idx = intent.examples.indexOf(payload.text);
                    if (idx !== -1) {
                        if (!this.intentVectors.has(intent.id)) {
                            this.intentVectors.set(intent.id, []);
                        }
                        this.intentVectors.get(intent.id).push(payload.vector);
                        break;
                    }
                }
            }
        });

        console.log('[IntentRouter] Pre-embedding binary intents...');

        const promises = [];
        for (const intent of this.intents) {
            for (const example of intent.examples) {
                promises.push(this.embedAndStore(intent.id, example));
            }
        }

        await Promise.all(promises);
        console.log('[IntentRouter] Binary intents embedded. Router ready.');
        this.isReady = true;
    }

    waitForEmbeddingGemma() {
        return new Promise(resolve => {
            if (embeddingGemma.isReady) {
                resolve();
            } else {
                const check = setInterval(() => {
                    if (embeddingGemma.isReady) {
                        clearInterval(check);
                        resolve();
                    }
                }, 100);
            }
        });
    }

    embedAndStore(intentId, text) {
        return new Promise((resolve) => {
            const onVector = (event) => {
                const { type, payload } = event.data;
                if (type === 'VECTOR_RESULT' && payload.text === text) {
                    embeddingGemma.worker.removeEventListener('message', onVector);
                    resolve();
                }
            };
            embeddingGemma.worker.addEventListener('message', onVector);
            embeddingGemma.worker.postMessage({ type: 'GET_VECTOR', payload: text });
        });
    }

    /**
     * Determines whether the user input is a COMMAND or CHAT.
     */
    async route(userInput) {
        if (!this.isReady) {
            console.warn('[IntentRouter] Not ready. Defaulting to CHAT.');
            return 'CHAT';
        }

        const userVector = await new Promise((resolve) => {
            const onVector = (event) => {
                const { type, payload } = event.data;
                if (type === 'VECTOR_RESULT' && payload.text === userInput) {
                    embeddingGemma.worker.removeEventListener('message', onVector);
                    resolve(payload.vector);
                }
            };
            embeddingGemma.worker.addEventListener('message', onVector);
            embeddingGemma.worker.postMessage({ type: 'GET_VECTOR', payload: userInput });
        });

        let bestIntent = 'CHAT'; // Default fallback
        let maxScore = -1;

        for (const [intentId, vectors] of this.intentVectors.entries()) {
            for (const vec of vectors) {
                const score = this.cosineSimilarity(userVector, vec);
                if (score > maxScore) {
                    maxScore = score;
                    bestIntent = intentId;
                }
            }
        }

        console.log(`[IntentRouter] Input classified as ${bestIntent} (Score: ${maxScore.toFixed(3)})`);

        // If confidence is too low, assume it's chat
        if (maxScore < 0.35) {
            console.warn('[IntentRouter] Confidence too low, defaulting to CHAT.');
            return { type: 'CHAT', intent: 'CHAT', score: maxScore };
        }

        // Map the determined intent to a concrete AI_COMMAND payload
        if (bestIntent.startsWith('ATTACK_')) {
            const role = bestIntent.replace('ATTACK_', ''); // 'SUPPORT', 'MELEE', 'RANGED'
            return {
                type: 'COMMAND',
                intent: bestIntent,
                score: maxScore,
                action: { name: "attack_priority", arguments: { role: role } }
            };
        } else if (bestIntent === 'FLEE' || bestIntent === 'IDLE') {
            return {
                type: 'COMMAND',
                intent: bestIntent,
                score: maxScore,
                action: { name: "set_ai_state", arguments: { state: bestIntent } }
            };
        } else {
            return { type: 'CHAT', intent: 'CHAT', score: maxScore };
        }
    }

    cosineSimilarity(vecA, vecB) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}

const intentRouter = new IntentRouter();
export default intentRouter;
