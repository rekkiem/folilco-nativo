# 📅 Plan de Implementación – Folilco Nativo MVP

## Resumen ejecutivo

- **Duración total:** 6 semanas (4 sprints de 1.5 semanas)
- **Deadline producción:** Semana 6
- **Stack:** Next.js 14, Supabase, MercadoPago, Twilio, Google Sheets

---

## Sprint 1 – Semana 1 y media (Cimientos)
**Objetivo:** Infraestructura lista, productos visibles, disponibilidad funcional.

| Tarea | Horas |
|-------|-------|
| Setup repositorio, Vercel, Supabase, variables de entorno | 3h |
| Ejecutar schema SQL, datos seed | 1h |
| API `/products` – listado con cache | 2h |
| API `/availability` – check puntual + calendario mensual | 4h |
| Página principal (hero, alojamientos, experiencias) | 6h |
| Componente `ProductSelector` | 3h |
| Componente `DatePicker` con calendario interactivo | 6h |
| Configurar MercadoPago (credenciales, preferencia de prueba) | 2h |
| **Total Sprint 1** | **27h** |

**Entregable:** Sitio público online. Calendario de disponibilidad funcional. Selección de producto operativa.

---

## Sprint 2 – Semana 2 y 3 (Flujo de pago completo)
**Objetivo:** Reserva + pago + confirmación funcionando end-to-end.

| Tarea | Horas |
|-------|-------|
| `GuestForm` con validación | 3h |
| `BookingSummary` (resumen antes de pagar) | 2h |
| API `/reservations` POST – crear reserva + preferencia MP | 4h |
| Webhook `/webhooks/mercadopago` – confirmar pago | 5h |
| Verificación de firma del webhook | 2h |
| Integración Google Sheets – agregar fila de reserva | 3h |
| Integración Twilio – WhatsApp de confirmación | 3h |
| Página `/gracias` (post-pago) | 2h |
| Prueba end-to-end con tarjeta de test | 2h |
| **Total Sprint 2** | **26h** |

**Entregable:** Flujo completo: reserva → pago → WhatsApp → Google Sheets. Cronometrado < 2 minutos.

---

## Sprint 3 – Semana 4 y 5 (Admin + Automatizaciones)
**Objetivo:** Panel de administración operativo y WhatsApp automatizado.

| Tarea | Horas |
|-------|-------|
| Login admin con JWT | 3h |
| Panel Dashboard (KPIs + gráficos) | 5h |
| Vista Reservas con filtros y paginación | 4h |
| Control de Stock con alertas | 3h |
| Cron job WhatsApp recordatorio (24h antes check-in) | 3h |
| Cron job WhatsApp reseña (24h después check-out) | 2h |
| Exportación ICS para Airbnb/Booking | 2h |
| Smoke tests script | 2h |
| **Total Sprint 3** | **24h** |

**Entregable:** Admin panel completo. WhatsApp recordatorio y reseña automáticos. Calendario ICS exportable.

---

## Sprint 4 – Semana 6 (Producción + Documentación)
**Objetivo:** Despliegue final, seguridad, documentación y capacitación.

| Tarea | Horas |
|-------|-------|
| Configurar dominio folilco.com en Vercel | 1h |
| Configurar webhooks MercadoPago en producción | 1h |
| Configurar WhatsApp Business en Twilio | 2h |
| Inicializar hojas Google Sheets con cabeceras | 1h |
| Configurar Vercel Cron Jobs | 0.5h |
| Rate limiting revisión y ajuste | 1h |
| Pruebas de humo en producción (script) | 2h |
| Prueba de reserva real con pago real | 1h |
| Documentación para cooperativa (MANUAL) | 2h |
| Buffer para bugs encontrados en producción | 3h |
| **Total Sprint 4** | **14.5h** |

**Entregable:** Sistema en producción. Primera reserva real exitosa. Socios capacitados.

---

## Total horas estimadas: ~91h

---

## Criterios de Done (DoD) por funcionalidad

### Reserva online
- [ ] Disponibilidad se verifica en tiempo real contra Supabase
- [ ] Formulario valida todos los campos antes de proceder
- [ ] Precio total se muestra antes del pago
- [ ] Redirige correctamente a MercadoPago
- [ ] Funciona en móvil (testeado en Chrome Android)

### Pago y webhook
- [ ] Webhook verifica firma criptográfica de MercadoPago
- [ ] Pago aprobado → reserva confirmada en Supabase (< 5 seg)
- [ ] Idempotente: si llega dos veces el mismo webhook, no duplica acciones
- [ ] Pago rechazado → reserva cancelada

### WhatsApp
- [ ] Confirmación llega en < 30 segundos post-pago
- [ ] Flag `wa_confirmacion_sent` se marca como TRUE para no reenviar
- [ ] Recordatorio se envía exactamente 24h antes del check-in
- [ ] Mensaje de reseña llega 24h después del check-out

### Google Sheets
- [ ] Nueva fila en `reservas` en < 5 segundos post-confirmación
- [ ] Agenda marcada como ocupada
- [ ] No duplica filas si el webhook se repite

### Dashboard admin
- [ ] Acceso protegido por JWT (redirige a login si no hay sesión)
- [ ] KPIs se calculan correctamente para el mes seleccionado
- [ ] Gráfico de barras muestra últimos 6 meses
- [ ] Alertas de stock se muestran cuando corresponde

---

## Riesgos identificados y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| Twilio WhatsApp Sandbox limitado en producción | Media | Alto | Solicitar número dedicado con 2 semanas de anticipación |
| Cuota Google Sheets API (100 req/100 seg) | Baja | Medio | Usar batch updates; máximo 1 req por reserva |
| MercadoPago demora en aprobar cuenta | Media | Alto | Usar credenciales de test hasta semana 5 |
| Internet inestable en el lugar | Alta | Bajo | Funciones degradadas: solo lectura de disponibilidad en cache |
| Costo Vercel por tráfico | Baja | Bajo | Plan Hobby gratuito suficiente para MVP |
