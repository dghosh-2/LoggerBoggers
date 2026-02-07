import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid-client';

export async function GET(request: NextRequest) {
    try {
        // Get all stored access tokens
        const storedTokens = (global as any).plaidAccessTokens as Map<string, { accessToken: string; itemId: string; institution: string }> | undefined;
        
        if (!storedTokens || storedTokens.size === 0) {
            return NextResponse.json({ 
                accounts: [],
                institutions: [],
                message: 'No connected accounts' 
            });
        }

        const allAccounts: any[] = [];
        const institutions: any[] = [];

        // Fetch accounts for each connected item
        for (const [itemId, tokenData] of storedTokens.entries()) {
            try {
                const accountsResponse = await plaidClient.accountsGet({
                    access_token: tokenData.accessToken,
                });

                const accounts = accountsResponse.data.accounts.map(account => ({
                    id: account.account_id,
                    name: account.name,
                    officialName: account.official_name,
                    type: account.type,
                    subtype: account.subtype,
                    mask: account.mask,
                    currentBalance: account.balances.current,
                    availableBalance: account.balances.available,
                    limit: account.balances.limit,
                    isoCurrencyCode: account.balances.iso_currency_code,
                    institution: tokenData.institution,
                    itemId: itemId,
                }));

                allAccounts.push(...accounts);

                // Get institution info
                const item = accountsResponse.data.item;
                if (item.institution_id) {
                    try {
                        const instResponse = await plaidClient.institutionsGetById({
                            institution_id: item.institution_id,
                            country_codes: ['US'] as any,
                        });
                        
                        institutions.push({
                            id: item.institution_id,
                            itemId: itemId,
                            name: instResponse.data.institution.name,
                            logo: instResponse.data.institution.logo,
                            primaryColor: instResponse.data.institution.primary_color,
                            accounts: accounts,
                            status: 'connected',
                            lastSync: 'Just now',
                        });
                    } catch (instError) {
                        institutions.push({
                            id: item.institution_id,
                            itemId: itemId,
                            name: tokenData.institution,
                            logo: null,
                            primaryColor: null,
                            accounts: accounts,
                            status: 'connected',
                            lastSync: 'Just now',
                        });
                    }
                }
            } catch (accountError: any) {
                console.error(`Error fetching accounts for item ${itemId}:`, accountError.response?.data || accountError.message);
            }
        }

        return NextResponse.json({ 
            accounts: allAccounts,
            institutions: institutions,
        });
    } catch (error: any) {
        console.error('Error fetching accounts:', error.response?.data || error.message);
        return NextResponse.json(
            { error: 'Failed to fetch accounts', details: error.response?.data || error.message },
            { status: 500 }
        );
    }
}
