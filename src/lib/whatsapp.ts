import twilio from "twilio";
import type { Reserva, Producto, WhatsAppTipoMensaje } from "@/types";
import { formatearPrecioCLP } from "./mercadopago";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { logger } from "./logger";

// Lazy-init: evita error en build cuando las vars no están presentes
function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error("Twilio no configurado: TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN son requeridos");
  }
  return twilio(sid, token);
}

const FROM = () => {
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) throw new Error("TWILIO_WHATSAPP_FROM no configurado");
  return from;
};

function normalizarTelefono(tel: string): string {
  let limpio = tel.replace(/[^\d+]/g, "");
  if (limpio.startsWith("0")) limpio = limpio.slice(1);
  if (!limpio.startsWith("+")) {
    limpio = limpio.startsWith("56") ? "+" + limpio : "+56" + limpio;
  }
  return "whatsapp:" + limpio;
}

function formatFecha(fecha: string): string {
  return format(parseISO(fecha), "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
}

function buildMensajeConfirmacion(reserva: Reserva, _producto: Producto): string {
  const checkin = formatFecha(reserva.fecha_inicio);
  const checkout = formatFecha(reserva.fecha_fin);
  return `🌿 *¡Hola ${reserva.huesped_nombre.split(" ")[0]}! Tu reserva en Folilco Nativo está confirmada* 🌿

📋 *Número de reserva:* ${reserva.numero}
🏡 *${reserva.producto_nombre}*
📅 Check-in: ${checkin}
📅 Check-out: ${checkout}
👤 ${reserva.cantidad_personas} persona(s)
💰 Total pagado: ${formatearPrecioCLP(reserva.precio_total_clp)}

📍 *¿Cómo llegar?*
Km 12 camino a Coñaripe, Región de Los Ríos.
Google Maps: https://maps.app.goo.gl/folilco

🕐 *Check-in:* desde las 15:00 hrs
🕐 *Check-out:* hasta las 11:00 hrs
📞 *Emergencias:* +56 9 1234 5678

¡Te esperamos! 🌲✨
_Cooperativa Folilco Nativo_`;
}

function buildMensajeRecordatorio(reserva: Reserva, _producto: Producto): string {
  const checkin = formatFecha(reserva.fecha_inicio);
  return `🌅 *¡Mañana es el gran día, ${reserva.huesped_nombre.split(" ")[0]}!*

Tu llegada a *Folilco Nativo* es el ${checkin} 🏡

✅ Check-in desde las 15:00 hrs
✅ Trae ropa abrigada
✅ Efectivo para productos de los socios

🐴 *¿Agregar una experiencia?*
• Cabalgata – $35.000/persona
• Día de campo – $28.000/persona
• Miel artesanal 500g – $9.500

Responde *"QUIERO AGREGAR"* y te llamamos 🌿

_Cooperativa Folilco Nativo_`;
}

function buildMensajeResena(reserva: Reserva): string {
  return `🌿 *¡Gracias por elegir Folilco Nativo, ${reserva.huesped_nombre.split(" ")[0]}!*

Esperamos que tu estadía haya sido mágica 🌲

⭐ *¿Nos dejas una reseña?*
https://g.page/folilco-nativo/review
(2 minutos y significa el mundo para la cooperativa 🙏)

🎁 *Regalo:* 10% de descuento en tu próxima reserva.
Código: *FOLILCO10* en folilco.com

¡Hasta pronto! 🏔️
_Cooperativa Folilco Nativo_`;
}

export async function enviarWhatsApp(
  tipo: WhatsAppTipoMensaje,
  reserva: Reserva,
  producto: Producto
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  const toNumber = normalizarTelefono(reserva.huesped_telefono);

  // Validar número mínimamente antes de llamar a Twilio
  if (toNumber.replace("whatsapp:", "").replace("+", "").length < 10) {
    return { success: false, error: `Número inválido: ${toNumber}` };
  }

  let body: string;
  switch (tipo) {
    case "confirmacion":
      body = buildMensajeConfirmacion(reserva, producto);
      break;
    case "recordatorio":
      body = buildMensajeRecordatorio(reserva, producto);
      break;
    case "resena":
      body = buildMensajeResena(reserva);
      break;
    default:
      return { success: false, error: "Tipo de mensaje desconocido" };
  }

  try {
    const client = getClient();
    const message = await client.messages.create({ from: FROM(), to: toNumber, body });
    logger.info("[WhatsApp] Mensaje enviado", { tipo, to: toNumber, sid: message.sid });
    return { success: true, messageSid: message.sid };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error("[WhatsApp] Error enviando mensaje", { tipo, to: toNumber, error });
    return { success: false, error };
  }
}

export function validarFirmaTwilio(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return false;
  return twilio.validateRequest(token, signature, url, params);
}
