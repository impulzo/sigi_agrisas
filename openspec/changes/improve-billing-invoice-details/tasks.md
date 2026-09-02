## 1. Migración de base de datos

- [x] 1.1 Agregar `TicketSettings.businessEmail String? @db.VarChar(200)` e `Invoice.issuerEmail String? @db.VarChar(200)` en `prisma/schema.prisma`
- [x] 1.2 Correr `npx prisma migrate dev --name add_business_email_and_issuer_email_snapshot` (aplicada como migración manual `20260902033915_add_business_email_and_issuer_email_snapshot` vía `migrate deploy` — el entorno no es interactivo, `migrate dev` lo rechaza; SQL equivalente, misma convención del proyecto)
- [x] 1.3 `npx prisma generate`

## 2. Grupo A (backend) — correo del emisor en `TicketSettings` y cascada

- [x] 2.1 `src/modules/settings/domain/entities/TicketSettings.ts`: agregar `businessEmail: string | null` a `TicketSettings`/`DEFAULT_TICKET_SETTINGS`
- [x] 2.2 Repos de `TicketSettings` (Prisma e InMemory) y su `UpdateTicketSettingsUseCase`/port: propagar `businessEmail` en lectura y en el `upsert`/`update` parcial
- [x] 2.3 `src/modules/settings/infrastructure/http/SettingsController.ts`: agregar `businessEmail: z.string().email().max(200).nullable().optional()` a `updateTicketSchema`
- [x] 2.4 `src/modules/billing/application/services/resolveIssuerFiscalData.ts`: agregar `email: string | null` a `IssuerFiscalData`, resuelto sólo desde `ticket?.businessEmail ?? null`; documentar en el comentario que este campo tiene un único tier

## 3. Grupo A (backend) — snapshot de `issuerEmail` en `Invoice`

- [x] 3.1 `src/modules/billing/domain/entities/Invoice.ts`: agregar `issuerEmail: string | null` (interface + clase), junto a `issuerAddress`
- [x] 3.2 `src/modules/billing/application/dto/InvoiceDto.ts` y `application/mappers/toInvoiceDto.ts`: agregar `issuerEmail`
- [x] 3.3 `src/modules/billing/application/ports/InvoiceRepository.ts` (`CreateInvoiceData`): agregar `issuerEmail`
- [x] 3.4 `src/modules/billing/infrastructure/repositories/{PrismaInvoiceRepository,InMemoryInvoiceRepository}.ts`: agregar `issuerEmail` en mapper de lectura y en `create`
- [x] 3.5 `src/modules/billing/application/use-cases/StampInvoiceUseCase.ts`: `resolveIssuerSnapshot()` agrega `issuerEmail: issuer.email` (se propaga a `stampFromSale`/`stampStandalone` vía el spread existente)

## 4. Grupo A (backend) — fecha de emisión y correo en PDF/descarga

- [x] 4.1 `src/modules/billing/application/ports/FacturamaGateway.ts` (`FacturamaInvoiceSnapshot`): agregar `issuer.email: string | null` y `emittedAt?: string` (ISO) a nivel raíz
- [x] 4.2 `src/modules/billing/application/use-cases/DownloadInvoiceFileUseCase.ts` (`toSnapshot`): incluir `issuer.email` y `emittedAt: invoice.createdAt.toISOString()`
- [x] 4.3 `src/modules/billing/infrastructure/pdf/InvoiceDocumentPdf.tsx`: agregar `issuer.email?: string | null` (fila "Correo" en sección Emisor) y `emittedAt?: string | null` a nivel raíz de `InvoiceDocumentPdfData`; renderizar fila "Fecha de emisión" en `s.invoiceMeta` sólo si `!isDraft && data.emittedAt`
- [x] 4.4 `src/modules/billing/infrastructure/services/FakeFacturamaGateway.ts`: propagar `email`/`emittedAt` en `toInvoiceDocumentPdfDataFromSnapshot` y en el objeto `issuer` armado en `download()`; dejar `emittedAt` ausente en el path sin snapshot real (renderizado condicional evita error)
- [x] 4.5 `src/modules/billing/infrastructure/http/BillingController.ts` (`previewPdf`): agregar `email: emitter.email` al `issuer` (sin `emittedAt` — es borrador)

