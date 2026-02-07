import { supabaseAdmin } from './supabase-admin';

interface AggregatedStatistic {
    uuid_user_id: string;
    period_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    period_key: string;
    period_start: string;
    period_end: string;
    total_spending: number;
    spending_by_category: Record<string, number>;
    transaction_count: number;
    average_transaction: number;
    largest_transaction: number;
    total_income: number;
    income_count: number;
    net_savings: number;
    savings_rate: number;
    total_assets: number;
    total_liabilities: number;
    net_worth: number;
    holdings_value: number;
}

// Format date as YYYY-MM-DD
function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

// Get ISO week number
function getWeekNumber(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

// Get week start (Monday) and end (Sunday) dates
function getWeekBounds(date: Date): { start: Date; end: Date } {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const start = new Date(d.setDate(diff));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
}

// Calculate statistics for a given period
async function calculatePeriodStats(
    userId: string,
    periodStart: string,
    periodEnd: string
): Promise<{
    spending: number;
    spendingByCategory: Record<string, number>;
    transactionCount: number;
    avgTransaction: number;
    largestTransaction: number;
    income: number;
    incomeCount: number;
}> {
    // Get transactions for period
    const { data: transactions } = await supabaseAdmin
        .from('transactions')
        .select('amount, category')
        .eq('uuid_user_id', userId)
        .gte('date', periodStart)
        .lte('date', periodEnd);

    // Get income for period
    const { data: incomeData } = await supabaseAdmin
        .from('income')
        .select('amount')
        .eq('uuid_user_id', userId)
        .gte('date', periodStart)
        .lte('date', periodEnd);

    const txList = transactions || [];
    const incList = incomeData || [];

    const spending = txList.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const spendingByCategory: Record<string, number> = {};
    txList.forEach(tx => {
        spendingByCategory[tx.category] = (spendingByCategory[tx.category] || 0) + Number(tx.amount);
    });

    const amounts = txList.map(tx => Number(tx.amount));
    const largestTransaction = amounts.length > 0 ? Math.max(...amounts) : 0;
    const avgTransaction = amounts.length > 0 ? spending / amounts.length : 0;

    const income = incList.reduce((sum, inc) => sum + Number(inc.amount), 0);

    return {
        spending: Math.round(spending * 100) / 100,
        spendingByCategory,
        transactionCount: txList.length,
        avgTransaction: Math.round(avgTransaction * 100) / 100,
        largestTransaction: Math.round(largestTransaction * 100) / 100,
        income: Math.round(income * 100) / 100,
        incomeCount: incList.length,
    };
}

// Get account balances for net worth calculation
async function getAccountBalances(userId: string): Promise<{
    totalAssets: number;
    totalLiabilities: number;
    holdingsValue: number;
    netWorth: number;
}> {
    const { data: accounts } = await supabaseAdmin
        .from('accounts')
        .select('current_balance, type')
        .eq('uuid_user_id', userId);

    const { data: holdings } = await supabaseAdmin
        .from('holdings')
        .select('value')
        .eq('uuid_user_id', userId);

    let totalAssets = 0;
    let totalLiabilities = 0;

    (accounts || []).forEach(account => {
        const balance = Number(account.current_balance) || 0;
        if (account.type === 'depository' || account.type === 'investment') {
            totalAssets += balance;
        } else if (account.type === 'credit' || account.type === 'loan') {
            totalLiabilities += balance;
        }
    });

    const holdingsValue = (holdings || []).reduce((sum, h) => sum + Number(h.value || 0), 0);
    totalAssets += holdingsValue;

    return {
        totalAssets: Math.round(totalAssets * 100) / 100,
        totalLiabilities: Math.round(totalLiabilities * 100) / 100,
        holdingsValue: Math.round(holdingsValue * 100) / 100,
        netWorth: Math.round((totalAssets - totalLiabilities) * 100) / 100,
    };
}

// Generate all aggregated statistics for a user
export async function generateAggregatedStatistics(userId: string): Promise<void> {
    console.log('=== GENERATING AGGREGATED STATISTICS ===');
    console.log('User ID:', userId);

    const now = new Date();
    const stats: Partial<AggregatedStatistic>[] = [];

    // Get account balances (same for all periods as it's current snapshot)
    const balances = await getAccountBalances(userId);

    // Generate daily stats for last 30 days
    for (let i = 0; i < 30; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = formatDate(date);

        const periodStats = await calculatePeriodStats(userId, dateStr, dateStr);
        const netSavings = periodStats.income - periodStats.spending;
        const savingsRate = periodStats.income > 0 ? (netSavings / periodStats.income) * 100 : 0;

        stats.push({
            uuid_user_id: userId,
            period_type: 'daily',
            period_key: dateStr,
            period_start: dateStr,
            period_end: dateStr,
            total_spending: periodStats.spending,
            spending_by_category: periodStats.spendingByCategory,
            transaction_count: periodStats.transactionCount,
            average_transaction: periodStats.avgTransaction,
            largest_transaction: periodStats.largestTransaction,
            total_income: periodStats.income,
            income_count: periodStats.incomeCount,
            net_savings: Math.round(netSavings * 100) / 100,
            savings_rate: Math.round(savingsRate * 100) / 100,
            ...balances,
        });
    }

    // Generate weekly stats for last 12 weeks
    for (let i = 0; i < 12; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - (i * 7));
        const { start, end } = getWeekBounds(date);
        const weekKey = getWeekNumber(date);

        const periodStats = await calculatePeriodStats(userId, formatDate(start), formatDate(end));
        const netSavings = periodStats.income - periodStats.spending;
        const savingsRate = periodStats.income > 0 ? (netSavings / periodStats.income) * 100 : 0;

        stats.push({
            uuid_user_id: userId,
            period_type: 'weekly',
            period_key: weekKey,
            period_start: formatDate(start),
            period_end: formatDate(end),
            total_spending: periodStats.spending,
            spending_by_category: periodStats.spendingByCategory,
            transaction_count: periodStats.transactionCount,
            average_transaction: periodStats.avgTransaction,
            largest_transaction: periodStats.largestTransaction,
            total_income: periodStats.income,
            income_count: periodStats.incomeCount,
            net_savings: Math.round(netSavings * 100) / 100,
            savings_rate: Math.round(savingsRate * 100) / 100,
            ...balances,
        });
    }

    // Generate monthly stats for last 24 months
    for (let i = 0; i < 24; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = formatDate(date);
        const monthEnd = formatDate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

        const periodStats = await calculatePeriodStats(userId, monthStart, monthEnd);
        const netSavings = periodStats.income - periodStats.spending;
        const savingsRate = periodStats.income > 0 ? (netSavings / periodStats.income) * 100 : 0;

        stats.push({
            uuid_user_id: userId,
            period_type: 'monthly',
            period_key: monthKey,
            period_start: monthStart,
            period_end: monthEnd,
            total_spending: periodStats.spending,
            spending_by_category: periodStats.spendingByCategory,
            transaction_count: periodStats.transactionCount,
            average_transaction: periodStats.avgTransaction,
            largest_transaction: periodStats.largestTransaction,
            total_income: periodStats.income,
            income_count: periodStats.incomeCount,
            net_savings: Math.round(netSavings * 100) / 100,
            savings_rate: Math.round(savingsRate * 100) / 100,
            ...balances,
        });
    }

    // Generate yearly stats for last 5 years
    for (let i = 0; i < 5; i++) {
        const year = now.getFullYear() - i;
        const yearStart = `${year}-01-01`;
        const yearEnd = `${year}-12-31`;

        const periodStats = await calculatePeriodStats(userId, yearStart, yearEnd);
        const netSavings = periodStats.income - periodStats.spending;
        const savingsRate = periodStats.income > 0 ? (netSavings / periodStats.income) * 100 : 0;

        stats.push({
            uuid_user_id: userId,
            period_type: 'yearly',
            period_key: year.toString(),
            period_start: yearStart,
            period_end: yearEnd,
            total_spending: periodStats.spending,
            spending_by_category: periodStats.spendingByCategory,
            transaction_count: periodStats.transactionCount,
            average_transaction: periodStats.avgTransaction,
            largest_transaction: periodStats.largestTransaction,
            total_income: periodStats.income,
            income_count: periodStats.incomeCount,
            net_savings: Math.round(netSavings * 100) / 100,
            savings_rate: Math.round(savingsRate * 100) / 100,
            ...balances,
        });
    }

    // Clear existing stats for this user and insert new ones
    // Note: aggregated_statistics table may not exist in all environments
    try {
        await supabaseAdmin.from('aggregated_statistics').delete().eq('uuid_user_id', userId);

        // Insert in batches
        const BATCH_SIZE = 50;
        let inserted = 0;
        for (let i = 0; i < stats.length; i += BATCH_SIZE) {
            const batch = stats.slice(i, i + BATCH_SIZE);
            const { error } = await supabaseAdmin.from('aggregated_statistics').insert(batch);
            if (error) {
                // Table might not exist - this is okay, stats are computed on-demand anyway
                if (error.message?.includes('does not exist') || error.code === 'PGRST205') {
                    console.log('aggregated_statistics table not found - skipping (stats computed on-demand)');
                    return;
                }
                console.error('Error inserting aggregated stats batch:', error);
            } else {
                inserted += batch.length;
            }
        }

        console.log(`Successfully generated ${inserted} aggregated statistics records`);
        console.log(`- Daily: 30 records`);
        console.log(`- Weekly: 12 records`);
        console.log(`- Monthly: 24 records`);
        console.log(`- Yearly: 5 records`);
    } catch (err) {
        console.log('Could not generate aggregated statistics (table may not exist):', err);
    }
}

// Get aggregated statistics for a user
export async function getAggregatedStatistics(
    userId: string,
    periodType?: 'daily' | 'weekly' | 'monthly' | 'yearly',
    limit?: number
): Promise<AggregatedStatistic[]> {
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
        return [];
    }

    return data || [];
}
