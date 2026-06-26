## Context

El modelo `Product` actual (`prisma/schema.prisma`) no tiene campo para imagen. El admin CRUD vive en `src/modules/products/` con UI en `app/(private)/catalogs/products/`. El POS lee productos vía `PrismaPosLookupService.searchProducts` que proyecta los campos mínimos al carrito. Supabase Storage está disponible pero aún no se usa en el proyecto (no hay buckets configurados).

Los criterios duros: imagen **opcional**, validar formato + tamaño, placeholder cuando no exista, **no cargar en POS**.

## Goals / Non-Goals

**Goals:**
- Persistir una URL de imagen por producto (`image_url TEXT NULL`).
- Endpoint dedicado para subir/eliminar la imagen (no embebida en JSON del producto en bytes).
- Validación de MIME (`image/jpeg`, `image/png`, `image/webp`) y tamaño (≤2 MB) en cliente y servidor.
- Hospedaje en Supabase Storage con URLs públicas estables.
- Thumbnail en admin (lista y detalle) y placeholder Material Symbol cuando `imageUrl === null`.
- Cero impacto en payloads y rendimiento del POS.

**Non-Goals:**
- Múltiples imágenes por producto (galería). Solo una imagen principal.
- Transformaciones server-side (resize/crop/thumbnail). Confiamos en CSS para el sizing.
- CDN externo (Cloudflare Images, imgix). Supabase Storage es suficiente.
- Migrar imágenes existentes (no hay).
- Visualización en POS, recibos, PDFs.

## Decisions

### Decisión 1: Campo `image_url TEXT NULL` en `products`

**Elegido**: Una columna `image_url` nullable en `products`. Sin tabla `product_images`.

**Alternativas consideradas**:
- *Tabla `product_images` con relación 1:N*: sobre-ingeniería para una sola imagen.
- *Campo JSON con metadata*: añade serialización innecesaria; un TEXT con URL es suficiente.

**Rationale**: KISS. Una imagen por producto. Si en el futuro se necesita galería, se migra a tabla aparte.

### Decisión 2: Endpoint dedicado multipart `POST /products/:id/image`

**Elegido**: Subir la imagen en un request multipart separado. El `POST /products` y `PATCH /products/:id` aceptan solo `imageUrl: string | null` (URL ya subida), nunca bytes.

**Alternativas consideradas**:
- *Base64 embebido en el JSON del producto*: triplica el payload, complica validación.
- *Pre-signed URL desde Supabase para subir client→Storage*: más performante pero mayor superficie de seguridad (RLS de Storage) y complejidad para el MVP.

**Rationale**: Multipart al backend con buffer ≤2 MB es manejable, cumple el criterio "validar formato y tamaño" en un solo lugar (servidor), y mantiene el JSON del producto limpio. Pre-signed URLs es una optimización futura.

### Decisión 3: Bucket público `product-images`

**Elegido**: Bucket `product-images` con read público y write solo desde service role. Backend usa `SUPABASE_SERVICE_ROLE_KEY` (server-side only) para subir.

**Alternativas consideradas**:
- *Bucket privado con signed URLs por request*: agrega latencia (firmar URL en cada GET) y requiere TTL renovado.
- *Bucket público sin restricciones*: vector de DoS (cualquiera podría subir). Rechazado.

**Rationale**: Las imágenes de producto son contenido público (no PII). Read público + write controlado backend es el balance correcto.

### Decisión 4: Estructura de objetos `products/{productId}/{uuid}.{ext}`

**Elegido**: Cada upload genera un nuevo UUID. Al re-subir, el objeto anterior se elimina explícitamente para evitar acumulación.

**Rationale**: Evita cachés inválidos (URL nueva = sin colisión). Limpieza explícita evita facturas crecientes de Storage.

### Decisión 5: Validación cliente Y servidor

**Elegido**: Cliente (`ImageUploadField`) valida MIME y tamaño antes de enviar (UX inmediata). Servidor revalida (defensa). Cliente rechaza > 2 MB sin pegar el endpoint.

**Rationale**: UX rápida + seguridad. Confiar solo en cliente es vulnerable; solo en servidor es lento. Doble validación es práctica estándar.

### Decisión 6: POS NO consume `imageUrl`

**Elegido**: `PrismaPosLookupService.searchProducts` mantiene su `select` actual sin añadir `image_url`. El DTO `PosProductDto` no incluye el campo. El carrito y `SaleItem` snapshots tampoco.

**Rationale**: El POS prioriza latencia. Una URL de 200 bytes por producto en una lista de 500 items son ~100 KB extra de payload + un GET de imagen por fila si la UI los renderizara. Explícitamente excluido por el criterio de aceptación.

### Decisión 7: Placeholder Material Symbol `image_not_supported`

**Elegido**: Cuando `imageUrl === null`, `<ProductImage />` renderiza `<span className="material-symbols-outlined">image_not_supported</span>` centrado con fondo `surface-container`.

**Rationale**: Se reutiliza la fuente Material Symbols ya cargada en el shell. Cero deps extra.

## Risks / Trade-offs

- **[Riesgo]** Subida multipart al backend consume memoria del runtime Node → Mitigación: tope estricto 2 MB, parsear con `request.formData()` (Web API) sin escribir a disco.
- **[Riesgo]** Bucket público permite hotlinking → Mitigación: aceptable; las imágenes de producto son contenido público de marketing.
- **[Riesgo]** `SUPABASE_SERVICE_ROLE_KEY` filtrada compromete Storage → Mitigación: solo en `.env` server-side, nunca expuesta a cliente; documentar en `.env.example`.
- **[Riesgo]** URLs viejas en clientes cacheados después de re-upload → Mitigación: política UUID en el filename invalida cachés automáticamente.
- **[Trade-off]** Sin transformaciones server-side, imágenes muy grandes (5000x5000 sin redimensionar) cargan completas en cliente → Aceptable con tope 2 MB; UI usa `width`/`height` CSS para mostrar a tamaño adecuado.

## Migration Plan

1. Crear bucket `product-images` en proyecto Supabase `qzzjpyepggwautckqeex` (vía dashboard o `mcp__supabase__execute_sql` no aplica; el bucket se crea por API/dashboard). Configurar policies:
   - SELECT (read): público.
   - INSERT/UPDATE/DELETE: solo `service_role`.
2. Añadir `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` a `.env.example` y `.env.local`.
3. Aplicar migración Prisma `20260617000001_add_product_image_url`: `ALTER TABLE products ADD COLUMN image_url TEXT NULL;`. Idempotente con `IF NOT EXISTS`.
4. Deploy backend con nuevos endpoints; deploy frontend con `ImageUploadField`.
5. Rollback: revert migración (`ALTER TABLE products DROP COLUMN image_url;`), eliminar bucket si nunca recibió uploads productivos.

## Open Questions

- ¿Necesitamos endpoint público de listado de imágenes para auditoría? **Propuesta**: no por ahora.
- ¿Qué hacer con imágenes huérfanas (producto eliminado, imagen en Storage)? **Propuesta**: el delete de producto (soft delete actual) NO elimina la imagen; el endpoint dedicado `DELETE /products/:id/image` sí. Futuro: cron de limpieza si surge.
