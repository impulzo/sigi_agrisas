## Purpose

Define el contrato de impresión directa ESC/POS para tickets de venta: configuración de impresora por sucursal, el payload que el navegador envía a un agente local, y el comportamiento de reintento/fallback cuando ese agente no responde — como alternativa a `window.print()` para sucursales cuyo driver de impresora térmica no respeta el `@page` calculado por el navegador.

## ADDED Requirements

### Requirement: Configuración de impresora ESC/POS por sucursal
El sistema SHALL permitir configurar, por sucursal, el modo de impresión de ticket (`printMode`: `'browser'` o `'escpos'`), y cuando es `'escpos'`, la URL del agente local (`agentUrl`) y el host/puerto de la impresora de red (`printerHost`, `printerPort`). Una sucursal sin esta configuración SHALL comportarse como `printMode: 'browser'` (sin regresión). El endpoint de configuración SHALL requerir el permiso `settings:read`/`settings:write` (el mismo que ya gatea `GET`/`PATCH /settings/ticket`) y SHALL aplicar el mismo branch scoping transversal que el resto de recursos scoped por sucursal del sistema (`enforceBranchScope`/`resolveScopedBranchId`, bypass solo con `branches:access_all`).

#### Scenario: Sucursal sin configuración usa el mecanismo de navegador
- **WHEN** se resuelve el modo de impresión para una sucursal sin fila de configuración de impresora
- **THEN** el sistema trata esa sucursal como `printMode: 'browser'` — comportamiento idéntico al actual, sin cambios

#### Scenario: Configurar ESC/POS para una sucursal no afecta a las demás
- **WHEN** un administrador con `settings:write` configura `printMode: 'escpos'`, `agentUrl` y `printerHost`/`printerPort` para la sucursal A
- **THEN** la sucursal A usa el flujo ESC/POS y cualquier otra sucursal sin configurar sigue usando `window.print()`

#### Scenario: Configuración incompleta se rechaza
- **WHEN** se intenta guardar `printMode: 'escpos'` sin `agentUrl` o sin `printerHost`
- **THEN** el sistema responde 400 y no persiste el cambio

#### Scenario: Branch scoping aplica igual que en otros recursos por sucursal
- **WHEN** un usuario sin `branches:access_all` intenta leer o modificar la configuración de impresora de una sucursal distinta a la suya (`x-user-branch-id`)
- **THEN** el sistema responde 403, igual que en el resto de endpoints scoped por sucursal del sistema

### Requirement: Payload de impresión — navegador a agente local
Cuando la sucursal de la venta tiene `printMode: 'escpos'`, el navegador SHALL construir un job de impresión en JSON con el mismo contenido y orden de secciones ya definido para el ticket impreso (logo, header de negocio, folio/fecha/vendedor/sucursal/pago, sección cliente condicional, condiciones de crédito condicionales, items, totales con IVA/IEPS siempre como líneas separadas, footer, leyenda condicional, folio decorativo tipo código de barras) y SHALL enviarlo por `POST` HTTP a `agentUrl` (`http://localhost:<puerto>` u otro host configurado). El payload NO SHALL incluir tokens de sesión, JWT, ni ningún dato de autenticación — solo contenido de ticket ya resuelto en el navegador.

#### Scenario: El JSON refleja las mismas secciones condicionales que el HTML
- **WHEN** se genera el job de impresión para una venta sin cliente ni crédito
- **THEN** el JSON omite la sección de cliente y la línea de condiciones de crédito, igual que hace hoy `PrintableTicket` en HTML

#### Scenario: El JSON nunca lleva credenciales
- **WHEN** se construye el payload de impresión
- **THEN** no contiene `Authorization`, tokens, ni ningún dato de sesión — solo campos de contenido del ticket ya visibles en pantalla

#### Scenario: Impresión ESC/POS no pasa por el diálogo del navegador
- **WHEN** el cajero imprime con `printMode: 'escpos'` configurado
- **THEN** en ningún momento se invoca `window.print()` ni se renderiza `PrintableTicket` para impresión — el flujo termina en el `POST` al agente local

### Requirement: Reintento y fallback ante fallas del agente local
Si el agente local no responde dentro de un tiempo de espera acotado, o rechaza la conexión, el sistema SHALL mostrar al cajero un mensaje de error claro con dos acciones explícitas: reintentar el envío al agente, o imprimir con el mecanismo de navegador existente (`window.print()`) sin perder el contexto de la venta. El sistema NO SHALL reintentar automáticamente contra el agente sin acción explícita del cajero.

#### Scenario: Timeout del agente muestra error con opciones
- **WHEN** el agente local no responde dentro del tiempo de espera configurado, o la conexión es rechazada
- **THEN** el cajero ve un mensaje de error con las acciones "Reintentar" e "Imprimir desde el navegador"

#### Scenario: Fallback a navegador no pierde el contexto de la venta
- **WHEN** el cajero elige "Imprimir desde el navegador" tras un fallo de ESC/POS
- **THEN** se dispara el flujo actual de `window.print()`/`PrintableTicket` sin recargar la página ni perder los datos de la venta ya cargados

#### Scenario: Sin reintento automático
- **WHEN** el agente local falla
- **THEN** el sistema no reintenta la petición contra `localhost` por sí solo — cualquier reintento requiere que el cajero presione explícitamente "Reintentar"
