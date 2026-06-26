## Why

Las fichas de producto no cuentan con imagen visual. Esto degrada la UX del catálogo administrativo (lista densa de texto), dificulta la identificación rápida en el detalle de producto y limita la riqueza informativa de la ficha. La imagen NO debe ser obligatoria (muchos productos genéricos no la necesitan) ni se quiere cargar en el POS para no penalizar la latencia del catálogo de venta. La solución debe añadir una imagen **opcional** a nivel de producto con validación de formato/tamaño y un placeholder por defecto en UI cuando no exista.

## What Changes

- Producto gana un campo opcional `imageUrl: string | null` (URL a Supabase Storage).
- Backend: migración Prisma `add_product_image_url` añade `products.image_url TEXT NULL`. Zod del controller acepta `imageUrl?: string | null` (URL https válida, ≤2048 chars) en `POST` y `PATCH`. `imageUrl: null` en PATCH limpia la imagen. `GET` siempre devuelve `imageUrl: string | null`.
- Subida de imagen vía Supabase Storage bucket `product-images` (público para lectura). Nuevo endpoint `POST /api/v1/admin/products/:id/image` (multipart) que valida MIME (`image/jpeg | image/png | image/webp`), tamaño (≤2 MB), sube a Storage con clave `products/{productId}/{uuid}.{ext}` y persiste la URL pública en `products.image_url`. Requiere permiso `products:write`.
- Nuevo endpoint `DELETE /api/v1/admin/products/:id/image` que elimina el objeto de Storage y limpia `image_url`. Requiere `products:write`.
- UI admin: modal Edit de producto (tab "General") añade `ImageUploadField` (drag-and-drop + preview). En la lista (`ProductsTable`) y detalle se renderiza thumbnail (`<ProductImage>`) o placeholder Material Symbol `image_not_supported`.
- POS NO consume `imageUrl`: `PosLookupService.searchProducts` y el carrito NO añaden el campo a sus DTOs ni a la UI; el rendimiento del catálogo POS se preserva.
- Listing `GET /api/v1/admin/products` incluye `imageUrl` en `ProductListItemDto`.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `products-api`: añade campo `imageUrl` al schema, endpoints de upload/delete de imagen, validación de MIME/tamaño y bucket Supabase Storage.
- `products-ui`: añade `ImageUploadField` al modal edit, thumbnail en lista/detalle y placeholder.
- `pos-api`: refuerza que `imageUrl` NO se expone en el catálogo POS (`searchProducts`) ni en `SaleItem`/snapshots.

## Impact

- **Migración Prisma**: `20260617000001_add_product_image_url` añade `products.image_url TEXT NULL`. Idempotente; columna nueva nullable, sin backfill.
- **Supabase Storage**: nuevo bucket `product-images` con policy de lectura pública y escritura restringida (vía service role desde backend). Configuración manual + comando documentado.
- **Backend**:
  - `src/modules/products/domain/entities/Product.ts` añade `imageUrl: string | null`.
  - `src/modules/products/application/dto/ProductDto.ts` y mappers actualizados.
  - `src/modules/products/infrastructure/services/ProductImageStorage.ts` (port `ProductImageStoragePort`) — wrapper de `@supabase/supabase-js` para upload/delete.
  - `ProductsController` añade `uploadImage` y `deleteImage` handlers.
  - `app/api/v1/admin/products/[id]/image/route.ts` (POST + DELETE).
- **Frontend**:
  - `app/(private)/catalogs/products/_blocks/ProductGeneralTab.tsx` integra `ImageUploadField`.
  - `app/_components/molecules/ImageUploadField.tsx` (nuevo, presentational con `onChange(file | null)`).
  - `app/_components/atoms/ProductImage.tsx` (nuevo, thumbnail con fallback).
  - `app/(private)/catalogs/products/_logic/services/uploadProductImage.ts` y `deleteProductImage.ts`.
  - `ProductsTable` añade columna thumbnail.
- **Sin impacto en POS**: explícitamente excluido de la respuesta `searchProducts`.
- **Tests**:
  - Unit backend: validación Zod (MIME, tamaño, URL); InMemory storage para use cases.
  - Unit UI: `ImageUploadField` (drag, preview, validación cliente), `ProductImage` (placeholder).
  - Integración: roundtrip upload → GET → delete.
- **RBAC**: reutiliza `products:write` (no se añaden permisos nuevos).
- **Riesgo**: subida directa al backend Node consume memoria; mitigado con límite estricto de 2 MB y rechazo previo en client. Supabase Storage es backbone estable; configurar la policy correctamente es crítico.
