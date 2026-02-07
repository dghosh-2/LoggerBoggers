/**
 * Plaid Integration Module
 * 
 * This module provides the interface for Plaid integration.
 * Currently uses fake data, but is structured to easily swap in real Plaid API calls.
 * 
 * TO INTEGRATE REAL PLAID:
 * 
 * 1. Install Plaid packages:
 *    npm install plaid react-plaid-link
 * 
 * 2. Set up environment variables in .env.local:
 *    PLAID_CLIENT_ID=your_client_id
 *    PLAID_SECRET=your_secret
 *    PLAID_ENV=sandbox  # or development, production
 *    NEXT_PUBLIC_PLAID_ENV=sandbox
 * 
 * 3. Create API routes:
 *    - /api/plaid/create-link-token (POST) - Creates a link token for Plaid Link
 *    - /api/plaid/exchange-token (POST) - Exchanges public token for access token
 *    - /api/plaid/accounts (GET) - Fetches accounts using access token
 *    - /api/plaid/transactions (GET) - Fetches transactions
 *    - /api/plaid/investments (GET) - Fetches investment holdings
 *    - /api/plaid/liabilities (GET) - Fetches loans/liabilities
 * 
 * 4. Replace the fake data functions below with real API calls
 * 
 * 5. Store access tokens securely in your database (encrypted)
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
    mask: string; // Last 4 digits
    currentBalance: number;
    availableBalance: number | null;
    limit: number | null; // For credit accounts
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
// FAKE DATA - Replace with real Plaid API calls
// ═══════════════════════════════════════════════════════════════════════════

const FAKE_INSTITUTIONS: PlaidInstitution[] = [
    {
        id: 'ins_chase',
        name: 'Chase',
        logo: null,
        primaryColor: '#117ACA',
        lastSync: '2 hours ago',
        status: 'connected',
        accounts: [
            {
                id: 'acc_chase_checking',
                name: 'Chase Total Checking',
                officialName: 'TOTAL CHECKING',
                type: 'depository',
                subtype: 'checking',
                institution: 'Chase',
                institutionId: 'ins_chase',
                mask: '4521',
                currentBalance: 8432.50,
                availableBalance: 8232.50,
                limit: null,
                isoCurrencyCode: 'USD',
                lastUpdated: new Date().toISOString(),
                status: 'connected',
            },
            {
                id: 'acc_chase_savings',
                name: 'Chase Savings',
                officialName: 'CHASE SAVINGS',
                type: 'depository',
                subtype: 'savings',
                institution: 'Chase',
                institutionId: 'ins_chase',
                mask: '7832',
                currentBalance: 25000.00,
                availableBalance: 25000.00,
                limit: null,
                isoCurrencyCode: 'USD',
                lastUpdated: new Date().toISOString(),
                status: 'connected',
            },
        ],
    },
    {
        id: 'ins_bofa',
        name: 'Bank of America',
        logo: null,
        primaryColor: '#E31837',
        lastSync: '3 hours ago',
        status: 'connected',
        accounts: [
            {
                id: 'acc_bofa_checking',
                name: 'Advantage Plus Banking',
                officialName: 'ADVANTAGE PLUS BANKING',
                type: 'depository',
                subtype: 'checking',
                institution: 'Bank of America',
                institutionId: 'ins_bofa',
                mask: '9012',
                currentBalance: 3250.75,
                availableBalance: 3150.75,
                limit: null,
                isoCurrencyCode: 'USD',
                lastUpdated: new Date().toISOString(),
                status: 'connected',
            },
        ],
    },
    {
        id: 'ins_fidelity',
        name: 'Fidelity',
        logo: null,
        primaryColor: '#4AA74A',
        lastSync: '1 hour ago',
        status: 'connected',
        accounts: [
            {
                id: 'acc_fidelity_brokerage',
                name: 'Individual Brokerage',
                officialName: 'INDIVIDUAL BROKERAGE ACCOUNT',
                type: 'investment',
                subtype: 'brokerage',
                institution: 'Fidelity',
                institutionId: 'ins_fidelity',
                mask: '5678',
                currentBalance: 45230.00,
                availableBalance: null,
                limit: null,
                isoCurrencyCode: 'USD',
                lastUpdated: new Date().toISOString(),
                status: 'connected',
            },
            {
                id: 'acc_fidelity_401k',
                name: '401(k)',
                officialName: '401(K) RETIREMENT ACCOUNT',
                type: 'investment',
                subtype: '401k',
                institution: 'Fidelity',
                institutionId: 'ins_fidelity',
                mask: '3456',
                currentBalance: 82500.00,
                availableBalance: null,
                limit: null,
                isoCurrencyCode: 'USD',
                lastUpdated: new Date().toISOString(),
                status: 'connected',
            },
        ],
    },
    {
        id: 'ins_sofi',
        name: 'SoFi',
        logo: null,
        primaryColor: '#00D4AA',
        lastSync: '4 hours ago',
        status: 'connected',
        accounts: [
            {
                id: 'acc_sofi_loan',
                name: 'Student Loan',
                officialName: 'STUDENT LOAN REFINANCE',
                type: 'loan',
                subtype: 'student',
                institution: 'SoFi',
                institutionId: 'ins_sofi',
                mask: '1234',
                currentBalance: 28500.00,
                availableBalance: null,
                limit: null,
                isoCurrencyCode: 'USD',
                lastUpdated: new Date().toISOString(),
                status: 'connected',
            },
        ],
    },
];

const FAKE_INVESTMENT_HOLDINGS: PlaidInvestmentHolding[] = [
    {
        id: 'hold_1',
        accountId: 'acc_fidelity_brokerage',
        securityId: 'sec_aapl',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        quantity: 50,
        price: 178.50,
        value: 8925.00,
        costBasis: 7500.00,
        gainLoss: 1425.00,
        gainLossPercent: 19.0,
    },
    {
        id: 'hold_2',
        accountId: 'acc_fidelity_brokerage',
        securityId: 'sec_googl',
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        quantity: 25,
        price: 141.20,
        value: 3530.00,
        costBasis: 3000.00,
        gainLoss: 530.00,
        gainLossPercent: 17.67,
    },
    {
        id: 'hold_3',
        accountId: 'acc_fidelity_brokerage',
        securityId: 'sec_msft',
        symbol: 'MSFT',
        name: 'Microsoft Corp.',
        quantity: 30,
        price: 378.90,
        value: 11367.00,
        costBasis: 9000.00,
        gainLoss: 2367.00,
        gainLossPercent: 26.3,
    },
    {
        id: 'hold_4',
        accountId: 'acc_fidelity_brokerage',
        securityId: 'sec_vti',
        symbol: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        quantity: 80,
        price: 238.50,
        value: 19080.00,
        costBasis: 16000.00,
        gainLoss: 3080.00,
        gainLossPercent: 19.25,
    },
    {
        id: 'hold_5',
        accountId: 'acc_fidelity_401k',
        securityId: 'sec_fxaix',
        symbol: 'FXAIX',
        name: 'Fidelity 500 Index Fund',
        quantity: 450,
        price: 183.33,
        value: 82500.00,
        costBasis: 65000.00,
        gainLoss: 17500.00,
        gainLossPercent: 26.92,
    },
];

const FAKE_LOANS: PlaidLoan[] = [
    {
        id: 'loan_1',
        accountId: 'acc_sofi_loan',
        name: 'Student Loan Refinance',
        type: 'student',
        originalPrincipal: 45000.00,
        currentBalance: 28500.00,
        interestRate: 4.99,
        minimumPayment: 485.00,
        nextPaymentDueDate: '2024-02-15',
        originationDate: '2020-06-01',
        institution: 'SoFi',
    },
];

// ═══════════════════════════════════════════════════════════════════════════
// API FUNCTIONS - Replace these with real Plaid API calls
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all connected institutions with their accounts
 * In production: Call /api/plaid/accounts
 */
