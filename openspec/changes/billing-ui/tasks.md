## 1. Tipos, schemas y errores (`_logic/`)

- [x] 1.1 `_logic/types/api.ts` — `InvoiceDto`, `InvoiceItemDto`, `StampFromSaleRequest`, `StampStandaloneRequest`, `CancelInvoiceRequest`, `UploadCsdRequest`, `CsdStatusDto`, `InvoiceListResponse` (espejo de `src/modules/billing/application/dto/InvoiceDto.ts`).
- [x] 1.2 `_logic/types/domain.ts` — tipos de dominio frontend (`Invoice`, `InvoiceItem`, `InvoiceStatus = 'stamped'|'cancelled'`, `CancellationMotive`, `PartialLine`).
- [x] 1.3 `_logic/errors.ts` — `SaleAlreadyInvoicedError(invoiceId)`, `SaleNotInvoiceableError`, `ReceiverFiscalDataIncompleteError(missingFields)`, `FacturamaStampError(detail)`, `InvoiceAlreadyCancelledError`, `FacturamaCancelError(detail)`, `FacturamaCsdError(detail)`, `InvoiceNotFoundError`.
- [x] 1.4 `_logic/schemas/stampSale.ts` — Zod cliente: `saleId` uuid, `paymentForm?/paymentMethod?/cfdiUse?`.
- [x] 1.5 `_logic/schemas/partialInvoice.ts` — Zod: `customer{rfc,name,cfdiUse,fiscalRegime(3),taxZipCode(5)}`, `items[]≥1` con `unitPrice≥0`, `quantity>0`, `discountPct?0–100`, `ivaRate?/iepsRate?0–1`, `productCode`, `description`.
- [x] 1.6 `_logic/schemas/cancelInvoice.ts` — `motive ∈ {01,02,03,04}`, `uuidReplacement?`.
- [x] 1.7 `_logic/schemas/csdUpload.ts` — `rfc(12–13)`, `certificateBase64`, `privateKeyBase64`, `privateKeyPassword` no vacíos.

## 2. Servicios (`_logic/services/`)

- [x] 2.1 `listInvoices.ts` — `GET /api/v1/admin/invoices` con query (page/pageSize/branchId?/status?/search?); acepta `fetchImpl?`. Omite `branchId` cuando el caller no tiene bypass.
- [x] 2.2 `getInvoice.ts` — `GET /invoices/:id`; 404 → `InvoiceNotFoundError`.
- [x] 2.3 `stampInvoice.ts` — `POST /invoices`; rama sale-linked vs standalone según payload; mapea 409 `SaleAlreadyInvoiced{invoiceId}`/`SaleNotInvoiceable`, 400 `ReceiverFiscalDataIncomplete{missingFields}`, 422 `FacturamaStampError{detail}` a errores tipados; éxito → `InvoiceDto`.
- [x] 2.4 `cancelInvoice.ts` — `POST /invoices/:id/cancel`; 409 `InvoiceAlreadyCancelled`, 422 `FacturamaCancelError{detail}`.
- [x] 2.5 `downloadInvoiceFile.ts` — `GET /invoices/:id/download?format=`; lee `blob()`, deriva filename de `Content-Disposition` (fallback `factura-<uuid>.<ext>`), dispara descarga (`createObjectURL`+`<a download>`).
- [x] 2.6 `listSaleInvoices.ts` — `GET /sales/:id/invoices` → `{ items }`.
- [x] 2.7 `uploadCsd.ts` / `getCsdStatus.ts` — `POST`/`GET /billing/csd`; 422 → `FacturamaCsdError{detail}`.
- [x] 2.8 `index.ts` — barrel de servicios.

## 3. Hooks (`_logic/hooks/`)

