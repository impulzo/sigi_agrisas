# ticket-contenido-ticket — Tasks

## 1. Especs (OpenSpec)

- [x] 1.1 `openspec/changes/ticket-contenido-ticket/` — proposal.md con tabla de historias, design.md y delta specs de `ticket-print-ui`, `sales-ticket-preview-ui`, `settings-api` y `pos-api`.

## 2. Backend — settings

- [x] 2.1 `prisma/migrations/20260809000001_add_ticket_business_fields/migration.sql` — `ALTER TABLE ticket_settings ADD COLUMN business_address VARCHAR(300)`, `business_phone VARCHAR(30)`, `business_tax_regime VARCHAR(120)`, `legend_text VARCHAR(500)`; aplicada con `prisma migrate deploy` y `prisma generate`.
- [x] 2.2 `prisma/schema.prisma` — modelo `TicketSettings` con los 4 campos nuevos.
- [x] 2.3 `src/modules/settings/domain/entities/TicketSettings.ts` — campos + `DEFAULT_TICKET_SETTINGS` (dirección Ocotlán CP 71520, tel 951 292 80 86, régimen 612, leyenda "Favor de revisar su mercancia. No se hacen cambios ni devoluciones. Gracias por su compra.").
- [x] 2.4 `src/modules/settings/application/ports/TicketSettingsRepository.ts` — `UpdateTicketSettingsData` con los 4 campos.
- [x] 2.5 `src/modules/settings/infrastructure/repositories/PrismaTicketSettingsRepository.ts` — create con defaults, update merge.
- [x] 2.6 `src/modules/settings/infrastructure/repositories/InMemoryTicketSettingsRepository.ts` — spread merge.
- [x] 2.7 `src/modules/settings/application/use-cases/UpdateTicketSettingsUseCase.ts` — array `keys` para EmptyUpdateError.
- [x] 2.8 `src/modules/settings/infrastructure/http/SettingsController.ts` — `updateTicketSchema` con max address 300 / phone 30 / regime 120 / legend 500.

## 3. Backend — venta

- [x] 3.1 `src/modules/pos/infrastructure/repositories/PrismaSaleRepository.ts` — join de `customer.address` y `customer.creditDays`; `SaleJoinedFields` con `customerAddress`, `customerCreditDays`.
- [x] 3.2 `src/modules/pos/application/mappers/toSaleDto.ts` — mapear los campos nuevos.
- [x] 3.3 `src/modules/pos/application/dto/SaleDto.ts` — `SaleDetailDto`/`SaleSummary` con `customerAddress`, `customerCreditDays`.
- [x] 3.4 `src/modules/pos/infrastructure/repositories/InMemorySaleRepository.ts` — `emptyJoined()` con los campos nuevos (null).

## 4. Frontend — tipos

- [x] 4.1 `app/(private)/sales/_logic/types/api.ts` + `domain.ts` — `SaleSummaryDto`/`SaleSummary` con `customerAddress`, `customerCreditDays` (`customerRfc` ya existía).
- [x] 4.2 `app/(private)/settings/_logic/types/api.ts` — `TicketSettingsDto` y `UpdateTicketSettingsBody` con los 4 campos de negocio.

## 5. Frontend — settings UI

- [x] 5.1 `app/(private)/settings/_blocks/TicketSettingsForm.tsx` — sección "Información del negocio" (dirección, teléfono, régimen fiscal) + textarea leyenda; `handleSave` incluye los 4 campos en el PATCH.

## 6. Frontend — ticket

