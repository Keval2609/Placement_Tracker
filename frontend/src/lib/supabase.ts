import { createClient } from "@supabase/supabase-js";

// Frontend uses the public anon key only. The service role key must never be
// shipped to the client.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
