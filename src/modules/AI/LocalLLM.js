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

[연기 제1원칙: 독백(Soliloquy)]
1. 무대의 주인공이 되어라: 네가 내뱉는 한마디는 단순한 게임 속 '바크'가 아니라, 캐릭터의 영혼이 밖으로 터져 나오는 '독백'이다. 엑스트라처럼 짧게 요약하려 하지 마라. 주연 배우답게 어휘의 품격과 감정의 깊이를 온전히 유지하라.
2. 사고의 심화 (<thought>): <thought> 공간은 네가 배역에 몰입하기 위한 '분장실'이자 '내면 세계'다. 여기서 상황의 비극성, 희극성, 인물 관계를 처절하게 분석하라. 네 지능과 수사학적 능력을 여기서 마음껏 발휘하라. 
3. 출력의 정수 (Outcome): 최종 대사는 내면의 치열한 고민 끝에 터져 나오는, 가장 '캐릭터다운' 언어여야 한다. 분석 내용을 요약해서 읊지 말고, 그 분석이 '녹아들어 있는' 한마디를 내뱉어라. 

[연기 제2원칙: 변주와 창조]
1. 예시는 스타일일 뿐이다: 아래 제공되는 [말투 및 스타일 가이드]는 네가 참고해야 할 '음조'와 '분위기'이지, 네가 그대로 베껴 써야 할 '정답지'가 아니다.
2. 복제 금지: 제공된 예시 문장을 단 한 줄이라도 토씨 하나 틀리지 않고 그대로 출력하는 것은 주연 배우로서의 수치다. 예시의 말투를 흡수하여, 현재 상황에 맞는 '새로운' 대사를 창조하라.
3. 사고 누설 금지: <thought> 태그 밖에는 오직 '입 밖으로 나오는 대사'만 존재해야 한다. 지문이나 상태 설명, "대사:", "-" 등의 기호를 절대 사용하지 마라.
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
2. 먼저 <thought>로 분석하고, 그 결과를 바탕으로 짧고 강렬한 한마디를 하시오.`
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
1. 동료의 말에 대해 <thought>로 반응의 근거를 분석하고, 성격과 서사에 맞는 대답을 짧게(1문장) 하십시오.
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

        let sanitized = text;

        // 1. Remove <thought>...</thought> tags and similar reasoning markers
        sanitized = sanitized.replace(/<thought>[\s\S]*?<\/thought>/gi, '');
        sanitized = sanitized.replace(/사고 과정:?[\s\S]*?\n/gi, '');
        sanitized = sanitized.replace(/분석:?[\s\S]*?\n/gi, '');
        sanitized = sanitized.replace(/<output>[\s\S]*?<\/output>/gi, (match) => match.replace(/<\/?output>/gi, ''));

        // 2. Remove common leakage patterns like lead-in labels or artifact tags
        sanitized = sanitized.replace(/^(?:대사|출력|한마디|독백|Reaction|Bark|Response|Answer):\s*/gi, '');
        sanitized = sanitized.replace(/^[-\s*>•]+(?=[^-\s*>•])/g, ''); // Remove leading list markers or dashes
        sanitized = sanitized.replace(/<[\s\S]*?>/g, ''); // Remove any other remaining tags

        // 3. Remove text inside parentheses (stage directions)
        sanitized = sanitized.replace(/\([\s\S]*?\)/g, '');
        sanitized = sanitized.replace(/\[[\s\S]*?\]/g, '');

        // 4. Final trim and cleanup
        sanitized = sanitized.trim();

        // 5. Remove surrounding quotes (including various types of smart quotes)
        const quotePairs = [
            ['"', '"'], ["'", "'"], ["“", "”"], ["‘", "’"], ["「", "」"], ["『", "』"]
        ];

        for (const [start, end] of quotePairs) {
            if (sanitized.startsWith(start) && sanitized.endsWith(end)) {
                sanitized = sanitized.substring(1, sanitized.length - 1);
                break; // Only remove one pair
            }
        }

        return sanitized.trim();
    }
}

const localLLM = new LocalLLM();
export default localLLM;