- [x] 6.1 `app/(private)/sales/_blocks/PrintableTicket.tsx` — reordenar por secciones: negocio (dir/tel/régimen) bajo el header, "Vendedor:" (reemplaza "Cajero:"), sección Cliente (RFC/Nombre/Dirección, solo con `customerId`), Condiciones (solo con `customerCreditDays`), "Total a pagar" (reemplaza "Total"), leyenda bajo el footer.
- [x] 6.2 `app/(private)/sales/[id]/ticket/_blocks/TicketPreviewPage.tsx` — "Orden:" → "Folio:", "Cajero:" → "Vendedor:", secciones cliente/condiciones/negocio, "Total" → "Total a pagar", leyenda.
- [x] 6.3 `app/(private)/sales/_blocks/PrintableTicket.tsx` — logo a 50x70px en `@media print` (`width: 50px; height: 70px; object-fit: contain`).
- [x] 6.4 `app/(private)/sales/[id]/ticket/_blocks/TicketPreviewPage.tsx` — logo de la tarjeta Stitch a `w-[50px] h-[70px] object-contain` (mismo tamaño que el impreso).
- [x] 6.5 `app/(private)/sales/[id]/ticket/_blocks/TicketPreviewPage.tsx` — fallback del logo pasa de `<Icon agriculture>` (material-symbols-outlined) a `<img src="/logo.png">` siempre (logo subido o embebido); se elimina el `<Icon credit_card>` del chip de método de pago. Cero `material-symbols-outlined` dentro de la tarjeta del ticket.
- [x] 6.6 `app/(private)/sales/_blocks/PrintableTicket.tsx` — logo aumentado 50% a 75x105px en `@media print` (`width: 75px; height: 105px; object-fit: contain`, margin sin cambios).
- [x] 6.7 `app/(private)/sales/[id]/ticket/_blocks/TicketPreviewPage.tsx` — logo aumentado 50% a `w-[75px] h-[105px] object-contain` (mismo tamaño que el impreso, `mb-2` y layout flex sin cambios).
- [x] 6.8 Delta specs `ticket-print-ui/spec.md` y `sales-ticket-preview-ui/spec.md` — escenarios de tamaño de logo actualizados a 75x105px; nuevo escenario explícito "Folio rendered below the decorative barcode" formalizando comportamiento ya implementado (folio como texto plano justo debajo del elemento decorativo tipo código de barras).
- [x] 6.9 `app/(private)/sales/_logic/types/api.ts` + `domain.ts` — `SaleSummaryDto`/`SaleSummary` con `folioCode: string` (bug: `folioPrefix` nunca lo manda el backend; el ticket caía siempre al fallback de número pelado).
- [x] 6.10 `app/(private)/sales/_blocks/PrintableTicket.tsx` y `app/(private)/sales/[id]/ticket/_blocks/TicketPreviewPage.tsx` — `folioLabel = sale.folioCode` (folio completo con prefijo, ej. `TK000042`, en vez del número pelado). Fuera de alcance: `SalesTable`, `SaleDetailPage`, `EditSalePage`, `CreateReturnPage`, `SalePaymentsSection` conservan el mismo patrón roto (`folioPrefix`), pendiente de fix futuro.
- [x] 6.11 `app/(private)/sales/_blocks/PrintableTicket.tsx` — margen inferior del logo reducido 40% (`margin: 0 auto 4px` → `margin: 0 auto 2.4px`).
- [x] 6.12 `app/(private)/sales/[id]/ticket/_blocks/TicketPreviewPage.tsx` — margen inferior del logo reducido 40% (`mb-2` → `mb-[4.8px]`).

## 7. Tests

- [x] 7.1 Backend unit: `UpdateTicketSettingsUseCase.test.ts`, `GetTicketSettingsUseCase.test.ts`, `SettingsController.test.ts`, `toSaleDto.test.ts`, `InMemorySaleRepository` — verdes.
- [x] 7.2 UI unit: `PrintableTicket.test.tsx`, `TicketSettingsForm.test.tsx`, `TicketPreviewPage.test.tsx` — verdes.
- [x] 7.3 `npx jest --runInBand "tests/unit/modules"` — 166 suites / 1269 tests verdes.
- [x] 7.4 UI unit logo 50x70: `PrintableTicket.test.tsx` (assert `width: 50px; height: 70px` en el `<style>`), `TicketPreviewPage.test.tsx` (assert `w-[50px] h-[70px]` en el logo) — verdes.
- [x] 7.5 UI unit sin iconos en el ticket: `TicketPreviewPage.test.tsx` — fallback `logoUrl: null` renderiza `<img src="/logo.png">`; la tarjeta del ticket no contiene `.material-symbols-outlined` — verdes.
- [x] 7.6 UI unit logo 75x105: `PrintableTicket.test.tsx` (assert `width: 75px; height: 105px` en el `<style>`), `TicketPreviewPage.test.tsx` (assert `w-[75px] h-[105px]` en el logo) — verdes.
- [x] 7.7 UI unit folioCode + margen: `PrintableTicket.test.tsx` (mock con `folioCode: "TK-42"`, assert `margin: 0 auto 2.4px;`), `TicketPreviewPage.test.tsx` (mock con `folioCode: "A-42"`, assert `mb-[4.8px]` en el logo) — verdes.

## 8. E2E (Playwright)

- [x] 8.1 `tests/e2e/sales-ticket-print.spec.ts` — ampliar T2 con asserts "Vendedor:", "Sucursal:", "Total a pagar" en `.print-area`; ejecutado 3/3 verde.
- [x] 8.2 `tests/e2e/sales-ticket-print.spec.ts` — T2 assert CSS `width: 50px; height: 70px` del logo en `.print-area` (modo print); ejecutado 3/3 verde.
- [x] 8.3 `tests/e2e/sales-ticket-print.spec.ts` — T2 assert CSS actualizado a `width: 75px; height: 105px` del logo en `.print-area` tras el aumento del 50%; ejecutado 3/3 verde.

## 9. Verificación

- [x] 9.1 `npx jest` — suite UI completa 237 suites / 1556 tests verdes.
- [x] 9.2 `npm run build` — typecheck y build verdes.
- [x] 9.3 `npx playwright test sales-ticket-print` — e2e verde (3/3).
