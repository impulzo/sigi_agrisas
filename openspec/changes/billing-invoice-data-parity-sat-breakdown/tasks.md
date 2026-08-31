## 1. Código Postal en Ticket de venta (`businessZipCode`)

- [x] 1.1 Migración Prisma: agregar columna `business_zip_code VARCHAR(5) NULL` a `ticket_settings`. Aplicada como `20260828215024_add_ticket_settings_zip_code` vía `prisma migrate deploy` (shell no interactivo — `migrate dev` requiere TTY; SQL escrito a mano siguiendo la convención de carpetas del proyecto) + `prisma generate`.
- [x] 1.2 `src/modules/settings/domain/entities/TicketSettings.ts`: agregado `businessZipCode` a la interfaz y a `DEFAULT_TICKET_SETTINGS`.
- [x] 1.3 `src/modules/settings/application/ports/TicketSettingsRepository.ts`: agregado `businessZipCode` a `UpdateTicketSettingsData`.
- [x] 1.4 `src/modules/settings/application/use-cases/UpdateTicketSettingsUseCase.ts`: agregado `businessZipCode` al array `keys` del guard de "empty update".
- [x] 1.5 `src/modules/settings/infrastructure/repositories/PrismaTicketSettingsRepository.ts`: agregado `businessZipCode` a `Row`, `toEntity`, `create`/`update` y `updateLogoUrl`.
- [x] 1.6 `src/modules/settings/infrastructure/repositories/InMemoryTicketSettingsRepository.ts`: agregado `businessZipCode` al spread condicional del `update`.
- [x] 1.7 `src/modules/settings/infrastructure/http/SettingsController.ts`: agregado `businessZipCode: z.string().regex(/^\d{5}$/).nullable().optional()` a `updateTicketSchema`.
- [x] 1.8 `app/(private)/settings/_logic/types/api.ts`: agregado `businessZipCode` a `TicketSettingsDto` y `UpdateTicketSettingsBody`.
- [x] 1.9 `app/(private)/settings/_blocks/TicketSettingsForm.tsx`: state, sync, payload, input "Código postal" (junto a Dirección) con validación cliente de 5 dígitos que deshabilita "Guardar cambios" si es inválido.

## 2. Cascada del emisor: `zipCode` gana su 3er nivel

- [x] 2.1 `resolveIssuerFiscalData.ts`: `zipCode: settings?.zipCode ?? ticket?.businessZipCode ?? null`.
- [x] 2.2 Tests unitarios agregados en `resolveIssuerFiscalData.test.ts`: fallback a `businessZipCode`, `null` cuando ningún nivel lo tiene, `EmitterFiscalSettings.zipCode` sigue ganando sobre `TicketSettings`.
- [x] 2.3 Incluido en 2.2 (caso "ningún nivel lo tiene").
- [x] 2.4 `StampInvoiceUseCase.test.ts`: test existente extendido con `businessZipCode="71510"` → `invoice.issuerZipCode="71510"`; test nuevo confirma `null` sin regresión cuando falta en ambos niveles.

## 3. Resolución server-side de `satProductCodeLabel`

- [x] 3.1 `src/modules/billing/infrastructure/di/container.ts`: importar `PrismaSatCodeRepository` y `SearchSatCodesUseCase`, instanciar `const searchSatCodesUseCase = new SearchSatCodesUseCase(new PrismaSatCodeRepository(prisma))` (mismo patrón que `searchSatTaxRegimesUseCase`).
- [x] 3.2 `FakeFacturamaGateway`: agregar 4º parámetro de constructor `searchSatCodesUseCase?: SatCodeSearchUseCase`; en `download()`, resolver `satProductCodeLabel` por línea (batch sobre códigos únicos vía `Promise.all` + `resolveSatDescription`) tanto para el path con `snapshot` como para el path sin snapshot (`toInvoiceDocumentPdfData`/`toInvoiceDocumentPdfDataFromSnapshot`); mapear al campo nuevo en `InvoiceDocumentPdfLine`.
- [x] 3.3 `di/container.ts`: pasar `searchSatCodesUseCase` al construir `FakeFacturamaGateway`.
- [x] 3.4 `BillingController`: agregar `searchSatCodesUseCase: SearchSatCodesUseCase` al constructor; en `previewPdf`, resolver `satProductCodeLabel` por línea antes de armar `data` (mismo `Promise.all` batch); en `getById`, resolver `satProductCodeLabel` por línea e incluirlo en cada item de la respuesta JSON; agregar `issuerBranchName` a la respuesta de `getById` vía `this.lookupService.findBranch(invoice.branchId)`.
- [x] 3.5 `di/container.ts`: pasar `searchSatCodesUseCase` al construir `BillingController` (agregar al final de la lista de argumentos existente).
- [x] 3.6 Tests: extender `FakeFacturamaGateway.test.ts` (label de línea + `branchName` en el PDF), `BillingControllerCsd.test.ts` o equivalente para `getById`/`previewPdf` con los nuevos campos.

