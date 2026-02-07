import OpenAI from 'openai';

// Initialize Cerebras client using OpenAI SDK with custom base URL
// Cerebras provides an OpenAI-compatible API
export const cerebras = new OpenAI({
    apiKey: process.env.CEREBRAS_API_KEY,
    baseURL: 'https://api.cerebras.ai/v1',
});

/**
 * Call Cerebras for chat completions
 */
export async function generateChatResponse(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    model: string = 'llama3.1-8b',
    maxTokens: number = 1024,
): Promise<string> {
    try {
        const response = await cerebras.chat.completions.create({
            model,
            messages,
            temperature: 0.7,
            max_tokens: maxTokens,
        });

        return response.choices[0]?.message?.content || '';
    } catch (error) {
        console.error('Cerebras API Error:', error);
        throw error;
    }
}

/**
 * Stream chat completions from Cerebras
 */
export async function streamChatResponse(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    model: string = 'llama3.1-8b'
) {
    try {
        const stream = await cerebras.chat.completions.create({
            model,
            messages,
            temperature: 0.7,
            max_tokens: 1024,
            stream: true,
        });

        return stream;
    } catch (error) {
        console.error('Cerebras API Stream Error:', error);
        throw error;
    }
}
