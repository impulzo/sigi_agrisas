---
name: add-product-image-report
description: Historial de cambios, pruebas y decisiones — imagen opcional en productos
metadata:
  type: project
---

# Reporte: add-product-image

## Cambios backend

**`prisma/schema.prisma`** — `imageUrl String? @map("image_url") @db.Text` en modelo `Product`.

**Migración** — `20260617000001_add_product_image_url`: `ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;` aplicada vía Supabase MCP.

**`Product` entity** — campo `imageUrl: string | null` añadido.

**`UpdateProductData` port** — `imageUrl?: string | null`.

**`ProductDto` + mapper** — `imageUrl` incluido en respuesta.

**`InMemoryProductRepository`** — `create` inicializa `imageUrl: null`; `update` propaga `imageUrl` si presente.

**`PrismaProductRepository`** — `toProductWithDepartment` mapea `row.imageUrl`; `update` aplica `imageUrl` si en `data`.

**`ProductImageStoragePort`** — puerto con `upload` y `delete`.

**`SupabaseProductImageStorage`** — implementación Supabase Storage con bucket `product-images`, key `products/{id}/{uuid}.{ext}`. Requiere `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

**`InMemoryProductImageStorage`** — implementación in-memory para tests con `has(url)`.

**`UploadProductImageUseCase`** — valida MIME + tamaño (≤2 MB), borra objeto previo (best-effort), sube y persiste URL. Errores: `InvalidImageFormatError`, `ImageTooLargeError`.

**`DeleteProductImageUseCase`** — borra objeto Storage + limpia `imageUrl`. Idempotente.

**`ProductsController`** — `uploadImage` y `deleteImage` handlers; `imageUrl` en Zod schemas de create/PATCH (valida URL del bucket configurado o null).

**`app/api/v1/admin/products/[id]/image/route.ts`** — POST + DELETE delegando al controller.

**`products/infrastructure/di/container.ts`** — wired `UploadProductImageUseCase`, `DeleteProductImageUseCase`, `SupabaseProductImageStorage`.

## Cambios frontend

**`ProductDto` API types** — `imageUrl: string | null`.

**`Product` domain type** — `imageUrl: string | null`.

**`toProduct` mapper** — propaga `imageUrl ?? null`.

**`ProductImage` atom** — thumbnail con fallback `onError` → placeholder `image_not_supported`. Props: `src | null`, `alt`, `size: 40 | 96`.

**`ImageUploadField` molecule** — drop-zone, preview con `createObjectURL`, validación cliente (MIME + tamaño), botón eliminar con `ConfirmDialog`. Props: `uploadFn`/`deleteFn` inyectables para tests.

**`uploadProductImage` / `deleteProductImage` services** — `authFetch` multipart, errores tipados.

**`ProductGeneralTab`** — `ImageUploadField` embebido, gating por `canWrite`.

**`ProductEditModal`** — staging de imagen en modo create; `onSave` recibe `stagedImage?: File | null`.

**`ProductsTable`** — columna thumbnail `ProductImage size=40`.

**`ProductDetailPage`** — `ProductImage size=96` en header junto a code/name.

**Supabase bucket** — `product-images` creado vía SQL MCP; policy SELECT pública creada.

**`.env.example`** — `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` documentados.

## Pruebas

| Suite | Tests | Estado |
|---|---|---|
| `UploadDeleteProductImageUseCase.test.ts` | 8 | PASS |
| `ProductImage.test.tsx` | 4 | PASS |
| `ImageUploadField.test.tsx` | 6 | PASS |
| Todos los tests de `products` (140) | 140 | PASS |
| POS audit: no `imageUrl` en PrismaPosLookupService / Sale/Quote/Return repos | — | PASS |

## Decisiones

- Endpoint multipart dedicado `/products/:id/image` vs base64 en JSON: multipart evita payload inflado, valida en un solo punto.
- Supabase Storage bucket público para SELECT: imágenes de producto son contenido público, sin PII.
- `SUPABASE_SERVICE_ROLE_KEY` solo server-side: nunca expuesta en bundle cliente.
- `imageUrl` en PATCH limpia la URL sin borrar el objeto Storage (acción destructiva separada vía DELETE /image).
- `ImageUploadField` acepta `uploadFn`/`deleteFn` como props inyectables para testabilidad sin mocks de módulos.
- `URL.createObjectURL` mockeado en tests jsdom (no implementado nativamente).
- POS no expone `imageUrl`: preserva latencia del catálogo de venta.
