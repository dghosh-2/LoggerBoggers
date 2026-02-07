import { NextRequest } from 'next/server';
import { cerebras } from '@/lib/cerebras';
import { getConciseFinancialContext } from '@/lib/financial-context';

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

        // Fetch concise financial context for voice conversations
        const financialContext = await getConciseFinancialContext();

        // Add financial assistant system context with real data
        const systemPrompt = {
            role: 'system',
            content: `You are ScotBot, a personal financial assistant with direct access to the user's financial data stored on their account.

SCOPE OF ASSISTANCE:
You have access to and can help with:
- User's transaction history and spending patterns
- Account balances and net worth
- Investment portfolio holdings and performance
- Budget categories and expense tracking
- Financial goals and progress

Your role is EXCLUSIVELY to assist with the user's personal financial data. You:
- Analyze their specific spending, investments, and financial trends
- Provide personalized insights based on THEIR data
- Offer actionable advice tailored to THEIR financial situation
- Answer questions about THEIR accounts, transactions, and portfolio

You do NOT:
- Provide general financial advice unrelated to their data
- Discuss topics outside of their personal finances
- Offer services beyond financial data analysis and insights

${financialContext}

Communication style:
- Conversational and empathetic
- Concise responses (2-3 sentences for voice, can be longer if detailed analysis requested)
- Reference specific data points from their account when relevant
- Warm and friendly tone`
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
