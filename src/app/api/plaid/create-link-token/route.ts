import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid-client';
import { Products, CountryCode } from 'plaid';

export async function POST(request: NextRequest) {
    try {
        // Create a link token - bare minimum, only transactions
        // No auth, identity, investments, liabilities, payment, transfer, wallet, phone, or email
        const response = await plaidClient.linkTokenCreate({
            user: {
                client_user_id: 'user-' + Date.now(),
            },
            client_name: "Scotty's Ledger",
            products: [Products.Transactions], // Only transactions - no verification needed
            country_codes: [CountryCode.Us],
            language: 'en',
        });

        return NextResponse.json({ 
            link_token: response.data.link_token,
            expiration: response.data.expiration,
        });
    } catch (error: any) {
        console.error('Error creating link token:', error.response?.data || error.message);
        return NextResponse.json(
            { error: 'Failed to create link token', details: error.response?.data || error.message },
            { status: 500 }
        );
    }
}
