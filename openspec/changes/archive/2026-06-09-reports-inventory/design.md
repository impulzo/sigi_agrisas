## Context

El panel agrícola opera con un catálogo de ~500 productos clasificados en ~35 departamentos y distribuidos en N sucursales (mínimo 1: la MATRIZ del seed). Hoy el endpoint `GET /api/v1/admin/branches/:branchId/inventory` (en `src/modules/inventory/`) lista inventario plano por sucursal con paginación. No hay forma de pedir un agregado por sucursal × departamento ni exportarlo como documento imprimible.

El cliente pidió un reporte de stock con esa segmentación y la opción de imprimir/exportar a PDF. Pidió también un "Historial de Abonos por Usuario y Ticket". Al inicio del diseño de este change, la entidad de pagos no existía; fue implementada en el change `api-abonos` (archivado 2026-06-07) que añadió las tablas `customer_payments` y los campos `paid_amount`/`payment_status` en `sales`, más el permiso `payments:report_read` ya asignado a los tres roles base. El endpoint operativo `GET /api/v1/admin/payments/history` (módulo `payments`) maneja la lista paginada de abonos. El módulo `reports` complementa ese endpoint con un reporte ejecutivo agregado (`GET /api/v1/admin/reports/payments/history`) orientado a impresión y auditoría, que incluye un bloque `summary` con totales brutos/netos/cancelados y no pagina.

Restricciones relevantes:
- Arquitectura hexagonal estricta (`src/modules/<módulo>/{domain, application, infrastructure}/`). Cada módulo define sus ports, sus use cases puros y sus adapters Prisma+HTTP. Calcamos el patrón.
- Branch scoping vía `enforceBranchScope`/`resolveScopedBranchId` (helpers en `src/modules/rbac/infrastructure/http/`). El permiso `branches:access_all` (solo `admin`) es el único bypass.
- Permisos RBAC en `prisma/seed.ts` (idempotente) + spec canónica en `openspec/specs/rbac/spec.md`.
- App Router Next 14: route handlers en `app/api/v1/...` corren por default en runtime Node — es lo que requiere `@react-pdf/renderer`.
- Sin migración Prisma: los modelos ya soportan toda la query.

## Goals / Non-Goals

**Goals:**
- Endpoint `GET /api/v1/admin/reports/inventory/stock` que devuelva el reporte de stock en JSON o PDF según `?format=`.
- Agrupamiento sucursal → departamento → productos, con subtotales por nivel y totales globales.
- Filtros opcionales: `branchId`, `departmentId`, `includeZeroStock` (default `true`).
- Endpoint `GET /api/v1/admin/reports/payments/history` que devuelva el historial de abonos con bloque `summary` de totales, en JSON o PDF.
- Filtros opcionales para el reporte de abonos: `branchId`, `customerId`, `startDate`, `endDate`.
- Branch scoping idéntico al resto del sistema para ambos endpoints: sin `branches:access_all`, el usuario solo puede consultar su `x-user-branch-id`.
- Permiso nuevo `reports:inventory_read` asignado a `admin`, `operator` y `viewer`; el permiso `payments:report_read` (ya sembrado por `api-abonos`) se reutiliza sin cambios.
- Generación de PDF server-side con `@react-pdf/renderer` para ambos reportes.
- Tests unitarios para los use cases y el controller; sin tests visuales del PDF.

**Non-Goals:**
- UI de los reportes (páginas `/reports/inventory`, `/reports/payments`) — se entregan en un change posterior `ui-ux-reports`.
- Cachear los PDFs generados — cada request los recrea on-demand.
- Programación de reportes (cron/scheduling) o envío por email.
- Versión `.xlsx` o `.csv` — solo JSON y PDF; futuro change podría añadir formatos extras.
- Migración Prisma. Los reportes se construyen sobre los modelos existentes.
- Logs/auditoría persistente de generación de reportes.

## Decisions

### D1 — Librería de PDF: `@react-pdf/renderer`

- **Elegida**: `@react-pdf/renderer` (~5MB sin dependencias nativas, render server-side con componentes React).
- **Alternativas**:
  - **Puppeteer** (Chromium headless): pixel-perfect HTML/CSS, pero pesa ~200MB y consume mucha RAM en serverless. Excesivo para un reporte tabular.
  - **pdfkit**: API imperativa de bajo nivel; código verbose para layouts complejos.
  - **jsPDF en frontend**: requiere cargar y renderizar todo el JSON en cliente, perdiendo control sobre el layout final y bloqueando integraciones futuras (envío por email, descargas server-side).
