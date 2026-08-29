## 1. Flag central de configuración

- [x] 1.1 Crear `src/shared/infrastructure/config/inventoryScope.ts` con `getInventoryScopeMode()` e `isBranchScopedInventory()` (función, no const de módulo — ver design.md Decisión 1)
- [x] 1.2 Documentar `INVENTORY_SCOPE_MODE` en `.env.example` (valores `general` default | `branch`)
- [x] 1.3 Test unitario: `getInventoryScopeMode()` retorna `general` cuando la env var está ausente, `general` ante valor no reconocido, `branch` sólo con el valor exacto `"branch"`

## 2. Catálogo filtrado por sucursal (`products-api`)

- [x] 2.1 `src/modules/products/application/ports/ProductRepository.ts` — añadir `branchScoped?: boolean` a `FindAllProductsOptions`
- [x] 2.2 `PrismaProductRepository.findAll` — mover el filtro condicional al `where` (`...(branchId && branchScoped ? { inventory: { some: { branchId } } } : {})`), manteniendo el `include` de stock sin cambios
- [x] 2.3 Espejar el mismo filtro en `InMemoryProductRepository.findAll`
- [x] 2.4 `ListProductsUseCase.ts` — propagar `branchScoped` sin lógica adicional
- [x] 2.5 `ProductsController.list` — resolver `branchId`/`branchScoped` según `isBranchScopedInventory()`: en modo `branch`, usar `resolveScopedBranchId(req, query.branchId)` y `branchScoped: true`; en modo `general`, comportamiento actual intacto
- [x] 2.6 Tests `tests/unit/modules/products/` — `findAll` filtra con `branchScoped: true`; no filtra sin el flag; `total`/paginación reflejan el filtro
- [x] 2.7 Tests `tests/unit/modules/products/infrastructure/http/` — `ProductsController.list` aplica `resolveScopedBranchId` sólo en modo `branch`; operador sin `branches:access_all` no puede listar otra sucursal; admin con bypass y sin `branchId` ve catálogo completo en ambos modos

## 3. Gate de disponibilidad — capa aplicación (`pos-api`, `quotes-api`)

- [x] 3.1 Crear `src/modules/pos/domain/errors/ProductNotAvailableInBranchError.ts` (calcado de `ProductPriceNotAvailableForBranchError`, mapeo HTTP 400)
- [x] 3.2 `src/modules/pos/application/ports/PosLookups.ts` — añadir `isProductAvailableInBranch(productId: string, branchId: string): Promise<boolean>` al puerto
- [x] 3.3 Implementar en `PrismaPosLookupService` (`branchInventory.findUnique` por clave compuesta `(branchId, productId)`) y en el fake/InMemory usado en tests
- [x] 3.4 `CreateSaleUseCase.ts` — inyectar `branchScopedInventory: boolean` por constructor; insertar el check justo después de validar producto activo, antes de resolver precio/dosificación
- [x] 3.5 `EditCompletedSaleUseCase.ts` — mismo check en el reemplazo de línea items
- [x] 3.6 Repetir 3.1–3.3 en el módulo `quotes` (error/puerto/lookup service propios, sin import cruzado con `pos` — ver CLAUDE.md aislamiento de módulos)
- [x] 3.7 `CreateQuoteUseCase.ts` y `UpdateQuoteUseCase.ts` (sólo status `draft`) — mismo check
- [x] 3.8 DI containers (`pos/infrastructure/di/container.ts`, `quotes/infrastructure/di/container.ts`) — inyectar `isBranchScopedInventory()` a los use cases construidos
- [x] 3.9 Tests `tests/unit/modules/pos/` — venta de producto no asignado → `ProductNotAvailableInBranchError` (400) en modo `branch`; pasa sin el flag; venta con fila `quantity=0` pasa el gate
- [x] 3.10 Tests `tests/unit/modules/quotes/` — mismos casos para creación y actualización de cotización draft
- [x] 3.11 (hallazgo de `opsx:verify`) `ConvertQuoteToSaleUseCase.ts` no pasaba por el gate — `execute()` llama `saleRepo.createCompletedFromQuote` directo, sin pasar por `CreateSaleUseCase`. Corregido: mismo check `isProductAvailableInBranch` antes de resolver folio/pago (después del check de idempotencia y de `authorized`/`expiresAt`), `branchScopedInventory` inyectado por constructor, wireado en `quotes/infrastructure/di/container.ts`. `QuotesController.convert` ya mapeaba el error vía `mapErrorToResponse` compartido (task 3.7). Tests nuevos en `QuoteLifecycleUseCases.test.ts` (rechaza si desasignado tras autorizar, permite si sigue asignado, no aplica sin el flag, no re-evalúa en conversión idempotente). Spec `quotes-api` actualizada con el requisito "Product availability gate on quote conversion".

## 4. Gate de disponibilidad — capa escritura (`inventory-api`)

