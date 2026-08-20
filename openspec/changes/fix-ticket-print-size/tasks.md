## 1. Cálculo determinístico de altura

- [x] 1.1 En `PrintableTicket.tsx`, agregar constantes `BASE_HEIGHT_MM = 120`, `CUSTOMER_SECTION_HEIGHT_MM = 30`, `CREDIT_LINE_HEIGHT_MM = 8`, `PER_ITEM_HEIGHT_MM = 12`, `SAFETY_MARGIN_MM = 20`.
- [x] 1.2 Implementar función pura `computeTicketPageHeightMm(sale: SaleDetail): number` que sume `BASE_HEIGHT_MM + (sale.customerId ? CUSTOMER_SECTION_HEIGHT_MM : 0) + (sale.customerCreditDays != null ? CREDIT_LINE_HEIGHT_MM : 0) + sale.items.length * PER_ITEM_HEIGHT_MM + SAFETY_MARGIN_MM`.
- [x] 1.3 Llamar `computeTicketPageHeightMm(sale)` al inicio del componente (sin `ref`/`useLayoutEffect`/estado — cálculo síncrono desde props ya disponibles).

## 2. Reemplazo del `@page` fijo

- [x] 2.1 Sustituir el literal `3276mm` en `@page { size: ${paperWidth} 3276mm; margin: 0; }` por el valor calculado del paso 1 (`${pageHeightMm}mm`).
- [x] 2.2 Verificar que el `width` del contenido (`.printable-ticket { width: ${paperWidth}; ... }`) sigue sin cambios, tomado de `ticketSettings?.paperWidth ?? "80mm"`.

## 3. Verificación manual

- [ ] 3.1 Probar impresión (`window.print()` → "Guardar como PDF") con un ticket corto (pocas líneas) y confirmar que el contenido sale a tamaño legible, sin shrink perceptible.
- [ ] 3.2 Probar con un ticket largo (muchas líneas de items) y confirmar que sigue saliendo en una sola página, sin cortes ni paginación.
- [ ] 3.3 Confirmar que el ancho sigue respetando `58mm`/`80mm` según `ticketSettings.paperWidth` en ambos casos.

## 4. Tests

- [x] 4.1 Revisar si existen tests unitarios de `PrintableTicket` que asuman el literal `3276mm`; actualizarlos para reflejar la altura calculada (o mockear la medición del DOM).
- [x] 4.2 Correr `npm test` para confirmar que no se rompió nada en `tests/unit/ui/`.
