-- ============================================================
-- FASE 0 — Hotfix bloqueante (E-01 a E-08)
-- Migración: holds, estados, secuencia, RLS, ics_token, outbox
-- INVERSA: ver 0001_hotfix_reservas_down.sql
-- ============================================================

BEGIN;

-- 1. Columnas nuevas en reservas
ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS expira_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pago_inconsistente BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pago_huerfano BOOLEAN DEFAULT FALSE;

-- 2. Ampliar estados
ALTER TABLE reservas DROP CONSTRAINT IF EXISTS reservas_estado_check;
ALTER TABLE reservas ADD CONSTRAINT reservas_estado_check
  CHECK (estado IN (
    'pendiente', 'confirmada', 'cancelada', 'completada',
    'no_show', 'expirada', 'pago_inconsistente', 'pago_huerfano'
  ));

-- 3. Constraints de fechas
ALTER TABLE reservas DROP CONSTRAINT IF EXISTS reservas_fechas_check;
ALTER TABLE reservas ADD CONSTRAINT reservas_fechas_check
  CHECK (fecha_fin > fecha_inicio);

ALTER TABLE bloqueos DROP CONSTRAINT IF EXISTS bloqueos_fechas_check;
ALTER TABLE bloqueos ADD CONSTRAINT bloqueos_fechas_check
  CHECK (fecha_fin > fecha_inicio);

-- 4. Secuencia para número de reserva
CREATE SEQUENCE IF NOT EXISTS reservas_numero_seq START 1;

