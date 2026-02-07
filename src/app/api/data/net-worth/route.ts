import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserIdFromRequest } from '@/lib/auth';
import { backfillNetWorthMonthly } from '@/lib/net-worth-backfill';

export const runtime = 'nodejs';

type BackfillBody = Partial<{
  years: number;
  cadence: 'monthly';
  overwrite: boolean;
  with_investment_trades: boolean;
}>;

function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(d: Date, delta: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1));
}

function monthEnd(d: Date): Date {
  // d must be month-start in UTC.
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}

function yyyyMm01(d: Date): string {
  // d must be month-start in UTC.
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ points: [] }, { status: 200 });

    const now = new Date();
    const start = new Date(now);
    start.setFullYear(start.getFullYear() - 1);
    const startStr = start.toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
      .from('net_worth_snapshots')
      .select('as_of_date, net_worth')
      .eq('uuid_user_id', userId)
      .gte('as_of_date', startStr)
      .order('as_of_date', { ascending: true });

    if (error) {
      console.error('net-worth api error:', error);
      return NextResponse.json({ points: [] }, { status: 200 });
    }

    return NextResponse.json({
      points: (data || []).map((r: any) => ({
        date: r.as_of_date,
        netWorth: Number(r.net_worth || 0),
      })),
    });
  } catch (err: any) {
    console.error('net-worth api error:', err);
    return NextResponse.json({ points: [] }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as BackfillBody;
    const years = Math.max(1, Math.min(10, Number(body.years ?? 5)));
    const cadence = (body.cadence ?? 'monthly') as BackfillBody['cadence'];
    const overwrite = body.overwrite === true;
    const withInvestmentTrades = body.with_investment_trades !== false;

    if (cadence !== 'monthly') {
      return NextResponse.json({ ok: false, error: 'unsupported_cadence' }, { status: 400 });
    }
    const result = await backfillNetWorthMonthly({
      userId,
      years,
      overwrite,
      withInvestmentTrades,
    });

    return NextResponse.json({
      ok: true,
      years: result.years,
      cadence,
      range: result.range,
      anchor: result.anchor,
      investment_trades: result.investment_trades,
      note:
        'Backfill uses cashflow (income - spending) to estimate historical assets_accounts; holdings/liabilities are assumed constant due to lack of true balance history.',
    });
  } catch (err: any) {
    console.error('net-worth backfill error:', err);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
