/**
 * Validación centralizada de variables de entorno (F0-06).
 * Durante `next build` no debe lanzar.
 */

const REQUIRED_IN_PROD = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "JWT_SECRET",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "MERCADOPAGO_ACCESS_TOKEN",
  "MERCADOPAGO_WEBHOOK_SECRET",
  "CRON_SECRET",
  "NEXT_PUBLIC_BASE_URL",
] as const;

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return (
    value.includes("tu-") ||
    value.includes("cambiar-") ||
    value === "dev-secret-change-in-prod" ||
    value === "TEST-token"
  );
}

export function validateEnv(): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const isProd = process.env.NODE_ENV === "production";
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const key of REQUIRED_IN_PROD) {
    const value = process.env[key];
    if (isPlaceholder(value)) {
      if (isProd) missing.push(key);
      else warnings.push(`${key} no configurado o es placeholder`);
    }
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    if (isProd) missing.push("JWT_SECRET (mínimo 32 caracteres)");
    else warnings.push("JWT_SECRET demasiado corto");
  }

  return { valid: missing.length === 0, missing, warnings };
}

export function ensureEnvValidated(): void {
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NEXT_PHASE === "phase-export"
  ) {
    return;
  }

  const { valid, missing, warnings } = validateEnv();
  warnings.forEach((w) => console.warn(`[Env] ⚠️  ${w}`));
  if (!valid) {
    const msg = `[Env] ❌ Variables de entorno faltantes o inválidas: ${missing.join(", ")}.`;
    if (process.env.NODE_ENV === "production") {
      throw new Error(msg);
    }
    console.error(msg);
  }
}

export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Variable de entorno requerida no configurada: ${key}`);
  }
  return value;
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;
  if (isPlaceholder(url) || isPlaceholder(key)) return false;
  return true;
}

export function allowDemoMode(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.ALLOW_DEMO === "true" || !isSupabaseConfigured();
}
