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
        
        // Schema: id, user_id, uuid_user_id, date, category, name, merchant_name, amount, tip, tax, location, source, pending
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
            tip: tx.tip,
            tax: tx.tax,
            source: tx.source,
            created_at: tx.created_at,
        }));
        
        return NextResponse.json({ transactions: normalizedTransactions });
    } catch (error: any) {
        console.error('Error fetching transactions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch transactions', transactions: [] },
            { status: 500 }
        );
    }
}
