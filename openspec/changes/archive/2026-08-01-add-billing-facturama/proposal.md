## Why

El sistema registra ventas (`Sale`) con datos fiscales del receptor (`Customer.rfc`, `cfdiUse`, `taxRegime`, `taxZipCode`) y snapshots de impuestos por línea (`ivaRate`, `iepsRate`), pero no emite comprobantes fiscales (CFDI). El negocio necesita facturar electrónicamente ante el SAT a través del PAC **Facturama**: timbrar ventas existentes, emitir facturas independientes (sin venta), cancelar comprobantes, descargar PDF/XML y administrar los Certificados de Sello Digital (CSD).

El SDK oficial `facturama-javascript-sdk` es **browser-only** (depende de jQuery y `XMLHttpRequest` global) y no es viable dentro de un módulo backend hexagonal de Next.js. Se implementa un **adaptador REST server-side propio** que consume la API REST de Facturama (Basic Auth Base64), cumpliendo el objetivo de integración sin acoplar jQuery.

## What Changes

- **Nuevo módulo hexagonal `src/modules/billing/`** (capability `billing-api`): dominio puro (`Invoice`, `InvoiceItem`, value-objects, errores), application (ports `FacturamaGateway` + `InvoiceRepository`, use cases, DTOs, mappers), infraestructura (`PrismaInvoiceRepository`, `FacturamaRestGateway`, `FakeFacturamaGateway`, controller, DI).
- **Migración Prisma** `add_billing_tables`: tablas `invoices` e `invoice_items`.
  - `invoices`: `uuid` fiscal (folio fiscal SAT), `facturamaCfdiId`, `status` (`stamped`/`cancelled`), `cfdiType` (`I`), datos de receptor en snapshot, totales, `saleId` FK **nullable** (`ON DELETE SET NULL`), `branchId` FK (scoping), `xmlUrl`/`pdfUrl` nullable, motivo y metadatos de cancelación.
  - `invoice_items`: snapshot por línea (código/nombre producto, `satProductCode`, `satUnitCode`, cantidad, precio, descuento, `ivaRate`, `iepsRate`, `taxObject`, totales). `productId` nullable.
- **Timbrado**: `POST /api/v1/admin/invoices` acepta `saleId` (timbra a partir de una venta `completed`) **o** `items[]` libres (factura standalone). **Ningún flujo de facturación toca inventario** — la venta ya movió stock; la factura standalone es solo fiscal.
- **Una venta → 0..1 CFDI vigente**: re-timbrar una venta con CFDI `stamped` → 409.
- **Cancelación**: `POST /api/v1/admin/invoices/:id/cancel` con motivo SAT (`01`–`04`) y `uuidReplacement?` opcional.
- **Descarga**: `GET /api/v1/admin/invoices/:id/download?format=pdf|xml` (proxy a Facturama por `facturamaCfdiId`).
- **Listado/consulta**: `GET /api/v1/admin/invoices` paginado con branch scoping; `GET /api/v1/admin/invoices/:id`; `GET /api/v1/admin/sales/:id/invoices`.
- **Gestión CSD**: `POST /api/v1/admin/billing/csd` (cargar/reemplazar `.cer` + `.key` + contraseña por RFC) y `GET /api/v1/admin/billing/csd` (estado). Permiso dedicado.
- **Config por entorno**: `FACTURAMA_BASE_URL`, `FACTURAMA_USER`, `FACTURAMA_PASSWORD`, `FACTURAMA_MOCK`. Default sandbox + `FACTURAMA_MOCK=true` con **credenciales simuladas** hasta obtener las reales; en modo mock se usa `FakeFacturamaGateway` (UUIDs y archivos falsos deterministas).
- **RBAC**: permisos `billing:read`, `billing:write`, `billing:cancel`, `billing:manage_csd`.

## Capabilities

### New Capabilities
- `billing-api`: emisión, cancelación, descarga y consulta de CFDI 4.0 vía Facturama; gestión de CSD; módulo hexagonal completo (dominio, use cases, repositorio Prisma, gateway REST, controller, DI).

### Modified Capabilities
- _(ninguna spec existente cambia sus requisitos)_

## Impact

- Nueva migración: `add_billing_tables` (tablas `invoices`, `invoice_items`).
- Nuevo módulo hexagonal: `src/modules/billing/`.
- Nuevas rutas: `app/api/v1/admin/invoices/` (list/create), `.../invoices/[id]/route.ts` (detail), `.../invoices/[id]/cancel/route.ts`, `.../invoices/[id]/download/route.ts`, `app/api/v1/admin/sales/[id]/invoices/route.ts`, `app/api/v1/admin/billing/csd/route.ts`.
- Modificado: `prisma/schema.prisma` (modelos `Invoice`, `InvoiceItem`; relación opcional en `Sale`).
- Modificado: `prisma/seeds/rbac.ts` (4 permisos nuevos + asignaciones).
- Modificado: `.env.example` (variables Facturama).
- **Sin breaking changes**. Sin cambios de UI (alcance backend).
