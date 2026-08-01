## Context

### Datos existentes

| Tabla | Columnas relevantes |
|---|---|
| `sale_items` | `id`, `sale_id`, `product_id`, `product_code_snapshot`, `product_name_snapshot`, `quantity`, `unit_price`, `line_total` |
| `sales` | `id`, `branch_id`, `folio_code`, `status` (`completed`\|`cancelled`\|`edited`), `created_at` |
| `return_items` | `id`, `return_id`, `sale_item_id`, `product_id`, `product_code_snapshot`, `product_name_snapshot`, `quantity`, `unit_price`, `line_total` |
| `returns` | `id`, `branch_id`, `status` (`completed`\|`cancelled`), `created_at` |
| `branches` | `id`, `name` |
| `products` | `id`, `code`, `name` |

El campo `product_id` en `sale_items` y `return_items` es la FK que une ambas tablas al producto.

### Arquitectura hexagonal del módulo `products`

```
src/modules/products/
├── domain/
│   └── entities/Product.ts
├── application/
│   ├── ports/
│   │   ├── ProductRepository.ts       (existente)
│   │   └── ProductKardexRepository.ts (nuevo)
│   ├── use-cases/
│   │   └── GetProductKardexUseCase.ts (nuevo)
│   └── dto/
│       └── KardexDto.ts               (nuevo)
└── infrastructure/
    ├── repositories/
    │   ├── PrismaProductRepository.ts (existente)
    │   └── PrismaProductKardexRepository.ts (nuevo)
    └── http/
        └── ProductsController.ts      (extender con método getKardex)
```

Route handler: `app/api/v1/admin/products/[id]/kardex/route.ts` (nuevo, delega al controller).

## Goals / Non-Goals

**Goals:**
- Listar movimientos de un producto (ventas y devoluciones) paginados, ordenados por fecha DESC.
- Filtrar por sucursal, rango de fechas.
- Aplicar branch scoping idéntico al resto del panel.
- Incluir sólo movimientos de ventas `completed` o `edited` y devoluciones `completed` (los cancelados son ruido; se excluyen salvo en `saleStatus`/`returnStatus` que los expone si se desea auditar).

**Non-Goals:**
- Kardex de inventario (entradas/salidas de stock del módulo inventory).
- Agrupación por sucursal en la misma respuesta (el filtro `branchId` cubre el caso; agrupación queda para la UI).
- Exportación PDF/CSV (se puede añadir en un change futuro).
- Sin cambios de schema.

## Decisions

### 1. UNION SQL vía `$queryRaw` en lugar de Prisma ORM

**Decisión**: usar `prisma.$queryRaw` con un `UNION ALL` de `sale_items JOIN sales` y `return_items JOIN returns`.

**Por qué**: Prisma ORM no soporta `UNION` de forma nativa. Las alternativas (`Promise.all` de dos queries + merge en memoria + re-sort + paginar manualmente) no escalan bien para productos con miles de movimientos. Un `$queryRaw` con `UNION ALL ... ORDER BY date DESC LIMIT ? OFFSET ?` garantiza paginación eficiente en SQL.

**Alternativa descartada**: dos queries separadas + merge en JavaScript. Rechazado: no pagina correctamente (puede retornar `pageSize` de un solo tipo y 0 del otro), requiere `COUNT` separado, y el sort JS es O(n) sobre resultados completos.

### 2. Excluir movimientos cancelados por defecto

**Decisión**: la query filtra `sales.status IN ('completed', 'edited')` y `returns.status = 'completed'`. Los cancelados no aparecen en el Kardex por defecto.

**Por qué**: el Kardex refleja movimientos efectivos. Una venta cancelada o una devolución cancelada no cambia el stock neto real.

**Nota de auditoría**: si en el futuro se requiere incluir cancelados, se puede añadir query param `?includeCancelled=true`.

### 3. Puerto `ProductKardexRepository` separado de `ProductRepository`

**Decisión**: nuevo puerto dedicado en lugar de extender el existente.

**Por qué**: la query UNION no comparte código con el CRUD del producto. Mantener puertos enfocados facilita pruebas unitarias con `InMemoryProductKardexRepository`.

## API Contract

### Request

```
GET /api/v1/admin/products/:id/kardex
Authorization: Bearer <token>
```

Query params:

| Param | Tipo | Default | Validación |
|---|---|---|---|
| `page` | integer | 1 | ≥1 |
| `pageSize` | integer | 20 | 1–100 |
| `branchId` | UUID string | (branch scoping) | UUID válido |
| `from` | ISO date string | — | fecha válida |
| `to` | ISO date string | — | fecha válida, ≥ from si ambas presentes |

### Branch Scoping

Idéntico a `GET /api/v1/admin/sales`:
- Sin `branches:access_all`: `branchId` ausente → implícito `x-user-branch-id`; si vacío → 403. `branchId` presente y distinto → 403.
- Con `branches:access_all`: sin `branchId` → todas las sucursales; con `branchId` → filtra.

Helper: `resolveScopedBranchId(req, requestedBranchId?)` de `src/modules/rbac/infrastructure/http/enforceBranchScope.ts`.

### Response 200

