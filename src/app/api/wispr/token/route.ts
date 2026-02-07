import { NextRequest, NextResponse } from 'next/server';

const WISPR_API_BASE = 'https://platform-api.wisprflow.ai/api/v1/dash';

/**
 * Generate a client JWT token for Wispr Flow
 * This endpoint is called by the frontend to get a token for direct API access
 */
export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.WISPR_FLOW_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'Wispr Flow API key not configured' },
                { status: 500 }
            );
        }

        const body = await req.json();
        const { clientId } = body;

        if (!clientId) {
            return NextResponse.json(
                { error: 'Client ID is required' },
                { status: 400 }
            );
        }

        // Generate access token from Wispr Flow
        const response = await fetch(`${WISPR_API_BASE}/generate_access_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                client_id: clientId,
                duration_seconds: 3600, // 1 hour
                metadata: {
                    app: 'scotbot',
                    type: 'chat',
                },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Wispr token generation failed:', error);
            return NextResponse.json(
                { error: 'Failed to generate access token' },
                { status: response.status }
            );
        }

        const data = await response.json();

        return NextResponse.json({
            token: data.token || data.access_token,
            expiresIn: 3600,
        });
    } catch (error) {
        console.error('Token generation error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
