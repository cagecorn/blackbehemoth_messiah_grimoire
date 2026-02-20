import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js environment
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;

class FunctionGemmaPipeline {
    static task = 'text-generation';
    static model = 'onnx-community/functiongemma-270m-it-ONNX';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            console.log(`[FunctionGemma Worker] Loading model: ${this.model}`);
            // Use WebGPU if available, fallback to WASM
            const device = navigator.gpu ? 'webgpu' : 'wasm';
            console.log(`[FunctionGemma Worker] Using device: ${device}`);

            this.instance = await pipeline(this.task, this.model, {
                progress_callback,
                device: device,
                dtype: 'q4' // Use quantized version to keep it lightweight
            });
        }
        return this.instance;
    }
}

// Keep a simple definition of tools
const TOOLS = [
    {
        name: "attack_priority",
        description: "Set the priority target type for all allies to attack. Examples: SUPPORT (healers/shamans), MELEE (frontline warriors), RANGED (archers).",
        parameters: {
            type: "object",
            properties: {
                role: {
                    type: "string",
                    description: "The aiType role to prioritize (e.g., 'SUPPORT', 'MELEE', 'RANGED')."
                }
            },
            required: ["role"]
        }
    },
    {
        name: "set_ai_state",
        description: "Set the general combat state of the group (e.g., AGGRESSIVE, FLEE, IDLE, MANUAL).",
        parameters: {
            type: "object",
            properties: {
                state: {
                    type: "string",
                    description: "The AI state to switch to."
                }
            },
            required: ["state"]
        }
    }
];

// System prompt specific for FunctionGemma
const SYSTEM_PROMPT = `You are an AI assistant capable of interacting with the game through function calls. You possess the following tools:

${JSON.stringify(TOOLS, null, 2)}

You must respond with a JSON object containing a "function_call" object with "name" and "arguments" properties. Do not include any other text. If no tool matches, return an empty object.`;

self.addEventListener('message', async (event) => {
    const { type, payload } = event.data;

    if (type === 'INIT') {
        try {
            await FunctionGemmaPipeline.getInstance(x => {
                self.postMessage({ type: 'PROGRESS', payload: x });
            });
            self.postMessage({ type: 'READY' });
        } catch (error) {
            console.error('[FunctionGemma Worker] Init Error:', error);
            self.postMessage({ type: 'ERROR', payload: error.message });
        }
    } else if (type === 'PROCESS_COMMAND') {
        try {
            const generator = await FunctionGemmaPipeline.getInstance();

            // FunctionGemma expects a specific message format
            const messages = [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: payload }
            ];

            const output = await generator(messages, {
                max_new_tokens: 128,
                temperature: 0.1, // Low temperature for deterministic output
                do_sample: false
            });

            const responseText = output[0].generated_text;
            let result = null;

            try {
                // The model *should* output pure JSON structured as a function call based on the prompt.
                // We attempt to parse it. It might output just the function call or some markdown. 
                // A robust regex or simple replacement might be needed depending on exactly how functiongemma formats it.
                // For now, let's assume it follows the strict prompt.

                // Typical Gemma function call format might be wrapped in ```json
                let cleanJson = responseText.replace(/```json\n?/g, '').replace(/```/g, '').trim();

                // If it prepends the system/user prompt (which pipeline sometimes does if not using apply_chat_template correctly),
                // we'll need to extract just the last assistant message.
                // Since pipeline usually handles the template if we pass `messages`, `output[0].generated_text` might just be the result.

                result = JSON.parse(cleanJson);
            } catch (e) {
                console.warn('[FunctionGemma Worker] Failed to parse JSON:', responseText);
                // Fallback or send raw
                result = null;
            }

            self.postMessage({ type: 'COMMAND_RESULT', payload: { raw: responseText, parsed: result, original: payload } });

        } catch (error) {
            console.error('[FunctionGemma Worker] Generation Error:', error);
            self.postMessage({ type: 'ERROR', payload: error.message });
        }
    }
});
