import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid-client';
import { supabase, Transaction, Income } from '@/lib/supabase';
import { generateFiveYearsOfTransactions, generateFiveYearsOfIncome } from '@/lib/fake-transaction-generator';

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
        const { item_id } = await request.json();
        
        // Get access token from global storage
        const storedTokens = (global as any).plaidAccessTokens as Map<string, { accessToken: string; itemId: string; institution: string }> | undefined;
        
        if (!storedTokens || !storedTokens.has(item_id)) {
            return NextResponse.json(
                { error: 'No access token found for this item' },
                { status: 400 }
            );
        }
        
        const tokenData = storedTokens.get(item_id)!;
        const accessToken = tokenData.accessToken;
        
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
        const formattedPlaidTransactions: Transaction[] = plaidTransactions.map(tx => {
            const category = mapPlaidCategory(tx.category);
            const isFoodRelated = category === 'Food & Drink';
            
            return {
                plaid_transaction_id: tx.transaction_id,
                amount: Math.abs(tx.amount), // Plaid uses negative for debits
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
        await supabase.from('transactions').delete().eq('user_id', 'default_user');
        await supabase.from('income').delete().eq('user_id', 'default_user');
        
        // Insert transactions in batches (Supabase has limits)
        const BATCH_SIZE = 500;
        for (let i = 0; i < allTransactions.length; i += BATCH_SIZE) {
            const batch = allTransactions.slice(i, i + BATCH_SIZE);
            const { error } = await supabase.from('transactions').insert(batch);
            if (error) {
                console.error('Error inserting transactions batch:', error);
            }
        }
        
        // Insert income
        for (let i = 0; i < fakeIncome.length; i += BATCH_SIZE) {
            const batch = fakeIncome.slice(i, i + BATCH_SIZE);
            const { error } = await supabase.from('income').insert(batch);
            if (error) {
                console.error('Error inserting income batch:', error);
            }
        }
        
        // Update user connection status
        await supabase.from('user_plaid_connections').upsert({
            user_id: 'default_user',
            is_connected: true,
            plaid_item_id: item_id,
            connected_at: new Date().toISOString(),
            last_sync_at: new Date().toISOString(),
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
