/**
 * LocalLLM
 * Handles communication with LM Studio (Local host: 1234).
 */
class LocalLLM {
    constructor() {
        this.apiURL = 'http://localhost:1234/v1/chat/completions';
        this.modelName = 'my_final_ai';
        this.isReady = false;

        this.baseSystemPrompt = `너는 판타지 세계관 속 용병이다. 너는 메시아를 위해서 전투를 벌인다. 너는 진중하면서도 동시에 코믹스러운 대사를 외친다. 항상 깊은 사고와 추론 과정(Chain of Thought)을 거칠 것. 너는 한국어에 매우 유창하다.`;
    }

    /**
     * Check if LM Studio is up and the model is loaded.
     */
    async checkStatus() {
        console.log('[LocalLLM] Checking status...');
        try {
            const response = await fetch('http://localhost:1234/v1/models', {
                method: 'GET'
            });
            if (response.ok) {
                const data = await response.json();
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

    async generateResponse(characterConfig, prompt, memories = []) {
        console.log(`[LocalLLM] Requesting response for ${characterConfig.name} with memories:`, memories);

        const contextString = memories.length > 0
            ? "최근 기억들:\n" + memories.map(m => `- ${m.text}`).join('\n')
            : "특별한 최근 기억 없음.";

        const systemMessage = {
            role: "system",
            content: `${this.baseSystemPrompt}
너의 이름은 ${characterConfig.name}이며, 너의 성격과 특징은 다음과 같다: ${characterConfig.personality}
말투는 캐릭터의 성격에 맞춰서 생생하게 표현하되, 1-2문장의 짧은 대사로 하라.
다음 최근 기억들을 참고하여 대답하라:
${contextString}
**중요: 너의 내면 심리나 상황 설명, 괄호()로 묶인 지시문은 절대 출력하지 말고 오직 캐릭터의 '대사'만 출력하라.**`
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
                    max_tokens: 200
                })
            });

            if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

            const data = await response.json();
            this.isReady = true; // Success implies ready
            const content = data.choices[0].message.content.trim();
            return this.sanitizeBark(content);
        } catch (error) {
            console.error('[LocalLLM] Error:', error);
            return "... (묵묵부답입니다)";
        }
    }

    /**
     * Generate a random "bark" during combat.
     */
    async generateBark(characterConfig) {
        console.log(`[LocalLLM] Generating bark for ${characterConfig.name}`);

        const systemMessage = {
            role: "system",
            content: `${this.baseSystemPrompt}
너의 이름은 ${characterConfig.name}이며, 너의 성격과 특징은 다음과 같다: ${characterConfig.personality}
지금은 전투 중이거나 던전을 탐험 중인 상황이다.
이 상황에 어울리는 짧고 강렬한 대사 한 마디를 한국어로 작성하라.
**중요: 너의 내면 심리나 상황 설명, 괄호()로 묶인 지시문은 절대 출력하지 말고 오직 대사만 출력하라.**`
        };

        const userMessage = {
            role: "user",
            content: "전투 상황에 맞는 말 한마디 해줘."
        };

        try {
            const response = await fetch(this.apiURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.modelName,
                    messages: [systemMessage, userMessage],
                    temperature: 0.8,
                    max_tokens: 150
                })
            });

            if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

            const data = await response.json();
            let content = data.choices[0].message.content.trim();

            // Sanitization: Remove <thought> tags, (parentheses), [brackets], and any CoT artifacts
            content = this.sanitizeBark(content);

            return content;
        } catch (error) {
            console.error('[LocalLLM] Bark Error:', error);
            return null;
        }
    }

    /**
     * Generate a reaction to a previous bark (Tsukkomi).
     */
    async generateReactionBark(characterConfig, previousSpeakerName, previousText) {
        console.log(`[LocalLLM] Generating reaction for ${characterConfig.name} to ${previousSpeakerName}`);

        const systemMessage = {
            role: "system",
            content: `${this.baseSystemPrompt}
너의 이름은 ${characterConfig.name}이며, 너의 성격과 특징은 다음과 같다: ${characterConfig.personality}
동료 용병인 '${previousSpeakerName}'이 방금 다음과 같이 말했다: "${previousText}"
이 대사를 듣고 너의 성격에 맞게 짧고 재치 있는 반응(츳코미)을 한국어로 한 마디 하라.
**중요: 너의 내면 심리나 상황 설명, 괄호()로 묶인 지시문은 절대 출력하지 말고 오직 대사만 출력하라.**`
        };

        const userMessage = {
            role: "user",
            content: "동료의 말에 대꾸해줘."
        };

        try {
            const response = await fetch(this.apiURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.modelName,
                    messages: [systemMessage, userMessage],
                    temperature: 0.8,
                    max_tokens: 150
                })
            });

            if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

            const data = await response.json();
            let content = data.choices[0].message.content.trim();
            return this.sanitizeBark(content);
        } catch (error) {
            console.error('[LocalLLM] Reaction Bark Error:', error);
            return null;
        }
    }

    /**
     * Sanitizes the LLM output to remove thoughts, meta-commentary, and stage directions.
     */
    sanitizeBark(text) {
        if (!text) return "";

        let sanitized = text;

        // 1. Remove <thought>...</thought> tags and their content
        sanitized = sanitized.replace(/<thought>[\s\S]*?<\/thought>/gi, '');

        // 2. Remove text inside parentheses (often contains CoT or stage directions)
        sanitized = sanitized.replace(/\([\s\S]*?\)/g, '');

        // 3. Remove text inside square brackets
        sanitized = sanitized.replace(/\[[\s\S]*?\]/g, '');

        // 4. Remove "CoT:" or "Thought:" labels if they slipped through
        sanitized = sanitized.replace(/(CoT|thought|생각|추론):\s*/gi, '');

        // 5. Final trim and cleanup
        sanitized = sanitized.trim();

        // If after cleaning we have multiple quotes, try to take only the one inside quotes
        const quoteMatch = sanitized.match(/"([^"]+)"/);
        if (quoteMatch) {
            sanitized = quoteMatch[1];
        }

        return sanitized;
    }
}

const localLLM = new LocalLLM();
export default localLLM;
