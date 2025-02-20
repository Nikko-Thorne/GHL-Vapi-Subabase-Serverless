import { createClient } from '@supabase/supabase-js';

// Log environment check on initialization
console.log('Supabase Environment Check:', {
  hasUrl: !!import.meta.env.VITE_SUPABASE_URL,
  hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  environment: import.meta.env.MODE
});

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
});
