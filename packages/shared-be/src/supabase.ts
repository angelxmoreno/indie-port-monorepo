import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
    if (_supabase) return _supabase;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
        throw new Error('SUPABASE_URL environment variable is required');
    }

    if (!supabaseAnonKey) {
        throw new Error('SUPABASE_ANON_KEY environment variable is required');
    }

    _supabase = createClient(supabaseUrl, supabaseAnonKey);
    return _supabase;
}
