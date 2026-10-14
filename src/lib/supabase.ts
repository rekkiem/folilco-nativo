import { createClient } from "@supabase/supabase-js";

function requiredEnv(name: string, fallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Variable de entorno requerida no configurada: " + name);
  }
  return fallback;
}

const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL", "https://demo.supabase.co");
const supabaseAnonKey = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "demo-anon-key");
const supabaseServiceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY", "demo-service-role-key");

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
