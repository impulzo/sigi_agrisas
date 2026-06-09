## Why

El POS ya soporta emisión, cancelación y edición de tickets, y el inventario por sucursal acepta stock negativo cuando lo origina una venta. Pero hoy NO existe forma de modelar la situación más común en agro-retail: **un cliente devuelve uno o varios productos de una venta concreta**, ya sea porque el producto estaba en mal estado, el cliente se equivocó de presentación, sobró parte del pedido, o se requiere un cambio.

Sin un módulo de devoluciones, las únicas alternativas son:

1. **Cancelar toda la venta** (`POST /sales/:id/cancel`) — pero esto reembolsa todo, no permite devolver sólo 1 saco de 10, no captura un motivo, y rompe la auditoría fiscal del folio.
2. **Editar la venta** (`PATCH /sales/:id`) — sólo desde la matriz (HQ), pierde la "razón de la devolución" y mezcla "corrección de captura" con "devolución comercial" en el mismo flag de auditoría (`status='edited'`).
3. **Ajuste manual de inventario** (`POST /inventory/.../adjust`) — pierde por completo el enlace al ticket origen y el motivo no se persiste.

El cliente fijó cinco reglas concretas para el módulo:

1. Registrar **la devolución de un producto** (uno o varios renglones de un ticket).
2. La devolución debe poder **quitarse** (cancelarse) — al cancelarse, el producto **deja de estar devuelto** y por lo tanto **deja de reingresar al inventario** (el stock vuelve al valor que tenía antes de la devolución).
3. Estar **obligatoriamente enlazada a un ticket** y exigir **motivo + fecha**.
4. Debe existir **un permiso específico** para hacer devoluciones (no se hereda de `sales:cancel`).
5. **Branch scoping**: un operador sólo puede devolver tickets de su propia sucursal; el administrador (`branches:access_all`) puede devolver de cualquier sucursal.

Para soportarlo el sistema necesita: una nueva entidad `Return` con líneas (`ReturnItem`) que apuntan a `sale_items`, un ciclo de vida claro (`completed → cancelled`), un servicio que controle "cantidad devuelta acumulada por línea de venta ≤ cantidad vendida", reincorporación de inventario atómica al registrar la devolución y la reversión también atómica al cancelarla, y branch scoping reutilizando el helper compartido. El módulo se inspira en el patrón ya validado por `pos-api` y `add-quotes-crud`.

## What Changes

### Migración + esquema

Nueva migración Prisma `add_returns_tables` que:

- Crea las tablas:
  - `returns` (encabezado de devolución con folio, motivo, fecha, sucursal, cliente snapshot, ticket origen, total reembolsado, estado).
  - `return_items` (líneas con FK al `sale_item` original, snapshot de producto y precio, cantidad devuelta y totales — mismo patrón que `sale_items`).
- Índices: `returns(sale_id)`, `returns(branch_id)`, `returns(customer_id)`, `returns(status)`, `returns(returned_at)`, `returns(created_at)`. Sobre `return_items(return_id)`, `return_items(sale_item_id)`, `return_items(product_id)`.
- No modifica `sales`/`sale_items`: el ticket original es inmutable a nivel de líneas; lo que se devuelve queda "lateral" en `returns/return_items`.

### Nuevo módulo `src/modules/returns/`

Hexagonal completo. CRUD admin de devoluciones más ciclo de vida (`cancel`):

