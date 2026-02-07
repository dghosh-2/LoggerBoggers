-- Purchase Locations Table
-- Stores geocoded locations from receipt scans for the Globe feature

CREATE TABLE IF NOT EXISTS purchase_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    -- `user_id` should match `auth.uid()` (a UUID). Avoid a hard FK here since
    -- many Supabase projects don't have a public `users` table.
    user_id UUID NOT NULL,
    -- Backwards-compat: older code used `transaction_id`; newer code uses
    -- `financial_transaction_id`. Both are optional and not enforced via FK.
    transaction_id UUID,
    financial_transaction_id UUID,

    -- Location data
    address TEXT NOT NULL,
    merchant_name TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,

    -- Transaction details
    amount DECIMAL(10, 2) NOT NULL,
    category TEXT DEFAULT 'Other',
    date DATE NOT NULL,

    -- Metadata
    source TEXT DEFAULT 'receipt_scan', -- 'receipt_scan', 'manual', 'plaid'
    receipt_image_url TEXT,
    raw_ocr_text TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure new columns exist even if the table already existed.
ALTER TABLE purchase_locations ADD COLUMN IF NOT EXISTS transaction_id UUID;
ALTER TABLE purchase_locations ADD COLUMN IF NOT EXISTS financial_transaction_id UUID;

-- Index for fast user queries with date filtering
CREATE INDEX IF NOT EXISTS idx_purchase_locations_user_date
ON purchase_locations(user_id, date DESC);

-- Index for geospatial queries (if needed in future)
CREATE INDEX IF NOT EXISTS idx_purchase_locations_coords
ON purchase_locations(latitude, longitude);

-- Enable Row Level Security
ALTER TABLE purchase_locations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own locations
CREATE POLICY "Users can view own purchase locations"
ON purchase_locations FOR SELECT
USING (user_id = auth.uid()::uuid);

-- Policy: Users can insert their own locations
CREATE POLICY "Users can insert own purchase locations"
ON purchase_locations FOR INSERT
WITH CHECK (user_id = auth.uid()::uuid);

-- Policy: Users can update their own locations
CREATE POLICY "Users can update own purchase locations"
ON purchase_locations FOR UPDATE
USING (user_id = auth.uid()::uuid);

-- Policy: Users can delete their own locations
CREATE POLICY "Users can delete own purchase locations"
ON purchase_locations FOR DELETE
USING (user_id = auth.uid()::uuid);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_purchase_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_purchase_locations_updated_at
    BEFORE UPDATE ON purchase_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_locations_updated_at();
