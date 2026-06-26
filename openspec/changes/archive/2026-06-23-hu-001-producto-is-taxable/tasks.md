## 1. Base de datos y Prisma

- [x] 1.1 Crear migración `add_is_taxable_to_products`: `ALTER TABLE products ADD COLUMN is_taxable BOOLEAN NOT NULL DEFAULT false`
- [x] 1.2 Agregar `isTaxable Boolean @default(false)` al modelo `Product` en `prisma/schema.prisma`
- [x] 1.3 Ejecutar `npx prisma generate` para regenerar el cliente

## 2. Dominio (backend hexagonal)

- [x] 2.1 Agregar `isTaxable: boolean` a la entidad `Product` en `src/modules/products/domain/entities/Product.ts`
- [x] 2.2 Actualizar `ProductDto` en `src/modules/products/application/dto/` para incluir `isTaxable: boolean`
- [x] 2.3 Actualizar mapper `ProductMapper` para leer/escribir `isTaxable` desde/hacia Prisma

## 3. Infraestructura y controller (backend)

- [x] 3.1 Agregar `isTaxable: z.boolean().optional().default(false)` al schema Zod de creación en `ProductsController`
- [x] 3.2 Agregar `isTaxable: z.boolean().optional()` al schema Zod de actualización en `ProductsController`
- [x] 3.3 Actualizar `PrismaProductRepository.create` y `.update` para persistir `is_taxable`
- [x] 3.4 Actualizar `PrismaProductRepository.findById` y `.findAll` para incluir `is_taxable` en las queries

## 4. Cálculo de totales (POS)

- [x] 4.1 Actualizar `PosLookupService` / `PrismaPosLookupService` para incluir `isTaxable` en el lookup de producto/precio
- [x] 4.2 Actualizar `SaleTotalsCalculator.calculate` para aplicar `effectiveIvaRate = isTaxable ? ivaRate : 0` por línea
- [x] 4.3 Actualizar `QuoteTotalsCalculator.calculate` con la misma lógica
- [x] 4.4 Actualizar `computeTotalsClient.ts` (frontend POS) para aplicar la misma lógica cliente
- [x] 4.5 Actualizar tests de totales en `tests/fixtures/totals-vectors.ts` con vectores de productos no sujetos a impuestos

## 5. Frontend — tabla de productos

- [x] 5.1 Agregar `isTaxable: boolean` a `ProductDomain` en `app/(private)/catalogs/products/_logic/types/domain.ts`
- [x] 5.2 Agregar `isTaxable: boolean` a `ProductApiDto` en `app/(private)/catalogs/products/_logic/types/api.ts`
- [x] 5.3 Agregar columna "Sujeto a impuestos" a `ProductsTable` con badge "Sí"/"No"

## 6. Frontend — modal crear/editar

- [x] 6.1 Agregar toggle `isTaxable` (label "Sujeto a impuestos") en `ProductEditModal` para modo create y edit
- [x] 6.2 Agregar `isTaxable: z.boolean().optional().default(false)` al schema Zod cliente en `product.schema.ts`
- [x] 6.3 Asegurar que `isTaxable` forma parte del diff en modo edit (habilitando save si cambia)
- [x] 6.4 En modo edit, pre-llenar el toggle con `entity.isTaxable`

## 7. Tests

- [x] 7.1 Test unitario: `SaleTotalsCalculator` con producto `isTaxable=false` → `lineIva=0`
- [x] 7.2 Test unitario: `QuoteTotalsCalculator` con producto `isTaxable=false` → `lineIva=0`
- [x] 7.3 Test unitario: `ProductsController.create` con `isTaxable: "yes"` → HTTP 400
- [x] 7.4 Test unitario: `ProductsController.patch` con `isTaxable: true` → persiste correctamente
