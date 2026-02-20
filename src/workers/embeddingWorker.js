import { pipeline, env } from '@huggingface/transformers';

// Optimization: We need to pull from the remote HF Hub first before caching
// Do not force local only or Vite will intercept network requests as HTML
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;

class EmbeddingPipeline {
    static task = 'feature-extraction';
    static model = 'onnx-community/embeddinggemma-300m-ONNX';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            console.log(`[Embedding Worker] Initializing model ${this.model}...`);
            this.instance = await pipeline(this.task, this.model, {
                progress_callback,
                // Using WASM since embeddinggemma-300m might have issues with pure WebGPU atm, but auto is fine
                device: 'auto'
            });
            console.log(`[Embedding Worker] Model loaded.`);
        }
        return this.instance;
    }
}

// Memory constraints for the worker
const MAX_EMBEDDING_MEMORY = 50;
let embeddingMemory = [];

self.addEventListener('message', async (event) => {
    const { type, payload } = event.data;

    try {
        if (type === 'INIT') {
            await EmbeddingPipeline.getInstance((progress) => {
                self.postMessage({ type: 'PROGRESS', payload: progress });
            });
            self.postMessage({ type: 'READY' });
            return;
        }

        if (type === 'PROCESS_EVENT') {
            const eventString = payload;
            const extractor = await EmbeddingPipeline.getInstance();

            // Extract features (embeddings) for the event string
            // We use pooling: 'mean' and normalize: true to get a nice 1D vector
            const output = await extractor(eventString, { pooling: 'mean', normalize: true });

            // Store the embedded data in our limited memory
            embeddingMemory.push({
                text: eventString,
                vector: Array.from(output.data) // Convert Float32Array to standard JS Array for storage/transport
            });

            // Enforce memory limit
            if (embeddingMemory.length > MAX_EMBEDDING_MEMORY) {
                embeddingMemory.shift();
            }

            console.log(`[Embedding Worker] Embedded event: "${eventString}". Total in memory: ${embeddingMemory.length}`);

            self.postMessage({
                type: 'EVENT_PROCESSED',
                payload: { event: eventString, memorySize: embeddingMemory.length }
            });
        }

        if (type === 'GET_VECTOR') {
            const text = payload;
            const extractor = await EmbeddingPipeline.getInstance();
            const output = await extractor(text, { pooling: 'mean', normalize: true });

            self.postMessage({
                type: 'VECTOR_RESULT',
                payload: { text, vector: Array.from(output.data) }
            });
        }

        if (type === 'SEARCH_MEMORY') {
            const query = payload;
            const extractor = await EmbeddingPipeline.getInstance();
            const queryOutput = await extractor(query, { pooling: 'mean', normalize: true });
            const queryVector = Array.from(queryOutput.data);

            // Calculate similarities
            const results = embeddingMemory.map(item => ({
                text: item.text,
                score: cosineSimilarity(queryVector, item.vector)
            }));

            // Sort by score descending and take top 5
            results.sort((a, b) => b.score - a.score);
            const topMatches = results.filter(r => r.score > 0.5).slice(0, 5);

            self.postMessage({
                type: 'SEARCH_RESULT',
                payload: { query, results: topMatches }
            });
        }
    } catch (error) {
        console.error('[Embedding Worker] Error:', error);
        self.postMessage({ type: 'ERROR', payload: error.message });
    }
});

function cosineSimilarity(vecA, vecB) {
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
