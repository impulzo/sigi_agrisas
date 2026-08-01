## Context

Hoy tres módulos mutan `branch_inventory.quantity` directo, sin ledger:
- `PrismaSaleRepository` (`decrementInventoryAllowNegative` en create/createFromQuote; restauración inline en `cancel`; restauración+decremento inline en `replaceItemsAndRecalculate`).
- `PrismaReturnRepository` (`incrementInventory` en `createWithItems`; `decrementInventory` en `markCancelled`).
- `PrismaBranchInventoryRepository` (`adjust` vía `$executeRaw` con `WHERE quantity + delta >= 0`; `create` con `quantity` inicial opcional).

Ninguno de los tres registra un evento de negocio del movimiento — solo el número final en `branch_inventory`. El producto no tiene costo de compra (`Product` no tiene columna `cost`; no existe módulo de compras/proveeduría de precios de costo en este repo). `Return` no tiene folio propio (documentado en CLAUDE.md: "No usa folio del catálogo"). El folio `TS` (scope `INVENTORY`) existe en el catálogo sembrado pero ningún use case lo usa hoy.

Trazabilidad: cada decisión responde a una fila de `## Historia de Usuario` en `proposal.md` (S1–S5).

## Goals / Non-Goals

**Goals**
- S1: ledger append-only `inventory_movements`, alimentado transaccionalmente por cada mutación existente de `branch_inventory` (venta, cancelación, edición, devolución, cancelación de devolución, ajuste manual, alta con existencia inicial).
- S2: endpoint de consulta con encabezado + grilla cronológica.
- S3: export xlsx/pdf.
- S4: reconstrucción determinística de saldos por (producto, sucursal).
- S5: UI `/inventory/kardex` + acción "Ver Kardex" en `/inventory`.

**Non-Goals**
- **Sin costo de compra real**: `unitCost` queda `NULL` en todos los movimientos de este alcance (no hay módulo de compras que registre costo). Diferido a un futuro `add-purchase-costs`.
- **Sin proveedor real en movimientos**: `providerId` queda `NULL` siempre — no existe flujo de "entrada por compra" (`Ent/Compra`) en el sistema hoy; el catálogo `providers` solo se usa para datos fiscales, no para registrar entradas de mercancía. La columna se deja modelada (FK nullable) para cuando exista ese flujo, pero **no se puebla en este cambio**.
- **Sin backfill retroactivo**: no se reconstruyen movimientos anteriores al deploy de este cambio. El ledger arranca vacío.
- **Sin pestaña "Estadísticas" real**: el ticket no define columnas/métricas para ella; queda como tab placeholder ("Próximamente").
- **Sin estado "Refacturado"/"Cancelada" en el movimiento**: el ledger es append-only (ver Decisión de `status`); cancelar no reescribe un movimiento previo, inserta uno compensatorio.
- **Sin CSV**, solo `json|pdf|xlsx`.
- **Sin recomputar `branch_inventory.quantity` fuera de Reconstruir**: el endpoint de consulta (S2) es puramente de lectura.

## Decisions

### Ubicación: extensión del módulo `inventory` existente
El kardex es lectura sobre inventario; no amerita módulo nuevo. Se agrega a `src/modules/inventory/`:
- `domain/entities/InventoryMovement.ts`
- `domain/services/KardexAssembler.ts` (puro)
- `application/ports/InventoryMovementRepository.ts`
- `application/use-cases/{GetKardexReportUseCase,RebuildInventoryArticleUseCase}.ts`
- `application/dto/{KardexReportRequest,KardexReportResponseDto,RebuildInventoryArticleResponseDto}.ts`
- `infrastructure/repositories/{Prisma,InMemory}InventoryMovementRepository.ts`
- `infrastructure/pdf/KardexReportPdf.tsx`
- `infrastructure/xlsx/buildKardexWorkbook.ts`
- `infrastructure/http/InventoryMovementsController.ts` (nuevo, separado de `BranchInventoryController`)
- `infrastructure/di/container.ts` (editar: exporta también `inventoryMovementsController`)

El **escritor** del ledger no vive en `inventory`: es un helper compartido sin estado de módulo, igual que `allocateFolio`.

