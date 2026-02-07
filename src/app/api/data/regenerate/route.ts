import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateFiveYearsOfTransactions, generateFiveYearsOfIncome } from '@/lib/fake-transaction-generator';
import { getUserIdFromRequest } from '@/lib/auth';

// Categories that match the fake transaction generator
const CATEGORY_NAMES = [
    'Food & Drink',
    'Shopping', 
    'Transportation',
    'Bills & Utilities',
    'Entertainment',
    'Health & Fitness',
    'Travel',
    'Personal Care',
    'Education',
    'Other'
];

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

        // Ensure categories exist and build category map
        const categoryMap: Record<string, string> = {};
        for (const categoryName of CATEGORY_NAMES) {
            // Try to get existing category
            const { data: existing } = await supabaseAdmin
                .from('categories')
                .select('id')
                .eq('name', categoryName)
                .single();
            
            if (existing) {
                categoryMap[categoryName] = existing.id;
            } else {
                // Create category if it doesn't exist
                const { data: created, error: createError } = await supabaseAdmin
                    .from('categories')
                    .insert({ name: categoryName })
                    .select('id')
                    .single();
                
                if (created) {
                    categoryMap[categoryName] = created.id;
                } else if (createError) {
                    console.error(`Error creating category ${categoryName}:`, createError);
                }
            }
        }

        // Generate fresh data with current dates
        const fakeTransactions = generateFiveYearsOfTransactions();
        const fakeIncome = generateFiveYearsOfIncome();

        // Clear existing data for this user
        await supabaseAdmin.from('transactions').delete().eq('user_id', userId);
        await supabaseAdmin.from('income').delete().eq('uuid_user_id', userId);

        // Transform transactions to match actual database schema
        // Fake generator produces: { category, date, merchant_name, amount, location, name }
        // Database expects: { category_id, transaction_date, merchant_name, amount, notes, user_id }
        const transformedTransactions = fakeTransactions.map(tx => {
            const categoryId = categoryMap[tx.category] || categoryMap['Other'];
            return {
                merchant_name: tx.merchant_name || tx.name,
                amount: tx.amount,
                transaction_date: tx.date,
                category_id: categoryId,
                user_id: userId,
                notes: tx.location || null,
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

        // Insert income
        let insertedIncome = 0;
        for (let i = 0; i < fakeIncome.length; i += BATCH_SIZE) {
            const batch = fakeIncome.slice(i, i + BATCH_SIZE).map(inc => ({
                amount: inc.amount,
                date: inc.date,
                source: inc.source || 'Salary',
                uuid_user_id: userId,
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
