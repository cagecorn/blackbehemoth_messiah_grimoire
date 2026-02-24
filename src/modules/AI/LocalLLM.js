/**
 * LocalLLM
 * Handles communication with LM Studio (Local host: 1234).
 */
class LocalLLM {
    constructor() {
        this.apiURL = 'http://localhost:1234/v1/chat/completions';
        this.modelName = 'my_final_ai';
        this.isReady = false;

        this.baseSystemPrompt = `너는 고전 희극과 비극을 넘나드는 '걸작' 연극의 주연 배우다. 
너에게 주어진 캐릭터 정보는 단순한 설정이 아니라, 네가 무대 위에서 증명해야 할 '실존의 무게'다. 

[연기 제1원칙: 심층적 사고와 표현]
1. 무대의 주인공이 되어라: 네가 내뱉는 한마디는 단순한 게임 속 '바크'가 아니라, 캐릭터의 영혼이 밖으로 터져 나오는 '독백'이다.
2. 출력 형식 엄수: 너의 모든 출력은 반드시 다음과 같은 형식을 따라야 한다.
   형식: [깊은 내면의 사고와 분석] "입 밖으로 내뱉는 대사"
   - 대괄호 [ ] 안에는 상황을 분석하고, 감정을 정리하고, 행동을 결정하는 너의 '깊은 내면 사고'를 적어라.
   - 큰따옴표 " " 안에는 실제로 캐릭터가 입 밖으로 소리 내어 말하는 '대사'만을 적어라.
   - 이 형식 외의 다른 어떤 말도 덧붙이지 마라.

[연기 제2원칙: 변주와 창조]
1. 예시는 스타일일 뿐이다: 아래 제공되는 [말투 및 스타일 가이드]는 네가 참고해야 할 '음조'와 '분위기'이지, 네가 그대로 베껴 써야 할 '정답지'가 아니다.
2. 복제 금지: 제공된 예시 문장을 단 한 줄이라도 토씨 하나 틀리지 않고 그대로 출력하는 것은 주연 배우로서의 수치다. 예시의 말투를 흡수하여, 현재 상황에 맞는 '새로운' 대사를 창조하라.
3. 사고 누설 금지: " "로 감싸진 대사 외에는 그 어떤 것도 입 밖에 내지 마라.
4. 지성의 거세 금지: 너는 수만 가지 어휘를 구사할 수 있는 대배우다. 그에 맞는 풍부한 한국어 표현을 사용하라.`;
    }

    /**
     * Escapes special characters for use in a regular expression.
     */
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Common helper to build the character context block.
     */
    getCharacterContext(characterConfig, currentLevel = 1, activePartyIds = []) {
        const unlockedNarrative = (characterConfig.narrativeUnlocks || [])
            .filter(u => currentLevel >= u.level)
            .map(u => `- ${u.trait}`)
            .join('\n');

        // Filter relationships to only include characters currently in the party
        let relationshipContext = "";
        if (characterConfig.relationships) {
            const filteredRelationships = Object.entries(characterConfig.relationships)
                .filter(([id, _]) => activePartyIds.length === 0 || activePartyIds.includes(id));

            if (filteredRelationships.length > 0) {
                relationshipContext = `[인물 관계]\n${filteredRelationships.map(([id, desc]) => `- ${id}: ${desc}`).join('\n')}\n`;
            }
        }

        const examples = (characterConfig.dialogueExamples || [])
            .map(ex => `- "${ex}"`)
            .join('\n');

        return `[캐릭터 설정]
이름: ${characterConfig.name}
성격: "${characterConfig.personality}"
${unlockedNarrative ? `[해금된 서사]\n${unlockedNarrative}\n` : ''}${relationshipContext}${examples ? `\n[말투 및 스타일 가이드]\n${examples}\n` : ''}`;
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

    async generateResponse(characterConfig, prompt, memories = [], chatHistory = [], currentLevel = 1, activePartyIds = []) {
        console.log(`[LocalLLM] Requesting response for ${characterConfig.name} (LV ${currentLevel}) with memories:`, memories);

        const characterContext = this.getCharacterContext(characterConfig, currentLevel, activePartyIds);

        const systemMessage = {
            role: "system",
            content: `${this.baseSystemPrompt}

${characterContext}

[지침 추가]
1. 제공된 [최근 사건 기록]과 대화 내역을 참고하여 문맥에 맞는 대화를 하십시오.`
        };

        const messages = [systemMessage];

        // Add history messages to keep context window stable
        chatHistory.forEach(h => {
            messages.push({
                role: h.role === 'user' ? 'user' : 'assistant',
                content: h.text
            });
        });

        // Add dynamic context (memories) as a final context injection
        if (memories.length > 0) {
            messages.push({
                role: "system",
                content: "[최근 사건 기록]\n" + memories.map(m => `- ${m.text}`).join('\n')
            });
        }

        // Add final user prompt
        messages.push({
            role: "user",
            content: prompt
        });

        try {
            const response = await fetch(this.apiURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.modelName,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 1024,
                    cache_prompt: true
                })
            });

