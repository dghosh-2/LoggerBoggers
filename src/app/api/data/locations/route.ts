import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserIdFromRequest } from '@/lib/auth';

type Timeframe = '7d' | '30d' | '90d' | '1y' | 'all' | 'month';

function timeframeToStartDate(timeframe: Timeframe): Date {
  const startDate = new Date();
  switch (timeframe) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
    case 'month':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case 'all':
      return new Date('2000-01-01');
  }
  return startDate;
}

function toDateString(d: Date): string {
  return d.toISOString().split('T')[0];
}

function isMissingTableError(err: any, tableName: string): boolean {
  const msg = String(err?.message || err?.details || err?.hint || '');
  const code = String(err?.code || '');
  return code === '42P01' || msg.toLowerCase().includes(`relation "${tableName}" does not exist`);
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ locations: [], cache_table_missing: false });

    const { searchParams } = new URL(request.url);
    const raw = (searchParams.get('timeframe') || '30d').trim();
    const timeframe: Timeframe = (['7d', '30d', '90d', '1y', 'all', 'month'] as const).includes(raw as any)
      ? (raw as Timeframe)
      : '30d';

    const startDateStr = toDateString(timeframeToStartDate(timeframe));

    const { data: locations, error } = await supabaseAdmin
      .from('purchase_locations')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDateStr)
      .order('date', { ascending: false });

    if (error) {
      const missing = isMissingTableError(error, 'purchase_locations');
      if (!missing) console.error('Error fetching purchase_locations:', error);
      if (missing) {
        // Soft error so the UI can render guidance instead of failing hard.
        return NextResponse.json({ locations: [], cache_table_missing: true }, { status: 200 });
      }
      return NextResponse.json({ locations: [], cache_table_missing: false }, { status: 500 });
    }

    const transformedLocations = (locations || []).map((loc: any) => ({
      id: loc.id,
      lat: Number(loc.latitude),
      lng: Number(loc.longitude),
      name: loc.merchant_name || loc.address,
      amount: Number(loc.amount),
      date: loc.date,
      category: loc.category || 'Other',
    }));

    return NextResponse.json({ locations: transformedLocations, cache_table_missing: false });
  } catch (error) {
    console.error('Error in locations API:', error);
    return NextResponse.json({ locations: [], cache_table_missing: false }, { status: 500 });
  }
}

