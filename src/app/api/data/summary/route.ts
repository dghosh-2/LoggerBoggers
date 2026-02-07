import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        // Get authenticated user ID
        const userId = await getUserIdFromRequest(request);
        
        if (!userId) {
            // Return zeros if not authenticated - include is_authenticated flag
            return NextResponse.json({
                is_connected: false,
                is_authenticated: false,
                total_spending: 0,
                total_income: 0,
                net_worth: 0,
                monthly_spending: 0,
                monthly_income: 0,
                spending_by_category: {},
                recent_transactions: [],
                monthly_trend: [],
            });
        }

        // Check if user is connected to Plaid
        const { data: connectionData } = await supabaseAdmin
            .from('user_plaid_connections')
            .select('is_connected')
            .eq('uuid_user_id', userId)
            .single();
        
        const isConnected = connectionData?.is_connected || false;
        
        // Get current month dates
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        
        // Get last 12 months for trend
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        const twelveMonthsAgoStr = twelveMonthsAgo.toISOString().split('T')[0];
        
        // Fetch all transactions for calculations
        // Schema: id, user_id, uuid_user_id, amount, date, category, name, merchant_name, tip, tax, location, source
        const { data: allTransactions, error: txError } = await supabaseAdmin
            .from('financial_transactions')
            .select('amount, date, category, merchant_name, name, tip, tax, location')
            .eq('uuid_user_id', userId)
            .gte('date', twelveMonthsAgoStr)
            .order('date', { ascending: false });
        
        // Fetch all income
        const { data: allIncome } = await supabaseAdmin
            .from('income')
            .select('amount, date')
            .eq('uuid_user_id', userId)
            .gte('date', twelveMonthsAgoStr);
        
        // Fetch accounts for net worth calculation (assets - liabilities)
        const { data: allAccounts } = await supabaseAdmin
            .from('accounts')
            .select('current_balance, type')
            .eq('uuid_user_id', userId);
        
        // Fetch holdings for investment value
        const { data: allHoldings } = await supabaseAdmin
            .from('holdings')
            .select('value')
            .eq('uuid_user_id', userId);
        
        // Calculate totals
        const transactions = allTransactions || [];
        const income = allIncome || [];
        const accounts = allAccounts || [];
        const holdings = allHoldings || [];
        
        const totalSpending = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
        const totalIncome = income.reduce((sum, inc) => sum + Number(inc.amount), 0);
        
        // Calculate net worth from accounts (assets - liabilities)
        // Assets: depository (checking, savings), investment accounts
        // Liabilities: credit cards, loans
        let totalAssets = 0;
        let totalLiabilities = 0;
        
        for (const account of accounts) {
            const balance = Number(account.current_balance) || 0;
            if (account.type === 'depository' || account.type === 'investment') {
                totalAssets += balance;
            } else if (account.type === 'credit' || account.type === 'loan') {
                totalLiabilities += balance; // Credit/loan balances are what you owe
            }
        }
        
        // Add holdings value to assets
        const holdingsValue = holdings.reduce((sum, h) => sum + Number(h.value || 0), 0);
        totalAssets += holdingsValue;
        
        const netWorth = totalAssets - totalLiabilities;
        
        // Helper to get transaction date (schema uses 'date')
        const getTxDate = (tx: any) => tx.date;
        // Helper to get category name (schema has 'category' text column)
        const getTxCategory = (tx: any) => tx.category || 'Other';
        // Helper to get transaction name
        const getTxName = (tx: any) => tx.merchant_name || tx.name || 'Unknown';
        
        // Monthly spending (current month) - fallback to most recent month with data
        let monthlyTransactions = transactions.filter(tx => getTxDate(tx) >= startOfMonth && getTxDate(tx) <= endOfMonth);
        let monthlyIncomeData = income.filter(inc => inc.date >= startOfMonth && inc.date <= endOfMonth);
        
        // If current month has no data, use the most recent month
        if (monthlyTransactions.length === 0 && transactions.length > 0) {
            const mostRecentDate = new Date(getTxDate(transactions[0]));
            const recentMonthStart = new Date(mostRecentDate.getFullYear(), mostRecentDate.getMonth(), 1).toISOString().split('T')[0];
            const recentMonthEnd = new Date(mostRecentDate.getFullYear(), mostRecentDate.getMonth() + 1, 0).toISOString().split('T')[0];
            monthlyTransactions = transactions.filter(tx => getTxDate(tx) >= recentMonthStart && getTxDate(tx) <= recentMonthEnd);
            monthlyIncomeData = income.filter(inc => inc.date >= recentMonthStart && inc.date <= recentMonthEnd);
        }
        
        const monthlySpending = monthlyTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
        const monthlyIncome = monthlyIncomeData.reduce((sum, inc) => sum + Number(inc.amount), 0);
        
        // Spending by category (use monthly transactions)
        const spendingByCategory: Record<string, number> = {};
        monthlyTransactions.forEach(tx => {
            const cat = getTxCategory(tx);
            spendingByCategory[cat] = (spendingByCategory[cat] || 0) + Number(tx.amount);
        });
        
        // Monthly trend (last 12 months)
        const monthlyTrend: { month: string; spending: number; income: number }[] = [];
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
            const monthName = date.toLocaleString('default', { month: 'short' });
            
            const monthSpending = transactions
                .filter(tx => getTxDate(tx) >= monthStart && getTxDate(tx) <= monthEnd)
                .reduce((sum, tx) => sum + Number(tx.amount), 0);
            
            const monthInc = income
                .filter(inc => inc.date >= monthStart && inc.date <= monthEnd)
                .reduce((sum, inc) => sum + Number(inc.amount), 0);
            
            monthlyTrend.push({
                month: monthName,
                spending: Math.round(monthSpending * 100) / 100,
                income: Math.round(monthInc * 100) / 100,
            });
        }
        
        // Recent transactions (last 10)
        const recentTransactions = transactions.slice(0, 10).map(tx => ({
            name: getTxName(tx),
            amount: tx.amount,
            category: getTxCategory(tx),
            date: getTxDate(tx),
        }));
        
        // Debug logging
        console.log('=== SUMMARY API DATA ===');
        console.log(`User: ${userId}`);
        console.log(`Date range: ${startOfMonth} to ${endOfMonth} (current month)`);
        console.log(`Transactions: ${transactions.length} total, ${monthlyTransactions.length} this month`);
        console.log(`Income: ${income.length} total, ${monthlyIncomeData.length} this month`);
        console.log(`Accounts: ${accounts.length}, Holdings: ${holdings.length}`);
        console.log(`Net Worth: $${netWorth.toFixed(2)} (Assets: $${totalAssets.toFixed(2)}, Liabilities: $${totalLiabilities.toFixed(2)}, Holdings: $${holdingsValue.toFixed(2)})`);
        console.log(`Monthly: Spending $${monthlySpending.toFixed(2)}, Income $${monthlyIncome.toFixed(2)}`);
        console.log(`Categories: ${Object.keys(spendingByCategory).join(', ')}`);
        if (transactions.length > 0) {
            console.log(`Most recent transaction: ${getTxDate(transactions[0])} - ${getTxName(transactions[0])}`);
        }
        
        const hasAnyData = transactions.length > 0 || income.length > 0;

        return NextResponse.json({
            // "connected" means "has usable data" for the dashboard. Plaid is optional for the MVP.
            is_connected: isConnected || hasAnyData,
            is_authenticated: true,
            total_spending: Math.round(totalSpending * 100) / 100,
            total_income: Math.round(totalIncome * 100) / 100,
            net_worth: Math.round(netWorth * 100) / 100,
            monthly_spending: Math.round(monthlySpending * 100) / 100,
            monthly_income: Math.round(monthlyIncome * 100) / 100,
            spending_by_category: spendingByCategory,
            recent_transactions: recentTransactions,
            monthly_trend: monthlyTrend,
        });
        
    } catch (error: any) {
        console.error('Error fetching summary:', error);
        return NextResponse.json(
            { 
                is_connected: false,
                is_authenticated: false,
                error: 'Failed to fetch summary',
                total_spending: 0,
                total_income: 0,
                net_worth: 0,
                monthly_spending: 0,
                monthly_income: 0,
                spending_by_category: {},
                recent_transactions: [],
                monthly_trend: [],
            },
            { status: 500 }
        );
    }
}
