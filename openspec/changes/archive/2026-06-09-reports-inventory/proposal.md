## Why

El cliente necesita (1) un reporte ejecutivo del stock de productos clasificado por sucursal y departamento, imprimible y exportable a PDF, para auditorías físicas y revisiones de inventario en sitio; y (2) un "Historial de Abonos por Usuario y Ticket" con totales agregados, también exportable a PDF. Al momento del diseño inicial, la entidad de pagos no existía; fue implementada en `api-abonos` (archivado 2026-06-07), por lo que ahora ambos reportes entran en scope. El endpoint operativo `GET /api/v1/admin/payments/history` cubre la lista paginada; el módulo `reports` añade la vista ejecutiva no paginada con bloque `summary`.

## What Changes

- Nuevo módulo hexagonal `src/modules/reports/` con la misma estructura (`domain` / `application` / `infrastructure`) que el resto de módulos del backend.
- Nuevo endpoint `GET /api/v1/admin/reports/inventory/stock` — stock agregado por sucursal → departamento → productos, en JSON o PDF.
- Nuevo endpoint `GET /api/v1/admin/reports/payments/history` — historial de abonos con bloque `summary` (totales bruto/neto/cancelado) en JSON o PDF.
- Generación de PDF server-side con `@react-pdf/renderer` para ambos reportes.
- Filtros: `branchId`, `departmentId`, `includeZeroStock` (stock) / `branchId`, `customerId`, `startDate`, `endDate` (abonos).
- Branch scoping reutilizando `enforceBranchScope`/`resolveScopedBranchId`.
- Nuevo permiso RBAC `reports:inventory_read` asignado a los tres roles base; `payments:report_read` ya existe (sembrado por `api-abonos`), se reutiliza sin cambios.
- Nueva dependencia `@react-pdf/renderer` (~5MB, sin Chromium) en `dependencies`.
- Sin migración Prisma: todos los modelos ya existen.
- UI y tests E2E **fuera del scope**: este change entrega solo el backend; un change posterior `ui-ux-reports` montará las páginas de reportes.

## Capabilities

### New Capabilities

- `reports-api`: Endpoints HTTP del módulo de reportes admin. Define la forma de los DTOs, los formatos de respuesta (`json` | `pdf`), las reglas de filtrado, el branch scoping, el contrato del PDF generado, y los permisos RBAC requeridos. Comienza con el reporte de stock; se extenderá en changes futuros (`reports-payments`, `reports-sales`, etc.).

### Modified Capabilities

- `rbac`: agrega el permiso `reports:inventory_read` al catálogo y a los tres roles base. Sin cambios en el modelo de datos ni en el guard `requirePermission`.

## Impact

- **Código nuevo**: `src/modules/reports/**`, `app/api/v1/admin/reports/inventory/stock/route.ts`, `tests/unit/modules/reports/**`.
- **Código modificado**: `prisma/seed.ts` (nuevo permiso + asignación a roles), `package.json` (`@react-pdf/renderer`), `openspec/specs/rbac/spec.md` (delta con permiso nuevo).
- **APIs**: nuevo `GET /api/v1/admin/reports/inventory/stock?branchId&departmentId&includeZeroStock&format` y nuevo `GET /api/v1/admin/reports/payments/history?branchId&customerId&startDate&endDate&format`.
- **DB**: sin migración. Re-ejecutar `npm run seed` agrega el permiso de forma idempotente.
- **Dependencias**: añade `@react-pdf/renderer` (runtime). Sin impacto en bundle del cliente — el import vive en `src/modules/reports/infrastructure/pdf/` consumido solo por la route handler server.
- **Documentación**: tras archivar, `CLAUDE.md` recibirá una sección "Reportes (Backend)" análoga a "Devoluciones (Backend)" y la tabla de permisos del módulo se actualizará.
- **Sin breaking changes**: endpoint nuevo; ningún contrato existente se modifica.