- [x] 3.1 `useInvoicesList.ts` — paginación, filtros (estado/sucursal/fechas/búsqueda debounced 300 ms), branch scoping; expone `items,total,page,setPage,filters,setFilter,isLoading,error`.
- [x] 3.2 `useInvoiceDetail.ts` — carga `getInvoice`, `refresh`.
- [x] 3.3 `useInvoiceMutations.ts` — `cancel(motive,uuidReplacement?)`, `download(format)`; estados en-vuelo + errores tipados→mensaje ES.
- [x] 3.4 `useSaleInvoices.ts` — lista CFDI de una venta (para `SaleInvoicesSection`); deriva `hasStampedInvoice`.
- [x] 3.5 `useStampSaleForm.ts` — estado del formulario "facturar venta": venta seleccionada + paymentForm/method/cfdiUse; `submit()` → `stampInvoice({saleId})`; navega a `/billing/[id]` en éxito.
- [x] 3.6 `usePartialInvoiceForm.ts` — cliente fiscal + líneas (add catálogo / add libre / editar precio,cantidad,descuento,iva,ieps / quitar); valida cliente fiscal completo; totales en vivo vía `computeTotalsClient`; `submit()` → `stampInvoice({customer,items})`; navega a `/billing/[id]`.
- [x] 3.7 `useCsdManager.ts` — estado CSD; `upload(files+rfc+password)` (base64 via `FileReader`); `refreshStatus()`.

## 4. Listado y detalle (`_blocks/` + páginas)

- [x] 4.1 `app/(private)/billing/page.tsx` — Server Component, `metadata`, monta `BillingListPage`.
- [x] 4.2 `BillingListPage.tsx` — gate `billing:read`; `BillingToolbar` + `InvoicesTable` + `CatalogPagination` + `BillingEmpty`; botón "Nueva factura" (`billing:write`) → `/billing/new`; botón "Configurar CSD" (`billing:manage_csd`) → `/billing/csd`.
- [x] 4.3 `BillingToolbar.tsx` — búsqueda server-side (badge "2+ caracteres"), filtro estado (`stamped`/`cancelled`), filtro sucursal (sólo bypass), rango fechas.
- [x] 4.4 `InvoicesTable.tsx` — columnas: `Folio fiscal (uuid, mono)`, `Receptor (name+rfc)`, `Sucursal (sólo bypass)`, `Total (MXN, tabular-nums)`, `Fecha`, `Estado (InvoiceStatusBadge)`, acción "Ver" → `/billing/[id]`.
- [x] 4.5 `InvoiceStatusBadge.tsx` — `stamped`→verde "Vigente", `cancelled`→rojo "Cancelada".
- [x] 4.6 `BillingEmpty.tsx` — `EmptyState icon="receipt"`.
- [x] 4.7 `app/(private)/billing/[id]/page.tsx` + `InvoiceDetailPage.tsx` — gate `billing:read`; header (folio fiscal, estado, link a venta si `saleId`), `InvoiceItemsTable` (snapshots+totales), `InvoiceMetaPanel` (receptor fiscal, cfdiUse, paymentForm/method, banner cancelación si aplica), `InvoiceActionsBar` (descargar PDF/XML; "Cancelar" si `stamped`+`billing:cancel`).

## 5. Emisión — `/billing/new`

- [x] 5.1 `app/(private)/billing/new/page.tsx` + `NewInvoicePage.tsx` — gate `billing:write`; `SegmentedButton` "Facturar venta | Factura parcial".
- [x] 5.2 `StampSaleForm.tsx` + `SalePickerField.tsx` — buscador de ventas `completed` (server-side `?search=&status=completed`, debounce 300 ms); muestra folio/cliente/total; selects `paymentForm/paymentMethod/cfdiUse` (editables, defaults); submit vía `useStampSaleForm`. Excluye/avisa ventas con CFDI vigente (409 → mensaje con link al CFDI existente).
- [x] 5.3 `PartialInvoiceForm.tsx` — `CustomerPicker` (lee datos fiscales; bloquea si incompletos, lista campos faltantes); panel de productos (`ProductCatalogPanel` para agregar + botón "Agregar línea libre"); `PartialInvoiceLineRow` editable (descripción, cantidad, **precio manual**, descuento, iva, ieps, `satProductCode` para líneas libres); `PartialInvoiceFooter` con totales en vivo + nota **"La factura parcial no afecta inventario"** + CTA "Emitir factura". Submit vía `usePartialInvoiceForm`.
- [x] 5.4 Manejo de errores de timbrado en ambos formularios: `ReceiverFiscalDataIncomplete` (resalta campos), `FacturamaStampError` (banner con `detail`), `SaleAlreadyInvoiced` (link al CFDI).

