import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';

export type NetWorthBackfillOptions = {
  userId: string;
  years?: number;
  overwrite?: boolean;
  withInvestmentTrades?: boolean;
};

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
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function backfillNetWorthMonthly(opts: NetWorthBackfillOptions) {
  const userId = opts.userId;
  const years = Math.max(1, Math.min(10, Number(opts.years ?? 5)));
  const overwrite = opts.overwrite === true;
  const withInvestmentTrades = opts.withInvestmentTrades !== false;

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('age')
    .eq('uuid_user_id', userId)
    .maybeSingle();
  const age = typeof (profile as any)?.age === 'number' ? Number((profile as any).age) : null;

  const [{ data: accounts, error: accountsError }, { data: holdings, error: holdingsError }] = await Promise.all([
    supabaseAdmin.from('accounts').select('type, current_balance').eq('uuid_user_id', userId),
    supabaseAdmin.from('holdings').select('symbol, name, quantity, price, value, cost_basis').eq('uuid_user_id', userId),
  ]);
  if (accountsError) throw accountsError;
  if (holdingsError) throw holdingsError;

  const assetsAccountsNow = (accounts || []).reduce((sum, a: any) => {
    const bal = Number(a.current_balance || 0);
    if (a.type === 'depository' || a.type === 'investment') return sum + bal;
    return sum;
  }, 0);
  const liabilitiesNow = (accounts || []).reduce((sum, a: any) => {
    const bal = Number(a.current_balance || 0);
    if (a.type === 'credit' || a.type === 'loan') return sum + bal;
    return sum;
  }, 0);
  const holdingsValueNow = (holdings || []).reduce((sum, h: any) => sum + Number(h.value || 0), 0);
  const currentNetWorthNow = (assetsAccountsNow + holdingsValueNow) - liabilitiesNow;

  const now = new Date();
  const startMonth = addMonths(monthStart(now), -12 * years);
  const endMonth = monthStart(now);

  const startDateStr = toDateString(startMonth);
  const endDateStr = toDateString(monthEnd(endMonth));

  const [{ data: txs, error: txError }, { data: incs, error: incError }] = await Promise.all([
    supabaseAdmin
      .from('financial_transactions')
      .select('amount, date')
      .eq('uuid_user_id', userId)
      .gte('date', startDateStr)
      .lte('date', endDateStr),
    supabaseAdmin
      .from('income')
      .select('amount, date')
      .eq('uuid_user_id', userId)
      .gte('date', startDateStr)
      .lte('date', endDateStr),
  ]);
  if (txError) throw txError;
  if (incError) throw incError;

  const spendingByMonth = new Map<string, number>();
  for (const tx of txs || []) {
    const d = new Date(String((tx as any).date));
    const k = yyyyMm01(monthStart(d));
    spendingByMonth.set(k, (spendingByMonth.get(k) ?? 0) + Number((tx as any).amount || 0));
  }
  const incomeByMonth = new Map<string, number>();
  for (const inc of incs || []) {
    const d = new Date(String((inc as any).date));
    const k = yyyyMm01(monthStart(d));
    incomeByMonth.set(k, (incomeByMonth.get(k) ?? 0) + Number((inc as any).amount || 0));
  }

  if (overwrite) {
    await supabaseAdmin
      .from('net_worth_snapshots')
      .delete()
      .eq('uuid_user_id', userId)
      .gte('as_of_date', startDateStr)
      .lte('as_of_date', endDateStr);
    await supabaseAdmin
      .from('net_worth')
      .delete()
      .eq('uuid_user_id', userId)
      .gte('month', startDateStr)
      .lte('month', toDateString(endMonth));
  }

  const months: Date[] = [];
  for (let m = endMonth; m >= startMonth; m = addMonths(m, -1)) {
    months.push(m);
    if (m.getTime() === startMonth.getTime()) break;
  }

  let assetsAccountsEnd = Number(assetsAccountsNow);
  const rowsSnapshots: any[] = [];
  const rowsMonthly: any[] = [];

  for (const m of months) {
    const monthKey = yyyyMm01(m);
    const spend = spendingByMonth.get(monthKey) ?? 0;
    const inc = incomeByMonth.get(monthKey) ?? 0;
    const netSavings = inc - spend;

    const asOf = monthEnd(m);
    const assetsAccounts = Math.max(0, Math.round(assetsAccountsEnd * 100) / 100);
    const holdingsValue = Math.round(holdingsValueNow * 100) / 100;
    const liabilities = Math.round(liabilitiesNow * 100) / 100;
    const totalAssets = Math.round((assetsAccounts + holdingsValue) * 100) / 100;
    const netWorth = Math.round((totalAssets - liabilities) * 100) / 100;

    rowsSnapshots.push({
      uuid_user_id: userId,
      as_of_date: toDateString(asOf),
      assets_accounts: assetsAccounts,
      holdings_value: holdingsValue,
      total_assets: totalAssets,
      liabilities,
      net_worth: netWorth,
    });
    rowsMonthly.push({
      uuid_user_id: userId,
      month: monthKey,
      as_of_date: toDateString(asOf),
      assets_accounts: assetsAccounts,
      holdings_value: holdingsValue,
      total_assets: totalAssets,
      liabilities,
      net_worth: netWorth,
    });

    assetsAccountsEnd = assetsAccountsEnd - netSavings;
  }

  // Age-based adjustment with a baseline of "started tracking at age 21".
  // For older users, history a few years back should already show meaningful net worth.
  //
  // Model: for each month in the backfill window, target historical net worth is a fraction of today's net worth
  // based on age at that time: frac = ((ageAt - 21) / (ageNow - 21))^p, clamped to [0,1].
  // We only ever "lift" (add) to avoid overwriting real negative situations.
  if (
    age !== null &&
    Number.isFinite(age) &&
    age > 21 &&
    Number.isFinite(currentNetWorthNow) &&
    currentNetWorthNow > 0 &&
    rowsMonthly.length >= 2
  ) {
    const denom = age - 21;
    const p = 1.25;

    const applyDelta = (row: any, delta: number) => {
      const assetsAccounts = Math.round((Number(row.assets_accounts || 0) + delta) * 100) / 100;
      const holdingsValue = Number(row.holdings_value || 0);
      const liabilities = Number(row.liabilities || 0);
      const totalAssets = Math.round((assetsAccounts + holdingsValue) * 100) / 100;
      const netWorth = Math.round((totalAssets - liabilities) * 100) / 100;
      row.assets_accounts = assetsAccounts;
      row.total_assets = totalAssets;
      row.net_worth = netWorth;
    };

    for (let idx = 0; idx < rowsMonthly.length; idx++) {
      const monthsBack = idx; // rows are newest -> oldest
      const ageAt = age - monthsBack / 12;
      const fracRaw = (ageAt - 21) / denom;
      const frac = Math.max(0, Math.min(1, fracRaw));
      const target = Math.round(Number(currentNetWorthNow) * Math.pow(frac, p) * 100) / 100;
      const current = Number(rowsMonthly[idx]?.net_worth || 0);
      const delta = Math.max(0, Math.round((target - current) * 100) / 100);
      if (delta <= 0) continue;
      applyDelta(rowsMonthly[idx], delta);
      applyDelta(rowsSnapshots[idx], delta);
    }
  }

  const BATCH = 500;
  for (let i = 0; i < rowsSnapshots.length; i += BATCH) {
    const batch = rowsSnapshots.slice(i, i + BATCH);
    const { error } = await supabaseAdmin.from('net_worth_snapshots').upsert(batch, {
      onConflict: 'uuid_user_id,as_of_date',
    });
    if (error) throw error;
  }
  for (let i = 0; i < rowsMonthly.length; i += BATCH) {
    const batch = rowsMonthly.slice(i, i + BATCH);
    const { error } = await supabaseAdmin.from('net_worth').upsert(batch, {
      onConflict: 'uuid_user_id,month',
    });
    if (error) throw error;
  }

  let insertedInvestmentTrades = 0;
  if (withInvestmentTrades) {
    const { count: existingTrades } = await supabaseAdmin
      .from('investment_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('uuid_user_id', userId)
      .gte('trade_date', startDateStr)
      .lte('trade_date', endDateStr);

    if ((existingTrades ?? 0) === 0 && (holdings || []).length > 0) {
      const randInt = (min: number, max: number) => Math.floor(min + Math.random() * (max - min + 1));
      const pickDateBetween = (start: Date, end: Date) => {
        const t = start.getTime() + Math.random() * (end.getTime() - start.getTime());
        return new Date(t);
      };

      const trades: any[] = [];
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);

      for (const h of holdings as any[]) {
        const symbol = String(h.symbol || '').trim();
        const name = String(h.name || '').trim() || null;
        const qty = Number(h.quantity || 0);
        if (!symbol || !Number.isFinite(qty) || qty <= 0) continue;

        const lots = Math.max(1, Math.min(8, randInt(2, 6), Math.floor(qty)));
        const avgCost =
          Number(h.cost_basis || 0) > 0
            ? Number(h.cost_basis) / qty
            : Number(h.price || 0) * (0.75 + Math.random() * 0.2);
        const currentPrice = Number(h.price || 0);

        const weights = Array.from({ length: lots }, () => 0.2 + Math.random());
        const wSum = weights.reduce((a, b) => a + b, 0);
        const rawQtys = weights.map((w) => Math.max(1, Math.round((qty * w) / wSum)));
        let sumQty = rawQtys.reduce((a, b) => a + b, 0);
        while (sumQty > qty) {
          const i = randInt(0, rawQtys.length - 1);
          if (rawQtys[i] > 1) {
            rawQtys[i] -= 1;
            sumQty -= 1;
          }
        }
        while (sumQty < qty) {
          rawQtys[randInt(0, rawQtys.length - 1)] += 1;
          sumQty += 1;
        }

        const lotDates = rawQtys.map(() => pickDateBetween(start, end)).sort((a, b) => a.getTime() - b.getTime());

        for (let i = 0; i < rawQtys.length; i++) {
          const lotQty = rawQtys[i];
          const tDate = lotDates[i];
          const progress = rawQtys.length <= 1 ? 1 : i / (rawQtys.length - 1);
          const drift = 0.85 + 0.25 * progress;
          const noise = 0.92 + Math.random() * 0.16;
          const base = avgCost * drift * noise;
          const price = Math.max(1, Math.round(Math.min(currentPrice || base, base) * 100) / 100);
          const total = Math.round(lotQty * price * 100) / 100;

          trades.push({
            uuid_user_id: userId,
            account_id: null,
            trade_date: toDateString(tDate),
            symbol,
            security_name: name,
            side: 'buy',
            quantity: lotQty,
            price,
            total,
            source: 'generated',
          });
        }
      }

      for (let i = 0; i < trades.length; i += 500) {
        const batch = trades.slice(i, i + 500);
        const { error } = await supabaseAdmin.from('investment_transactions').insert(batch);
        if (error) throw error;
        insertedInvestmentTrades += batch.length;
      }
    }
  }

  return {
    years,
    range: { start: startDateStr, end: endDateStr },
    anchor: {
      assets_accounts_now: Math.round(assetsAccountsNow * 100) / 100,
      liabilities_now: Math.round(liabilitiesNow * 100) / 100,
      holdings_value_now: Math.round(holdingsValueNow * 100) / 100,
    },
    investment_trades: { inserted: insertedInvestmentTrades, enabled: withInvestmentTrades },
  };
}
