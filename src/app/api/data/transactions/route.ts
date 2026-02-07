import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        const category = searchParams.get('category');
        const limit = parseInt(searchParams.get('limit') || '1000');
        
        let query = supabase
            .from('transactions')
            .select('*')
            .eq('user_id', 'default_user')
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
        
        return NextResponse.json({ transactions: data || [] });
    } catch (error: any) {
        console.error('Error fetching transactions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch transactions', transactions: [] },
            { status: 500 }
        );
    }
}
