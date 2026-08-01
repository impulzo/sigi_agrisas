# Spec Delta: product-kardex-ui

## Purpose

Exponer el Kardex de producto como 4ta tab en el detalle de producto (`/catalogs/products/[id]`), con tabla paginada, filtros de sucursal/fechas y badges visuales.

---

## Requirements

### Requirement: Tab Kardex en detalle de producto

El sistema SHALL añadir una 4ta tab "Kardex" en `ProductDetailPage` que carga movimientos del producto via `GET /api/v1/admin/products/:id/kardex`.

#### Scenario: Tab Kardex visible
- **WHEN** el usuario con `products:read` visita `/catalogs/products/[id]`
- **THEN** se muestra tab "Kardex" al final de los tabs existentes

#### Scenario: Tabla con movimientos
- **WHEN** el backend retorna items
- **THEN** la tabla muestra filas con columnas: Tipo (badge), Fecha, Folio/Ref, Sucursal, Cantidad, P. Unit., Total, Estado

#### Scenario: Badge tipo Venta
- **WHEN** un item es `type='sale'`
- **THEN** muestra badge "Venta" con colores `primary-container`

#### Scenario: Badge tipo Devolución
- **WHEN** un item es `type='return'`
- **THEN** muestra badge "Devolución" con colores `error-container`

#### Scenario: Link a venta
- **WHEN** el usuario hace click en el folio de un item tipo `sale`
- **THEN** navega a `/sales/[saleId]`

#### Scenario: Sin movimientos
- **WHEN** `items` está vacío
- **THEN** muestra estado vacío (CatalogEmpty)

#### Scenario: Error de red
- **WHEN** el fetch falla
- **THEN** muestra CatalogError

#### Scenario: Filtro de sucursal — solo admin
- **WHEN** el usuario tiene `branches:access_all`
- **THEN** se muestra dropdown de sucursal en la barra de filtros

#### Scenario: Filtro de sucursal — oculto para operador
- **WHEN** el usuario NO tiene `branches:access_all`
- **THEN** el dropdown de sucursal NO se renderiza

#### Scenario: Filtro de fechas
- **WHEN** el usuario selecciona `from` y `to`
- **THEN** la tabla se recarga con el filtro aplicado y `page` vuelve a 1

#### Scenario: Paginación
- **WHEN** hay más items que `pageSize`
- **THEN** se muestra CatalogPagination y el usuario puede navegar entre páginas
