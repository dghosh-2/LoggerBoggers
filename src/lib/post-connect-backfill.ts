import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateAggregatedStatistics } from '@/lib/aggregated-statistics';
import { fakeGeocodeAddress } from '@/lib/fake-geocode';
import { backfillNetWorthMonthly } from '@/lib/net-worth-backfill';
import { insertPurchaseLocations } from '@/lib/purchase-locations';

export async function runPostConnectBackfillOnce(userId: string) {
  const BACKFILL_VERSION = 3;

  const { data: status, error: statusErr } = await supabaseAdmin
    .from('user_backfill_status')
    .select('backfill_version, completed_at')
    .eq('uuid_user_id', userId)
    .maybeSingle();
  if (statusErr) throw statusErr;

  if (status?.completed_at && Number(status.backfill_version) >= BACKFILL_VERSION) {
    return { ok: true, already_done: true };
  }

  // Claim/initialize the status row (idempotent).
  const { error: upErr } = await supabaseAdmin.from('user_backfill_status').upsert(
    {
      uuid_user_id: userId,
      backfill_version: BACKFILL_VERSION,
      completed_at: null,
    },
    { onConflict: 'uuid_user_id' }
  );
  if (upErr) throw upErr;

  // 1) Fill purchase_locations from transaction address strings (deterministic fake geocode).
  const { count: anyLoc, error: anyLocErr } = await supabaseAdmin
    .from('purchase_locations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (anyLocErr) throw anyLocErr;

  if ((anyLoc ?? 0) === 0) {
    const { data: txs, error: txErr } = await supabaseAdmin
      .from('financial_transactions')
      .select('date, amount, category, merchant_name, name, location, source')
      .eq('uuid_user_id', userId)
      .not('location', 'is', null)
      .order('date', { ascending: false })
      .limit(20000);
    if (txErr) throw txErr;

    const rows = (txs || [])
      .map((tx: any) => {
        const address = String(tx.location || '').trim();
        if (!address) return null;
        const geo = fakeGeocodeAddress(address);
        if (!geo) return null;
        return {
          user_id: userId,
          transaction_id: null,
          address,
          merchant_name: tx.merchant_name || tx.name || null,
          latitude: geo.lat,
          longitude: geo.lng,
          amount: Number(tx.amount || 0),
          category: tx.category || 'Other',
          date: tx.date,
          source: String(tx.source || 'generated'),
        };
      })
      .filter(Boolean) as any[];

    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const res = await insertPurchaseLocations(batch);
      if (!res.ok) throw res.error;
    }
  }

  // 2) Backfill net worth snapshots + monthly rollups (+ optional investment trades).
  const netWorth = await backfillNetWorthMonthly({
    userId,
    years: 5,
    overwrite: true,
    withInvestmentTrades: true,
  });

  // 3) Generate aggregated statistics (daily/weekly/monthly buckets).
  await generateAggregatedStatistics(userId);

  // Mark completed.
  const { error: doneErr } = await supabaseAdmin
    .from('user_backfill_status')
    .update({ completed_at: new Date().toISOString(), backfill_version: BACKFILL_VERSION })
    .eq('uuid_user_id', userId);
  if (doneErr) throw doneErr;

  return { ok: true, already_done: false, netWorth };
}
