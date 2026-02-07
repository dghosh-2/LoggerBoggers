import { createClient } from '@supabase/supabase-js';
import { getEnvFallback } from '@/lib/envFallback';

export async function getServiceSupabase() {
    const url = (await getEnvFallback('NEXT_PUBLIC_SUPABASE_URL')) ?? undefined;
    const serviceKey = (await getEnvFallback('SUPABASE_SERVICE_ROLE_KEY')) ?? undefined;
    if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
    if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY (required to store OCR results server-side)');

    return createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
}