- **Razón**: el reporte es tabular y se beneficia del modelo declarativo de React. `renderToBuffer()` es async y produce un `Buffer` listo para devolver desde el route handler. El bundle del cliente no se afecta porque el import vive en `src/modules/reports/infrastructure/pdf/`, consumido solo por la route server.

### D2 — Agrupamiento en memoria, no SQL

- **Elegida**: una sola query `prisma.branchInventory.findMany({ include: { product: { include: { department: true } }, branch: true } })` filtrada por `branchId`/`departmentId` opcionales, ordenada por `branch.name, department.name, product.name`. El use case agrupa en memoria.
- **Alternativa**: `GROUP BY` con `$queryRaw` o múltiples queries por nivel. Descartada por complejidad: el dataset esperado son ≤ ~500 productos × N sucursales (~2000 filas en caso típico), donde el costo de agrupar en JS es despreciable comparado con el round-trip a la BD.
- **Razón**: simplicidad. Si el catálogo crece a decenas de miles de filas × decenas de sucursales, migrar a `GROUP BY` SQL es una optimización interna sin tocar el contrato HTTP.

### D3 — Reusar `enforceBranchScope`/`resolveScopedBranchId`

- **Elegida**: aplicar el patrón ya establecido en el resto del backend.
  - Si llega `?branchId=`, validar UUID, luego `enforceBranchScope(req, requestedBranchId)`. Sin bypass + mismatch → 403.
  - Si NO llega `?branchId=`:
    - Con `branches:access_all`: devolver todas las sucursales (no filtrar).
    - Sin bypass: forzar el filtro al `x-user-branch-id` del usuario.
- **Alternativa**: rechazar el caso "sin branchId" para non-admin (forzar a pasarlo explícito). Descartado: agrega fricción innecesaria; el server ya sabe a qué sucursal pertenece el usuario.
- **Razón**: coherencia con el resto del sistema (POS, Sales, Returns siguen este patrón).

### D4 — Nuevo permiso `reports:inventory_read` para los tres roles

- **Elegida**: agregar `reports:inventory_read` y asignarlo a `admin`, `operator` y `viewer`.
- **Alternativa A**: reusar `inventory:read`. Descartada porque acopla "ver listas operativas de inventario" con "generar reportes ejecutivos"; futuro `reports:payments_read` necesitaría granularidad propia, y nombrar de forma consistente desde ahora ayuda.
- **Alternativa B**: solo `admin` y `operator` lo reciben (`viewer` queda fuera). Descartada porque `viewer` ya tiene `inventory:read` — leer el reporte es estrictamente menos permisivo que leer el inventario crudo de cada sucursal.
- **Razón**: prepara el suelo para futuros permisos `reports:*` sin renombrar después; respeta la política de los tres roles base.

### D5 — Endpoint único con `?format=` vs. endpoints separados

- **Elegida**: un solo path `GET /api/v1/admin/reports/inventory/stock` que ramifica por `?format=json` (default) o `?format=pdf`.
- **Alternativa**: `/reports/inventory/stock` (JSON) y `/reports/inventory/stock.pdf` (PDF). Descartada para simplificar tests, RBAC (un solo guard), y para que un mismo controller maneje el `Accept`-like ramado vía query param explícito.
- **Razón**: la lógica de obtención de datos es idéntica; sólo cambia la serialización final. Concentra branch scoping y permisos en un solo handler.

### D6 — Módulo `reports` separado vs. extender `inventory`

- **Elegida**: nuevo módulo hexagonal `src/modules/reports/`.
- **Alternativa**: agregar el use case y endpoint dentro de `src/modules/inventory/`. Descartada porque (a) el módulo `reports` crecerá con futuros reportes que toquen otras entidades (`sales`, `payments`), no solo inventory, y (b) mantener `inventory` enfocado en CRUD/ajustes evita un módulo grande que mezcla responsabilidades.
- **Razón**: separa la responsabilidad "lectura agregada para reporting" de "operaciones CRUD por sucursal". El módulo `reports` declara su propio port `InventoryReportRepository` aunque consulte las mismas tablas físicas — el dominio queda limpio.

### D7 — Forma del DTO: arrays anidados con subtotales precomputados

- **Elegida**: el JSON devuelve `branches[]` con `departments[]` con `products[]`, e incluye subtotales por departamento y por sucursal, más `totals` globales. Cada producto trae `availableQuantity` (`quantity - reservedQuantity`) e `isBelowReorder` (`quantity < reorderPoint`) precomputados.
- **Alternativa**: devolver una lista plana y que el cliente agrupe. Descartada porque la UI y el renderer de PDF necesitan exactamente el agrupamiento que ya hace el use case; duplicar esa lógica en cliente sería frágil.
- **Razón**: el server hace el trabajo una sola vez; tanto el consumidor JSON (UI futura) como el renderer de PDF reciben la misma forma.

