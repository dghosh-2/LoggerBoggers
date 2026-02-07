/**
 * CENTRALIZED DATABASE SCHEMA DEFINITIONS
 * 
 * This file is the SINGLE SOURCE OF TRUTH for all database table schemas.
 * All API routes and data transformations should use these types and helpers.
 * 
 * Schema matches the Supabase database exactly.
 */

// ============================================
// TRANSACTIONS TABLE
// ============================================
export interface TransactionInsert {
    user_id: string;                    // TEXT, required
    uuid_user_id: string;               // UUID, nullable but we always set it
    amount: number;                     // NUMERIC, required
    category: string;                   // TEXT, required (default: 'Other')
    name: string;                       // TEXT, required
    date: string;                       // DATE (YYYY-MM-DD), required
    merchant_name?: string | null;      // TEXT, nullable
    tip?: number | null;                // NUMERIC, nullable
    tax?: number | null;                // NUMERIC, nullable
    location?: string | null;           // TEXT, nullable
    source?: string;                    // TEXT, default: 'plaid'
    pending?: boolean;                  // BOOLEAN, default: false
    plaid_transaction_id?: string | null; // TEXT, nullable
    account_id?: string | null;         // TEXT, nullable
}

export interface TransactionRow extends TransactionInsert {
    id: string;                         // UUID, auto-generated
    created_at: string;                 // TIMESTAMPTZ, auto-generated
    updated_at: string;                 // TIMESTAMPTZ, auto-generated
}

// ============================================
// INCOME TABLE
// ============================================
export interface IncomeInsert {
    user_id: string;                    // TEXT, required
    uuid_user_id: string;               // UUID, nullable but we always set it
    amount: number;                     // NUMERIC, required
    source: string;                     // TEXT, required
    name: string;                       // TEXT, required
    date: string;                       // DATE (YYYY-MM-DD), required
    recurring?: boolean;                // BOOLEAN, default: true
    frequency?: string | null;          // TEXT, nullable
    location?: string | null;           // TEXT, nullable
}

export interface IncomeRow extends IncomeInsert {
    id: string;                         // UUID, auto-generated
    created_at: string;                 // TIMESTAMPTZ, auto-generated
}

// ============================================
// ACCOUNTS TABLE
// ============================================
export interface AccountInsert {
    user_id: string;                    // TEXT, required
    uuid_user_id: string;               // UUID, nullable but we always set it
    name: string;                       // TEXT, required
    type: string;                       // TEXT, required
    plaid_account_id?: string | null;   // TEXT, nullable, unique
    plaid_item_id?: string | null;      // TEXT, nullable
    official_name?: string | null;      // TEXT, nullable
    subtype?: string | null;            // TEXT, nullable
    institution_name?: string | null;   // TEXT, nullable
    current_balance?: number;           // NUMERIC, default: 0
    available_balance?: number | null;  // NUMERIC, nullable
    credit_limit?: number | null;       // NUMERIC, nullable
    mask?: string | null;               // TEXT, nullable
    iso_currency_code?: string;         // TEXT, default: 'USD'
    location?: string | null;           // TEXT, nullable
    last_synced_at?: string;            // TIMESTAMPTZ, default: now()
}

export interface AccountRow extends AccountInsert {
    id: string;                         // UUID, auto-generated
    created_at: string;                 // TIMESTAMPTZ, auto-generated
}

// ============================================
// HOLDINGS TABLE
// ============================================
export interface HoldingInsert {
    user_id: string;                    // TEXT, required
    uuid_user_id: string;               // UUID, nullable but we always set it
    symbol: string;                     // TEXT, required
    name: string;                       // TEXT, required
    quantity?: number;                  // NUMERIC, default: 0
    price?: number;                     // NUMERIC, default: 0
    value?: number;                     // NUMERIC, default: 0
    cost_basis?: number | null;         // NUMERIC, nullable
    gain_loss?: number | null;          // NUMERIC, nullable
    gain_loss_percent?: number | null;  // NUMERIC, nullable
    account_id?: string | null;         // UUID, nullable
    plaid_security_id?: string | null;  // TEXT, nullable
    location?: string | null;           // TEXT, nullable
    last_updated_at?: string;           // TIMESTAMPTZ, default: now()
}

export interface HoldingRow extends HoldingInsert {
    id: string;                         // UUID, auto-generated
    created_at: string;                 // TIMESTAMPTZ, auto-generated
}

// ============================================
// USER_PLAID_CONNECTIONS TABLE
// ============================================
export interface UserPlaidConnectionInsert {
    user_id: string;                    // TEXT, required
    uuid_user_id: string;               // UUID, nullable but we always set it
    is_connected?: boolean;             // BOOLEAN, default: false
    plaid_item_id?: string | null;      // TEXT, nullable
    connected_at?: string | null;       // TIMESTAMPTZ, nullable
    last_sync_at?: string | null;       // TIMESTAMPTZ, nullable
}

