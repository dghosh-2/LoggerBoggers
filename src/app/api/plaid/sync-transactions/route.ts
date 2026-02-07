import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid-client';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateFiveYearsOfTransactions, generateFiveYearsOfIncome } from '@/lib/fake-transaction-generator';
import { getUserIdFromRequest } from '@/lib/auth';

// Map Plaid categories to our simplified categories
function mapPlaidCategory(plaidCategories: string[] | null | undefined): string {
    if (!plaidCategories || plaidCategories.length === 0) return 'Other';
    
    const primary = plaidCategories[0].toLowerCase();
    
    if (primary.includes('food') || primary.includes('restaurant') || primary.includes('coffee')) {
        return 'Food & Drink';
    }
    if (primary.includes('travel') || primary.includes('airline') || primary.includes('hotel')) {
        return 'Travel';
    }
    if (primary.includes('transport') || primary.includes('uber') || primary.includes('lyft') || primary.includes('gas')) {
        return 'Transportation';
    }
    if (primary.includes('shop') || primary.includes('merchandise') || primary.includes('store')) {
        return 'Shopping';
    }
    if (primary.includes('entertainment') || primary.includes('recreation')) {
        return 'Entertainment';
    }
    if (primary.includes('health') || primary.includes('medical') || primary.includes('pharmacy')) {
        return 'Health & Fitness';
    }
    if (primary.includes('bill') || primary.includes('utility') || primary.includes('telecom')) {
        return 'Bills & Utilities';
    }
    if (primary.includes('personal') || primary.includes('service')) {
        return 'Personal Care';
    }
    if (primary.includes('education') || primary.includes('book')) {
        return 'Education';
    }
    
    return 'Other';
}

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { item_id } = await request.json();
        
        // Get access token from Supabase
        const { data: plaidItem, error: itemError } = await supabaseAdmin
            .from('plaid_items')
            .select('access_token, institution_name')
            .eq('item_id', item_id)
            .single();
        
        if (itemError || !plaidItem) {
            return NextResponse.json(
                { error: 'No access token found for this item' },
                { status: 400 }
            );
        }
        
        const accessToken = plaidItem.access_token;

        // Only seed demo data once per user. After that, we only append new Plaid transactions.
        // This prevents wiping user history on subsequent syncs/logins.
        const [{ data: anyTx }, { data: anyIncome }] = await Promise.all([
            supabaseAdmin.from('transactions').select('id').eq('uuid_user_id', userId).limit(1),
            supabaseAdmin.from('income').select('id').eq('uuid_user_id', userId).limit(1),
        ]);
        const hasExistingData = (anyTx?.length ?? 0) > 0 || (anyIncome?.length ?? 0) > 0;
        
        // Fetch transactions from Plaid (last 90 days)
        const now = new Date();
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        
        const transactionsResponse = await plaidClient.transactionsGet({
            access_token: accessToken,
            start_date: ninetyDaysAgo.toISOString().split('T')[0],
            end_date: now.toISOString().split('T')[0],
        });
        
        const plaidTransactions = transactionsResponse.data.transactions;
        
        // Convert Plaid transactions to our format
        const formattedPlaidTransactions = plaidTransactions.map(tx => {
            const category = mapPlaidCategory(tx.category);
            const isFoodRelated = category === 'Food & Drink';
            
            return {
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

        // Insert transactions in batches (Supabase has limits)
        const BATCH_SIZE = 500;

        // Seed demo history only if the user has no existing financial data.
        let generatedFakeCount = 0;
        let totalInsertedTransactions = 0;
        let incomeRecords = 0;
        if (!hasExistingData) {
            const fakeTransactions = generateFiveYearsOfTransactions();
            const fakeIncome = generateFiveYearsOfIncome();

            // Filter out fake transactions that overlap with Plaid data (last 90 days)
            const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0];
            const filteredFakeTransactions = fakeTransactions.filter(tx => tx.date < ninetyDaysAgoStr);
            generatedFakeCount = filteredFakeTransactions.length;

            const seedTransactions = [...filteredFakeTransactions, ...formattedPlaidTransactions].map(tx => ({
                ...tx,
                user_id: userId,
                uuid_user_id: userId,
            }));
            totalInsertedTransactions = seedTransactions.length;

            for (let i = 0; i < seedTransactions.length; i += BATCH_SIZE) {
                const batch = seedTransactions.slice(i, i + BATCH_SIZE);
                const { error } = await supabaseAdmin.from('transactions').insert(batch);
                if (error) {
                    console.error('Error inserting seeded transactions batch:', error);
                }
            }

            for (let i = 0; i < fakeIncome.length; i += BATCH_SIZE) {
                const batch = fakeIncome.slice(i, i + BATCH_SIZE).map(inc => ({
                    ...inc,
                    user_id: userId,
                    uuid_user_id: userId,
                }));
                const { error } = await supabaseAdmin.from('income').insert(batch);
                if (error) {
                    console.error('Error inserting seeded income batch:', error);
                } else {
                    incomeRecords += batch.length;
                }
            }
        } else {
            // Incremental: insert only Plaid transactions we don't already have (by plaid_transaction_id).
            const plaidIds = formattedPlaidTransactions
                .map(tx => tx.plaid_transaction_id)
                .filter((id): id is string => typeof id === 'string' && id.length > 0);

            let existingIds = new Set<string>();
            if (plaidIds.length > 0) {
                // Chunk to avoid huge IN queries.
                const CHUNK = 500;
                for (let i = 0; i < plaidIds.length; i += CHUNK) {
                    const chunk = plaidIds.slice(i, i + CHUNK);
                    const { data: existing } = await supabaseAdmin
                        .from('transactions')
                        .select('plaid_transaction_id')
                        .eq('uuid_user_id', userId)
                        .in('plaid_transaction_id', chunk);
                    (existing || []).forEach((row: any) => {
                        if (row?.plaid_transaction_id) existingIds.add(String(row.plaid_transaction_id));
                    });
                }
            }

            const newPlaidTransactions = formattedPlaidTransactions
                .filter(tx => tx.plaid_transaction_id && !existingIds.has(tx.plaid_transaction_id))
                .map(tx => ({
                    ...tx,
                    user_id: userId,
                    uuid_user_id: userId,
                }));
            totalInsertedTransactions = newPlaidTransactions.length;

            for (let i = 0; i < newPlaidTransactions.length; i += BATCH_SIZE) {
                const batch = newPlaidTransactions.slice(i, i + BATCH_SIZE);
                const { error } = await supabaseAdmin.from('transactions').insert(batch);
                if (error) {
                    console.error('Error inserting incremental Plaid transactions batch:', error);
                }
            }
        }
        
        // Update user connection status
        await supabaseAdmin.from('user_plaid_connections').upsert({
            user_id: userId,
            uuid_user_id: userId,
            is_connected: true,
            plaid_item_id: item_id,
            connected_at: new Date().toISOString(),
            last_sync_at: new Date().toISOString(),
        }, {
            onConflict: 'uuid_user_id',
        });
        
        return NextResponse.json({
            success: true,
            plaid_transactions: formattedPlaidTransactions.length,
            generated_transactions: generatedFakeCount,
            total_transactions: totalInsertedTransactions,
            income_records: incomeRecords,
            skipped_demo_seed: hasExistingData,
        });
        
    } catch (error: any) {
        console.error('Error syncing transactions:', error.response?.data || error.message);
        return NextResponse.json(
            { error: 'Failed to sync transactions', details: error.response?.data || error.message },
            { status: 500 }
        );
    }
}
