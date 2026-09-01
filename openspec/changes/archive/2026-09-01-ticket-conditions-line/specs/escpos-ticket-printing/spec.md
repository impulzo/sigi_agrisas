## MODIFIED Requirements

### Requirement: Payload de impresión — navegador a agente local
Cuando la sucursal de la venta tiene `printMode: 'escpos'`, el navegador SHALL construir un job de impresión en JSON con el mismo contenido y orden de secciones ya definido para el ticket impreso (logo, header de negocio, folio/fecha/vendedor/sucursal/pago, sección cliente condicional, línea de condiciones de pago siempre presente — crédito o CONTADO —, items, totales con IVA/IEPS siempre como líneas separadas, footer, leyenda condicional, folio decorativo tipo código de barras) y SHALL enviarlo por `POST` HTTP a `agentUrl` (`http://localhost:<puerto>` u otro host configurado). El campo `conditionsLine: string` del payload SHALL llevar el texto ya resuelto en el navegador ("Crédito a <N> días" o "CONTADO"), SIEMPRE presente independientemente de si la venta tiene cliente asociado — reemplaza al campo previo `creditDays: number | null`. El payload NO SHALL incluir tokens de sesión, JWT, ni ningún dato de autenticación — solo contenido de ticket ya resuelto en el navegador.

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
- **THEN** el contenido impreso SHALL respetar el ancho de columna (ej. 48/42 caracteres para 80mm o 32 para 58mm) aplicando ajuste de línea (word-wrap) a nombres/direcciones largas y márgenes para evitar que el texto quede cortado en los bordes laterales del papel.
