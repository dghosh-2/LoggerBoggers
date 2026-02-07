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

        // Clear existing data for this user
        await supabaseAdmin.from('transactions').delete().eq('uuid_user_id', userId);
        await supabaseAdmin.from('income').delete().eq('uuid_user_id', userId);

        // Transform transactions to match actual database schema
        // Actual schema: id, user_id, plaid_transaction_id, amount, category, name, date, account_id, source, merchant_name, pending, uuid_user_id, location
        const transformedTransactions = fakeTransactions.map(tx => {
            return {
                user_id: userId,
                uuid_user_id: userId,
                merchant_name: tx.merchant_name || tx.name,
                name: tx.name || tx.merchant_name,
                amount: tx.amount,
                date: tx.date,           // Schema uses 'date' not 'transaction_date'
                category: tx.category,   // Schema uses 'category' (text) not 'category_id'
                source: 'regenerated',
                location: tx.location || null,
                pending: false,
            };
        });

        // Insert transactions in batches
        const BATCH_SIZE = 500;
        let insertedTransactions = 0;
        for (let i = 0; i < transformedTransactions.length; i += BATCH_SIZE) {
            const batch = transformedTransactions.slice(i, i + BATCH_SIZE);
            const { error } = await supabaseAdmin.from('transactions').insert(batch);
            if (error) {
                console.error('Error inserting transactions batch:', error);
            } else {
                insertedTransactions += batch.length;
            }
        }

        // Insert income - match actual schema
        // Actual schema: id, user_id, amount, source, name, date, recurring, frequency, uuid_user_id, location
        let insertedIncome = 0;
        for (let i = 0; i < fakeIncome.length; i += BATCH_SIZE) {
            const batch = fakeIncome.slice(i, i + BATCH_SIZE).map(inc => ({
                user_id: userId,
                uuid_user_id: userId,
                amount: inc.amount,
                source: inc.source || 'Salary',
                name: inc.source || 'Salary',
                date: inc.date,
                recurring: true,
                frequency: 'monthly',
            }));
            const { error } = await supabaseAdmin.from('income').insert(batch);
            if (error) {
                console.error('Error inserting income batch:', error);
            } else {
                insertedIncome += batch.length;
            }
        }

        // Update last sync time
        await supabaseAdmin
            .from('user_plaid_connections')
            .update({ last_sync_at: new Date().toISOString() })
            .eq('uuid_user_id', userId);

        console.log(`Regenerated data for user ${userId}: ${insertedTransactions} transactions, ${insertedIncome} income records`);

        return NextResponse.json({
            success: true,
            transactions: insertedTransactions,
            income: insertedIncome,
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
