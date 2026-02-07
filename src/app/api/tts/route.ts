import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json();

        if (!text) {
            return new Response(JSON.stringify({ error: 'Text is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const apiKey = process.env.HUME_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Hume API key not configured' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const response = await fetch('https://api.hume.ai/v0/tts', {
            method: 'POST',
            headers: {
                'X-Hume-Api-Key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                utterances: [
                    {
                        text,
                        voice: { name: 'Male English Actor', provider: 'HUME_AI' },
                        speed: 1.0,
                    },
                ],
                format: { type: 'mp3' },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Hume TTS error:', response.status, errorText);
            throw new Error('Hume TTS failed');
        }

        const data = await response.json();
        const base64Audio = data.generations?.[0]?.audio;

        if (!base64Audio) {
            throw new Error('No audio in Hume response');
        }

        const audioBuffer = Buffer.from(base64Audio, 'base64');

        return new Response(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'no-cache',
            },
        });
    } catch (error) {
        console.error('TTS API Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to generate speech' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