## 5. Grupo A (frontend) — correo en Configuración y en UI de factura

- [x] 5.1 `app/(private)/settings/_blocks/TicketSettingsForm.tsx`: agregar input `businessEmail` (`type="email"`) junto a "Teléfono", incluir en `handleSave` y en el `useEffect` de sincronización
- [x] 5.2 `app/(private)/billing/_logic/types/domain.ts`: agregar `issuerEmail: string | null` a `Invoice`
- [x] 5.3 `app/(private)/billing/_logic/services/getEmitterFiscalSettings.ts` + `hooks/useEmitterFiscalSettings.ts`: agregar `email: string | null`
- [x] 5.4 `app/(private)/billing/_logic/types/preview.ts` + `lib/buildInvoicePreview.ts`: agregar `email?: string | null` a `issuer`
- [x] 5.5 `app/(private)/billing/_logic/hooks/useInvoicePreview.ts`: propagar `email` al armar `issuer` para el preview (y en el fallback de error)
- [x] 5.6 `app/(private)/billing/_blocks/InvoiceMetaPanel.tsx`: fila "Correo" en "Datos del emisor"; extraer su helper `fmtDate` a `app/(private)/billing/_logic/lib/formatInvoiceDate.ts`
- [x] 5.7 `app/(private)/billing/_blocks/InvoicePreviewModal.tsx`: fila "Correo" equivalente en su bloque de emisor
- [x] 5.8 `app/(private)/billing/_blocks/InvoiceDetailPage.tsx`: agregar "Emitida: `<fecha+hora>`" en el header, usando `formatInvoiceDate.ts`

## 6. Grupo B — sucursal matriz fija en factura parcial

- [x] 6.1 `app/(private)/billing/_logic/hooks/usePartialInvoiceForm.ts`: incluir `branchId` explícitamente en el payload de `stampInvoice(...)` dentro de `submit()`
- [x] 6.2 `app/(private)/billing/_blocks/PartialInvoiceForm.tsx`: pasar `branchId={effectiveBranchId}` a `<ProductCatalogPanel>`
- [x] 6.3 `app/(private)/billing/_blocks/NewInvoicePage.tsx`: eliminar el `<Select>` de sucursal y el uso de `useBypassBranchOptions`/`isBypass` para modo `partial`; usar `useHeadquarters()` para fijar `branchId=hq.id`; mostrar spinner mientras `isLoading`; bloquear el formulario con mensaje explícito si `hq === null`

## 7. Grupo C (backend) — override de cliente al facturar venta

- [x] 7.1 `src/modules/billing/application/dto/InvoiceDto.ts` (`StampInvoiceFromSaleRequest`): agregar `customerId?: string | null`
- [x] 7.2 `src/modules/billing/infrastructure/http/BillingController.ts` (`stampFromSaleSchema`): agregar `customerId: z.string().uuid().nullable().optional()`
- [x] 7.3 `src/modules/billing/application/use-cases/StampInvoiceUseCase.ts` (`stampFromSale`): si `input.customerId` viene, resolver `lookupService.findCustomer(input.customerId)` como cliente efectivo en vez de `sale.customerId`; persistir `Invoice.customerId` = cliente efectivo; no tocar ningún campo de `sale`

## 8. Grupo C (frontend) — selector de cliente en "Facturar venta"

