## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Operador con permiso `waybills:write` sobre una venta completada | Como Operador, quiero generar una Carta Porte directamente desde el detalle de una venta completada con cliente, para documentar fiscalmente la entrega de esa mercancía sin tener que capturar de nuevo productos y cantidades en un formulario aparte | - Given una venta `status='completed'` con `customerId` no nulo, When abro `/sales/[id]`, Then veo un botón/sección "Generar Carta Porte" habilitado.<br>- Given la misma venta, When hago clic, Then el formulario llega con `originBranchId = sale.branchId` fijo (no editable) y las líneas prellenadas desde `sale.items` (producto, cantidad) — solo pido clave SAT de bienes transportados y peso por línea antes de timbrar.<br>- Given una venta `status='cancelled'` o `'edited'`, o sin `customerId` (venta de mostrador), When abro `/sales/[id]`, Then el botón no aparece (o aparece deshabilitado con motivo).<br>- Given el cliente de la venta sin domicilio estructurado completo (calle, núm. ext., colonia, municipio, estado, país, C.P.), When intento timbrar, Then el sistema rechaza con el mismo patrón de error que hoy usa `BranchAddressIncompleteError` para sucursales, listando los campos faltantes — sin timbrar CFDI a medias.<br>- Given `/waybills/new` (flujo standalone existente), When lo abro después de este cambio, Then ya NO ofrece la opción "Carta Porte" — solo "Traspaso simple" (branch↔branch, sin CFDI), que sigue funcionando exactamente igual que hoy. | - Mismo permiso ya existente `waybills:write` (sin permiso nuevo) — el botón en la venta se gatea igual que cualquier acción de escritura de waybills.<br>- El `Receiver` del CFDI de traslado sigue siendo el emisor (Agrisas) — sin cambio de comportamiento fiscal existente, sin exponer RFC del cliente en el nodo `Receiver`.<br>- La transacción de creación NO debe mover `branch_inventory` — el stock ya se decrementó al completar la venta; mover inventario de nuevo hacia un "destino" que ahora es un cliente (sin fila de inventario propia) causaría descuadre de stock. |

## Why

Hoy `Waybill` (traspaso/carta porte) es siempre sucursal→sucursal (`originBranchId`/`destinationBranchId`, ambas FK obligatorias a `Branch`), creado únicamente desde `/waybills/new`, sin relación con `Sale`. El cliente pidió explícitamente: "la carta porte debe ser un botón en la venta, y el traspaso queda como un proceso independiente" — es decir, separar los dos casos de uso que hoy comparten el mismo modelo bajo el campo `type`: **traspaso interno entre sucursales propias** (sigue en `/waybills`, sin cambios) y **entrega de una venta al cliente** (nuevo, disparado desde `/sales/[id]`, con Complemento Carta Porte documentando ese traslado al domicilio del cliente).

## What Changes

- **BREAKING** (interno, sin impacto en datos existentes): `type: "carta_porte"` deja de ser sucursal→sucursal y pasa a ser exclusivamente venta→cliente. `/waybills/new` deja de ofrecer la opción "Carta Porte" — solo permite crear traspasos `type: "simple"`.
- Migración: `Customer` gana 8 columnas de domicilio estructurado (mismo patrón ya usado en `Branch`: `addressStreet`, `addressExteriorNumber`, `addressInteriorNumber`, `addressNeighborhood`, `addressMunicipality`, `addressState`, `addressCountry`, `addressZipCode`), todas nullable.
- Migración: `Waybill.destinationBranchId` pasa a nullable; se agregan `destinationCustomerId` (FK nullable a `Customer`) y `saleId` (FK nullable a `Sale`). Invariante nueva: `type='simple'` → `destinationBranchId` requerido, `destinationCustomerId`/`saleId` nulos. `type='carta_porte'` → `destinationCustomerId` y `saleId` requeridos, `destinationBranchId` nulo.
- `CreateWaybillUseCase.executeCartaPorte`: el input deja de pedir `destinationBranchId`/vehículo-como-formulario-libre-sin-contexto y pasa a recibir `saleId`; resuelve `origin = sale.branch`, `destination = sale.customer` (domicilio estructurado), valida venta `completed` con `customerId`, prellenar líneas desde `sale.items`.
- `WaybillRepository.createCompleted`: deja de mover `branch_inventory` cuando `type='carta_porte'` (venta→cliente) — el traspaso `simple` sigue moviendo inventario exactamente igual que hoy.
- `WaybillLookupService`: nuevos métodos para resolver `Sale` (branchId, customerId, status, items) y `Customer` (domicilio estructurado, activo).
- UI: nueva sección/botón "Generar Carta Porte" en `/sales/[id]` (patrón ya usado por `SaleReturnsSection`/`SaleInvoicesSection`), nueva ruta de creación con formulario prellenado; `/waybills/new` simplificado (sin `WaybillTypeToggle`, sin `VehicleDriverForm`/`ScheduleFields` para carta porte — esos campos se mueven al nuevo formulario); `/waybills` (lista) y `/waybills/[id]` (detalle) ajustan la columna "Destino" para mostrar cliente cuando `type='carta_porte'`.
- Sin cambio en `WaybillFacturamaGateway`/`FacturamaRestGateway.stampTraslado` — el `Receiver` sigue siendo el emisor, confirmado explícitamente por el cliente.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `waybills-api`: modelo `Waybill` (invariantes por tipo), `POST /waybills` (rama `carta_porte` reescrita: `saleId` en vez de `destinationBranchId`, sin movimiento de inventario), lookup de `Sale`/`Customer`, validación de domicilio de cliente.
- `waybills-ui`: `/waybills/new` pierde la opción Carta Porte; `/waybills` y `/waybills/[id]` muestran destino-cliente; nueva sección/botón en `/sales/[id]` y nuevo flujo de creación prellenado.
- `customers-api`: `Customer` gana domicilio estructurado (campos nuevos opcionales en el DTO de creación/edición — no rompe el contrato existente, son adicionales).

## Impact

- `prisma/schema.prisma` (migración: `Customer` + `Waybill`)
- `src/modules/waybills/` completo (domain/errors, application/{dto,ports,use-cases}, infrastructure/{repositories,http})
- `src/modules/customers/` (DTO + formulario de edición, campos nuevos opcionales)
- `app/(private)/waybills/` (new/list/detail)
- `app/(private)/sales/_blocks/` (nueva sección `SaleWaybillSection.tsx` o similar)
- Nueva ruta `app/(private)/sales/[id]/waybill/new/` (o equivalente — decisión en design.md)
- Sin cambios en `WaybillFacturamaGateway`, `FacturamaRestGateway.stampTraslado`, ni en el módulo `billing`.
