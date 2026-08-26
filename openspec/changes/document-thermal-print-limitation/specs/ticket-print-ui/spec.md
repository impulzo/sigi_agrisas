## MODIFIED Requirements

### Requirement: Anclaje superior del ticket en impresión térmica
El contenido imprimible del ticket SHALL quedar anclado a la esquina superior izquierda de la página de impresión calculada, sin quedar centrado verticalmente, y sin que ningún estilo intermedio reintroduzca un `margin`/`position` que lo recentre.

#### Scenario: Anclaje top-left en la vista de impresión del navegador
- **WHEN** el cajero ejecuta `window.print()` desde la vista previa y se abre el diálogo/vista de impresión del navegador
- **THEN** el contenido de `.printable-ticket`/`.print-area` aparece anclado en `top: 0; left: 0` del `@page` calculado por `computeTicketPageHeightMm`, sin margen ni centrado vertical introducido por CSS del propio sistema

#### Scenario: Anclaje reforzado para impresoras térmicas de red (EPSON TM-T20II y compatibles)
- **WHEN** se imprime desde una impresora térmica configurada como impresora de sistema (ej. EPSON TM-T20II, 80mm, conectada por red) cuyo driver pudiera sustituir el tamaño de página custom por uno fijo
- **THEN** el propio `PrintableTicket` declara explícitamente `position: absolute; top: 0; left: 0; margin: 0` en su estilo inyectado (no depende únicamente de la regla global `.print-area` en `app/globals.css`), reduciendo la probabilidad de que el driver recentre el contenido

#### Scenario: Verificación final pendiente de confirmación en hardware real
- **WHEN** este refuerzo de anclaje se despliega sin una impresora física TM-T20II disponible en el entorno de desarrollo para probarlo
- **THEN** el cierre de este change queda condicionado a que el cliente confirme en la impresora física que el anclaje ya no se recentra; si el driver sigue recentrando pese al refuerzo, se documenta como limitación remanente del driver/SO sin bloquear otras funcionalidades del ticket

## ADDED Requirements

### Requirement: Robustez del ancho y del corte final ante sustitución de tamaño de página por el driver
El contenido imprimible del ticket SHALL evitar que el driver de la impresora térmica reescale o corte el contenido cuando sustituye el tamaño de página custom calculado por uno propio, reforzando tanto el ancho declarado como el espacio final antes del corte automático.

#### Scenario: Ancho de contenido no se desborda ni fuerza reescalado del driver
- **WHEN** se imprime con `paperWidth: "80mm"` (o `"58mm"`) configurado en `TicketSettings`, en una impresora térmica real como la EPSON TM-T20II
- **THEN** `.printable-ticket` usa `box-sizing: border-box` y ningún elemento interno (imagen, tabla, párrafo) se desborda del ancho declarado, de modo que el driver no necesite reescalar ni recortar el contenido para hacerlo caber

#### Scenario: Margen de "feed" final evita corte de la última línea u hoja en blanco sobrante
- **WHEN** el ticket termina de imprimir su contenido (footer, leyenda, folio decorativo)
- **THEN** se añade un espacio de feed explícito al final del contenido imprimible y se incrementa el margen de seguridad de altura calculada (`SAFETY_MARGIN_MM`), de forma que el auto-cutter de la impresora no corte la última línea de contenido ni el driver agregue una hoja en blanco adicional por subestimar la altura

#### Scenario: Calibración válida tanto para tickets cortos como largos
- **WHEN** se imprime un ticket con pocas líneas de producto y otro con muchas líneas
- **THEN** en ambos casos el ancho permanece dentro del declarado y el feed final es suficiente, sin depender de medición DOM ni de timing de `beforeprint` (la altura sigue derivándose únicamente de los datos ya cargados de la venta)

#### Scenario: Verificación final pendiente de confirmación en hardware real
- **WHEN** este refuerzo de ancho y feed final se despliega sin una impresora física TM-T20II disponible en el entorno de desarrollo para probarlo
- **THEN** el cierre de este change queda condicionado a que el cliente confirme en la impresora física que ya no hay recorte de contenido, hoja en blanco sobrante, ni desajuste de ancho
