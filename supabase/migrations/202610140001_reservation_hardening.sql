-- Folilco Nativo: vencimiento de reservas pendientes y creación atómica.
-- Aplicar en Supabase SQL Editor antes de desplegar el código de esta rama.

ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agenda_synced BOOLEAN NOT NULL DEFAULT FALSE;

-- Las reservas pendientes antiguas también deben dejar de bloquear fechas.
UPDATE public.reservas
SET expires_at = COALESCE(expires_at, created_at + INTERVAL '30 minutes'),
    estado = CASE
      WHEN COALESCE(expires_at, created_at + INTERVAL '30 minutes') <= NOW()
      THEN 'cancelada'
      ELSE estado
    END
WHERE estado = 'pendiente';

CREATE INDEX IF NOT EXISTS idx_reservas_pending_expiry
  ON public.reservas (expires_at)
  WHERE estado = 'pendiente';

CREATE OR REPLACE FUNCTION public.crear_reserva_atomica(
  p_huesped_nombre TEXT,
  p_huesped_email TEXT,
  p_huesped_telefono TEXT,
  p_huesped_rut TEXT,
  p_huesped_nota TEXT,
  p_producto_id UUID,
  p_producto_nombre TEXT,
  p_fecha_inicio DATE,
  p_fecha_fin DATE,
  p_cantidad_personas INTEGER,
  p_precio_base_clp INTEGER,
  p_precio_total_clp INTEGER,
  p_external_reference TEXT
)
RETURNS SETOF public.reservas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reserva public.reservas;
BEGIN
  IF p_fecha_inicio >= p_fecha_fin THEN
    RAISE EXCEPTION 'Rango de fechas inválido' USING ERRCODE = '22007';
  END IF;

  -- Serializa peticiones para el mismo producto; distintas cabañas no se bloquean.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_producto_id::TEXT, 0));

  UPDATE public.reservas
  SET estado = 'cancelada'
  WHERE producto_id = p_producto_id
    AND estado = 'pendiente'
    AND expires_at IS NOT NULL
    AND expires_at <= NOW();

  IF EXISTS (
    SELECT 1
    FROM public.reservas r
    WHERE r.producto_id = p_producto_id
      AND r.estado IN ('confirmada', 'pendiente')
      AND (r.estado <> 'pendiente' OR r.expires_at IS NULL OR r.expires_at > NOW())
      AND r.fecha_inicio < p_fecha_fin
      AND r.fecha_fin > p_fecha_inicio
  ) OR EXISTS (
    SELECT 1
    FROM public.bloqueos b
    WHERE b.producto_id = p_producto_id
      AND b.fecha_inicio < p_fecha_fin
      AND b.fecha_fin > p_fecha_inicio
  ) THEN
    RAISE EXCEPTION 'Fechas no disponibles' USING ERRCODE = '23P01';
  END IF;

  INSERT INTO public.reservas (
    huesped_nombre, huesped_email, huesped_telefono, huesped_rut, huesped_nota,
    producto_id, producto_nombre, fecha_inicio, fecha_fin, cantidad_personas,
    precio_base_clp, precio_total_clp, estado, mp_external_reference, origen, expires_at
  ) VALUES (
    p_huesped_nombre, p_huesped_email, p_huesped_telefono, p_huesped_rut, p_huesped_nota,
    p_producto_id, p_producto_nombre, p_fecha_inicio, p_fecha_fin, p_cantidad_personas,
    p_precio_base_clp, p_precio_total_clp, 'pendiente', p_external_reference, 'web',
    NOW() + INTERVAL '30 minutes'
  )
  RETURNING * INTO v_reserva;

  RETURN NEXT v_reserva;
END;
$$;

REVOKE ALL ON FUNCTION public.crear_reserva_atomica(
  TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, DATE, DATE, INTEGER, INTEGER, INTEGER, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crear_reserva_atomica(
  TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, DATE, DATE, INTEGER, INTEGER, INTEGER, TEXT
) TO service_role;

-- Confirmar pagos bajo el mismo bloqueo que protege las reservas nuevas.
-- Un pago tardío no debe reabrir una reserva expirada ni provocar sobreventa.
CREATE OR REPLACE FUNCTION public.confirmar_reserva_pagada(
  p_reserva_id UUID,
  p_payment_id TEXT,
  p_payment_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reserva public.reservas;
  v_producto_id UUID;
BEGIN
  SELECT producto_id INTO v_producto_id
  FROM public.reservas
  WHERE id = p_reserva_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Mantener el mismo orden de locks que crear_reserva_atomica.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_producto_id::TEXT, 0));

  SELECT * INTO v_reserva
  FROM public.reservas
  WHERE id = p_reserva_id
  FOR UPDATE;

  IF v_reserva.estado = 'confirmada' THEN
    UPDATE public.reservas
    SET mp_payment_id = p_payment_id, mp_payment_status = p_payment_status
    WHERE id = p_reserva_id;
    RETURN TRUE;
  END IF;

  IF v_reserva.estado <> 'pendiente'
     OR (v_reserva.expires_at IS NOT NULL AND v_reserva.expires_at <= NOW())
     OR EXISTS (
       SELECT 1 FROM public.reservas r
       WHERE r.id <> p_reserva_id
         AND r.producto_id = v_reserva.producto_id
         AND r.estado IN ('confirmada', 'pendiente')
         AND (r.estado <> 'pendiente' OR r.expires_at IS NULL OR r.expires_at > NOW())
         AND r.fecha_inicio < v_reserva.fecha_fin
         AND r.fecha_fin > v_reserva.fecha_inicio
     ) THEN
    UPDATE public.reservas
    SET estado = 'cancelada',
        mp_payment_id = p_payment_id,
        mp_payment_status = p_payment_status
    WHERE id = p_reserva_id;
    RETURN FALSE;
  END IF;

  UPDATE public.reservas
  SET estado = 'confirmada',
      mp_payment_id = p_payment_id,
      mp_payment_status = p_payment_status
  WHERE id = p_reserva_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.confirmar_reserva_pagada(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_reserva_pagada(UUID, TEXT, TEXT)
  TO service_role;
