## 1. Tipos y servicio

- [x] 1.1 Crear `app/(private)/catalogs/products/_logic/types/kardex.ts` con `KardexSaleItem`, `KardexReturnItem`, `KardexItem`, `KardexPageDto` según design.
- [x] 1.2 Crear `app/(private)/catalogs/products/_logic/services/getProductKardex.ts`:
  - Llama `authFetch` a `/api/v1/admin/products/${productId}/kardex` con query params (`page`, `pageSize`, `branchId?`, `from?`, `to?`).
  - Lanza `UnauthenticatedError`/`ForbiddenError` desde `app/_lib/authFetch.ts` si 401/403.
  - Parseado a `KardexPageDto` y retornado directamente.
  - Acepta `fetchImpl?: typeof fetch` para tests.

## 2. Hook

- [x] 2.1 Crear `app/(private)/catalogs/products/_logic/hooks/useProductKardex.ts`:
  - Estado: `page`, `branchId`, `from`, `to`, `data`, `isLoading`, `error`.
  - `useEffect` re-fetch cuando cambia cualquier dependencia; cancela fetch previo con `AbortController`.
  - Setters: `setPage`, `setBranchId`, `setFrom`, `setTo`. Al cambiar filtro → resetear `page=1`.
  - Expone `{ data, isLoading, error, page, setPage, branchId, setBranchId, from, setFrom, to, setTo }`.
- [x] 2.2 Crear `tests/unit/ui/catalogs/products/useProductKardex.test.ts`:
  - Carga correcta con `fetchImpl` mock → `data` seteada.
  - Error HTTP → `error` seteada.
  - Cambiar `from` resetea `page` a 1.

## 3. Bloque `ProductKardexTab`

- [x] 3.1 Crear `app/(private)/catalogs/products/_blocks/ProductKardexTab.tsx`:
  - Props: `productId: string`.
  - Usa `useProductKardex(productId)`.
  - Usa `useCurrentUser().can("branches:access_all")` para mostrar/ocultar dropdown de sucursal.
  - Si `can === "loading"` → ocultar dropdown (no mostrar nada extra, no bloquear).
  - Renderiza barra de filtros:
    - Dropdown de sucursal (select con opción "Todas" + lista de sucursales) — sólo si `canAll === true`.
    - Dos `<input type="date">` para `from` y `to`.
  - Renderiza `<CatalogError>` si `error`.
  - Renderiza `<CatalogEmpty>` si `!isLoading && data?.items.length === 0`.
  - Renderiza skeleton (8 filas con `animate-pulse bg-surface-variant h-8 rounded`) si `isLoading`.
  - Renderiza `<table>` con columnas: Tipo, Fecha, Folio/Ref, Sucursal, Cantidad, P. Unit., Total, Estado.
  - Badge tipo "Venta" (`bg-primary-container text-on-primary-container`) y "Devolución" (`bg-error-container text-on-error-container`).
  - Folio: `<Link href={/sales/${item.saleId}}>` para tipo `sale`; para tipo `return`, celda Folio muestra "—" y hay columna Ref Devolución que enlaza a `/returns/${item.returnId}`.
  - Cantidad formateada a 2 decimales (`parseFloat(item.quantity).toFixed(2)`).
  - Precio y total con `formatCurrency` de `app/_lib/formatters.ts`.
  - `<CatalogPagination>` debajo de la tabla.
- [x] 3.2 Para las sucursales en el dropdown: llamar `GET /api/v1/admin/branches?pageSize=100` con `authFetch` en un `useEffect` local dentro del componente (o extraer en mini hook). No necesita hook global nuevo.

## 4. Integración en `ProductDetailPage`

- [x] 4.1 Modificar `app/(private)/catalogs/products/_blocks/ProductDetailPage.tsx`:
  - Añadir `"kardex"` al tipo `Tab`: `type Tab = "general" | "prices" | "dosifications" | "kardex"`.
  - Añadir `{ id: "kardex", label: "Kardex" }` al array `tabs`.
  - Añadir condicional: `{tab === "kardex" && <ProductKardexTab productId={product.id} />}`.
  - Importar `ProductKardexTab`.

## 5. Tests de componente

- [x] 5.1 Crear `tests/unit/ui/catalogs/products/ProductKardexTab.test.tsx`:
  - Mock de `useProductKardex` → estado cargando → muestra skeleton.
  - Mock con `data` → muestra filas de la tabla.
  - Mock con `error` → muestra `CatalogError`.
  - Mock con `items: []` → muestra `CatalogEmpty`.
  - Item tipo `sale` → badge "Venta", folio con link a `/sales/...`.
  - Item tipo `return` → badge "Devolución".

## 6. Verificación

- [x] 6.1 `npm run build` sin errores de tipos.
- [x] 6.2 `npm test -- --testPathPattern=ProductKardex` pasa.
- [x] 6.3 Verificar en el browser (dev server): abrir `/catalogs/products/[id]` → tab "Kardex" visible → tabla carga con datos reales.
- [x] 6.4 Como operador (sin `branches:access_all`): dropdown de sucursal NO visible; datos filtrados a su sucursal.
- [x] 6.5 Como admin (con `branches:access_all`): dropdown de sucursal SÍ visible; seleccionar sucursal filtra la tabla.
- [x] 6.6 Filtros de fecha: seleccionar `from` y `to` filtra correctamente; cambiar filtro resetea a page 1.
