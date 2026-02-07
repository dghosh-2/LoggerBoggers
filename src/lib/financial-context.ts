import { supabaseAdmin } from "@/lib/supabase-admin";

interface TransactionData {
    amount: number;
    category: string;
    name: string;
    date: string;
    merchant_name?: string;
}

interface IncomeData {
    amount: number;
    source: string;
    name: string;
    date: string;
}

/**
 * Fetch financial data from Supabase for a specific user
 */
async function fetchSupabaseData(userId?: string) {
    const result = {
        transactions: [] as TransactionData[],
        income: [] as IncomeData[],
        isConnected: false,
        totalBalance: 0,
    };

    if (!userId) {
        return result;
    }

    try {
        // Check if user is connected to Plaid
        const { data: connectionData } = await supabaseAdmin
            .from('user_plaid_connections')
            .select('is_connected')
            .eq('uuid_user_id', userId)
            .single();

        result.isConnected = connectionData?.is_connected || false;

        // Fetch transactions from last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];

        const { data: transactions } = await supabaseAdmin
            .from('financial_transactions')
            .select('amount, category, name, date, merchant_name')
            .eq('uuid_user_id', userId)
            .gte('date', sixMonthsAgoStr)
            .order('date', { ascending: false });

        if (transactions) {
            result.transactions = transactions;
        }

        // Fetch income from last 6 months
        const { data: income } = await supabaseAdmin
            .from('income')
            .select('amount, source, name, date')
            .eq('uuid_user_id', userId)
            .gte('date', sixMonthsAgoStr)
            .order('date', { ascending: false });

        if (income) {
            result.income = income;
        }

    } catch (error) {
        console.error('Error fetching Supabase data:', error);
    }

    return result;
}

/**
 * Analyze transactions to get spending insights
 */
