## Why

El backend de facturación (`src/modules/billing/`, capability `billing-api`, change `add-billing-facturama`) ya emite, cancela, descarga y consulta CFDI 4.0 vía Facturama, y gestiona el CSD. Endpoints listos bajo `/api/v1/admin/invoices`, `/api/v1/admin/sales/[id]/invoices` y `/api/v1/admin/billing/csd`. Permisos RBAC sembrados (`billing:read`, `billing:write`, `billing:cancel`, `billing:manage_csd`).

Falta la **interfaz de usuario**. Sin UI el negocio no puede timbrar ni administrar comprobantes desde el panel. Esta propuesta cubre exclusivamente el front end, siguiendo la arquitectura `Atomic Design + Route Groups + _logic/` del proyecto.

## What Changes

- **Nueva sección `/billing`** (NavigationRail, gated por `billing:read`): listado paginado de facturas con filtros (estado, sucursal con bypass, rango de fechas, búsqueda server-side) y branch scoping idéntico al resto de módulos.
- **`/billing/[id]`**: detalle del CFDI con snapshot de receptor, líneas, totales, descarga **PDF/XML** y cancelación (`billing:cancel`) con motivo SAT (`01`–`04`) + `uuidReplacement?`.
- **`/billing/new`** — **dos opciones** vía `SegmentedButton`:
  - **Facturar venta**: selector de venta `completed` sin CFDI vigente; envía `POST /invoices { saleId }` (timbra la venta completa). Reusa snapshot fiscal del cliente de la venta.
  - **Factura parcial** (standalone libre): selecciona productos del catálogo o agrega líneas libres, **edita el precio manualmente por línea**, elige cliente con datos fiscales; envía `POST /invoices { customer, items[] }`. **No toca inventario** (la ruta standalone es solo fiscal — la venta no existe). La UI lo indica explícitamente.
- **Entrada doble a "Facturar venta"**: CTA "Facturar" en `/sales/[id]` (si `status='completed'` + sin CFDI vigente + `billing:write`) **y** selector de venta dentro de `/billing/new`. `SaleDetailPage` muestra además una sección con los CFDI de la venta (link al detalle, estado, descarga).
- **Gestión de CSD** `/billing/csd` (gated por `billing:manage_csd`, sólo admin): cargar/reemplazar `.cer` + `.key` + contraseña por RFC (base64 client-side) y ver estado. Sin CSD válido no se puede timbrar.
- **Servicios tipados + hooks** bajo `app/(private)/billing/_logic/`: encapsulan `authFetch`, normalizan errores HTTP del backend (`SaleAlreadyInvoiced` 409, `ReceiverFiscalDataIncomplete` 400, `FacturamaStampError` 422, `InvoiceAlreadyCancelled` 409, `FacturamaCsdError` 422) a errores tipados del módulo, aceptan `fetchImpl?` para tests.
- **Reuso**: `computeTotalsClient`, `CustomerPicker`, `ProductCatalogPanel`/`ProductCatalogTable`, `formatMxCurrency` del POS; `CatalogToolbar`/`CatalogPagination`/`EmptyState`/`ConfirmDialog` compartidos.

## Capabilities

### New Capabilities
- `billing-ui`: interfaz del módulo de facturación — listado, detalle, emisión (venta completa y parcial standalone), cancelación, descarga PDF/XML, gestión de CSD, integración en detalle de venta, servicios y hooks tipados.

### Modified Capabilities
- _(ninguna spec existente cambia sus requisitos)_

## Impact

- Nueva ruta de navegación `billing` en `NavigationRail` (`receipt`, `requires: billing:read`).
- Nuevos archivos bajo `app/(private)/billing/` (`page.tsx`, `new/page.tsx`, `[id]/page.tsx`, `csd/page.tsx`, `_blocks/`, `_logic/`).
- Modificado: `app/(private)/sales/_blocks/SaleDetailPage.tsx` (CTA "Facturar" + `SaleInvoicesSection`).
- Sin cambios de backend, schema, ni migraciones. **Sin breaking changes.**
