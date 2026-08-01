## Context

El panel persiste cada venta en `sales` (`subtotal`, `taxTotal`, `total`, `status`, `paymentMethodId`, `cashierId`, `branchId`, `createdAt`, `completedAt`), los abonos en `customer_payments` (`amount`, `status`, `createdAt`, `branchId`) y las devoluciones en `returns` (`refundSubtotal`, `refundTax`, `refundTotal`, `status`, `returnedAt`, `branchId`). El split IVA/IEPS **no** vive en `sales` (`taxTotal` es combinado) sino en `sale_items` (`ivaRate`, `iepsRate`, `lineSubtotal`, `lineTax`).

El módulo `reports` ya fija el patrón (use case + port + repos Prisma/InMemory, guard RBAC `reports:*`, `resolveScopedBranchId`, salida JSON/PDF con `@react-pdf/renderer`), como el reciente Estado de Cuenta. El Corte de Ventas es un nuevo tipo de reporte que reutiliza esa infraestructura.

Trazabilidad: cada decisión responde a una fila de `## Historia de Usuario` en `proposal.md` (S1–S4).

## Goals / Non-Goals

**Goals**
- S1: agregados globales de ventas del periodo (`grossSales`, `ticketCount`, `subtotal`, `taxTotal`, IVA/IEPS global) + desgloses `byPaymentMethod`, `byDay`, `byCashier`, `byBranch`; canceladas aparte.
- S2: `netCash = grossSales + paymentsReceived − returnsRefunded`, con componentes expuestos.
- S3: export PDF.
- S4: hub `/reports` + vista `/reports/sales-cut` con toggle Hoy|Rango, filtros y export.
- S5: filas de cobranza (`customer_payments`) del periodo con cliente/factura/días/IVA prorrateado/forma de pago/referencia, totalizadores y desglose dinámico por forma de pago, export PDF+Excel, vista `/reports/cash-cut` con tarjeta propia en el hub.
- Reutilizar el patrón del módulo `reports`.

**Non-Goals**
- No mutar `sales`/`payments`/`returns`/inventario (solo lectura).
- No migración de BD.
- No arqueo de denominaciones de efectivo (conteo físico de billetes) ni apertura/cierre de turno con caja física.
- No CSV (ni otros formatos fuera de json/pdf para S1-S4; S5 agrega `xlsx` — ver decisión S5).
- No split IVA/IEPS por cada desglose de S1 (solo global) — ver decisión abajo.
- S5 no construye un visor de reporte embebido (zoom/paginación tipo Crystal Reports); "imprimir" se resuelve exportando el PDF, igual que el resto de reportes del panel.
- S5 no expone filtros de cliente/cajero/forma de pago en la UI v1 (solo sucursal + rango, como pide la historia); el backend sí acepta `customerId`/`paymentMethodId` opcionales por consistencia con el resto de endpoints de `reports`.

## Decisions

### Ubicación: nuevo tipo de reporte dentro del módulo `reports`
Responde a S1/S2/S3. Se agregan a `src/modules/reports/`:
- Port `application/ports/SalesCutRepository.ts`.
- Value object `domain/value-objects/SalesCutFilters.ts` + tipos crudos de agregados.
- Servicio de dominio `domain/services/SalesCutAssembler.ts` (puro).
- Use case `application/use-cases/GetSalesCutReportUseCase.ts`.
- DTO `application/dto/SalesCutReportResponseDto.ts`.
- Repos `infrastructure/repositories/{Prisma,InMemory}SalesCutRepository.ts`.
- PDF `infrastructure/pdf/SalesCutReportPdf.tsx`.
- Método en `ReportsController` + entrada en `di/container.ts` + ruta.

### Qué cuenta y por cuál fecha (S1)
Decisión del usuario: periodo por **`createdAt`**; ventas `completed` y `edited` suman al total; `cancelled` **aparte** (monto + conteo, no suma al neto).
- Ventas activas: `status IN ('completed','edited')`.
- Ventas canceladas: `status = 'cancelled'` → bloque `cancelled` separado.
- Periodo: `createdAt >= from` y `createdAt <= endOfDay(to)`.
- Preset **"hoy"**: el controller resuelve `from = to = fecha UTC actual` cuando el query trae `preset=today` (o sin `from/to`). El rango explícito usa `from/to` del query. `from > to` → 400.