## 6. Cancelación y descarga

- [x] 6.1 `CancelInvoiceModal.tsx` — `<dialog>`; select motivo SAT (`01` Comprobante con errores con relación → pide `uuidReplacement`; `02` con errores sin relación; `03` no se llevó a cabo; `04` operación nominativa en factura global); confirma vía `useInvoiceMutations.cancel`. 422 → banner `detail`.
- [x] 6.2 Descarga PDF/XML desde `InvoiceActionsBar` vía `useInvoiceMutations.download(format)`; estados de carga por botón.

## 7. CSD — `/billing/csd`

- [x] 7.1 `app/(private)/billing/csd/page.tsx` + `CsdManagerPage.tsx` — gate `billing:manage_csd`; muestra estado actual (`getCsdStatus`), formulario: RFC + `<input type=file accept=.cer>` + `<input type=file accept=.key>` + contraseña; convierte a base64 (`FileReader`) y llama `useCsdManager.upload`; mensajes éxito/`FacturamaCsdError`. Contraseña no se persiste.

## 8. Integración

- [x] 8.1 `SaleDetailPage.tsx` — montar `SaleInvoicesSection` (lista CFDI de la venta vía `useSaleInvoices`) + CTA "Facturar" cuando `sale.status==='completed'` + `!hasStampedInvoice` + `billing:write` → navega a `/billing/new` con la venta preseleccionada (o `POST` directo según UX). Mostrar CFDI vigente con link a `/billing/[id]` y descarga.
- [x] 8.2 `NavigationRail` — agregar `RailItem { key:"billing", href:"/billing", icon:"receipt", label:"Facturación", requires:"billing:read" }` tras `returns`.

## 9. Tests (jsdom / RTL — `tests/unit/ui/billing/`)

- [x] 9.1 Services: mapeo de errores HTTP→tipados (`stampInvoice` 409/400/422; `cancelInvoice` 409/422; `downloadInvoiceFile` filename+blob; `uploadCsd` 422) con `fetchImpl` mock.
- [x] 9.2 `usePartialInvoiceForm`: totales en vivo (banker's, vector compartido), bloqueo por cliente fiscal incompleto, add línea libre, edición de precio manual, payload standalone correcto (sin `saleId`).
- [x] 9.3 `useStampSaleForm`: payload `{saleId}`, manejo `SaleAlreadyInvoiced`.
- [x] 9.4 Gating por permisos: `BillingListPage`/`NewInvoicePage`/`InvoiceActionsBar`/`CsdManagerPage` ocultan/redirigen según `can()`.
- [x] 9.5 `BillingToolbar`: filtro sucursal y columna ocultos sin `branches:access_all`; búsqueda omitida <2 chars; debounce.
- [x] 9.6 `SaleInvoicesSection`: CTA "Facturar" sólo con `completed`+sin CFDI vigente+`billing:write`.

## 10. Verificación

- [x] 10.1 `npm run build` (tipos) y `npm test` (UI) en verde. Build pass; ESLint entity fix en `SalePickerField.tsx:90`.
- [ ] 10.2 Recorrido manual con `FACTURAMA_MOCK=true`: facturar venta, factura parcial (verificar inventario intacto), cancelar, descargar PDF/XML, cargar CSD.
