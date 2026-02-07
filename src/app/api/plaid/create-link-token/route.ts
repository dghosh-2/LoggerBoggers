import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid-client';
import { Products, CountryCode } from 'plaid';
import { getUserIdFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        // Validate Plaid credentials are set
        if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
            console.error('Missing Plaid credentials');
            return NextResponse.json(
                { error: 'Plaid is not configured', details: 'Missing API credentials' },
                { status: 500 }
            );
        }
        
        // Get authenticated user ID
        const userId = await getUserIdFromRequest(request);
        
        // Use actual user ID if available, otherwise use timestamp
        // Note: Plaid works without auth, but we prefer authenticated users
        const clientUserId = userId || 'user-' + Date.now();
        
        console.log('Creating link token for user:', clientUserId, userId ? '(authenticated)' : '(guest)');
        
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
        let statusCode = 500;
        
        if (error.response?.data) {
            errorDetails = JSON.stringify(error.response.data);
            
            // Check for common Plaid errors
            if (error.response.data.error_code === 'INVALID_API_KEYS') {
                errorMessage = 'Invalid Plaid API credentials';
                errorDetails = 'Please check your PLAID_CLIENT_ID and PLAID_SECRET';
                statusCode = 500;
            } else if (error.response.data.error_code === 'RATE_LIMIT_EXCEEDED') {
                errorMessage = 'Too many requests. Please try again in a moment.';
                errorDetails = 'Rate limit exceeded';
                statusCode = 429;
            } else if (error.response.data.error_code === 'INVALID_REQUEST') {
                errorMessage = 'Invalid request to Plaid';
                errorDetails = error.response.data.error_message || errorDetails;
                statusCode = 400;
            } else if (error.response.data.error_code === 'ITEM_ERROR') {
                errorMessage = 'Plaid service error';
                errorDetails = error.response.data.error_message || errorDetails;
                statusCode = 500;
            }
        }
        
        return NextResponse.json(
            { error: errorMessage, details: errorDetails },
            { status: statusCode }
        );
    }
}