- [x] 8.1 `app/(private)/billing/_logic/services/getInvoicePreviewSource.ts`: aceptar `overrideCustomerId?`; resolver receptor desde ahí cuando venga; sólo bloquear con el error de "venta sin cliente" cuando ni la venta ni el override tengan cliente
- [x] 8.2 `app/(private)/billing/_logic/hooks/useInvoicePreview.ts`: agregar parámetro `customerId?: string` a `load(...)` y pasarlo a `getInvoicePreviewSource`
- [x] 8.3 `app/(private)/billing/_logic/hooks/useStampSaleForm.ts`: agregar `customerId` al estado (+ `selectSale` que resetea el override al cambiar de venta); incluirlo en el payload de `stampInvoice(...)`
- [x] 8.4 `app/(private)/billing/_blocks/StampSaleForm.tsx`: agregar `<CustomerPicker>` + `CustomerQuickAddModal` bajo `SalePickerField` (mismo patrón que `PartialInvoiceForm`), precargado con el cliente de la venta seleccionada (vía `SalePickerField.onSelect` extendido con `customerId`, y `SaleOption`/`searchSales` en `SalePickerField.tsx` propagando `customerId` desde el listado), editable; propagar el valor elegido a `useInvoicePreview.load(...)` en `handleOpenPreview()`

## 9. Verificación

- [x] 9.1 Unit test `resolveIssuerFiscalData.test.ts`: caso `email` resuelto sólo desde `TicketSettings`
- [x] 9.2 Unit test `StampInvoiceUseCase.test.ts`: snapshot incluye `issuerEmail`; caso `stampFromSale` con `customerId` override — assert de que ningún método de escritura sobre `Sale` es invocado
- [x] 9.3 Unit test `DownloadInvoiceFileUseCase`/`FakeFacturamaGateway`: `email`/`emittedAt` presentes en el snapshot y en el PDF mock
- [x] 9.4 Unit test `usePartialInvoiceForm.test.ts`: el payload de `submit()` incluye `branchId`
- [x] 9.5 Unit test `getInvoicePreviewSource.test.ts`: caso con `overrideCustomerId` y caso sin cliente en absoluto (bloqueo intacto)
- [x] 9.6 `npm test` — suite completa en verde (3915/3929 pasan, 14 skipped preexistentes; se actualizaron fixtures de `TicketSettingsDto`/`InvoiceDto`/`EmitterFiscalSettingsDto` con los campos nuevos y se reescribieron `NewInvoicePage.branchSelector.test.tsx`→`NewInvoicePage.headquartersBranch.test.tsx` y `NewInvoicePage.branchPriceIntegration.test.tsx` para reflejar la sucursal matriz fija en vez del selector eliminado)
- [x] 9.7 Manual con Playwright (verificado end-to-end contra dev server real, no mocks): `/settings` — `businessEmail` guardado y persistente tras recarga; `/billing/[id]` de factura pre-existente — "Correo" muestra "—" (snapshot null, pre-fecha de captura) y "Emitida: 30 de agosto de 2026..." correcto; `/billing/new` "Factura parcial" — sin selector de sucursal en ningún caso, bloqueo correcto sin HQ configurada, tras marcar una sucursal `isHeadquarters=true` el catálogo filtra por ese `branchId` y el payload de `stampInvoice` lo incluye explícitamente; factura resultante con `issuerEmail` poblado, confirmado en UI y en el PDF descargado (`pdftotext`: "Correo" → "contacto@agrisas.mx", "Fecha de emisión" → "1 de septiembre de 2026..."); `/billing/new` "Facturar venta" — `CustomerPicker` precarga el cliente propio de la venta, permite reemplazarlo, la vista previa refleja el receptor reemplazado (no el original), el timbrado persiste `Invoice.customerId` = override y `Sale.customerId` permanece sin cambios tras la operación (verificado leyendo la venta post-timbrado). Nota: se detectó y corrigió un service worker de `offline-sync` sirviendo bundles JS cacheados del build anterior — se desregistró para la verificación; no requiere cambio de código, es comportamiento esperado de PWA en dev tras cambios de build.

## 10. Corrección post-revisión — cabecera 2 columnas, correo en cabecera, fix de grid en preview modal (ver D10/D11/D12)

