'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
    location?: string;
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

interface FinancialDataState {
    // Data
    transactions: Transaction[];
    summary: FinancialSummary | null;
    isConnected: boolean;
    
    // Cache metadata
    lastFetchedAt: number | null;
    isLoading: boolean;
    error: string | null;
    
    // Actions
    setData: (data: {
        transactions: Transaction[];
        summary: FinancialSummary | null;
        isConnected: boolean;
    }) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    invalidateCache: () => void;
    shouldRefetch: () => boolean;
}

// Cache duration: 2 minutes for financial data (more frequently updated)
const CACHE_DURATION_MS = 2 * 60 * 1000;

export const useFinancialDataStore = create<FinancialDataState>()(
    persist(
        (set, get) => ({
            // Initial state
            transactions: [],
            summary: null,
            isConnected: false,
            lastFetchedAt: null,
            isLoading: false,
            error: null,

            setData: (data) => set({
                ...data,
                lastFetchedAt: Date.now(),
                isLoading: false,
                error: null,
            }),

            setLoading: (loading) => set({ isLoading: loading }),
            
            setError: (error) => set({ error, isLoading: false }),

            invalidateCache: () => set({ lastFetchedAt: null }),

            shouldRefetch: () => {
                const { lastFetchedAt, isLoading } = get();
                
                // Don't refetch if already loading
                if (isLoading) return false;
                
                // Refetch if never fetched
                if (!lastFetchedAt) return true;
                
                // Refetch if cache is stale
                const now = Date.now();
                return (now - lastFetchedAt) > CACHE_DURATION_MS;
            },
        }),
        {
            name: 'financial-data-cache',
            // Only persist the data, not loading states
            partialize: (state) => ({
                transactions: state.transactions,
                summary: state.summary,
                isConnected: state.isConnected,
                lastFetchedAt: state.lastFetchedAt,
            }),
        }
    )
);