## 4. `InvoiceDocumentPdf.tsx` — tabla de conceptos a paridad con la web

- [x] 4.1 Extender `InvoiceDocumentPdfLine` con `satProductCodeLabel?: string | null`; extender `InvoiceDocumentPdfData.issuer` con `branchName?: string | null` (si no existe ya — verificar, la prefactura ya lo usa).
- [x] 4.2 Tabla de conceptos: agregar columna de clave SAT (`satProductCodeLabel ?? satProductCode ?? "—"`), columna IEPS% por línea (reemplaza/complementa el IEPS agregado condicional actual), columna Subtotal por línea — mismo layout que `InvoiceItemsTable.tsx` (web).
- [x] 4.3 Revisar ancho de página/tipografía para que la tabla ampliada no desborde con descripciones largas (ver `design.md` § Riesgos) — ajustar truncado si hace falta.

## 5. `branchName` en la factura final

- [x] 5.1 `src/modules/billing/application/ports/FacturamaGateway.ts`: agregar `branchName?: string | null` a `FacturamaInvoiceSnapshot.issuer`.
- [x] 5.2 `DownloadInvoiceFileUseCase`: agregar `BillingLookupService` como 3ª dependencia del constructor; en `toSnapshot()` (o en `execute()` antes de llamarlo), resolver `lookupService.findBranch(invoice.branchId)` y setear `issuer.branchName`.
- [x] 5.3 `di/container.ts`: pasar `lookupService` al construir `DownloadInvoiceFileUseCase`.
- [x] 5.4 `FakeFacturamaGateway.toInvoiceDocumentPdfDataFromSnapshot`: mapear `snapshot.issuer.branchName` → `data.issuer.branchName`.
- [x] 5.5 `InvoiceDto.ts` + mapper `toInvoiceDto`: agregar `issuerBranchName` (ya resuelto en `BillingController.getById`, tarea 3.4 — sólo falta el tipo del DTO).
- [x] 5.6 `InvoiceDetailPage.tsx`/`InvoiceMetaPanel.tsx`: renderizar `issuerBranchName` como subtítulo junto al emisor (mismo lugar visual que ya usa el modal/PDF de prefactura).
- [x] 5.7 Test: `DownloadInvoiceFileUseCase.test.ts` — `branchName` se resuelve y se pasa en el snapshot; branch no encontrada → `branchName: null`, sin error.

## 6. `InvoicePreviewModal.tsx` — paridad con el PDF de prefactura

- [x] 6.1 `app/(private)/billing/_logic/services/resolveSatDescription.ts`: agregar `resolveSatProductCodeDescription(code, fetchImpl)`, apuntando a `GET /api/v1/admin/sat-codes?search=<code>` (ruta base, ajustar `search()` interno para construir la URL sin subpath cuando `path=""`).
- [x] 6.2 `InvoicePreviewModal.tsx`: agregar sección "Forma de pago" / "Método de pago" con label, usando `describePaymentForm`/`describePaymentMethod` de `src/shared/domain/catalogs/satPaymentCatalogs.ts`.
- [x] 6.3 `InvoicePreviewModal.tsx`: agregar columna de clave SAT por línea (resuelta client-side, batch sobre códigos únicos), columna IEPS%, columna Subtotal — mismo layout que la tabla ya actualizada en la tarea 4.
- [x] 6.4 Tests de UI (`tests/unit/ui/(private)/billing/InvoicePreviewModal.test.tsx` si existe, o crear): sección de pago renderiza con label; línea con `satProductCode`/`iepsRate` muestra las 3 columnas nuevas; fallback a código crudo si el catálogo no resuelve.

