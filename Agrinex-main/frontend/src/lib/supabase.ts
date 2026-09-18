import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment with default live fallback
const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  'https://kadnaninffoyblgfhxvn.supabase.co';

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  'sb_publishable_l7Y753kIiLfjPd5MM0y5WQ_VIkJYj6M';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('xyzcompany')
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export default supabase;
