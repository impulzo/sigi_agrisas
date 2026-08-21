## ADDED Requirements

### Requirement: Márgenes de página en la vista previa del ticket
La vista previa del ticket de venta (`/sales/[id]/ticket`) SHALL usar el mismo padding de página (horizontal y vertical) que el resto de las pantallas del panel bajo `app/(private)/`.

#### Scenario: Padding estándar al cargar la vista previa
- **WHEN** un cajero navega a `/sales/[id]/ticket` de una venta existente
- **THEN** el contenedor raíz de la vista previa tiene padding vertical y horizontal equivalente al usado por `PageShell` en el resto del sistema (`px-gutter`/`py-lg`, 24px)

#### Scenario: Padding no se rompe con secciones opcionales
- **WHEN** la venta previsualizada incluye secciones opcionales (datos de cliente, condiciones de crédito)
- **THEN** el padding de página se mantiene consistente y no se duplica ni se anula por el espaciado entre bloques (`space-y-4`) del contenido interno

### Requirement: Proporción y margen del logo consistentes entre preview e impresión
El logo del negocio SHALL renderizarse con la misma proporción apaisada (~1.63:1, acorde al aspect ratio del asset real) y el mismo margen inferior visible, tanto en la vista previa en pantalla como en el ticket impreso.

#### Scenario: Misma proporción de caja en preview e impresión
- **WHEN** se renderiza el logo (`ticketSettings.logoUrl` o el fallback `/logo.png`) en la vista previa y en el markup de impresión (`PrintableTicket`)
- **THEN** ambos usan una caja con proporción apaisada consistente con el aspect ratio real del logo, sin que `object-fit: contain` deje espacio vacío interno por una caja de orientación incorrecta (retrato)

#### Scenario: Margen visible entre logo y datos del negocio
- **WHEN** se mide el espacio entre el borde inferior del logo renderizado y el bloque de datos del negocio (nombre, RFC, dirección, teléfono, régimen fiscal) inmediatamente debajo
- **THEN** existe un margen visible y no residual (mayor al valor casi nulo previo de 2.4px impresión / 4.8px preview) y ese margen es el mismo en ambos contextos

### Requirement: Anclaje superior del ticket en impresión térmica
El contenido imprimible del ticket SHALL quedar anclado a la esquina superior izquierda de la página de impresión calculada, sin quedar centrado verticalmente, y sin que ningún estilo intermedio reintroduzca un `margin`/`position` que lo recentre.

#### Scenario: Anclaje top-left en la vista de impresión del navegador
- **WHEN** el cajero ejecuta `window.print()` desde la vista previa y se abre el diálogo/vista de impresión del navegador
- **THEN** el contenido de `.printable-ticket`/`.print-area` aparece anclado en `top: 0; left: 0` del `@page` calculado por `computeTicketPageHeightMm`, sin margen ni centrado vertical introducido por CSS del propio sistema

#### Scenario: Centrado remanente por limitación de driver/impresora queda fuera de alcance
- **WHEN** tras el refuerzo de CSS el ticket sigue apareciendo centrado en una impresora térmica física, debido a que el driver/SO usa un tamaño de papel distinto al `@page` calculado
- **THEN** ese caso se documenta como limitación conocida en el change `document-thermal-print-limitation` y no bloquea el cierre de este change ni motiva más cambios de CSS en este alcance
