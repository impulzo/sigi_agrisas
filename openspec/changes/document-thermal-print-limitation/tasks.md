## 1. Anclaje reforzado

- [x] 1.1 En `app/(private)/sales/_blocks/PrintableTicket.tsx`, agregar `position: absolute; top: 0; left: 0; margin: 0;` al selector `.printable-ticket` dentro del `@media print` inyectado (además de lo ya declarado en `app/globals.css`).
- [x] 1.2 Verificar que ningún wrapper intermedio (Tailwind `hidden print:block`, contenedor de la vista previa en `TicketPreviewPage.tsx`) reintroduzca `margin: auto` o `display: flex` centrado sobre `.printable-ticket` en modo impresión. — `TicketPreviewPage.tsx` envuelve el ticket en un contenedor `space-y-4`; el selector Tailwind `> :not([hidden]) ~ :not([hidden])` tiene más especificidad que `.printable-ticket{margin:0}` plano, así que se usó `margin: 0 !important` (y `top`/`left`/`position` también `!important`) para garantizar que gane sobre cualquier utilidad de espaciado del wrapper.

## 2. Robustez de ancho

- [x] 2.1 En el `@media print` de `PrintableTicket.tsx`, agregar `box-sizing: border-box` a `.printable-ticket` y a `.printable-ticket *` (selector universal scoped), sin cambiar el ancho declarado (`${paperWidth}`).
- [x] 2.2 Revisar visualmente (o vía `mcp__playwright__browser_take_screenshot` en modo print-preview) que ningún elemento interno (imagen del logo, tabla de items, párrafos con `whiteSpace: pre-wrap`) se desborde del ancho declarado con datos de venta reales (nombres de producto largos, direcciones largas). — Verificado con Playwright (`page.emulateMedia({media:'print'})`) contra venta real `d07fd50c-...` (cliente "AGRISAS AGRISAS", crédito 30 días, dirección de proveedor larga). `boundingBox()` del `.printable-ticket` da `x:0, y:0` (anclaje top-left confirmado) y un chequeo programático de `getBoundingClientRect()` de todos los hijos no encontró ningún elemento desbordado del ancho declarado (`overflow.offenders: []`). Screenshot en `test-results/ticket-print-preview.png`.

## 3. Feed final y margen de seguridad

- [x] 3.1 En `computeTicketPageHeightMm` (`PrintableTicket.tsx`), subir `SAFETY_MARGIN_MM` de `20` a `35`.
- [x] 3.2 Agregar un elemento de espaciado explícito al final del contenido imprimible (después del folio/código de barras decorativo), ej. `<div style={{ height: "12mm" }} aria-hidden="true" />`, para dar feed adicional antes del corte automático. — Implementado como `FINAL_FEED_MM = 12` (constante nombrada, no literal inline).
- [x] 3.3 Confirmar que el nuevo total (`SAFETY_MARGIN_MM` + feed final) sigue derivándose solo de `sale` ya cargado, sin `ref`/`getBoundingClientRect()` ni dependencia de timing de `beforeprint` (no romper la Scenario "Height calculation requires no DOM measurement or print-event timing" ya vigente en `ticket-print-ui`). — Confirmado: `computeTicketPageHeightMm` sigue siendo función pura sobre `sale`, sin refs ni medición DOM.

## 4. Spec y verificación

- [x] 4.1 Correr `openspec validate --strict --change document-thermal-print-limitation` y corregir cualquier error de formato.
- [x] 4.2 Correr la suite de tests de UI existente (`npm test`) para confirmar que no se rompió ningún test de `PrintableTicket`/ticket-print. Había tests directos del componente (`PrintableTicket.test.tsx`, `TicketPreviewPage.test.tsx`) — 4 aserciones sobre el valor exacto de `@page { size: ... }` se actualizaron para reflejar `SAFETY_MARGIN_MM=35` + `FINAL_FEED_MM=12` (antes solo `20`); las 40 pruebas de esos dos archivos pasan. Suite completa: 3693/3699 pass; las 6 fallas son en `tests/integration/modules/products/products-crud.test.ts` (conflicto de FK `inventory_movements_product_id_fkey` en `cleanup()` contra la DB real) — no relacionado con este change, pre-existente al estado de la BD de este entorno.
- [x] 4.3 Documentar en el PR/reporte de esta tarea que la validación final de los tres síntomas (anclaje, ancho, corte/hoja en blanco) requiere confirmación explícita del cliente imprimiendo en la EPSON TM-T20II física — no se cierra `opsx:verify` como "resuelto" solo con revisión de código. — Documentado aquí y en `design.md`/Risks; también pendiente 2.2 (revisión visual Playwright) antes de dar por completo el ajuste de ancho.
- [ ] 4.4 Una vez el cliente confirme en hardware real (o reporte que persiste alguna limitación de driver/SO), actualizar este change con el resultado antes de `opsx:archive`. — Pendiente por naturaleza (requiere hardware físico); no se completa en esta sesión.