- **Dominio**: entidades `Return`, `ReturnItem`; value object `ReturnStatus` (`completed`/`cancelled`); errores tipados (`ReturnNotFoundError`, `ReturnAlreadyCancelledError`, `SaleNotReturnableError(status)`, `EmptyReturnError`, `ReturnQuantityExceedsRemainingError(saleItemId, requested, remaining)`, `SaleItemNotPartOfSaleError`, `ReturnCancellationStockNegativeError`).
- **Servicio de dominio** puro `ReturnTotalsCalculator` (re-usa la misma fórmula y redondeo half-to-even de `SaleTotalsCalculator`) para calcular `refundSubtotal`, `refundTax`, `refundTotal` por línea y a nivel encabezado. Test de equivalencia obligatorio contra `SaleTotalsCalculator`.
- **Servicio de dominio** puro `ReturnableQuantityCalculator.computeRemaining(saleItem, priorReturnItems): Decimal` — calcula la cantidad aún devolvible (`saleItem.quantity - sum(activeReturnItems.quantity)`) excluyendo devoluciones canceladas.
- **Aplicación**: puerto `ReturnRepository`; use cases `CreateReturnUseCase` (transaccional: valida sale, valida líneas, snapshotea, recalcula remanente, restaura inventario, persiste), `ListReturnsUseCase`, `GetReturnUseCase`, `CancelReturnUseCase` (transaccional: re-decrementa inventario si es posible, marca cancelado).
- **Infraestructura**: `PrismaReturnRepository`; `ReturnsController`; DI container que importa `saleRepository`, `branchRepository`, `prisma`, `authorizationService`.

