# 🌿 Folilco Nativo

**Sistema de reservas y gestión para cooperativa agroturística del sur de Chile.**

[![Next.js](https://img.shields.io/badge/Next.js-15.x-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Descripción

Folilco Nativo es un sistema web completo para la gestión de una cooperativa agroturística ubicada en el sur de Chile (Región de Los Ríos). Permite realizar reservas online de alojamientos y experiencias, procesar pagos con MercadoPago, y automatizar comunicaciones por WhatsApp con los huéspedes.

### Características principales

- 🏡 **Reservas online** — Calendario interactivo con verificación de disponibilidad en tiempo real
- 💳 **Pagos seguros** — Integración con MercadoPago (débito, crédito, transferencia)
- 📱 **WhatsApp automático** — Confirmación, recordatorio 24h antes y solicitud de reseña post-checkout
- 📊 **Dashboard admin** — KPIs, gráficos de ingresos y ocupación, gestión de stock
- 📋 **Google Sheets sync** — Cada reserva se registra automáticamente en la hoja de la cooperativa
- 📅 **Exportación ICS** — Sincronización con Airbnb y Booking.com
- 🔒 **Seguridad** — Rate limiting, verificación de firma HMAC en webhooks, JWT para admin

---

## 🚀 Inicio rápido

### Pre-requisitos

- Node.js 20+
- npm 9+

### Instalación

```bash
git clone https://github.com/tu-usuario/folilco-nativo.git
cd folilco-nativo
npm install
cp .env.example .env.local
# Editar .env.local con tus credenciales
npm run dev
```

El servidor estará disponible en `http://localhost:3003`.

> **Modo demo:** Si no configuras Supabase, el sistema arrancará con datos de demostración automáticamente.

---

## ⚙️ Variables de entorno

Copia `.env.example` como `.env.local` y completa los valores:

```env
# Supabase (base de datos)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
MERCADOPAGO_PUBLIC_KEY=APP_USR-...
MERCADOPAGO_WEBHOOK_SECRET=...

# Twilio (WhatsApp)
TWILIO_ACCOUNT_SID=ACxxxxxxx
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Google Sheets
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=...

# Admin panel
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password-fuerte-aqui
JWT_SECRET=secret-aleatorio-32-chars-minimo

# URLs
NEXT_PUBLIC_BASE_URL=https://folilco.com
CRON_SECRET=otro-secret-aleatorio
```

---

## 📁 Estructura del proyecto

```
folilco-nativo/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Layout raíz con fonts y SEO
│   │   ├── page.tsx            # Landing page pública
│   │   ├── error.tsx           # Error boundary global
│   │   ├── not-found.tsx       # Página 404
│   │   ├── reservar/           # Flujo de reserva (4 pasos)
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   ├── gracias/            # Confirmación post-pago
│   │   ├── admin/              # Panel privado
│   │   │   ├── dashboard/      # KPIs y gráficos
│   │   │   ├── reservations/   # Gestión de reservas
│   │   │   ├── stock/          # Control de inventario
│   │   │   └── calendar/       # Bloqueo manual de fechas
│   │   └── api/
│   │       ├── products/       # GET productos
│   │       ├── availability/   # Verificación + calendario
│   │       ├── reservations/   # Crear reserva + preferencia MP
│   │       ├── webhooks/
│   │       │   └── mercadopago/ # Confirmación de pago
│   │       ├── ics/            # Export .ics para OTAs
│   │       ├── cron/whatsapp/  # Mensajes automáticos
│   │       └── admin/          # APIs privadas del panel
│   ├── components/
│   │   ├── landing/            # Página de inicio
│   │   ├── booking/            # Flujo de reserva
│   │   ├── admin/              # Panel de administración
│   │   └── ui/                 # Componentes reutilizables
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAvailability.ts
│   │   └── useProducts.ts
│   ├── lib/                    # Servicios y utilidades
│   │   ├── supabase.ts         # Cliente Supabase
│   │   ├── mercadopago.ts      # SDK MercadoPago
│   │   ├── whatsapp.ts         # Twilio WhatsApp
│   │   ├── sheets.ts           # Google Sheets API
│   │   ├── auth.ts             # JWT admin
│   │   ├── rate-limit.ts       # Rate limiting
│   │   ├── logger.ts           # Logger estructurado
│   │   ├── offline-cache.ts    # Cache localStorage
│   │   └── env.ts              # Validación de env vars
│   └── types/
│       └── index.ts            # TypeScript types
├── tests/
│   ├── unit/                   # Tests unitarios (Jest)
│   ├── integration/            # Tests de integración
│   ├── e2e/                    # Tests E2E (Playwright)
│   ├── load/                   # Tests de carga
│   └── security/               # Tests de seguridad
├── supabase/
│   └── schema.sql              # Esquema completo de BD
├── docs/
│   ├── DEPLOY.md               # Guía de despliegue
│   ├── MANUAL-COOPERATIVA.md   # Manual para socios
│   └── SPRINT-PLAN.md          # Plan de implementación
└── scripts/
    └── smoke-test.sh           # Pruebas de humo
```

---

## 🛠️ Scripts disponibles

```bash
npm run dev          # Servidor de desarrollo (puerto 3003)
npm run build        # Build de producción
npm run start        # Servidor de producción (puerto 3003)
npm run lint         # ESLint
npm run type-check   # Verificación TypeScript sin compilar
npm test             # Tests unitarios + integración
npm run test:watch   # Tests en modo watch
npm run test:coverage # Tests con cobertura
npm run test:e2e     # Tests E2E con Playwright
npm run test:load    # Test de carga (10 reservas simultáneas)
```

---

## 🗄️ Base de datos

El proyecto usa **PostgreSQL** a través de Supabase. Para inicializar:

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar `supabase/schema.sql`
3. Configurar las variables de entorno

### Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `productos` | Alojamientos, experiencias y productos artesanales |
| `reservas` | Reservas de huéspedes con estado del pago |
| `bloqueos` | Fechas bloqueadas manualmente |
| `reserva_extras` | Productos adicionales por reserva |
| `sensor_iot` | Lecturas del sensor ESP8266 (opcional) |

---

## 💳 Flujo de pago

```
Usuario → /reservar → API /reservations → MercadoPago Checkout
                                                    ↓
Webhook /webhooks/mercadopago ← pago aprobado
         ↓
   Supabase (confirmar reserva)
   WhatsApp (mensaje confirmación)
   Google Sheets (agregar fila)
```

---

## 📅 Cron Jobs (Vercel)

Configurados en `vercel.json`, se ejecutan cada hora:

| Job | Acción |
|-----|--------|
| WhatsApp recordatorio | 24h antes del check-in → oferta de extras |
| WhatsApp reseña | 24h después del check-out → solicitar reseña + cupón 10% |
| Alerta stock bajo | Notifica si producto artesanal < stock mínimo |

---

## 🧪 Tests

```bash
# Unitarios (no requieren servicios externos)
npm test

# E2E (requiere npm run dev corriendo)
npx playwright install chromium
npm run test:e2e

# Carga
npm run test:load
# Con variables: BASE_URL=https://folilco.com CONCURRENCIA=20 npm run test:load

# Smoke test en producción
BASE_URL=https://folilco.com bash scripts/smoke-test.sh
```

---

## 🚢 Despliegue

Ver [docs/DEPLOY.md](docs/DEPLOY.md) para instrucciones completas.

### Resumen rápido (Vercel)

```bash
npm install -g vercel
vercel login
vercel --prod
```

**Costo estimado:** < $25 USD/mes (Vercel Hobby + Supabase Free + Twilio)

---

## 📖 Documentación adicional

- [Manual de la cooperativa](docs/MANUAL-COOPERATIVA.md) — Para socios sin conocimientos técnicos
- [Plan de sprints](docs/SPRINT-PLAN.md) — Roadmap de implementación
- [Guía de despliegue](docs/DEPLOY.md) — Paso a paso en producción

---

## 🤝 Contribuir

1. Fork del repositorio
2. Crear rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'feat: agregar nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Pull Request

---

## 📄 Licencia

MIT © 2025 Cooperativa Folilco Nativo

---

*Hecho con ❤️ en el sur de Chile 🌲*
