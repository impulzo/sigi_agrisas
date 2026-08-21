## 1. Ticket — vista previa

- [x] 1.1 En `app/(private)/sales/[id]/ticket/_blocks/TicketPreviewPage.tsx:66`, agregar `px-gutter py-lg` al `className` del wrapper raíz.
- [x] 1.2 En `TicketPreviewPage.tsx:95`, cambiar el `className` del `<img>` del logo de `h-[100px] w-[140px] object-contain mb-[4.8px]` a `h-[86px] w-[140px] object-contain mb-2`.

## 2. Ticket — impresión

- [x] 2.1 En `app/(private)/sales/_blocks/PrintableTicket.tsx:53`, cambiar la regla `.printable-ticket img` de `width: 125px; height: 150px; object-fit: contain; display: block; margin: 0 auto 2.4px;` a `width: 125px; height: 77px; object-fit: contain; display: block; margin: 0 auto 8px;`.
- [x] 2.2 En `PrintableTicket.tsx:52`, agregar `margin: 0;` explícito a la regla `.printable-ticket` (refuerzo defensivo del anclaje top-left, ver design.md D4).
- [x] 2.3 Confirmar por lectura de código que ningún ancestro entre `<body>` y `.print-area` (wrappers en `TicketPreviewPage.tsx`) declara `position: relative/fixed/sticky` que reancle el `position:absolute` de `.print-area` (`app/globals.css:99-104`) — no requiere cambio si ya cumple.

## 3. Ticket — verificación manual

> Claude in Chrome siguió fallando (mismo "Script injection timed out"). Se verificó con Playwright MCP en su lugar: login QA, navegación a `/sales/[id]/ticket`, screenshot de preview, y render real de impresión vía `page.pdf({ emulateMedia: 'print' })`.

- [x] 3.1 Preview (`/sales/b0b40bff-.../ticket`): padding de página visible (`px-gutter py-lg` aplicado, contenido no toca bordes), logo apaisado correcto (140×86, sin hueco vacío). Confirmado por screenshot.
- [x] 3.2 Impresión verificada con `page.pdf({ preferCSSPageSize: true })` (respeta el `@page` inyectado por el componente, a diferencia del PDF sin esa flag que cae a tamaño Letter por defecto): ticket ancla arriba-izquierda, ancho 80mm exacto, logo mismo proporción que preview, margen logo→header visible. Sin este flag el render se ve centrado en una página Letter — comportamiento del *consumidor* del `@page` (el generador de PDF/driver), no del CSS del ticket; confirma el diagnóstico D4.
- [x] 3.3 Confirmado: la causa de "se ve centrado" es que quien consume el `@page` custom (driver de impresora o, en esta prueba, la herramienta de PDF sin `preferCSSPageSize`) puede ignorarlo y caer a un tamaño de página por defecto (Letter/A4), centrando el contenido angosto dentro de esa página grande — ningún CSS adicional en este change lo resuelve. Anotado como hallazgo para `openspec/changes/document-thermal-print-limitation/`.

## 4. NavigationRail

- [x] 4.1 En `app/_components/organisms/NavigationRail/NavigationRail.tsx:25` (`RailLink`), cambiar `w-14 h-14` por `w-16 h-16`.
- [x] 4.2 En `NavigationRail.tsx:32` (`<span>` de `RailLink`), cambiar `className="text-label-sm"` por `className="text-label-sm w-full text-center leading-tight"`.
- [x] 4.3 En `NavigationRail.tsx:95` (botón de `RailParentItem`), cambiar `w-14 h-14` por `w-16 h-16`.
- [x] 4.4 En `NavigationRail.tsx:102` (`<span>` de `RailParentItem`), cambiar `className="text-label-sm"` por `className="text-label-sm w-full text-center leading-tight"`.
- [x] 4.5 En `NavigationRail.tsx:201` (botón de logout), cambiar `w-14 h-14` por `w-16 h-16` dentro del `className` existente.
- [x] 4.6 En `NavigationRail.tsx:204` (`<span>` del botón de logout), cambiar `className="text-label-sm"` por `className="text-label-sm w-full text-center leading-tight"`.

## 5. NavigationRail — verificación manual

> Verificado con Playwright MCP (mismo motivo de sección 3 para no usar Claude in Chrome). **Hallazgo real durante esta verificación**: con la implementación de 4.1-4.6 tal como estaba, las etiquetas largas ("Cotizaciones", "Devoluciones", "Facturación", "Configuración") NO hacían wrap — `w-full` acota el ancho pero `white-space`/`overflow-wrap` seguían en `normal`, y al ser palabras sin espacios el navegador las desborda en una sola línea en vez de partirlas. Ese desborde no se veía "flotando" fuera de la caja porque el `<nav>` (`overflow-y-auto` sin `overflow-x` explícito) fuerza — por regla de la spec CSS de overflow — que el eje x compute a `auto` en vez de `visible`, recortando el texto sin elipsis justo en el borde del rail (ej. "Cotizaciones" se veía como "Cotizacione"). Esto incumplía el Scenario "Etiquetas largas hacen wrap dentro del contenedor" del spec. **Fix aplicado**: se agregó `break-words` (`overflow-wrap: break-word`) al `<span>` de `RailLink`, `RailParentItem` y el botón de logout (`NavigationRail.tsx` líneas ~32, ~102, ~204). Reverificado: las 4 etiquetas largas ahora hacen wrap a 2 líneas dentro del fondo hover/activo, sin recorte.

- [x] 5.1 Hover sobre "Cotizaciones", "Devoluciones", "Facturación", "Configuración" (los 4 casos con etiqueta más larga que 64px) confirmado tras el fix: ícono+etiqueta (2 líneas) quedan contenidos dentro del fondo redondeado, sin texto desbordado ni recortado.
- [x] 5.2 Sin overflow horizontal, rail sigue en 80px. Ítem activo ("Ventas") se ve correctamente resaltado (`bg-primary-container`, `scale-90`).
- [x] 5.3 Botón "Salir" ("Salir" cabe en 1 línea, no requería el fix pero ya lleva la misma clase `break-words` por consistencia) — contenido correctamente.
- [x] 5.4 (agregado) `npx jest tests/unit/ui/design-system/tokens.test.ts tests/unit/ui/_components/organisms/NavigationRail.test.tsx` — 37/37 passed tras agregar `break-words` (clase ya existente en Tailwind, no rompe el guardrail).

## 6. Verificación automatizada

- [x] 6.1 `npm run build` — confirma tipos sin errores. (Node local 18.0.0 < 18.17.0 requerido por Next; se corrió con `nvm use 20.20.2`, exit 0.)
- [x] 6.2 `npx jest tests/unit/ui/design-system/tokens.test.ts` — confirma que ninguna clase nueva rompe el guardrail de escala tipográfica/color. 8/8 passed.
- [x] 6.3 Correr los tests unitarios existentes que tocan estos archivos si existen (`tests/unit/ui/(private)/sales/**/TicketPreviewPage.test.tsx`, cualquier test de `NavigationRail`) y confirmar que siguen en verde. `NavigationRail.test.tsx` 29/29 passed sin cambios. `TicketPreviewPage.test.tsx` tenía 3 tests con aserciones obsoletas de un intento previo interrumpido (valores de logo pre-`fd2aac9`, ya divergentes del HEAD committeado) — actualizadas a los nuevos valores (140x86px, `mb-2`) de este change; 16/16 passed tras el ajuste.
