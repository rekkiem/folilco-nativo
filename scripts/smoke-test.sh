#!/usr/bin/env bash
# ============================================================
# FOLILCO NATIVO – Script de Pruebas de Humo
# Uso: BASE_URL=https://tu-dominio.vercel.app bash smoke-test.sh
# ============================================================

BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:-tu-password}"
VERDE="\033[32m"
ROJO="\033[31m"
AMARILLO="\033[33m"
RESET="\033[0m"
PASS=0; FAIL=0

check() {
  local label="$1" expected="$2" actual="$3"
  if echo "$actual" | grep -q "$expected" 2>/dev/null; then
    echo -e "${VERDE}✅ PASS${RESET}: $label"
    ((PASS++))
  else
    echo -e "${ROJO}❌ FAIL${RESET}: $label"
    echo -e "   Esperado: ${AMARILLO}$expected${RESET}"
    echo -e "   Obtenido: $actual" | head -3
    ((FAIL++))
  fi
}

echo ""
echo "============================================"
echo "  🌿 FOLILCO NATIVO – PRUEBAS DE HUMO"
echo "  Base URL: $BASE_URL"
echo "============================================"
echo ""

# ── 1. HOMEPAGE ───────────────────────────────────────────
echo "── 1. FRONTEND PÚBLICO ──────────────────────"
R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
check "GET / → 200" "200" "$R"

R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/reservar")
check "GET /reservar → 200" "200" "$R"

R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/gracias")
check "GET /gracias → 200" "200" "$R"

# ── 2. API PRODUCTOS ──────────────────────────────────────
echo ""
echo "── 2. API PRODUCTOS ─────────────────────────"
R=$(curl -s "$BASE_URL/api/products")
check "GET /api/products → array JSON" "\[" "$R"
check "GET /api/products → tiene nombre" "nombre" "$R"

R=$(curl -s "$BASE_URL/api/products?tipo=alojamiento")
check "GET /api/products?tipo=alojamiento" "alojamiento" "$R"

# ── 3. DISPONIBILIDAD ─────────────────────────────────────
echo ""
echo "── 3. API DISPONIBILIDAD ────────────────────"

