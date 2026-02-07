import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        // Get authenticated user ID
        const userId = await getUserIdFromRequest(request);
        
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/2d405ccf-cb3f-4611-bc27-f95a616c15c9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'summary/route.ts:12',message:'Summary API called',data:{userId:userId||'null'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        if (!userId) {
            // Return zeros if not authenticated
            return NextResponse.json({
                is_connected: false,
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
        const { data: connectionData } = await supabase
            .from('user_plaid_connections')
            .select('is_connected')
            .eq('uuid_user_id', userId)
            .single();
        
        const isConnected = connectionData?.is_connected || false;
        
        if (!isConnected) {
            // Return zeros if not connected
            return NextResponse.json({
                is_connected: false,
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
        
        // Get current month dates
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        
        // Get last 12 months for trend
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        const twelveMonthsAgoStr = twelveMonthsAgo.toISOString().split('T')[0];
        
        // Fetch all transactions for calculations
        const { data: allTransactions } = await supabase
            .from('transactions')
            .select('amount, category, date, name')
            .eq('uuid_user_id', userId)
            .gte('date', twelveMonthsAgoStr)
            .order('date', { ascending: false });
        
        // Fetch all income
        const { data: allIncome } = await supabase
            .from('income')
            .select('amount, date')
            .eq('uuid_user_id', userId)
            .gte('date', twelveMonthsAgoStr);
        
        // Calculate totals
        const transactions = allTransactions || [];
        const income = allIncome || [];
        
        const totalSpending = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
        const totalIncome = income.reduce((sum, inc) => sum + Number(inc.amount), 0);
        
        // Monthly spending (current month) - fallback to most recent month with data
        let monthlyTransactions = transactions.filter(tx => tx.date >= startOfMonth && tx.date <= endOfMonth);
        let monthlyIncomeData = income.filter(inc => inc.date >= startOfMonth && inc.date <= endOfMonth);
        
        // If current month has no data, use the most recent month
        if (monthlyTransactions.length === 0 && transactions.length > 0) {
            const mostRecentDate = new Date(transactions[0].date);
            const recentMonthStart = new Date(mostRecentDate.getFullYear(), mostRecentDate.getMonth(), 1).toISOString().split('T')[0];
            const recentMonthEnd = new Date(mostRecentDate.getFullYear(), mostRecentDate.getMonth() + 1, 0).toISOString().split('T')[0];
            monthlyTransactions = transactions.filter(tx => tx.date >= recentMonthStart && tx.date <= recentMonthEnd);
            monthlyIncomeData = income.filter(inc => inc.date >= recentMonthStart && inc.date <= recentMonthEnd);
        }
        
        const monthlySpending = monthlyTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
        const monthlyIncome = monthlyIncomeData.reduce((sum, inc) => sum + Number(inc.amount), 0);
        
        // Spending by category (use monthly transactions)
        const spendingByCategory: Record<string, number> = {};
        monthlyTransactions.forEach(tx => {
            spendingByCategory[tx.category] = (spendingByCategory[tx.category] || 0) + Number(tx.amount);
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
                .filter(tx => tx.date >= monthStart && tx.date <= monthEnd)
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
            name: tx.name,
            amount: tx.amount,
            category: tx.category,
            date: tx.date,
        }));
        
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/2d405ccf-cb3f-4611-bc27-f95a616c15c9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'summary/route.ts:138',message:'Summary data computed',data:{txCount:transactions.length,incomeCount:income.length,categories:Object.keys(spendingByCategory),recentTxSample:recentTransactions.slice(0,3)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        return NextResponse.json({
            is_connected: true,
            total_spending: Math.round(totalSpending * 100) / 100,
            total_income: Math.round(totalIncome * 100) / 100,
            net_worth: Math.round((totalIncome - totalSpending) * 100) / 100,
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
