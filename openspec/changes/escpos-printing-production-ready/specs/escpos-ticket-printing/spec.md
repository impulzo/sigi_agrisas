## MODIFIED Requirements

### Requirement: Configuración de impresora ESC/POS por sucursal
El sistema SHALL permitir configurar, por sucursal, el modo de impresión de ticket (`printMode`: `'browser'` o `'escpos'`), y cuando es `'escpos'`, la URL del agente local (`agentUrl`) y el host/puerto de la impresora de red (`printerHost`, `printerPort`). Una sucursal sin esta configuración SHALL comportarse como `printMode: 'browser'` (sin regresión). El endpoint de configuración SHALL requerir el permiso `settings:read`/`settings:write` (el mismo que ya gatea `GET`/`PATCH /settings/ticket`) y SHALL aplicar el mismo branch scoping transversal que el resto de recursos scoped por sucursal del sistema (`enforceBranchScope`/`resolveScopedBranchId`, bypass solo con `branches:access_all`). Además del endpoint crudo, el sistema SHALL exponer esta configuración desde una pantalla del panel administrativo (dentro del flujo de edición de sucursal), gateada por los mismos permisos `settings:read`/`settings:write`, replicando en el cliente las mismas validaciones que ya aplica el backend (`printMode: 'escpos'` requiere `agentUrl` y `printerHost`; `agentUrl` solo acepta esquema `http://`).

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

#### Scenario: Administrador configura ESC/POS desde el panel sin usar la API directamente
- **WHEN** un administrador con `settings:write` abre la configuración de impresión de una sucursal desde el panel, completa `printMode: 'escpos'` con `agentUrl` y `printerHost` válidos, y guarda
- **THEN** el panel envía el `PATCH` al endpoint existente y la sucursal queda en modo ESC/POS, reflejando el cambio sin recargar la página

#### Scenario: El panel bloquea el guardado de una configuración incompleta antes de llamar a la API
- **WHEN** un administrador selecciona `printMode: 'escpos'` en el panel sin completar `agentUrl` o `printerHost`
- **THEN** el formulario impide el submit y muestra el mismo error que el backend (`IncompletePrinterConfigError`) de forma inline, sin enviar la petición

#### Scenario: El panel rechaza un agentUrl con esquema no permitido
- **WHEN** un administrador ingresa un `agentUrl` con esquema `https://` (o distinto de `http://`)
- **THEN** el formulario muestra un error inline y no envía el `PATCH`

#### Scenario: El panel muestra el estado por defecto para sucursales nunca configuradas
- **WHEN** un administrador abre la configuración de impresión de una sucursal que nunca fue configurada
- **THEN** el formulario muestra `printMode: 'browser'` preseleccionado y los campos de ESC/POS (`agentUrl`, `printerHost`, `printerPort`) vacíos y deshabilitados

### Requirement: Payload de impresión — navegador a agente local
Cuando la sucursal de la venta tiene `printMode: 'escpos'`, el navegador SHALL construir un job de impresión en JSON con el mismo contenido y orden de secciones ya definido para el ticket impreso (logo, header de negocio, folio/fecha/vendedor/sucursal/pago, sección cliente condicional, línea de condiciones de pago siempre presente — crédito o CONTADO —, items, totales con IVA/IEPS siempre como líneas separadas, footer, leyenda condicional, folio decorativo tipo código de barras) y SHALL enviarlo por `POST` HTTP a `agentUrl` (`http://localhost:<puerto>` u otro host configurado). El campo `conditionsLine: string` del payload SHALL llevar el texto ya resuelto en el navegador ("Crédito a <N> días" o "CONTADO"), SIEMPRE presente independientemente de si la venta tiene cliente asociado — reemplaza al campo previo `creditDays: number | null`. El payload NO SHALL incluir tokens de sesión, JWT, ni ningún dato de autenticación — solo contenido de ticket ya resuelto en el navegador. A diferencia del mecanismo de navegador (`window.print()`, basado en un `@page` de alto estimado), el payload NO SHALL declarar ni requerir ningún alto/largo de página — el agente local corta el papel exactamente donde termina el contenido enviado, sin colchón de seguridad ni espacio en blanco sobrante.

