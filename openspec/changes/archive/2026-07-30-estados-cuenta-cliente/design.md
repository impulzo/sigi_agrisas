## Context

El panel ya persiste todo lo necesario para un estado de cuenta de crédito, pero disperso: `sales` (con `payment_method_id → payment_methods.is_credit`, `total`, `paid_amount`, `payment_status`, `status`, `created_at`, `folio_code/number`, `branch_id`, `customer_id`), `customer_payments` (abonos `completed`/`cancelled` con `amount`, `folio`, `created_at`), y `customers.current_balance`/`credit_limit`. El módulo `reports` (`src/modules/reports/`) ya fija el patrón: use case + port + repos Prisma/InMemory, guard RBAC `reports:*`, branch scoping (`resolveScopedBranchId`), y salida JSON/PDF con `@react-pdf/renderer` (ver `PaymentHistoryReportPdf.tsx`, `ReportsController.getPaymentHistoryReport`).

Este cambio agrega un nuevo tipo de reporte —Estado de Cuenta por cliente— con dos vistas: **Resumen** (agregado multi-cliente) y **Desglosado** (libro mayor por cliente con saldo corrido), más su UI en un módulo `/reports` nuevo.

Referencia trazable: cada decisión responde a una fila de `## Historia de Usuario` en `proposal.md` (S1–S5).

## Goals / Non-Goals

**Goals**
- S1: agregado de crédito por cliente (cargado/abonado/saldo/límite/disponible), paginado, `onlyWithBalance`.
- S2: libro mayor cronológico por cliente con `runningBalance`, `openingBalance` por rango, todos los movimientos marcados por tipo/estado.
- S3: export PDF de ambas vistas; límite 10 000 filas.
- S4/S5: módulo UI `/reports` + item NavigationRail.
- Reutilizar el patrón del módulo `reports` (no crear módulo nuevo backend).

**Non-Goals**
- No mutar `current_balance`, `payment_status` ni inventario (solo lectura).
- No migración de BD en el alcance original (S1–S5). La extensión "Alineación con user story legacy" (§13 en tasks.md) sí requirió una migración puntual (`Sale.dueDate`, `Customer.creditDays`) — ver sección **Extensión: Vencimiento** abajo.
- No cron de expiración ni notificaciones.
- No CSV ni otros formatos (solo json/pdf).
- No tocar la lógica de `payments` (abonos) ni de `pos` más allá de setear `dueDate` al crear una venta a crédito.

## Decisions

### Ubicación: nuevo tipo de reporte dentro del módulo `reports`
Responde a S1/S2/S3. Se agregan al módulo existente `src/modules/reports/`:
- Port `application/ports/AccountStatementRepository.ts`.
- Value objects `domain/value-objects/AccountStatementFilters.ts`, `AccountMovement.ts`.
- Servicio de dominio `domain/services/AccountLedgerBuilder.ts` (puro).
- Use cases `GetAccountStatementsSummaryUseCase.ts`, `GetAccountStatementLedgerUseCase.ts`.
- DTOs `application/dto/AccountStatementSummaryResponseDto.ts`, `AccountStatementLedgerResponseDto.ts`.
- Repos `infrastructure/repositories/{Prisma,InMemory}AccountStatementRepository.ts`.
- PDF `infrastructure/pdf/AccountStatementPdf.tsx`.
- Métodos en `ReportsController` + entradas en `di/container.ts`.

### Qué es un "cargo" y qué mueve el saldo (S1, S2)
Decisión de negocio (respuesta del usuario "Todo movimiento del cliente"):
- **Movimientos incluidos** en el desglose: TODAS las ventas del cliente (contado y crédito) + TODOS los abonos (`completed` y `cancelled`).
- **Qué mueve `runningBalance`**: SOLO ventas a crédito (`payment_method.is_credit = true`, `status != 'cancelled'`) como **débito (+)** por su `total`, y abonos `completed` como **crédito (−)** por su `amount`.
- **Contado**: aparece como fila `type='sale_cash'` con su total en una columna informativa, pero `debit=0`/`credit=0` → no altera el saldo corrido.
- **Cancelados**: ventas `status='cancelled'` y abonos `status='cancelled'` aparecen con `status='cancelled'`, `debit=0`/`credit=0` → no alteran el saldo (su reverso ya está implícito en que nunca sumaron; el `current_balance` de BD ya excluye lo cancelado).

Justificación: el `customer.current_balance` que ya mantiene `payments` refleja exactamente `Σ(ventas crédito vigentes) − Σ(abonos completed)`. El libro mayor debe reconstruir ese mismo número al final para ser consistente; por eso el saldo corrido solo lo mueven esos dos tipos.

