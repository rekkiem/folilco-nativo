/**
 * Cache local de disponibilidad usando localStorage.
 * Permite funcionamiento parcial sin internet.
 * TTL: 5 minutos por entrada de calendario.
 */

const CACHE_PREFIX = "folilco_avail_";
const TTL_MS = 5 * 60 * 1000; // 5 minutos

interface CacheEntry {
  fechas_bloqueadas: string[];
  cachedAt: number;
}

function cacheKey(productoId: string, mes: string): string {
  return `${CACHE_PREFIX}${productoId}_${mes}`;
}

export function getCachedAvailability(
  productoId: string,
  mes: string
): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey(productoId, mes));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.cachedAt > TTL_MS) {
      localStorage.removeItem(cacheKey(productoId, mes));
      return null;
    }
    return entry.fechas_bloqueadas;
  } catch {
    return null;
  }
}

export function setCachedAvailability(
  productoId: string,
  mes: string,
  fechas: string[]
): void {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry = { fechas_bloqueadas: fechas, cachedAt: Date.now() };
    localStorage.setItem(cacheKey(productoId, mes), JSON.stringify(entry));
  } catch {
    // localStorage lleno o bloqueado — continuar sin cache
  }
}

export function invalidateAvailabilityCache(productoId?: string): void {
  if (typeof window === "undefined") return;
  try {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(CACHE_PREFIX) &&
      (productoId ? k.includes(productoId) : true)
    );
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // silencioso
  }
}

/**
 * Hook para detectar si el cliente está offline
 */
export function useOnlineStatus() {
  if (typeof window === "undefined") return true;
  return navigator.onLine;
}