#### Scenario: El JSON refleja las mismas secciones condicionales que el HTML
- **WHEN** se genera el job de impresión para una venta sin cliente y en efectivo
- **THEN** el JSON omite la sección de cliente (`customer: null`), igual que hace hoy `PrintableTicket` en HTML, pero SÍ incluye `conditionsLine: "CONTADO"` — la línea de condiciones ya no se omite

#### Scenario: conditionsLine refleja crédito o contado según la venta
- **WHEN** se genera el job de impresión para una venta con `sale.isCredit: true`
- **THEN** `conditionsLine` es `"Crédito a <N> días"` usando `customerCreditDays` del cliente de la venta
- **WHEN** se genera el job de impresión para una venta con `sale.isCredit: false`
- **THEN** `conditionsLine` es `"CONTADO"`, sin importar si la venta tiene cliente asociado

#### Scenario: El JSON nunca lleva credenciales
- **WHEN** se construye el payload de impresión
- **THEN** no contiene `Authorization`, tokens, ni ningún dato de sesión — solo campos de contenido del ticket ya visibles en pantalla

#### Scenario: Impresión ESC/POS no pasa por el diálogo del navegador
- **WHEN** el cajero imprime con `printMode: 'escpos'` configurado
- **THEN** en ningún momento se invoca `window.print()` ni se renderiza `PrintableTicket` para impresión — el flujo termina en el `POST` al agente local

#### Scenario: Formateo de texto y márgenes de impresión
- **WHEN** el agente procesa un job de impresión
- **THEN** el contenido impreso SHALL respetar el ancho de columna (ej. 48/42 caracteres para 80mm o 32 para 58mm) aplicando ajuste de línea (word-wrap) a nombres/direcciones largas y márgenes para evitar que el texto quede cortado en los bordes laterales del papel

#### Scenario: Impresión física sin hoja en blanco sobrante (verificación en hardware real)
- **WHEN** se imprime un ticket real vía ESC/POS en una impresora térmica física (ej. EPSON TM-T20II) con el agente local instalado y corriendo
- **THEN** el ticket físico sale completo (logo, header, items, totales, footer, barcode) y el corte ocurre inmediatamente después del contenido, sin tramo de papel en blanco sobrante — a diferencia del mecanismo de navegador, que corta al alto de `@page` estimado exista o no contenido ahí

#### Scenario: Impresión física de campos largos sin truncar (verificación en hardware real)
- **WHEN** se imprime en la impresora física un ticket cuyo cliente tiene nombre o dirección largos
- **THEN** el texto se ajusta por word-wrap dentro del ancho de columna configurado, sin truncarse ni desbordar el ancho físico del papel

## ADDED Requirements

### Requirement: Persistencia del agente local como servicio
El agente local de impresión ESC/POS SHALL poder registrarse como un servicio del sistema operativo (Windows) con auto-arranque, de forma que quede escuchando en el puerto configurado tras un reinicio de la PC sin intervención manual del cajero. El empaquetado/registro como servicio NO SHALL alterar el contrato HTTP existente (`POST /print` recibiendo el `TicketPrintJob` tal cual lo construye el navegador) ni requerir cambios en `sendTicketPrintJob` del lado del panel.

#### Scenario: El agente arranca automáticamente tras reiniciar la PC
- **WHEN** una PC de caja con el agente instalado como servicio se reinicia
- **THEN** el agente queda escuchando en el puerto configurado sin que nadie tenga que ejecutar ningún comando manualmente

#### Scenario: El contrato HTTP se mantiene idéntico tras el empaquetado
- **WHEN** el agente empaquetado como ejecutable standalone recibe un `POST /print` con un `TicketPrintJob`
- **THEN** procesa e imprime el ticket de la misma forma que el script sin empaquetar, sin requerir cambios en el panel

#### Scenario: El servicio se recupera sin reinstalación
- **WHEN** el servicio del agente se detiene o falla y el sistema operativo lo reinicia
- **THEN** vuelve a quedar operativo sin necesidad de reinstalar ni reconfigurar nada
