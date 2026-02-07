'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  PlaidInstitution, 
  PlaidAccount, 
  PlaidInvestmentHolding, 
  PlaidLoan, 
  FinancialSummary 
} from '@/lib/plaid';

interface PortfolioState {
  // Data
  institutions: PlaidInstitution[];
  bankAccounts: PlaidAccount[];
  investmentAccounts: PlaidAccount[];
  holdings: PlaidInvestmentHolding[];
  loans: PlaidLoan[];
  summary: FinancialSummary | null;
  
  // Cache metadata
  lastFetchedAt: number | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setData: (data: {
    institutions: PlaidInstitution[];
    bankAccounts: PlaidAccount[];
    investmentAccounts: PlaidAccount[];
    holdings: PlaidInvestmentHolding[];
    loans: PlaidLoan[];
    summary: FinancialSummary | null;
  }) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  invalidateCache: () => void;
  shouldRefetch: () => boolean;
}

// Cache duration: 5 minutes (data doesn't change that often)
const CACHE_DURATION_MS = 5 * 60 * 1000;

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      // Initial state
      institutions: [],
      bankAccounts: [],
      investmentAccounts: [],
      holdings: [],
      loans: [],
      summary: null,
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
      name: 'portfolio-cache',
      // Only persist the data, not loading states
      partialize: (state) => ({
        institutions: state.institutions,
        bankAccounts: state.bankAccounts,
        investmentAccounts: state.investmentAccounts,
        holdings: state.holdings,
        loans: state.loans,
        summary: state.summary,
        lastFetchedAt: state.lastFetchedAt,
      }),
    }
  )
);

// Helper hook for fetching portfolio data with caching
export function usePortfolioData() {
  const store = usePortfolioStore();
  
  const fetchData = async (force = false) => {
    // Skip if we have fresh data and not forcing
    if (!force && !store.shouldRefetch()) {
      return;
    }

    store.setLoading(true);
    
    try {
      const [
        { getConnectedInstitutions, getBankAccounts, getInvestmentAccounts, getInvestmentHoldings, getLoans, getFinancialSummary }
      ] = await Promise.all([
        import('@/lib/plaid'),
      ]);

      // Fetch all data in parallel
      const [institutions, bankAccounts, investmentAccounts, holdings, loans, summary, realAccountsResponse] = await Promise.all([
        getConnectedInstitutions(),
        getBankAccounts(),
        getInvestmentAccounts(),
        getInvestmentHoldings(),
        getLoans(),
        getFinancialSummary(),
        fetch('/api/plaid/accounts').then(r => r.ok ? r.json() : null).catch(() => null),
      ]);

      // Merge real Plaid accounts if available
      let finalInstitutions = institutions;
      let finalBankAccounts = bankAccounts;
      let finalInvestmentAccounts = investmentAccounts;

      if (realAccountsResponse?.institutions?.length > 0) {
        const realInstitutions: PlaidInstitution[] = realAccountsResponse.institutions.map((inst: any) => ({
          id: inst.itemId || inst.id,
          name: inst.name,
          logo: inst.logo,
          primaryColor: inst.primaryColor,
          lastSync: inst.lastSync || 'Just now',
          status: inst.status || 'connected',
          accounts: inst.accounts.map((acc: any) => ({
            id: acc.id,
            name: acc.name,
            officialName: acc.officialName,
            type: acc.type,
            subtype: acc.subtype,
            institution: inst.name,
            institutionId: inst.id,
            mask: acc.mask || '****',
            currentBalance: acc.currentBalance || 0,
            availableBalance: acc.availableBalance,
            limit: acc.limit,
            isoCurrencyCode: acc.isoCurrencyCode || 'USD',
            lastUpdated: new Date().toISOString(),
            status: 'connected',
          })),
        }));

        // Merge institutions (avoiding duplicates)
        const existingIds = new Set(institutions.map(i => i.id));
        const newInstitutions = realInstitutions.filter(i => !existingIds.has(i.id));
        finalInstitutions = [...institutions, ...newInstitutions];

        // Merge bank accounts
        const realBankAccounts = realAccountsResponse.accounts?.filter((acc: any) => acc.type === 'depository') || [];
        const existingBankIds = new Set(bankAccounts.map(a => a.id));
        const newBankAccounts = realBankAccounts.filter((a: any) => !existingBankIds.has(a.id));
        finalBankAccounts = [...bankAccounts, ...newBankAccounts];

        // Merge investment accounts
        const realInvestmentAccounts = realAccountsResponse.accounts?.filter((acc: any) => acc.type === 'investment') || [];
        const existingInvestIds = new Set(investmentAccounts.map(a => a.id));
        const newInvestmentAccounts = realInvestmentAccounts.filter((a: any) => !existingInvestIds.has(a.id));
        finalInvestmentAccounts = [...investmentAccounts, ...newInvestmentAccounts];
      }

      store.setData({
        institutions: finalInstitutions,
        bankAccounts: finalBankAccounts,
        investmentAccounts: finalInvestmentAccounts,
        holdings,
        loans,
        summary,
      });
    } catch (error: any) {
      store.setError(error.message || 'Failed to load portfolio data');
    }
  };

  const refetch = () => fetchData(true);
  
  const invalidateAndRefetch = () => {
    store.invalidateCache();
    return fetchData(true);
  };

  return {
    ...store,
    fetchData,
    refetch,
    invalidateAndRefetch,
  };
}
