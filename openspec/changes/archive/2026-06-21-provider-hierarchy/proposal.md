## Why

El catálogo de departamentos existe de forma independiente sin asociación a proveedores. Esto impide organizar jerárquicamente el catálogo de productos bajo la estructura real del negocio (proveedor → departamento → producto), dificulta el filtrado cruzado y no expone la trazabilidad de proveedor en las vistas de productos. Se establece la jerarquía Proveedor → Departamento → Producto vinculando la FK `provider_id` en la tabla `departments`.

## What Changes

- Migración Prisma: columna `provider_id TEXT` nullable en `departments`; FK a `providers.id` ON DELETE RESTRICT.
- `DepartmentDto` agrega `providerId: string | null` y `providerName: string | null` (join en lectura).
- `POST /departments` requiere `providerId` (activo); `PATCH /departments/:id` acepta `providerId`.
- `GET /departments?providerId=<uuid>` — filtro nuevo.
- Validación: `providerId` debe referenciar un proveedor activo; 400 si inactivo o no encontrado.
- Provider soft-delete: si tiene departamentos activos → 409 `ProviderHasDepartmentsError`.
- `ProductDto` (list y detail) agrega `providerName: string | null` (join department → provider).
- `GET /products?providerId=<uuid>` — filtro nuevo en el listado de productos.
- UI departamentos: combobox de proveedor en `DepartmentEditModal`; columna "Proveedor" en `DepartmentsTable`.
- UI productos: filtro por proveedor en `ProductsPage`; mostrar proveedor en `ProductsTable` y `ProductDetailPage`; campo proveedor read-only en `ProductGeneralTab` derivado del departamento seleccionado.

## Capabilities

### New Capabilities
- `provider-hierarchy`: Jerarquía Proveedor → Departamento — migración, validaciones de dominio, filtros cruzados.

### Modified Capabilities
- `admin-departments`: Agrega `providerId`/`providerName` en DTO, filtro `?providerId`, validación en create/update.
- `admin-providers`: Agrega validación de soft-delete: 409 si el proveedor tiene departamentos activos.
- `products-api`: Agrega `providerName` en DTO, filtro `?providerId` en lista.
- `products-ui`: Agrega filtro por proveedor, columna "Proveedor" en tabla, campo derivado en formulario.

## Impact

- Nueva migración: `add_provider_id_to_departments`
- Modificado: `prisma/schema.prisma` (relación `Department.provider` y `Provider.departments`)
- Modificado: `src/modules/departments/` (domain, application, repository, controller)
- Modificado: `src/modules/providers/` (controller: guard soft-delete)
- Modificado: `src/modules/products/` (repository: join proveedor; filtro providerId)
- Modificado: `app/(private)/catalogs/departments/` (UI)
- Modificado: `app/(private)/catalogs/products/` (UI)
