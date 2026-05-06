import ical from "ical-generator";
import { parseISO } from "date-fns";
import type { Reserva } from "@/types";

/**
 * Generar archivo .ics con todas las reservas confirmadas
 * Compatible con Airbnb, Booking.com, Google Calendar, iCal
 */
export function generarICS(
  reservas: Reserva[],
  productoNombre: string
): string {
  const calendar = ical({
    name: `Folilco Nativo – ${productoNombre}`,
    description: "Calendario de reservas – Cooperativa Folilco Nativo",
    timezone: "America/Santiago",
    prodId: {
      company: "Folilco Nativo",
      product: "Sistema de Reservas",
      language: "ES",
    },
  });

  for (const reserva of reservas) {
    if (reserva.estado !== "confirmada") continue;

    const inicio = parseISO(reserva.fecha_inicio);
    const fin = parseISO(reserva.fecha_fin);

    calendar.createEvent({
      id: reserva.id,
      start: inicio,
      end: fin,
      allDay: true,
      summary: `RESERVADO – ${reserva.huesped_nombre} (${reserva.cantidad_personas} pax)`,
      description: [
        `Reserva: ${reserva.numero}`,
        `Huésped: ${reserva.huesped_nombre}`,
        `Email: ${reserva.huesped_email}`,
        `Teléfono: ${reserva.huesped_telefono}`,
        `Total: $${reserva.precio_total_clp.toLocaleString("es-CL")} CLP`,
        `Origen: ${reserva.origen}`,
      ].join("\n"),
      status: "CONFIRMED",
      busystatus: "BUSY",
    });
  }

  return calendar.toString();
}
