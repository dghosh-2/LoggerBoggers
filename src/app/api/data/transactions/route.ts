import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        // Get authenticated user ID
        const userId = await getUserIdFromRequest(request);
        
        if (!userId) {
            return NextResponse.json({ transactions: [] });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        const category = searchParams.get('category');
        const limit = parseInt(searchParams.get('limit') || '1000');
        
        // Actual schema: id, user_id, plaid_transaction_id, amount, category, name, date, account_id, source, merchant_name, pending, uuid_user_id, location
        let query = supabaseAdmin
            .from('transactions')
            .select('*')
            .eq('uuid_user_id', userId)
            .order('date', { ascending: false })
            .limit(limit);
        
        if (startDate) {
            query = query.gte('date', startDate);
        }
        if (endDate) {
            query = query.lte('date', endDate);
        }
        if (category) {
            // Category is a text field, filter directly
            query = query.eq('category', category);
        }
        
        const { data, error } = await query;
        
        if (error) {
            throw error;
        }
        
        // Normalize transaction format for frontend compatibility
        const normalizedTransactions = (data || []).map((tx: any) => ({
            id: tx.id,
            amount: tx.amount,
            category: tx.category || 'Other',
            name: tx.merchant_name || tx.name || 'Unknown',
            merchant_name: tx.merchant_name,
            date: tx.date,
            location: tx.location,
            created_at: tx.created_at,
        }));
        
        // #region agent log
        const categoryCounts: Record<string, number> = {};
        normalizedTransactions.forEach((tx: any) => { categoryCounts[tx.category] = (categoryCounts[tx.category] || 0) + 1; });
        fetch('http://127.0.0.1:7245/ingest/2d405ccf-cb3f-4611-bc27-f95a616c15c9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'transactions/route.ts:55',message:'Transactions fetched',data:{count:normalizedTransactions.length,categoryCounts,sampleTx:normalizedTransactions.slice(0,3)},timestamp:Date.now(),hypothesisId:'A,E'})}).catch(()=>{});
        // #endregion
        
        return NextResponse.json({ transactions: normalizedTransactions });
    } catch (error: any) {
        console.error('Error fetching transactions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch transactions', transactions: [] },
            { status: 500 }
        );
    }
}
