## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Encargado de logística (`vehicles:write`) | Como encargado de logística, quiero mantener un catálogo de vehículos (placa, configuración vehicular, permiso SCT, aseguradora, póliza) para no volver a capturar esos datos en cada carta porte | - CRUD completo bajo `/catalogs/vehicles`, mismo patrón que proveedores (`code` único inmutable, soft delete vía `isActive`, paginación, `pageSize` máx. 100)<br>- Campos obligatorios: `code`, `plate`, `vehicleConfig`, `permitType`, `permitNumber`, `insuranceCompany`, `insurancePolicy`<br>- `code` duplicado → 409<br>- Eliminar (soft delete) un vehículo referenciado por cartas porte existentes no rompe el historial (`Waybill.vehicleId` con `ON DELETE SET NULL`, snapshot ya persistido en las 6 columnas planas del waybill) | - Sólo `vehicles:write` crea/edita; `vehicles:read` para listar/ver<br>- `code` validado con el mismo regex que el resto de catálogos (`^[A-Z0-9_]{1,32}$`) |
| 2 | Encargado de logística (`drivers:write`) | Como encargado de logística, quiero mantener un catálogo de operadores (nombre, RFC, número de licencia) para no volver a capturarlos en cada carta porte | - CRUD completo bajo `/catalogs/drivers`, mismo patrón que proveedores<br>- Campos obligatorios: `code`, `name`, `licenseNumber`; `rfc` opcional (igual que el operador ya lo permite hoy en el formulario de carta porte)<br>- `code` duplicado → 409<br>- Eliminar (soft delete) un operador referenciado por cartas porte existentes no rompe el historial (`Waybill.driverId` con `ON DELETE SET NULL`) | - Sólo `drivers:write` crea/edita; `drivers:read` para listar/ver<br>- `code` validado con el mismo regex que el resto de catálogos |
| 3 | Usuario que emite carta porte (`waybills:write`) | Como usuario que emite una carta porte, quiero seleccionar el vehículo y el operador de un catálogo en vez de escribir los 9 campos a mano para reducir errores de captura y acelerar el alta | - Dos comboboxes (vehículo, operador) sobre el formulario actual de `VehicleDriverForm`; al seleccionar, autocompletan los campos correspondientes, dejándolos editables<br>- Sigue existiendo la opción de capturar manualmente sin seleccionar del catálogo (compatibilidad con datos que no están en ningún catálogo)<br>- El payload de creación de carta porte guarda el snapshot de los 9 campos como hoy, más opcionalmente `vehicleId`/`driverId` para trazabilidad<br>- Editar los campos autocompletados después de seleccionar no modifica el catálogo, sólo el snapshot de esa carta porte | - Sólo usuarios con `waybills:write` pueden seleccionar y crear la carta porte (permiso ya existente, sin cambios)<br>- Los combobox sólo listan vehículos/operadores `isActive=true` |

Nota: el feature se dividió en 3 historias porque son 2 catálogos independientes (vehículos, operadores) más el consumo de ambos en un tercer flujo (carta porte) — cada uno testeable y desplegable por separado.

## Why

Hoy cada carta porte recaptura a mano 6 campos de vehículo (placa, configuración SAT, tipo y número de permiso SCT, aseguradora, póliza) y 3 de operador (nombre, RFC, licencia) como texto libre en `VehicleDriverForm` — sin autocompletado ni validación contra un catálogo. Si la empresa tiene una flota fija de unidades y operadores recurrentes, esto es recaptura repetida propensa a error (transposición de placas, pólizas vencidas sin control central) y sin forma de auditar qué vehículos/operadores usa el negocio. No existe hoy ningún modelo `Vehicle`/`Driver` en el sistema — el snapshot fiscal ya vive en columnas planas del `Waybill` (correcto para preservar el historial de cada carta porte), pero falta la capa de catálogo que alimente ese snapshot con un clic.

## What Changes

- Dos módulos hexagonales nuevos, `vehicles` y `drivers`, con CRUD completo siguiendo el patrón ya establecido por `providers` (code inmutable, soft delete, paginación, búsqueda).
- `Waybill` gana `vehicleId`/`driverId` (FK nullable, `ON DELETE SET NULL`) — puramente informativos/de trazabilidad; el snapshot fiscal en las 9 columnas planas existentes sigue siendo la fuente de verdad para el CFDI y no se re-resuelve del catálogo.
- `VehicleDriverForm` gana dos comboboxes de selección que autocompletan los campos, sin eliminar la captura manual.

## Capabilities

### New Capabilities

- `admin-vehicles`: CRUD REST de vehículos (`/api/v1/admin/vehicles`).
- `admin-drivers`: CRUD REST de operadores (`/api/v1/admin/drivers`).
- `vehicles-ui`: catálogo `/catalogs/vehicles` (listado + modal crear/editar).
- `drivers-ui`: catálogo `/catalogs/drivers` (listado + modal crear/editar).

### Modified Capabilities

- `waybills-api`: `Waybill aggregate model` y `Create waybill (simple or Carta Porte from a sale)` ganan `vehicleId`/`driverId` opcionales.
- `waybills-ui`: `Generate Carta Porte from a sale` gana los comboboxes de selección de vehículo/operador.

## Impact

- **Prisma**: migración `add_vehicles_and_drivers` — tablas `vehicles`, `drivers`; `waybills.vehicle_id`, `waybills.driver_id` (FK nullable).
- **Backend**: dos módulos nuevos `src/modules/vehicles/`, `src/modules/drivers/` (estructura hexagonal completa, copiando `src/modules/providers/`); `src/modules/waybills/{domain,application,infrastructure}/*` para los nuevos campos opcionales.
- **RBAC**: 4 permisos nuevos (`vehicles:read`, `vehicles:write`, `drivers:read`, `drivers:write`) en `prisma/seed.ts`.
- **Frontend**: 2 rutas de catálogo nuevas (`/catalogs/vehicles`, `/catalogs/drivers`), 2 tarjetas en `CatalogsHubPage`, 2 children en `NavigationRail/items.ts`; `app/(private)/waybills/_blocks/VehicleDriverForm.tsx`, `_logic/hooks/useCreateSaleWaybillForm.ts`, `_logic/schemas/createSaleWaybill.ts`, 2 hooks nuevos `useVehiclesOptions`/`useDriversOptions`.
- **Sin impacto** en el flujo `simple` (traspaso entre sucursales), que no captura vehículo/operador — fuera de alcance.
