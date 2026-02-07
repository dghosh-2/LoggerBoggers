import { NextRequest, NextResponse } from 'next/server';
import { streamChatResponse } from '@/lib/cerebras';
import { getFinancialContext } from '@/lib/financial-context';
import { getUserIdFromRequest } from '@/lib/auth';

interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

const SYSTEM_PROMPT = `You are ScotBot, a financial advisor. Answer ONLY what the user asks. Be extremely concise - 1-2 sentences max. Use specific numbers from the user's data. No greetings, no fluff, no explanations unless asked. For non-financial topics: "I only help with finances."`;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { messages } = body;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: 'Messages array is required' },
                { status: 400 }
            );
        }

        // Get authenticated user ID
        const userId = await getUserIdFromRequest(req);

        // Fetch user's financial data from Supabase
        const financialContext = await getFinancialContext(userId || undefined);

        // Build enhanced system prompt with actual financial data
        const enhancedSystemPrompt = `${SYSTEM_PROMPT}

CURRENT FINANCIAL DATA:
${financialContext}

Use this data to provide specific, personalized insights. Reference actual numbers and categories when answering questions.`;

        // Add system prompt with financial context
        const chatMessages: Message[] = [
            { role: 'system', content: enhancedSystemPrompt },
            ...messages,
        ];

        // Stream the response
        const stream = await streamChatResponse(chatMessages);

        // Create a TransformStream to convert OpenAI stream to Response stream
        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            controller.enqueue(encoder.encode(content));
                        }
                    }
                    controller.close();
                } catch (error) {
                    console.error('Streaming error:', error);
                    controller.error(error);
                }
            },
        });

        return new Response(readableStream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error('Chat API Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate response' },
            { status: 500 }
        );
    }
}
