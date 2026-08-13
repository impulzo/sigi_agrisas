## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Usuario con permiso `products:write` | Como usuario con permiso `products:write`, quiero seleccionar la unidad de un producto desde un buscador contra el catálogo oficial de claves de unidad del SAT (`c_ClaveUnidad`) al crear o editar un producto, para dejar cada producto listo con una clave de unidad válida para uso fiscal futuro (CFDI), en vez de texto libre inconsistente. | - Given estoy creando o editando un producto, when abro el campo Unidad, then veo un buscador que consulta el catálogo real (2418 claves) por código o descripción (mínimo 2 caracteres).<br>- Given escribo un texto que matchea código o descripción, when aparecen sugerencias, then puedo seleccionar una y el campo queda con el código (ej. `KGM`).<br>- Given no selecciono ninguna sugerencia (sólo tipeo texto libre), when intento guardar, then el formulario rechaza el valor si no matchea el formato de clave SAT (`^[A-Za-z0-9]{2,3}$`) — no permite guardar unidad inventada.<br>- Given un producto ya existente con `unit` en texto libre (dato previo a este cambio), when lo veo en listados/reportes, then se muestra su valor original tal cual (fallback), sin romper ni forzar migración inmediata.<br>- Given un producto tiene clave SAT válida asignada, when se muestra en catálogo, reportes (stock, lista de precios) o kardex, then se muestra la descripción legible ("Kilogramo") en vez del código crudo ("KGM"). | - El endpoint `GET /api/v1/admin/sat-codes/clave-unidad` requiere sesión autenticada pero sin permiso RBAC adicional — catálogo de referencia público dentro del sistema, no dato de negocio sensible (mismo criterio que `sat-codes`/`sat-catalogs` existentes).<br>- La creación/edición del producto en sí sigue exigiendo `products:write` (ya existente); el nuevo campo no abre ninguna ruta de escritura nueva sin permiso.<br>- Validación de formato de la clave ocurre tanto en frontend (UX) como en backend (Zod en `ProductsController`) — el backend nunca confía sólo en la validación de cliente.<br>- El catálogo SAT no tiene FK hacia `products.unit` (columna suelta, igual que `satProductCode`) — un re-seed completo del catálogo no puede romper productos existentes por referencia huérfana. |

## Why

`Product.unit` era texto libre ("kg", "pieza", "saco 25kg") sin relación con ningún catálogo oficial. El SAT exige que el CFDI declare la clave de unidad oficial (`c_ClaveUnidad`) en cada línea de factura, y `InvoiceItem` (módulo de facturación) ya reservaba un campo `satUnitCode` distinto de `unit` que nunca se alimentaba desde el producto real — la facturación siempre mandaba un default hardcodeado (`H87`/`PZA`) sin importar qué se vendiera. Sin un catálogo real y un mecanismo de captura consistente, cualquier intento futuro de conectar la unidad real del producto al timbrado CFDI partiría de datos inconsistentes o inventados por cada usuario al capturar productos.

## What Changes

- Se agrega un cuarto sub-catálogo de referencia SAT (`SatUnitOfMeasure`, tabla `sat_units_of_measure`), mismo patrón read-only/seed-only que los tres catálogos SAT existentes (`sat-codes`, `sat-catalogs`): sin CRUD administrable, sin permiso RBAC adicional, expuesto sólo como búsqueda.
- Seed real de 2418 claves oficiales `c_ClaveUnidad` (CFDI 4.0) desde `phpcfdi/resources-sat-catalogs`, con el mismo pipeline TSV + checksum SHA-256 que el catálogo de productos/servicios (`npm run seed:sat-units`).
- Nuevo endpoint `GET /api/v1/admin/sat-codes/clave-unidad?search=`.
- **BREAKING**: `Product.unit` deja de aceptar texto libre — ahora valida contra el formato de clave SAT (`^[A-Za-z0-9]{2,3}$`) tanto en el controller backend (`ProductsController`) como en el schema Zod del frontend (`product.schema.ts`). Productos existentes con `unit` en texto libre conservan su valor (sin backfill automático) y se siguen mostrando tal cual hasta que se editen con una clave válida.
- El formulario de creación/edición de producto (`ProductGeneralTab`, `ProductEditModal`) reemplaza el input de texto libre de Unidad por el combobox de búsqueda genérico `SatCatalogCombobox` (ya existente en el repo, reutilizado — no se creó un componente bespoke nuevo).
- Se agrega resolución de descripción humana (`unitDescription`) en el catálogo de productos, reporte de stock, reporte de lista de precios por departamento y kardex, para no mostrar códigos SAT crudos al usuario final. Los movimientos de inventario nuevos snapshotean la descripción resuelta, no el código.
- Explícitamente fuera de alcance: no se conecta el código real de unidad hacia el módulo de facturación/CFDI (`StampInvoiceUseCase` sigue usando sus defaults hardcodeados) — se deja como oportunidad futura, sin regresión sobre el comportamiento actual de facturación.

## Capabilities

### New Capabilities
- `sat-unit-of-measure-api`: catálogo de referencia SAT de claves de unidad de medida (`c_ClaveUnidad`) — modelo, seed, endpoint de búsqueda, y resolución de descripción legible (`unitDescription`) para display en catálogo de productos, reportes de inventario y kardex.

### Modified Capabilities
- `products-api`: el campo `unit` de Product cambia su regla de validación de "texto libre 1-32 chars" a "clave SAT válida (`^[A-Za-z0-9]{2,3}$`)", en creación y actualización.

## Impact

- **Backend**: `prisma/schema.prisma` (+modelo `SatUnitOfMeasure`), migración `20260813000001_add_sat_units_of_measure`, `prisma/seeds/{satUnits.ts,lib/satUnitCatalog.ts,data/sat-units.tsv}`, `src/modules/sat-codes/**` (puerto/use-case/repos/controller nuevos), `app/api/v1/admin/sat-codes/clave-unidad/route.ts`, `src/modules/products/infrastructure/http/ProductsController.ts` (regex de `unit`), `src/shared/infrastructure/sat-codes/resolveUnitDescriptions.ts` (nuevo util compartido), repositorios Prisma de products/reports/inventory (resolución de `unitDescription`), `src/shared/infrastructure/inventory/recordInventoryMovement.ts` (snapshot de descripción).
- **Frontend**: `ProductGeneralTab.tsx`, `ProductEditModal.tsx` (combobox de Unidad), `product.schema.ts` (regex), `ProductsTable.tsx`, `InventoryPriceStockTable.tsx`, tipos DTO/domain de products/reports/inventory (+`unitDescription`), `useSatCatalogSearch.ts` (+catálogo `"clave-unidad"`).
- **Tests**: unit tests actualizados (products, reports, inventory) + nuevo `SearchSatUnitsUseCase.test.ts` + e2e Playwright (`admin-products-inventory.spec.ts`) con cobertura del combobox de Unidad SAT — suite completa verde.
- **Sin impacto** en facturación/CFDI, branch scoping, ni en tablas fuera de las listadas.