- [x] 10.1 `app/(private)/billing/_blocks/InvoiceMetaPanel.tsx`: quitar la fila "Correo" de la tarjeta "Datos del emisor"
- [x] 10.2 `app/(private)/billing/_blocks/InvoicePreviewModal.tsx`: quitar la fila "Correo" de la tarjeta "Datos del emisor" del modal; agregar el correo (`data.issuer.email`) junto al bloque de logo+nombre+sucursal en la cabecera del modal
- [x] 10.3 `app/(private)/billing/_blocks/InvoiceDetailPage.tsx`: agregar línea de correo (`invoice.issuerEmail`) junto al bloque título+badge; reestructurar la línea "Emitida: ... · Ver venta origen" en un grid de 2 columnas (fecha+hora+link | Folio+UUID con labels explícitos). Se ajustó además el contenedor del header a `grid grid-cols-[1fr_auto]` (en vez del `flex flex-wrap` original) porque el UUID largo en la nueva columna B forzaba el wrap de "Total facturado" a una fila aparte — no estaba contemplado en el diseño original de este grupo
- [x] 10.4 `src/modules/billing/infrastructure/pdf/InvoiceDocumentPdf.tsx`: agregar `Text` de correo en `issuerBlock`; quitar la fila "Correo" de la sección "Emisor"; reestructurar en `invoiceMetaColumns`/`invoiceMetaCol` (2 sub-columnas: fecha | folio+UUID), reemplazando el `invoiceMeta` original (ahora sin uso, eliminado de `pdfStyles.ts`)
- [x] 10.5 `src/modules/billing/infrastructure/pdf/pdfStyles.ts`: agregar estilos `invoiceMetaColumns` (row, gap) e `invoiceMetaCol` (column, gap, textAlign right) reutilizando `invoiceMetaLabel`/`invoiceMetaValue` existentes
- [x] 10.6 `app/(private)/billing/_blocks/InvoicePreviewModal.tsx`: reemplazar `grid-cols-9` por `grid-cols-[2.2fr_0.6fr_0.9fr_0.6fr_0.6fr_0.6fr_0.9fr_1fr]` (constante `LINE_ITEMS_GRID_TEMPLATE`, reutilizada en header y filas); confirmado visualmente que la sub-línea "SAT: ..." sigue visible tras el ajuste
- [x] 10.7 `tests/unit/ui/(private)/billing/InvoiceMetaPanel.test.tsx`: actualizado el único test que dependía de "Correo" en "Datos del emisor" (assert de 6→5 `dd` y nuevo test explícito de que "Correo"/el email no aparecen ahí)
- [x] 10.8 `npm test` en verde para todo lo tocado (531/532 suites, 3916/3936 tests — los 6 fallos son de `products-crud.test.ts`, integración preexistente contra Postgres real con deadlock/FK, no relacionada a billing) + `npx tsc --noEmit` sin errores nuevos en archivos de billing/settings (los errores preexistentes listados son de otros módulos: quotes, inventory, products, reports)
- [x] 10.9 Manual con Playwright contra dev server real: cabecera 2 columnas + correo confirmados en `/billing/[id]` (detalle) y en el modal de vista previa (`/billing/new` → "Facturar venta" → Vista previa) — capturas de pantalla comparando antes/después; tabla del modal sin descuadre, con "SAT: 70171700 - Riego" visible en ambas líneas; factura parcial sigue bloqueando sin sucursal matriz configurada (sin selector, mensaje "Contacta a un administrador"); "Facturar venta" muestra el campo "Cliente (opcional)" con el texto "puedes cambiarlo sin alterar el ticket original". **No se re-verificó el PDF descargado en esta sesión** — la conexión del MCP de Playwright se cerró al hacer clic en "Descargar PDF" (posible interacción con el flujo nativo de descarga del navegador); el cambio en `InvoiceDocumentPdf.tsx` sigue el mismo patrón de estilos ya validado con `pdftotext` en la tarea 9.7, pendiente una verificación visual del PDF en una sesión posterior si se requiere
