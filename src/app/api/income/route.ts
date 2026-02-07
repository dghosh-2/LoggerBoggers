import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        // Get authenticated user ID
        const userId = await getUserIdFromRequest(request);

        if (!userId) {
            return NextResponse.json({ income: [] });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('start_date');
        const limit = parseInt(searchParams.get('limit') || '500');

        let query = supabaseAdmin
            .from('income')
            .select('*')
            .eq('uuid_user_id', userId)
            .order('date', { ascending: false })
            .limit(limit);

        if (startDate) {
            query = query.gte('date', startDate);
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        return NextResponse.json({ income: data || [] });
    } catch (error: any) {
        console.error('Error fetching income:', error);
        return NextResponse.json(
            { error: 'Failed to fetch income', income: [] },
            { status: 500 }
        );
    }
}
