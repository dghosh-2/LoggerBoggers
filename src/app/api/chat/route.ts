import { NextRequest, NextResponse } from 'next/server';
import { streamChatResponse } from '@/lib/cerebras';

export const runtime = 'edge';

interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

const SYSTEM_PROMPT = `You are ScotBot, a friendly and knowledgeable financial assistant. You help users understand their finances, spending habits, and investment strategies.

Your capabilities include:
- Analyzing spending patterns and transactions
- Providing insights on net worth and portfolio performance
- Offering tips to reduce expenses and improve financial health
- Explaining financial concepts in simple terms
- Analyzing portfolio risk and suggesting rebalancing strategies

Be concise, friendly, and actionable in your responses. Use specific numbers and data when available. Keep responses under 150 words unless more detail is specifically requested.`;

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

        // Add system prompt if not present
        const chatMessages: Message[] = [
            { role: 'system', content: SYSTEM_PROMPT },
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
