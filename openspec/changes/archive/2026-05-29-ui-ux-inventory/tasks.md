## 1. Atoms/shared prerequisites

- [x] 1.1 Verificar/confirmar que existen los átomos `Badge` y `Skeleton` (`app/_components/atoms/`) y el molecule `ConfirmDialog`; si falta alguno necesario para las tablas/modales, crearlo siguiendo Atomic Design (presentational puro).
- [x] 1.2 Añadir el icono `inventory_2` a `app/_components/atoms/Icon/icons.ts` si no está registrado.

## 2. Products `_logic/` (types, errors, services)

- [x] 2.1 Crear `app/(private)/catalogs/products/_logic/types/api.ts` con DTOs HTTP: `ProductDto`, `ListProductsResponse`, `CreateProductBody`, `UpdateProductBody`, `ProductPriceDto`, `Create/UpdatePriceBody`, `ProductDosificationDto`, `Create/UpdateDosificationBody`.
- [x] 2.2 Crear `_logic/types/domain.ts` con tipos de dominio frontend (`Product`, `ProductPrice`, `ProductDosification`) con `createdAt`/`updatedAt: Date`.
- [x] 2.3 Crear `_logic/errors.ts`: `ProductNotFoundError`, `ProductCodeAlreadyInUseError`, `ProductDepartmentInvalidError`, `DuplicatePriceNameError`, `DuplicateDefaultPriceError`, `DuplicateDosificationNameError`.
- [x] 2.4 Crear `_logic/services/` para producto: `listProducts`, `getProduct`, `createProduct`, `updateProduct`, `softDeleteProduct` — usan `authFetch`, aceptan `fetchImpl?`, parsean fechas a `Date` y mapean errores HTTP (404/409/400) a errores tipados.
- [x] 2.5 Crear `_logic/services/` para precios: `listPrices`, `createPrice`, `updatePrice`, `deletePrice` (hard delete) con mapeo de 409 `DuplicatePriceNameError`/`DuplicateDefaultPriceError`.
- [x] 2.6 Crear `_logic/services/` para dosificaciones: `listDosifications`, `createDosification`, `updateDosification`, `softDeleteDosification` con mapeo de 409 `DuplicateDosificationNameError`.
- [x] 2.7 Crear `_logic/schemas/`: `product.schema.ts` (Zod: `code` `^[A-Z0-9_]{1,32}$`, `satProductCode` `^\d{8}$` opcional, `ivaRate`/`iepsRate` 0–100 o null), `price.schema.ts` (`price>=0`, `minQuantity>=1`, `discountPct` 0–100), `dosification.schema.ts` (`numParts>=2`).

## 3. Products `_logic/` hooks

- [x] 3.1 Crear `_logic/hooks/useProducts.ts` (`{ page, pageSize, search, departmentId, includeInactive }`) con `AbortController` (cancela en cambio de params y en unmount), devuelve `{ items, total, isLoading, error, refresh }`.
- [x] 3.2 Crear `_logic/hooks/useDepartmentsOptions.ts` que carga departamentos activos una vez (`GET /api/v1/admin/departments?pageSize=100`) con caché a nivel de módulo; devuelve `{ options, isLoading }`.
- [x] 3.3 Crear `_logic/hooks/useProductMutations.ts` (create/update/softDelete; re-lanza errores tipados de código/departamento para mapeo inline).
- [x] 3.4 Crear `_logic/hooks/useProductPrices.ts` y `_logic/hooks/useProductDosifications.ts` (carga por `productId` + mutaciones; refresh obligatorio tras cambiar default price).

## 4. Products UI — listado

- [x] 4.1 Crear `app/(private)/catalogs/products/page.tsx` (Server Component, exporta `metadata`, importa el bloque `ProductsPage`).
- [x] 4.2 Crear `_blocks/ProductsPage.tsx` (orquestador client): gating `products:read`, estado de page/search-debounced/departmentId/includeInactive, render de toolbar+tabla+paginación, manejo de loading/empty/error.
- [x] 4.3 Crear `_blocks/ProductsTable.tsx`: columnas `Código`(mono), `Nombre`, `Departamento`, `Unidad`, `IVA`(%/—), `IEPS`(%/—), `Estado`(badge), `Acciones`. Acción "Gestionar" siempre visible con `products:read`; Editar/Eliminar gated por `products:write`.
- [x] 4.4 Reutilizar `CatalogToolbar` con `searchScope="server"` + filtro `<select>` de departamento (de `useDepartmentsOptions`) + botón "Nuevo producto" gated por `products:write`.
- [x] 4.5 Crear `_blocks/ProductEditModal.tsx` (modo create/edit): campos `code`(upper, disabled en edit), `name`, `departmentId`(select), `unit`, `satProductCode`, `ivaRate`(%), `iepsRate`(%), `isActive`. Validación Zod inline; diff submit en edit; mapeo 409 código y 400 departamento a errores inline.

## 5. Products UI — detalle con tabs

- [x] 5.1 Crear `app/(private)/catalogs/products/[id]/page.tsx` (Server Component → bloque `ProductDetailPage`).
- [x] 5.2 Crear `_blocks/ProductDetailPage.tsx`: carga producto, header `code`+`name`, estado de tab activa (General/Precios/Dosificaciones), estado 404 "Producto no encontrado" con link de regreso.
- [x] 5.3 Crear `_blocks/ProductGeneralTab.tsx`: formulario embebido (reusa campos del modal) con "Guardar cambios" (diff submit) gated por `products:write`; solo lectura para viewer.
- [x] 5.4 Crear `_blocks/ProductPricesTab.tsx` + `PricesTable` + `ProductPriceModal`: tabla (`Nombre`, `Precio`, `Cantidad mín.`, `Descuento`, `Default` badge, `Acciones`), create/edit/delete(hard) con `ConfirmDialog`; re-fetch tras cambiar default; caption "Solo lectura — requiere products:write" para viewer.
- [x] 5.5 Crear `_blocks/ProductDosificationsTab.tsx` + `DosificationsTable` + `ProductDosificationModal`: tabla (`Nombre`, `Partes`, `Precio unitario`/"Requiere precio default", `Estado`, `Acciones`), create/edit/soft delete + reactivar; caption read-only para viewer.

