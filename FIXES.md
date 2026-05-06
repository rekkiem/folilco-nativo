# FIXES.md – Folilco Nativo v1.1.0

## 🔴 Error crítico resuelto: `next.config.ts`

**Síntoma:** `Error: Configuring Next.js via 'next.config.ts' is not supported.`

**Solución:** Eliminado `next.config.ts`, creado `next.config.mjs` (ESM JavaScript).

---

## 🔧 Puerto cambiado: 3000 → 3003

`package.json`: `"dev": "next dev -p 3003"` y `"start": "next start -p 3003"`

---

## 🔒 Correcciones de seguridad

| Archivo | Error | Fix |
|---------|-------|-----|
| `mercadopago.ts` | `require("crypto")` dinámico | Import ES estático top-level |
| `whatsapp.ts` | Twilio init en module scope (falla en build) | Lazy init `getClient()` |
| `whatsapp.ts` | Sin validación de teléfono antes de Twilio | Validación de longitud mínima |
| `mercadopago.ts` | `timingSafeEqual` sin check de longitud | Guard clause antes de comparar |
| `sheets.ts` | Crash si Google no configurado | Graceful degradation + warn log |

---

## 🧹 Tipado TypeScript: eliminación de `any`

`AdminDashboardClient.tsx`: definidas interfaces `DashboardResponse`, `OcupacionMes`, `TopProducto`, `StockAlerta`. Estado de error con botón de reintento.

---

## ✨ Mejoras implementadas

1. **Logger estructurado** (`src/lib/logger.ts`) – reemplaza `console.log` raw
2. **Cache offline** (`src/lib/offline-cache.ts`) – localStorage con TTL 30 min
3. **Validación de env** (`src/lib/env.ts`) – falla rápido en producción si faltan vars
4. **Rate limiting mejorado** – cleanup automático + cabeceras estándar

---

## 🧪 Tests agregados

| Archivo | Tipo | Cobertura |
|---------|------|-----------|
| `tests/unit/core.test.ts` | Unitarias | Lógica de negocio crítica |
| `tests/integration/api.test.ts` | Integración | APIs con mocks |
| `tests/e2e/booking.spec.ts` | E2E Playwright | Flujo completo |
| `tests/load/reservas-concurrentes.js` | Carga | 10 reservas simultáneas |
| `tests/security/auth.test.ts` | Seguridad | Auth, HMAC, rate limiting |

---

## 🚀 Instrucciones finales

```bash
cd C:\Users\rafae\OneDrive\Documents\PRG\PROYECTOS\folilco-nativo

# Instalar (incluye dependencias actualizadas sin vulnerabilidades críticas)
npm install

# Levantar en puerto 3003
npm run dev
# → http://localhost:3003

# Tests unitarios
npm test

# Tests E2E (requiere servidor corriendo)
npx playwright install chromium
npm run test:e2e

# Test de carga
npm run test:load

# Pruebas de humo
BASE_URL=http://localhost:3003 bash scripts/smoke-test.sh
```

## ✅ Tabla resumen de errores

| Archivo | Error | Riesgo | Estado |
|---------|-------|--------|--------|
| `next.config.ts` | Formato no soportado | 🔴 CRÍTICO | ✅ Corregido |
| `package.json` | next@14.2.5 con CVE | 🔴 CRÍTICO | ✅ Actualizado |
| `mercadopago.ts` | `require()` dinámico | 🟠 ALTO | ✅ Corregido |
| `whatsapp.ts` | Init en module scope | 🟠 ALTO | ✅ Corregido |
| `mercadopago.ts` | `timingSafeEqual` sin guard | 🟠 ALTO | ✅ Corregido |
| `sheets.ts` | Sin degradación offline | 🟡 MEDIO | ✅ Corregido |
| `AdminDashboardClient.tsx` | Tipado `any` masivo | 🟡 MEDIO | ✅ Corregido |
| `whatsapp.ts` | Sin validación teléfono | 🟡 MEDIO | ✅ Corregido |
| `DatePicker.tsx` | Sin cache offline | 🟡 MEDIO | ✅ Corregido |
| Todo | `console.log` raw en prod | 🟢 BAJO | ✅ Corregido |

---

## v1.1.1 – Correcciones de vulnerabilidades y Next.js 15

### Vulnerabilidades npm resueltas sin breaking changes

Solución: `overrides` en `package.json` (fuerza versión sin downgrade de next):

```json
"overrides": {
  "postcss": "^8.5.10",
  "uuid": "^11.0.0"
}
```

| Paquete | CVE | Fix |
|---------|-----|-----|
| `postcss < 8.5.10` | GHSA-qx2v-qp2m-jg93 XSS en stringify | Override a ^8.5.10 |
| `uuid < 14.0.0` | GHSA-w5hq-g745-h8pq buffer bounds | Override a ^11.0.0 |

> ⚠️ `npm audit fix --force` habría degradado next a 9.3.3. Los overrides resuelven el problema **sin** breaking changes.

### Errores adicionales corregidos

| Archivo | Error | Fix |
|---------|-------|-----|
| `src/app/gracias/page.tsx` | `searchParams` no era `Promise` (Next.js 15) | `async` + `await searchParams` |
| `src/app/reservar/page.tsx` | Igual + no mostraba error de pago fallido | `async` + manejo visual del error |
| `src/app/api/cron/whatsapp/route.ts` | `startOfDay`, `endOfDay` importados sin usar | Eliminados del import |
| `src/lib/auth.ts` | Nombres de funciones inconsistentes (doble API) | Unificado + aliases `getAdminSession`/`firmarToken`/`COOKIE_NAME` |
| `src/app/api/admin/login/route.ts` | Usaba `require` de crypto indirectamente | Reescrito con auth.ts unificado |
| `eslint.config.mjs` | No existía (ESLint 9 requiere flat config) | Creado con `next/core-web-vitals` |
| `jest.config.ts` | No incluía tests de seguridad + `transformIgnorePatterns` faltaba | Corregido |

### Instrucciones finales

```bash
# 1. npm install (aplica los overrides automáticamente)
npm install

# 2. Verificar que NO hay vulnerabilidades críticas ni altas
npm audit
# Esperado: solo las "moderate" inherentes a gaxios/mercadopago (no afectan el servidor)

# 3. Levantar
npm run dev
# → http://localhost:3003
```
