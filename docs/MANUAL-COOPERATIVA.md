# 🌿 Manual de Uso – Cooperativa Folilco Nativo

**Para los socios y administradores del sistema**  
Sin lenguaje técnico · Paso a paso · Con capturas de pantalla descritas

---

## ¿Qué hace el sistema?

El sistema Folilco Nativo reemplaza los cuadernos y llamadas telefónicas por una página web que:

- **Muestra** tus cabañas y experiencias a cualquier persona en Chile y el mundo
- **Recibe** reservas y pagos automáticamente, las 24 horas
- **Avisa** al huésped por WhatsApp con instrucciones de llegada
- **Registra** cada reserva en Google Sheets para que todos los socios la vean
- **Recuerda** al huésped su llegada el día anterior y le ofrece extras
- **Pide** una reseña en Google Maps al día siguiente del checkout

**Ustedes no tienen que hacer nada manualmente.** Todo ocurre solo.

---

## Acceso al Panel de Administración

El panel se encuentra en:
```
https://folilco.com/admin
```

**Usuario y contraseña:** Los entrega el administrador técnico.

> ⚠️ **Importante:** No compartas la contraseña. Si la olvidaste, contacta al encargado técnico.

---

## 1. Cómo ver las reservas

1. Entra a `folilco.com/admin` e ingresa tus credenciales
2. Haz clic en **"Reservas"** en el menú lateral
3. Verás una tabla con todas las reservas ordenadas de la más reciente a la más antigua
4. Puedes **filtrar por estado** (confirmada, pendiente, cancelada) usando el menú desplegable
5. Puedes **buscar** un huésped por nombre o email

### ¿Qué significan los estados?

| Estado | Significado |
|--------|-------------|
| 🟡 **Pendiente** | El huésped inició la reserva pero aún no pagó |
| 🟢 **Confirmada** | Pago recibido. El huésped recibirá WhatsApp |
| 🔵 **Completada** | El huésped ya hizo checkout |
| 🔴 **Cancelada** | El pago fue rechazado o cancelado |
| ⚫ **No show** | El huésped no llegó |

### ¿Cómo cambiar el estado de una reserva?

En la columna **"Acción"**, selecciona el nuevo estado en el menú desplegable. El cambio es inmediato.

---

## 2. Cómo ver el Dashboard (resumen del negocio)

1. En el menú, haz clic en **"Dashboard"**
2. Verás un resumen del mes con:
   - Total de reservas y confirmadas
   - Ingresos totales en pesos chilenos
   - Porcentaje de ocupación de las cabañas
   - Alertas de stock bajo (si hay productos por reabastecerse)
3. Puedes cambiar el mes con el selector de fecha en la parte superior derecha

### Gráficos disponibles

- **Barras:** Ingresos de los últimos 6 meses
- **Torta:** Distribución de ingresos por línea (alojamiento, experiencias, productos)
- **Top 3:** Los productos más vendidos del mes

---

## 3. Cómo manejar el stock de productos

Los productos artesanales (miel, mermeladas) se controlan en el menú **"Stock"**.

### Para actualizar el stock:
1. Ir a **"Stock"** en el menú
2. Busca el producto que necesitas actualizar
3. Cambia el número en el campo de texto
4. Haz clic en **"Guardar"**

### Alertas de stock bajo
Cuando un producto tiene **menos unidades que el mínimo configurado**, aparecerá en color amarillo y verás un aviso en el Dashboard.

El sistema también te enviará un aviso automático cuando esto ocurra.

---

## 4. Google Sheets – La hoja de la cooperativa

El sistema actualiza automáticamente tu Google Sheets cada vez que llega una reserva. La hoja tiene 4 secciones:

### 📋 Hoja: `reservas`
Registro completo de cada reserva. Se llena automáticamente. **No editar.**

| Columna | Qué contiene |
|---------|-------------|
| N° Reserva | Código único (ej: FOL-2024-0001) |
| Fecha | Cuándo se hizo la reserva |
| Huésped | Nombre, email y teléfono |
| Producto | Qué reservó |
| Fechas | Check-in y checkout |
| Total CLP | Cuánto pagó |
| Comisión | 10% para la cooperativa |
| Socio | Quién está a cargo |
| Estado | Confirmada / Cancelada |

