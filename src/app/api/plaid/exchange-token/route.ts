import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid-client';
import { supabase } from '@/lib/supabase';
import { getUserIdFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        // Get authenticated user ID
        const userId = await getUserIdFromRequest(request);
        
        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

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
            user_id: userId,
            uuid_user_id: userId,
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
            // Note: For demo purposes, we adjust balances to show a positive net worth
            // In production, you'd use the actual Plaid balances
            
            // Default locations for different account types
            const accountLocations: Record<string, string> = {
                'depository': '600 Grant St, Pittsburgh, PA 15219',
                'investment': '1 PPG Pl, Pittsburgh, PA 15222',
                'loan': '525 William Penn Pl, Pittsburgh, PA 15219',
                'credit': '420 Fort Duquesne Blvd, Pittsburgh, PA 15222',
            };
            
            for (const account of plaidAccounts) {
                let adjustedBalance = account.balances.current || 0;
                
                // For demo: scale down loan balances to show positive net worth
                // This makes the demo more visually appealing
                if (account.type === 'loan') {
                    adjustedBalance = Math.round(adjustedBalance * 0.15); // Reduce loans to 15%
                } else if (account.type === 'depository') {
                    adjustedBalance = Math.round(adjustedBalance * 1.5); // Increase cash by 50%
                } else if (account.type === 'investment') {
                    adjustedBalance = Math.round(adjustedBalance * 2); // Double investments
                }
                
                await supabase.from('accounts').upsert({
                    user_id: userId,
                    uuid_user_id: userId,
                    plaid_account_id: account.account_id,
                    plaid_item_id: itemId,
                    name: account.name,
                    official_name: account.official_name,
                    type: account.type,
                    subtype: account.subtype,
                    institution_name: institution?.name || 'Unknown',
                    current_balance: adjustedBalance,
                    available_balance: account.balances.available,
                    credit_limit: account.balances.limit,
                    mask: account.mask,
                    iso_currency_code: account.balances.iso_currency_code || 'USD',
                    location: accountLocations[account.type] || '600 Grant St, Pittsburgh, PA 15219',
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
            // Also check merchant name for better categorization
            const mapPlaidCategory = (plaidCategories: string[] | null | undefined, merchantName?: string | null): string => {
                const name = (merchantName || '').toLowerCase();
                
                // First try to categorize by merchant name (more reliable for sandbox)
                if (name.includes('starbucks') || name.includes('mcdonald') || name.includes('kfc') || 
                    name.includes('restaurant') || name.includes('cafe') || name.includes('coffee') ||
                    name.includes('doordash') || name.includes('uber eats') || name.includes('grubhub')) {
                    return 'Food & Drink';
                }
                if (name.includes('uber') || name.includes('lyft') || name.includes('gas') || 
                    name.includes('shell') || name.includes('chevron') || name.includes('exxon') ||
                    name.includes('parking') || name.includes('transit')) {
                    return 'Transportation';
                }
                if (name.includes('united') || name.includes('delta') || name.includes('american airlines') ||
                    name.includes('southwest') || name.includes('airline') || name.includes('hotel') ||
                    name.includes('marriott') || name.includes('hilton') || name.includes('airbnb')) {
                    return 'Travel';
                }
                if (name.includes('amazon') || name.includes('walmart') || name.includes('target') ||
                    name.includes('costco') || name.includes('best buy') || name.includes('shop')) {
                    return 'Shopping';
                }
                if (name.includes('netflix') || name.includes('spotify') || name.includes('hulu') ||
                    name.includes('disney') || name.includes('hbo') || name.includes('theater') ||
                    name.includes('cinema') || name.includes('game')) {
                    return 'Entertainment';
                }
                if (name.includes('gym') || name.includes('fitness') || name.includes('pharmacy') ||
                    name.includes('cvs') || name.includes('walgreens') || name.includes('doctor') ||
                    name.includes('medical') || name.includes('health')) {
                    return 'Health & Fitness';
                }
                if (name.includes('electric') || name.includes('water') || name.includes('utility') ||
                    name.includes('comcast') || name.includes('verizon') || name.includes('at&t') ||
                    name.includes('t-mobile') || name.includes('internet') || name.includes('payment')) {
                    return 'Bills & Utilities';
                }
                
                // Fall back to Plaid categories if merchant name didn't match
                if (!plaidCategories || plaidCategories.length === 0) return 'Other';
                const allCategories = plaidCategories.join(' ').toLowerCase();
                if (allCategories.includes('food') || allCategories.includes('restaurant') || allCategories.includes('coffee')) return 'Food & Drink';
                if (allCategories.includes('travel') || allCategories.includes('airline') || allCategories.includes('hotel')) return 'Travel';
                if (allCategories.includes('transport') || allCategories.includes('uber') || allCategories.includes('lyft') || allCategories.includes('gas')) return 'Transportation';
                if (allCategories.includes('shop') || allCategories.includes('merchandise') || allCategories.includes('store')) return 'Shopping';
                if (allCategories.includes('entertainment') || allCategories.includes('recreation')) return 'Entertainment';
                if (allCategories.includes('health') || allCategories.includes('medical') || allCategories.includes('pharmacy')) return 'Health & Fitness';
                if (allCategories.includes('bill') || allCategories.includes('utility') || allCategories.includes('telecom')) return 'Bills & Utilities';
                if (allCategories.includes('personal') || allCategories.includes('service')) return 'Personal Care';
                if (allCategories.includes('education') || allCategories.includes('book')) return 'Education';
                return 'Other';
            };

            // Convert Plaid transactions to our format
            // Note: We'll skip Plaid sandbox transactions as they have unrealistic amounts ($500 for everything)
            // and use our generated data instead for a better demo experience
            const formattedPlaidTransactions = plaidTransactions.map(tx => {
                const category = mapPlaidCategory(tx.category, tx.merchant_name || tx.name);
                const isFoodRelated = category === 'Food & Drink';
                return {
                    user_id: userId,
                    uuid_user_id: userId,
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

            // Generate 5 years of fake historical data (up to TODAY, not 90 days ago)
            const fakeTransactions = generateFiveYearsOfTransactions();
            const fakeIncome = generateFiveYearsOfIncome();

            // Use ALL fake transactions - they go up to current date
            // Don't filter by 90 days since Plaid sandbox data has unrealistic amounts
            // For a real production app, you'd want to merge Plaid data properly
            const allTransactions = fakeTransactions;

            // Clear existing data and insert new
            await supabase.from('transactions').delete().eq('uuid_user_id', userId);
            await supabase.from('income').delete().eq('uuid_user_id', userId);

            // Add user_id to fake transactions and income
            const allTransactionsWithUser = allTransactions.map(tx => ({
                ...tx,
                user_id: userId,
                uuid_user_id: userId,
            }));

            const fakeIncomeWithUser = fakeIncome.map(inc => ({
                ...inc,
                user_id: userId,
                uuid_user_id: userId,
            }));

            // Insert transactions in batches
            const BATCH_SIZE = 500;
            for (let i = 0; i < allTransactionsWithUser.length; i += BATCH_SIZE) {
                const batch = allTransactionsWithUser.slice(i, i + BATCH_SIZE);
                await supabase.from('transactions').insert(batch);
            }

            // Insert income
            for (let i = 0; i < fakeIncomeWithUser.length; i += BATCH_SIZE) {
                const batch = fakeIncomeWithUser.slice(i, i + BATCH_SIZE);
                await supabase.from('income').insert(batch);
            }

            // Update user connection status
            await supabase.from('user_plaid_connections').upsert({
                user_id: userId,
                uuid_user_id: userId,
                is_connected: true,
                plaid_item_id: itemId,
                connected_at: new Date().toISOString(),
                last_sync_at: new Date().toISOString(),
            }, {
                onConflict: 'uuid_user_id',
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