CREATE OR REPLACE FUNCTION generate_numero_reserva()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    NEW.numero := 'FOL-' || to_char(NOW() AT TIME ZONE 'America/Santiago', 'YYYY')
                  || '-' || lpad(nextval('reservas_numero_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_numero_reserva ON reservas;
CREATE TRIGGER trg_generate_numero_reserva
  BEFORE INSERT ON reservas
  FOR EACH ROW
  EXECUTE FUNCTION generate_numero_reserva();

-- 5. Función atómica crear_reserva
CREATE OR REPLACE FUNCTION crear_reserva(
  p_producto_id UUID,
  p_fecha_inicio DATE,
  p_fecha_fin DATE,
  p_cantidad_personas INTEGER,
  p_huesped_nombre TEXT,
  p_huesped_email TEXT,
  p_huesped_telefono TEXT,
  p_huesped_rut TEXT DEFAULT NULL,
  p_huesped_nota TEXT DEFAULT NULL,
  p_precio_base_clp INTEGER DEFAULT NULL,
  p_precio_total_clp INTEGER DEFAULT NULL,
  p_origen TEXT DEFAULT 'web',
  p_mp_external_reference TEXT DEFAULT NULL,
  p_hold_minutes INTEGER DEFAULT 30
)
RETURNS reservas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_producto productos%ROWTYPE;
  v_reserva reservas%ROWTYPE;
  v_lock_key BIGINT;
BEGIN
  v_lock_key := hashtextextended(p_producto_id::text, 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT * INTO v_producto FROM productos
    WHERE id = p_producto_id AND activo = TRUE
    FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRODUCTO_NO_ENCONTRADO' USING ERRCODE = 'P0001';
  END IF;

  IF p_cantidad_personas > COALESCE(v_producto.capacidad, 1) THEN
    RAISE EXCEPTION 'CAPACIDAD_EXCEDIDA' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1 FROM reservas r
    WHERE r.producto_id = p_producto_id
      AND r.estado IN ('confirmada', 'pendiente')
      AND (r.estado = 'confirmada' OR (r.estado = 'pendiente' AND r.expira_at > NOW()))
      AND r.fecha_inicio < p_fecha_fin
      AND r.fecha_fin > p_fecha_inicio
  ) THEN
    RAISE EXCEPTION 'FECHAS_NO_DISPONIBLES' USING ERRCODE = 'P0003';
  END IF;

  IF EXISTS (
    SELECT 1 FROM bloqueos b
    WHERE b.producto_id = p_producto_id
      AND b.fecha_inicio < p_fecha_fin
      AND b.fecha_fin > p_fecha_inicio
  ) THEN
    RAISE EXCEPTION 'FECHAS_BLOQUEADAS' USING ERRCODE = 'P0004';
  END IF;

  INSERT INTO reservas (
    huesped_nombre, huesped_email, huesped_telefono, huesped_rut, huesped_nota,
    producto_id, producto_nombre,
    fecha_inicio, fecha_fin, cantidad_personas,
    precio_base_clp, precio_total_clp,
    estado, expira_at, mp_external_reference, origen
  ) VALUES (
    trim(p_huesped_nombre),
    lower(trim(p_huesped_email)),
    trim(p_huesped_telefono),
    NULLIF(trim(COALESCE(p_huesped_rut, '')), ''),
    NULLIF(trim(COALESCE(p_huesped_nota, '')), ''),
    p_producto_id,
    v_producto.nombre,
    p_fecha_inicio,
    p_fecha_fin,
    p_cantidad_personas,
    COALESCE(p_precio_base_clp, v_producto.precio_clp),
    COALESCE(p_precio_total_clp, v_producto.precio_clp),
    'pendiente',
    NOW() + (p_hold_minutes || ' minutes')::interval,
    COALESCE(p_mp_external_reference, gen_random_uuid()::text),
    p_origen
  )
  RETURNING * INTO v_reserva;

  RETURN v_reserva;
END;
$$;

-- 6. Job pg_cron (si disponible)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('expirar-holds') WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'expirar-holds'
    );
    PERFORM cron.schedule(
      'expirar-holds',
      '*/5 * * * *',
      $$UPDATE reservas SET estado = 'expirada', updated_at = NOW()
         WHERE estado = 'pendiente' AND expira_at IS NOT NULL AND expira_at < NOW()$$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron no disponible: %', SQLERRM;
END $$;

-- 7. Token ICS
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS ics_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex');

UPDATE productos SET ics_token = encode(gen_random_bytes(24), 'hex')
WHERE ics_token IS NULL;

-- 8. webhook_eventos
CREATE TABLE IF NOT EXISTS webhook_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor TEXT NOT NULL DEFAULT 'mercadopago',
  evento_id TEXT NOT NULL,
  tipo TEXT,
  payload JSONB,
  estado TEXT NOT NULL DEFAULT 'recibido'
    CHECK (estado IN ('recibido', 'procesado', 'error', 'ignorado')),
  error TEXT,
  recibido_at TIMESTAMPTZ DEFAULT NOW(),
  procesado_at TIMESTAMPTZ,
  UNIQUE (proveedor, evento_id)
);

-- 9. outbox
CREATE TABLE IF NOT EXISTS outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  payload JSONB NOT NULL,
  intentos INTEGER DEFAULT 0,
  max_intentos INTEGER DEFAULT 8,
  proximo_intento TIMESTAMPTZ DEFAULT NOW(),
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'procesando', 'completado', 'fallido')),
  ultimo_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_pendiente
  ON outbox (proximo_intento)
  WHERE estado = 'pendiente';

-- 10. reembolsos
CREATE TABLE IF NOT EXISTS reembolsos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id UUID REFERENCES reservas(id),
  mp_payment_id TEXT,
  monto_clp INTEGER NOT NULL,
  motivo TEXT,
  estado TEXT DEFAULT 'registrado',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. RLS
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bloqueos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserva_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_iot ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE reembolsos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE reservas FROM anon, authenticated;
REVOKE ALL ON TABLE reserva_extras FROM anon, authenticated;
REVOKE ALL ON TABLE admins FROM anon, authenticated;
REVOKE ALL ON TABLE sensor_iot FROM anon, authenticated;
REVOKE ALL ON TABLE webhook_eventos FROM anon, authenticated;
REVOKE ALL ON TABLE outbox FROM anon, authenticated;
REVOKE ALL ON TABLE reembolsos FROM anon, authenticated;
REVOKE ALL ON TABLE bloqueos FROM anon, authenticated;

CREATE OR REPLACE VIEW productos_publicos AS
SELECT
  id, nombre, descripcion, tipo, precio_clp, capacidad,
  imagen_url, activo, duracion_noches, duracion_horas
FROM productos
WHERE activo = TRUE;

GRANT SELECT ON productos_publicos TO anon, authenticated;

DROP POLICY IF EXISTS "productos_select_public" ON productos;
CREATE POLICY "productos_select_public" ON productos
  FOR SELECT TO anon, authenticated
  USING (activo = TRUE);

COMMIT;
