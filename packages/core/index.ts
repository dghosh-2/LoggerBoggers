import { createClient } from '@supabase/supabase-js';

// --- Shared Types ---
export interface Receipt {
    id: string;
    user_id: string;
    image_url: string;
    status: 'pending' | 'processing' | 'ready' | 'confirmed' | 'failed';
    total_amount?: number;
    merchant_name?: string;
    transaction_date?: string;
}

export interface Extraction {
    id: string;
    receipt_id: string;
    extracted_json: any;
    confidence?: number;
}

// --- Supabase Client ---
// We use a dynamic check but avoid top-level requires that break Next.js
const getSupabaseConfig = () => {
    const isMobile = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

    return { url, key, isMobile };
};

const config = getSupabaseConfig();

export const supabase = createClient(config.url, config.key, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
    },
});
