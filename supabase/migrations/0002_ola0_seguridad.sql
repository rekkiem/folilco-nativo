-- ============================================================
-- OLA 0 — Seguridad de pagos y datos (O0-1, O0-2, O0-3, O0-5)
-- Sobre 0001_hotfix_reservas.sql
-- ============================================================

BEGIN;

-- O0-2: precio validado en crear_reserva; sin EXECUTE público
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
  v_noches INTEGER;
  v_precio_esperado INTEGER;
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

  v_noches := GREATEST(1, (p_fecha_fin - p_fecha_inicio));
  IF v_producto.tipo = 'alojamiento' THEN
    v_precio_esperado := v_producto.precio_clp * v_noches;
  ELSIF v_producto.tipo = 'experiencia' THEN
    v_precio_esperado := v_producto.precio_clp * p_cantidad_personas;
  ELSE
    v_precio_esperado := v_producto.precio_clp;
  END IF;

  IF p_precio_total_clp IS NOT NULL AND p_precio_total_clp < v_precio_esperado THEN
    RAISE EXCEPTION 'PRECIO_INVALIDO' USING ERRCODE = 'P0005';
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
    COALESCE(p_precio_total_clp, v_precio_esperado),
    'pendiente',
    NOW() + (p_hold_minutes || ' minutes')::interval,
    COALESCE(p_mp_external_reference, gen_random_uuid()::text),
    p_origen
  )
  RETURNING * INTO v_reserva;

  RETURN v_reserva;
END;
$$;

REVOKE EXECUTE ON FUNCTION crear_reserva FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION crear_reserva FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION crear_reserva TO service_role;

-- O0-1: confirmación atómica de pago
CREATE OR REPLACE FUNCTION confirmar_pago(
  p_external_reference TEXT,
  p_payment_id TEXT,
  p_payment_status TEXT,
  p_amount_cents INTEGER,
  p_currency TEXT DEFAULT 'CLP'
)
RETURNS TABLE (
  resultado TEXT,
  reserva_id UUID,
  numero TEXT,
  estado_nuevo TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reserva reservas%ROWTYPE;
  v_lock_key BIGINT;
BEGIN
  v_lock_key := hashtextextended(p_external_reference, 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT * INTO v_reserva FROM reservas
    WHERE mp_external_reference = p_external_reference
    FOR UPDATE;

  IF NOT FOUND THEN
    resultado := 'reserva_no_encontrada';
    reserva_id := NULL; numero := NULL; estado_nuevo := NULL;
    RETURN NEXT; RETURN;
  END IF;

  IF v_reserva.estado = 'confirmada' AND v_reserva.mp_payment_id = p_payment_id THEN
    resultado := 'ya_confirmada';
    reserva_id := v_reserva.id; numero := v_reserva.numero; estado_nuevo := 'confirmada';
    RETURN NEXT; RETURN;
  END IF;

  IF v_reserva.estado = 'confirmada' THEN
    resultado := 'ya_confirmada_otro_pago';
    reserva_id := v_reserva.id; numero := v_reserva.numero; estado_nuevo := 'confirmada';
    RETURN NEXT; RETURN;
  END IF;

  IF upper(COALESCE(p_currency, 'CLP')) <> 'CLP' THEN
    UPDATE reservas SET pago_inconsistente = TRUE, mp_payment_id = p_payment_id,
      mp_payment_status = p_payment_status, updated_at = NOW()
    WHERE id = v_reserva.id;
    resultado := 'moneda_invalida';
    reserva_id := v_reserva.id; numero := v_reserva.numero; estado_nuevo := v_reserva.estado;
    RETURN NEXT; RETURN;
  END IF;

  IF p_amount_cents IS NULL OR p_amount_cents <> v_reserva.precio_total_clp THEN
    UPDATE reservas SET pago_inconsistente = TRUE, mp_payment_id = p_payment_id,
      mp_payment_status = p_payment_status, updated_at = NOW()
    WHERE id = v_reserva.id;
    resultado := 'monto_invalido';
    reserva_id := v_reserva.id; numero := v_reserva.numero; estado_nuevo := v_reserva.estado;
    RETURN NEXT; RETURN;
  END IF;

  IF v_reserva.estado IN ('expirada', 'cancelada')
     OR (v_reserva.estado = 'pendiente' AND v_reserva.expira_at IS NOT NULL AND v_reserva.expira_at < NOW()) THEN
    UPDATE reservas SET pago_huerfano = TRUE, mp_payment_id = p_payment_id,
      mp_payment_status = p_payment_status, updated_at = NOW()
    WHERE id = v_reserva.id;
    resultado := 'pago_huerfano';
    reserva_id := v_reserva.id; numero := v_reserva.numero; estado_nuevo := v_reserva.estado;
    RETURN NEXT; RETURN;
  END IF;

  IF p_payment_status = 'approved' AND v_reserva.estado = 'pendiente' THEN
    UPDATE reservas SET estado = 'confirmada', mp_payment_id = p_payment_id,
      mp_payment_status = p_payment_status, expira_at = NULL, updated_at = NOW()
    WHERE id = v_reserva.id RETURNING * INTO v_reserva;
    resultado := 'confirmada';
    reserva_id := v_reserva.id; numero := v_reserva.numero; estado_nuevo := 'confirmada';
    RETURN NEXT; RETURN;
  END IF;

  UPDATE reservas SET mp_payment_id = p_payment_id, mp_payment_status = p_payment_status, updated_at = NOW()
  WHERE id = v_reserva.id;

  IF p_payment_status IN ('rejected', 'cancelled', 'refunded', 'charged_back') THEN
    IF v_reserva.estado = 'pendiente' THEN
      UPDATE reservas SET estado = 'cancelada', updated_at = NOW() WHERE id = v_reserva.id RETURNING * INTO v_reserva;
    END IF;
    resultado := p_payment_status;
  ELSE
    resultado := 'actualizado';
  END IF;

  reserva_id := v_reserva.id; numero := v_reserva.numero; estado_nuevo := v_reserva.estado;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION confirmar_pago FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION confirmar_pago FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION confirmar_pago TO service_role;

CREATE OR REPLACE VIEW productos_publicos AS
SELECT id, nombre, descripcion, tipo, precio_clp, capacidad,
  imagen_url, activo, duracion_noches, duracion_horas
FROM productos WHERE activo = TRUE;

GRANT SELECT ON productos_publicos TO anon, authenticated;

DROP POLICY IF EXISTS "productos_select_public" ON productos;
CREATE POLICY "productos_select_public" ON productos
  FOR SELECT TO anon, authenticated USING (activo = TRUE);

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT, p_max INTEGER, p_window_seconds INTEGER
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_hits INTEGER; v_start TIMESTAMPTZ;
BEGIN
  SELECT hits, window_start INTO v_hits, v_start FROM rate_limit_buckets WHERE bucket_key = p_key FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO rate_limit_buckets (bucket_key, hits, window_start) VALUES (p_key, 1, NOW());
    RETURN TRUE;
  END IF;
  IF v_start < NOW() - (p_window_seconds || ' seconds')::interval THEN
    UPDATE rate_limit_buckets SET hits = 1, window_start = NOW() WHERE bucket_key = p_key;
    RETURN TRUE;
  END IF;
  IF v_hits >= p_max THEN RETURN FALSE; END IF;
  UPDATE rate_limit_buckets SET hits = hits + 1 WHERE bucket_key = p_key;
  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION check_rate_limit FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_rate_limit TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS webhook_eventos_proveedor_evento_uidx
  ON webhook_eventos (proveedor, evento_id);

COMMIT;
