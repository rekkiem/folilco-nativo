-- Inversa de 0001_hotfix_reservas.sql
BEGIN;

SELECT cron.unschedule('expirar-holds') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'expirar-holds'
);

DROP FUNCTION IF EXISTS crear_reserva(
  UUID, DATE, DATE, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT,
  INTEGER, INTEGER, TEXT, TEXT, INTEGER
);

DROP TRIGGER IF EXISTS trg_generate_numero_reserva ON reservas;
-- No eliminamos la secuencia por si hay números ya emitidos

ALTER TABLE reservas DROP CONSTRAINT IF EXISTS reservas_estado_check;
ALTER TABLE reservas ADD CONSTRAINT reservas_estado_check
  CHECK (estado IN ('pendiente', 'confirmada', 'cancelada', 'completada', 'no_show'));

ALTER TABLE reservas
  DROP COLUMN IF EXISTS expira_at,
  DROP COLUMN IF EXISTS pago_inconsistente,
  DROP COLUMN IF EXISTS pago_huerfano;

ALTER TABLE productos DROP COLUMN IF EXISTS ics_token;

DROP VIEW IF EXISTS productos_publicos;
DROP TABLE IF EXISTS reembolsos;
DROP TABLE IF EXISTS outbox;
DROP TABLE IF EXISTS webhook_eventos;

COMMIT;
