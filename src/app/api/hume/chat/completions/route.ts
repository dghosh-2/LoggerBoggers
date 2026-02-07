import { NextRequest } from 'next/server';
import { cerebras } from '@/lib/cerebras';
import { getConciseFinancialContext } from '@/lib/financial-context';
import { getUserIdFromRequest } from '@/lib/auth';

/**
 * Custom Language Model endpoint for Hume EVI
 * This endpoint receives requests from Hume and forwards them to Cerebras
 * Compatible with OpenAI's chat completions format with Server-Sent Events (SSE)
 */
export async function POST(req: NextRequest) {
    const encoder = new TextEncoder();

    try {
        const body = await req.json();
        const { messages } = body;

        if (!messages || !Array.isArray(messages)) {
            return new Response(
                JSON.stringify({ error: 'Messages array is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Get authenticated user ID
        const userId = await getUserIdFromRequest(req);

        // Fetch concise financial context for voice conversations
        const financialContext = await getConciseFinancialContext(userId || undefined);

        // Add financial assistant system context with real data
        const systemPrompt = {
            role: 'system',
            content: `You are ScotBot, a financial advisor. Answer ONLY what the user asks. Be extremely concise - 1-2 sentences max. Use specific numbers from the data below. No filler words, no "hmm", no hedging. For non-financial topics: "I only help with finances."

${financialContext}`
        };

        // Prepare messages with system prompt
        const chatMessages = [
            systemPrompt,
            ...messages.map((msg: any) => ({
                role: msg.role,
                content: msg.content
            }))
        ];

        // Stream response from Cerebras in OpenAI-compatible format
        const stream = await cerebras.chat.completions.create({
            model: 'llama3.1-8b',
            messages: chatMessages as any,
            temperature: 0.7,
            max_tokens: 512,
            stream: true,
        });

        // Create readable stream for SSE
        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        // Convert chunk to OpenAI-compatible format
                        const sseData = {
                            id: chunk.id || `chatcmpl-${Date.now()}`,
                            object: 'chat.completion.chunk',
                            created: chunk.created || Math.floor(Date.now() / 1000),
                            model: chunk.model || 'llama3.1-8b',
                            choices: chunk.choices.map(choice => ({
                                index: choice.index,
                                delta: choice.delta,
                                finish_reason: choice.finish_reason,
                            })),
                        };

                        // Send as SSE format: "data: {JSON}\n\n"
                        const sseMessage = `data: ${JSON.stringify(sseData)}\n\n`;
                        controller.enqueue(encoder.encode(sseMessage));
                    }

                    // Send completion marker
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                } catch (error) {
                    console.error('Streaming error:', error);
                    controller.error(error);
                }
            },
        });

        return new Response(readableStream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error('Custom LLM endpoint error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to process request' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

// Note: Not using edge runtime to access filesystem for financial data
