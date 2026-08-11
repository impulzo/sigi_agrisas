## Context

El módulo `src/modules/reports/` sigue arquitectura hexagonal y ya resuelve reportes con JSON/PDF (`InventoryStockReportPdf`, `PaymentHistoryReportPdf`) y JSON/PDF/XLSX (`CashCutReportPdf` + `buildCashCutWorkbook`). El stack del repo incluye `@react-pdf/renderer` y `xlsx` en `package.json`. El patrón de controller es uniforme: `requirePermission` → validación Zod → branch scoping → use case → serialización JSON o artefacto binario. El permiso `reports:inventory_read` ya existe para los 3 roles (ver `prisma/seed.ts`), por lo que no hay cambio de seed. Ver proposal.md — Why para la motivación.

El dato (producto → departamento → `product_prices`) es global, no por sucursal: `products.departmentId` apunta a `departments`, y `product_prices.productId` apunta a `products`. No existe relación de precios con `BranchInventory`, por lo que el reporte no aplica branch scoping (no hay recurso branch que resolver).

## Goals / Non-Goals

**Goals:**
- Nuevo endpoint `GET /api/v1/admin/reports/inventory/by-department` con `json | pdf | xlsx` reutilizando el patrón del módulo.
- Agrupación departamento → producto → listas de precio, con subtotales/totales y precisión `Decimal(14,4)`.
- UI nueva bajo `app/(private)/reports/inventory-by-department/` siguiendo la arquitectura de `cash-cut` (bloques presentacionales + `_logic`).
- Reutilización de `useDepartmentsOptions` promoviéndolo a `app/_hooks/` (regla: ≥2 módulos → hook global).

**Non-Goals:**
- No tocar el stock report existente (`/reports/inventory/stock`) ni su spec.
- No incluir existencias, dosificaciones, ni sucursales en este reporte.
- No crear permisos nuevos ni migraciones.

## Decisions

### D1 — Endpoint propio, no reusar `/reports/inventory/stock`
Un endpoint separado porque el DTO, la agrupación (producto → precios) y los formatos difieren del stock report. Alternativa descartada: extender el stock endpoint con `prices` — mezclaría dos conceptos (stock por sucursal vs. catálogo de precios) y complicaría el spec `reports-api` existente.

### D2 — Catálogo puro, sin branch scoping
Los productos y precios son globales. No hay `branchId` en el DTO ni `resolveScopedBranchId` en el controller. La autorización se limita a `reports:inventory_read`. Alternativa descartada: agregar existencias por sucursal — habría requerido dimensión branch y complicaba la vista "lista de precios" solicitada.

### D3 — Repositorio que consulta `products`, no `branch_inventory`
`PrismaDepartmentPriceListRepository.findRows` usa `prisma.product.findMany` con `include: { department: true, prices: { orderBy: [{ isDefault: "desc" }, { name: "asc" }] } }`, filtrado por `departmentId` opcional, ordenado por departamento → producto. Esto devuelve productos aunque no tengan precios (requisito "producto sin precios se incluye"), lo que `branch_inventory` no garantiza. El port devuelve `RawPriceListRow[]` planas (una fila por precio) y el use case agrupa, igual que `RawStockRow`/`findStockGrouped`.

### D4 — `Decimal` como string en el DTO; nullable como `null`
Mismo contrato que `StockReportResponseDto`: `price`, `ivaRate`, `iepsRate`, `discountPct` se serializan con `.toFixed(4)` cuando son `Decimal`; los nullable (`ivaRate`, `iepsRate`, `discountPct`) se pasan como `null` si no tienen valor. Esto preserva precisión y respeta el escenario "Precios nullable" del spec.

### D5 — Excel plano (una fila por precio) y PDF agrupado
`buildDepartmentPriceListWorkbook` replica `buildCashCutWorkbook`: hoja única con `aoa_to_sheet`, una fila por precio, columnas de producto repetidas, subtotales por departamento y totales al final. El PDF (`DepartmentPriceListReportPdf`) replica `InventoryStockReportPdf` pero con sección de producto como grupo y sus filas de precio debajo. Alternativa descartada para Excel: bloques/merges — más complejo y el patrón del repo ya es plano.

### D6 — Controller con método y schema propios
`getDepartmentPriceListReport` en `ReportsController` con `departmentPriceListQuerySchema = z.object({ departmentId: z.string().uuid("Invalid departmentId").optional(), format: z.enum(["json","pdf","xlsx"]).optional().default("json") })`. Sin branch scoping: `requirePermission` → Zod → use case → respuesta JSON/PDF/XLSX. Se inyecta `GetDepartmentPriceListReportUseCase` como dependencia nueva en el constructor y se cablea en `di/container.ts` (mismo patrón que `cashCutUseCase`).

### D7 — UI con patrón cash-cut y hook global de departamentos
`InventoryByDepartmentPage` orquesta `useCurrentUser().can("reports:inventory_read")`, `useDepartmentsOptions()` y `useDepartmentPriceList`. Sin selección → prompt de selección; con selección → tabla agrupada; exports vía `authFetch` (Bearer) con `triggerDownload`. Se promueve `useDepartmentsOptions` a `app/_hooks/useDepartmentsOptions.ts` (mismo cuerpo, ruta global) y se actualizan los 3 imports del módulo `catalogs/products`.

## Risks / Trade-offs

- [Excel con muchos precios → archivo grande] → Mitigación: mismo límite implícito que cash-cut (workbook en memoria); aceptable para catálogo por departamento.
- [Promoción de hook a `app/_hooks/` toca módulo productos] → Mitigación: refactor mecánico (mismo código, solo cambia la ruta de import); cubierto por `npm run build` y tests.
- [`xlsx` es dependencia legacy] → Mitigación: ya usada por `buildCashCutWorkbook`; sin cambio de versión.