### 📅 Hoja: `agenda_compartida`
Muestra qué días están ocupados en cada espacio. Se llena automáticamente.

### 📦 Hoja: `stock`
Control de productos artesanales. Los socios pueden editar esta hoja directamente.

**Columnas que puedes editar:**
- `Stock Actual`: actualiza cuando recibas o vendas productos
- `Última Actualización`: pon la fecha cuando cambies el stock

### 💰 Hoja: `ingresos_por_socio`
Resumen de ingresos agrupados por socio. Se actualiza automáticamente desde `reservas`.

---

## 5. WhatsApp automático – Cómo funciona

El sistema envía mensajes automáticamente en 3 momentos:

### ✅ Al confirmar el pago
El huésped recibe instrucciones de llegada:
- Dirección y cómo llegar
- Horarios de check-in y check-out
- Teléfono de emergencia

### ⏰ El día antes del check-in
Mensaje de recordatorio con oferta de actividades adicionales:
- Cabalgata, día de campo, productos artesanales

### 🌟 El día después del check-out
Solicitud de reseña en Google Maps y descuento del 10% para la próxima visita.

> 💡 **Si un huésped responde con una pregunta**, el sistema lo derivará automáticamente al WhatsApp del administrador.

---

## 6. Sincronización con Airbnb y Booking

Para que Airbnb o Booking conozcan tus fechas ocupadas:

1. Copia la URL del calendario ICS de cada cabaña:
   ```
   https://folilco.com/api/ics?producto_id=ID-DE-LA-CABANA
   ```
   *(El ID te lo entrega el administrador técnico)*

2. En **Airbnb**: Ve a tu anuncio → Disponibilidad → Conectar otro calendario → Pega la URL

3. En **Booking**: Panel → Propiedades → Disponibilidad → Importar calendario → Pega la URL

Airbnb y Booking actualizarán su calendario cada pocos horas automáticamente.

---

## 7. Bloquear fechas manualmente

Si necesitas bloquear fechas por mantenimiento o uso personal:

1. Contacta al administrador técnico, quien lo hará desde el panel de Supabase
2. O edita la hoja `agenda_compartida` marcando las fechas como "BLOQUEADO"

*(En una versión futura, esto estará disponible directamente en el panel de admin)*

---

## 8. Preguntas frecuentes

**¿Qué pasa si alguien paga y no aparece en la hoja?**
Espera 5 minutos. Si no aparece, contacta al administrador técnico con el número de reserva que le llegó al huésped.

**¿Puedo cancelar una reserva confirmada?**
Sí. En el panel de Reservas, cambia el estado a "Cancelada". El reembolso se gestiona directamente desde MercadoPago.

**¿Cómo agrego una cabaña o experiencia nueva?**
El administrador técnico puede agregarla en la base de datos. Compártele el nombre, descripción, precio y foto.

**¿El sistema funciona sin internet en el lugar?**
La web necesita internet para funcionar. Para lugares con conexión intermitente, los huéspedes pueden hacer la reserva desde la ciudad antes de llegar.

**¿Qué cuesta el sistema por mes?**
Menos de $25 USD al mes (alrededor de $23.000 CLP). Incluye hosting, base de datos y mensajes de WhatsApp.

---

## 9. Contactos de soporte técnico

| Problema | A quién contactar |
|----------|-----------------|
| El sistema está caído | Administrador técnico |
| Una reserva no llegó a la hoja | Administrador técnico |
| Un huésped no recibió WhatsApp | Administrador técnico |
| Cambiar precios o agregar productos | Administrador técnico |
| Olvido de contraseña admin | Administrador técnico |

**Administrador técnico:** *(completar con nombre y contacto)*

---

## 10. Glosario rápido

| Término | Qué significa |
|---------|--------------|
| **Supabase** | La base de datos donde se guardan todas las reservas |
| **MercadoPago** | La plataforma que procesa los pagos |
| **Twilio** | El servicio que envía los WhatsApp automáticos |
| **Vercel** | El servidor donde vive la página web |
| **Webhook** | Una notificación automática que envía MercadoPago cuando llega un pago |
| **ICS** | Formato de archivo de calendario (compatible con cualquier app de calendario) |
| **CLP** | Pesos chilenos |

---

*Documento actualizado: Junio 2024*  
*Sistema: Folilco Nativo v1.0 – MVP*
