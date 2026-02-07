import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserIdFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
    }

    const { data: accounts } = await supabaseAdmin
      .from('accounts')
      .select('id, name, type, current_balance')
      .eq('uuid_user_id', userId);

    const { data: holdings } = await supabaseAdmin
      .from('holdings')
      .select('id, symbol, name, value')
      .eq('uuid_user_id', userId);

    const assetsAccounts = (accounts || []).reduce((sum, a: any) => {
      const bal = Number(a.current_balance || 0);
      if (a.type === 'depository' || a.type === 'investment') return sum + bal;
      return sum;
    }, 0);

    const liabilities = (accounts || []).reduce((sum, a: any) => {
      const bal = Number(a.current_balance || 0);
      if (a.type === 'credit' || a.type === 'loan') return sum + bal;
      return sum;
    }, 0);

    const holdingsValue = (holdings || []).reduce((sum, h: any) => sum + Number(h.value || 0), 0);
    const totalAssets = assetsAccounts + holdingsValue;
    const netWorth = totalAssets - liabilities;

    const byType = (accounts || []).reduce((acc: any, a: any) => {
      const t = String(a.type || 'unknown');
      const bal = Number(a.current_balance || 0);
      acc[t] ??= { count: 0, sum: 0, negativeCount: 0 };
      acc[t].count += 1;
      acc[t].sum += bal;
      if (bal < 0) acc[t].negativeCount += 1;
      return acc;
    }, {});

    return NextResponse.json({
      ok: true,
      assetsAccounts,
      holdingsValue,
      totalAssets,
      liabilities,
      netWorth,
      byType,
    });
  } catch (err: any) {
    console.error('net-worth-breakdown error:', err);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}