export async function getConnectedInstitutions(): Promise<PlaidInstitution[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return FAKE_INSTITUTIONS;
}

/**
 * Get all bank accounts (checking/savings)
 */
export async function getBankAccounts(): Promise<PlaidAccount[]> {
    const institutions = await getConnectedInstitutions();
    return institutions
        .flatMap(inst => inst.accounts)
        .filter(acc => acc.type === 'depository');
}

/**
 * Get all investment accounts
 */
export async function getInvestmentAccounts(): Promise<PlaidAccount[]> {
    const institutions = await getConnectedInstitutions();
    return institutions
        .flatMap(inst => inst.accounts)
        .filter(acc => acc.type === 'investment');
}

/**
 * Get investment holdings
 * In production: Call /api/plaid/investments/holdings
 */
export async function getInvestmentHoldings(): Promise<PlaidInvestmentHolding[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return FAKE_INVESTMENT_HOLDINGS;
}

/**
 * Get all loans/liabilities
 * In production: Call /api/plaid/liabilities
 */
export async function getLoans(): Promise<PlaidLoan[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return FAKE_LOANS;
}

/**
 * Get loan accounts
 */
export async function getLoanAccounts(): Promise<PlaidAccount[]> {
    const institutions = await getConnectedInstitutions();
    return institutions
        .flatMap(inst => inst.accounts)
        .filter(acc => acc.type === 'loan');
}

/**
 * Sync a specific institution
 * In production: Trigger a Plaid refresh
 */
export async function syncInstitution(institutionId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 2000));
    // In production: Call Plaid's /item/refresh endpoint
}

/**
 * Sync all institutions
 */
export async function syncAllInstitutions(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 3000));
    // In production: Loop through all items and refresh
}

/**
 * Disconnect an institution
 * In production: Call /api/plaid/item/remove
 */
export async function disconnectInstitution(institutionId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    // In production: Call Plaid's /item/remove endpoint
}

// ═══════════════════════════════════════════════════════════════════════════
// PLAID LINK HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a link token for Plaid Link
 * In production: Call /api/plaid/create-link-token
 */
export async function createLinkToken(): Promise<string> {
    // In production:
    // const response = await fetch('/api/plaid/create-link-token', { method: 'POST' });
    // const data = await response.json();
    // return data.link_token;
    
    return 'fake-link-token-for-development';
}

/**
 * Exchange public token for access token
 * In production: Call /api/plaid/exchange-token
 */
export async function exchangePublicToken(publicToken: string): Promise<void> {
    // In production:
    // await fetch('/api/plaid/exchange-token', {
    //     method: 'POST',
    //     body: JSON.stringify({ public_token: publicToken }),
    // });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
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
    const [bankAccounts, investmentAccounts, loanAccounts] = await Promise.all([
        getBankAccounts(),
        getInvestmentAccounts(),
        getLoanAccounts(),
    ]);

    const totalCash = bankAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
    const totalInvestments = investmentAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
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