### Escritura: helper compartido `recordInventoryMovement`, no un puerto de dominio
Los tres puntos de escritura (`PrismaSaleRepository`, `PrismaReturnRepository`, `PrismaBranchInventoryRepository`) ya abren su propio `$transaction`. Si el registro del movimiento viviera detrás de un puerto de `inventory` que los use cases de `pos`/`returns` tuvieran que inyectar, se necesitaría pasar el `tx` de Prisma entre módulos — rompe la abstracción hexagonal (los ports no deben tipar `Prisma.TransactionClient`).

En vez de eso: `src/shared/infrastructure/inventory/recordInventoryMovement.ts`, función pura de infraestructura (mismo patrón que `src/shared/infrastructure/folios/allocateFolio.ts`, ya reutilizado por `PrismaSaleRepository`/`PrismaQuoteRepository`/`PrismaPaymentRepository`):

```ts
async function recordInventoryMovement(
  tx: Prisma.TransactionClient,
  data: {
    branchId: string; productId: string; movementAt: Date;
    movementType: MovementType; direction: "IN" | "OUT"; quantity: number; unit: string;
    unitCost?: number | null; unitPrice?: number | null;
    customerId?: string | null; providerId?: string | null;
    folioId?: string | null; folioCode?: string | null; folioNumber?: number | null;
    originFolioCode?: string | null; originFolioNumber?: number | null;
    sourceType: "sale" | "return" | "adjustment"; sourceId: string;
    notes?: string | null; createdBy?: string | null;
  }
): Promise<{ balanceAfter: number }>
```

Internamente hace `UPDATE branch_inventory SET quantity = quantity ± delta ... RETURNING quantity` (o crea la fila si no existe, igual que hoy) y luego `INSERT INTO inventory_movements (..., balance_after) VALUES (..., <quantity devuelta>)`. Reemplaza a `decrementInventoryAllowNegative`/`incrementInventory`/`decrementInventory`/el `$executeRaw` de `adjust` — la mutación de `branch_inventory` y el insert del movimiento quedan en la **misma sentencia lógica** (usa `RETURNING` para no hacer 2 roundtrips).

Cada repo Prisma llama a este helper dentro de su transacción existente en vez de sus loops manuales actuales. No cambia la firma pública de `SaleRepository`/`ReturnRepository`/`BranchInventoryRepository` — los use cases de `pos`/`returns`/`inventory` no se enteran del ledger.

### Modelo `InventoryMovement` (Prisma)

```prisma
model InventoryMovement {
  id              String    @id @default(uuid())
  branchId        String    @map("branch_id")
  productId       String    @map("product_id")
  movementAt      DateTime  @map("movement_at")
  sequence        BigInt    @default(autoincrement())
  movementType    String    @db.VarChar(30) @map("movement_type")
  direction       String    @db.VarChar(4)
  quantity        Decimal   @db.Decimal(14, 4)
  unit            String    @db.VarChar(10)
  balanceAfter    Decimal   @map("balance_after") @db.Decimal(14, 4)
  unitCost        Decimal?  @map("unit_cost") @db.Decimal(12, 4)
  unitPrice       Decimal?  @map("unit_price") @db.Decimal(12, 4)
  customerId      String?   @map("customer_id")
  providerId      String?   @map("provider_id")
  folioId         String?   @map("folio_id")
  folioCode       String?   @map("folio_code") @db.VarChar(40)
  folioNumber     Int?      @map("folio_number")
  originFolioCode   String? @map("origin_folio_code") @db.VarChar(40)
  originFolioNumber Int?    @map("origin_folio_number")
  sourceType      String    @db.VarChar(20) @map("source_type")
  sourceId        String    @map("source_id")
  status          String    @default("Aplicada") @db.VarChar(20)
  notes           String?   @db.Text
  createdBy       String?   @db.Uuid @map("created_by")
  createdAt       DateTime  @default(now()) @map("created_at")

  branch   Branch    @relation(fields: [branchId], references: [id], onDelete: Restrict)
  product  Product   @relation(fields: [productId], references: [id], onDelete: Restrict)
  customer Customer? @relation(fields: [customerId], references: [id], onDelete: SetNull)
  provider Provider? @relation(fields: [providerId], references: [id], onDelete: SetNull)
  folio    Folio?    @relation(fields: [folioId], references: [id], onDelete: SetNull)

  @@index([branchId, productId, movementAt, sequence])
  @@index([sourceType, sourceId])
  @@map("inventory_movements")
}
```

