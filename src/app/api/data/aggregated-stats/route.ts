import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const userId = await getUserIdFromRequest(request);
        
        if (!userId) {
            return NextResponse.json({ 
                statistics: [],
                message: 'Authentication required' 
            });
        }

        // Get query parameters
        const { searchParams } = new URL(request.url);
        const periodType = searchParams.get('period_type') as 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

        // Build query
        let query = supabaseAdmin
            .from('aggregated_statistics')
            .select('*')
            .eq('uuid_user_id', userId)
            .order('period_start', { ascending: false });

        if (periodType) {
            query = query.eq('period_type', periodType);
        }

        if (limit) {
            query = query.limit(limit);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching aggregated statistics:', error);
            return NextResponse.json({ 
                statistics: [],
                error: 'Failed to fetch statistics' 
            });
        }

        // Also get current period summary for quick access
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        const currentMonthStats = (data || []).find(
            s => s.period_type === 'monthly' && s.period_key === currentMonth
        );

        return NextResponse.json({
            statistics: data || [],
            current_month: currentMonthStats || null,
            summary: {
                total_records: (data || []).length,
                period_types: [...new Set((data || []).map(s => s.period_type))],
            }
        });

    } catch (error: any) {
        console.error('Error in aggregated stats API:', error);
        return NextResponse.json(
            { statistics: [], error: 'Internal server error' },
            { status: 500 }
        );
    }
}
