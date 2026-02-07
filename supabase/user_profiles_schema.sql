-- ============================================
-- USER PROFILES / ONBOARDING STORAGE
-- Safe to run multiple times (idempotent-ish).
-- ============================================

CREATE TABLE IF NOT EXISTS user_profiles (
    uuid_user_id UUID PRIMARY KEY,
    age INTEGER,
    location TEXT,
    risk_tolerance TEXT,
    debt_profile TEXT,
    income_status TEXT,
    custom_request TEXT,
    allocation JSONB,
    onboarding_complete BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS risk_tolerance TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS debt_profile TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS income_status TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS custom_request TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS allocation JSONB;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_user_profiles_uuid_user_id ON user_profiles(uuid_user_id);

