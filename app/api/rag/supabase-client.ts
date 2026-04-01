import { createClient } from '@supabase/supabase-js';
import { supabaseFetch } from './supabase-fetch';

export const getRagSupabase = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: {
        // Important: this overrides the global fetch with the custom
        // DNS lookup for Jio ISP bypass (104.18.38.10 fallback)
        fetch: supabaseFetch as unknown as typeof fetch
      }
    }
  );
};
