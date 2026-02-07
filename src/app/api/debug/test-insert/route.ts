import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserIdFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserIdFromRequest(request);
        
        if (!userId) {
            return NextResponse.json({
                error: 'Not authenticated',
                hint: 'Please log in first',
            }, { status: 401 });
        }

        // Check if user exists
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, username')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return NextResponse.json({
                error: 'User not found in database',
                userId,
                userError,
                hint: 'The session references a user that does not exist',
            }, { status: 404 });
        }

        // Try to insert a test transaction
        const testTransaction = {
            user_id: userId,
            uuid_user_id: userId,
            merchant_name: 'Test Merchant',
            name: 'Test Transaction',
            amount: 10.00,
            date: new Date().toISOString().split('T')[0],
            category: 'Other',
            source: 'manual',
            location: 'Test Location',
            pending: false,
            tip: null,
            tax: null,
        };

        console.log('Attempting to insert test transaction:', testTransaction);

        const { data: insertedTx, error: txError } = await supabaseAdmin
            .from('financial_transactions')
            .insert(testTransaction)
            .select()
            .single();

        if (txError) {
            console.error('Transaction insert error:', txError);
            return NextResponse.json({
                success: false,
                error: 'Failed to insert transaction',
                errorDetails: {
                    code: txError.code,
                    message: txError.message,
                    details: txError.details,
                    hint: txError.hint,
                },
                attemptedData: testTransaction,
                user: { id: user.id, username: user.username },
            }, { status: 500 });
        }

        // Clean up - delete the test transaction
        await supabaseAdmin
            .from('financial_transactions')
            .delete()
            .eq('id', insertedTx.id);

        return NextResponse.json({
            success: true,
            message: 'Test transaction inserted and deleted successfully',
            insertedTransaction: insertedTx,
            user: { id: user.id, username: user.username },
        });
    } catch (error: any) {
        console.error('Test insert error:', error);
        return NextResponse.json({
            error: error.message,
            stack: error.stack,
        }, { status: 500 });
    }
}
