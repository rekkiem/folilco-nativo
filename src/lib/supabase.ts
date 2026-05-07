import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://demo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "demo-anon-key";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "demo-service-role-key";

// Cliente público (para frontend, respeta RLS)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Cliente admin (para API Routes, bypassa RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export type SupabaseAdmin = typeof supabaseAdmin;