`quantity` siempre positiva (magnitud); `direction` decide si es Entrada o Salida. El DTO de respuesta deriva `entrada = direction==='IN' ? quantity : 0` y `salida = direction==='OUT' ? quantity : 0` (no se duplica el dato en 2 columnas persistidas). `sequence` es el desempate cronológico cuando dos movimientos comparten `movementAt` (p. ej. las dos líneas de una misma venta) — `ORDER BY movement_at ASC, sequence ASC`.

`movementType` (8 valores): `sale`, `sale_cancel`, `sale_edit_restore`, `sale_edit_apply`, `return`, `return_cancel`, `adjustment_in`, `adjustment_out`. Etiqueta en español para UI/PDF/xlsx (mapeo estático, no persistido): `Sal/Venta`, `Ent/Cancelación Venta`, `Ent/Edición (restituido)`, `Sal/Edición (aplicado)`, `Ent/Devolución`, `Sal/Cancelación Devolución`, `Ent/Ajuste`, `Sal/Ajuste` (Ent/Ajuste con nota "Saldo inicial" cuando `sourceType='adjustment'` y `notes` lo indica).

### `status`: siempre `"Aplicada"` — ledger append-only
El ticket original pedía `Aplicada|Refacturado|Cancelada`, pero este repo no tiene facturación electrónica ligada a inventario y **cancelar nunca reescribe un movimiento pasado** (mismo principio que `sales`/`returns`: cancelar es un evento nuevo, no un borrado). Cancelar una venta no cambia el `status` del movimiento `sale` original a `Cancelada`; inserta un `sale_cancel` compensatorio. `Refacturado` queda fuera de alcance (no hay CFDI en este módulo). Documentado como Non-Goal.

### Folio por tipo de movimiento
- `sale`, `sale_cancel`, `sale_edit_restore`, `sale_edit_apply`: `folioId/folioCode/folioNumber` = el folio **de la venta** (mismo para las 4 variantes — identifica el ticket, no la operación).
- `return`, `return_cancel`: `Return` no tiene folio propio → se usa el folio de la **venta** referenciada (`return.saleId → sale.folioId/folioCode/folioNumber`); es el documento que se está ajustando. `originFolioCode/originFolioNumber` = mismo valor (documenta que el movimiento "corrige" ese folio, no lo origina).
- `adjustment_in`/`adjustment_out`: el backend resuelve automáticamente el folio activo `code='TS'` `scope='INVENTORY'` (vía `allocateFolio`, ya compartido) — el usuario no lo elige. **Si no existe o está inactivo, el ajuste sigue ejecutándose con `folioCode=null`** (no se bloquea una operación crítica de inventario por un folio faltante); se documenta como advertencia, no error.
- Alta con existencia inicial (`CreateBranchInventoryItemUseCase`/`create`): mismo tratamiento que `adjustment_in`, con `notes="Saldo inicial"`.

### `KardexAssembler` (servicio de dominio puro)
Entrada: producto, filtros (branchId?, from, to), lista cruda de movimientos en rango + `balanceAfter` del último movimiento anterior a `from` (o `0` si no hay) + existencias actuales por sucursal (para `existenciaTotal`/`existenciaAlmacen`). Salida: `KardexReportResponseDto` con `header{ existenciaTotal, existenciaAlmacen, saldoAnterior, saldoFinal }` + `movements[]` ordenados. Si `branchId` es "todos", agrega `saldoAnterior`/`saldoFinal` sumando el último saldo previo/en-rango de cada sucursal en scope. Sin I/O → testeable con vectores, banker's rounding (`decimal.js`, 4 decimales) igual que los `*TotalsCalculator`.

