// ============================================================
// FOLILCO NATIVO - Tipos TypeScript
// ============================================================

export type ProductoTipo = "alojamiento" | "experiencia" | "producto";

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: ProductoTipo;
  precio_clp: number;
  capacidad: number;
  imagen_url: string | null;
  activo: boolean;
  duracion_noches: number | null;
  duracion_horas: number | null;
  stock_actual: number | null;
  stock_minimo: number | null;
  socio_responsable: string | null;
  created_at: string;
  updated_at: string;
}

export type ReservaEstado =
  | "pendiente"
  | "confirmada"
  | "cancelada"
  | "completada"
  | "no_show";

export interface Reserva {
  id: string;
  numero: string;
  huesped_nombre: string;
  huesped_email: string;
  huesped_telefono: string;
  huesped_rut: string | null;
  huesped_nota: string | null;
  producto_id: string;
  producto_nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  cantidad_personas: number;
  noches: number;
  precio_base_clp: number;
  precio_total_clp: number;
  comision_cooperativa_clp: number | null;
  estado: ReservaEstado;
  mp_preference_id: string | null;
  mp_payment_id: string | null;
  mp_payment_status: string | null;
  mp_external_reference: string | null;
  wa_confirmacion_sent: boolean;
  wa_recordatorio_sent: boolean;
  wa_resena_sent: boolean;
  sheets_synced: boolean;
  origen: string;
  created_at: string;
  updated_at: string;
  // Join
  extras?: ReservaExtra[];
}

export interface ReservaExtra {
  id: string;
  reserva_id: string;
  producto_id: string;
  producto_nombre: string;
  cantidad: number;
  precio_unitario_clp: number;
  subtotal_clp: number;
}

export interface Bloqueo {
  id: string;
  producto_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
}

// ============================================================
// DTOs de la API
// ============================================================

export interface CheckDisponibilidadRequest {
  producto_id: string;
  fecha_inicio: string; // YYYY-MM-DD
  fecha_fin: string;    // YYYY-MM-DD
}

export interface CheckDisponibilidadResponse {
  disponible: boolean;
  conflictos?: string[]; // Fechas bloqueadas
  precio_total_clp: number;
  noches: number;
}

export interface CrearReservaRequest {
  producto_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  cantidad_personas: number;
  huesped_nombre: string;
  huesped_email: string;
  huesped_telefono: string;
  huesped_rut?: string;
  huesped_nota?: string;
  extras?: {
    producto_id: string;
    cantidad: number;
  }[];
}

export interface CrearReservaResponse {
  reserva_id: string;
  numero: string;
  mp_preference_id: string;
  mp_init_point: string;  // URL de checkout MercadoPago
  precio_total_clp: number;
}

export interface DisponibilidadCalendario {
  producto_id: string;
  fechas_bloqueadas: string[];  // Array de YYYY-MM-DD
}

// ============================================================
// Admin / Dashboard
// ============================================================

export interface DashboardData {
  periodo: {
    desde: string;
    hasta: string;
  };
  resumen: {
    total_reservas: number;
    reservas_confirmadas: number;
    ingresos_clp: number;
    tasa_ocupacion: number;
  };
  ingresos_por_linea: {
    alojamiento: number;
    experiencias: number;
    productos: number;
  };
  ocupacion_mensual: {
    mes: string;
    reservas: number;
    ingresos: number;
  }[];
  top_productos: {
    nombre: string;
    reservas: number;
    ingresos: number;
  }[];
  stock_alertas: {
    producto: string;
    stock_actual: number;
    stock_minimo: number;
  }[];
  reservas_recientes: Reserva[];
}

// ============================================================
// Sheets
// ============================================================

export interface SheetReservaRow {
  numero: string;
  fecha_creacion: string;
  huesped_nombre: string;
  huesped_email: string;
  huesped_telefono: string;
  producto: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  noches: number;
  personas: number;
  precio_total: number;
  comision_cooperativa: number;
  socio_responsable: string;
  estado: string;
  mp_payment_id: string;
  origen: string;
}

// ============================================================
// WhatsApp / Twilio
// ============================================================

export type WhatsAppTipoMensaje = "confirmacion" | "recordatorio" | "resena";

export interface WhatsAppMensaje {
  tipo: WhatsAppTipoMensaje;
  reserva: Reserva;
  producto: Producto;
}

// ============================================================
// Webhook MercadoPago
// ============================================================

export interface MercadoPagoWebhookBody {
  action: string;
  api_version: string;
  data: { id: string };
  date_created: string;
  id: number;
  live_mode: boolean;
  type: string;
  user_id: string;
}

export interface ApiError {
  error: string;
  details?: unknown;
  code?: string;
}
