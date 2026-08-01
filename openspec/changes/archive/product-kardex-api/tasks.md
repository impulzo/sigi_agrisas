## 1. DTO y Puerto

- [x] 1.1 Crear `src/modules/products/application/dto/KardexDto.ts` con tipos `KardexSaleItem`, `KardexReturnItem`, `KardexItem`, `KardexDto` según design.
- [x] 1.2 Crear `src/modules/products/application/ports/ProductKardexRepository.ts` con interfaz `KardexQuery` y `ProductKardexRepository` según design.

## 2. Use Case

- [x] 2.1 Crear `src/modules/products/application/use-cases/GetProductKardexUseCase.ts`: recibe `ProductRepository` + `ProductKardexRepository`; llama `findById` → 404 si no existe; llama `findKardex`; retorna `KardexDto`.
- [x] 2.2 Crear `tests/unit/modules/products/GetProductKardexUseCase.test.ts` con `InMemoryProductKardexRepository` (implementación inline en el test): producto no existe → lanza `ProductNotFoundError`; producto existe → retorna dto con `productId`/`productCode`/`productName`/`items`/`total`/`page`/`pageSize`.

## 3. Repositorio InMemory (para tests)

- [x] 3.1 Crear `src/modules/products/infrastructure/repositories/InMemoryProductKardexRepository.ts`: implementa `ProductKardexRepository`; almacena `KardexItem[]` en memoria; pagina con `slice`; filtra por `branchId`/`from`/`to` si se pasan.

## 4. Repositorio Prisma

- [x] 4.1 Crear `src/modules/products/infrastructure/repositories/PrismaProductKardexRepository.ts`.
  - Método `findKardex(query)`: construye SQL UNION ALL con `prisma.$queryRaw` (ver design.md SQL Query). Parámetros: `productId`, `branchId` (null si no filtra), `from` (null si no filtra), `to` (null si no filtra), `pageSize`, `offset`.
  - Calcula `total` con `COUNT(*)` sobre la misma UNION envuelta en subquery.
  - Serializa `quantity`, `unitPrice`, `lineTotal` como strings con 4 decimales.
  - `date` como ISO string UTC.
  - Mapea `type='sale'` → `KardexSaleItem`; `type='return'` → `KardexReturnItem`.

## 5. Controller

- [x] 5.1 Extender `src/modules/products/infrastructure/http/ProductsController.ts` con método `getKardex(req: NextRequest, productId: string): Promise<NextResponse>`:
  - Parsear y validar query params con Zod: `page`, `pageSize`, `branchId`, `from`, `to`.
  - Validar `productId` UUID (Zod `z.string().uuid()` → 400 si falla).
  - Verificar permiso `products:read` con `requirePermission`.
  - Aplicar `resolveScopedBranchId(req, branchId?)` → puede lanzar 403.
  - Llamar `GetProductKardexUseCase.execute(...)`.
  - Capturar `ProductNotFoundError` → 404.
  - Retornar `NextResponse.json(dto)`.

## 6. Route Handler

- [x] 6.1 Crear `app/api/v1/admin/products/[id]/kardex/route.ts`:
  ```typescript
  import { productsController } from '@/modules/products/infrastructure/di/container';
  export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    return productsController.getKardex(req, params.id);
  }
  ```

## 7. DI Container

- [x] 7.1 Actualizar `src/modules/products/infrastructure/di/container.ts`: instanciar `PrismaProductKardexRepository` y `GetProductKardexUseCase`; inyectar en `ProductsController`.

## 8. Spec delta

- [x] 8.1 Crear `openspec/changes/product-kardex-api/specs/product-kardex-api.md` con los requirements y scenarios del nuevo endpoint (ver sección API Contract del design).

## 9. Verificación

- [x] 9.1 `npm run build` sin errores de tipos.
- [x] 9.2 `npm test -- --testPathPattern=GetProductKardex` pasa.
- [x] 9.3 Smoke test manual: `GET /api/v1/admin/products/<id>/kardex` con token válido retorna 200 con estructura correcta.
- [x] 9.4 Smoke test branch scoping: operador sin `branches:access_all` sin `?branchId` → implícito branchId del token; branchId ajeno → 403.
