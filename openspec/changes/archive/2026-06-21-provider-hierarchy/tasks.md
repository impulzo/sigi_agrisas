## 1. Base de datos y Prisma

- [x] 1.1 Agregar campo `providerId String? @map("provider_id")` y relación `provider Provider? @relation(...)` en modelo `Department` en `prisma/schema.prisma`. Agregar `departments Department[]` en modelo `Provider`. FK ON DELETE RESTRICT.
- [x] 1.2 Ejecutar `npx prisma migrate dev --name add_provider_id_to_departments` — verificar que la migración generada agrega columna nullable y FK + índice en `departments(provider_id)`.
- [x] 1.3 Ejecutar `npx prisma generate`.

## 2. Módulo `departments` — Backend

- [x] 2.1 Actualizar `Department` domain entity para incluir `providerId: string | null` y `providerName: string | null`.
- [x] 2.2 Actualizar `DepartmentDto` en `src/modules/departments/application/dto/` con nuevos campos.
- [x] 2.3 Agregar error `ProviderNotFoundOrInactiveError` en `src/modules/departments/domain/errors.ts`.
- [x] 2.4 Actualizar `CreateDepartmentUseCase`: aceptar `providerId` requerido; validar proveedor activo vía nuevo port `ProviderRepository` (solo `findById`); devolver 400 si inactivo/inexistente.
- [x] 2.5 Actualizar `UpdateDepartmentUseCase`: aceptar `providerId?: string | null`; misma validación; `null` permitido.
- [x] 2.6 Actualizar `ListDepartmentsUseCase`: aceptar filtro `providerId?: string`.
- [x] 2.7 Actualizar `PrismaDepartmentRepository.list` para join con `providers` (incluir `providerName`) y filtro `providerId`.
- [x] 2.8 Actualizar `PrismaDepartmentRepository.findById` para include `provider`.
- [x] 2.9 Actualizar `DepartmentsController`: agregar `providerId` al schema Zod de create (requerido) y update (opcional); pasar filtro `providerId` al use case de list.
- [x] 2.10 Actualizar DI container de departments para inyectar `PrismaProviderRepository` (solo findById) al use case.

## 3. Módulo `providers` — Backend

- [x] 3.1 Agregar error `ProviderHasDepartmentsError` en `src/modules/providers/domain/errors.ts`.
- [x] 3.2 Actualizar `DeactivateProviderUseCase` (o handler en controller): antes de soft-delete, contar `departments WHERE provider_id=id AND is_active=true`; si > 0 → lanzar `ProviderHasDepartmentsError`.
- [x] 3.3 Agregar método `countActiveDepartmentsByProvider(providerId: string): Promise<number>` al repositorio de providers o crear método en department repo accesible desde el use case.
- [x] 3.4 Serializar `ProviderHasDepartmentsError` como 409 en `ProvidersController`.

## 4. Módulo `products` — Backend

- [x] 4.1 Actualizar `PrismaProductRepository.list` para join doble `departments → providers`; agregar `providerName: string | null` y `providerId: string | null` al DTO plano. Agregar filtro `providerId` (WHERE `d.provider_id = :providerId`).
- [x] 4.2 Actualizar `PrismaProductRepository.findById` para `include: { department: { include: { provider: true } } }`; agregar `providerName` en el DTO.
- [x] 4.3 Actualizar schema Zod en `ProductsController.list` para aceptar `providerId?: string (UUID)`.
- [x] 4.4 Actualizar `ProductDto` / mappers con nuevos campos.

## 5. Frontend — Departamentos

- [x] 5.1 Crear o actualizar hook `useProvidersOptions` en `app/_hooks/useProvidersOptions.ts` que carga proveedores activos para combobox (fetch de `GET /providers?pageSize=100&includeInactive=false`, caché 60 s).
- [x] 5.2 Actualizar `DepartmentEditModal` para incluir Combobox "Proveedor" (requerido en create; pre-seleccionado en edit; usa `useProvidersOptions`).
- [x] 5.3 Agregar columna "Proveedor" en `DepartmentsTable` (muestra `providerName` o "—").
- [x] 5.4 Actualizar tipos de dominio frontend de departamentos: `providerId`, `providerName` en `DepartmentItem`.
- [x] 5.5 Actualizar servicio `listDepartments` / `createDepartment` / `updateDepartment` en `_logic/services/` para incluir nuevos campos.

## 6. Frontend — Productos

- [x] 6.1 Actualizar `ProductsTable`: agregar columna "Proveedor" (después de "Departamento") con `providerName` o "—".
- [x] 6.2 Actualizar `ProductsPage` toolbar: agregar Combobox "Proveedor" (usa `useProvidersOptions`). Al cambiar proveedor: disparar `GET /departments?providerId=<uuid>&pageSize=100` para repoblar el combobox de Departamento; limpiar filtro departamento.
- [x] 6.3 Actualizar el hook `useDepartmentsOptions` (o crear variante) para aceptar `providerId?: string` y re-fetch cuando cambie.
- [x] 6.4 Actualizar `ProductGeneralTab`: mostrar campo read-only "Proveedor" que se auto-completa al seleccionar departamento (usando `department.providerName` de la lista de opciones de departamentos).
- [x] 6.5 Actualizar `ProductDetailPage`: mostrar "Proveedor" en la sección de información general.
- [x] 6.6 Actualizar tipos frontend de productos: `providerName`, `providerId` en `ProductListItem` y `ProductDetail`.
- [x] 6.7 Actualizar servicio `listProducts` para pasar `providerId` opcional como query param.
