'use client';

import { useEffect, useCallback } from 'react';
import { 
    useFinancialDataStore, 
    type Transaction, 
    type FinancialSummary 
} from '@/stores/financial-data-store';

// Re-export types for backwards compatibility
export type { Transaction, FinancialSummary };

export function useFinancialData() {
    const store = useFinancialDataStore();
    const { 
        transactions, 
        summary, 
        isConnected, 
        isLoading: loading, 
        error,
        setData,
        setLoading,
        setError,
        invalidateCache,
        shouldRefetch,
    } = store;

    const fetchData = useCallback(async (force = false) => {
        // Skip if we have fresh data and not forcing
        if (!force && !shouldRefetch()) {
            return;
        }

        try {
            setLoading(true);

            // Fetch summary first to check connection status
            const summaryResponse = await fetch('/api/data/summary');
            const summaryData = await summaryResponse.json();

            // Always fetch transactions for the logged-in user.
            // This app treats "connected" as "has data", not strictly "Plaid connected".
            const txResponse = await fetch('/api/data/transactions?limit=5000');
            const txResult = await txResponse.json();
            const txData: Transaction[] = txResult.transactions || [];

            setData({
                transactions: txData,
                summary: summaryData,
                isConnected: Boolean(summaryData.is_connected) || txData.length > 0,
            });
        } catch (err: any) {
            console.error('Error fetching financial data:', err);
            setError(err.message);
        }
    }, [shouldRefetch, setLoading, setData, setError]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const refetch = useCallback(() => {
        invalidateCache();
        return fetchData(true);
    }, [invalidateCache, fetchData]);

    // Get transactions for a specific date range
    const getTransactionsInRange = useCallback((startDate: string, endDate: string) => {
        return transactions.filter(tx => tx.date >= startDate && tx.date <= endDate);
    }, [transactions]);

    // Get spending by category for a date range
    const getSpendingByCategory = useCallback((startDate?: string, endDate?: string) => {
        let filteredTx = transactions;
        if (startDate && endDate) {
            filteredTx = getTransactionsInRange(startDate, endDate);
        }

        const categoryTotals: Record<string, number> = {};
        filteredTx.forEach(tx => {
            categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
        });

        return categoryTotals;
    }, [transactions, getTransactionsInRange]);

    // Get total spending for a date range
    const getTotalSpending = useCallback((startDate?: string, endDate?: string) => {
        let filteredTx = transactions;
        if (startDate && endDate) {
            filteredTx = getTransactionsInRange(startDate, endDate);
        }
        return filteredTx.reduce((sum, tx) => sum + tx.amount, 0);
    }, [transactions, getTransactionsInRange]);

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

// Keep the global functions for backwards compatibility
// These now use the Zustand store under the hood
export function subscribeToFinancialData(callback: () => void) {
    return useFinancialDataStore.subscribe(callback);
}

export function getGlobalFinancialData() {
    const state = useFinancialDataStore.getState();
    return {
        transactions: state.transactions,
        isConnected: state.isConnected,
        loading: state.isLoading,
    };
}

export async function refreshGlobalFinancialData() {
    const store = useFinancialDataStore.getState();
    store.invalidateCache();
    
    try {
        store.setLoading(true);

        const summaryResponse = await fetch('/api/data/summary');
        const summaryData = await summaryResponse.json();
        const txResponse = await fetch('/api/data/transactions?limit=5000');
        const txResult = await txResponse.json();
        const txData: Transaction[] = txResult.transactions || [];

        store.setData({
            transactions: txData,
            summary: summaryData,
            isConnected: Boolean(summaryData.is_connected) || txData.length > 0,
        });
    } catch (err) {
        console.error('Error refreshing global financial data:', err);
        store.setError('Failed to refresh financial data');
    }
}
