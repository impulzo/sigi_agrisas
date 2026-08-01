## Context

Backend `waybills-api` especificado en `add-carta-porte` (no implementado aún — esta UI depende de sus contratos, no de código existente). La UI debe respetar las **reglas de capas frontend** del proyecto: `_blocks/` y `_components/` presentational (sin `fetch`/`storage`/`router`/validación inline); `_logic/services/` encapsulan `authFetch`; `_logic/hooks/` orquestan estado+validación+HTTP+navegación; `page.tsx` Server Components que exportan `metadata` y gatean por permisos en el cliente vía `useCurrentUser().can()`.

Contratos backend relevantes (de `add-carta-porte`'s `specs/waybills-api/spec.md`):

- `GET /api/v1/admin/waybills?page&pageSize&branchId?&status?&from?&to?` → `{ items: WaybillDto[], total, page, pageSize }`. `branchId` matchea origen O destino.
- `POST /api/v1/admin/waybills` `{ originBranchId, destinationBranchId, vehicle:{plate,config,permitType,permitNumber,insuranceCompany,insurancePolicy}, driver:{name,rfc?,licenseNumber}, distanceKm, departureAt, arrivalAt, items:[{productId?,description,satBienesTranspCode,satUnitCode,quantity,weightKg,isHazardousMaterial?,hazardousMaterialCode?}] }` → `201 WaybillDto` (timbrado atómico, sin borrador).
- `GET /api/v1/admin/waybills/:id` → `WaybillDto` con items, ubicaciones snapshoteadas, vehículo, operador.
- `POST /api/v1/admin/waybills/:id/cancel` `{ reason }` → `WaybillDto`.
- `GET /api/v1/admin/waybills/:id/download?format=pdf|xml` → binario.

Errores HTTP a normalizar: `400 InvalidBranchPair`, `400 BranchAddressIncomplete {branchId,missingFields}`, `409 InsufficientStockAtOrigin {productId}`, `422 FacturamaStampError {detail}`, `409 WaybillAlreadyCancelled`, `409 WaybillNotStamped`, `404 WaybillNotFound`, `403 Forbidden`.

La change backend también extiende `BranchDto` con 8 campos de dirección estructurada (`admin-branches` spec) — esta UI **no** los edita (eso es responsabilidad de `/catalogs/branches`, fuera de alcance aquí); solo enlaza a esa página cuando el backend reporta `BranchAddressIncomplete`.

## Goals / Non-Goals

**Goals**
- Sección `/waybills` con listado/detalle/creación/cancelación/descarga.
- Un único modo de creación (a diferencia de `billing-ui` que tiene dos): traspaso standalone, siempre timbrado atómico al enviar.
- Paridad de patrones con `returns-ui` (listado/detalle/toolbar/branch scoping por recurso) y POS (selector de productos).
- Selector de sucursal origen/destino con exclusión mutua en UI.

**Non-Goals**
- Edición de sucursales (domicilio estructurado) — pertenece a `/catalogs/branches`, fuera de esta change.
- Catálogo maestro de vehículos/operadores — decisión de negocio ya tomada de captura libre; no hay combobox con historial.
- CFDI de Ingreso con Carta Porte — fuera de alcance del backend, por lo tanto fuera de la UI también.
- Edición de un traspaso ya creado — solo cancelar (no existe "editar" en backend).

## Decisions

### Estructura de archivos
```
app/(private)/waybills/
├── page.tsx                 # SC, metadata, gate waybills:read
├── new/page.tsx             # SC, gate waybills:write
├── [id]/page.tsx             # SC, gate waybills:read
├── _blocks/
│   ├── WaybillsListPage.tsx  WaybillsToolbar.tsx  WaybillsTable.tsx
│   ├── WaybillStatusBadge.tsx  WaybillsEmpty.tsx
│   ├── WaybillDetailPage.tsx  WaybillItemsTable.tsx  WaybillMetaPanel.tsx  WaybillActionsBar.tsx
│   ├── CancelWaybillModal.tsx
│   ├── NewWaybillPage.tsx
│   ├── BranchPairSelector.tsx      # origen/destino con exclusión mutua
│   ├── WaybillItemsForm.tsx  WaybillLineRow.tsx
│   ├── VehicleDriverForm.tsx       # campos libres, sin catálogo
│   └── ScheduleFields.tsx          # salida/llegada/distancia
├── _logic/
│   ├── types/{api.ts,domain.ts}
│   ├── schemas/{createWaybill.ts,cancelWaybill.ts}
│   ├── services/{listWaybills,getWaybill,createWaybill,cancelWaybill,downloadWaybillFile,index}.ts
│   ├── hooks/{useWaybillsList,useWaybillDetail,useWaybillMutations,useCreateWaybillForm}.ts
│   └── errors.ts
```

### Reuso (no reinventar)
- **Productos**: `ProductCatalogPanel`/`ProductCatalogTable` del POS para agregar líneas de mercancía; cada línea agrega inputs propios de Carta Porte no presentes en POS (`weightKg`, `satBienesTranspCode`, `isHazardousMaterial`) vía `WaybillLineRow`.
- **Sucursales**: reusar el listado de `Branch` ya disponible (mismo patrón que `useHeadquarters`/selector de sucursal en `providers`/POS) para poblar los combos de origen/destino; NO se crea un catálogo nuevo de sucursales.
- Shells/UX: `CatalogToolbar`, `CatalogPagination`, `EmptyState`, `ConfirmDialog`, `Badge`.

### Selector origen/destino con exclusión mutua
`BranchPairSelector` mantiene un solo estado `{ originBranchId, destinationBranchId }`; el combo de destino filtra out la opción ya elegida como origen (y viceversa) en el propio render, no solo con validación al submit — evita el error 400 `InvalidBranchPair` en el caso más común en vez de solo mostrarlo.

### Errores tipados (`_logic/errors.ts`)
`InvalidBranchPairError`, `BranchAddressIncompleteError(branchId, missingFields)` (el hook arma un mensaje "Completa el domicilio de <sucursal> en Catálogos → Sucursales" con link a `/catalogs/branches`), `InsufficientStockAtOriginError(productId)` (el hook resuelve el nombre de producto desde las líneas ya cargadas en el formulario y resalta esa fila), `FacturamaStampError(detail)`, `WaybillAlreadyCancelledError`, `WaybillNotFoundError`. Los services mapean status+body→error; los hooks traducen a mensajes ES en UI, preservando el estado del formulario en cualquier error (nunca se limpia el form en un fallo).

### Descarga PDF/XML
`downloadWaybillFile(id, format)` — mismo patrón que `billing-ui`: `authFetch` → `blob()` → filename desde `Content-Disposition` (fallback `carta-porte-<uuid>.<ext>`) → `URL.createObjectURL` + `<a download>`.

### Branch scoping (variante de dos sucursales)
Listado: sin `branches:access_all`, el filtro de sucursal se auto-fija a `x-user-branch-id` (backend ya filtra por origen O destino); columna/filtro "Sucursal" explícito solo visible con bypass. Detalle/cancelar/descarga: backend aplica scope contra origen O destino; un 403 se traduce a página de error genérica (no hay guard de matriz — Carta Porte no lo requiere, igual que `returns`).

### Gating por permisos (cliente, defensa en profundidad)
- `/waybills`, `/waybills/[id]`: `waybills:read`.
- `/waybills/new`, submit del formulario: `waybills:write`.
- Botón "Cancelar" en `WaybillActionsBar`: `waybills:cancel`, oculto (no deshabilitado) sin el permiso, y también oculto si `status !== 'completed'`.
- Optimista durante `"loading"`; oculta/redirige a `/dashboard` cuando `false`.

### NavigationRail
Nuevo `RailItem { key: "waybills", href: "/waybills", icon: "local_shipping", label: "Traspasos", requires: "waybills:read" }`, ubicado tras `inventory` (agrupación temática: movimientos de inventario).

## Risks / Trade-offs

- **Formulario largo en una sola pantalla** (sucursales + líneas + vehículo + operador + horario, todo antes de timbrar sin borrador): riesgo de perder datos capturados si el backend rechaza tarde (stock insuficiente en la última línea, por ejemplo). Mitigación: ningún error limpia el formulario; todos los hooks preservan estado y solo marcan el campo/línea ofensiva.
- **Domicilio de sucursal fuera del alcance de esta UI**: si un usuario intenta crear un traspaso con una sucursal sin domicilio completo, se entera solo al enviar (400) y debe navegar a otra sección para corregirlo. Aceptado — completar domicilios es responsabilidad de `admin-branches`/`catalogs-ui`, no de este flujo.
- **Captura libre de vehículo/operador**: sin autocompletado ni validación de formato de placa/licencia más allá de "requerido". Aceptado, mismo criterio del backend (decisión de negocio v1).
- **Mock Facturama** (`FACTURAMA_MOCK=true`): en dev el CFDI es simulado; la UI no distingue visualmente mock de real (mismo criterio que `billing-ui`).

## Migration Plan

Aditivo y sin estado persistido nuevo. Orden: (1) tipos+schemas+services+errores, (2) hooks, (3) blocks listado/detalle, (4) formulario de creación (selector sucursales → líneas → vehículo/operador → horario), (5) cancelación + descarga, (6) NavigationRail, (7) tests UI (jsdom/RTL). Reversible borrando `app/(private)/waybills/` y revirtiendo el punto de NavigationRail. **Bloqueada hasta que `add-carta-porte` esté implementado y sus endpoints existan.**

## Open Questions

- ¿Subconjunto de claves SAT (`c_ClaveProdServCP`, `c_ConfigAutotransporte`) se ofrece como select con opciones comunes agrícolas (granos, fertilizantes, agroquímicos, maquinaria) o input de texto libre en v1? Se arranca con texto libre + placeholder de ejemplo; refinable sin cambio estructural una vez se conozca el catálogo de mercancías real del negocio.
