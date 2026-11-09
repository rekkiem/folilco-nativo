# OLA 0 — Setup: Supabase pruebas + Telegram + Vercel

## 1. Segundo proyecto Supabase (pruebas)

1. https://supabase.com/dashboard → **New project**
   - Nombre: `folilco-nativo-test`
   - Región cercana (p. ej. South America)
   - Password de DB: guardar fuera de git
2. SQL Editor → en orden:
   - `supabase/schema.sql` (si falla `pg_cron`, comenta esa línea)
   - `supabase/migrations/0001_hotfix_reservas.sql`
   - `supabase/migrations/0002_ola0_seguridad.sql`
3. Settings → API Keys → **View legacy API keys**
   - `anon` → Preview `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → Preview `SUPABASE_SERVICE_ROLE_KEY` (solo servidor)
4. Project URL → `NEXT_PUBLIC_SUPABASE_URL`

### Variables Vercel

| Variable | Production | Preview |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_*` | prod | test |
| `SUPABASE_SERVICE_ROLE_KEY` | prod | test |
| `MERCADOPAGO_ACCESS_TOKEN` | sandbox hasta cobro real | sandbox |
| `ALLOW_DEMO` | no definir | opcional |
| `JWT_SECRET` | ≥32 chars | otro ≥32 |
| `CRON_SECRET` | ≥16 | ≥16 |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | bot equipo | mismo |
| `NEXT_PUBLIC_BASE_URL` | `https://folilco-nativo.vercel.app` | URL preview |

## 2. Telegram — paso a paso

1. @BotFather → `/newbot` → copiar token `123456:ABC-...`
2. Crear grupo del equipo → añadir el bot
3. Enviar un mensaje en el grupo
4. Abrir: `https://api.telegram.org/bot<TOKEN>/getUpdates`
5. Buscar `"chat":{"id": -100...}` → `TELEGRAM_CHAT_ID`
6. Probar:
```bash
curl -s -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"chat_id":"<CHAT_ID>","text":"Folilco Nativo – bot OK"}'
```
7. En `.env.local` y Vercel:
```env
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_CHAT_ID=-1001234567890
```

Alertas OLA 0: confirmada, huérfano, inconsistente, resumen diario.

## 3. Webhook MP

- Prod: `https://folilco-nativo.vercel.app/api/webhooks/mercadopago`
- Eventos: `payment`
- Secret → `MERCADOPAGO_WEBHOOK_SECRET`

Local: requiere ngrok para webhook; la reserva sí se crea sin él.

## 4. Cron diario

`GET /api/cron/daily` a las 11:00 UTC (Hobby: 1/día, ±59 min).
Header: `Authorization: Bearer $CRON_SECRET`
