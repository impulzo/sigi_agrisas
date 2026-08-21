## 1. Cálculo determinístico de altura

- [x] 1.1 En `PrintableTicket.tsx`, agregar constantes `BASE_HEIGHT_MM = 120`, `CUSTOMER_SECTION_HEIGHT_MM = 30`, `CREDIT_LINE_HEIGHT_MM = 8`, `PER_ITEM_HEIGHT_MM = 12`, `SAFETY_MARGIN_MM = 20`.
- [x] 1.2 Implementar función pura `computeTicketPageHeightMm(sale: SaleDetail): number` que sume `BASE_HEIGHT_MM + (sale.customerId ? CUSTOMER_SECTION_HEIGHT_MM : 0) + (sale.customerCreditDays != null ? CREDIT_LINE_HEIGHT_MM : 0) + sale.items.length * PER_ITEM_HEIGHT_MM + SAFETY_MARGIN_MM`.
- [x] 1.3 Llamar `computeTicketPageHeightMm(sale)` al inicio del componente (sin `ref`/`useLayoutEffect`/estado — cálculo síncrono desde props ya disponibles).

## 2. Reemplazo del `@page` fijo

- [x] 2.1 Sustituir el literal `3276mm` en `@page { size: ${paperWidth} 3276mm; margin: 0; }` por el valor calculado del paso 1 (`${pageHeightMm}mm`).
- [x] 2.2 Verificar que el `width` del contenido (`.printable-ticket { width: ${paperWidth}; ... }`) sigue sin cambios, tomado de `ticketSettings?.paperWidth ?? "80mm"`.

## 3. Verificación manual

> Claude in Chrome falló (ver `fix-ticket-preview-print-and-nav-rail/tasks.md` sección 3). Verificado en su lugar con Playwright MCP: `page.pdf({ emulateMedia: 'print', preferCSSPageSize: true })` sobre una venta real (2 items, con cliente y crédito) — respeta el `@page` inyectado por el componente en vez del tamaño Letter por defecto de la herramienta.

- [x] 3.1 Ticket corto (2 items) renderizado a `@page { size: 80mm 190mm }`: contenido a tamaño legible, sin shrink, una sola página. Confirmado por PDF real.
- [x] 3.2 Ticket largo: no se generó una venta con muchas líneas en este entorno, pero la fórmula `computeTicketPageHeightMm` (altura = base + items×12mm + secciones) ya está cubierta por tests unitarios que verifican alturas crecientes con más items (`declares a larger @page height for tickets with more item lines`) — la altura del `@page` escala automáticamente, sin límite fijo que corte contenido, así que no hay riesgo de paginación por diseño (una sola página, alto variable).
- [x] 3.3 Ancho por `paperWidth` confirmado a nivel unitario (`declares @page size matching the default 80mm paper width`, `... matching the configured 58mm paper width`) y a nivel real para 80mm vía el PDF generado; ambos coinciden con lo esperado.

## 4. Tests

- [x] 4.1 Revisar si existen tests unitarios de `PrintableTicket` que asuman el literal `3276mm`; actualizarlos para reflejar la altura calculada (o mockear la medición del DOM).
- [x] 4.2 Correr `npm test` para confirmar que no se rompió nada en `tests/unit/ui/`.
- [x] 4.3 (agregado en opsx:verify) Detectado y corregido: 2 tests de `PrintableTicket.test.tsx` quedaron desactualizados por el cambio posterior `fix-ticket-preview-print-and-nav-rail` (logo 125×150→125×77, margen 2.4px→8px) — asertaban valores aún más viejos (105×147px, 2.4px) que ya no correspondían a ningún estado real del código. Actualizados a 125×77px / margin 8px. `npx jest tests/unit/ui` completo: 266/266 suites, 1774/1774 tests passed.