### Desgloses (S1)
`byPaymentMethod`, `byDay`, `byCashier`, `byBranch`, cada uno con `{ key/id, label, ticketCount, subtotal, taxTotal, total }`.
- `byPaymentMethod`, `byCashier`, `byBranch`: `prisma.sale.groupBy` por el id correspondiente (solo ventas activas + filtros) con `_sum` y `_count`; los **nombres** se resuelven en una segunda consulta (`findMany where id in [...]`) y se mapean en el assembler (evita raw SQL para estos tres).
- `byDay`: requiere `date_trunc('day', created_at)` → **`$queryRaw`** (Prisma `groupBy` no soporta truncado de fecha), devolviendo `day, ticket_count, subtotal, tax_total, total`.
- Filtros `cashierId`/`paymentMethodId`/`branchId` acotan **las consultas de ventas** (no aplican a abonos/devoluciones salvo `branchId`).

### Split IVA/IEPS: solo global (S1)
`sales.taxTotal` es combinado; el split vive en `sale_items`. Para no encarecer cada desglose, el corte expone `ivaTotal`/`iepsTotal` **solo a nivel global**, vía una consulta agregada sobre `sale_items` unida a `sales` activas del periodo (respetando filtros): `Σ(lineSubtotal × ivaRate)` y `Σ(lineSubtotal × iepsRate)`. Los desgloses cargan `taxTotal` combinado. Se documenta en la spec.

### Neto de caja (S2)
`SalesCutAssembler` calcula:
```
grossSales       = Σ sales.total (activas)
paymentsReceived = Σ customer_payments.amount (status='completed', createdAt en periodo, branch scope)
returnsRefunded  = Σ returns.refundTotal (status='completed', returnedAt en periodo, branch scope)
netCash          = grossSales + paymentsReceived − returnsRefunded
```
Los tres componentes se exponen para conciliación. Cancelados de abonos/devoluciones no cuentan. Banker's rounding a 4 decimales (decimal.js, como los `*TotalsCalculator`).

### `SalesCutAssembler` (servicio de dominio puro)
Entrada: agregados crudos del repo (`activeTotals`, `cancelledTotals`, `taxSplit`, `byPaymentMethod[]`, `byDay[]`, `byCashier[]`, `byBranch[]`, `paymentsReceived`, `returnsRefunded`). Salida: DTO ensamblado con `netCash` y desgloses ordenados (byDay asc por fecha; los demás desc por `total`). Sin I/O → testeable con vectores. Cubre AC de S1/S2.

### Branch scoping (S1/S2 — Seguridad)
`resolveScopedBranchId(req, filters.branchId, authz)`. Sin `branches:access_all`, todas las consultas (ventas, abonos, devoluciones, y los cuatro desgloses) se filtran por `branch_id = x-user-branch-id`; `byBranch` trae solo esa sucursal. Con bypass y sin `branchId`, agrega todas.

### RBAC (S1–S4 — Seguridad)
Nuevo permiso `reports:sales_cut_read`. Reparto en `prisma/seed.ts`: `admin`, `operator`, `viewer` (idéntico a `reports:account_statements_read`). Guard `requirePermission(req, "reports:sales_cut_read", authz)`. 401 sin `x-user-id`, 403 sin permiso.

### Endpoint y `?format` (S1, S3)
- `GET /api/v1/admin/reports/sales-cut` → corte.
- `?format=json` (default) | `pdf`; inválido → 400 `{"error":"Invalid format. Allowed: json, pdf"}`.
- PDF vía `renderToBuffer(<SalesCutReportPdf/>)`; `Content-Disposition: attachment; filename="sales-cut-<from>_<to>.pdf"`.
- Ruta Next `app/api/v1/admin/reports/sales-cut/route.ts` delega a `reportsController`.
- Query Zod: `preset?=today`, `from?`, `to?` (`YYYY-MM-DD`), `branchId?`, `cashierId?`, `paymentMethodId?` (uuid), `format`. `from > to` → 400.

