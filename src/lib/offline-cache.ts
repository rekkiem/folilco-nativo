/**
 * Cache local de disponibilidad usando localStorage.
 * Permite funcionamiento parcial sin internet:
 * - Leer fechas bloqueadas del último fetch
 * - Mostrar "última actualización" al usuario
 * Solo se ejecuta en el cliente (browser).
 */

const CACHE_PREFIX = "folilco_avail_";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

interface CacheEntry {
  fechas_bloqueadas: string[];
  fetched_at: number;
  producto_id: string;
  mes: string;
}

function cacheKey(productoId: string, mes: string): string {
  return `${CACHE_PREFIX}${productoId}_${mes}`;
}

export function guardarDisponibilidadCache(
  productoId: string,
  mes: string,
  fechasBloqueadas: string[]
): void {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry = {
      fechas_bloqueadas: fechasBloqueadas,
      fetched_at: Date.now(),
      producto_id: productoId,
      mes,
    };
    localStorage.setItem(cacheKey(productoId, mes), JSON.stringify(entry));
  } catch {
    // localStorage puede estar deshabilitado o lleno – no es fatal
  }
}

export function leerDisponibilidadCache(
  productoId: string,
  mes: string
): { fechas_bloqueadas: string[]; stale: boolean; fetched_at: Date } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey(productoId, mes));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    const age = Date.now() - entry.fetched_at;
    return {
      fechas_bloqueadas: entry.fechas_bloqueadas,
      stale: age > CACHE_TTL_MS,
      fetched_at: new Date(entry.fetched_at),
    };
  } catch {
    return null;
  }
}

export function limpiarCacheAntiguo(): void {
  if (typeof window === "undefined") return;
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX));
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const entry: CacheEntry = JSON.parse(raw);
      if (Date.now() - entry.fetched_at > CACHE_TTL_MS * 4) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Silencioso
  }
}
