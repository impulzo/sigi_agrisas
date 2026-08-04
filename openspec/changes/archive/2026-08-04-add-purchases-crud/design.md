## Context

Ver `proposal.md` para motivación completa. Puntos de partida técnicos relevantes ya existentes en el repo:

- `Provider` (catálogo) existe pero sin `currentBalance`/`creditLimit`/`creditDays` (a diferencia de `Customer`, que sí los tiene).
- El folio `CP` ("Compras", prefix `CP-`, scope `OPERATIONS`) está sembrado en `prisma/seeds/folios.ts` desde el diseño original del catálogo de folios, pero sin ningún consumidor hasta este change.
- `InventoryMovement.unitCost` y `InventoryMovement.providerId` existen en el schema pero ningún módulo los escribe todavía.
- `src/shared/infrastructure/inventory/recordInventoryMovement.ts` es el único punto de mutación de `branch_inventory`, usado hoy por Sale (OUT) y Return (IN).
- `src/shared/infrastructure/folios/allocateFolio.ts` es el único punto de asignación atómica de números de folio.
- El patrón de cuentas por cobrar ya resuelto en `src/modules/payments/` (customer-side) es el análogo directo del patrón de cuentas por pagar que este change necesita del lado proveedor.

## Goals / Non-Goals

**Goals:**
- Registrar compras a proveedor que incrementen inventario de forma transaccional y trazable (historia #1).
- Permitir cancelar una compra revirtiendo su efecto (historia #2).
- Soportar compras a crédito con seguimiento de cuentas por pagar vía abonos a proveedor (historias #3, #4).
- Exponer listado/detalle para trazabilidad y auditoría (historia #5).
- Reutilizar al máximo los mecanismos ya probados (`allocateFolio`, `recordInventoryMovement`, branch scoping, RBAC) en vez de crear mecanismos paralelos.

**Non-Goals:**
- Edición de compras ya creadas (solo crear/cancelar).
- Flujo de borrador/aprobación (`draft`/`authorized` como Quotes) — la compra se aplica de inmediato al confirmarse.
- Actualizar costo/precio en `Product` — el costo vive solo como snapshot en `PurchaseItem`/`InventoryMovement`.
- Reporte PDF/historial de compras (posible change de seguimiento).
- Cualquier parseo de CFDI/factura del proveedor — el usuario captura los montos manualmente.
- UI — cubierta por el change separado `ui-ux-purchases`.

## Decisions

### Modelo de datos (Prisma)

```
model Purchase {
  id              String    @id @default(uuid())
  providerId      String    @map("provider_id")
  branchId        String    @map("branch_id")
  folioId         String    @map("folio_id")
  folioNumber     Int       @map("folio_number")
  folioCode       String    @db.VarChar(40) @map("folio_code")
  paymentMethodId String    @map("payment_method_id")
  status          String    @db.VarChar(20) @default("completed")
  subtotal        Decimal   @db.Decimal(14,4)
  taxTotal        Decimal   @db.Decimal(14,4) @map("tax_total")
  total           Decimal   @db.Decimal(14,4)
  paidAmount      Decimal   @db.Decimal(14,4) @default(0) @map("paid_amount")
  paymentStatus   String    @db.VarChar(20) @default("paid") @map("payment_status")
  notes           String?   @db.Text
  creatorId       String    @db.Uuid @map("creator_id")
  purchasedAt     DateTime  @default(now()) @map("purchased_at")
  cancelledAt     DateTime? @map("cancelled_at")
  cancelledBy     String?   @db.Uuid @map("cancelled_by")
  cancellationReason String? @db.Text @map("cancellation_reason")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  provider        Provider       @relation(fields: [providerId], references: [id], onDelete: Restrict)
  branch          Branch         @relation(fields: [branchId], references: [id], onDelete: Restrict)
  folio           Folio          @relation(fields: [folioId], references: [id], onDelete: Restrict)
  paymentMethod   PaymentMethod  @relation(fields: [paymentMethodId], references: [id], onDelete: Restrict)
  items           PurchaseItem[]
  providerPayments ProviderPayment[]

  @@unique([folioId, folioNumber])
  @@map("purchases")
}

model PurchaseItem {
  id                    String   @id @default(uuid())
  purchaseId            String   @map("purchase_id")
  productId             String   @map("product_id")
  productCodeSnapshot   String   @db.VarChar(32) @map("product_code_snapshot")
  productNameSnapshot   String   @db.VarChar(200) @map("product_name_snapshot")
  quantity              Decimal  @db.Decimal(14,4)
  unitCost              Decimal  @db.Decimal(12,4) @map("unit_cost")
  discountPct           Decimal? @db.Decimal(5,2) @map("discount_pct")
  ivaRate               Decimal? @db.Decimal(5,4) @map("iva_rate")
  iepsRate              Decimal? @db.Decimal(5,4) @map("ieps_rate")
  lineSubtotal          Decimal  @db.Decimal(14,4) @map("line_subtotal")
  lineTax               Decimal  @db.Decimal(14,4) @map("line_tax")
  lineTotal             Decimal  @db.Decimal(14,4) @map("line_total")

  purchase              Purchase @relation(fields: [purchaseId], references: [id], onDelete: Cascade)
  product               Product  @relation(fields: [productId], references: [id], onDelete: Restrict)

  @@map("purchase_items")
}

model ProviderPayment {
  id            String    @id @default(uuid())
  purchaseId    String    @map("purchase_id")
  providerId    String    @map("provider_id")
  branchId      String    @map("branch_id")
  folioId       String    @map("folio_id")
  folioNumber   Int       @map("folio_number")
  folioCode     String    @db.VarChar(40) @map("folio_code")
  amount        Decimal   @db.Decimal(14,4)
  status        String    @db.VarChar(20) @default("completed")
  notes         String?   @db.Text
  creatorId     String    @db.Uuid @map("creator_id")
  paidAt        DateTime  @default(now()) @map("paid_at")
  cancelledAt   DateTime? @map("cancelled_at")
  cancelledBy   String?   @db.Uuid @map("cancelled_by")
  cancellationReason String? @db.Text @map("cancellation_reason")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  purchase      Purchase  @relation(fields: [purchaseId], references: [id], onDelete: Restrict)
  provider      Provider  @relation(fields: [providerId], references: [id], onDelete: Restrict)
  branch        Branch    @relation(fields: [branchId], references: [id], onDelete: Restrict)
  folio         Folio     @relation(fields: [folioId], references: [id], onDelete: Restrict)

  @@unique([folioId, folioNumber])
  @@map("provider_payments")
}
```

Columnas nuevas en `Provider`: `currentBalance Decimal @db.Decimal(14,4) @default(0) @map("current_balance")`, `creditLimit Decimal? @db.Decimal(14,4) @map("credit_limit")`, `creditDays Int @default(30) @map("credit_days")` — exactamente simétrico a `Customer`.

**Por qué `PurchaseItem` no referencia `ProductPrice`**: `ProductPrice` es una lista de precios de venta (multi-precio por producto); una compra negocia un costo con el proveedor, no un precio de catálogo — de ahí `unitCost` en vez de `unitPrice`/`priceNameSnapshot`. Alternativa descartada: reusar `ProductPrice` con un flag — mezclaría dos conceptos de negocio distintos (precio de venta vs costo de compra).

**Por qué `ivaRate`/`iepsRate` sí se incluyen en `PurchaseItem`** (a diferencia de solo snapshotear costo): para que el total de la compra sea contablemente correcto (el proveedor cobra IVA/IEPS igual que la empresa lo cobra en ventas) y para reusar la misma fórmula de `*TotalsCalculator` sin casos especiales. Se toman de `Product.ivaRate`/`iepsRate` al momento de la compra (snapshot, no referencia viva).

**Por qué `ProviderPayment` vive en el mismo módulo `purchases`** (decisión ya confirmada con el usuario): el acoplamiento con `Purchase` es total (un abono no existe sin una compra a crédito), a diferencia de `CustomerPayment`, que sí amerita módulo propio (`payments`) porque un cliente puede tener abonos sin que el módulo `pos`/`sales` necesite conocer el detalle. Aquí, separar en un módulo aparte solo añadiría una dependencia cruzada extra sin beneficio.

### Resolución de folios

`CP` y `PP` se resuelven por `code`+`scope` dentro de la transacción (patrón de `PrismaBranchInventoryRepository.adjust()` resolviendo `TS`), **no** por un `folioId` enviado por el cliente — a diferencia de Sale/Payment, donde el cliente elige entre varios folios activos del mismo scope (ej. `TK` vs `TC`). Aquí no hay ambigüedad: toda compra usa `CP`, todo abono a proveedor usa `PP`. Alternativa descartada: exponer el folio como parámetro — añadiría una superficie de error (folio equivocado) sin beneficio, ya que no existe otro folio válido para este flujo.

### Extensión de `recordInventoryMovement`

Se agregan `"purchase"` y `"purchase_cancel"` a `movementType`, y `"purchase"` a `sourceType`. La compra pasa `direction: "IN"` (incrementa) y la cancelación `direction: "OUT"` (decrementa) — reutilizando el mismo helper que Sale/Return usan, sin lógica de mutación de inventario nueva. Se pasa `unitCost` (primer escritor real de esa columna) y `providerId` (idem) por línea.

### Cuentas por pagar — transacción atómica

`PrismaPurchaseRepository.createCompleted` y `PrismaProviderPaymentRepository.createCompleted`/`markCancelled` replican, línea por línea, el patrón ya probado en `PrismaPaymentRepository` (`src/modules/payments/infrastructure/repositories/PrismaPaymentRepository.ts:97-317`): updates atómicos raw SQL con guard de filas afectadas para evitar sobre-pago y doble cancelación, dentro de la misma transacción que el resto de la operación (folio + inventario + balance + insert). No se reutiliza `SalePaymentApplier` como referencia de diseño porque, según lo detectado en la investigación previa, ese servicio de dominio está hoy desacoplado de `PrismaPaymentRepository` (el repo duplica la lógica inline) — para Compras se centraliza el cálculo de `paidAmount`/`paymentStatus` en un único servicio de dominio puro (`PurchasePaymentApplier`, análogo pero sí invocado por el repo) para no repetir esa inconsistencia.

### RBAC

Permisos nuevos en `prisma/seed.ts`: `purchases:read`, `purchases:create`, `purchases:cancel`, `purchases:pay`, `purchases:pay_cancel`. Asignación: `admin` y `operator` con los 5; `viewer` solo `purchases:read` — igual patrón que `returns`/`payments`.

### Branch scoping

Cada endpoint aplica `enforceBranchScope`/`resolveScopedBranchId` exactamente como `PaymentsController`: `create` valida `branchId` del body contra `x-user-branch-id` (bypass `branches:access_all`); `cancel`/`pay`/`pay_cancel`/`getById` cargan el recurso primero y validan su `branchId`; `list` resuelve el branch por defecto cuando no se especifica.

### Endpoints

```
POST   /api/v1/admin/purchases                              purchases:create
GET    /api/v1/admin/purchases                               purchases:read
GET    /api/v1/admin/purchases/:id                           purchases:read
POST   /api/v1/admin/purchases/:id/cancel                    purchases:cancel
POST   /api/v1/admin/purchases/:id/provider-payments         purchases:pay
GET    /api/v1/admin/purchases/:id/provider-payments         purchases:read
POST   /api/v1/admin/provider-payments/:id/cancel            purchases:pay_cancel
```

`provider-payments` anidado bajo `purchases/:id` para crear/listar (un abono siempre nace de una compra concreta) pero `cancel` es top-level (`/provider-payments/:id/cancel`) porque cancelar solo necesita el id del abono, siguiendo la misma asimetría que `Payments` (`/payments/:id/cancel` es top-level aunque el registro se haga contra una venta).

## Risks / Trade-offs

- [`PurchasePaymentApplier` centraliza la lógica que en `payments` quedó duplicada entre dominio e infraestructura] → Mitigación: es una decisión de diseño para Compras únicamente; no se toca `SalePaymentApplier` ni `PrismaPaymentRepository` existentes (fuera de alcance de este change).
- [Agregar `ivaRate`/`iepsRate` a `PurchaseItem` asume que el proveedor siempre factura con esas tasas snapshot del producto comprador, lo cual puede no coincidir con lo que el proveedor realmente cobra] → Mitigación: son campos editables por línea al capturar la compra (no forzados a heredar del catálogo), el snapshot del producto es solo el valor por defecto sugerido.
- [Nueva migración agrega columnas a `Provider` sin default de negocio claro para `creditDays`] → Mitigación: se usa el mismo default que `Customer.creditDays` (`30`), documentado en CLAUDE.md como convención ya establecida.