### Frontend — hub `/reports` + vista `/reports/sales-cut` (S4)
- `app/(private)/reports/page.tsx`: deja de `redirect`; pasa a **hub** con tarjetas ("Estados de Cuenta" → `/reports/account-statements`, "Corte de Ventas" → `/reports/sales-cut`), cada una gated por su permiso.
- `app/(private)/reports/sales-cut/`:
  ```
  ├── page.tsx                 # Server Component, metadata, gating
  ├── _blocks/                 # SalesCutPage, PeriodToggle (Hoy|Rango), CutFilters,
  │                            #   TotalsCards, NetCashCard, BreakdownTable (reutilizable),
  │                            #   ExportPdfButton, empty/error
  └── _logic/                  # services/getSalesCut + downloadSalesCutPdf (fetchImpl?),
      ├── hooks/useSalesCut    #   hook con preset/filtros/export
      └── types/               #   api.ts + domain.ts
  ```
- `PeriodToggle`: SegmentedButton "Hoy | Rango"; "Hoy" precarga el día actual (envía `preset=today`), "Rango" habilita from/to.
- `TotalsCards`: grossSales, ticketCount, subtotal, IVA, IEPS, canceladas. `NetCashCard`: netCash + componentes.
- `BreakdownTable`: componente presentacional reutilizado para los cuatro desgloses.
- Filtro sucursal solo con `can("branches:access_all")`; filtro cajero/método opcional.
- `ExportPdfButton`: descarga vía `authFetch` (Bearer) → blob → download.
- Gating con `useCurrentUser().can("reports:sales_cut_read")`, optimista en `"loading"`.
- NavigationRail ya tiene el item "Reportes" (`reports:account_statements_read`); se cambia su `requires` por una visibilidad OR de permisos de reportes, o se deja como está (el hub gatea cada tarjeta). Decisión: dejar el item como está y gatear por tarjeta — un usuario con solo `sales_cut_read` accede vía URL directa; ajuste menor del `requires` del rail queda como nota.

### Corte de Caja / Cobranza detallada (S5)

Responde a S5. Reporte de **grano fila** (un abono por fila), distinto de los agregados de S1 — se modela como capability hermana `cash-cut-api` en el mismo módulo `src/modules/reports/`, no como extensión de `SalesCutAssembler`.

**Fuente de datos**: `customer_payments` (`status='completed'`, `createdAt` en el periodo, branch scope) unida a:
- `sales` (vía `payment.saleId`) — para `factura` (`sale.folioCode`), `facturaDate` (`sale.createdAt`), y el prorrateo de IVA (`sale.taxTotal`, `sale.subtotal`, `sale.total`).
- `customers` (vía `payment.customerId`) — para `customerCode` (Cte) y `customerName`.
- `payment_methods` (vía `payment.paymentMethodId`) — para `paymentMethodCode`/`paymentMethodName` (Fp) y el desglose.
- `payment.folioCode` (ya denormalizado por `allocateFolio`) — para `docto`.
- `payment.notes` — para `reference`.

**Prorrateo de IVA** (decisión de usuario — `CustomerPayment` no guarda IVA propio, es un abono sobre una venta ya facturada):
```
ivaAmount   = amount × (sale.taxTotal / sale.total)
taxRatePct  = sale.taxTotal / sale.subtotal
```
Con ventas de productos IVA 0% (típico en insumos agro) da `0.00`, consistente con todos los ejemplos de la historia de usuario. Banker's rounding a 4 decimales (decimal.js), igual que `SalesCutAssembler`.

**`days`**: `Math.floor((collectedAt.getTime() − facturaDate.getTime()) / 86_400_000)`. Sin dependencia nueva (no hay `date-fns` en el repo).

**Desglose por forma de pago** (decisión de usuario): dinámico — una fila de totalizador por cada `payment_method` realmente usado en el periodo, agrupado por `paymentMethodId` con su nombre real del catálogo (`payment_methods` es administrable, sin categorías legacy fijas tipo EFECTIVO/TRANSFERENCIA/APLICACION CREDITO/POR DEFINIR).

