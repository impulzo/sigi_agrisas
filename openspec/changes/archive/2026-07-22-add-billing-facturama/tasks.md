## 1. Base de datos y Prisma

- [x] 1.1 Agregar modelo `Invoice` a `prisma/schema.prisma`: `id`, `uuid String? @map("uuid") @db.VarChar(40)` (folio fiscal SAT), `facturamaCfdiId String? @map("facturama_cfdi_id")`, `status String @db.VarChar(20)` (`stamped`/`cancelled`), `cfdiType String @default("I") @map("cfdi_type") @db.VarChar(2)`, `cfdiUse`, `paymentForm`, `paymentMethod`, snapshot receptor (`receiverRfc`, `receiverName`, `receiverCfdiUse`, `receiverFiscalRegime`, `receiverTaxZipCode`), `currency String @default("MXN")`, `subtotal/taxTotal/total Decimal @db.Decimal(14,4)`, `xmlUrl String?`, `pdfUrl String?`, `saleId String? @map("sale_id")`, `branchId String @map("branch_id")`, `customerId String? @map("customer_id")`, `cancellationMotive String? @db.VarChar(2)`, `uuidReplacement String?`, `cancelledAt DateTime?`, `cancelledBy String? @db.Uuid`, `creatorId String @db.Uuid`, `createdAt/updatedAt`. Índices en `branchId`, `saleId`, `status`, `uuid`.
- [x] 1.2 Agregar modelo `InvoiceItem`: `id`, `invoiceId @map("invoice_id")`, `productId String? @map("product_id")`, `productCodeSnapshot`, `productNameSnapshot`, `satProductCode String? @db.VarChar(8)`, `satUnitCode String? @db.VarChar(10)`, `unit`, `quantity Decimal @db.Decimal(14,4)`, `unitPrice Decimal @db.Decimal(14,4)`, `discountPct Decimal? @db.Decimal(5,2)`, `ivaRate/iepsRate Decimal @db.Decimal(6,4)`, `taxObject String @db.VarChar(2)`, `lineSubtotal/lineIva/lineIeps/lineTotal Decimal @db.Decimal(14,4)`. Relación a `Invoice` `onDelete: Cascade`.
- [x] 1.3 Relación opcional en `Sale`: `invoices Invoice[]`. FK `Invoice.sale` `ON DELETE SET NULL`; FK `Invoice.branch` `Restrict`; FK `Invoice.customer` `Restrict`.
- [x] 1.4 `npx prisma migrate dev --name add_billing_tables` y verificar migración.
- [x] 1.5 `npx prisma generate`.

## 2. RBAC y entorno

- [x] 2.1 Agregar `billing:read`, `billing:write`, `billing:cancel`, `billing:manage_csd` al array de permisos en `prisma/seeds/rbac.ts`; asignar: `admin` → los 4; `operator` → read/write/cancel; `viewer` → read.
- [x] 2.2 Agregar a `.env.example`: `FACTURAMA_BASE_URL` (default sandbox `https://apisandbox.facturama.mx/`), `FACTURAMA_USER`, `FACTURAMA_PASSWORD`, `FACTURAMA_MOCK=true`. Documentar credenciales simuladas.

## 3. Módulo `billing` — Dominio

- [x] 3.1 `src/modules/billing/domain/entities/Invoice.ts` — entity pura + `InvoiceItem`.
- [x] 3.2 `src/modules/billing/domain/value-objects/InvoiceStatus.ts` (`stamped`|`cancelled`), `CancellationMotive.ts` (`01`–`04`), `CfdiUse`/`PaymentForm`/`PaymentMethod` (validación de formato SAT).
- [x] 3.3 `src/modules/billing/domain/services/InvoiceTotalsCalculator.ts` — banker's rounding `Decimal(14,4)`, mismo vector que `SaleTotalsCalculator` (reusa `tests/fixtures/totals-vectors.ts` para test de equivalencia).
- [x] 3.4 `src/modules/billing/domain/errors.ts` — `InvoiceNotFoundError`, `SaleNotInvoiceableError`, `SaleAlreadyInvoicedError`, `ReceiverFiscalDataIncompleteError`, `InvoiceAlreadyCancelledError`, `FacturamaStampError`, `FacturamaCancelError`, `BranchScopeViolationError`.

## 4. Módulo `billing` — Application (ports + use cases)

