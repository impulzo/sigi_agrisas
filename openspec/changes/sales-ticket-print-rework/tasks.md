# sales-ticket-print-rework — Tasks

## 1. Especs (OpenSpec)

- [x] 1.1 `openspec/changes/sales-ticket-print-rework/` — proposal.md con tabla de historias, design.md y delta specs de `ticket-print-ui` y `sales-ticket-preview-ui`.

## 2. Frontend — aislamiento y redundancia

- [ ] 2.1 `app/(private)/sales/_blocks/SaleDetailPage.tsx` — eliminar el botón "Imprimir ticket" (líneas ~148-154). Conservar el Link "Ver Ticket" y el montaje de `<PrintableTicket>` al final.
- [ ] 2.2 `app/globals.css` — agregar bloque global `@media print` (D1): `body { visibility: hidden; }` + `.print-area` visible (`visibility: visible; position: absolute; top: 0; left: 0; width: 100%;`) + `.print-area * { visibility: visible; }`.

## 3. Frontend — ticket térmico alineado a Stitch

- [ ] 3.1 `app/(private)/sales/_blocks/PrintableTicket.tsx` — agregar clase `print-area` al root (manteniendo `hidden print:block`).
- [ ] 3.2 `PrintableTicket.tsx` — agregar marca "Agrisas" (título de marca), línea de método de pago (`sale.paymentMethodName`), y folio al final con elemento decorativo tipo código de barras (`repeating-linear-gradient` monocromo + texto del folio). Mantener monospace, `paperWidth` 58/80mm, logo/header/footer condicionales y Subtotal/IVA/IEPS/Total siempre separados.

## 4. Tests

- [ ] 4.1 `tests/unit/ui/(private)/sales/PrintableTicket.test.tsx` — casos nuevos: muestra método de pago, marca "Agrisas", folio al final con barcode decorativo; mantener casos existentes (IVA/IEPS separados, fallback sin logo, `paperWidth`).
- [ ] 4.2 `tests/unit/ui/(private)/sales/_blocks/SaleDetailPage.test.tsx` — aserción: "Imprimir ticket" ausente y "Ver Ticket" presente.

## 5. E2E (Playwright)

- [ ] 5.1 `tests/e2e/sales-ticket-print.spec.ts` (nuevo) — login admin; detalle de venta sin botón "Imprimir ticket" y con "Ver Ticket"; navegación a `/sales/:id/ticket`; `page.emulateMedia({ media: "print" })` verifica que solo el ticket es visible (rail/back link/acciones/tarjeta ocultos) y vuelve a "screen" con la tarjeta visible.

## 6. Verificación

- [ ] 6.1 `npx jest` — suite verde.
- [ ] 6.2 `npm run build` — typecheck verde.
- [ ] 6.3 `npx playwright test sales-ticket-print` — e2e verde.