# Extraer primer producto
PROD_ID=$(curl -s "$BASE_URL/api/products" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$PROD_ID" ]; then
  # Fecha futura (30 días)
  FECHA_INI=$(date -d "+30 days" +%Y-%m-%d 2>/dev/null || date -v+30d +%Y-%m-%d)
  FECHA_FIN=$(date -d "+32 days" +%Y-%m-%d 2>/dev/null || date -v+32d +%Y-%m-%d)

  R=$(curl -s "$BASE_URL/api/availability?producto_id=$PROD_ID&fecha_inicio=$FECHA_INI&fecha_fin=$FECHA_FIN")
  check "GET /api/availability → disponible" "disponible" "$R"
  check "GET /api/availability → tiene precio" "precio_total_clp" "$R"

  # Fechas inválidas (pasado)
  R=$(curl -s "$BASE_URL/api/availability?producto_id=$PROD_ID&fecha_inicio=2020-01-01&fecha_fin=2020-01-03")
  check "GET /api/availability fechas pasadas → error" "error" "$R"

  # Calendario del mes
  MES=$(date +%Y-%m)
  R=$(curl -s -X POST "$BASE_URL/api/availability" \
    -H "Content-Type: application/json" \
    -d "{\"producto_id\":\"$PROD_ID\",\"mes\":\"$MES\"}")
  check "POST /api/availability calendario → fechas_bloqueadas" "fechas_bloqueadas" "$R"
else
  echo -e "${AMARILLO}⚠️  SKIP${RESET}: No se pudo obtener producto_id"
fi

# ── 4. CREAR RESERVA (modo test, sin pagar) ───────────────
echo ""
echo "── 4. API RESERVA ───────────────────────────"
if [ -n "$PROD_ID" ]; then
  FECHA_INI=$(date -d "+60 days" +%Y-%m-%d 2>/dev/null || date -v+60d +%Y-%m-%d)
  FECHA_FIN=$(date -d "+62 days" +%Y-%m-%d 2>/dev/null || date -v+62d +%Y-%m-%d)

  R=$(curl -s -X POST "$BASE_URL/api/reservations" \
    -H "Content-Type: application/json" \
    -d "{
      \"producto_id\":\"$PROD_ID\",
      \"fecha_inicio\":\"$FECHA_INI\",
      \"fecha_fin\":\"$FECHA_FIN\",
      \"cantidad_personas\":2,
      \"huesped_nombre\":\"Test Smoke\",
      \"huesped_email\":\"smoke@test.com\",
      \"huesped_telefono\":\"+56912345678\"
    }")
  check "POST /api/reservations → mp_init_point" "mp_init_point" "$R"
  check "POST /api/reservations → numero reserva" "FOL-" "$R"
  check "POST /api/reservations → precio_total_clp" "precio_total_clp" "$R"

  # Payload inválido
  R=$(curl -s -X POST "$BASE_URL/api/reservations" \
    -H "Content-Type: application/json" \
    -d "{\"producto_id\":\"invalid\"}")
  check "POST /api/reservations payload inválido → 400" "error" "$R"
fi

# ── 5. ADMIN LOGIN ────────────────────────────────────────
echo ""
echo "── 5. ADMIN AUTH ────────────────────────────"

# Credenciales correctas
COOKIE_JAR=$(mktemp)
R=$(curl -s -c "$COOKIE_JAR" -X POST "$BASE_URL/api/admin/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}")
check "POST /api/admin/login → success" "success" "$R"

# Credenciales incorrectas
R=$(curl -s -X POST "$BASE_URL/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"wrong","password":"wrong"}')
check "POST /api/admin/login credenciales malas → error" "error" "$R"

# Rate limit login
echo -n "Verificando rate limit login... "
for i in {1..6}; do
  RL=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/admin/login" \
    -H "Content-Type: application/json" -d '{"username":"x","password":"x"}')
done
check "Rate limit login → 429 después de 5 intentos" "429" "$RL"

# ── 6. ADMIN DASHBOARD (con cookie) ──────────────────────
echo ""
echo "── 6. ADMIN API ─────────────────────────────"
R=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/api/admin/dashboard")
check "GET /api/admin/dashboard autenticado → resumen" "resumen" "$R"

R=$(curl -s "$BASE_URL/api/admin/dashboard")
check "GET /api/admin/dashboard sin auth → 401" "No autorizado" "$R"

R=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/api/admin/reservations")
check "GET /api/admin/reservations autenticado → reservas" "reservas" "$R"

R=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/api/admin/stock")
check "GET /api/admin/stock autenticado → array" "\[" "$R"

# ── 7. ICS EXPORT ─────────────────────────────────────────
echo ""
echo "── 7. EXPORTACIÓN ICS ──────────────────────"
if [ -n "$PROD_ID" ]; then
  R=$(curl -s "$BASE_URL/api/ics?producto_id=$PROD_ID" | head -5)
  check "GET /api/ics → BEGIN:VCALENDAR" "BEGIN:VCALENDAR" "$R"
fi

R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/ics")
check "GET /api/ics sin producto_id → 400" "400" "$R"

# ── 8. PERFORMANCE ────────────────────────────────────────
echo ""
echo "── 8. PERFORMANCE ───────────────────────────"
TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/")
check "Homepage < 3s" "^[0-2]\." "$TIME"

TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/api/products")
check "API products < 2s" "^[0-1]\." "$TIME"

# Limpiar
rm -f "$COOKIE_JAR"

# ── RESUMEN ───────────────────────────────────────────────
echo ""
echo "============================================"
echo -e "  ✅ PASS: ${VERDE}$PASS${RESET}  ❌ FAIL: ${ROJO}$FAIL${RESET}"
echo "============================================"
echo ""

if [ $FAIL -gt 0 ]; then
  exit 1
fi