function analyzeTransactions(transactions: TransactionData[]) {
    if (transactions.length === 0) {
        return {
            totalSpending: 0,
            avgMonthlySpending: 0,
            categoryBreakdown: [] as { category: string; total: number; percentage: number }[],
            recentTransactions: [] as TransactionData[],
            topMerchants: [] as { name: string; total: number }[],
        };
    }

    const totalSpending = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

    // Get unique months
    const months = new Set(transactions.map(t => t.date.substring(0, 7)));
    const avgMonthlySpending = totalSpending / Math.max(months.size, 1);

    // Category breakdown
    const categoryTotals: Record<string, number> = {};
    transactions.forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.amount);
    });

    const categoryBreakdown = Object.entries(categoryTotals)
        .map(([category, total]) => ({
            category,
            total,
            percentage: (total / totalSpending) * 100,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8);

    // Top merchants
    const merchantTotals: Record<string, number> = {};
    transactions.forEach(t => {
        const name = t.merchant_name || t.name;
        merchantTotals[name] = (merchantTotals[name] || 0) + Number(t.amount);
    });

    const topMerchants = Object.entries(merchantTotals)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    return {
        totalSpending,
        avgMonthlySpending,
        categoryBreakdown,
        recentTransactions: transactions.slice(0, 10),
        topMerchants,
    };
}

/**
 * Analyze income data
 */
function analyzeIncome(income: IncomeData[]) {
    if (income.length === 0) {
        return { totalIncome: 0, avgMonthlyIncome: 0, sources: [] as string[] };
    }

    const totalIncome = income.reduce((sum, i) => sum + Number(i.amount), 0);
    const months = new Set(income.map(i => i.date.substring(0, 7)));
    const avgMonthlyIncome = totalIncome / Math.max(months.size, 1);

    const sources = [...new Set(income.map(i => i.source || i.name))];

    return { totalIncome, avgMonthlyIncome, sources };
}

/**
 * Fetch all available financial data for the user
 * This provides context to the AI about the user's actual financial situation
 */
export async function getFinancialContext(userId?: string): Promise<string> {
    try {
        const contextParts: string[] = [];

        // 1. Fetch real data from Supabase
        const supabaseData = await fetchSupabaseData(userId);

        if (supabaseData.isConnected) {
            contextParts.push('ACCOUNT STATUS: Connected to bank via Plaid');
        } else {
            contextParts.push('ACCOUNT STATUS: No bank accounts connected');
        }

        // 2. Analyze and format transaction data
        if (supabaseData.transactions.length > 0) {
            const spending = analyzeTransactions(supabaseData.transactions);

            const spendingContext = [
                'SPENDING DATA (Last 6 Months):',
                `- Total Spending: $${spending.totalSpending.toFixed(2)}`,
                `- Average Monthly: $${spending.avgMonthlySpending.toFixed(2)}`,
                '',
                'Top Spending Categories:',
                ...spending.categoryBreakdown.map(cat =>
                    `  - ${cat.category}: $${cat.total.toFixed(2)} (${cat.percentage.toFixed(1)}%)`
                ),
                '',
                'Top Merchants:',
                ...spending.topMerchants.map(m => `  - ${m.name}: $${m.total.toFixed(2)}`),
                '',
                'Recent Transactions:',
                ...spending.recentTransactions.slice(0, 5).map(t =>
                    `  - ${t.date}: ${t.merchant_name || t.name} - $${Number(t.amount).toFixed(2)} (${t.category})`
                ),
            ];

            contextParts.push(spendingContext.join('\n'));
        } else {
            contextParts.push('SPENDING DATA: No transaction history available');
        }

        // 3. Analyze income data
        if (supabaseData.income.length > 0) {
            const incomeAnalysis = analyzeIncome(supabaseData.income);

            const incomeContext = [
                'INCOME DATA (Last 6 Months):',
                `- Total Income: $${incomeAnalysis.totalIncome.toFixed(2)}`,
                `- Average Monthly: $${incomeAnalysis.avgMonthlyIncome.toFixed(2)}`,
                `- Sources: ${incomeAnalysis.sources.join(', ')}`,
            ];

            contextParts.push(incomeContext.join('\n'));

            // Calculate net worth / savings
            const spending = analyzeTransactions(supabaseData.transactions);
            const netSavings = incomeAnalysis.totalIncome - spending.totalSpending;
            contextParts.push(`\nNET SAVINGS (6 months): $${netSavings.toFixed(2)} (${netSavings >= 0 ? 'positive' : 'negative'})`);
        }

        // Combine all context
        if (contextParts.length === 0) {
            return 'No financial data available. User needs to connect accounts and provide profile information.';
        }

        return contextParts.join('\n\n');
    } catch (error) {
        console.error('Error building financial context:', error);
        return 'Error fetching financial data.';
    }
}

/**
 * Get a concise version of financial context (for voice conversations)
 */
export async function getConciseFinancialContext(userId?: string): Promise<string> {
    try {
        const contextParts: string[] = [];

        // Fetch real data from Supabase
        const supabaseData = await fetchSupabaseData(userId);

        if (supabaseData.transactions.length > 0) {
            const spending = analyzeTransactions(supabaseData.transactions);
            const topCategories = spending.categoryBreakdown.slice(0, 3).map(c => c.category);

            contextParts.push(
                `Monthly spending: ~$${spending.avgMonthlySpending.toFixed(0)}`,
                `Top categories: ${topCategories.join(', ')}`
            );
        }

        if (supabaseData.income.length > 0) {
            const incomeAnalysis = analyzeIncome(supabaseData.income);
            const spending = analyzeTransactions(supabaseData.transactions);
            const monthlySavings = incomeAnalysis.avgMonthlyIncome - spending.avgMonthlySpending;

            contextParts.push(
                `Monthly income: ~$${incomeAnalysis.avgMonthlyIncome.toFixed(0)}`,
                `Monthly savings: ~$${monthlySavings.toFixed(0)}`
            );
        }

        return contextParts.length > 0
            ? `FINANCIAL SNAPSHOT:\n${contextParts.join('\n')}`
            : 'No financial data available yet.';
    } catch (error) {
        console.error('Error building concise context:', error);
        return '';
    }
}
