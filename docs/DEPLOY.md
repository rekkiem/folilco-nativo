# 🚀 Guía de Despliegue – Folilco Nativo

## Requisitos previos

- [ ] Node.js 20+
- [ ] Cuenta en Vercel (gratuita)
- [ ] Cuenta en Supabase (gratuita)
- [ ] Cuenta en MercadoPago Chile (mercadopago.cl/developers)
- [ ] Cuenta en Twilio con WhatsApp Sandbox habilitado
- [ ] Cuenta de Google Cloud con Google Sheets API activada

---

## 1. Clonar y preparar

```bash
git clone https://github.com/tu-usuario/folilco-nativo.git
cd folilco-nativo
npm install
cp .env.example .env.local
```

---

## 2. Supabase – Base de datos

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** → pegar y ejecutar el contenido de `supabase/schema.sql`
3. En **Settings → API**, copiar:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

---

## 3. MercadoPago

1. Ir a [mercadopago.cl/developers/panel](https://mercadopago.cl/developers/panel)
2. Crear aplicación → copiar **Access Token** y **Public Key**
3. En **Webhooks**, configurar:
   - URL: `https://tu-dominio.vercel.app/api/webhooks/mercadopago`
   - Eventos: `payment`
4. Copiar el **Webhook secret** (o generarlo con `openssl rand -hex 32`)

```env
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
MERCADOPAGO_PUBLIC_KEY=APP_USR-...
MERCADOPAGO_WEBHOOK_SECRET=...
```

---

## 4. Twilio WhatsApp

1. Ir a [console.twilio.com](https://console.twilio.com)
2. Crear cuenta → ir a **Messaging → Try it out → WhatsApp**
3. Activar el **Sandbox** y seguir instrucciones para verificar número
4. Para producción: solicitar número dedicado de WhatsApp Business
5. Copiar `Account SID` y `Auth Token`

```env
TWILIO_ACCOUNT_SID=ACxxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

> **Costo estimado**: ~$0.005 USD por mensaje. Con 100 reservas/mes ≈ $1.5 USD/mes.

---

## 5. Google Sheets API

### 5a. Crear Service Account

1. Ir a [console.cloud.google.com](https://console.cloud.google.com)
2. Crear proyecto → activar **Google Sheets API**
3. IAM → **Service Accounts** → crear cuenta
4. Descargar JSON de credenciales
5. Copiar `client_email` y `private_key` del JSON

### 5b. Preparar la hoja de cálculo

1. Crear nuevo Google Sheet
2. Renombrar la hoja default como `reservas`
3. Agregar las hojas: `agenda_compartida`, `stock`, `ingresos_por_socio`
4. Compartir la hoja con el email del service account (editor)
5. Copiar el ID del spreadsheet de la URL (el string largo entre `/d/` y `/edit`)

### 5c. Inicializar las cabeceras

```bash
# Ejecutar una vez después del deploy
curl -X POST https://tu-dominio.vercel.app/api/admin/sheets/init
```

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=folilco@proyecto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=1BxiMVs0XRA5...
```

---

## 6. Despliegue en Vercel

```bash
npm install -g vercel
vercel login
vercel --prod
```

### Configurar variables de entorno en Vercel

1. Ir a tu proyecto en [vercel.com](https://vercel.com)
2. **Settings → Environment Variables**
3. Agregar todas las variables de `.env.example`

O por CLI:
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
# ... repetir para todas las variables
```

### Configurar dominio personalizado

1. **Settings → Domains** → agregar `folilco.com`
2. Actualizar DNS en tu proveedor de dominio:
   - `CNAME @ cname.vercel-dns.com`

---

## 7. Configurar Cron Job (WhatsApp automático)

El archivo `vercel.json` ya configura el cron para ejecutar cada hora.
Verificar en **Vercel Dashboard → Settings → Cron Jobs**.

Para el cron funcione correctamente:
```env
CRON_SECRET=genera-un-secret-aleatorio-aqui
```

---

## 8. Variables de entorno completas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
MERCADOPAGO_PUBLIC_KEY=APP_USR-...
MERCADOPAGO_WEBHOOK_SECRET=...

# Twilio
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Google Sheets
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@yyy.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=xxx

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password-muy-fuerte-min-12-chars
JWT_SECRET=secret-aleatorio-32-chars-minimo

# URLs
NEXT_PUBLIC_BASE_URL=https://folilco.com
CRON_SECRET=otro-secret-aleatorio
```

---

## 9. Pruebas de humo post-deploy

```bash
BASE_URL=https://folilco.com \
ADMIN_USER=admin \
ADMIN_PASS=tu-password \
bash scripts/smoke-test.sh
```

---

## 10. Costos estimados por mes

| Servicio | Plan | Costo/mes |
|----------|------|-----------|
| Vercel | Hobby (gratuito) o Pro | $0–20 |
| Supabase | Free tier | $0 |
| Twilio WhatsApp | ~100 mensajes × $0.005 | ~$0.50 |
| Dominio `.cl` | Anual / 12 | ~$1.5 |
| **Total estimado** | | **< $25 USD** |

---

## 11. Flujo de prueba manual (primer día)

1. **Ir a** `https://folilco.com/reservar`
2. **Seleccionar** "Cabaña del Bosque"
3. **Elegir fechas** futuras (verificar que el calendario carga)
4. **Completar datos** con número WhatsApp real
5. **Pagar** con tarjeta de prueba MP: `4170 0688 1010 8020` CVV: `123`
6. **Verificar** que llegue WhatsApp de confirmación (< 30 seg)
7. **Revisar** Google Sheets → hoja `reservas` → nueva fila
8. **Entrar al admin** en `/admin/login` → verificar reserva en dashboard

---

## FAQ

**¿Qué pasa si el internet se corta durante el pago?**
MercadoPago tiene su propio sistema de reintentos. El webhook llega cuando se restaura la conexión.

**¿Cómo agrego un nuevo producto?**
Insertar directamente en Supabase → tabla `productos`, o crear un endpoint admin para ello.

**¿Cómo bloqueo fechas manualmente?**
Insertar en la tabla `bloqueos` desde Supabase con el `producto_id` y rango de fechas.

**¿Cómo sincronizo con Airbnb?**
1. Copiar la URL: `https://folilco.com/api/ics?producto_id=TU_ID`
2. En Airbnb → Calendario → Importar calendario → pegar la URL
