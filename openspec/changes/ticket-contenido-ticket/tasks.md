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

## 7. Tests

- [x] 7.1 Backend unit: `UpdateTicketSettingsUseCase.test.ts`, `GetTicketSettingsUseCase.test.ts`, `SettingsController.test.ts`, `toSaleDto.test.ts`, `InMemorySaleRepository` — verdes.
- [x] 7.2 UI unit: `PrintableTicket.test.tsx`, `TicketSettingsForm.test.tsx`, `TicketPreviewPage.test.tsx` — verdes.
- [x] 7.3 `npx jest --runInBand "tests/unit/modules"` — 166 suites / 1269 tests verdes.

## 8. E2E (Playwright)

- [x] 8.1 `tests/e2e/sales-ticket-print.spec.ts` — ampliar T2 con asserts "Vendedor:", "Sucursal:", "Total a pagar" en `.print-area`; ejecutado 3/3 verde.

## 9. Verificación

- [x] 9.1 `npx jest` — suite UI completa 237 suites / 1556 tests verdes.
- [x] 9.2 `npm run build` — typecheck y build verdes.
- [x] 9.3 `npx playwright test sales-ticket-print` — e2e verde (3/3).
