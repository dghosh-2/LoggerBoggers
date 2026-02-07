import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const userId = await getUserIdFromRequest(request);
        
        // Get counts from all tables
        const [
            { count: userCount },
            { count: sessionCount },
            { count: transactionCount },
            { count: incomeCount },
            { count: accountCount },
            { count: holdingCount },
            { count: connectionCount },
        ] = await Promise.all([
            supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('sessions').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('financial_transactions').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('income').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('accounts').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('holdings').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('user_plaid_connections').select('*', { count: 'exact', head: true }),
        ]);

        // Get user-specific data if authenticated
        let userData = null;
        if (userId) {
            const [
                { data: userTransactions, count: userTxCount },
                { data: userIncome, count: userIncCount },
                { data: userAccounts },
                { data: userConnection },
            ] = await Promise.all([
                supabaseAdmin.from('financial_transactions').select('*', { count: 'exact' }).eq('uuid_user_id', userId).limit(5),
                supabaseAdmin.from('income').select('*', { count: 'exact' }).eq('uuid_user_id', userId).limit(5),
                supabaseAdmin.from('accounts').select('*').eq('uuid_user_id', userId),
                supabaseAdmin.from('user_plaid_connections').select('*').eq('uuid_user_id', userId).single(),
            ]);

            userData = {
                userId,
                transactionCount: userTxCount,
                incomeCount: userIncCount,
                accountCount: userAccounts?.length || 0,
                isConnected: userConnection?.is_connected || false,
                sampleTransactions: userTransactions?.slice(0, 3),
                sampleIncome: userIncome?.slice(0, 3),
                accounts: userAccounts,
                connection: userConnection,
            };
        }

        return NextResponse.json({
            authenticated: !!userId,
            globalCounts: {
                users: userCount,
                sessions: sessionCount,
                transactions: transactionCount,
                income: incomeCount,
                accounts: accountCount,
                holdings: holdingCount,
                connections: connectionCount,
            },
            userData,
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        });
    } catch (error: any) {
        console.error('Debug check error:', error);
        return NextResponse.json({
            error: error.message,
            stack: error.stack,
        }, { status: 500 });
    }
}
