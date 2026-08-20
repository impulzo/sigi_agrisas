## 1. Base de datos

- [x] 1.1 `prisma/schema.prisma`: agregado `model Vehicle` (`id`, `code` unique, `plate`, `vehicleConfig`, `permitType`, `permitNumber`, `insuranceCompany`, `insurancePolicy`, `notes?`, `isActive`, `createdAt`, `updatedAt`).
- [x] 1.2 `prisma/schema.prisma`: agregado `model Driver` (`id`, `code` unique, `name`, `rfc?`, `licenseNumber`, `notes?`, `isActive`, `createdAt`, `updatedAt`).
- [x] 1.3 `prisma/schema.prisma`: agregado `Waybill.vehicleId String?` (FK `ON DELETE SET NULL` a `vehicles`) y `Waybill.driverId String?` (FK `ON DELETE SET NULL` a `drivers`).
- [x] 1.4 Migración `20260819030000_add_vehicles_and_drivers` (SQL manual + `prisma migrate deploy`, patrón ya usado en este proyecto para entornos no interactivos) + `npx prisma generate`. Verificado contra Supabase vía MCP: tablas `vehicles`/`drivers` creadas, FKs `waybills.vehicle_id`/`waybills.driver_id` con `ON DELETE SET NULL`.
- [x] 1.5 `prisma/seed.ts`: agregados permisos `vehicles:read`, `vehicles:write`, `drivers:read`, `drivers:write`; asignados admin (ambos), operator (read+write), viewer (read).

## 2. Backend — Módulo `vehicles`

- [x] 2.1 `src/modules/vehicles/domain/entities/Vehicle.ts`.
- [x] 2.2 `src/modules/vehicles/application/{ports/VehicleRepository.ts, dto/{VehicleDto,CreateVehicleRequest,UpdateVehicleRequest,ListVehiclesRequest,ListVehiclesResponse}.ts, mappers/toVehicleDto.ts}`.
- [x] 2.3 `src/modules/vehicles/application/use-cases/{ListVehiclesUseCase,GetVehicleUseCase,CreateVehicleUseCase,UpdateVehicleUseCase}.ts`. **Desviación vs proposal**: spec `admin-vehicles`/`admin-drivers` NO define endpoint DELETE — soft-delete/reactivar es puro `PATCH .../:id {isActive:false|true}` vía `UpdateVehicleUseCase`. No existe `DeleteVehicleUseCase` ni método `softDelete` en el controller (se había implementado inicialmente por copiar `providers` 1:1, corregido tras releer spec).
- [x] 2.4 `src/modules/vehicles/infrastructure/repositories/{PrismaVehicleRepository,InMemoryVehicleRepository}.ts`.
- [x] 2.5 `src/modules/vehicles/infrastructure/http/VehiclesController.ts` (Zod: `code` `^[A-Z0-9_]{1,32}$`, resto de campos requeridos/opcionales según spec).
- [x] 2.6 `src/modules/vehicles/infrastructure/di/container.ts` → exporta `vehiclesController`.
- [x] 2.7 `app/api/v1/admin/vehicles/route.ts` y `app/api/v1/admin/vehicles/[id]/route.ts` delegando al controller.

## 3. Backend — Módulo `drivers`

- [x] 3.1 `src/modules/drivers/domain/entities/Driver.ts`.
- [x] 3.2 `src/modules/drivers/application/{ports/DriverRepository.ts, dto/{DriverDto,CreateDriverRequest,UpdateDriverRequest,ListDriversRequest,ListDriversResponse}.ts, mappers/toDriverDto.ts}`.
- [x] 3.3 `src/modules/drivers/application/use-cases/{ListDriversUseCase,GetDriverUseCase,CreateDriverUseCase,UpdateDriverUseCase}.ts`. Sin `DeleteDriverUseCase` — misma corrección que vehicles (2.3): soft-delete es `PATCH {isActive:false}` vía `UpdateDriverUseCase`.
- [x] 3.4 `src/modules/drivers/infrastructure/repositories/{PrismaDriverRepository,InMemoryDriverRepository}.ts`. Sin chequeo de unicidad de `rfc` (spec: sin constraint de unicidad para drivers, a diferencia de customers/providers).
- [x] 3.5 `src/modules/drivers/infrastructure/http/DriversController.ts` (Zod: `code` `^[A-Z0-9_]{1,32}$`, `rfc` opcional con `optionalRfcSchema` compartido de `@/shared/infrastructure/http/validators`). Métodos `list/getById/create/update` únicamente, sin `softDelete`/DELETE.
- [x] 3.6 `src/modules/drivers/infrastructure/di/container.ts` → exporta `driversController`.
- [x] 3.7 `app/api/v1/admin/drivers/route.ts` (GET/POST) y `app/api/v1/admin/drivers/[id]/route.ts` (GET/PATCH, sin DELETE).