### `AccountLedgerBuilder` (servicio de dominio puro) — S2
Entrada: lista de movimientos crudos `{ id, kind: 'sale'|'payment', isCredit, status, amount, date, folioCode, folioNumber }` + `openingBalance: number`. Salida: lista ordenada por `date` asc (desempate: ventas antes que abonos del mismo instante) con cada movimiento enriquecido:
```
type   = isCredit&&kind==='sale' ? 'sale_credit'
       : kind==='sale'           ? 'sale_cash'
       :                           'payment'
debit  = type==='sale_credit' && status!=='cancelled' ? amount : 0
credit = type==='payment'      && status==='completed' ? amount : 0
runningBalance = prev + debit - credit   // arranca en openingBalance
```
Redondeo banker's a 4 decimales (mismo helper que los `*TotalsCalculator`). Sin I/O → testeable con vectores. Cubre AC de S2: contado no mueve, cancelado no mueve, opening balance.

### Agregación del Resumen (S1)
`PrismaAccountStatementRepository.summary(filters, page)` vía `$queryRaw`:
- `totalCharged` = `Σ sales.total WHERE is_credit AND status<>'cancelled'` por cliente.
- `totalPaid` = `Σ customer_payments.amount WHERE status='completed'` por cliente.
- `currentBalance` = se lee de `customers.current_balance` (fuente de verdad ya mantenida por `payments`), no recomputada, para evitar divergencia.
- `creditLimit` = `customers.credit_limit`.
- `availableCredit` = `creditLimit === null ? null : creditLimit − currentBalance`.
- Filtros: branch scoping sobre `sales.branch_id`/`customer_payments.branch_id`; `onlyWithBalance` → `HAVING current_balance <> 0`; `search` (≥2 chars) sobre nombre/código cliente; rango `from/to` acota `totalCharged`/`totalPaid` del periodo (el `currentBalance` sigue siendo el vigente).
- Paginación estándar (`pageSize ≤ 100`).

### Opening balance por rango (S2)
Cuando llega `?from`, `openingBalance = Σ(ventas crédito vigentes con date < from) − Σ(abonos completed con date < from)`, en una consulta agregada aparte; los movimientos devueltos son los del rango `[from, to]`. Sin `from` → `openingBalance = 0` y se listan todos desde el inicio. Responde al AC de periodo de S2.

### Branch scoping (S1, S2 — Criterios de Seguridad)
- Resumen y desglose usan `resolveScopedBranchId(req, filters.branchId, authz)`; sin `branches:access_all` el operador solo ve movimientos de su sucursal (`branch_id = x-user-branch-id`).
- El desglose por cliente NO expone movimientos de sucursales fuera de scope: el `WHERE branch_id` se aplica también a las consultas de opening balance y de movimientos. Un cliente puede tener saldo en varias sucursales; con scope, el desglose muestra solo la porción visible.

### RBAC (S1–S5 — Criterios de Seguridad)
Nuevo permiso `reports:account_statements_read`. Reparto en `prisma/seed.ts`: `admin`, `operator`, `viewer` (idéntico a `reports:inventory_read`). Guard `requirePermission(req, "reports:account_statements_read", authz)` en ambos endpoints. 401 sin `x-user-id`, 403 sin permiso.

### Endpoints y `?format` (S1, S2, S3)
- `GET /api/v1/admin/reports/account-statements` → resumen.
- `GET /api/v1/admin/reports/account-statements/[customerId]` → desglose.
- Ambos: `?format=json` (default) | `pdf`; valor inválido → 400 `{"error":"Invalid format. Allowed: json, pdf"}`.
- PDF vía `renderToBuffer(<AccountStatementPdf .../>)`; `Content-Disposition: attachment; filename="account-statement-<scope>-YYYY-MM-DD.pdf"`.
- Desglose con `> 10 000` movimientos y `format=pdf` → 409 `{"error":"ReportTooLarge","limit":10000}` (consistente con payment history).
- Rutas Next: `app/api/v1/admin/reports/account-statements/route.ts` y `.../[customerId]/route.ts`, ambas delegan a `reportsController`.

### Frontend — módulo `/reports` (S4, S5)
Estructura Atomic + `_logic/` por feature bajo `app/(private)/reports/`:
```
reports/
├── page.tsx                      # Server Component — hub / redirige a account-statements
├── account-statements/
│   ├── page.tsx                  # resumen (tabla multi-cliente)
│   └── [customerId]/page.tsx     # desglose por cliente
├── _blocks/                      # presentacionales: AccountStatementsPage, SummaryTable,
│                                 #   StatementToolbar, LedgerTable, LedgerHeader,
│                                 #   PeriodSelector, ExportPdfButton, empty/error states
└── _logic/
    ├── services/                 # getAccountStatementsSummary, getAccountStatementLedger,
    │                             #   downloadAccountStatementPdf (aceptan fetchImpl?)
    ├── hooks/                    # useAccountStatementsSummary, useAccountStatementLedger
    └── types/                    # api.ts (DTOs HTTP) + domain.ts
```
- `_blocks` presentacionales: sin `fetch`/navegación/validación (regla de capas). `useState` solo para inputs.
- Búsqueda cliente server-side (`?search=`, ≥2 chars, debounce 300 ms) reutilizando `CatalogToolbar` con `searchScope="server"` si aplica.
- Filtro sucursal visible solo con `can("branches:access_all")`.
- `PeriodSelector`: SegmentedButton "Completo | Rango"; en "Rango" muestra date inputs y recalcula.
- `ExportPdfButton`: descarga vía `authFetch` (Bearer) → blob → download; sin exponer token.
- Gating con `useCurrentUser().can("reports:account_statements_read")`, optimista en `"loading"`.

