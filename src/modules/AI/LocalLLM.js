/**
 * LocalLLM
 * Handles communication with LM Studio (Local host: 1234).
 */
class LocalLLM {
    constructor() {
        this.apiURL = 'http://localhost:1234/v1/chat/completions';
        this.modelName = 'my_final_ai';
        this.isReady = false;

        this.baseSystemPrompt = `당신은 판타지 세계관 속의 캐릭터입니다. 당신에게 주어진 성격과 설정에 따라 행동하고 말해야 합니다. 한국어의 미묘한 뉘앙스를 잘 살린 자연스러운 구어체 대사를 사용하십시오.`;
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

    async generateResponse(characterConfig, prompt, memories = [], currentLevel = 1) {
        console.log(`[LocalLLM] Requesting response for ${characterConfig.name} (LV ${currentLevel}) with memories:`, memories);

        const unlockedNarrative = (characterConfig.narrativeUnlocks || [])
            .filter(u => currentLevel >= u.level)
            .map(u => `- ${u.trait}`)
            .join('\n');

        const contextString = memories.length > 0
            ? "최근 기억:\n" + memories.map(m => `- ${m.text}`).join('\n')
            : "";

        const systemMessage = {
            role: "system",
            content: `[캐릭터 설정]
이름: ${characterConfig.name}
성격: "${characterConfig.personality}"
${unlockedNarrative ? `[해금된 서사]\n${unlockedNarrative}\n` : ''}
${characterConfig.relationships ? `[인물 관계]\n${Object.entries(characterConfig.relationships).map(([id, desc]) => `- ${id}: ${desc}`).join('\n')}\n` : ''}
[지침]
1. 위 성격과 해금된 서사에 맞춰 대답하십시오.
2. 1~2문장으로 짧고 간결하게 말하십시오.
3. 상황이나 행동 지문(괄호 등)을 출력하지 말고 오직 '대사'만 출력하십시오.
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
                    max_tokens: 150
                })
            });

            if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

            const data = await response.json();
            this.isReady = true;
            const content = data.choices[0].message.content.trim();
            return this.sanitizeBark(content);
        } catch (error) {
            console.error('[LocalLLM] Error:', error);
            return "...";
        }
    }

    /**
     * Generate a random "bark" during combat.
     */
    async generateBark(characterConfig, currentLevel = 1) {
        console.log(`[LocalLLM] Generating bark for ${characterConfig.name} (LV ${currentLevel})`);

        const unlockedNarrative = (characterConfig.narrativeUnlocks || [])
            .filter(u => currentLevel >= u.level)
            .map(u => `- ${u.trait}`)
            .join('\n');

        const systemMessage = {
            role: "system",
            content: `[캐릭터 설정]
이름: ${characterConfig.name}
성격: "${characterConfig.personality}"
${unlockedNarrative ? `[해금된 서사]\n${unlockedNarrative}\n` : ''}
${characterConfig.relationships ? `[인물 관계]\n${Object.entries(characterConfig.relationships).map(([id, desc]) => `- ${id}: ${desc}`).join('\n')}\n` : ''}
[지침]
1. 전투 중이거나 던전을 탐험하는 긴박한 상황입니다.
2. 위 성격과 서사를 잘 드러내는 짧고 강렬한 한마디를 하십시오.
3. 생각이나 독백, 지문(괄호)은 절대 출력하지 마십시오. 오직 입 밖으로 내는 대사만 출력하십시오.`
        };

        const userMessage = {
            role: "user",
            content: "상황에 맞는 대사를 한마디 하시오."
        };

        try {
            const response = await fetch(this.apiURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.modelName,
                    messages: [systemMessage, userMessage],
                    temperature: 0.8,
                    max_tokens: 100
                })
            });

            if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

            const data = await response.json();
            let content = data.choices[0].message.content.trim();

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
    async generateReactionBark(characterConfig, previousSpeakerName, previousText, previousSpeakerId = null, currentLevel = 1) {
        console.log(`[LocalLLM] Generating reaction for ${characterConfig.name} (LV ${currentLevel}) to ${previousSpeakerName}`);

        const unlockedNarrative = (characterConfig.narrativeUnlocks || [])
            .filter(u => currentLevel >= u.level)
            .map(u => `- ${u.trait}`)
            .join('\n');

        let relationshipContext = "";
        if (previousSpeakerId && characterConfig.relationships && characterConfig.relationships[previousSpeakerId]) {
            relationshipContext = `\n[관계]\n대상(${previousSpeakerName})에 대한 생각: "${characterConfig.relationships[previousSpeakerId]}"`;
        }

        const systemMessage = {
            role: "system",
            content: `[캐릭터 설정]
이름: ${characterConfig.name}
성격: "${characterConfig.personality}"
${unlockedNarrative ? `[해금된 서사]\n${unlockedNarrative}\n` : ''}
${characterConfig.relationships ? `[인물 관계]\n${Object.entries(characterConfig.relationships).map(([id, desc]) => `- ${id}: ${desc}`).join('\n')}\n` : ''}${relationshipContext}

[상황]
동료 '${previousSpeakerName}'의 말: "${previousText}"

[지침]
1. 동료의 말에 대해 성격과 서사에 맞는 반응을 짧게(1문장) 하십시오.
2. 위 [관계]에 서술된 감정이 있다면 이를 바탕으로 대답하십시오. (싫어하면 비꼬고, 좋아하면 맞장구치기 등)
3. 지문이나 생각은 출력하지 마십시오.`
        };

        const userMessage = {
            role: "user",
            content: "동료의 말에 대꾸하시오."
        };

        try {
            const response = await fetch(this.apiURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.modelName,
                    messages: [systemMessage, userMessage],
                    temperature: 0.8,
                    max_tokens: 100
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

        // 1. Remove <thought>...</thought> tags
        sanitized = sanitized.replace(/<thought>[\s\S]*?<\/thought>/gi, '');

        // 2. Remove text inside parentheses
        sanitized = sanitized.replace(/\([\s\S]*?\)/g, '');

        // 3. Remove text inside square brackets
        sanitized = sanitized.replace(/\[[\s\S]*?\]/g, '');

        // 4. Remove labels like "Character:" or "Name:"
        sanitized = sanitized.replace(/^[\w\u3131-\uD79D]+:\s*/, '');

        // 5. Final trim
        sanitized = sanitized.trim();

        // Remove wrapping quotes if they exist
        if (sanitized.startsWith('"') && sanitized.endsWith('"')) {
            sanitized = sanitized.substring(1, sanitized.length - 1);
        }

        return sanitized;
    }
}

const localLLM = new LocalLLM();
export default localLLM;
