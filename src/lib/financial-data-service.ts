// Centralized service for getting financial data
// Returns real data from Supabase if connected, zeros if not

export interface FinancialSummary {
    isConnected: boolean;
    totalIncome: number;
    totalExpenses: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    netWorth: number;
    savingsRate: number;
    spendingByCategory: Record<string, number>;
    recentTransactions: Array<{
        name: string;
        amount: number;
        category: string;
        date: string;
    }>;
    monthlyTrend: Array<{
        month: string;
        income: number;
        expenses: number;
        savings: number;
    }>;
}

// Cache for financial data
let cachedData: FinancialSummary | null = null;
let lastFetch: number = 0;
const CACHE_DURATION = 30000; // 30 seconds

export async function getFinancialSummary(): Promise<FinancialSummary> {
    const now = Date.now();
    
    // Return cached data if fresh
    if (cachedData && (now - lastFetch) < CACHE_DURATION) {
        return cachedData;
    }

    try {
        const response = await fetch('/api/data/summary');
        const data = await response.json();
        
        cachedData = {
            isConnected: data.is_connected || false,
            totalIncome: data.total_income || 0,
            totalExpenses: data.total_spending || 0,
            monthlyIncome: data.monthly_income || 0,
            monthlyExpenses: data.monthly_spending || 0,
            netWorth: data.net_worth || 0,
            savingsRate: data.monthly_income > 0 
                ? Math.round(((data.monthly_income - data.monthly_spending) / data.monthly_income) * 100)
                : 0,
            spendingByCategory: data.spending_by_category || {},
            recentTransactions: data.recent_transactions || [],
            monthlyTrend: (data.monthly_trend || []).map((item: any) => ({
                month: item.month,
                income: item.income || 0,
                expenses: item.spending || 0,
                savings: (item.income || 0) - (item.spending || 0),
            })),
        };
        
        lastFetch = now;
        return cachedData;
    } catch (error) {
        console.error('Error fetching financial summary:', error);
        return getEmptyFinancialSummary();
    }
}

export function getEmptyFinancialSummary(): FinancialSummary {
    return {
        isConnected: false,
        totalIncome: 0,
        totalExpenses: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        netWorth: 0,
        savingsRate: 0,
        spendingByCategory: {},
        recentTransactions: [],
        monthlyTrend: [],
    };
}

export function clearFinancialDataCache() {
    cachedData = null;
    lastFetch = 0;
}

// Check if user is connected to Plaid
export async function isPlaidConnected(): Promise<boolean> {
    try {
        const summary = await getFinancialSummary();
        return summary.isConnected;
    } catch {
        return false;
    }
}
