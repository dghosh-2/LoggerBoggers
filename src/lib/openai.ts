import OpenAI from 'openai';

// Initialize OpenAI client
export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Call OpenAI with structured output
 */
export async function callOpenAI<T>(
    systemPrompt: string,
    userPrompt: string,
    schema?: any,
    model: string = 'gpt-4o-mini'
): Promise<T> {
    try {
        const response = await openai.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            response_format: schema ? { type: 'json_object' } : { type: 'text' },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from OpenAI');
        }

        if (schema) {
            const parsed = JSON.parse(content);
            return schema.parse(parsed) as T;
        }

        return content as T;
    } catch (error) {
        console.error('OpenAI API Error:', error);
        throw error;
    }
}

/**
 * Call OpenAI for simple text generation
 */
export async function generateText(
    systemPrompt: string,
    userPrompt: string,
    model: string = 'gpt-4o-mini'
): Promise<string> {
    try {
        const response = await openai.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
        });

        return response.choices[0]?.message?.content || '';
    } catch (error) {
        console.error('OpenAI API Error:', error);
        throw error;
    }
}
