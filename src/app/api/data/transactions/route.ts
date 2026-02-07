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
        
        // Actual schema: id, receipt_id, merchant_name, amount, transaction_date, category_id, notes, created_at, user_id
        let query = supabaseAdmin
            .from('transactions')
            .select('*, categories(name)')
            .eq('user_id', userId)
            .order('transaction_date', { ascending: false })
            .limit(limit);
        
        if (startDate) {
            query = query.gte('transaction_date', startDate);
        }
        if (endDate) {
            query = query.lte('transaction_date', endDate);
        }
        if (category) {
            // Need to filter by category_id - get category id first
            const { data: catData } = await supabaseAdmin
                .from('categories')
                .select('id')
                .eq('name', category)
                .single();
            if (catData) {
                query = query.eq('category_id', catData.id);
            }
        }
        
        const { data, error } = await query;
        
        if (error) {
            throw error;
        }
        
        // Normalize transaction format for frontend compatibility
        const normalizedTransactions = (data || []).map((tx: any) => ({
            id: tx.id,
            amount: tx.amount,
            category: tx.categories?.name || 'Other',
            name: tx.merchant_name || 'Unknown',
            merchant_name: tx.merchant_name,
            date: tx.transaction_date,
            location: tx.notes,
            created_at: tx.created_at,
            // Keep original fields too
            category_id: tx.category_id,
            transaction_date: tx.transaction_date,
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