## 4. Backend — Carta porte

- [x] 4.1 `src/modules/waybills/application/dto/WaybillDto.ts`: agregado `vehicleId?: string | null` y `driverId?: string | null` a `vehicle`/`driver` en `CreateCartaPorteWaybillRequest`; agregado `vehicleId`, `driverId` (planos) a `WaybillDto`. También `Waybill` entity y `WaybillRepository.CartaPorteWaybillData` ganaron los mismos 2 campos (no estaban listados explícitamente en el proposal pero son necesarios para que el dato fluya del use case al repo).
- [x] 4.2 `src/modules/waybills/infrastructure/http/WaybillsController.ts`: agregado `vehicleId: z.string().uuid().nullable().optional()` dentro de `vehicle`, `driverId: z.string().uuid().nullable().optional()` dentro de `driver`.
- [x] 4.3 `src/modules/waybills/application/use-cases/CreateWaybillUseCase.ts`: si `vehicleId` viene, resuelve contra `VehicleRepository.findById` (lanza `VehicleNotFoundForWaybillError` → controller 400 `VehicleNotFound`); mismo para `driverId`/`DriverRepository` (`DriverNotFoundForWaybillError` → 400 `DriverNotFound`). Errores nuevos en `src/modules/waybills/domain/errors.ts` (no se reusan los de `vehicles`/`drivers` para mantener cada módulo dueño de sus propios errores, patrón ya usado por `CustomerNotFoundForWaybillError`/`ProductNotFoundForTransferError`). Resolución ocurre tras la validación de direcciones, antes de allocate folio — no altera la validación existente de los campos planos del snapshot.
- [x] 4.4 `src/modules/waybills/infrastructure/repositories/PrismaWaybillRepository.ts`: incluido `vehicleId`/`driverId` en el `create` (dentro del bloque condicional `type==='carta_porte'`) y en `mapWaybill`. `InMemoryWaybillRepository.ts` (test double) también actualizado.
- [x] 4.5 `src/modules/waybills/infrastructure/di/container.ts`: inyectado `PrismaVehicleRepository`/`PrismaDriverRepository` localmente (mismo patrón que `PrismaSaleRepository` en `pos/di`).
- [x] 4.6 `src/modules/waybills/application/mappers/toWaybillDto.ts`: mapea `vehicleId`/`driverId`.
- [x] 4.7 (no listada en el proposal, necesaria para compilar) Actualizados los 6 archivos de test backend que instancian `CreateWaybillUseCase` directamente (`CreateWaybillUseCase.test.ts`, `CreateSimpleWaybillUseCase.test.ts`, `CancelWaybillUseCase.test.ts`, `WaybillsController.{stampPermission,emitterFiscalData,branchScoping}.test.ts`) para pasar `InMemoryVehicleRepository`/`InMemoryDriverRepository`. Agregados 4 tests nuevos en `CreateWaybillUseCase.test.ts` cubriendo persistencia con IDs válidos, `VehicleNotFound`/`DriverNotFound`, y regresión sin IDs (cubre parte de la tarea 8.2). Suite completa `tests/unit/modules/waybills` verde (65/65).

## 5. Frontend — Catálogo de vehículos

- [x] 5.1 `app/(private)/catalogs/vehicles/page.tsx` + `layout.tsx` (Server Component, `metadata`, sin `"use client"`).
- [x] 5.2 `app/(private)/catalogs/vehicles/_blocks/{VehiclesPage,VehiclesTable,VehicleEditModal}.tsx` reutilizando `PageShell`/`CatalogToolbar`/`CatalogPagination`/`CatalogStatusBadge`/`CatalogEmpty`/`CatalogError`/`ConfirmDialog` de `app/(private)/catalogs/_blocks/` y `_components/`. Búsqueda server-side (`?search=`, debounce 300ms, `searchScope="server"`) per spec `vehicles-ui`. Tabla con columnas Código/Placa/Configuración/Permiso SCT/Aseguradora/Estado/Acciones per spec.
- [x] 5.3 `app/(private)/catalogs/vehicles/_logic/{hooks/{useVehicles,useVehicleMutations}.ts, services/{listVehicles,createVehicle,updateVehicle}.ts, schemas/vehicle.schema.ts, types/{api,domain}.ts, errors.ts}`. **Desviación vs proposal**: no hay `services/vehicles.ts` único ni `softDeleteVehicle.ts` — sigue el patrón real de `providers`/`departments` (un archivo por operación) y, al no existir DELETE (ver 2.3), `softDeleteOne` en el hook llama `updateOne(id, {isActive:false})` en vez de un servicio DELETE dedicado.
- [x] 5.4 `app/(private)/catalogs/_blocks/CatalogsHubPage.tsx`: agregada tarjeta "Vehículos" gated por `vehicles:read` (y "Operadores" gated por `drivers:read`, adelantado junto con 6.4 por ser el mismo archivo).
- [x] 5.5 `app/_components/organisms/NavigationRail/items.ts`: agregado child `vehicles` bajo `catalogs`, `requires: "vehicles:read"` (y `drivers`, adelantado junto con 6.5). Agregado ícono `"badge"` a `app/_components/atoms/Icon/icons.ts` (no existía en el union `IconName`).

