import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateFiveYearsOfTransactions, generateFiveYearsOfIncome } from '@/lib/fake-transaction-generator';
import { getUserIdFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Check if user is connected
        const { data: connectionData } = await supabaseAdmin
            .from('user_plaid_connections')
            .select('is_connected')
            .eq('uuid_user_id', userId)
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
        await supabaseAdmin.from('transactions').delete().eq('uuid_user_id', userId);
        await supabaseAdmin.from('income').delete().eq('uuid_user_id', userId);

        // Insert transactions in batches
        const BATCH_SIZE = 500;
        for (let i = 0; i < fakeTransactions.length; i += BATCH_SIZE) {
            const batch = fakeTransactions.slice(i, i + BATCH_SIZE).map(tx => ({
                ...tx,
                user_id: userId,
                uuid_user_id: userId,
            }));
            const { error } = await supabaseAdmin.from('transactions').insert(batch);
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

        // Update last sync time
        await supabaseAdmin
            .from('user_plaid_connections')
            .update({ last_sync_at: new Date().toISOString() })
            .eq('uuid_user_id', userId);

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
