import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid-client';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        // Get authenticated user ID
        const userId = await getUserIdFromRequest(request);
        
        if (!userId) {
            return NextResponse.json({ 
                accounts: [],
                institutions: [],
                message: 'Authentication required' 
            });
        }

        // Check if user is connected
        const { data: connectionData } = await supabaseAdmin
            .from('user_plaid_connections')
            .select('is_connected')
            .eq('uuid_user_id', userId)
            .single();

        if (!connectionData?.is_connected) {
            return NextResponse.json({ 
                accounts: [],
                institutions: [],
                message: 'No connected accounts' 
            });
        }

        // Get all stored Plaid items AND Capital One items for this user
        const { data: plaidItems, error: itemsError } = await supabaseAdmin
            .from('plaid_items')
            .select('*')
            .eq('uuid_user_id', userId)
            .eq('status', 'active');

        if (itemsError) {
            console.error('Error fetching items:', itemsError);
        }

        // If no items found, return empty
        if (!plaidItems || plaidItems.length === 0) {
            return NextResponse.json({ 
                accounts: [],
                institutions: [],
                message: 'No connected accounts' 
            });
        }

        const allAccounts: any[] = [];
        const institutions: any[] = [];

        // Fetch account data for each connected item
        for (const item of plaidItems) {
            try {
                // Check if this is a Capital One item (institution_id === 'capital_one')
                const isCapitalOne = item.institution_id === 'capital_one';
                
                if (isCapitalOne) {
                    // For Capital One, fetch accounts directly from Supabase
                    const { data: capitalOneAccounts, error: accountsError } = await supabaseAdmin
                        .from('accounts')
                        .select('*')
                        .eq('plaid_item_id', item.item_id)
                        .eq('uuid_user_id', userId);
                    
                    if (accountsError) {
                        console.error('Error fetching Capital One accounts:', accountsError);
                        continue;
                    }
                    
                    if (capitalOneAccounts && capitalOneAccounts.length > 0) {
                        const accounts = capitalOneAccounts.map(account => ({
                            id: account.plaid_account_id,
                            name: account.name,
                            officialName: account.official_name,
                            type: account.type,
                            subtype: account.subtype,
                            mask: account.mask,
                            currentBalance: account.current_balance || 0,
                            availableBalance: account.available_balance,
                            limit: account.credit_limit,
                            isoCurrencyCode: account.iso_currency_code || 'USD',
                            institution: item.institution_name,
                            itemId: item.item_id,
                        }));
                        
                        allAccounts.push(...accounts);
                        
                        institutions.push({
                            id: item.institution_id || item.item_id,
                            itemId: item.item_id,
                            name: item.institution_name,
                            logo: null,
                            primaryColor: '#D03027', // Capital One red
                            accounts: accounts,
                            status: 'connected',
                            lastSync: item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'Just now',
                        });
                    }
                } else {
                    // For Plaid items, fetch from Plaid API
                    const accountsResponse = await plaidClient.accountsGet({
                        access_token: item.access_token,
                    });

                    const accounts = accountsResponse.data.accounts.map(account => ({
                        id: account.account_id,
                        name: account.name,
                        officialName: account.official_name,
                        type: account.type,
                        subtype: account.subtype,
                        mask: account.mask,
                        currentBalance: account.balances.current || 0,
                        availableBalance: account.balances.available,
                        limit: account.balances.limit,
                        isoCurrencyCode: account.balances.iso_currency_code || 'USD',
                        institution: item.institution_name,
                        itemId: item.item_id,
                    }));

                    allAccounts.push(...accounts);

                    // Update accounts in Supabase with fresh balances
                    for (const account of accountsResponse.data.accounts) {
                        await supabaseAdmin.from('accounts').upsert({
                            user_id: userId,
                            uuid_user_id: userId,
                            plaid_account_id: account.account_id,
                            plaid_item_id: item.item_id,
                            name: account.name,
                            official_name: account.official_name,
                            type: account.type,
                            subtype: account.subtype,
                            institution_name: item.institution_name,
                            current_balance: account.balances.current || 0,
                            available_balance: account.balances.available,
                            credit_limit: account.balances.limit,
                            mask: account.mask,
                            iso_currency_code: account.balances.iso_currency_code || 'USD',
                            last_synced_at: new Date().toISOString(),
                        }, {
                            onConflict: 'plaid_account_id',
                        });
                    }

                    // Get institution info
                    const plaidItem = accountsResponse.data.item;
                    if (plaidItem.institution_id) {
                        try {
                            const instResponse = await plaidClient.institutionsGetById({
                                institution_id: plaidItem.institution_id,
                                country_codes: ['US'] as any,
                            });
                            
                            institutions.push({
                                id: plaidItem.institution_id,
                                itemId: item.item_id,
                                name: instResponse.data.institution.name,
                                logo: instResponse.data.institution.logo,
                                primaryColor: instResponse.data.institution.primary_color,
                                accounts: accounts,
                                status: 'connected',
                                lastSync: 'Just now',
                            });
                        } catch (instError) {
                            institutions.push({
                                id: plaidItem.institution_id,
                                itemId: item.item_id,
                                name: item.institution_name,
                                logo: null,
                                primaryColor: null,
                                accounts: accounts,
                                status: 'connected',
                                lastSync: 'Just now',
                            });
                        }
                    } else {
                        institutions.push({
                            id: item.item_id,
                            itemId: item.item_id,
                            name: item.institution_name,
                            logo: null,
                            primaryColor: null,
                            accounts: accounts,
                            status: 'connected',
                            lastSync: 'Just now',
                        });
                    }
                }
            } catch (accountError: any) {
                console.error(`Error fetching accounts for item ${item.item_id}:`, accountError.response?.data || accountError.message);
                
                // If token is invalid, mark item as inactive (only for Plaid)
                if (accountError.response?.data?.error_code === 'ITEM_LOGIN_REQUIRED') {
                    await supabaseAdmin
                        .from('plaid_items')
                        .update({ status: 'login_required' })
                        .eq('item_id', item.item_id);
                }
            }
        }

        // Update last sync time
        await supabaseAdmin
            .from('user_plaid_connections')
            .update({ last_sync_at: new Date().toISOString() })
            .eq('uuid_user_id', userId);

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