## 6. Frontend — Catálogo de operadores

- [x] 6.1 `app/(private)/catalogs/drivers/page.tsx` + `layout.tsx`.
- [x] 6.2 `app/(private)/catalogs/drivers/_blocks/{DriversPage,DriversTable,DriverEditModal}.tsx`. RFC sin `*` de requerido, uppercase-forced, regex `^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$` sólo si no vacío (spec `drivers-ui`).
- [x] 6.3 `app/(private)/catalogs/drivers/_logic/{hooks/{useDrivers,useDriverMutations}.ts, services/{listDrivers,createDriver,updateDriver}.ts, schemas/driver.schema.ts, types/{api,domain}.ts, errors.ts}`. Misma desviación que 5.3: `softDeleteOne` vía PATCH, sin servicio DELETE.
- [x] 6.4 `CatalogsHubPage.tsx`: tarjeta "Operadores" gated por `drivers:read` (hecho junto con 5.4).
- [x] 6.5 `NavigationRail/items.ts`: child `drivers` bajo `catalogs`, `requires: "drivers:read"` (hecho junto con 5.5).

## 7. Frontend — Selector en carta porte

- [x] 7.1 `app/_hooks/useVehiclesOptions.ts` y `app/_hooks/useDriversOptions.ts` (patrón de `useFoliosOptions`: lista activa `?pageSize=100&includeInactive=false`, caché 60s, dedupe de promesa).
- [x] 7.2 `app/(private)/waybills/_blocks/VehicleDriverForm.tsx`: agregado `Combobox` "Seleccionar vehículo del catálogo" y "Seleccionar operador del catálogo" sobre cada grupo de campos (filtrado client-side por código/placa o código/nombre, catálogos pequeños). Al seleccionar, llama a los setters existentes (`onVehicleChange`/`onDriverChange`, ya genéricos por key) con los 6/3 valores del catálogo más `vehicleId`/`driverId`.
- [x] 7.3 `app/(private)/waybills/_logic/types/domain.ts`: `VehicleInput`/`DriverInput` ganan `vehicleId?: string | null` / `driverId?: string | null`. También `Waybill` (detalle) ganó los mismos 2 campos planos, espejo del DTO backend.
- [x] 7.4 `app/(private)/waybills/_logic/hooks/useCreateSaleWaybillForm.ts`: estado y payload incluyen `vehicleId`/`driverId`. **Decisión tomada**: se CONSERVA el ID tras editar cualquier campo manualmente — cada setter (`onVehicleChange`/`onDriverChange`) sólo toca su propia key, nunca `vehicleId`/`driverId`, así que no hace falta lógica extra de "limpiar si cambia el campo identificador". El ID sólo se limpia automáticamente si el backend responde `VehicleNotFound`/`DriverNotFound` (ver 7.6).
- [x] 7.5 `app/(private)/waybills/_logic/schemas/createSaleWaybill.ts`: agregado `vehicleId`/`driverId` opcionales (`z.string().uuid().nullable().optional()`) al schema Zod de `vehicle`/`driver`.
- [x] 7.6 Manejo de errores: `app/(private)/waybills/_logic/errors.ts` gana `VehicleNotFoundError`/`DriverNotFoundError`; `services/createWaybill.ts` mapea `400 {error:"VehicleNotFound"|"DriverNotFound"}` a esos errores; `useCreateSaleWaybillForm.ts` los captura y limpia el `vehicleId`/`driverId` correspondiente en el catch (permite reintentar en captura manual), mostrando el mensaje via `error` genérico del hook (no hay campo inline dedicado en el combobox — mismo patrón que el resto de errores del formulario, que se muestran arriba del footer).

## 8. Tests

