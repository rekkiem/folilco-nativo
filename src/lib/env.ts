/**
 * Validación centralizada de variables de entorno.
 * Importar en las rutas API que lo necesiten.
 * En producción falla rápido si faltan variables críticas.
 */

interface EnvSchema {
  key: string;
  required: boolean;
  secret?: boolean; // No loggear el valor
}

const SERVER_ENV: EnvSchema[] = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", required: true },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", required: true, secret: true },
  { key: "SUPABASE_SERVICE_ROLE_KEY", required: true, secret: true },
  { key: "MERCADOPAGO_ACCESS_TOKEN", required: true, secret: true },
  { key: "MERCADOPAGO_WEBHOOK_SECRET", required: false, secret: true },
  { key: "TWILIO_ACCOUNT_SID", required: false, secret: true },
  { key: "TWILIO_AUTH_TOKEN", required: false, secret: true },
  { key: "TWILIO_WHATSAPP_FROM", required: false },
  { key: "GOOGLE_SERVICE_ACCOUNT_EMAIL", required: false },
  { key: "GOOGLE_PRIVATE_KEY", required: false, secret: true },
  { key: "GOOGLE_SPREADSHEET_ID", required: false },
  { key: "ADMIN_USERNAME", required: true },
  { key: "ADMIN_PASSWORD", required: true, secret: true },
  { key: "JWT_SECRET", required: true, secret: true },
  { key: "NEXT_PUBLIC_BASE_URL", required: true },
  { key: "CRON_SECRET", required: false, secret: true },
];

export function validateEnv(): { valid: boolean; missing: string[]; warnings: string[] } {
  const isProd = process.env.NODE_ENV === "production";
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const schema of SERVER_ENV) {
    const value = process.env[schema.key];
    if (!value) {
      if (schema.required || isProd) {
        missing.push(schema.key);
      } else {
        warnings.push(`${schema.key} no configurado (funcionalidad opcional deshabilitada)`);
      }
    }
  }

  return { valid: missing.length === 0, missing, warnings };
}

export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Variable de entorno requerida no configurada: ${key}`);
  }
  return value;
}

// Validación lazy: se ejecuta solo en runtime del servidor
let validated = false;
export function ensureEnvValidated() {
  if (validated) return;
  validated = true;
  const { valid, missing, warnings } = validateEnv();
  if (warnings.length > 0) {
    warnings.forEach((w) => console.warn(`[Env] ⚠️  ${w}`));
  }
  if (!valid) {
    const msg = `[Env] ❌ Variables de entorno faltantes: ${missing.join(", ")}`;
    if (process.env.NODE_ENV === "production") {
      throw new Error(msg);
    } else {
      console.error(msg);
    }
  }
}
