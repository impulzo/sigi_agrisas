## 1. Infraestructura Supabase Storage

- [x] 1.1 Crear bucket `product-images` en Supabase (proyecto `qzzjpyepggwautckqeex`) vía dashboard o CLI; activar `Public bucket` para SELECT.
- [x] 1.2 Configurar policies del bucket: `SELECT` público; `INSERT/UPDATE/DELETE` restringido a `service_role` (sin policy para `authenticated` ni `anon`).
- [x] 1.3 Añadir `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` a `.env.example` y `.env.local`. Documentar en CLAUDE.md sección Stack/Storage.
- [x] 1.4 Añadir `@supabase/supabase-js` a `package.json` (server-side only).

## 2. Migración Prisma y dominio

- [x] 2.1 Editar `prisma/schema.prisma`: añadir `imageUrl String? @map("image_url") @db.Text` al modelo `Product`.
- [x] 2.2 Ejecutar `npx prisma migrate dev --name add_product_image_url`. Verificar migración generada en `prisma/migrations/<ts>_add_product_image_url/migration.sql` con `ALTER TABLE products ADD COLUMN image_url TEXT;` (NULL aceptado por default).
- [x] 2.3 `npx prisma generate` para refrescar el Prisma Client.
- [x] 2.4 Actualizar `src/modules/products/domain/entities/Product.ts` con `imageUrl: string | null`.

## 3. Storage adapter

- [x] 3.1 Crear puerto `src/modules/products/application/ports/ProductImageStoragePort.ts` con métodos `upload(productId, buffer, mime, ext): Promise<string>` (devuelve URL pública) y `delete(url): Promise<void>`.
- [x] 3.2 Implementar `src/modules/products/infrastructure/services/SupabaseProductImageStorage.ts` usando `@supabase/supabase-js` con la `service_role` key. Bucket constante: `product-images`. Estructura de keys: `products/{productId}/{uuid}.{ext}`.
- [x] 3.3 Implementar `InMemoryProductImageStorage` para tests en `src/modules/products/infrastructure/services/InMemoryProductImageStorage.ts`.

## 4. Use cases y controller (backend)

- [x] 4.1 Use cases nuevos: `UploadProductImageUseCase` y `DeleteProductImageUseCase` en `src/modules/products/application/use-cases/`. Reciben puerto de storage + repo.
- [x] 4.2 Extender Zod schemas en `ProductsController` para aceptar `imageUrl?: string | null` en `POST` y `PATCH`, validando URL https + dominio del bucket configurado.
- [x] 4.3 Añadir handlers `uploadImage` y `deleteImage` en `ProductsController` que: validan MIME (`image/jpeg|png|webp`), tamaño (≤2 MB) leyendo `request.formData()`, llaman al use case, normalizan errores (413 too large, 400 invalid format, 404 not found, 403 forbidden).
- [x] 4.4 Crear ruta `app/api/v1/admin/products/[id]/image/route.ts` con `POST` y `DELETE` delegando al controller vía DI.
- [x] 4.5 Actualizar `ProductDto`, mappers y `PrismaProductRepository` para persistir/leer `image_url`.

## 5. Asegurar exclusión en POS

- [x] 5.1 Auditar `src/modules/pos/infrastructure/services/PrismaPosLookupService.ts`: verificar que `select` de `Product` NO incluye `image_url`. Si lo incluye, removerlo.
- [x] 5.2 Auditar DTOs `app/(private)/pos/_logic/types/api.ts` y `domain.ts`: `PosProductDto`/`CartLine` NO contienen `imageUrl`.
- [x] 5.3 Verificar que `PrismaSaleRepository`, `PrismaQuoteRepository`, `PrismaReturnRepository` NO snapshotean ningún campo de imagen.

## 6. UI: atom + molecule + servicios cliente

- [x] 6.1 Crear atom `app/_components/atoms/ProductImage.tsx` con props `{ src: string | null; alt: string; size: 40 | 96 }`, fallback a `image_not_supported` y `onError` para fallar gracefully.
- [x] 6.2 Crear molecule `app/_components/molecules/ImageUploadField.tsx` con drop-zone, preview, validación cliente (MIME + tamaño), botón "Eliminar imagen" y `ConfirmDialog`.
- [x] 6.3 Crear servicios `app/(private)/catalogs/products/_logic/services/{uploadProductImage,deleteProductImage}.ts` con `authFetch`, multipart, mapeo de errores tipados (`ProductImageTooLargeError`, `ProductImageInvalidFormatError`).
- [x] 6.4 Añadir errores tipados en `app/(private)/catalogs/products/_logic/errors.ts`.

## 7. Integración UI

- [x] 7.1 Editar `app/(private)/catalogs/products/_blocks/ProductGeneralTab.tsx` para embeber `ImageUploadField` con gating por `products:write`.
- [x] 7.2 Editar `ProductEditModal` (modo create) para staging del archivo y subida diferida tras crear el producto.
- [x] 7.3 Editar `ProductsTable` para añadir columna thumbnail (`ProductImage size=40`).
- [x] 7.4 Editar header de `/catalogs/products/[id]` para mostrar `ProductImage size=96` junto a `code`/`name`.
- [x] 7.5 Actualizar `useProducts` y servicios `getProduct`, `listProducts`, `updateProduct` para mapear `imageUrl` desde la respuesta.

## 8. Tests

- [x] 8.1 Unit backend: validar Zod `imageUrl` (URL bucket vs foreign origin) en `tests/unit/modules/products/...`.
- [x] 8.2 Unit backend: use cases `UploadProductImageUseCase` y `DeleteProductImageUseCase` con `InMemoryProductImageStorage` (re-upload elimina anterior, idempotencia delete).
- [x] 8.3 Unit UI: `ImageUploadField` (drop, preview, validación MIME/tamaño, confirm delete, deferred create-mode upload).
- [x] 8.4 Unit UI: `ProductImage` (placeholder, fallback onError).
- [x] 8.5 Integración: roundtrip `POST → GET → DELETE` contra `InMemoryProductImageStorage`.
- [x] 8.6 Test de POS: confirmar que `searchProducts` y snapshots de Sale/Quote/Return NO incluyen imagen.
- [x] 8.7 Ejecutar `npm test` completo, 0 regresiones.

## 9. Verificación visual y E2E manual

- [x] 9.1 `npm run dev`, login, navegar a `/catalogs/products`. Crear producto sin imagen → verificar placeholder.
- [x] 9.2 Editar producto, subir JPG válido (~500 KB) → verificar preview + thumbnail en lista.
- [x] 9.3 Subir PNG > 2 MB → verificar error inline.
- [x] 9.4 Subir PDF → verificar error inline.
- [x] 9.5 Eliminar imagen → verificar placeholder y que `imageUrl: null` en BD.
- [x] 9.6 Abrir POS y confirmar que los thumbnails NO se cargan (catálogo sin imágenes).

## 10. Reporte

- [x] 10.1 Generar `openspec/changes/add-product-image/report.md` con historial de cambios, pruebas ejecutadas y decisiones, en modo caveman.