- [x] 8.1 `tests/unit/modules/{vehicles,drivers}/infrastructure/http/{VehiclesController,DriversController}.test.ts`: CRUD, `code` duplicado (409), `pageSize`>100 (400), `search`<2 chars (400), soft delete/reactivar vía PATCH (confirmado explícitamente que no existe método `softDelete` en el controller). 28 tests, verde.
- [x] 8.2 `CreateWaybillUseCase.test.ts`: agregados "persists vehicleId/driverId...", "rejects an unknown vehicleId...", "rejects an unknown driverId...", "persists null vehicleId/driverId for manual capture... (regresión)".
- [x] 8.3 `CreateWaybillUseCase.test.ts`: "soft-deleting the referenced vehicle/driver afterward does not alter the waybill's snapshot" — crea carta porte con vehicleId/driverId, soft-delete ambos en sus repos, relee el waybill y confirma snapshot + IDs intactos (soft-delete no dispara `ON DELETE SET NULL`, sólo el hard-delete lo haría).
- [x] 8.4 `tests/unit/ui/(private)/waybills/VehicleDriverForm.test.tsx` (nuevo): seleccionar vehículo/operador del combobox autocompleta todos los campos + el ID; editar la placa después NO dispara `onVehicleChange("vehicleId", ...)` (conserva el ID) — estructuralmente no hay ningún import de servicio de catálogo en el componente, por lo que "no PATCH al catálogo" está garantizado por diseño, no sólo por el test.
- [x] 8.5 `tests/unit/ui/_components/organisms/NavigationRail.test.tsx`: nuevo describe "children Vehículos y Operadores bajo Catálogos" — inspecciona las props reales pasadas a `RailFlyout` (mock convertido a `jest.fn()`) para confirmar que `vehicles`/`drivers` aparecen/desaparecen según permiso, y que el botón "Catálogos" seguí visible con sólo uno de los dos permisos.
- [x] 8.6 `tests/unit/ui/design-system/tokens.test.ts` sigue en verde. **Desviación importante**: la primera versión de `VehiclesTable`/`DriversTable`/`VehicleEditModal`/`DriverEditModal` copiaba el patrón raw `<table>`/`<button>` de `departments`/`providers` (que SÍ están en la allowlist como deuda declarada) — el guardrail lo rechazó porque la allowlist "sólo puede encoger, no crecer". Corregido migrando los 4 archivos nuevos a los primitivos reales del design system (`Table/THead/TBody/Tr/Th/Td` de `DataTable`, `Button` de `atoms/Button`) en vez de sumarlos a la allowlist.

## 9. Verificación manual

- [x] 9.1 `/catalogs/vehicles` → alta (UNIT_001), soft delete (desaparece de la lista activa, aparece con badge "Inactivo" al activar "Mostrar inactivos"), reactivar (PATCH, vuelve a "Activo"). Verificado vía Playwright contra dev server real (Node 20, puerto 3000).
- [x] 9.2 `/catalogs/drivers` → alta de OP_001 sin RFC (columna RFC muestra "—", label RFC sin `*`).
- [x] 9.3 `/sales/[id]/waybill/new` → combobox "Seleccionar vehículo del catálogo" autocompletó los 6 campos (placa/config/permiso tipo/número/aseguradora/póliza); combobox de operador autocompletó nombre/licencia. Timbrado exitoso (mock) → `TS-000010`, detalle persiste snapshot idéntico a lo autocompletado. La conservación del ID tras editar manualmente ya estaba cubierta por el test RTL (8.4); estructuralmente garantizada (los setters no tocan `vehicleId`/`driverId`).
- [x] 9.4 No repetido en vivo (cubierto por la suite existente de `CreateWaybillUseCase`/`WaybillsController`, que sigue en verde sin regresiones tras el change — el flujo sin `vehicleId`/`driverId` es idéntico al anterior).
- [x] 9.5 Soft-eliminado UNIT_001 después de usarlo en `TS-000010` → recargado `/waybills/[id]`: placa, config, permiso, aseguradora y póliza siguen mostrando el snapshot original sin cambios.

**Nota de entorno (no bug de código)**: la verificación manual requirió (a) `npm run seed` — la sesión traía un dev server viejo cuyo admin no tenía `vehicles:read`/`drivers:read` porque el seed no se había vuelto a correr tras agregar los permisos; (b) completar el domicilio fiscal estructurado de la sucursal "Matriz" y del cliente de prueba, vacíos en esta base de datos de desarrollo — bloqueaba `BranchAddressIncomplete`/`CustomerAddressIncomplete`, validación preexistente no relacionada con este change; (c) Node 18 en el shell no cumple el mínimo de Next.js (18.17) para `next build`/`next dev` — se usó la instalación nvm de Node 20.20.2.