- [x] 4.1 Port `application/ports/InvoiceRepository.ts`: `list`, `findById`, `findByIdWithItems`, `findBySale`, `findStampedBySale`, `createStamped`, `markCancelled`.
- [x] 4.2 Port `application/ports/FacturamaGateway.ts`: `stamp(payload)`, `cancel(cfdiId, motive, uuidReplacement?)`, `download(format, cfdiId)`, `uploadCsd(input)`, `getCsdStatus(rfc?)`.
- [x] 4.3 Port `application/ports/BillingLookupService.ts` (o reuso de `PosLookupService`): cargar `Sale`+items, `Customer`, `Branch`, `PaymentMethod` para el mapeo. Mapper `application/mappers/saleToCfdiPayload.ts` y `standaloneToCfdiPayload.ts`.
- [x] 4.4 DTOs `application/dto/InvoiceDto.ts`, `InvoiceItemDto.ts`, requests (`StampInvoiceRequest`, `CancelInvoiceRequest`, `UploadCsdRequest`). Mapper `toInvoiceDto.ts`.
- [x] 4.5 Use cases: `StampInvoiceUseCase` (rama sale-linked / standalone; valida receptor; llama gateway; persiste; **no toca inventario**), `CancelInvoiceUseCase`, `DownloadInvoiceFileUseCase`, `ListInvoicesUseCase`, `GetInvoiceUseCase`, `ListInvoicesBySaleUseCase`, `UploadCsdUseCase`, `GetCsdStatusUseCase`.

## 5. Módulo `billing` — Infraestructura

- [x] 5.1 `infrastructure/repositories/PrismaInvoiceRepository.ts` — `createStamped` (tx: insert `invoices`+`invoice_items`), `markCancelled`, lecturas con scoping.
- [x] 5.2 `infrastructure/repositories/InMemoryInvoiceRepository.ts` para tests de use cases.
- [x] 5.3 `infrastructure/services/FacturamaRestGateway.ts` — `fetch` con Basic Auth desde env, `fetchImpl?` inyectable, normaliza errores HTTP → errores tipados. Mapea `POST /cfdis`, `DELETE /cfdi/{id}?type=issued&motive=`, `GET /cfdi/{format}/issued/{id}`, `POST /api/Csd`.
- [x] 5.4 `infrastructure/services/FakeFacturamaGateway.ts` — UUIDs/archivos deterministas, sin red (modo mock).
- [x] 5.5 `infrastructure/http/BillingController.ts` — handlers `stamp`, `list`, `getById`, `listBySale`, `cancel`, `download`, `uploadCsd`, `getCsdStatus`. Validación Zod; orden UUID+body → `enforceBranchScope` → use case. `requirePermission` por endpoint.
- [x] 5.6 `infrastructure/di/container.ts` — exporta `billingController`. Selecciona `FakeFacturamaGateway` si `FACTURAMA_MOCK!=='false'`, si no `FacturamaRestGateway`. Instancia `PrismaSaleRepository`/lookup localmente para evitar import circular con `pos/di`.

## 6. Routes API

- [x] 6.1 `app/api/v1/admin/invoices/route.ts` — GET (list), POST (stamp).
- [x] 6.2 `app/api/v1/admin/invoices/[id]/route.ts` — GET (detail).
- [x] 6.3 `app/api/v1/admin/invoices/[id]/cancel/route.ts` — POST (cancel).
- [x] 6.4 `app/api/v1/admin/invoices/[id]/download/route.ts` — GET (pdf/xml stream).
- [x] 6.5 `app/api/v1/admin/sales/[id]/invoices/route.ts` — GET (list by sale).
- [x] 6.6 `app/api/v1/admin/billing/csd/route.ts` — POST (upload), GET (status).

## 7. Tests

- [x] 7.1 `tests/unit/modules/billing/StampInvoiceUseCase.test.ts` — sale-linked OK; standalone OK; sale no completed → 409; sale ya facturada → 409; receptor incompleto → 400; **verifica que NO se llama inventario**; Facturama rechaza → propaga `FacturamaStampError`.
- [x] 7.2 `tests/unit/modules/billing/CancelInvoiceUseCase.test.ts` — cancela `stamped` → `cancelled`; doble cancel → 409; motivo inválido (en controller) → 400.
- [x] 7.3 `tests/unit/modules/billing/InvoiceTotalsCalculator.test.ts` — equivalencia con `SaleTotalsCalculator` sobre `tests/fixtures/totals-vectors.ts`.
- [x] 7.4 `tests/unit/modules/billing/FacturamaRestGateway.test.ts` — arma Basic Auth correcto; mapea endpoints; normaliza errores; usa `fetchImpl` mock.
- [x] 7.5 `tests/unit/modules/billing/FakeFacturamaGateway.test.ts` — deterministas; sin red.
- [x] 7.6 Branch scoping: list scoped; getById/cancel/download fuera de scope → 403.

## 8. Verificación

- [x] 8.1 `npm run build` (typecheck) y `npm test` verdes.
- [x] 8.2 `npm run seed` agrega los 4 permisos `billing:*` sin duplicar.
- [x] 8.3 Smoke en modo mock (`FACTURAMA_MOCK=true`): timbrar desde una venta → 201 con `uuid` fake; descargar pdf → 200; cancelar → 200; re-timbrar → 409.
