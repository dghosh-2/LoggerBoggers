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
        
        // Clear existing data for this user
        await supabaseAdmin.from('financial_transactions').delete().eq('uuid_user_id', userId);
        await supabaseAdmin.from('income').delete().eq('uuid_user_id', userId);

        // Insert transactions in batches (Supabase has limits)
        const BATCH_SIZE = 500;
        for (let i = 0; i < allTransactions.length; i += BATCH_SIZE) {
            const batch = allTransactions.slice(i, i + BATCH_SIZE).map(tx => ({
                ...tx,
                user_id: userId,
                uuid_user_id: userId,
            }));
            const { error } = await supabaseAdmin.from('financial_transactions').insert(batch);
            if (error) {
                console.error('Error inserting transactions batch:', error);
            }
        }
        
        // Insert income
        for (let i = 0; i < fakeIncome.length; i += BATCH_SIZE) {
            const batch = fakeIncome.slice(i, i + BATCH_SIZE).map(inc => ({
                ...inc,
                user_id: userId,
                uuid_user_id: userId,
            }));
            const { error } = await supabaseAdmin.from('income').insert(batch);
            if (error) {
                console.error('Error inserting income batch:', error);
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
            generated_transactions: filteredFakeTransactions.length,
            total_transactions: allTransactions.length,
            income_records: fakeIncome.length,
        });
        
    } catch (error: any) {
        console.error('Error syncing transactions:', error.response?.data || error.message);
        return NextResponse.json(
            { error: 'Failed to sync transactions', details: error.response?.data || error.message },
            { status: 500 }
        );
    }
}
