/**
 * Rate limiter en memoria con TTL.
 * Para producción con alta carga usar Upstash Redis.
 * En Vercel serverless cada instancia tiene su propio store
 * (suficiente para el volumen esperado del MVP).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup periódico para no acumular entradas antiguas
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (v.resetAt < now) store.delete(k);
  }
}, 60_000);
cleanupTimer.unref?.();

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export function rateLimit(options: RateLimitOptions) {
  return function check(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    let entry = store.get(identifier);

    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + options.windowMs };
      store.set(identifier, entry);
    }

    entry.count++;

    return {
      allowed: entry.count <= options.max,
      remaining: Math.max(0, options.max - entry.count),
      resetAt: entry.resetAt,
    };
  };
}

// Limitadores preconfigurados para cada contexto
export const webhookLimiter = rateLimit({ windowMs: 60_000, max: 30 });
export const reservaLimiter = rateLimit({ windowMs: 60_000, max: 10 });
export const adminLoginLimiter = rateLimit({ windowMs: 15 * 60_000, max: 5 });
export const availabilityLimiter = rateLimit({ windowMs: 60_000, max: 60 });

/**
 * Obtener IP real del cliente, considerando proxies de Vercel/Cloudflare.
 */
export function getClientIP(req: Request): string {
  const headers = [
    "x-real-ip",
    "x-forwarded-for",
    "cf-connecting-ip",
  ];
  for (const h of headers) {
    const val = req.headers.get(h);
    if (val) return val.split(",")[0].trim();
  }
  return "unknown";
}

/**
 * Helper para responder con cabeceras de rate-limit estándar.
 */
export function rateLimitHeaders(remaining: number, resetAt: number): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
    "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
  };
}
