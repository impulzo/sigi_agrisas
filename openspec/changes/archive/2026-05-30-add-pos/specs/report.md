# Reporte de Pruebas — add-pos

**Fecha de ejecución:** 2026-05-30  
**Rama:** `feature/roles-permissions-back`  
**Supabase proyecto:** `qzzjpyepggwautckqeex`

---

## Índice

1. [TypeScript — `tsc --noEmit`](#1-typescript--tsc---noemit)
2. [Tests unitarios — Jest](#2-tests-unitarios--jest)
3. [Migración de base de datos](#3-migración-de-base-de-datos)
4. [Verificación del esquema en BD](#4-verificación-del-esquema-en-bd)
5. [Seed RBAC](#5-seed-rbac)
6. [Smoke tests contra Supabase](#6-smoke-tests-contra-supabase)
7. [Pendientes](#7-pendientes)

---

## 1. TypeScript — `tsc --noEmit`

**Comando:**
```bash
npx tsc --noEmit
```

**Resultado:** ✅ 0 errores en código nuevo.

> Nota: existe 1 error preexistente en `tests/unit/modules/rbac/infrastructure/services/PrismaAuthorizationService.cache.test.ts` relacionado con tipado del mock de Prisma. No es parte de este change y no bloquea.

---

## 2. Tests unitarios — Jest

**Comando:**
```bash
npx jest
```

**Resultado:** ✅ **1034/1034 tests pasan**

### Suites nuevas añadidas en este change

| Archivo de test | Tests | Resultado |
|---|---|---|
| `tests/unit/modules/pos/domain/services/SaleTotalsCalculator.test.ts` | 8 | ✅ PASS |
| `tests/unit/modules/pos/application/use-cases/CreateSaleUseCase.test.ts` | 6 | ✅ PASS |
| `tests/unit/modules/pos/application/use-cases/CancelSaleUseCase.test.ts` | 4 | ✅ PASS |
| `tests/unit/modules/pos/application/use-cases/EditCompletedSaleUseCase.test.ts` | 5 | ✅ PASS |
| `tests/unit/modules/customers/application/use-cases/CustomerCrudUseCases.test.ts` | 8 | ✅ PASS |
| `tests/unit/modules/rbac/infrastructure/http/enforceBranchScope.test.ts` | 11 | ✅ PASS |
| `tests/unit/modules/auth/infrastructure/services/JwtTokenService.test.ts` | +5 casos branchId | ✅ PASS |
| `tests/unit/modules/pos/infrastructure/http/SalesController.test.ts` | 9 | ✅ PASS |
| `tests/unit/modules/branches/infrastructure/http/BranchesController.test.ts` | +2 casos isHeadquarters | ✅ PASS |

### Casos cubiertos por suite

#### `SaleTotalsCalculator.test.ts`
- Línea simple `qty=2, price=100, IVA=16%` → `lineSubtotal=200, lineTax=32.0000, lineTotal=232.0000`
- Con descuento 10% → `lineSubtotal=180.0000`
- Con IVA + IEPS → `lineTax = IVA + IEPS`
- Sin tasas (null) → `lineTax=0`
- Redondeo banker's en valor `0.12345` → redondea a `0.1234` (half-to-even)
- Multi-línea: suma de subtotales, taxTotal, total
- Entradas inválidas lanzan error: `quantity <= 0`, `unitPrice < 0`, `discountPct > 100`, `ivaRate > 1`

#### `CreateSaleUseCase.test.ts`
- Crea venta con IVA/IEPS/descuento → totales correctos; inventario decrementado
- `EmptySaleError` cuando `items` está vacío
- `ProductPriceMismatchError` cuando `productPriceId` no corresponde al `productId`
- Customer inactivo → error
- Producto inactivo → error
- Inventory nuevo se crea con `quantity = -qty` cuando no existía (permite stock negativo)

#### `CancelSaleUseCase.test.ts`
- Cancela venta `completed` → `status='cancelled'`, stock restaurado
- Cancela venta ya cancelada → idempotente, no lanza error, stock NO se toca de nuevo
- `SaleNotFoundError` cuando el id no existe
- `cancellationReason` queda registrado

#### `EditCompletedSaleUseCase.test.ts`
- Edita venta `completed` → recalcula totales, restaura stock viejo, aplica stock nuevo, `status='edited'`
- Edita venta `edited` (re-edición) → mismo flujo, sigue funcionando
- `CancelledSaleNotEditableError` cuando `status='cancelled'`
- `EmptySaleError` cuando `items` vacío en edición
- `folioId/folioNumber/folioCode/branchId` inmutables tras edición

#### `CustomerCrudUseCases.test.ts`
- Paginación correcta (`page`, `pageSize`)
- Búsqueda insensible a mayúsculas
- `GetCustomer` found / not found
- `CreateCustomer` con code/rfc duplicado → error correcto
- `UpdateCustomer` ignora `code` y `currentBalance` del body
- `SoftDeleteCustomer` → `isActive=false`

#### `enforceBranchScope.test.ts`
- `enforceBranchScope`: sin `x-user-id` → 401
- Con `branches:access_all` → null (bypass)
- `x-user-branch-id === resourceBranchId` → null (mismo branch)
- Branch diferente sin bypass → 403 con `{ required: "branches:access_all" }`
- `x-user-branch-id` vacío sin bypass → 403
- `resolveScopedBranchId`: bypass + branchId solicitado → devuelve el solicitado
- bypass + sin branchId → `{ branchId: undefined }` (listar todos)
- sin bypass + sin branchId solicitado → scope implícito del usuario
- sin bypass + branchId distinto → 403
- sin branch asignada ni bypass → 403
- sin `x-user-id` → 401

#### `JwtTokenService.test.ts` (casos nuevos)
- Access token incluye `branchId` cuando se provee
- Access token omitido `branchId` → `payload.branchId === null`
- Access token `branchId: null` explícito → preservado como `null`
- Refresh token incluye y devuelve `branchId`
- Refresh token legacy sin `branchId` → `null` (compatibilidad)

#### `SalesController.test.ts`
- Body inválido (UUID malformado) → 400
- `quantity <= 0` → 400
- Scoping: `x-user-branch-id !== branchId` sin bypass → 403
- Guard HQ edit: usuario en sucursal no-matriz → 403
- Guard HQ edit: admin (bypass `branches:access_all`) → pasa
- Sin permiso `sales:create` → 403
- Sin permiso `sales:read` → 403
- Sin permiso `sales:cancel` → 403

#### `BranchesController.test.ts` (casos nuevos)
- PATCH con `isHeadquarters=true` en segunda sucursal → 409 `AnotherBranchIsHeadquartersError`
- PATCH con `isHeadquarters=false` en sucursal HQ → 200, `isHeadquarters` desmarcado

---

## 3. Migración de base de datos

**Migración:** `20260530000001_add_pos_tables_and_branch_scoping`

### Pasos ejecutados

**Paso 1 — Primer intento (fallido)**  
```bash
npx prisma migrate deploy
```
Error: `P3018 / 42804` — FK `sales.cashier_id TEXT` no puede referenciar `users.id UUID` (mismatch de tipos en Postgres).

**Paso 2 — Rollback**  
```bash
npx prisma migrate resolve --rolled-back 20260530000001_add_pos_tables_and_branch_scoping
```
Resultado: migración marcada como `rolled_back` en `_prisma_migrations`.

**Paso 3 — Corrección del SQL**  
Cambiar `"cashier_id" TEXT NOT NULL` → `"cashier_id" UUID NOT NULL` en el archivo `.sql` de la migración. Añadir `@db.Uuid` al campo `cashierId` en `prisma/schema.prisma`.

**Paso 4 — Re-deploy**  
```bash
npx prisma migrate deploy
```
Resultado: ✅ Migración aplicada exitosamente.

**Paso 5 — Regenerar tipos Prisma**  
```bash
npx prisma generate
```
Resultado: ✅ Tipos `Customer`, `Sale`, `SaleItem` y campos `User.branchId`, `Branch.isHeadquarters` presentes en `@prisma/client`.

---

## 4. Verificación del esquema en BD

Verificado vía `information_schema`, `pg_constraint` y `pg_indexes` directamente en Supabase.

### 4.1 Tabla `branch_inventory` — CHECK eliminado

**Query ejecutada:**
```sql
SELECT conname FROM pg_constraint
WHERE conrelid = 'branch_inventory'::regclass
  AND contype = 'c';
```

**Resultado esperado:** `branch_inventory_quantity_nonneg_chk` **NO aparece**.  
**Resultado obtenido:** ✅ Solo quedan `reserved_quantity_nonneg_chk` y `reorder_point_nonneg_chk`.

### 4.2 Índice parcial `branches_hq_idx`

**Query ejecutada:**
```sql
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'branches' AND indexname = 'branches_hq_idx';
```

**Resultado:** ✅ `CREATE UNIQUE INDEX branches_hq_idx ON public.branches USING btree (is_headquarters) WHERE (is_headquarters = true)`

### 4.3 Tablas nuevas creadas

| Tabla | FK `ON DELETE` | Unique constraints |
|---|---|---|
| `customers` | — | `code`, `rfc` |
| `sales` | Folio/Branch/Customer/User/PaymentMethod → RESTRICT | `(folio_id, folio_number)` |
| `sale_items` | sale → CASCADE, product → RESTRICT, product_price → SET NULL | — |

**Resultado:** ✅ Confirmado en `information_schema.tables` y `information_schema.referential_constraints`.

### 4.4 Columna `users.branch_id`

**Query ejecutada:**
```sql
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'branch_id';
```

**Resultado:** ✅ `branch_id | YES | text` — nullable, tipo TEXT, FK `ON DELETE SET NULL`.

### 4.5 CHECK constraints en tablas nuevas

Verificado que existen los siguientes CHECKs:

| Tabla | Constraint | Condición |
|---|---|---|
| `customers` | `customers_credit_limit_chk` | `credit_limit IS NULL OR credit_limit >= 0` |
| `customers` | `customers_current_balance_chk` | `current_balance >= 0` |
| `sales` | `sales_status_chk` | `status IN ('completed','cancelled','edited')` |
| `sales` | `sales_subtotal_chk` | `subtotal >= 0` |
| `sales` | `sales_tax_total_chk` | `tax_total >= 0` |
| `sales` | `sales_total_chk` | `total >= 0` |
| `sales` | `sales_folio_number_chk` | `folio_number >= 1` |
| `sale_items` | `sale_items_quantity_chk` | `quantity > 0` |
| `sale_items` | `sale_items_unit_price_chk` | `unit_price >= 0` |
| `sale_items` | `sale_items_discount_pct_chk` | `discount_pct IS NULL OR (discount_pct >= 0 AND discount_pct <= 100)` |
| `sale_items` | `sale_items_iva_rate_chk` | `iva_rate IS NULL OR (iva_rate >= 0 AND iva_rate <= 1)` |
| `sale_items` | `sale_items_ieps_rate_chk` | `ieps_rate IS NULL OR (ieps_rate >= 0 AND ieps_rate <= 1)` |
| `sale_items` | `sale_items_line_subtotal_chk` | `line_subtotal >= 0` |
| `sale_items` | `sale_items_line_tax_chk` | `line_tax >= 0` |
| `sale_items` | `sale_items_line_total_chk` | `line_total >= 0` |

**Resultado:** ✅ Todos presentes.

---

## 5. Seed RBAC

**Comando:**
```bash
npm run seed
```

Ejecutado **2 veces** (idempotente).

### Permisos nuevos añadidos

| Permiso | Descripción | Admin | Operator | Viewer |
|---|---|:---:|:---:|:---:|
| `customers:read` | Ver clientes | ✅ | ✅ | ✅ |
| `customers:write` | Crear/editar/eliminar clientes | ✅ | ✅ | ❌ |
| `sales:read` | Ver ventas | ✅ | ✅ | ✅ |
| `sales:create` | Registrar una venta | ✅ | ✅ | ❌ |
| `sales:cancel` | Cancelar una venta | ✅ | ✅ | ❌ |
| `sales:edit_completed` | Editar ticket completado | ✅ | ❌ | ❌ |
| `branches:access_all` | Bypass de branch scoping | ✅ | ❌ | ❌ |

**Total permisos en BD:** 25  
**Resultado:** ✅ Segunda ejecución idempotente, sin errores duplicados.

**Verificación en BD:**
```sql
SELECT p.key FROM permissions p
JOIN role_permissions rp ON p.id = rp.permission_id
JOIN roles r ON rp.role_id = r.id
WHERE r.name = 'admin'
ORDER BY p.key;
-- 25 filas
```

```sql
SELECT p.key FROM permissions p
JOIN role_permissions rp ON p.id = rp.permission_id
JOIN roles r ON rp.role_id = r.id
WHERE r.name = 'operator' AND p.key = 'branches:access_all';
-- 0 filas (correcto)
```

---

## 6. Smoke tests contra Supabase

Los smoke tests se ejecutaron mediante scripts Node.js inline usando JWTs firmados con el `JWT_ACCESS_SECRET` real del entorno (leído de `.env.local`). Los tokens contenían los claims necesarios (`sub`, `email`, `roles`, `branchId`).

El servidor de desarrollo (`npm run dev`) estuvo corriendo durante estos tests.

### 6.1 RBAC — viewer sin bypass

| Escenario | Request | Esperado | Obtenido |
|---|---|---|---|
| GET /sales sin branchId | `GET /api/v1/admin/sales` con JWT viewer | 403 `branches:access_all` | ✅ 403 |
| POST /sales | `POST /api/v1/admin/sales` con JWT viewer | 403 `sales:create` | ✅ 403 |

### 6.2 RBAC — operator con branch asignada

| Escenario | Request | Esperado | Obtenido |
|---|---|---|---|
| GET /sales scoped a su branch | `?branchId=<su-branch>` con JWT operator | 200 | ✅ 200 |
| GET /sales scoped a otra branch | `?branchId=<otra-branch>` | 403 | ✅ 403 |
| PATCH /sales/:id (edición) | JWT operator | 403 `sales:edit_completed` | ✅ 403 |

### 6.3 RBAC — admin con bypass total

| Escenario | Request | Esperado | Obtenido |
|---|---|---|---|
| GET /customers | JWT admin | 200 `{ data: [], total: 0 }` | ✅ 200 |
| POST /customers | body válido | 201 con `currentBalance: 0` | ✅ 201 |
| GET /sales | JWT admin (sin branchId) | 200 lista vacía | ✅ 200 |

### 6.4 Branches — `isHeadquarters`

| Escenario | Request | Esperado | Obtenido |
|---|---|---|---|
| PATCH branch A → `isHeadquarters=true` | admin JWT | 200 `isHeadquarters: true` | ✅ 200 |
| PATCH branch A → `isHeadquarters=false` | admin JWT | 200 `isHeadquarters: false` | ✅ 200 |
| PATCH branch B → `isHeadquarters=true` mientras A es HQ | admin JWT | 409 | ✅ 409 |

### 6.5 Cleanup

Los recursos creados durante el smoke test (usuarios test, customers) fueron eliminados de Supabase al finalizar las pruebas.

---

## 7. Pendientes

Las siguientes pruebas **no se han ejecutado** y quedan documentadas para completar cuando el entorno lo permita.

### 7.1 Tests de integración (Sección 19)

Requieren `.env` con `DIRECT_URL` y conexión directa a Supabase. Se deben crear como archivos Jest separados usando `prisma.$connect()` y limpieza post-test con `afterEach` / `afterAll`.

| Task | Archivo | Qué probar |
|---|---|---|
| 19.1 | `customers-crud.test.ts` | CRUD completo en BD real, code/rfc duplicado → P2002, soft delete |
| 19.2 | `sales-create-and-cancel.test.ts` | POST /sales → stock decrementado; POST /cancel → stock restaurado |
| 19.3 | `sales-edit-from-hq.test.ts` | PATCH /sales/:id desde HQ → stock delta correcto |
| 19.4 | `sales-negative-stock.test.ts` | Venta con stock=0 → `branch_inventory.quantity = -qty` sin error |
| 19.5 | `sales-branch-scoping.test.ts` | Operator branch A no puede ver ventas de branch B |
| 19.6 | `sales-edit-only-hq.test.ts` | Operator en sucursal no-HQ → 403 al intentar editar |
| 19.7 | `inventory-allows-negative.test.ts` | Insertar `quantity=-5` vía Prisma sin error (confirma CHECK eliminado) |
| 19.8 | `inventory-branch-scoping.test.ts` | Operator ve solo su branch; admin ve todas |

### 7.2 Smoke test completo del flujo POS

Requiere que existan en BD: al menos un Producto con Precio, un Folio activo, un PaymentMethod activo y un Customer activo.

**Pasos a realizar:**
```
1. POST /api/v1/admin/sales
   body: { branchId, customerId, folioId, paymentMethodId, items: [{ productId, productPriceId, quantity }] }
   → esperado: 201, sale con status='completed', folio_number incrementado

2. Verificar en BD: branch_inventory.quantity decrementado en qty

3. POST /api/v1/admin/sales/:id/cancel
   body: { reason: "test cancel" }
   → esperado: 200, status='cancelled'

4. Verificar en BD: branch_inventory.quantity restaurado

5. POST /api/v1/admin/sales (nueva venta con stock=0)
   → esperado: 201, branch_inventory.quantity = -qty

6. PATCH /api/v1/admin/sales/:id (desde admin / HQ)
   body: nuevos items con precios distintos
   → esperado: 200, status='edited', totales recalculados, stock delta correcto
```

### 7.3 Test unitario pendiente

| Task | Descripción |
|---|---|
| 17.2 | `ListSalesUseCase.test.ts` — filtros por branchId, status, rango de fechas |
| 17.3 | `GetSaleUseCase.test.ts` — found con items, not found |
| 18.1 | `CustomersController.test.ts` — validaciones Zod, uppercase code, rfc inválido |

---

## Resumen ejecutivo

| Categoría | Estado | Detalle |
|---|---|---|
| TypeScript | ✅ | 0 errores nuevos |
| Tests unitarios | ✅ | 1034/1034 passing |
| Migración BD | ✅ | Aplicada (corregido `cashier_id UUID`) |
| Schema BD | ✅ | CHECK eliminado, índice HQ, tablas OK |
| Seed RBAC | ✅ | 25 permisos, idempotente |
| Smoke RBAC | ✅ | viewer/operator/admin verificados |
| Smoke branches HQ | ✅ | set/unset/conflicto 409 |
| Integración BD real | ⏳ | 8 tests pendientes |
| Flujo POS completo | ⏳ | Requiere datos de prueba en BD |
