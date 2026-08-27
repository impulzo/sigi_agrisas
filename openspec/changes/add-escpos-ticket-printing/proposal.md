# add-escpos-ticket-printing

**Estado: implementación completa (23/23 tareas), PENDIENTE DE ARCHIVAR.**

No correr `opsx:archive` sobre este change hasta que el cliente confirme, imprimiendo en la EPSON TM-T20II física con el agente de referencia (`tools/escpos-print-agent/`) apuntando a esa impresora real, que el ticket sale completo — sin corte, sin descuadre de ancho, sin margen superior en blanco. Ver tasks.md 6.4 y design.md (Risks) para el detalle de qué falta verificar. Excluir este change de corridas batch de verify/archive hasta entonces.

## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Cajero | Como cajero, quiero que al hacer clic en "Imprimir Ticket" en una sucursal con impresora ESC/POS configurada, el sistema construya un JSON con el contenido del ticket (mismo orden ya spec'eado: logo, header negocio, folio, cliente, condiciones de crédito, items, totales IVA/IEPS separados, footer, leyenda, folio tipo barcode) y lo envíe por HTTP a `http://localhost:<puerto>` (agente local), sin abrir el diálogo de impresión del navegador | Recibir un ticket impreso correcto (sin corte, sin descuadre), porque el driver de Windows demostradamente no respeta el CSS del navegador y esto elimina esa capa por completo | - Given una venta con `printMode: 'escpos'` configurado en su sucursal, When el cajero hace clic en "Imprimir Ticket", Then el navegador hace un POST JSON a `http://localhost:<puerto>/print` con las mismas secciones/orden que hoy usa `PrintableTicket`, sin invocar `window.print()`<br>- Given el mismo contenido de venta, When se compara el ticket vía ESC/POS contra el HTML actual, Then ambos muestran las mismas secciones condicionales (cliente solo si `customerId`, crédito solo si `customerCreditDays != null`, IVA/IEPS siempre como líneas separadas)<br>- Given una venta sin cliente ni crédito, When se imprime, Then el JSON omite esas secciones igual que hoy hace `PrintableTicket` (sin filas vacías) | - El endpoint del agente en `localhost` no expone ni recibe credenciales de sesión/JWT — el payload es solo contenido de ticket ya resuelto en el navegador (folio, totales, textos), no datos sensibles adicionales a los que ya se muestran en pantalla<br>- La acción sigue gateada por el mismo permiso `sales:read` que ya protege `/sales/:id/ticket` — no se agrega superficie de autorización nueva en el navegador |
| 2 | Administrador | Como administrador, quiero configurar por sucursal si el ticket se imprime vía ESC/POS (agente local + impresora) o vía `window.print()`, incluyendo la URL/puerto del agente local y el host/puerto de la impresora de red, para que cada sucursal use el mecanismo que le funciona sin afectar a las demás | Hoy `TicketSettings` es un singleton global sin ningún campo de este tipo; cada sucursal puede tener un setup físico distinto (unas con impresora térmica problemática, otras sin ese problema) | - Given una sucursal sin configuración de impresora ESC/POS, When se resuelve el modo de impresión, Then se usa `window.print()` (comportamiento actual, sin regresión)<br>- Given un administrador con `settings:write` que configura `printMode: 'escpos'`, `agentUrl` y `printerHost:puerto` para una sucursal, When guarda, Then esa sucursal usa ESC/POS y las demás sucursales no configuradas siguen con `window.print()`<br>- Given un intento de configurar `printMode: 'escpos'` sin `agentUrl` o sin `printerHost`, When se guarda, Then el sistema rechaza la actualización (400) por campos incompletos | - Requiere `settings:write` (mismo permiso que ya gatea `PATCH /settings/ticket`) — no se crea un permiso nuevo<br>- `agentUrl`/`printerHost` son datos de infraestructura interna de la sucursal, no PII — no requieren enmascarado, pero sí validación de formato (URL/host válido) para evitar que un valor mal formado rompa el flujo de impresión en POS |
| 3 | Cajero | Como cajero, quiero que si el agente local no responde (no está corriendo, la impresora apagada, error de red) el sistema me avise claramente y me deje reintentar o caer de vuelta a `window.print()`, para no bloquear el cierre de la venta por un problema de hardware | No depender al 100% de una pieza de infraestructura nueva y frágil (el agente local) para poder seguir operando | - Given `printMode: 'escpos'` y el agente no responde (timeout o conexión rechazada), When el cajero intenta imprimir, Then ve un mensaje de error claro (ej. "No se pudo conectar con la impresora") con opciones "Reintentar" y "Imprimir desde el navegador"<br>- Given el cajero elige "Imprimir desde el navegador" tras un fallo de ESC/POS, When confirma, Then se abre el flujo actual de `window.print()`/`PrintableTicket` sin recargar la página ni perder el contexto de la venta<br>- Given un timeout configurado (ej. unos segundos), When el agente no contesta en ese plazo, Then no se deja al cajero esperando indefinidamente — el error se muestra tras el timeout | - El fallback a `window.print()` no debe reintentar automáticamente contra el agente en bucle (evitar spam de requests a `localhost` si el agente está caído) — reintento es una acción explícita del cajero, no automática/silenciosa |

