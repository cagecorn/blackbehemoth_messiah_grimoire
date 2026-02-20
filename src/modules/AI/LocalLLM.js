/**
 * LocalLLM
 * Handles communication with LM Studio (Local host: 1234).
 */
class LocalLLM {
    constructor() {
        this.apiURL = 'http://localhost:1234/v1/chat/completions';
        this.modelName = 'my_final_ai';
        this.isReady = false;
    }

    /**
     * Check if LM Studio is up and the model is loaded.
     */
    async checkStatus() {
        console.log('[LocalLLM] Checking status...');
        try {
            // Lightweight call to check model availability
            const response = await fetch('http://localhost:1234/v1/models', {
                method: 'GET'
            });
            if (response.ok) {
                const data = await response.json();
                // If modelName exists, use it. Otherwise, use the first available model.
                const modelExists = data.data.find(m => m.id === this.modelName);
                if (modelExists) {
                    this.isReady = true;
                    console.log(`[LocalLLM] Model '${this.modelName}' is READY.`);
                    return true;
                } else if (data.data.length > 0) {
                    this.modelName = data.data[0].id;
                    this.isReady = true;
                    console.warn(`[LocalLLM] Model 'my_final_ai' not found. Using '${this.modelName}' instead.`);
                    return true;
                } else {
                    console.warn(`[LocalLLM] No models loaded in LM Studio.`);
                }
            }
        } catch (error) {
            console.error('[LocalLLM] LM Studio not reachable:', error.message);
        }
        this.isReady = false;
        return false;
    }

    async generateResponse(prompt, memories = []) {
        console.log('[LocalLLM] Requesting response with memories:', memories);

        const contextString = memories.length > 0
            ? "Recent Memories:\n" + memories.map(m => `- ${m.text}`).join('\n')
            : "No specific recent memories.";

        const systemMessage = {
            role: "system",
            content: `당신은 어두운 판타지 세계의 충성스럽고 전투로 단련된 전사 용병입니다. 
전사는 당신이 보필하는 주인공이며 '메시아'의 의지를 대변합니다. 
**반드시 한국어로만 대답하세요.** 영어는 절대 사용하지 마세요.
말투는 전사답게 무겁고 간결하게(1-2문장) 하세요.
다음 최근 기억들을 참고하여 대답하세요:
${contextString}`
        };

        const userMessage = {
            role: "user",
            content: prompt
        };

        try {
            const response = await fetch(this.apiURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.modelName,
                    messages: [systemMessage, userMessage],
                    temperature: 0.7,
                    max_tokens: 100
                })
            });

            if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

            const data = await response.json();
            this.isReady = true; // Success implies ready
            return data.choices[0].message.content.trim();
        } catch (error) {
            console.error('[LocalLLM] Error:', error);
            return "... (용병은 무기를 다듬으며 당신의 말에 묵묵부답입니다)";
        }
    }
}

const localLLM = new LocalLLM();
export default localLLM;
