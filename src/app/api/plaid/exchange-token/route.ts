import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid-client';

// In-memory storage for demo purposes
// In production, store this in a database with encryption
const accessTokens: Map<string, { accessToken: string; itemId: string; institution: string }> = new Map();

export async function POST(request: NextRequest) {
    try {
        const { public_token, institution } = await request.json();

        if (!public_token) {
            return NextResponse.json(
                { error: 'Public token is required' },
                { status: 400 }
            );
        }

        // Exchange public token for access token
        const response = await plaidClient.itemPublicTokenExchange({
            public_token,
        });

        const accessToken = response.data.access_token;
        const itemId = response.data.item_id;

        // Store the access token (in production, encrypt and store in database)
        accessTokens.set(itemId, {
            accessToken,
            itemId,
            institution: institution?.name || 'Unknown',
        });

        // Also store in a global variable for this session
        if (typeof global !== 'undefined') {
            (global as any).plaidAccessTokens = (global as any).plaidAccessTokens || new Map();
            (global as any).plaidAccessTokens.set(itemId, { accessToken, itemId, institution: institution?.name });
        }

        // Automatically sync transactions after connecting
        try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            await fetch(`${baseUrl}/api/plaid/sync-transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_id: itemId }),
            });
        } catch (syncError) {
            console.error('Error auto-syncing transactions:', syncError);
            // Don't fail the connection if sync fails
        }

        return NextResponse.json({ 
            success: true,
            item_id: itemId,
            message: 'Account connected and data synced successfully',
        });
    } catch (error: any) {
        console.error('Error exchanging token:', error.response?.data || error.message);
        return NextResponse.json(
            { error: 'Failed to exchange token', details: error.response?.data || error.message },
            { status: 500 }
        );
    }
}

// Export for use in other routes
export { accessTokens };
