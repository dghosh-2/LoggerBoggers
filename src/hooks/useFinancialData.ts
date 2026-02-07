'use client';

import { useState, useEffect } from 'react';

export interface Transaction {
    id: string;
    amount: number;
    category: string;
    name: string;
    date: string;
    tip?: number | null;
    tax?: number | null;
    source: string;
    merchant_name?: string;
}

export interface FinancialSummary {
    is_connected: boolean;
    total_spending: number;
    total_income: number;
    net_worth: number;
    monthly_spending: number;
    monthly_income: number;
    spending_by_category: Record<string, number>;
    recent_transactions: Array<{ name: string; amount: number; category: string; date: string }>;
    monthly_trend: Array<{ month: string; spending: number; income: number }>;
}

export function useFinancialData() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [summary, setSummary] = useState<FinancialSummary | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch summary first to check connection status
            const summaryResponse = await fetch('/api/data/summary');
            const summaryData = await summaryResponse.json();
            setSummary(summaryData);
            setIsConnected(summaryData.is_connected);
            
            // #region agent log
            fetch('http://127.0.0.1:7245/ingest/2d405ccf-cb3f-4611-bc27-f95a616c15c9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFinancialData.ts:45',message:'Summary fetched',data:{isConnected:summaryData.is_connected,monthlyIncome:summaryData.monthly_income,monthlySpending:summaryData.monthly_spending,categories:Object.keys(summaryData.spending_by_category||{})},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,D'})}).catch(()=>{});
            // #endregion

            // Only fetch transactions if connected
            if (summaryData.is_connected) {
                const txResponse = await fetch('/api/data/transactions?limit=5000');
                const txData = await txResponse.json();
                setTransactions(txData.transactions || []);
                
                // #region agent log
                const txCategories: Record<string, number> = {};
                (txData.transactions||[]).forEach((t:any) => { txCategories[t.category] = (txCategories[t.category]||0)+1; });
                const dates = (txData.transactions||[]).map((t:any)=>t.date).sort();
                fetch('http://127.0.0.1:7245/ingest/2d405ccf-cb3f-4611-bc27-f95a616c15c9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFinancialData.ts:55',message:'Transactions fetched',data:{count:txData.transactions?.length||0,categories:txCategories,dateRange:{min:dates[0],max:dates[dates.length-1]}},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D,E'})}).catch(()=>{});
                // #endregion
            } else {
                setTransactions([]);
            }
        } catch (err: any) {
            console.error('Error fetching financial data:', err);
            setError(err.message);
            setIsConnected(false);
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const refetch = () => {
        fetchData();
    };

    // Get transactions for a specific date range
    const getTransactionsInRange = (startDate: string, endDate: string) => {
        return transactions.filter(tx => tx.date >= startDate && tx.date <= endDate);
    };

    // Get spending by category for a date range
    const getSpendingByCategory = (startDate?: string, endDate?: string) => {
        let filteredTx = transactions;
        if (startDate && endDate) {
            filteredTx = getTransactionsInRange(startDate, endDate);
        }

        const categoryTotals: Record<string, number> = {};
        filteredTx.forEach(tx => {
            categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
        });

        return categoryTotals;
    };

    // Get total spending for a date range
    const getTotalSpending = (startDate?: string, endDate?: string) => {
        let filteredTx = transactions;
        if (startDate && endDate) {
            filteredTx = getTransactionsInRange(startDate, endDate);
        }
        return filteredTx.reduce((sum, tx) => sum + tx.amount, 0);
    };

    return {
        transactions,
        summary,
        isConnected,
        loading,
        error,
        refetch,
        getTransactionsInRange,
        getSpendingByCategory,
        getTotalSpending,
    };
}

// Singleton pattern to share data across components
let globalData: {
    transactions: Transaction[];
    isConnected: boolean;
    loading: boolean;
} = {
    transactions: [],
    isConnected: false,
    loading: true,
};

let listeners: Set<() => void> = new Set();

export function subscribeToFinancialData(callback: () => void) {
    listeners.add(callback);
    return () => listeners.delete(callback);
}

export function getGlobalFinancialData() {
    return globalData;
}

export async function refreshGlobalFinancialData() {
    try {
        globalData.loading = true;
        listeners.forEach(cb => cb());

        const summaryResponse = await fetch('/api/data/summary');
        const summaryData = await summaryResponse.json();
        globalData.isConnected = summaryData.is_connected;

        if (summaryData.is_connected) {
            const txResponse = await fetch('/api/data/transactions?limit=5000');
            const txData = await txResponse.json();
            globalData.transactions = txData.transactions || [];
        } else {
            globalData.transactions = [];
        }
    } catch (err) {
        console.error('Error refreshing global financial data:', err);
        globalData.isConnected = false;
        globalData.transactions = [];
    } finally {
        globalData.loading = false;
        listeners.forEach(cb => cb());
    }
}
