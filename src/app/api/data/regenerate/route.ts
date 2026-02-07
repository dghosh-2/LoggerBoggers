import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateFiveYearsOfTransactions, generateFiveYearsOfIncome } from '@/lib/fake-transaction-generator';

export async function POST(request: NextRequest) {
    try {
        // Check if user is connected
        const { data: connectionData } = await supabase
            .from('user_plaid_connections')
            .select('is_connected')
            .eq('user_id', 'default_user')
            .single();

        if (!connectionData?.is_connected) {
            return NextResponse.json(
                { error: 'Not connected to Plaid' },
                { status: 400 }
            );
        }

        // Generate fresh data with current dates
        const fakeTransactions = generateFiveYearsOfTransactions();
        const fakeIncome = generateFiveYearsOfIncome();

        // Clear existing data
        await supabase.from('transactions').delete().eq('user_id', 'default_user');
        await supabase.from('income').delete().eq('user_id', 'default_user');

        // Insert transactions in batches
        const BATCH_SIZE = 500;
        for (let i = 0; i < fakeTransactions.length; i += BATCH_SIZE) {
            const batch = fakeTransactions.slice(i, i + BATCH_SIZE);
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

        // Update last sync time
        await supabase
            .from('user_plaid_connections')
            .update({ last_sync_at: new Date().toISOString() })
            .eq('user_id', 'default_user');

        return NextResponse.json({
            success: true,
            transactions: fakeTransactions.length,
            income: fakeIncome.length,
            dateRange: {
                earliest: fakeTransactions[0]?.date,
                latest: fakeTransactions[fakeTransactions.length - 1]?.date,
            }
        });
    } catch (error: any) {
        console.error('Error regenerating data:', error);
        return NextResponse.json(
            { error: 'Failed to regenerate data', details: error.message },
            { status: 500 }
        );
    }
}
