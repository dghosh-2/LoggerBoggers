import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid-client';
import { supabase } from '@/lib/supabase';

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

        // Store the access token in Supabase (in production, encrypt this!)
        const { error: insertError } = await supabase.from('plaid_items').upsert({
            user_id: 'default_user',
            item_id: itemId,
            access_token: accessToken,
            institution_id: institution?.institution_id || null,
            institution_name: institution?.name || 'Unknown',
            status: 'active',
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'item_id',
        });

        if (insertError) {
            console.error('Error storing access token:', insertError);
            return NextResponse.json(
                { error: 'Failed to store access token' },
                { status: 500 }
            );
        }

        // Sync transactions and accounts
        try {
            // Get accounts from Plaid
            const accountsResponse = await plaidClient.accountsGet({
                access_token: accessToken,
            });

            const plaidAccounts = accountsResponse.data.accounts;

            // Store accounts in Supabase
            for (const account of plaidAccounts) {
                await supabase.from('accounts').upsert({
                    user_id: 'default_user',
                    plaid_account_id: account.account_id,
                    plaid_item_id: itemId,
                    name: account.name,
                    official_name: account.official_name,
                    type: account.type,
                    subtype: account.subtype,
                    institution_name: institution?.name || 'Unknown',
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

            // Fetch and store transactions
            const now = new Date();
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            const transactionsResponse = await plaidClient.transactionsGet({
                access_token: accessToken,
                start_date: ninetyDaysAgo.toISOString().split('T')[0],
                end_date: now.toISOString().split('T')[0],
            });

            const plaidTransactions = transactionsResponse.data.transactions;

            // Import the generator and category mapper
            const { generateFiveYearsOfTransactions, generateFiveYearsOfIncome } = await import('@/lib/fake-transaction-generator');

            // Map Plaid categories to our simplified categories
            const mapPlaidCategory = (plaidCategories: string[] | null | undefined): string => {
                if (!plaidCategories || plaidCategories.length === 0) return 'Other';
                const primary = plaidCategories[0].toLowerCase();
                if (primary.includes('food') || primary.includes('restaurant') || primary.includes('coffee')) return 'Food & Drink';
                if (primary.includes('travel') || primary.includes('airline') || primary.includes('hotel')) return 'Travel';
                if (primary.includes('transport') || primary.includes('uber') || primary.includes('lyft') || primary.includes('gas')) return 'Transportation';
                if (primary.includes('shop') || primary.includes('merchandise') || primary.includes('store')) return 'Shopping';
                if (primary.includes('entertainment') || primary.includes('recreation')) return 'Entertainment';
                if (primary.includes('health') || primary.includes('medical') || primary.includes('pharmacy')) return 'Health & Fitness';
                if (primary.includes('bill') || primary.includes('utility') || primary.includes('telecom')) return 'Bills & Utilities';
                if (primary.includes('personal') || primary.includes('service')) return 'Personal Care';
                if (primary.includes('education') || primary.includes('book')) return 'Education';
                return 'Other';
            };

            // Convert Plaid transactions to our format
            const formattedPlaidTransactions = plaidTransactions.map(tx => {
                const category = mapPlaidCategory(tx.category);
                const isFoodRelated = category === 'Food & Drink';
                return {
                    user_id: 'default_user',
                    plaid_transaction_id: tx.transaction_id,
                    amount: Math.abs(tx.amount),
                    category,
                    name: tx.name,
                    tip: isFoodRelated ? Math.round(Math.abs(tx.amount) * 0.15 * 100) / 100 : null,
                    tax: isFoodRelated ? Math.round(Math.abs(tx.amount) * 0.08 * 100) / 100 : null,
                    date: tx.date,
                    account_id: tx.account_id,
                    source: 'plaid' as const,
                    merchant_name: tx.merchant_name || tx.name,
                    pending: tx.pending,
                };
            });

            // Generate 5 years of fake historical data
            const fakeTransactions = generateFiveYearsOfTransactions();
            const fakeIncome = generateFiveYearsOfIncome();

            // Filter out fake transactions that overlap with Plaid data (last 90 days)
            const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0];
            const filteredFakeTransactions = fakeTransactions.filter(tx => tx.date < ninetyDaysAgoStr);

            // Combine all transactions
            const allTransactions = [...filteredFakeTransactions, ...formattedPlaidTransactions];

            // Clear existing data and insert new
            await supabase.from('transactions').delete().eq('user_id', 'default_user');
            await supabase.from('income').delete().eq('user_id', 'default_user');

            // Insert transactions in batches
            const BATCH_SIZE = 500;
            for (let i = 0; i < allTransactions.length; i += BATCH_SIZE) {
                const batch = allTransactions.slice(i, i + BATCH_SIZE);
                await supabase.from('transactions').insert(batch);
            }

            // Insert income
            for (let i = 0; i < fakeIncome.length; i += BATCH_SIZE) {
                const batch = fakeIncome.slice(i, i + BATCH_SIZE);
                await supabase.from('income').insert(batch);
            }

            // Update user connection status
            await supabase.from('user_plaid_connections').upsert({
                user_id: 'default_user',
                is_connected: true,
                plaid_item_id: itemId,
                connected_at: new Date().toISOString(),
                last_sync_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id',
            });

        } catch (syncError: any) {
            console.error('Error syncing data:', syncError);
            // Don't fail the connection if sync fails - data can be synced later
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