export interface UserPlaidConnectionRow extends UserPlaidConnectionInsert {
    id: string;                         // UUID, auto-generated
    created_at: string;                 // TIMESTAMPTZ, auto-generated
}

// ============================================
// PLAID_ITEMS TABLE
// ============================================
export interface PlaidItemInsert {
    user_id: string;                    // TEXT, required
    uuid_user_id: string;               // UUID, nullable but we always set it
    item_id: string;                    // TEXT, required, unique
    access_token: string;               // TEXT, required
    institution_id?: string | null;     // TEXT, nullable
    institution_name?: string | null;   // TEXT, nullable
    status?: string;                    // TEXT, default: 'active'
    updated_at?: string;                // TIMESTAMPTZ, default: now()
}

export interface PlaidItemRow extends PlaidItemInsert {
    id: string;                         // UUID, auto-generated
    created_at: string;                 // TIMESTAMPTZ, auto-generated
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Transform a generated transaction to database format
 */
export function toTransactionInsert(
    userId: string,
    tx: {
        amount: number;
        category?: string;
        name?: string;
        merchant_name?: string;
        date: string;
        tip?: number | null;
        tax?: number | null;
        location?: string | null;
        source?: string;
    }
): TransactionInsert {
    return {
        user_id: userId,
        uuid_user_id: userId,
        amount: tx.amount,
        category: tx.category || 'Other',
        name: tx.name || tx.merchant_name || 'Unknown',
        merchant_name: tx.merchant_name || tx.name || null,
        date: tx.date,
        tip: tx.tip ?? null,
        tax: tx.tax ?? null,
        location: tx.location ?? null,
        source: tx.source || 'manual',
        pending: false,
    };
}

/**
 * Transform a generated income record to database format
 */
export function toIncomeInsert(
    userId: string,
    inc: {
        amount: number;
        source?: string;
        name?: string;
        date: string;
        recurring?: boolean;
        frequency?: string;
        location?: string | null;
    }
): IncomeInsert {
    return {
        user_id: userId,
        uuid_user_id: userId,
        amount: inc.amount,
        source: inc.source || 'Salary',
        name: inc.name || inc.source || 'Salary',
        date: inc.date,
        recurring: inc.recurring ?? true,
        frequency: inc.frequency || 'monthly',
        location: inc.location ?? null,
    };
}

/**
 * Transform a generated holding to database format
 */
export function toHoldingInsert(
    userId: string,
    holding: {
        symbol: string;
        name: string;
        quantity?: number;
        price?: number;
        value?: number;
        cost_basis?: number | null;
        gain_loss?: number | null;
        gain_loss_percent?: number | null;
        location?: string | null;
    }
): HoldingInsert {
    return {
        user_id: userId,
        uuid_user_id: userId,
        symbol: holding.symbol,
        name: holding.name,
        quantity: holding.quantity || 0,
        price: holding.price || 0,
        value: holding.value || 0,
        cost_basis: holding.cost_basis ?? null,
        gain_loss: holding.gain_loss ?? null,
        gain_loss_percent: holding.gain_loss_percent ?? null,
        location: holding.location ?? null,
        plaid_security_id: `sec_${holding.symbol.toLowerCase()}_${Date.now()}`,
        last_updated_at: new Date().toISOString(),
    };
}

/**
 * Transform an account to database format
 */
export function toAccountInsert(
    userId: string,
    account: {
        name: string;
        type: string;
        plaid_account_id?: string;
        plaid_item_id?: string;
        official_name?: string | null;
        subtype?: string | null;
        institution_name?: string | null;
        current_balance?: number;
        available_balance?: number | null;
        credit_limit?: number | null;
        mask?: string | null;
        iso_currency_code?: string;
        location?: string | null;
    }
): AccountInsert {
    return {
        user_id: userId,
        uuid_user_id: userId,
        name: account.name,
        type: account.type,
        plaid_account_id: account.plaid_account_id || null,
        plaid_item_id: account.plaid_item_id || null,
        official_name: account.official_name ?? null,
        subtype: account.subtype ?? null,
        institution_name: account.institution_name ?? null,
        current_balance: account.current_balance || 0,
        available_balance: account.available_balance ?? null,
        credit_limit: account.credit_limit ?? null,
        mask: account.mask ?? null,
        iso_currency_code: account.iso_currency_code || 'USD',
        location: account.location ?? null,
        last_synced_at: new Date().toISOString(),
    };
}
