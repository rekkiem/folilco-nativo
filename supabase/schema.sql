-- ============================================================
-- FOLILCO NATIVO - Esquema de Base de Datos
-- Ejecutar en: Supabase SQL Editor
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron"; -- Para jobs internos si se necesitan

-- ============================================================
-- TABLA: productos (alojamientos + experiencias + productos)
-- ============================================================
CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('alojamiento', 'experiencia', 'producto')),
  precio_clp INTEGER NOT NULL,           -- Precio en pesos chilenos
  capacidad INTEGER DEFAULT 1,           -- Personas para alojamiento/experiencia
  imagen_url TEXT,
  activo BOOLEAN DEFAULT TRUE,
  duracion_noches INTEGER,               -- Para alojamiento: mínimo de noches
  duracion_horas DECIMAL(4,1),           -- Para experiencias: duración en horas
  stock_actual INTEGER,                  -- Para productos físicos (miel, etc.)
  stock_minimo INTEGER DEFAULT 5,        -- Umbral de alerta
  socio_responsable TEXT,                -- Nombre del socio que lo gestiona
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: bloqueos (fechas bloqueadas manualmente)
-- ============================================================
CREATE TABLE IF NOT EXISTS bloqueos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id UUID REFERENCES productos(id) ON DELETE CASCADE,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  motivo TEXT DEFAULT 'Mantenimiento',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: reservas (core del negocio)
-- ============================================================
CREATE TABLE IF NOT EXISTS reservas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero TEXT UNIQUE NOT NULL,           -- Número legible: FOL-2024-0001
  
  -- Datos del huésped
  huesped_nombre TEXT NOT NULL,
  huesped_email TEXT NOT NULL,
  huesped_telefono TEXT NOT NULL,        -- Formato: +56912345678
  huesped_rut TEXT,                      -- Opcional para boleta
  huesped_nota TEXT,                     -- Comentarios adicionales
  
  -- Producto reservado
  producto_id UUID REFERENCES productos(id),
  producto_nombre TEXT NOT NULL,         -- Snapshot del nombre al momento de reservar
  
  -- Fechas
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  
  -- Cantidades
  cantidad_personas INTEGER DEFAULT 1,
  noches INTEGER GENERATED ALWAYS AS (fecha_fin - fecha_inicio) STORED,
  
  -- Precio
  precio_base_clp INTEGER NOT NULL,      -- Precio sin adicionales
  precio_total_clp INTEGER NOT NULL,     -- Total cobrado
  comision_cooperativa_clp INTEGER,      -- 10% por defecto
  
  -- Estado del flujo
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (
    estado IN ('pendiente', 'confirmada', 'cancelada', 'completada', 'no_show')
  ),
  
  -- Pago MercadoPago
  mp_preference_id TEXT,                 -- ID de la preferencia de pago
  mp_payment_id TEXT,                    -- ID del pago aprobado
  mp_payment_status TEXT,                -- approved, rejected, pending
  mp_external_reference TEXT UNIQUE,     -- UUID interno para correlacionar
  
  -- WhatsApp
  wa_confirmacion_sent BOOLEAN DEFAULT FALSE,
  wa_confirmacion_sent_at TIMESTAMPTZ,
  wa_recordatorio_sent BOOLEAN DEFAULT FALSE,
  wa_recordatorio_sent_at TIMESTAMPTZ,
  wa_resena_sent BOOLEAN DEFAULT FALSE,
  wa_resena_sent_at TIMESTAMPTZ,
  
  -- Sheets sync
  sheets_synced BOOLEAN DEFAULT FALSE,
  sheets_row_id TEXT,
  
  -- Origen de la reserva
  origen TEXT DEFAULT 'web' CHECK (origen IN ('web', 'admin', 'airbnb', 'booking', 'whatsapp')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: reserva_extras (productos adicionales en una reserva)
-- ============================================================
CREATE TABLE IF NOT EXISTS reserva_extras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reserva_id UUID REFERENCES reservas(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id),
  producto_nombre TEXT NOT NULL,
  cantidad INTEGER DEFAULT 1,
  precio_unitario_clp INTEGER NOT NULL,
  subtotal_clp INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: admins (usuarios del panel)
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,           -- bcrypt hash
  nombre TEXT,
  rol TEXT DEFAULT 'admin' CHECK (rol IN ('admin', 'superadmin', 'socio')),
  activo BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: sensor_iot (lecturas del ESP8266 opcional)
-- ============================================================
CREATE TABLE IF NOT EXISTS sensor_iot (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sensor_id TEXT NOT NULL,
  humedad DECIMAL(5,2),
  temperatura DECIMAL(5,2),
  leido_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON reservas(estado);
CREATE INDEX IF NOT EXISTS idx_reservas_fechas ON reservas(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_reservas_producto ON reservas(producto_id);
CREATE INDEX IF NOT EXISTS idx_reservas_mp_external ON reservas(mp_external_reference);
CREATE INDEX IF NOT EXISTS idx_reservas_email ON reservas(huesped_email);
CREATE INDEX IF NOT EXISTS idx_bloqueos_producto ON bloqueos(producto_id);
CREATE INDEX IF NOT EXISTS idx_sensor_iot_sensor_id ON sensor_iot(sensor_id, leido_at DESC);

-- ============================================================
-- FUNCIÓN: auto-incrementar número de reserva legible
-- ============================================================
CREATE OR REPLACE FUNCTION generate_numero_reserva()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
  v_numero TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO v_seq
  FROM reservas
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  v_numero := 'FOL-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  NEW.numero := v_numero;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_numero_reserva
  BEFORE INSERT ON reservas
  FOR EACH ROW
  WHEN (NEW.numero IS NULL OR NEW.numero = '')
  EXECUTE FUNCTION generate_numero_reserva();

-- ============================================================
-- FUNCIÓN: actualizar updated_at automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reservas_updated_at
  BEFORE UPDATE ON reservas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCIÓN: calcular comisión automáticamente (10%)
-- ============================================================
CREATE OR REPLACE FUNCTION calcular_comision()
RETURNS TRIGGER AS $$
BEGIN
  NEW.comision_cooperativa_clp := ROUND(NEW.precio_total_clp * 0.10);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comision
  BEFORE INSERT OR UPDATE OF precio_total_clp ON reservas
  FOR EACH ROW EXECUTE FUNCTION calcular_comision();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bloqueos ENABLE ROW LEVEL SECURITY;

-- Política: lectura pública de productos activos
CREATE POLICY "productos_publicos_read" ON productos
  FOR SELECT USING (activo = TRUE);

-- Política: lectura pública de bloqueos (para calendario)
CREATE POLICY "bloqueos_publicos_read" ON bloqueos
  FOR SELECT USING (TRUE);

-- Política: acceso completo con service role (backend)
CREATE POLICY "service_role_all" ON reservas
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_productos" ON productos
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_bloqueos" ON bloqueos
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- DATOS INICIALES (seed)
-- ============================================================
INSERT INTO productos (nombre, descripcion, tipo, precio_clp, capacidad, duracion_noches, socio_responsable, imagen_url) VALUES
(
  'Cabaña del Bosque',
  'Cabaña acogedora para 2 personas rodeada de bosque nativo. Incluye desayuno artesanal con productos de la cooperativa.',
  'alojamiento',
  85000,
  2,
  1,
  'María González',
  'https://images.unsplash.com/photo-1482192505345-5852cc56a9b7?w=800'
),
(
  'Domo Patagónico',
  'Domo geodésico con vista al lago y cielo despejado. Perfecto para observar las estrellas del sur.',
  'alojamiento',
  120000,
  2,
  1,
  'Carlos Muñoz',
  'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800'
),
(
  'Cabaña Familiar',
  'Espaciosa cabaña para hasta 5 personas. Cocina equipada y fogón exterior.',
  'alojamiento',
  150000,
  5,
  1,
  'Ana Pinto',
  'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800'
),
(
  'Cabalgata al Volcán',
  'Excursión a caballo de 4 horas hacia las faldas del volcán. Guía local incluido.',
  'experiencia',
  35000,
  8,
  NULL,
  'Roberto Salvo',
  'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=800'
),
(
  'Día de Campo y Ordeña',
  'Vive un día en la granja: ordeña de vacas, elaboración de queso artesanal y almuerzo campestre.',
  'experiencia',
  28000,
  10,
  NULL,
  'María González',
  'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800'
),
(
  'Miel Artesanal Folilco 500g',
  'Miel pura de abeja melífera del bosque nativo del sur. Sin aditivos.',
  'producto',
  9500,
  1,
  NULL,
  'Pedro Flores',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'
),
(
  'Mermelada de Murta 220g',
  'Mermelada artesanal de murta silvestre recolectada en temporada. Edición limitada.',
  'producto',
  6500,
  1,
  NULL,
  'Ana Pinto',
  'https://images.unsplash.com/photo-1597528373181-c8b2bf7ed7e8?w=800'
)
ON CONFLICT DO NOTHING;

-- Stock inicial para productos físicos
UPDATE productos SET stock_actual = 50, stock_minimo = 10 WHERE tipo = 'producto';