## 7. Verificación en vivo (obligatoria — no basta con `npm test`)

- [x] 7.1 `npm test` completo — 0 regresiones fuera de lo ya conocido como pre-existente (documentar cualquier fallo pre-existente igual que en el change anterior, aislando con `git stash`). Verificación posterior (/opsx:verify) encontró 1 regresión real introducida por la tarea 5.6 (`InvoiceMetaPanel.tsx` — el `<dl>` de 5 `dd` quedó fuera del wrapper del subtítulo `issuerBranchName`, rompiendo `InvoiceMetaPanel.test.tsx`); corregida moviendo el subtítulo dentro del `<h2>`. Los 2 fallos restantes en la corrida completa (`inventory-crud.test.ts`, `RolePermissionsList.test.tsx`) son flakiness de estado compartido en la BD real de integración, no regresión de este change — pasan en aislamiento con y sin este diff (`git stash`).
- [x] 7.2 Servidor dev + datos reales de este entorno: guardar un Código Postal en `Configuración > Ticket de venta`, confirmar que persiste y se recupera.
- [x] 7.3 Con `EmitterFiscalSettings` vacío (estado real de este entorno) y el CP recién guardado en Ticket de venta, timbrar una factura de prueba y confirmar `issuerZipCode` en la respuesta. Verificado: venta real vía POS (cliente "Pruebas DDDD", producto EVIS con `satProductCode`+IEPS) facturada desde `/billing/new` → invoice `89195deb-a02b-4601-953b-76695815a3ff` (UUID `F275F520-...`), `issuer_zip_code="83000"` persistido en BD, con `emitter_fiscal_settings` confirmada vacía (0 filas) en el momento del timbrado.
- [x] 7.4 Abrir el detalle web de esa factura y descargar su PDF — comparar campo por campo (emisor incluyendo `issuerBranchName`, receptor, forma/método de pago, cada línea con clave SAT+descripción/IEPS/subtotal) y confirmar que coinciden exactamente. Re-verificado sobre la factura real del punto 7.3: web y PDF coinciden campo por campo, incluyendo `issuerBranchName="Matriz"` como subtítulo y la línea con SAT+IEPS+Subtotal.
- [x] 7.5 Abrir una prefactura (modal) para una cotización o venta con líneas que tengan `satProductCode` e IEPS>0, descargar su PDF de borrador, y comparar modal vs. PDF borrador campo por campo. Verificado con factura parcial de prueba (cliente "Pruebas DDDD", línea libre con `satProductCode="10171500"`, IEPS 6%): modal y PDF borrador coinciden exactamente — sección "Datos de pago CFDI", columna SAT ("10171500 - Abonos orgánicos y nutrientes para plantas"), IEPS%, Subtotal por línea, y totales.
- [x] 7.6 Confirmar con Playwright (nunca Claude-in-Chrome, por regla del proyecto) que la tabla de conceptos ampliada del PDF no desborda visualmente con una descripción de producto larga.
- [x] 7.7 `/opsx:verify` posterior a un merge con `develop` (`6f42793`/`f0d0578`) encontró 3 archivos con fixes reales que habían quedado sin commitear: (a) `InvoiceMetaPanel.tsx` — el merge reintrodujo el bug de la tarea 5.6/7.1 (subtítulo `issuerBranchName` fuera del `<h2>`); (b) `src/modules/billing/application/dto/InvoiceDto.ts` — faltaba declarar `satProductCodeLabel`/`issuerBranchName` (tarea 5.5, gap de tipos únicamente — el runtime ya los devolvía vía spread en `BillingController.getById`); (c) `PartialInvoiceForm.tsx` + `pos/_logic/services/searchProducts.ts` + `pos/_logic/types/api.ts` — el picker de producto en `/billing/new` seteaba `satProductCode: ""` siempre, sin propagar el código del catálogo, por lo que la columna SAT de la Historia 1 nunca tenía datos por esa vía de captura. Los 3 fixes ya estaban implementados correctamente en el working tree; se commitearon en un commit separado tras la verificación.
