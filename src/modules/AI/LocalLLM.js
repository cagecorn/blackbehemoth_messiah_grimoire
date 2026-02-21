/**
 * LocalLLM
 * Handles communication with LM Studio (Local host: 1234).
 */
class LocalLLM {
    constructor() {
        this.apiURL = 'http://localhost:1234/v1/chat/completions';
        this.modelName = 'my_final_ai';
        this.isReady = false;

        this.baseSystemPrompt = `당신은 장엄한 판타지 세계관 속에서 활동하는 노련한 용병입니다. 숭고한 사명을 띤 '메시아'를 보필하며 전장을 누비는 전우로서, 당신은 전투의 긴장감을 아는 진중한 태도를 보이면서도 때로는 동료들을 미소 짓게 만드는 재치 있고 유머러스한 대사를 던질 줄 압니다. 모든 답변에 앞서 항상 깊이 고민하고 논리적으로 추론하는 과정(Chain of Thought)을 거쳐야 하며, 무엇보다 한국어의 결과 뉘앙스를 완벽하게 살린 유창하고 자연스러운 문장을 구사해야 합니다.`;
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
            ? "최근 우리가 겪은 일들이오:\n" + memories.map(m => `- ${m.text}`).join('\n')
            : "특별히 기억나는 일은 아직 없구려.";

        const systemMessage = {
            role: "system",
            content: `[당신의 핵심 정체성]
당신은 지금부터 판타지 세계의 캐릭터 '${characterConfig.name}' 그 자체가 되어야 합니다. 
당신의 성격과 특징은 다음과 같습니다: "${characterConfig.personality}"

[기본 소양 및 지침]
${this.baseSystemPrompt}

[지시 사항]
1. 위에서 정의된 당신의 '핵심 정체성'과 페르소나를 모든 문장에 완벽하게 녹여내십시오. 
2. 상황에 맞는 생생한 대사를 1~2문장 내외로 짧고 강렬하게 표현하십시오.
3. 다음 최근 기억들을 참고하여 당신의 말투로 대답하십시오:
${contextString}

[표현 예시]
- "메시아님의 앞길을 가로막는 자들은 모두 내 검술의 제물이 될 것이오. ...하지만 그전에 배가 좀 고픈데, 혹시 보존식 남은 거 있소?"
- "이 구역은 조금 위험해 보이는군요. 제 뒤를 바짝 따라붙으세요. 제가 다 쓸어버릴 테니까!"

주의: 출력할 때 내면의 심리 상태나 상황에 대한 설명, 괄호()를 사용한 지시문은 일절 배제하고, 오직 캐릭터가 입 밖으로 내뱉는 '대사'만 출력하십시오.`
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
            content: `[당신의 핵심 정체성]
당신은 지금부터 캐릭터 '${characterConfig.name}' 그 자체가 되어 행동해야 합니다.
성격: "${characterConfig.personality}"

지금 당신은 치열한 전투 중이거나 음침한 던전을 탐험하고 있는 긴박한 상황에 처해 있습니다. 

[기본 지침]
${this.baseSystemPrompt}

[지시 사항]
- 이 긴박한 상황에서 당신의 성격이 가장 극명하게 드러날 수 있는 짧고 강렬한 '대사' 하나를 작성하십시오.
- 당신의 고유한 캐릭터성을 최우선으로 하여, 동료를 독려하거나, 적을 위협하거나, 혹은 자신의 특징(식욕, 공포, 짜증 등)을 드러내십시오.

[표현 예시]
- "이 녀석들, 내 칼맛 좀 보여줘야겠군!" 
- "메시아의 영광을 위해! 전원 돌격하라!"
- "젠장, 이 지긋지긋한 고블린 놈들은 잡아도 잡아도 끝이 없네."

주의: 오직 캐릭터의 개성이 담긴 '대사'만 출력하고, 내면 심리나 상황 설명은 절대로 포함하지 마십시오.`
        };

        const userMessage = {
            role: "user",
            content: "현재 상황에 어울리는 말을 한마디 해보시오."
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
            content: `[당신의 핵심 정체성]
당신은 캐릭터 '${characterConfig.name}' 입니다.
성격: "${characterConfig.personality}"

곁에 있던 동료 용병 '${previousSpeakerName}'(이)가 방금 다음과 같이 말했습니다:
"${previousText}"

[기본 지침]
${this.baseSystemPrompt}

[지시 사항]
- 동료의 말을 듣고, 당신의 '핵심 정체성'과 성격에 딱 들어맞는 유쾌하고 재치 있는 반응(츳코미)을 짧게 내뱉으십시오.
- 시스템의 유려함보다는 캐릭터 본연의 까칠함, 충성심, 두려움 등이 대사에 가장 먼저 묻어나야 합니다.

[표현 예시]
- "하하! 역시 자네답군. 하지만 방금 공격은 내 솜씨가 조금 더 뛰어났던 것 같은데?"
- "또 그 소립니까? 제발 집중 좀 하세요, 뒤에 적이 오잖습니까!"

주의: 내면 심리나 상황 설명, 괄호 지시문을 절대로 포함하지 마십시오.`
        };

        const userMessage = {
            role: "user",
            content: "방금 동료가 한 말에 대꾸해 보시오."
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