**`CashCutAssembler`** (servicio de dominio puro): entrada = filas crudas del repo (`CashCutRawRow[]`); salida = `rows[]` con `days`/`ivaAmount`/`taxRatePct` calculados, `totals { totalCollected, totalIva }`, `byPaymentMethod[]` agrupado. Sin I/O → testeable con vectores.

**Branch scoping**: idéntico a S1/S2 — `resolveScopedBranchId(req, filters.branchId, authz)`; sin `branches:access_all` las filas se limitan a `branch_id = x-user-branch-id`.

**RBAC**: nuevo permiso `reports:cash_cut_read`. Reparto en `prisma/seed.ts`: `admin`, `operator`, `viewer` (idéntico a `reports:sales_cut_read`). Guard `requirePermission(req, "reports:cash_cut_read", authz)`.

**Endpoint y `?format`**: `GET /api/v1/admin/reports/cash-cut`. `?format=json` (default) | `pdf` | `xlsx`; inválido → 400. Query Zod: `from`/`to` obligatorios (`YYYY-MM-DD`), `branchId?`, `customerId?`, `paymentMethodId?` (uuid), `format`. `from > to` → 400. PDF vía `renderToBuffer(<CashCutReportPdf/>)`; Excel vía `buildCashCutWorkbook()` (mismo patrón `xlsx`/SheetJS que `buildKardexWorkbook.ts` — segundo consumidor de esa dependencia ya instalada).

**Columnas exactas del reporte** (fila): `customerCode` (Cte), `docto`, `factura`, `customerName`, `facturaDate` (Fec-Fact), `days`, `amount` (Importe), `paymentMethodCode`/`paymentMethodName` (Fp), `reference`, `collectedAt` (F. Cobro), `ivaAmount` (I.V.A.), `taxRatePct` (Tasa%). El Excel replica estas 12 columnas más filas de totales al final (Total cobrado, Total IVA, una fila por forma de pago).

**Filtros UI mínimos**: la historia solo pide Sucursal (obligatorio) + Rango de Fechas (obligatorio) — se implementa exactamente eso en `/reports/cash-cut`; sin controles de cliente/cajero/forma de pago en v1.

**"Imprimir"**: sin visor de reporte embebido (no existe ese patrón en ningún módulo del panel); "Exportar PDF" es el entregable imprimible, con numeración de página nativa de `@react-pdf/renderer` para satisfacer "Fecha de Emisión"/"Pag. X" del encabezado de la historia.

### Archivos afectados
**Backend (nuevos salvo indicado):**
- `src/modules/reports/application/ports/SalesCutRepository.ts`
- `src/modules/reports/domain/value-objects/SalesCutFilters.ts`
- `src/modules/reports/domain/services/SalesCutAssembler.ts`
- `src/modules/reports/application/use-cases/GetSalesCutReportUseCase.ts`
- `src/modules/reports/application/dto/SalesCutReportResponseDto.ts`
- `src/modules/reports/infrastructure/repositories/PrismaSalesCutRepository.ts`, `InMemorySalesCutRepository.ts`
- `src/modules/reports/infrastructure/pdf/SalesCutReportPdf.tsx`
- `src/modules/reports/infrastructure/http/ReportsController.ts` (editar: 1 método)
- `src/modules/reports/infrastructure/di/container.ts` (editar)
- `app/api/v1/admin/reports/sales-cut/route.ts` (nuevo)
- `prisma/seed.ts` (editar: permiso + reparto)

**Frontend (nuevos salvo indicado):**
- `app/(private)/reports/page.tsx` (editar: redirect → hub)
- `app/(private)/reports/sales-cut/**` (page, `_blocks`, `_logic`)
- Bloque de tarjetas del hub (`_blocks/ReportsHubPage.tsx` o inline en `page.tsx` con Server Component + gating client-side).

