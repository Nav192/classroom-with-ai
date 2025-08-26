import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace with your Supabase project URL and Anon key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key are required. Create a .env file in the frontend directory.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
