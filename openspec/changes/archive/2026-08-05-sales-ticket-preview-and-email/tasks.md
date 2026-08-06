## 1. Backend — envío de ticket por correo

- [x] 1.1 `src/modules/pos/application/ports/PosLookups.ts`: `email: string | null` agregado a `CustomerLookup`. `PrismaPosLookupService.getCustomer` actualizado.
- [x] 1.2 `SaleNoEmailError.ts`/`SaleEmailSendFailedError.ts` en `src/modules/pos/domain/errors/`.
- [x] 1.3 `SendSaleTicketEmailUseCase.ts` implementado (carga venta, resuelve email, arma HTML, envía, errores tipados).
- [x] 1.4 `SalesController.sendTicketEmail` implementado (Zod, branch scoping, mapeo de errores 404/400/502).
- [x] 1.5 Endpoint `app/api/v1/admin/sales/[id]/send-ticket-email/route.ts`.
- [x] 1.6 DI en `src/modules/pos/infrastructure/di/container.ts` (reusa `mailer` de `mailerContainer`).
- [x] 1.7 `SendSaleTicketEmailUseCase.test.ts` — 6 casos, todos verdes.
- [x] 1.8 `SalesController.test.ts` — 4 casos nuevos de `sendTicketEmail`, todos verdes (30/30 total del archivo).

## 2. Frontend — página de preview del ticket

- [x] 2.1 `app/(private)/sales/[id]/ticket/page.tsx` — Server Component, delega a `TicketPreviewPage`.
- [x] 2.2 `TicketPreviewPage.tsx` implementado — reusa `useSaleDetail(id)` y `getTicketSettings()` (mismo patrón que `SaleDetailPage.tsx`). Layout Stitch mapeado: logo/marca (fallback ícono `agriculture`), folio (`folioPrefix`+`folioNumber`), fecha, cajero, tabla de items, Subtotal/IVA/IEPS (siempre visibles, sumando `item.lineIva`/`lineIeps`)/Total, método de pago, footer, código de barras decorativo (folio como texto, sin librería).
- [x] 2.3 Botón "Imprimir Ticket" monta `PrintableTicket.tsx` existente (oculto) + `window.print()` — no imprime el diseño Stitch.
- [x] 2.4 Botón "Enviar por Correo" abre `SendTicketEmailModal`.
- [x] 2.5 Enlace "Ver Ticket" agregado en `SaleDetailPage.tsx` junto al botón "Imprimir ticket" existente.
- Nota: se agregaron los íconos `mail`/`credit_card` al whitelist `ICON_NAMES` (`app/_components/atoms/Icon/icons.ts`), no existían.

## 3. Frontend — envío de correo

- [x] 3.1 (No se creó `SendTicketEmailResponse` tipo aparte — el servicio retorna `{ sentTo: string }` inline, igual que `sendInvoiceEmail.ts`.)
- [x] 3.2 `sales/_logic/errors.ts`: `SaleNoEmailError`, `SaleEmailSendFailedError` agregados.
- [x] 3.3 `sales/_logic/services/sendTicketEmail.ts` implementado y exportado en `services/index.ts`.
- [x] 3.4 `sales/_logic/hooks/useSaleTicketEmail.ts` — hook dedicado (no se extendió `useSaleMutations` por diferir el tipo de retorno de sus otras mutaciones).
- [x] 3.5 `SendTicketEmailModal.tsx` — copia estructural de `SendInvoiceEmailModal.tsx`.
- [x] 3.6 Tests UI: `SendTicketEmailModal.test.tsx` (5 casos) y `TicketPreviewPage.test.tsx` (3 casos), todos verdes.

## 4. Specs y verificación

- [x] 4.1 `npm test` — módulo `pos` (backend) y UI de `sales`/ticket en verde (ver detalle abajo tras corrida completa).
- [x] 4.2 `npm run build` sin errores de tipos (confirmado 2 veces: tras backend, tras frontend).
- [x] 4.3 Playwright real: `/sales/0e4ea13f.../ticket` — layout Stitch confirmado (logo, orden, fecha, cajero, items, Subtotal/IVA/IEPS/Total siempre visibles incl. IEPS=$0.00, método de pago, footer, código de barras decorativo). Botón "Imprimir Ticket" presente (sin clic, por el bloqueo conocido del diálogo nativo de impresión en Playwright). "Enviar por Correo" probado con correo override — modal confirmó "Correo enviado a test-ticket@example.com" (envío real, no mock).
- [x] 4.4 `openspec validate sales-ticket-preview-and-email --strict` — "Change 'sales-ticket-preview-and-email' is valid".