### `RebuildInventoryArticleUseCase`
Recibe `(productId, branchId)`. El repo relee **todos** los movimientos de ese par ordenados por `(movementAt, sequence)`, recalcula `balanceAfter` acumulado desde `0` con la misma lógica de `direction`/`quantity`, y en una transacción: `UPDATE` en bloque de cada `balanceAfter` recalculado + `UPDATE branch_inventory.quantity` al saldo final. Determinístico — repetirlo sin nuevos movimientos produce el mismo resultado (idempotente). No inserta movimientos nuevos.

### Endpoint y formatos (S2/S3)
- `GET /api/v1/admin/inventory/kardex?productId=<uuid>&branchId=<uuid>?&from=YYYY-MM-DD&to=YYYY-MM-DD&format=json|pdf|xlsx`.
- Ruta top-level (no anidada bajo `/branches/[id]/inventory`, porque `branchId` es opcional — "todos" no encaja en un path param obligatorio, mismo razonamiento que `/sales`, `/returns`, `/reports/sales-cut`).
- `resolveScopedBranchId(req, branchId, authz)`: sin `branches:access_all`, se fuerza a la sucursal del usuario.
- `format=xlsx` → `buildKardexWorkbook` (`xlsx`, `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`). `format=pdf` → `renderToBuffer(<KardexReportPdf/>)`. `movements.length > 10000` → 409 `{"error":"ReportTooLarge","tooLarge":true}` (mismo patrón que `payments/history`).
- `POST /api/v1/admin/inventory/kardex/rebuild` — body `{ productId, branchId }` (branchId obligatorio, el saldo es por sucursal), permiso `inventory:write`, `enforceBranchScope`.

### RBAC
Nuevo permiso `inventory:kardex_read` en `prisma/seed.ts`, otorgado a `admin`/`operator`/`viewer` (igual que `inventory:read`). Reconstruir reutiliza `inventory:write` (ya otorgado a `admin`/`operator`, no a `viewer`) — es una escritura, no una lectura.

### Frontend
```
app/(private)/inventory/kardex/
├── page.tsx                 # Server Component, metadata, gating inventory:kardex_read
├── _blocks/                 # KardexPage (orquesta), KardexFilters (producto/almacén/fechas),
│                             #   KardexHeaderCards, KardexTabs (Kardex|Estadísticas placeholder),
│                             #   KardexTable, InlineFilterInput (sub-filtro client-side),
│                             #   RebuildArticleButton (+ ConfirmDialog), ExportButtons
└── _logic/                  # services/getKardex, downloadKardexXlsx, downloadKardexPdf,
    ├── hooks/useKardex       #   rebuildArticle (fetchImpl?)
    └── types/                #   api.ts + domain.ts
```
- `KardexFilters`: Combobox de producto (reutiliza el patrón de búsqueda de catálogo existente), selector de almacén ("Todos" solo con `can("branches:access_all")`), rango de fechas, botón "Mostrar información" dispara el fetch (no autofetch en cada tecla).
- `KardexHeaderCards`: 4 tarjetas read-only (existencia total, existencia almacén, saldo anterior, saldo final).
- `KardexTabs`: SegmentedButton "Kardex | Estadísticas"; Estadísticas renderiza `EmptyState` "Próximamente".
- `InlineFilterInput`: filtra client-side las filas de `movements` ya cargadas (sin nueva request) — mismo espíritu que el "Aplicar Filtro" del ticket.
- `RebuildArticleButton`: gated `can("inventory:write")`; `ConfirmDialog` antes de ejecutar (acción que reescribe `balanceAfter` histórico); tras éxito refresca la grilla.
- `ExportButtons`: descargan xlsx/pdf vía `authFetch` (Bearer) → blob → download, mismos filtros aplicados.
- `/inventory`: `BranchInventoryTable` gana columna de acción "Ver Kardex" → `router` a `/inventory/kardex?productId=&branchId=` (navegación vía `<Link>`, no `useRouter().push` en un `_blocks` — o se sube el handler a `_logic` si el equipo prefiere consistencia con el resto del CRUD de inventario).

### Archivos afectados