### D8 — Runtime Node para la route, no Edge

- **Elegida**: dejar el route handler en su runtime default (Node). NO declarar `export const runtime = "edge"`.
- **Razón**: `renderToBuffer()` de `@react-pdf/renderer` requiere acceso a APIs Node (Buffer interno). Prisma tampoco soporta Edge en este proyecto. La latencia adicional de Node sobre Edge es irrelevante para un reporte que se genera puntualmente.

### D9 — Reporte de abonos en `reports` vs. extender `payments/history`

- **Elegida**: nuevo endpoint `GET /api/v1/admin/reports/payments/history` en el módulo `reports`, con un use case propio `GetPaymentHistoryReportUseCase` y port `PaymentReportRepository`.
- **Alternativa**: extender `GET /api/v1/admin/payments/history` (ya existente en el módulo `payments`) con un bloque `summary` opcional. Descartada porque (a) ese endpoint es operativo y paginado, mezclarlo con un concepto de reporte ejecutivo no paginado ensucia el contrato; (b) el módulo `reports` debe ser el namespace centralizado para todos los reportes ejecutivos, independientemente de la entidad que consulten.
- **Razón**: separa claramente "lista operativa de abonos" (`payments/history`) de "reporte ejecutivo de abonos" (`reports/payments/history`). El módulo `reports` consulta directamente las tablas `customer_payments` + `sales` + `customers` + `branches` vía su propio port Prisma — sin acoplar a `PrismaPaymentRepository` del módulo `payments`.
- **Nota**: el permiso `payments:report_read` ya existe en la BD (seeded por `api-abonos`). No se requiere nuevo permiso ni nueva migración.

## Risks / Trade-offs

- **[Tamaño del PDF crece con muchos productos]** → para los volúmenes actuales (~500 productos × N sucursales) el PDF queda en pocas páginas. Si crece, `@react-pdf/renderer` soporta paginación natural (`<Page>` automática); no requiere acción.
- **[Memoria del proceso al renderizar PDFs concurrentes]** → `renderToBuffer` carga toda la estructura en memoria. Para uso "operador imprime ocasionalmente" no es preocupación. Si el reporte se vuelve concurrente y voluminoso, una cola o cache server-side se considerará en otro change.
- **[Filtros inconsistentes con branch scoping]** → mitigado: el controller resuelve el `branchId` final antes de pasar al use case, garantizando que un non-admin nunca vea otra sucursal aunque mande explícitamente otro UUID.
- **[`@react-pdf/renderer` y SSR de Next 14]** → ya hay precedente en la comunidad de usarlo en route handlers de App Router. No usar `next/dynamic` ni Suspense: el import es directo del módulo `reports/infrastructure/pdf/`.
- **[Productos con `quantity` negativa por ventas del POS]** → se reportan tal cual (el campo lo permite por diseño del POS). El reporte no oculta valores negativos; los muestra para que el operador detecte sucursales que requieren reconciliación. `isBelowReorder` no cambia su semántica (`quantity < reorderPoint` cubre negativos también).
- **[Idempotencia del nuevo permiso]** → el seed usa upsert y se prueba en cada release. La spec delta de `rbac` lista explícitamente el escenario "seed merges con permisos previos".

## Migration Plan

No hay migración de schema. Pasos de despliegue:
1. `git pull` (trae código, spec delta, y `package.json` actualizado).
2. `npm install` (instala `@react-pdf/renderer`).
3. `npx prisma generate` (no estrictamente necesario; schema sin cambios).
4. `npm run seed` (agrega `reports:inventory_read` a `permissions` y a las tres tablas `role_permissions`).
5. Deploy del backend (Next build).
6. Smoke: `curl` al endpoint con un token válido en JSON y PDF (ver tasks).

Rollback: revertir el commit y re-ejecutar `npm run seed` no elimina el permiso (es idempotente pero solo crea/actualiza). Si se requiere remover el permiso, hacerlo manualmente en BD o vía un script ad-hoc — pero no es necesario, los handlers viejos no lo usan.

## Open Questions

- ¿Querremos en un futuro próximo permitir `?format=csv` además de `json`/`pdf`? Sería trivial añadir y consume el mismo DTO. Por ahora no hay pedido explícito.
- ¿La UI futura querrá el header `generatedBy` visible o solo en el footer del PDF? Decisión que tomará el change `ui-ux-reports`.
- ¿Mostramos el `isHeadquarters` en el PDF como badge o solo en JSON? Por ahora va en ambos; ajustable visualmente en `ui-ux-reports`.
