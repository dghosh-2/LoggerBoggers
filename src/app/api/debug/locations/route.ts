import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
    }

    const [{ count: txWithLocCount, error: txErr }, { count: locCount, error: locErr }] = await Promise.all([
      supabaseAdmin
        .from('financial_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('uuid_user_id', userId)
        .not('location', 'is', null),
      supabaseAdmin
        .from('purchase_locations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
    ]);

    return NextResponse.json({
      ok: true,
      user_id: userId,
      financial_transactions_with_location: txWithLocCount ?? 0,
      purchase_locations_rows: locCount ?? 0,
      errors: {
        financial_transactions: txErr ? { message: txErr.message, code: (txErr as any).code } : null,
        purchase_locations: locErr ? { message: locErr.message, code: (locErr as any).code } : null,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e ?? 'Unknown error') }, { status: 500 });
  }
}