### Route handlers (todos bajo `/api/v1/admin/returns` excepto el listado por ticket)

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/api/v1/admin/returns` | `returns:read` — paginado, `?branchId&customerId&saleId&status&from&to&search` |
| GET | `/api/v1/admin/returns/:id` | `returns:read` — detalle con items |
| POST | `/api/v1/admin/returns` | `returns:create` — emite devolución completada atómicamente |
| POST | `/api/v1/admin/returns/:id/cancel` | `returns:cancel` — revierte la devolución (re-decrementa inventario) |
| GET | `/api/v1/admin/sales/:id/returns` | `returns:read` — lista devoluciones de un ticket específico (helper para la UI del ticket) |

### Cambios en módulos existentes

- **`rbac`**: 3 permisos nuevos (`returns:read`, `returns:create`, `returns:cancel`). El total sube de 31 a **34**. Asignación a roles base: `admin` recibe los 3; `operator` recibe los 3 (es quien atiende devoluciones en campo); `viewer` recibe sólo `returns:read`.
- **`pos-api`**: `SaleDetailDto` añade `returnedQuantityBySaleItem: Record<saleItemId, number>` (cantidad ya devuelta acumulada por cada línea, sumando sólo devoluciones `completed`). Permite a la UI mostrar "Devuelto: 3 de 10" por renglón sin un round-trip extra. Sin cambios en endpoints existentes. Sin cambios en cancelación/edición de la venta (ver Decisión 6 en el design).
- **`inventory-api`**: `branch_inventory.quantity` puede ahora crecer también por devolución (UPDATE atómico `quantity = quantity + qty`). Si al cancelar una devolución la resta dejaría el stock negativo Y la sucursal exige no-negatividad para movimientos de admin, la cancelación se rechaza con 409 — pero por defecto se permite (alineado con la regla del POS de aceptar negativos cuando el origen es una venta; ver Decisión 7).

### Branch scoping

El módulo `returns` aplica el mismo patrón transversal que `pos-api`/`quotes-api`/`inventory-api`: el controller usa el helper compartido `enforceBranchScope` antes de invocar el use case. Los usuarios con `branches:access_all` (admin) ven y operan todo; los demás están limitados a su `x-user-branch-id`. La sucursal de la devolución se hereda **siempre** de `sale.branchId` (es inmutable: no se puede devolver "a otra sucursal"); el body de `POST /returns` NO acepta `branchId`.

### Tests

- Unit tests por use case (in-memory repos) — ~8 archivos.
- Unit tests de `ReturnableQuantityCalculator` puro — escenarios: sin devoluciones previas, con varias devoluciones, con una devolución cancelada (no cuenta), devolución completa.
- Unit tests de `ReturnTotalsCalculator` puro + **test de equivalencia** contra `SaleTotalsCalculator` sobre vectores compartidos.
- Tests de validación Zod en el controller nuevo.
- Tests de integración Supabase: crear venta → devolver parcialmente → verificar inventario incrementado + sale_items intacto + saldo "devolvible" reducido → segunda devolución que rebasa lo restante → 409 → cancelar la primera devolución → verificar inventario revertido → re-intentar la segunda → ahora pasa.

**No-Goals (fuera de scope de este change):**

- UI/frontend de devoluciones (se construye en `add-returns-ui`, change futuro).
- Devoluciones sobre **tickets cancelados** o **tickets editados** (en v1 sólo `status='completed'` es devolvible; `edited` queda diferido hasta confirmar la regla fiscal con el cliente — ver Open Question).
- Generación de notas de crédito CFDI (egreso fiscal): se documenta como mejora futura (`add-credit-notes-cfdi`).
- Reembolso al `customer.currentBalance` o devolución de efectivo automatizada: `currentBalance` sigue siendo read-only (regla heredada de `add-pos`); el flujo de saldo se aborda en `add-customer-credit`.
- Devolución parcial de un renglón en **cantidad fraccionaria** mayor a la cantidad sellable: el sistema acepta decimales (heredado de `quantity Decimal(14,4)`) pero NO valida unidad de venta (`saleable_unit`).
- Permitir cambiar producto/precio en la devolución: la devolución es siempre 1:1 con un `sale_item` existente; "cambios" (devolver A y entregar B) se hacen como `Return` de A + nuevo `Sale` de B, dos operaciones separadas.
- Re-devolución después de cancelar: una devolución cancelada NO puede volverse a "des-cancelar"; el operador debe crear una devolución nueva sobre las líneas correspondientes.
- Cron/job de expiración: una devolución se queda en `completed` indefinidamente hasta cancelación explícita (sin TTL).

## Capabilities

### New Capabilities

- `returns-api`: REST admin de devoluciones — registro contra un ticket existente, validación de cantidad remanente por línea, restauración de inventario, cancelación que revierte el inventario, branch scoping y enlace bidireccional con `sales` vía `return_items.sale_item_id`.

### Modified Capabilities

- `rbac`: 3 permisos nuevos (`returns:read`, `returns:create`, `returns:cancel`) y nuevas asignaciones a roles base. El total sube de 31 a 34.
- `pos-api`: `SaleDetailDto` expone `returnedQuantityBySaleItem` para que la UI del ticket pueda mostrar cuánto ya se devolvió por línea sin un round-trip extra. Sin cambios en otros DTOs ni en endpoints existentes.
- `inventory-api`: documenta explícitamente que `branch_inventory.quantity` también se mueve por devoluciones; el incremento es atómico y reusa el patrón ya probado por `cancel sale`. Sin cambios en endpoints existentes.

## Impact

- **Código nuevo**: 1 módulo hexagonal completo (`returns`) — ~30 archivos backend, 5 route handlers, ~10 archivos de tests.
- **Código modificado**: `prisma/schema.prisma` (2 modelos nuevos), `prisma/seed.ts` (3 permisos nuevos + asignaciones), `src/modules/pos/application/dto/SaleDto.ts` (campo `returnedQuantityBySaleItem`), `src/modules/pos/infrastructure/repositories/PrismaSaleRepository.ts` (carga el agregado al armar el `SaleDetailDto`), `CLAUDE.md` (nueva sección "Devoluciones (Backend)" + actualizaciones puntuales en POS e Inventory).
- **Migraciones de BD**: una migración (`add_returns_tables`) que crea 2 tablas y sus índices.
- **Sin cambios en UI/frontend** en este change.
- **Sin cambios en branch scoping global** — se reutiliza el helper `enforceBranchScope` ya existente.
- **Riesgo principal**: la cancelación de una devolución vuelve a decrementar el stock, lo que puede dejar el inventario negativo si entre el momento de la devolución y la cancelación se vendieron las unidades devueltas. Mitigación: el flujo es atómico y el negativo está permitido por la regla del POS (sólo el path `admin/adjust` lo rechaza). Documentado explícitamente en el spec.
