import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database
export interface Transaction {
    id?: string;
    user_id?: string;
    plaid_transaction_id?: string;
    amount: number;
    category: string;
    name: string;
    tip?: number | null;
    tax?: number | null;
    date: string;
    account_id?: string;
    source: 'plaid' | 'manual' | 'receipt_scan' | 'generated' | 'capital_one';
    merchant_name?: string;
    location?: string;
    pending?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface Income {
    id?: string;
    user_id?: string;
    amount: number;
    source: string;
    name: string;
    date: string;
    recurring?: boolean;
    frequency?: string;
    location?: string;
    created_at?: string;
}

export interface UserPlaidConnection {
    id?: string;
    user_id?: string;
    is_connected: boolean;
    plaid_item_id?: string;
    connected_at?: string;
    last_sync_at?: string;
}