```json
{
  "productId": "uuid",
  "productCode": "ARROZ_001",
  "productName": "Arroz 1kg",
  "items": [
    {
      "type": "sale",
      "date": "2026-06-15T10:00:00.000Z",
      "branchId": "uuid",
      "branchName": "Sucursal Centro",
      "folioCode": "TK-0042",
      "saleId": "uuid",
      "saleItemId": "uuid",
      "quantity": "5.0000",
      "unitPrice": "120.0000",
      "lineTotal": "696.0000",
      "saleStatus": "completed"
    },
    {
      "type": "return",
      "date": "2026-06-16T09:00:00.000Z",
      "branchId": "uuid",
      "branchName": "Sucursal Centro",
      "returnId": "uuid",
      "returnItemId": "uuid",
      "saleId": "uuid",
      "quantity": "1.0000",
      "unitPrice": "120.0000",
      "lineTotal": "139.2000",
      "returnStatus": "completed"
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

Campos de un item tipo `sale`: `type`, `date`, `branchId`, `branchName`, `folioCode`, `saleId`, `saleItemId`, `quantity`, `unitPrice`, `lineTotal`, `saleStatus`.

Campos de un item tipo `return`: `type`, `date`, `branchId`, `branchName`, `returnId`, `returnItemId`, `saleId`, `quantity`, `unitPrice`, `lineTotal`, `returnStatus`.

### Errores

| Código | Condición |
|---|---|
| 400 | `id` no es UUID válido |
| 400 | `pageSize > 100`, `page < 1`, `branchId` no UUID, `from`/`to` no fecha válida |
| 401 | Sin token o token expirado |
| 403 | Sin `products:read` o branch scope violation |
| 404 | Producto no encontrado |

## SQL Query (referencia)

```sql
SELECT
  'sale'        AS type,
  si.id         AS item_id,
  s.id          AS ref_id,
  NULL          AS ref2_id,
  b.id          AS branch_id,
  b.name        AS branch_name,
  s.folio_code  AS folio_code,
  s.id          AS sale_id,
  si.quantity,
  si.unit_price,
  si.line_total,
  s.status      AS status,
  s.created_at  AS date
FROM sale_items si
JOIN sales s ON s.id = si.sale_id
JOIN branches b ON b.id = s.branch_id
WHERE si.product_id = $1
  AND s.status IN ('completed', 'edited')
  AND ($2::uuid IS NULL OR s.branch_id = $2)
  AND ($3::timestamptz IS NULL OR s.created_at >= $3)
  AND ($4::timestamptz IS NULL OR s.created_at <= $4)

UNION ALL

SELECT
  'return'      AS type,
  ri.id         AS item_id,
  r.id          AS ref_id,
  ri.sale_item_id AS ref2_id,
  b.id          AS branch_id,
  b.name        AS branch_name,
  NULL          AS folio_code,
  (SELECT sale_id FROM sale_items WHERE id = ri.sale_item_id) AS sale_id,
  ri.quantity,
  ri.unit_price,
  ri.line_total,
  r.status      AS status,
  r.created_at  AS date
FROM return_items ri
JOIN returns r ON r.id = ri.return_id
JOIN branches b ON b.id = r.branch_id
WHERE ri.product_id = $1
  AND r.status = 'completed'
  AND ($2::uuid IS NULL OR r.branch_id = $2)
  AND ($3::timestamptz IS NULL OR r.created_at >= $3)
  AND ($4::timestamptz IS NULL OR r.created_at <= $4)

ORDER BY date DESC
LIMIT $5 OFFSET $6
```

El `COUNT(*)` total se calcula con la misma query sin `ORDER BY / LIMIT / OFFSET` envuelta en `SELECT COUNT(*) FROM (...)`.

## DTO

```typescript
// application/dto/KardexDto.ts
export type KardexItemType = 'sale' | 'return';

export interface KardexSaleItem {
  type: 'sale';
  date: string;         // ISO string
  branchId: string;
  branchName: string;
  folioCode: string;
  saleId: string;
  saleItemId: string;
  quantity: string;     // Decimal string 4 dec
  unitPrice: string;
  lineTotal: string;
  saleStatus: 'completed' | 'edited';
}

export interface KardexReturnItem {
  type: 'return';
  date: string;
  branchId: string;
  branchName: string;
  returnId: string;
  returnItemId: string;
  saleId: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  returnStatus: 'completed';
}

export type KardexItem = KardexSaleItem | KardexReturnItem;

export interface KardexDto {
  productId: string;
  productCode: string;
  productName: string;
  items: KardexItem[];
  total: number;
  page: number;
  pageSize: number;
}
```

## Puerto

```typescript
// application/ports/ProductKardexRepository.ts
export interface KardexQuery {
  productId: string;
  branchId?: string;
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
}

export interface ProductKardexRepository {
  findKardex(query: KardexQuery): Promise<{ items: KardexItem[]; total: number }>;
}
```

## Use Case

```typescript
// application/use-cases/GetProductKardexUseCase.ts
export class GetProductKardexUseCase {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly kardexRepo: ProductKardexRepository,
  ) {}

  async execute(query: KardexQuery): Promise<KardexDto> {
    const product = await this.productRepo.findById(query.productId);
    if (!product) throw new ProductNotFoundError(query.productId);

    const { items, total } = await this.kardexRepo.findKardex(query);

    return {
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}
```
