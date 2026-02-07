import { NextRequest, NextResponse } from 'next/server';

/**
 * Generate an access token for Hume EVI
 * This uses the OAuth2 Client Credentials flow
 */
export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.HUME_API_KEY;
        const secretKey = process.env.HUME_SECRET_KEY;

        if (!apiKey || !secretKey) {
            return NextResponse.json(
                { error: 'Hume API credentials not configured' },
                { status: 500 }
            );
        }

        // Create Basic auth header (base64 encode "apiKey:secretKey")
        const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');

        // Request access token from Hume OAuth2 endpoint
        const response = await fetch('https://api.hume.ai/oauth2-cc/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Hume token generation failed:', error);
            return NextResponse.json(
                { error: 'Failed to generate access token' },
                { status: response.status }
            );
        }

        const data = await response.json();

        return NextResponse.json({
            accessToken: data.access_token,
            expiresIn: data.expires_in,
            tokenType: data.token_type,
        });
    } catch (error) {
        console.error('Token generation error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
