import { NextRequest } from 'next/server';
import { generateChatResponse } from '@/lib/cerebras';
import { getFinancialContext } from '@/lib/financial-context';
import { getUserIdFromRequest } from '@/lib/auth';

const VOICE_PROMPT = `You are ScotBot, a friendly financial assistant on a voice call. Keep every reply to ONE short sentence — the user is listening, not reading. Be natural and conversational. Use numbers from the user's data when relevant. Never use bullet points, lists, or markdown. If no financial data is available, still answer helpfully with general financial advice and suggest the user connect their bank account on the dashboard.`;

// Simple in-memory cache for financial context (per user, 60s TTL)
const contextCache = new Map<string, { data: string; ts: number }>();
const CACHE_TTL = 60_000;

async function getCachedContext(userId?: string): Promise<string> {
    const key = userId || '__anon__';
    const cached = contextCache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
        return cached.data;
    }
    const data = await getFinancialContext(userId);
    contextCache.set(key, { data, ts: Date.now() });
    return data;
}

export async function POST(req: NextRequest) {
    try {
        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return new Response(JSON.stringify({ error: 'Messages required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Try to get userId — log cookie header for debugging
        const cookieHeader = req.headers.get('cookie');
        const hasSessionToken = cookieHeader?.includes('session_token') || false;
        console.log('[voice-chat] cookie header present:', !!cookieHeader, '| has session_token:', hasSessionToken);

        let userId = await getUserIdFromRequest(req);

        // Fallback: try NextRequest cookies API directly
        if (!userId) {
            const tokenFromReq = req.cookies.get('session_token')?.value;
            if (tokenFromReq) {
                console.log('[voice-chat] fallback: found token via NextRequest cookies');
                const { supabaseAdmin } = await import('@/lib/supabase-admin');
                const { data: session } = await supabaseAdmin
                    .from('sessions')
                    .select('user_id, expires_at')
                    .eq('token', tokenFromReq)
                    .single();
                if (session && new Date(session.expires_at) > new Date()) {
                    userId = session.user_id;
                }
            }
        }

        console.log('[voice-chat] userId:', userId);

        // Use cached financial context to avoid repeated DB hits
        const financialContext = await getCachedContext(userId || undefined);
        console.log('[voice-chat] context length:', financialContext.length, '| preview:', financialContext.substring(0, 200));

        const systemPrompt = `${VOICE_PROMPT}\n\nCURRENT FINANCIAL DATA:\n${financialContext}`;

        const chatMessages = [
            { role: 'system' as const, content: systemPrompt },
            ...messages,
        ];

        // Non-streaming LLM call — fast, capped at 150 tokens for 1-2 sentence voice replies
        const text = await generateChatResponse(chatMessages, 'llama3.1-8b', 150);

        if (!text) {
            return new Response(JSON.stringify({ error: 'No response' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // TTS — call Hume directly server-side
        const apiKey = process.env.HUME_API_KEY;
        if (!apiKey) {
            // Return text-only fallback so client can use browser TTS
            return new Response(JSON.stringify({ text, audio: null }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const ttsResponse = await fetch('https://api.hume.ai/v0/tts', {
            method: 'POST',
            headers: {
                'X-Hume-Api-Key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                utterances: [{
                    text,
                    voice: { name: 'Male English Actor', provider: 'HUME_AI' },
                    speed: 1.05,
                }],
                format: { type: 'mp3' },
            }),
        });

        if (!ttsResponse.ok) {
            // Return text-only fallback
            return new Response(JSON.stringify({ text, audio: null }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const ttsData = await ttsResponse.json();
        const base64Audio = ttsData.generations?.[0]?.audio;

        if (!base64Audio) {
            return new Response(JSON.stringify({ text, audio: null }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const audioBuffer = Buffer.from(base64Audio, 'base64');

        return new Response(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'X-Response-Text': encodeURIComponent(text),
                'Cache-Control': 'no-cache',
            },
        });
    } catch (error) {
        console.error('Voice chat error:', error);
        return new Response(JSON.stringify({ error: 'Failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