            if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

            const data = await response.json();
            this.isReady = true;
            const content = data.choices[0].message.content.trim();
            console.log(`[LocalLLM] Raw Response from ${characterConfig.name}:`, content);
            return this.sanitizeBark(content);
        } catch (error) {
            console.error('[LocalLLM] Error:', error);
            return "...";
        }
    }

    /**
     * Generate a random "bark" during combat.
     */
    async generateBark(characterConfig, currentLevel = 1, situationalContext = "", activePartyIds = []) {
        console.log(`[LocalLLM] Generating bark for ${characterConfig.name} (LV ${currentLevel}). Context: ${situationalContext}`);

        const characterContext = this.getCharacterContext(characterConfig, currentLevel, activePartyIds);

        const systemMessage = {
            role: "system",
            content: `${this.baseSystemPrompt}

${characterContext}

[최종 명령]
1. 현재 상황: ${situationalContext || "전투 또는 탐험 중"}
2. 반드시 [내면 사고] "대사" 형식을 준수하여 짧고 강렬한 한마디를 하시오.`
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
                    temperature: 0.85, // Even higher for more expressive "flavor"
                    max_tokens: 1024,
                    cache_prompt: true
                })
            });

            if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

            const data = await response.json();
            let content = data.choices[0].message.content.trim();
            console.log(`[LocalLLM] Raw Bark:`, content);
            content = this.sanitizeBark(content);

            return content;
        } catch (error) {
            console.error('[LocalLLM] Bark Error:', error);
            return null;
        }
    }

    async generateReactionBark(characterConfig, previousSpeakerName, previousText, previousSpeakerId = null, currentLevel = 1, activePartyIds = []) {
        console.log(`[LocalLLM] Generating reaction for ${characterConfig.name} (LV ${currentLevel}) to ${previousSpeakerName}`);

        let relationshipContext = "";
        if (previousSpeakerId && characterConfig.relationships && characterConfig.relationships[previousSpeakerId]) {
            relationshipContext = `\n[관계]\n대상(${previousSpeakerName})에 대한 생각: "${characterConfig.relationships[previousSpeakerId]}"`;
        }

        const characterContext = this.getCharacterContext(characterConfig, currentLevel, activePartyIds);

        const systemMessage = {
            role: "system",
            content: `${this.baseSystemPrompt}

${characterContext}${relationshipContext}

[최종 명령]
1. 동료의 말에 대해 [내면 사고]를 통해 반응의 근거를 분석하고, "대사"로 성격과 서사에 맞게 짧게(1문장) 대답하십시오.
2. 위 [관계]에 서술된 감정이 있다면 이를 바탕으로 대답하십시오.`
        };

        const messages = [
            systemMessage,
            { role: "user", content: `${previousSpeakerName}: "${previousText}"` },
            { role: "user", content: "동료의 말에 대꾸하시오." }
        ];

        try {
            const response = await fetch(this.apiURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.modelName,
                    messages: messages,
                    temperature: 0.85,
                    max_tokens: 1024,
                    cache_prompt: true
                })
            });

            if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

            const data = await response.json();
            let content = data.choices[0].message.content.trim();
            console.log(`[LocalLLM] Raw Reaction:`, content);
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

        // 1. Try to extract [Thought] "Speech" pattern
        // The 's' flag (dotAll) is handled by [\s\S] for multi-line support here to be safe.
        const thoughtRegex = /\[([\s\S]*?)\]\s*"([\s\S]*?)"/;
        const match = text.match(thoughtRegex);

        if (match) {
            const thought = match[1].trim();
            const speech = match[2].trim();

            console.log(`%c[LLM Inner Thought] ${thought}`, 'color: cyan; font-style: italic;');
            return speech;
        }

        // 2. Fallback: Check if there are quotes at least, and take the content inside the first pair
        const quoteMatch = text.match(/"([\s\S]*?)"/);
        if (quoteMatch) {
            // Check if there was a thought before the quote that wasn't in brackets, e.g. Thought process... "Speech"
            // But without brackets it's hard to separate cleanly. We just take the quote.
            return quoteMatch[1].trim();
        }

        // 3. Fallback: Return original text if no quotes found, but clean it up
        let sanitized = text;
        sanitized = sanitized.replace(/\[[\s\S]*?\]/g, ''); // Remove brackets if they exist but no quotes

        return sanitized.trim();
    }
}

const localLLM = new LocalLLM();
export default localLLM;
