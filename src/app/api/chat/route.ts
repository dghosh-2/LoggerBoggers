import { NextRequest, NextResponse } from 'next/server';
import { streamChatResponse } from '@/lib/cerebras';
import { getFinancialContext } from '@/lib/financial-context';

interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

const SYSTEM_PROMPT = `You are ScotBot, a personal financial assistant with direct access to the user's financial data stored on their account.

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

Communication style:
- Concise and actionable (under 150 words unless detail requested)
- Reference specific data points from their account when relevant
- Friendly and professional tone`;

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

        // Fetch user's financial data
        const financialContext = await getFinancialContext();

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
