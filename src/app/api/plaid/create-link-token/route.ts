import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid-client';
import { Products, CountryCode } from 'plaid';
import { getUserIdFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        // Get authenticated user ID
        const userId = await getUserIdFromRequest(request);
        
        // Use actual user ID if available, otherwise use timestamp
        const clientUserId = userId || 'user-' + Date.now();
        
        console.log('Creating link token for user:', clientUserId);
        
        // Create a link token - bare minimum, only transactions
        // No auth, identity, investments, liabilities, payment, transfer, wallet, phone, or email
        const response = await plaidClient.linkTokenCreate({
            user: {
                client_user_id: clientUserId,
            },
            client_name: "Scotty's Ledger",
            products: [Products.Transactions], // Only transactions - no verification needed
            country_codes: [CountryCode.Us],
            language: 'en',
        });

        console.log('Link token created successfully');

        return NextResponse.json({ 
            link_token: response.data.link_token,
            expiration: response.data.expiration,
        });
    } catch (error: any) {
        console.error('Error creating link token:', error);
        console.error('Error details:', {
            message: error.message,
            response: error.response?.data,
            statusCode: error.response?.status,
        });
        
        let errorMessage = 'Failed to create link token';
        let errorDetails = error.message;
        
        if (error.response?.data) {
            errorDetails = JSON.stringify(error.response.data);
            
            // Check for common Plaid errors
            if (error.response.data.error_code === 'INVALID_API_KEYS') {
                errorMessage = 'Invalid Plaid API credentials';
                errorDetails = 'Please check your PLAID_CLIENT_ID and PLAID_SECRET';
            }
        }
        
        return NextResponse.json(
            { error: errorMessage, details: errorDetails },
            { status: 500 }
        );
    }
}