## 6. Inventory `_logic/`

- [x] 6.1 Crear `app/(private)/inventory/_logic/types/api.ts` y `types/domain.ts` (`BranchInventoryDto`/`InventoryItem`, `ListResponse`, `AssignBody`, `UpdateBody`, `AdjustBody`).
- [x] 6.2 Crear `_logic/errors.ts`: `InventoryRecordNotFoundError`, `InventoryAlreadyExistsError`, `NegativeStockNotAllowedError`, `InventoryTargetInvalidError`.
- [x] 6.3 Crear `_logic/services/`: `listBranchInventory`, `getInventoryItem`, `assignProduct`, `updateInventoryItem`, `adjustStock`, `removeInventoryItem` — `authFetch`, `fetchImpl?`, mapeo 404/409/400 a errores tipados, `updatedAt`→`Date`.
- [x] 6.4 Crear `_logic/schemas/`: `assign.schema.ts` (`quantity>=0`, `reorderPoint>=0`), `adjust.schema.ts` (`delta != 0`), `editInventory.schema.ts` (`quantity/reservedQuantity/reorderPoint >=0`).
- [x] 6.5 Crear `_logic/hooks/useBranchInventory.ts` (no fetch si `branchId` unset; `AbortController`; `{ items,total,isLoading,error,refresh }`), `useBranchesOptions.ts` (sucursales activas, caché módulo), `useInventoryMutations.ts`.

## 7. Inventory UI

- [x] 7.1 Crear `app/(private)/inventory/page.tsx` (Server Component → bloque `InventoryPage`).
- [x] 7.2 Crear `_blocks/InventoryPage.tsx`: gating `inventory:read`, `<select>` de sucursal (estado local, default unset → EmptyState "Selecciona una sucursal"), toolbar (search debounced + Switch "Solo bajo punto de reorden" + "Asignar producto" gated `inventory:write`), tabla + paginación.
- [x] 7.3 Crear `_blocks/InventoryTable.tsx`: columnas `Código`(mono), `Producto`, `Cantidad`, `Reservado`, `Disponible`(calc cliente), `Punto reorden`, `Acciones`; indicador low-stock cuando `quantity < reorderPoint`; acciones gated `inventory:write`; empty state "Esta sucursal no tiene productos asignados".
- [x] 7.4 Crear `_blocks/InventoryAssignModal.tsx`: selector/typeahead de producto (`GET products?search=`), `quantity`, `reorderPoint`; POST; mapeo 409 (ya asignado) y 400 (inactivo) a inline.
- [x] 7.5 Crear `_blocks/StockAdjustModal.tsx`: input de delta con signo, `reason?`, preview "Stock resultante: N", submit disabled si delta=0; POST `/adjust`; mapeo 409 negative stock a inline.
- [x] 7.6 Crear `_blocks/InventoryEditModal.tsx`: set absoluto `quantity`/`reservedQuantity`/`reorderPoint`, diff submit (PATCH); validación no-negativos.
- [x] 7.7 Implementar "Quitar de sucursal" (DELETE hard) con `ConfirmDialog`, gated `inventory:write`.

## 8. Navegación y hub

- [x] 8.1 Actualizar `app/_components/organisms/NavigationRail/items.ts`: re-etiquetar item `inventory` a "Inventario" con `requires: "inventory:read"`; añadir hijo `products` (`products:read`, icon `inventory_2`, href `/catalogs/products`) como último hijo del flyout `catalogs`.
- [x] 8.2 Actualizar `app/(private)/catalogs/_blocks/CatalogsHubPage.tsx`: añadir sexta tarjeta "Productos" (`inventory_2`, href `/catalogs/products`, permiso `products:read`).

## 9. Tests unitarios

- [x] 9.1 Tests de servicios products (mapeo de errores 404/409/400, parseo de fechas, `fetchImpl`).
- [x] 9.2 Tests de hooks products (`useProducts` cancelación/refresh, `useDepartmentsOptions` caché).
- [x] 9.3 Tests de bloques products clave (`ProductsTable` gating + render %/—, `ProductEditModal` validación/diff/409, tabs de precios/dosificaciones default badge y notice).
- [x] 9.4 Tests de servicios inventory (mapeo errores, no-fetch sin branch).
- [x] 9.5 Tests de bloques inventory (`InventoryTable` low-stock + disponible, `StockAdjustModal` preview/no-op, `InventoryAssignModal` 409/400, gating de acciones).
- [x] 9.6 Tests de `NavigationRail` (item inventory gated, hijo products en flyout) y `CatalogsHubPage` (sexta tarjeta + estados de permiso).

## 10. Verificación end-to-end

- [x] 10.1 `npm run build` y `npm test` en verde.
- [x] 10.2 Verificación manual en navegador con usuario `admin`: CRUD de productos, precios (default único), dosificaciones (precio calculado), inventario (asignar/ajustar/editar/quitar).
- [x] 10.3 Verificación manual con usuario `operator`: confirma asimetría — productos en solo lectura, inventario operable; rail y hub muestran/ocultan correctamente según permisos.