### NavigationRail (S4)
Nuevo `RailItem` primario:
```
{ key:'reports', href:'/reports', icon:'summarize', label:'Reportes',
  requires:'reports:account_statements_read' }
```
Insertado tras `returns`/antes de `inventory` (o donde encaje el orden actual). Visible optimista en `"loading"`, oculto en `false`.

### Archivos afectados
**Backend (nuevos salvo indicado):**
- `src/modules/reports/application/ports/AccountStatementRepository.ts`
- `src/modules/reports/domain/value-objects/AccountStatementFilters.ts`, `AccountMovement.ts`
- `src/modules/reports/domain/services/AccountLedgerBuilder.ts`
- `src/modules/reports/application/use-cases/GetAccountStatementsSummaryUseCase.ts`, `GetAccountStatementLedgerUseCase.ts`
- `src/modules/reports/application/dto/AccountStatementSummaryResponseDto.ts`, `AccountStatementLedgerResponseDto.ts`
- `src/modules/reports/infrastructure/repositories/PrismaAccountStatementRepository.ts`, `InMemoryAccountStatementRepository.ts`
- `src/modules/reports/infrastructure/pdf/AccountStatementPdf.tsx`
- `src/modules/reports/infrastructure/http/ReportsController.ts` (editar: 2 métodos)
- `src/modules/reports/infrastructure/di/container.ts` (editar)
- `app/api/v1/admin/reports/account-statements/route.ts`, `.../[customerId]/route.ts` (nuevos)
- `prisma/seed.ts` (editar: permiso + reparto)

**Frontend (nuevos salvo indicado):**
- Módulo `app/(private)/reports/**` completo (pages, `_blocks`, `_logic`).
- `app/_components/organisms/NavigationRail.tsx` (editar: nuevo item).

### Extensión: Vencimiento (S2 legacy — dueDate/creditDays)
Decisión posterior al diseño original, en respuesta al alineamiento con el user story legacy (columna "Vencimiento", tasks.md §13–17):
- Migración `20260726000001_add_sale_due_date`: `Sale.dueDate DateTime?` (nullable) + `Customer.creditDays Int @default(30)`. Aplicada a producción vía `mcp__supabase__apply_migration` (bypass del tracking roto de `_prisma_migrations`, ver nota en `tasks.md:78`).
- `PrismaSaleRepository.createCompleted`/`createCompletedFromQuote`: gate real en código es `paymentStatus !== 'paid'` (no `paymentMethod.isCredit` directamente — equivalente en la práctica porque las ventas a crédito siempre se crean con `paymentStatus` distinto de `'paid'`), `dueDate = completedAt + customer.creditDays` días; contado → `dueDate = null`.
- Este es el único punto donde el cambio toca `pos`/`payments` fuera de solo-lectura: agrega un campo derivado en la creación de venta, sin alterar montos, saldo ni flujo existente.

## Risks / Trade-offs

- **Divergencia `currentBalance` vs suma de movimientos**: se mitiga leyendo `currentBalance` de `customers` (fuente de verdad) y usándolo como saldo final esperado; el `runningBalance` del libro debe converger a él. Si no converge (dato histórico inconsistente), es señal de reconciliación —no lo ocultamos.
- **Caveat de cancelación de venta con devoluciones/abonos** (documentado en CLAUDE.md): el estado de cuenta refleja el estado actual de BD, no reconcilia inflaciones de stock; solo reporta saldo monetario.
- **Performance de agregación**: `$queryRaw` con `GROUP BY customer` sobre `sales`+`customer_payments`; aceptable para el volumen actual, paginado. Índices existentes en `customer_id`/`branch_id` cubren el filtro.
- **PDF grande**: límite 10 000 filas evita OOM en `renderToBuffer`, igual que payment history.

## Migration Plan

1. Implementar backend (port → domain service → repos → use cases → controller → rutas), con tests InMemory.
2. Agregar permiso a `prisma/seed.ts` y correr `npm run seed` (idempotente).
3. Implementar UI `/reports` + NavigationRail.
4. Verificar en dev con un cliente con ventas crédito + abonos. Sin rollback de datos (solo lectura); revertir = quitar rutas/permiso.
5. **Extensión** (§13 tasks.md): aplicar migración `add_sale_due_date` (`Sale.dueDate`, `Customer.creditDays`), poblar `dueDate` en creación de venta a crédito, extender ledger con campos fiscales + `history`/`sort` + recibo de anticipo. Rollback: `Sale.dueDate` y `Customer.creditDays` son nullable/con default — dropear columnas revierte sin pérdida de datos de negocio (solo se pierde el vencimiento calculado).
