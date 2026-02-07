import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateFiveYearsOfIncome, generateFiveYearsOfTransactions, generateHoldings } from '@/lib/fake-transaction-generator';
import { fakeGeocodeAddress } from '@/lib/fake-geocode';
import { insertPurchaseLocations } from '@/lib/purchase-locations';

function monthStartUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonthsUTC(d: Date, delta: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1));
}

function monthEndUTC(monthStart: Date): Date {
  return new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
}

function yyyyMm01UTC(monthStart: Date): string {
  const y = monthStart.getUTCFullYear();
  const m = String(monthStart.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function seedDemoDataForUser(userId: string) {
  // Opt-out for production if desired.
  if (process.env.SEED_FAKE_DATA_ON_SIGNUP === 'false') return;

  // Avoid duplicate seeds.
  const [
    { count: anyTx, error: anyTxErr },
    { count: anyLoc, error: anyLocErr },
    { count: anyAccounts, error: anyAccountsErr },
    { count: anyHoldings, error: anyHoldingsErr },
    { count: anyNw, error: anyNwErr },
  ] = await Promise.all([
    supabaseAdmin.from('financial_transactions').select('id', { count: 'exact', head: true }).eq('uuid_user_id', userId),
    supabaseAdmin.from('purchase_locations').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabaseAdmin.from('accounts').select('id', { count: 'exact', head: true }).eq('uuid_user_id', userId),
    supabaseAdmin.from('holdings').select('id', { count: 'exact', head: true }).eq('uuid_user_id', userId),
    supabaseAdmin.from('net_worth_snapshots').select('id', { count: 'exact', head: true }).eq('uuid_user_id', userId),
  ]);
  if (anyTxErr) throw anyTxErr;
  if (anyLocErr) throw anyLocErr;
  if (anyAccountsErr) throw anyAccountsErr;
  if (anyHoldingsErr) throw anyHoldingsErr;
  if (anyNwErr) throw anyNwErr;

  const hasTx = (anyTx ?? 0) > 0;
  const hasLoc = (anyLoc ?? 0) > 0;
  const hasAccounts = (anyAccounts ?? 0) > 0;
  const hasHoldings = (anyHoldings ?? 0) > 0;
  const hasNetWorth = (anyNw ?? 0) > 0;

  const fakeTransactions = hasTx ? [] : generateFiveYearsOfTransactions();
  const fakeIncome = hasTx ? [] : generateFiveYearsOfIncome();

  const BATCH_SIZE = 500;

  if (!hasTx) {
    const transformedTransactions = fakeTransactions.map((tx) => ({
      user_id: userId,
      uuid_user_id: userId,
      merchant_name: tx.merchant_name || tx.name,
      name: tx.name || tx.merchant_name,
      amount: tx.amount,
      date: tx.date,
      category: tx.category || 'Other',
      source: 'generated',
      location: tx.location || null,
      pending: false,
      tip: tx.tip || null,
      tax: tx.tax || null,
    }));

    for (let i = 0; i < transformedTransactions.length; i += BATCH_SIZE) {
      const batch = transformedTransactions.slice(i, i + BATCH_SIZE);
      const { error } = await supabaseAdmin.from('financial_transactions').insert(batch);
      if (error) throw error;
    }

    for (let i = 0; i < fakeIncome.length; i += BATCH_SIZE) {
      const batch = fakeIncome.slice(i, i + BATCH_SIZE).map((inc) => ({
        user_id: userId,
        uuid_user_id: userId,
        amount: inc.amount,
        source: inc.source || 'Salary',
        name: inc.name || inc.source || 'Salary',
        date: inc.date,
        recurring: inc.recurring ?? true,
        frequency: inc.frequency || 'monthly',
        location: inc.location || null,
      }));
      const { error } = await supabaseAdmin.from('income').insert(batch);
      if (error) throw error;
    }
  }

  // Seed accounts + holdings so summary net worth (assets - liabilities) is positive for demo users.
  // The dashboard's net worth calculation uses accounts + holdings; transactions alone won't move it.
  if (!hasAccounts) {
    const demoAccounts = [
      {
        plaid_account_id: `demo_checking_${userId}`,
        name: 'Demo Checking',
        official_name: 'Demo Checking Account',
        type: 'depository',
        subtype: 'checking',
        current_balance: 15000,
        available_balance: 15000,
        mask: '1234',
        location: '600 Grant St, Pittsburgh, PA 15219',
      },
      {
        plaid_account_id: `demo_savings_${userId}`,
        name: 'Demo Savings',
        official_name: 'Demo Savings Account',
        type: 'depository',
        subtype: 'savings',
        current_balance: 40000,
        available_balance: 40000,
        mask: '5678',
        location: '525 William Penn Pl, Pittsburgh, PA 15219',
      },
      {
        plaid_account_id: `demo_brokerage_${userId}`,
        name: 'Demo Brokerage',
        official_name: 'Demo Investment Account',
        type: 'investment',
        subtype: 'brokerage',
        current_balance: 25000,
        available_balance: null,
        mask: '2468',
        location: '1 PPG Pl, Pittsburgh, PA 15222',
      },
      {
        plaid_account_id: `demo_credit_${userId}`,
        name: 'Demo Credit Card',
        official_name: 'Demo Rewards Card',
        type: 'credit',
        subtype: 'credit card',
        current_balance: 1500, // liability
        available_balance: null,
        credit_limit: 12000,
        mask: '9012',
        location: '420 Fort Duquesne Blvd, Pittsburgh, PA 15222',
      },
      {
        plaid_account_id: `demo_loan_${userId}`,
        name: 'Demo Auto Loan',
        official_name: 'Demo Auto Loan',
        type: 'loan',
        subtype: 'auto',
        current_balance: 6500, // liability (kept modest so net worth stays positive)
        available_balance: null,
        credit_limit: null,
        mask: '3141',
        location: '525 William Penn Pl, Pittsburgh, PA 15219',
      },
    ];

    for (const acct of demoAccounts) {
      const { error } = await supabaseAdmin.from('accounts').upsert(
        {
          user_id: userId,
          uuid_user_id: userId,
          plaid_account_id: acct.plaid_account_id,
          plaid_item_id: 'demo_seed',
          name: acct.name,
          official_name: acct.official_name,
          type: acct.type,
          subtype: acct.subtype,
          institution_name: 'Demo Bank',
          current_balance: acct.current_balance,
          available_balance: acct.available_balance,
          credit_limit: acct.credit_limit ?? null,
          mask: acct.mask,
          iso_currency_code: 'USD',
          location: acct.location,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: 'plaid_account_id' }
      );
      if (error) throw error;
    }
  }

  if (!hasHoldings) {
    const demoHoldings = generateHoldings();
    const holdingsWithUser = demoHoldings.map((h) => ({
      user_id: userId,
      uuid_user_id: userId,
      plaid_security_id: `sec_${h.symbol.toLowerCase()}_${Date.now()}`,
      symbol: h.symbol,
      name: h.name,
      quantity: h.quantity,
      price: h.price,
      value: h.value,
      cost_basis: h.cost_basis,
      gain_loss: h.gain_loss,
      gain_loss_percent: h.gain_loss_percent,
      location: h.location,
      last_updated_at: new Date().toISOString(),
    }));

    if (holdingsWithUser.length > 0) {
      const { error } = await supabaseAdmin.from('holdings').insert(holdingsWithUser);
      if (error) throw error;
    }
  }

  if (!hasNetWorth) {
    // Build a monthly net worth series using cashflow deltas, anchored to current balances.
    const [{ data: accountsNow, error: accountsErr }, { data: holdingsNow, error: holdingsErr }] = await Promise.all([
      supabaseAdmin.from('accounts').select('type, current_balance').eq('uuid_user_id', userId),
      supabaseAdmin.from('holdings').select('value').eq('uuid_user_id', userId),
    ]);
    if (accountsErr) throw accountsErr;
    if (holdingsErr) throw holdingsErr;

    const assetsAccountsNow = (accountsNow || []).reduce((sum, a: any) => {
      const bal = Number(a.current_balance || 0);
      if (a.type === 'depository' || a.type === 'investment') return sum + bal;
      return sum;
    }, 0);
    const liabilitiesNow = (accountsNow || []).reduce((sum, a: any) => {
      const bal = Number(a.current_balance || 0);
      if (a.type === 'credit' || a.type === 'loan') return sum + bal;
      return sum;
    }, 0);
    const holdingsValueNow = (holdingsNow || []).reduce((sum, h: any) => sum + Number(h.value || 0), 0);

    // Get monthly spending/income from the seeded data.
    const txsForNw = hasTx
      ? (await supabaseAdmin
          .from('financial_transactions')
          .select('amount, date')
          .eq('uuid_user_id', userId)
          .order('date', { ascending: true })
          .limit(20000)).data || []
      : fakeTransactions;

    const incsForNw = hasTx
      ? (await supabaseAdmin
          .from('income')
          .select('amount, date')
          .eq('uuid_user_id', userId)
          .order('date', { ascending: true })
          .limit(20000)).data || []
      : fakeIncome;

    const spendingByMonth = new Map<string, number>();
    for (const tx of txsForNw as any[]) {
      const d = new Date(String(tx.date));
      const k = yyyyMm01UTC(monthStartUTC(d));
      spendingByMonth.set(k, (spendingByMonth.get(k) ?? 0) + Number(tx.amount || 0));
    }
    const incomeByMonth = new Map<string, number>();
    for (const inc of incsForNw as any[]) {
      const d = new Date(String(inc.date));
      const k = yyyyMm01UTC(monthStartUTC(d));
      incomeByMonth.set(k, (incomeByMonth.get(k) ?? 0) + Number(inc.amount || 0));
    }

    // Determine range (ISO dates compare lexicographically).
    let minDateStr: string | null = null;
    for (const tx of txsForNw as any[]) {
      const d = typeof tx?.date === 'string' ? tx.date : null;
      if (!d) continue;
      if (!minDateStr || d < minDateStr) minDateStr = d;
    }
    for (const inc of incsForNw as any[]) {
      const d = typeof inc?.date === 'string' ? inc.date : null;
      if (!d) continue;
      if (!minDateStr || d < minDateStr) minDateStr = d;
    }
    const minDate = minDateStr ? monthStartUTC(new Date(minDateStr)) : monthStartUTC(new Date());
    const endMonth = monthStartUTC(new Date());

    const months: Date[] = [];
    for (let m = endMonth; m >= minDate; m = addMonthsUTC(m, -1)) {
      months.push(m);
      if (m.getTime() === minDate.getTime()) break;
    }

    let assetsAccountsEnd = Number(assetsAccountsNow);
    const rowsSnapshots: any[] = [];
    const rowsMonthly: any[] = [];
    for (const m of months) {
      const key = yyyyMm01UTC(m);
      const spend = spendingByMonth.get(key) ?? 0;
      const inc = incomeByMonth.get(key) ?? 0;
      const netSavings = inc - spend;

      const asOf = monthEndUTC(m);
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
        month: key,
        as_of_date: toDateString(asOf),
        assets_accounts: assetsAccounts,
        holdings_value: holdingsValue,
        total_assets: totalAssets,
        liabilities,
        net_worth: netWorth,
      });

      assetsAccountsEnd = assetsAccountsEnd - netSavings;
    }

    for (let i = 0; i < rowsSnapshots.length; i += BATCH_SIZE) {
      const batch = rowsSnapshots.slice(i, i + BATCH_SIZE);
      const { error } = await supabaseAdmin.from('net_worth_snapshots').upsert(batch, {
        onConflict: 'uuid_user_id,as_of_date',
      });
      if (error) throw error;
    }

    for (let i = 0; i < rowsMonthly.length; i += BATCH_SIZE) {
      const batch = rowsMonthly.slice(i, i + BATCH_SIZE);
      const { error } = await supabaseAdmin.from('net_worth').upsert(batch, {
        onConflict: 'uuid_user_id,month',
      });
      if (error) throw error;
    }
  }

  if (!hasLoc) {
    const txsForLocations = hasTx
      ? (async () => {
          const { data, error } = await supabaseAdmin
            .from('financial_transactions')
            .select('date, amount, category, merchant_name, name, location, source')
            .eq('uuid_user_id', userId)
            .not('location', 'is', null)
            .order('date', { ascending: false })
            .limit(20000);
          if (error) throw error;
          return (data || []).map((row: any) => ({
            date: row.date,
            amount: Number(row.amount),
            category: row.category,
            merchant_name: row.merchant_name || row.name,
            location: row.location,
            source: row.source,
          }));
        })()
      : Promise.resolve(fakeTransactions);

    const sourceTxs: any[] = await txsForLocations;

    const locations = sourceTxs
      .map((tx) => {
        const address = String(tx.location || '').trim();
        if (!address) return null;
        const geo = fakeGeocodeAddress(address);
        if (!geo) return null;
      return {
        user_id: userId,
        financial_transaction_id: null,
        address,
        merchant_name: tx.merchant_name || tx.name || null,
        latitude: geo.lat,
        longitude: geo.lng,
          amount: Number(tx.amount),
          category: tx.category || 'Other',
          date: tx.date,
          source: String(tx.source || 'generated'),
        };
      })
      .filter(Boolean) as any[];

    for (let i = 0; i < locations.length; i += BATCH_SIZE) {
      const batch = locations.slice(i, i + BATCH_SIZE);
      const res = await insertPurchaseLocations(batch);
      if (!res.ok) throw res.error;
    }
  }
}
