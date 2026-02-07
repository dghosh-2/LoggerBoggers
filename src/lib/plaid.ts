/**
 * Plaid Integration Module
 * 
 * This module provides the interface for Plaid integration.
 * All data is fetched from Supabase where it's stored after Plaid sync.
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PlaidAccount {
    id: string;
    name: string;
    officialName: string | null;
    type: 'depository' | 'investment' | 'loan' | 'credit';
    subtype: string;
    institution: string;
    institutionId: string;
    mask: string;
    currentBalance: number;
    availableBalance: number | null;
    limit: number | null;
    isoCurrencyCode: string;
    lastUpdated: string;
    status: 'connected' | 'error' | 'pending';
}

export interface PlaidInstitution {
    id: string;
    name: string;
    logo: string | null;
    primaryColor: string | null;
    accounts: PlaidAccount[];
    lastSync: string;
    status: 'connected' | 'error' | 'pending';
}

export interface PlaidInvestmentHolding {
    id: string;
    accountId: string;
    securityId: string;
    symbol: string;
    name: string;
    quantity: number;
    price: number;
    value: number;
    costBasis: number | null;
    gainLoss: number | null;
    gainLossPercent: number | null;
}

export interface PlaidLoan {
    id: string;
    accountId: string;
    name: string;
    type: 'student' | 'mortgage' | 'auto' | 'personal' | 'other';
    originalPrincipal: number;
    currentBalance: number;
    interestRate: number;
    minimumPayment: number;
    nextPaymentDueDate: string | null;
    originationDate: string | null;
    institution: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// API FUNCTIONS - All data comes from Supabase after Plaid sync
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if user is connected to Plaid
 */
async function checkPlaidConnection(): Promise<boolean> {
    try {
        const response = await fetch('/api/data/summary');
        const data = await response.json();
        return data.is_connected || false;
    } catch {
        return false;
    }
}

/**
 * Get all connected institutions with their accounts
 * Returns empty array if not connected to Plaid
 */
export async function getConnectedInstitutions(): Promise<PlaidInstitution[]> {
    const isConnected = await checkPlaidConnection();
    if (!isConnected) {
        return [];
    }
    try {
        const response = await fetch('/api/plaid/accounts');
        if (!response.ok) return [];
        const data = await response.json();
        return data.institutions || [];
    } catch {
        return [];
    }
}

/**
 * Get all bank accounts (checking/savings)
 * Returns empty array if not connected
 */
export async function getBankAccounts(): Promise<PlaidAccount[]> {
    const isConnected = await checkPlaidConnection();
    if (!isConnected) {
        return [];
    }
    try {
        const response = await fetch('/api/plaid/accounts');
        if (!response.ok) return [];
        const data = await response.json();
        return (data.accounts || []).filter((acc: PlaidAccount) => acc.type === 'depository');
    } catch {
        return [];
    }
}

/**
 * Get all investment accounts
 * Returns empty array if not connected
 */
export async function getInvestmentAccounts(): Promise<PlaidAccount[]> {
    const isConnected = await checkPlaidConnection();
    if (!isConnected) {
        return [];
    }
    try {
        const response = await fetch('/api/plaid/accounts');
        if (!response.ok) return [];
        const data = await response.json();
        return (data.accounts || []).filter((acc: PlaidAccount) => acc.type === 'investment');
    } catch {
        return [];
    }
}

/**
 * Get investment holdings from Supabase
 * Returns empty array if not connected or no holdings
 */
export async function getInvestmentHoldings(): Promise<PlaidInvestmentHolding[]> {
    const isConnected = await checkPlaidConnection();
    if (!isConnected) {
        return [];
    }
    try {
        const response = await fetch('/api/data/holdings');
        if (!response.ok) return [];
        const data = await response.json();
        return data.holdings || [];
    } catch {
        return [];
    }
}

/**
 * Get all loans/liabilities from Supabase
 * Returns empty array if not connected or no loans
 */
export async function getLoans(): Promise<PlaidLoan[]> {
    const isConnected = await checkPlaidConnection();
    if (!isConnected) {
        return [];
    }
    try {
        const response = await fetch('/api/data/loans');
        if (!response.ok) return [];
        const data = await response.json();
        return data.loans || [];
    } catch {
        return [];
    }
}

/**
 * Get loan accounts
 */
export async function getLoanAccounts(): Promise<PlaidAccount[]> {
    const isConnected = await checkPlaidConnection();
    if (!isConnected) {
        return [];
    }
    try {
        const response = await fetch('/api/plaid/accounts');
        if (!response.ok) return [];
        const data = await response.json();
        return (data.accounts || []).filter((acc: PlaidAccount) => acc.type === 'loan');
    } catch {
        return [];
    }
}

/**
 * Sync a specific institution
 */
export async function syncInstitution(institutionId: string): Promise<void> {
    await fetch('/api/plaid/accounts');
}

/**
 * Sync all institutions
 */
export async function syncAllInstitutions(): Promise<void> {
    await fetch('/api/plaid/accounts');
}

/**
 * Disconnect an institution
 */
export async function disconnectInstitution(institutionId: string): Promise<void> {
    // In production: Call API to remove Plaid item
    await new Promise(resolve => setTimeout(resolve, 500));
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface FinancialSummary {
    totalCash: number;
    totalInvestments: number;
    totalLoans: number;
    netWorth: number;
    bankAccountsCount: number;
    investmentAccountsCount: number;
    loansCount: number;
}

export async function getFinancialSummary(): Promise<FinancialSummary> {
    const isConnected = await checkPlaidConnection();
    
    if (!isConnected) {
        return {
            totalCash: 0,
            totalInvestments: 0,
            totalLoans: 0,
            netWorth: 0,
            bankAccountsCount: 0,
            investmentAccountsCount: 0,
            loansCount: 0,
        };
    }

    const [bankAccounts, investmentAccounts, loanAccounts, holdings] = await Promise.all([
        getBankAccounts(),
        getInvestmentAccounts(),
        getLoanAccounts(),
        getInvestmentHoldings(),
    ]);

    const totalCash = bankAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
    const holdingsValue = (holdings || []).reduce((sum, h: any) => sum + Number(h.value || 0), 0);
    const totalInvestments = investmentAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0) + holdingsValue;
    const totalLoans = loanAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

    return {
        totalCash,
        totalInvestments,
        totalLoans,
        netWorth: totalCash + totalInvestments - totalLoans,
        bankAccountsCount: bankAccounts.length,
        investmentAccountsCount: investmentAccounts.length,
        loansCount: loanAccounts.length,
    };
}
