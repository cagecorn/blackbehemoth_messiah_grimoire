import EventBus from '../Events/EventBus.js';
import embeddingGemma from './EmbeddingGemma.js';

/**
 * SemanticRouter
 * Maps user natural language to specific Game Intents using Vector Cosine Similarity.
 * Uses the existing EmbeddingGemma worker to avoid JSON generation flakiness.
 */
class SemanticRouter {
    constructor() {
        this.intents = [
            {
                id: 'AGGRESSIVE',
                examples: [
                    "공격해!", "사냥 시작해", "적을 공격해", "몬스터를 잡아", "싸워!",
                    "Attack enemies", "Start hunting", "Kill monsters", "Battle mode"
                ]
            },
            {
                id: 'MANUAL',
                examples: [
                    "기다려", "정지", "내가 직접 할게", "그만해", "나를 따라와",
                    "Stop", "Wait", "I'll do it manually", "Manual mode", "Follow me"
                ]
            },
            {
                id: 'IDLE',
                examples: [
                    "휴식", "가만히 있어", "움직이지 마",
                    "Rest", "Stay still", "Don't move", "Freeze"
                ]
            },
            {
                id: 'CHAT',
                examples: [
                    "방금 어땠어?", "기분이 어때?", "오늘 뭐했어?", "안녕", "반가워", "배고파?",
                    "How was it?", "How are you feeling?", "What did you do?", "Hello", "Hi", "Nice to meet you"
                ]
            },
            {
                id: 'FLEE',
                examples: [
                    "도망쳐!", "튀어!", "살려줘!", "물러나!", "도망가자!",
                    "Run away!", "Flee!", "Retreat!", "Get back!", "Run!"
                ]
            }
        ];

        this.intentVectors = new Map(); // Map<intentId, Array<Vector>>
        this.isReady = false;
        this.initPromise = null;
    }

    /**
     * Pre-embed all intent examples so matching is instantaneous later.
     */
    async init() {
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            console.log('[SemanticRouter] Initializing and pre-embedding intents...');

            // Wait for EmbeddingGemma to be ready
            if (!embeddingGemma.isReady) {
                await new Promise(resolve => {
                    const check = setInterval(() => {
                        if (embeddingGemma.isReady) {
                            clearInterval(check);
                            resolve();
                        }
                    }, 100);
                });
            }

            const promises = [];
            for (const intent of this.intents) {
                for (const example of intent.examples) {
                    promises.push(this.embedAndStore(intent.id, example));
                }
            }

            await Promise.all(promises);
            this.isReady = true;
            console.log('[SemanticRouter] All intents embedded. Router ready.');
        })();

        return this.initPromise;
    }

    async embedAndStore(intentId, text) {
        return new Promise((resolve) => {
            // We use the underlying worker directly or via helper
            const onVector = (event) => {
                const { type, payload } = event.data;
                if (type === 'VECTOR_RESULT' && payload.text === text) {
                    embeddingGemma.worker.removeEventListener('message', onVector);

                    if (!this.intentVectors.has(intentId)) {
                        this.intentVectors.set(intentId, []);
                    }
                    this.intentVectors.get(intentId).push(payload.vector);
                    resolve();
                }
            };

            embeddingGemma.worker.addEventListener('message', onVector);
            embeddingGemma.worker.postMessage({ type: 'GET_VECTOR', payload: text });
        });
    }

    /**
     * Matches user input against pre-embedded vectors using Cosine Similarity.
     */
    async route(userInput) {
        if (!this.isReady) return null;

        // Get user input vector
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

        let bestIntent = 'NONE';
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

        // Confidence threshold (e.g. 0.6)
        if (maxScore < 0.6) {
            return { intent: 'NONE', score: maxScore };
        }

        return { intent: bestIntent, score: maxScore };
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

const semanticRouter = new SemanticRouter();
export default semanticRouter;
