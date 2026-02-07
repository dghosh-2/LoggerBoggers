-- ============================================
-- CENTRALIZED SCHEMA MIGRATION
-- Run this on your Supabase project: https://jwuqhaejtejoodgxlnpt.supabase.co
-- Go to SQL Editor and paste this entire script
-- ============================================

-- 1. TRANSACTIONS TABLE - Add all missing columns
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS uuid_user_id UUID;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Other';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tip NUMERIC;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tax NUMERIC;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS merchant_name TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS pending BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS plaid_transaction_id TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS account_id TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Make sure required columns are NOT NULL (set defaults first)
UPDATE transactions SET category = 'Other' WHERE category IS NULL;
UPDATE transactions SET name = 'Unknown' WHERE name IS NULL;
UPDATE transactions SET source = 'manual' WHERE source IS NULL;

-- 2. INCOME TABLE - Add all missing columns
ALTER TABLE income ADD COLUMN IF NOT EXISTS uuid_user_id UUID;
ALTER TABLE income ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE income ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE income ADD COLUMN IF NOT EXISTS recurring BOOLEAN DEFAULT true;
ALTER TABLE income ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'monthly';
ALTER TABLE income ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE income ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Set defaults for required columns
UPDATE income SET name = source WHERE name IS NULL;

-- 3. ACCOUNTS TABLE - Add all missing columns
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS uuid_user_id UUID;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 4. HOLDINGS TABLE - Create if not exists
CREATE TABLE IF NOT EXISTS holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT 'default_user',
    uuid_user_id UUID,
    account_id UUID,
    plaid_security_id TEXT,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity NUMERIC DEFAULT 0,
    price NUMERIC DEFAULT 0,
    value NUMERIC DEFAULT 0,
    cost_basis NUMERIC,
    gain_loss NUMERIC,
    gain_loss_percent NUMERIC,
    location TEXT,
    last_updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add columns to holdings if table already exists
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS uuid_user_id UUID;
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS location TEXT;

-- 5. USER_PLAID_CONNECTIONS TABLE - Add missing columns
ALTER TABLE user_plaid_connections ADD COLUMN IF NOT EXISTS uuid_user_id UUID;

-- 6. PLAID_ITEMS TABLE - Create if not exists
CREATE TABLE IF NOT EXISTS plaid_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT 'default_user',
    uuid_user_id UUID,
    item_id TEXT UNIQUE NOT NULL,
    access_token TEXT NOT NULL,
    institution_id TEXT,
    institution_name TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add columns to plaid_items if table already exists
ALTER TABLE plaid_items ADD COLUMN IF NOT EXISTS uuid_user_id UUID;

-- 7. AGGREGATED_STATISTICS TABLE - Create if not exists
CREATE TABLE IF NOT EXISTS aggregated_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid_user_id UUID,
    period_type TEXT NOT NULL,
    period_key TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_spending NUMERIC DEFAULT 0,
    spending_by_category JSONB DEFAULT '{}',
    transaction_count INTEGER DEFAULT 0,
    average_transaction NUMERIC DEFAULT 0,
    largest_transaction NUMERIC DEFAULT 0,
    total_income NUMERIC DEFAULT 0,
    income_count INTEGER DEFAULT 0,
    net_savings NUMERIC DEFAULT 0,
    savings_rate NUMERIC DEFAULT 0,
    total_assets NUMERIC DEFAULT 0,
    total_liabilities NUMERIC DEFAULT 0,
    net_worth NUMERIC DEFAULT 0,
    holdings_value NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_uuid_user_id ON transactions(uuid_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_income_uuid_user_id ON income(uuid_user_id);
CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);
CREATE INDEX IF NOT EXISTS idx_accounts_uuid_user_id ON accounts(uuid_user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_uuid_user_id ON holdings(uuid_user_id);
CREATE INDEX IF NOT EXISTS idx_aggregated_statistics_uuid_user_id ON aggregated_statistics(uuid_user_id);

-- 9. Add foreign key constraints (optional - comment out if causing issues)
-- These link uuid_user_id to the users table
-- ALTER TABLE transactions ADD CONSTRAINT transactions_uuid_user_id_fkey 
--     FOREIGN KEY (uuid_user_id) REFERENCES users(id);
-- ALTER TABLE income ADD CONSTRAINT income_uuid_user_id_fkey 
--     FOREIGN KEY (uuid_user_id) REFERENCES users(id);
-- ALTER TABLE accounts ADD CONSTRAINT accounts_uuid_user_id_fkey 
--     FOREIGN KEY (uuid_user_id) REFERENCES users(id);
-- ALTER TABLE holdings ADD CONSTRAINT holdings_uuid_user_id_fkey 
--     FOREIGN KEY (uuid_user_id) REFERENCES users(id);

-- Done! Your schema is now aligned with the application code.
SELECT 'Schema migration complete!' as status;