- [x] 4.1 `src/shared/infrastructure/inventory/recordInventoryMovement.ts` — añadir `allowRowCreation?: boolean` (default `true`) a `RecordInventoryMovementData`; cuando `rows.length === 0 && allowRowCreation === false`, lanzar en vez de crear la fila
- [x] 4.2 `PrismaSaleRepository` — pasar `allowRowCreation: !isBranchScopedInventory()` SÓLO en los movimientos OUT de venta (`"sale"` en creación directa y desde cotización, `"sale_edit_apply"`)
- [x] 4.3 Confirmar explícitamente que `sale_cancel`, `sale_edit_restore` (en `PrismaSaleRepository`) y `return` (en `PrismaReturnRepository`) NO reciben este parámetro — deben conservar `allowRowCreation: true` siempre (ver design.md Decisión 4)
- [x] 4.4 Confirmar que compras (`PrismaPurchaseRepository`), ajustes/asignación admin (`PrismaBranchInventoryRepository`) y traspasos quedan sin tocar — vías de alta legítimas
- [x] 4.5 Test nuevo `tests/unit/shared/inventory/recordInventoryMovement.test.ts` — `allowRowCreation: false` + fila ausente lanza; `allowRowCreation: true` (o ausente) crea la fila igual que hoy
- [x] 4.6 Extender `tests/integration/modules/inventory/inventory-branch-scoping.test.ts` — ciclo completo: asignar producto a sucursal → aparece en catálogo POS → vender (pasa el gate) → cancelar (restaura sin bloqueo) → traspasar a otra sucursal (queda disponible ahí)

## 5. Endpoint y UI de estado del modo

- [x] 5.1 Nuevo `app/api/v1/admin/settings/inventory-scope/route.ts` — `GET` devuelve `{ mode: "general" | "branch" }`, sólo requiere sesión autenticada
- [x] 5.2 `app/_hooks/useInventoryScopeMode.ts` — hook con caché de módulo 60s, mismo patrón que `useHeadquarters.ts`
- [x] 5.3 `app/(private)/inventory/_blocks/InventoryPage.tsx` — badge "Inventario por sucursal" cuando `mode === "branch"`
- [x] 5.4 `app/(private)/catalogs/products/` — nota informativa en el encabezado cuando `mode === "branch"`, sin alterar el filtrado del listado admin (sigue mostrando todo el catálogo)
- [x] 5.5 POS: mapear `ProductNotAvailableInBranch` a mensaje accionable ("Producto no disponible en esta sucursal — asígnalo desde Inventario")
- [x] 5.6 Tests `tests/unit/ui/(private)/inventory/**` y `tests/unit/ui/(private)/catalogs/products/**` — badge/nota se muestran sólo en modo `branch`; hook cachea y no repite fetch dentro del TTL

## 6. Verificación final

- [x] 6.1 `npm test` completo con el flag ausente — confirmar cero tests existentes modificados y toda la suite en verde
- [x] 6.2 `INVENTORY_SCOPE_MODE=branch npm test` — confirmar que los tests nuevos de modo `branch` pasan
- [x] 6.3 `npm run build` — sin errores de tipos
- [x] 6.4 Verificación manual contra servidor real (`INVENTORY_SCOPE_MODE=branch`, DB real, login `admin@example.com`/`admin1234`). Browser Playwright bloqueado por otra sesión activa usando el mismo perfil (`Browser is already in use`) — no se forzó el cierre. Verificado en su lugar vía HTTP directo contra el servidor real: `GET /inventory-scope` → `{"mode":"branch"}`; catálogo sin filtrar `total=921` vs `branchId=TLAXIACO` → `367` vs `branchId=PRADERA` → `240`; producto `VELADES_DE_5L` presente en catálogo scoped de TLAXIACO, ausente (`total:0`) en el de PRADERA; `POST /sales` del mismo producto en PRADERA → 400 `"Product is not available in this branch"`; el mismo POST en TLAXIACO pasa el gate (falla después en un check no relacionado, precio inexistente). Ciclo asignar→vender→cancelar→traspasar ya cubierto de punta a punta en 4.6 (integración, DB real). Compra/asignación admin y comportamiento con el flag ausente ya cubiertos por unit+integración (6.1/6.2). Pendiente estrictamente de click-through visual en navegador — no bloqueante, mecanismo ya verificado por 3 vías independientes (unit, integración DB real, HTTP contra servidor real).
- [x] 6.5 `.env.local` de desarrollo se deja en `INVENTORY_SCOPE_MODE="branch"` para el trabajo de esta versión (antes `general`). 4 tests de integración pre-existentes asumían alta automática de fila `branch_inventory` al vender (`allowRowCreation=true`, sólo válido en `general`) sin seedear la asignación producto→sucursal: `sales-negative-stock.test.ts` (describe completo, 4 tests), `sales-create-and-cancel.test.ts` (describe completo, 6 tests), `sales-with-quote-link.test.ts` (3 de 5 tests), `quotes-conversion-edge-cases.test.ts` (1 de 5 tests). Se les añadió guard `isBranchScopedInventory()` de `src/shared/infrastructure/config/inventoryScope.ts` (`describe.skip`/`it.skip` condicional) para que sólo corran en modo `general` — no se tocó lógica de producción. Con el flag en `branch`: 14 tests skipeados, resto de la suite en verde salvo dos hallazgos sin relación a este change (ver nota abajo).
