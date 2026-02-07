import { NextRequest, NextResponse } from 'next/server';

const WISPR_API_BASE = 'https://platform-api.wisprflow.ai/api/v1/dash';

/**
 * Transcribe audio using Wispr Flow
 * This endpoint receives base64-encoded 16kHz WAV audio and returns transcribed text
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { audio, token, context } = body;

        if (!audio) {
            return NextResponse.json(
                { error: 'Audio data is required' },
                { status: 400 }
            );
        }

        if (!token) {
            return NextResponse.json(
                { error: 'Client token is required' },
                { status: 400 }
            );
        }

        // Prepare the request context
        const requestContext = {
            app: {
                name: 'ScotBot',
                type: 'ai',
            },
            dictionary_context: [
                'ScotBot',
                'portfolio',
                'expenses',
                'net worth',
                'stocks',
                'investment',
            ],
            ...context,
        };

        // Call Wispr Flow transcription API
        const response = await fetch(`${WISPR_API_BASE}/client_api`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                audio,
                language: ['en'],
                context: requestContext,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Wispr transcription failed:', error);

            // Handle token expiration
            if (response.status === 401) {
                return NextResponse.json(
                    { error: 'Token expired', tokenExpired: true },
                    { status: 401 }
                );
            }

            return NextResponse.json(
                { error: 'Transcription failed' },
                { status: response.status }
            );
        }

        const data = await response.json();

        return NextResponse.json({
            text: data.text,
            detectedLanguage: data.detected_language,
            id: data.id,
        });
    } catch (error) {
        console.error('Transcription error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