**Backend S5 (nuevos salvo indicado):**
- `src/modules/reports/domain/value-objects/CashCutFilters.ts`
- `src/modules/reports/domain/services/CashCutAssembler.ts`
- `src/modules/reports/application/ports/CashCutRepository.ts`
- `src/modules/reports/application/dto/CashCutReportResponseDto.ts`
- `src/modules/reports/application/use-cases/GetCashCutReportUseCase.ts`
- `src/modules/reports/infrastructure/repositories/PrismaCashCutRepository.ts`, `InMemoryCashCutRepository.ts`
- `src/modules/reports/infrastructure/pdf/CashCutReportPdf.tsx`
- `src/modules/reports/infrastructure/xlsx/buildCashCutWorkbook.ts`
- `src/modules/reports/infrastructure/http/ReportsController.ts` (editar: 1 método más)
- `src/modules/reports/infrastructure/di/container.ts` (editar)
- `app/api/v1/admin/reports/cash-cut/route.ts` (nuevo)
- `prisma/seed.ts` (editar: permiso `reports:cash_cut_read` + reparto)

**Frontend S5 (nuevos salvo indicado):**
- `app/(private)/reports/_blocks/ReportsHubPage.tsx` (editar: 3ra tarjeta)
- `app/(private)/reports/cash-cut/**` (page, `_blocks`, `_logic`)

## Risks / Trade-offs

- **IVA/IEPS solo global**: los desgloses no separan IVA/IEPS (usan `taxTotal` combinado). Aceptable para un corte; el split fiscal global cubre la necesidad contable. Alternativa (split por desglose) se descarta por costo de item-aggregation × 4 dimensiones.
- **Zona horaria**: el periodo usa fechas UTC (como el resto de reportes). "Hoy" = día UTC del servidor; puede diferir del día local del cajero cerca de medianoche. Consistente con payment history / account statements; documentado.
- **Neto de caja mezcla flujos**: `grossSales` incluye ventas a crédito (no cobradas en efectivo). El `netCash` definido (`+ abonos − devoluciones`) es el acordado con el usuario; los componentes se exponen para que el contador reconcilie cash vs crédito con `byPaymentMethod`.
- **Performance**: agregados con `groupBy` + un `$queryRaw` (byDay) + una agregación de `sale_items` (tax split); paginación no aplica (es un resumen). Índices existentes en `created_at`/`branch_id`/`status` cubren los filtros.
- **S5 — sin paginación en `rows`**: igual que `sales-cut`, es un corte de periodo acotado (día/rango corto), no un historial abierto; si crece mucho el volumen de abonos por periodo, el mismo límite de filas usado en payment history (`PDF_ROW_LIMIT`) podría replicarse a futuro. No se implementa ahora por no estar en el alcance de la historia.
- **S5 — dos folios de cobranza conviven** (`AB` y `RB`, ambos `scope='OPERATIONS'`): `docto` usa el `folioCode` que efectivamente se allocó al abono (`customer_payments.folioCode`), sin asumir un prefijo fijo.

## Migration Plan

1. Implementar backend (port → domain service → repos → use case → controller → ruta), con tests InMemory.
2. Agregar permiso a `prisma/seed.ts` y correr `npm run seed` (idempotente).
3. Implementar hub `/reports` + vista `/reports/sales-cut`.
4. Verificar en dev con ventas del día (efectivo + crédito), un abono y una devolución → `netCash` cuadra; export PDF. Sin rollback de datos (solo lectura); revertir = quitar ruta/permiso.
5. **S5**: implementar backend cash-cut (value objects → assembler → port/DTO → use case → repos → PDF → xlsx → controller/DI/ruta), con tests InMemory.
6. **S5**: agregar permiso `reports:cash_cut_read` a `prisma/seed.ts` y correr `npm run seed` (idempotente, mismo run que el paso 2 si se hace junto).
7. **S5**: implementar 3ra tarjeta del hub + vista `/reports/cash-cut`.
8. **S5**: verificar en dev con ≥2 abonos completed en distintas formas de pago (idealmente una venta con IVA >0% si existe algún producto gravado) → `days`, `ivaAmount` prorrateado y desglose por forma de pago cuadran; exportar PDF y Excel y abrirlos. Sin rollback de datos (solo lectura); revertir = quitar ruta/permiso.
