import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
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
        
        let query = supabase
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
            query = query.eq('category', category);
        }
        
        const { data, error } = await query;
        
        if (error) {
            throw error;
        }
        
        // #region agent log
        const categoryCounts: Record<string, number> = {};
        (data || []).forEach((tx: any) => { categoryCounts[tx.category] = (categoryCounts[tx.category] || 0) + 1; });
        fetch('http://127.0.0.1:7245/ingest/2d405ccf-cb3f-4611-bc27-f95a616c15c9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'transactions/route.ts:42',message:'Transactions fetched',data:{count:data?.length||0,categoryCounts,sampleTx:(data||[]).slice(0,3).map((t:any)=>({name:t.name,category:t.category,amount:t.amount,source:t.source}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,E'})}).catch(()=>{});
        // #endregion
        
        return NextResponse.json({ transactions: data || [] });
    } catch (error: any) {
        console.error('Error fetching transactions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch transactions', transactions: [] },
            { status: 500 }
        );
    }
}