**Backend (nuevos salvo indicado):**
- `prisma/schema.prisma` (editar: modelo `InventoryMovement` + relaciones en `Branch`, `Product`, `Customer`, `Provider`, `Folio`) + migración `add_inventory_movements`.
- `src/shared/infrastructure/inventory/recordInventoryMovement.ts`
- `src/modules/inventory/domain/entities/InventoryMovement.ts`
- `src/modules/inventory/domain/services/KardexAssembler.ts`
- `src/modules/inventory/application/ports/InventoryMovementRepository.ts`
- `src/modules/inventory/application/use-cases/{GetKardexReportUseCase,RebuildInventoryArticleUseCase}.ts`
- `src/modules/inventory/application/dto/{KardexReportRequest,KardexReportResponseDto,RebuildInventoryArticleResponseDto}.ts`
- `src/modules/inventory/infrastructure/repositories/{Prisma,InMemory}InventoryMovementRepository.ts`
- `src/modules/inventory/infrastructure/pdf/KardexReportPdf.tsx`
- `src/modules/inventory/infrastructure/xlsx/buildKardexWorkbook.ts`
- `src/modules/inventory/infrastructure/http/InventoryMovementsController.ts`
- `src/modules/inventory/infrastructure/di/container.ts` (editar)
- `app/api/v1/admin/inventory/kardex/route.ts`, `app/api/v1/admin/inventory/kardex/rebuild/route.ts`
- `src/modules/pos/infrastructure/repositories/PrismaSaleRepository.ts` (editar: 4 puntos de hook)
- `src/modules/returns/infrastructure/repositories/PrismaReturnRepository.ts` (editar: 2 puntos de hook)
- `src/modules/inventory/infrastructure/repositories/PrismaBranchInventoryRepository.ts` (editar: `adjust` + `create`)
- `prisma/seed.ts` (editar: permiso + reparto)

**Frontend (nuevos salvo indicado):**
- `app/(private)/inventory/kardex/**`
- `app/(private)/inventory/_blocks/BranchInventoryTable.tsx` (editar: acción "Ver Kardex")

## Risks / Trade-offs

- **Invasivo en 3 repos Prisma críticos** (`PrismaSaleRepository`, `PrismaReturnRepository`, `PrismaBranchInventoryRepository`): cualquier bug en `recordInventoryMovement` que lance excepción hace rollback de la venta/devolución/ajuste completa. Mitigado con tests exhaustivos por hook y porque el insert es una sentencia simple sin lógica condicional compleja.
- **Sin backfill**: kardex de productos con historia previa al deploy mostrará huecos antes de esa fecha. Aceptado — reconstruir un histórico fiable retroactivamente requeriría inventar movimientos con timestamps aproximados a partir de `sales`/`returns` existentes, lo cual es factible como *seed* separado pero se deja fuera de este cambio (podría ser un `add-inventory-movements-backfill` futuro que recorra `sale_items`/`return_items` existentes y genere los movimientos correspondientes).
- **`unitCost` siempre `null`**: el reporte no puede mostrar costo real hasta que exista módulo de compras. Aceptado y documentado explícitamente en la UI (columna vacía, no oculta — mantiene la forma del ticket).
- **Reconstruir es potencialmente costoso** para productos con miles de movimientos en una sucursal (recorre todo el historial, no solo el rango consultado) — aceptable para un botón administrativo de uso esporádico, no para la carga normal de la página.

## Migration Plan

1. Agregar modelo `InventoryMovement` + migración (`npx prisma migrate dev --name add_inventory_movements`); sin backfill.
2. Implementar `recordInventoryMovement` + engancharlo en los 3 repos Prisma existentes, con tests que verifiquen que cada mutación de stock sigue funcionando igual **y además** inserta el movimiento esperado.
3. Implementar lectura (dominio → puerto → repos → use cases → controller → rutas), con tests `InMemoryInventoryMovementRepository`.
4. Agregar permiso a `prisma/seed.ts` y correr `npm run seed`.
5. Implementar `/inventory/kardex` + acción en `/inventory`.
6. Verificar en dev: crear venta → aparece movimiento `sale`; cancelarla → aparece `sale_cancel` y saldo vuelve a coincidir; ajuste manual → aparece con folio `TS`; Reconstruir sobre un producto con movimientos → saldo final coincide con `branch_inventory.quantity`; export xlsx/pdf con filtros. Sin rollback de datos necesario (nueva tabla aditiva); revertir = quitar rutas/permiso/hooks y dropear la tabla en un `down` de migración si aplica.