## Why

El change `document-thermal-print-limitation` (ya implementado) reforzó el CSS/`@page` de `PrintableTicket` para mejorar anclaje, ancho y feed final. En hardware real (EPSON TM-T20II, 80mm, red) el problema persiste: el driver de Windows inyecta su propio margen superior antes de rasterizar, empujando el contenido y cortando la cola del ticket — un límite físico del driver/SO que ningún CSS del navegador puede alcanzar, ya documentado como tal en `ticket-print-ui`.

La única forma de eliminar esa capa de raíz es dejar de depender del pipeline de impresión del sistema operativo: generar el ticket como comandos ESC/POS y mandarlos directo a la impresora, sin pasar por ningún driver GDI/CUPS. Como el panel corre en Vercel (sin alcance de red a la LAN de cada sucursal) y la conexión debe iniciarse desde el navegador del cajero, y dado que los navegadores no permiten sockets TCP crudos, se necesita un agente local por sucursal que reciba el trabajo de impresión vía HTTP a `localhost` (exento de mixed-content) y lo reenvíe a la impresora por socket ESC/POS crudo al puerto 9100 — decisión ya validada con el usuario, incluyendo el costo operativo de mantener esa pieza de infraestructura adicional por sucursal.

## What Changes

- Nuevo endpoint/contrato de agente local: el navegador arma un JSON con el contenido del ticket y lo POSTea a `http://localhost:<puerto>/print`; el agente (proceso separado, fuera del alcance de este change en cuanto a empaquetado/instalación) traduce ese JSON a bytes ESC/POS y los envía por socket TCP crudo al puerto 9100 de la impresora de red.
- Nuevo modelo de configuración de impresora por sucursal (`printMode`, `agentUrl`, `printerHost`, `printerPort`) — sucursales sin configurar siguen usando `window.print()` sin cambios.
- Nuevo flujo de fallback/resiliencia en la UI de impresión: timeout, mensaje de error, botón de reintento y botón de "imprimir desde el navegador" que cae al mecanismo HTML actual sin perder contexto de la venta.
- El contenido/orden de secciones del ticket no cambia — es un cambio de mecanismo de entrega, no de contenido.

## Capabilities

### New Capabilities

- `escpos-ticket-printing`: contrato navegador→agente local→impresora (JSON de ticket, traducción a ESC/POS, envío por socket 9100), configuración de impresora por sucursal, y flujo de fallback/reintento ante fallas del agente.

### Modified Capabilities

- `ticket-print-ui`: el requirement "Print ticket action on the ticket view" se extiende para bifurcar entre el mecanismo ESC/POS (cuando la sucursal lo tiene configurado) y el mecanismo `window.print()` existente (sin configuración) — el segundo no cambia su comportamiento actual, solo deja de ser el único camino.

## Impact

- Nuevo modelo Prisma (branch-scoped): configuración de impresora (`printMode`, `agentUrl`, `printerHost`, `printerPort`) con FK a `Branch`.
- Nuevo endpoint admin (`GET`/`PATCH /api/v1/admin/branches/:id/printer-config` o similar) gateado por `settings:write`/`settings:read`.
- `app/(private)/sales/[id]/ticket/_blocks/TicketPreviewPage.tsx` y `PrintableTicket.tsx` — nueva rama de decisión de mecanismo de impresión, nuevo componente/servicio de fallback y reintento.
- Fuera de alcance: empaquetado/distribución/instalación del agente local en cada PC de sucursal (instalador, actualizaciones) — change de seguimiento.
- Sin cambios al contenido fiscal ya spec'eado en `ticket-print-ui` (folio, RFC, totales, orden de secciones).
