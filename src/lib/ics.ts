import ical, { ICalEventBusyStatus, ICalEventStatus } from "ical-generator";
import { parseISO } from "date-fns";

export type EventoICS = {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado?: string;
  /** Solo para bloqueos manuales */
  motivo?: string;
};

/**
 * Genera .ics SIN datos personales (F0-05 / E-05).
 * SUMMARY siempre "Reservado" o "Bloqueado".
 */
export function generarICS(
  eventos: EventoICS[],
  productoNombre: string
): string {
  const calendar = ical({
    name: `Folilco Nativo – ${productoNombre}`,
    description: "Calendario de ocupación – Cooperativa Folilco Nativo",
    timezone: "America/Santiago",
    prodId: {
      company: "Folilco Nativo",
      product: "Sistema de Reservas",
      language: "ES",
    },
  });

  for (const ev of eventos) {
    const inicio = parseISO(ev.fecha_inicio);
    const fin = parseISO(ev.fecha_fin);
    const esBloqueo = Boolean(ev.motivo);

    calendar.createEvent({
      id: ev.id,
      start: inicio,
      end: fin,
      allDay: true,
      summary: esBloqueo ? "Bloqueado" : "Reservado",
      description: esBloqueo
        ? `Bloqueo: ${ev.motivo ?? "Mantenimiento"}`
        : "Ocupado",
      status: ICalEventStatus.CONFIRMED,
      busystatus: ICalEventBusyStatus.BUSY,
    });
  }

  return calendar.toString();
}
