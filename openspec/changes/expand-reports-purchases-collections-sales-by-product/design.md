## Context

Ver `proposal.md` - Why para la motivación de negocio. `src/modules/reports/` ya es un módulo hexagonal maduro (domain/application/infrastructure) con 4 reportes en producción — el patrón establecido es: `PrismaXxxRepository` (query directa a Prisma, sin reusar repos de otros módulos) → `XxxAssembler` (dominio puro, sin I/O, redondeo banker's con `decimal.js`) → `GetXxxReportUseCase` → DTO → `ReportsController` (Zod, `requirePermission`, `resolveScopedBranchId`, `?format=json|pdf|xlsx`) → PDF (`@react-pdf/renderer`) + Excel (`xlsx`/SheetJS). Este diseño reutiliza ese patrón exacto para las 3 capacidades nuevas y extiende 2 existentes (`sales-cut-api`, `account-statements-api`).

## Goals / Non-Goals

**Goals:**
- Reutilizar infraestructura existente (`PrismaPurchaseRepository`, `PrismaCashCutRepository`) en vez de duplicar queries — cubre los Criterios de Aceptación de las historias 1 y 3.
- Mantener cada nuevo reporte como capability independiente (specs, permiso RBAC y endpoint propios) para no acoplar su evolución a `cash-cut`/`sales-cut` existentes — cubre la decisión ya validada con el usuario de mantener Cobranza y Ventas-por-Producto separados.
- Todo export PDF/Excel nuevo respeta el límite de filas (`ReportTooLarge`, 10 000) ya usado por `payments/history` y `account-statements` — cubre el Criterio de Seguridad de la historia 1 sobre datasets grandes.

**Non-Goals:**
- No se modifica el comportamiento de `/reports/cash-cut` ni de `/payments/history` (ya tiene Excel).
- No se crea un concepto nuevo de "cierre de turno de caja por cajero" — eso ya existe parcialmente en `sales-cut.byCashier` y queda fuera de alcance.
- No se toca el port transaccional `ProviderPaymentRepository` de `purchases` (create/cancel/listByPurchase) — el nuevo listado global vive en un repositorio de solo lectura dentro de `reports`.

## Decisions

**D1 — Reporte de Compras reutiliza `PrismaPurchaseRepository`, no lo duplica (Historia 1).**
`ListPurchasesUseCase` ya filtra por `branchId, providerId, statuses[], from, to` sobre el mismo `PurchaseRepository` port. En vez de escribir un query paralelo en `reports`, el DI de `reports` importa `PrismaPurchaseRepository` localmente (mismo patrón que `pos/di` importa `PrismaQuoteRepository` local para evitar ciclo de imports) y `GetPurchasesReportUseCase` lo consume directo. Alternativa descartada: repo de solo-lectura nuevo con `$queryRaw` duplicando el join `purchase→provider→branch` — se descartó por violar la regla del proyecto de no duplicar código que ya resuelve el problema.

**D2 — Pagos a proveedores SÍ necesita repositorio nuevo (Historia 1).**
`ProviderPaymentRepository` (port de `purchases`) solo expone `listByPurchase(purchaseId)` — no hay método de listado global filtrable, y agregarlo ahí acoplaría el port transaccional (usado por `RegisterProviderPaymentUseCase`/`CancelProviderPaymentUseCase`) a una necesidad de solo lectura. Se crea `PrismaProviderPaymentReportRepository` dentro de `reports/infrastructure/repositories/`, consistente con cómo `PrismaPaymentReportRepository` (historial de pagos) ya vive independiente del port transaccional de `payments`.

**D3 — Cobranza por Cliente reutiliza `PrismaCashCutRepository` extendido, no lo duplica (Historia 3).**
La fuente de datos (`customer_payments status='completed'`) es idéntica a `cash-cut`. Se agregan dos campos aditivos (`saleId`, `customerId`) a `CashCutRawRow` — cambio no disruptivo, `CashCutAssembler` existente los ignora sin cambios. `GetCollectionsReportUseCase` + `CollectionsAssembler` (nuevo) consumen la MISMA instancia de `PrismaCashCutRepository` ya wireada en el DI de `reports`, solo que agregan por `customerId`/`saleId` en vez de por `paymentMethodId`. Alternativa descartada: nuevo repositorio paralelo — se descartó por duplicar el join `customer_payments→sale→customer→payment_method` ya resuelto.

**D4 — Ventas por Producto NO reutiliza `SalesCutRepository` (Historia 2).**
Aunque `PrismaSalesCutRepository` ya calcula `byProduct`/`byDepartment`, su contrato (`SalesCutAggregates`) está acoplado a los 6 desgloses + neto de caja de `sales-cut`, cuyo consumidor (`SalesCutAssembler`) ya es complejo. Agregar `byCustomer` + cruce de inventario ahí infla un contrato que otro reporte (con su propia vida útil, ya decidido como separado) no necesita completo. Se crea `PrismaSalesByProductRepository` nuevo, reusando el mismo *patrón* SQL (`$queryRaw` sobre `sale_items JOIN sales JOIN products`) pero como contrato independiente, con el join adicional a `branch_inventory` para `currentStock`.

**D5 — Detalle de tickets en `sales-cut` es un campo aditivo, no un reporte aparte (Historia 4, ya decidido con el usuario).**
`salesList` se agrega a `SalesCutAggregates`/`SalesCutReportResponseDto` como un array más, calculado con un `sale.findMany` adicional dentro del mismo `Promise.all` de `PrismaSalesCutRepository.getAggregates` — no requiere endpoint, permiso ni ruta nueva.

**D6 — Permisos nuevos siguen el patrón exacto de `reports:cash_cut_read` (Criterios de Seguridad de las historias 1-3).**
`reports:purchases_read`, `reports:sales_by_product_read`, `reports:customer_collections_read` se agregan al catálogo de `prisma/seed.ts` y a los TRES bloques de rol (`admin`, `operator`, `viewer`) — los reportes existentes (`inventory_read`, `account_statements_read`, `sales_cut_read`, `cash_cut_read`) ya siguen ese patrón de lectura universal por rol; no hay razón de negocio para restringir alguno de los nuevos a menos roles.

## Risks / Trade-offs

- **[Riesgo] Extender `CashCutRawRow` con `saleId`/`customerId` podría acoplar accidentalmente `cash-cut` y `customer-collections` a futuro si alguien modifica el assembler equivocado.** → Mitigación: `CollectionsAssembler` es un archivo de dominio nuevo y separado; el test de `CashCutAssembler.test.ts` existente no cambia (verifica que los campos nuevos no rompen su contrato).
- **[Riesgo] El cruce de inventario en Ventas por Producto (`currentStock`) puede ser costoso si se suma stock entre todas las sucursales sin filtro.** → Mitigación: mismo `resolveScopedBranchId` que el resto de reportes acota la consulta; sin `branches:access_all` el query de `branch_inventory` ya viene limitado a una sucursal.
- **[Riesgo] `GetPurchasesReportUseCase` reutilizando `PrismaPurchaseRepository.findAll` (pensado para paginación UI) podría no ser eficiente para export sin paginar.** → Mitigación: mismo patrón de cap de filas (`PDF_ROW_LIMIT`/`ReportTooLarge`) que `GetPaymentHistoryReportUseCase` ya resuelve para este problema exacto.
- **[Trade-off] Se crean 3 permisos RBAC nuevos en vez de reusar `purchases:read`/`payments:report_read` existentes.** Aceptado deliberadamente: el patrón establecido en el módulo (`reports:*_read` distinto de los permisos operativos del módulo fuente) ya lo hace así para `cash_cut_read` (distinto de `payments:report_read`) y `sales_cut_read` (distinto de `sales:read`) — consistencia con la convención existente pesa más que ahorrarse 3 filas de seed.

## Migration Plan

Sin migración de schema (no hay cambios a `prisma/schema.prisma`). El único cambio de datos es el seed de permisos (`npm run seed`, idempotente). Deploy estándar: mergear a `develop`, correr `npm run seed` en el entorno objetivo antes o después del deploy (orden no importa — el seed solo agrega permisos, no depende del código nuevo). Rollback: revertir el commit: los permisos nuevos quedan huérfanos en la tabla pero inertes (sin endpoint ni UI que los consuma), sin necesidad de rollback de datos.
