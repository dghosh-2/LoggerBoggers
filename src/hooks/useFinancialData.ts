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
        isAuthenticated,
        isLoading: loading, 
        error,
        setData,
        setLoading,
        setError,
        invalidateCache,
        shouldRefetch,
        clearData,
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

            // Check if user is authenticated
            const isAuth = summaryData.is_authenticated === true;
            
            let txData: Transaction[] = [];
            
            // Only fetch transactions if connected AND authenticated
            if (summaryData.is_connected && isAuth) {
                const txResponse = await fetch('/api/data/transactions?limit=5000');
                const txResult = await txResponse.json();
                txData = txResult.transactions || [];
            }

            setData({
                transactions: txData,
                summary: summaryData,
                isConnected: summaryData.is_connected,
                isAuthenticated: isAuth,
            });
        } catch (err: any) {
            console.error('Error fetching financial data:', err);
            setError(err.message);
            // Clear data on error to prevent stale cache issues
            clearData();
        }
    }, [shouldRefetch, setLoading, setData, setError, clearData]);

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
        isAuthenticated,
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

        const isAuth = summaryData.is_authenticated === true;
        let txData: Transaction[] = [];
        
        if (summaryData.is_connected && isAuth) {
            const txResponse = await fetch('/api/data/transactions?limit=5000');
            const txResult = await txResponse.json();
            txData = txResult.transactions || [];
        }

        store.setData({
            transactions: txData,
            summary: summaryData,
            isConnected: summaryData.is_connected,
            isAuthenticated: isAuth,
        });
    } catch (err) {
        console.error('Error refreshing global financial data:', err);
        store.setError('Failed to refresh financial data');
        store.clearData();
    }
}
