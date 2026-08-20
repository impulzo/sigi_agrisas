## Context

`Waybill` (`prisma/schema.prisma:772-841`) es hoy un único modelo para dos casos de uso distintos, diferenciados solo por `type` (`"simple" | "carta_porte"`): ambos son sucursal→sucursal (`originBranchId`/`destinationBranchId`, FKs obligatorias a `Branch`), creados únicamente desde `/waybills/new` (`NewWaybillPage.tsx`), sin ningún vínculo a `Sale`. `CreateWaybillUseCase.execute()` (`src/modules/waybills/application/use-cases/CreateWaybillUseCase.ts:53-59`) resuelve el par de sucursales una sola vez (`resolveBranchPair`) y bifurca a `executeSimple`/`executeCartaPorte`. `WaybillRepository.createCompleted` (`.../ports/WaybillRepository.ts:99-108`) mueve `branch_inventory` de origen a destino **para ambos tipos**, dentro de la misma transacción que timbra (solo `carta_porte`).

El cliente pidió separar esto: `simple` sigue como traspaso interno (sin tocar), `carta_porte` pasa a documentar la entrega de una venta a su cliente, disparado con un botón en `/sales/[id]`. Responde a la única fila de la Historia de Usuario en `proposal.md`.

## Goals / Non-Goals

**Goals:**
- `type='carta_porte'` pasa a ser exclusivamente venta→cliente: origen = `sale.branchId`, destino = domicilio estructurado del cliente de esa venta.
- `type='simple'` sigue sucursal→sucursal, sin ningún cambio de comportamiento, schema, ni UI.
- La creación de una Carta Porte de venta NO mueve `branch_inventory` (el stock ya se movió al completar la venta).
- Timbrado CFDI sin cambios en el `Receiver` (sigue siendo el emisor) — confirmado explícitamente por el cliente.

**Non-Goals:**
- No se modifica `WaybillFacturamaGateway` ni `FacturamaRestGateway.stampTraslado` — la función `buildLocationPayload` ya es agnóstica de si el origen/destino viene de `Branch` o `Customer` (recibe `WaybillLocationInput` genérico); solo cambia quién llena ese objeto en el use case.
- No se permite iniciar una Carta Porte de venta desde `/waybills/new` — es exclusivamente desde `/sales/[id]`. Tampoco se permite crear un traspaso `simple` desde la venta.
- No se valida ni se sincroniza el domicilio estructurado nuevo de `Customer` con el campo `address` (texto libre) ya existente — ambos coexisten; `address` sigue siendo lo que se muestra en el ticket/factura, el domicilio estructurado es exclusivo para el Complemento Carta Porte.
- No se permite más de una Carta Porte activa por venta en esta primera versión — no hay unicidad enforced a nivel de constraint (una venta con entregas parciales podría necesitar varias); si el cliente confirma que debe ser 1:1 estricto, es un ajuste menor de una constraint `@@unique([saleId])` condicional, no un rediseño.

## Decisions

**D1 — Migración `Customer`: 8 columnas de domicilio estructurado, mismo patrón que `Branch`.**
`addressStreet`, `addressExteriorNumber`, `addressInteriorNumber`, `addressNeighborhood`, `addressMunicipality`, `addressState`, `addressCountry` (default `"MEX"`, igual que `Branch.addressCountry`), `addressZipCode` — todas `String? @db.VarChar(n)` con los mismos anchos que `Branch` usa hoy (150/20/20/100/100/3/3/5). Nombradas igual que en `Branch` (sin prefijo distinto) para que `toAddressSnapshot`/`validateAddressComplete` en el use case puedan generalizarse con una interfaz común (`AddressSource { addressStreet, addressExteriorNumber, ... }`) implementada tanto por `BranchForWaybill` como por el nuevo `CustomerForWaybill`.

**D2 — Migración `Waybill`: `destinationBranchId` nullable + `destinationCustomerId` + `saleId`, sin tabla nueva.**
Alternativa descartada: crear un modelo `SaleWaybill` separado, o una tabla polimórfica genérica `WaybillDestination`. Rechazada — es sobre-ingeniería para 2 variantes conocidas y estables; el patrón "columnas nullable + invariante por tipo" ya es el que usa el propio `Waybill` para todos los campos específicos de `carta_porte` (`vehiclePlate`, `driverName`, etc., todos nullable, todos poblados solo cuando `type='carta_porte'`). Se mantiene consistencia.

```prisma
originBranchId      String   // sin cambio — ambos tipos siempre tienen origen sucursal
destinationBranchId String?  // requerido solo si type='simple'
destinationCustomerId String? // requerido solo si type='carta_porte' — FK a Customer, Restrict
saleId               String?  // requerido solo si type='carta_porte' — FK a Sale, Restrict
```
Invariante validada en **application** (no vía CHECK constraint de Postgres, siguiendo el patrón ya usado por el resto de invariantes por-tipo de este mismo modelo, que tampoco tienen CHECK constraints — se confía en el use case como único punto de escritura).

**D3 — `WaybillLookupService`: 2 métodos nuevos, mismo patrón que `findBranch`/`findProduct`.**
```ts
findSale(saleId: string): Promise<SaleForWaybill | null>;
// { id, branchId, customerId: string | null, status: string, items: { productId, quantity, productNameSnapshot }[] }
findCustomer(customerId: string): Promise<CustomerForWaybill | null>;
// { id, name, isActive, addressStreet, ...los mismos 8 campos que BranchForWaybill }
```
`SaleForWaybill.items` reusa el patrón de snapshot ya presente en `SaleItem` (no requiere joins nuevos más allá de lo que `PrismaSaleRepository` ya expone).

**D4 — `CreateWaybillUseCase.executeCartaPorte` reescrito: recibe `saleId`, no `destinationBranchId`.**
Nuevo flujo:
1. `sale = lookupService.findSale(saleId)` → 404-equivalente (`WaybillSaleNotFoundError`) si no existe.
2. Validar `sale.status === 'completed'` → `SaleNotCompletedError` si no.
3. Validar `sale.customerId !== null` → `SaleHasNoCustomerError` si no (venta de mostrador).
4. `origin = lookupService.findBranch(sale.branchId)` (reusa el método ya existente).
5. `customer = lookupService.findCustomer(sale.customerId)` → `CustomerNotFoundForWaybillError` si no existe/inactivo.
6. `validateAddressComplete(customer)` (misma función genérica de D1) → `CustomerAddressIncompleteError(customerId, missingFields)` — mismo patrón que `BranchAddressIncompleteError` hoy.
7. Ítems: si el body NO envía `items[]`, prellenar desde `sale.items` (producto + cantidad + snapshot); el usuario completa `satBienesTranspCode`/`weightKg` client-side antes de enviar (igual que hoy exige el schema Zod `createCartaPorteItemSchema`, sin cambios en esa validación). El use case sigue recibiendo `items[]` completos en el request — el prellenado es responsabilidad de la UI (D9), no del backend.
8. `data.destinationBranchId = null`, `data.destinationCustomerId = customer.id`, `data.saleId = sale.id`.
9. `stampPayload.destination = toAddressSnapshot(customer)` (misma función genérica).

**D5 — `WaybillRepository.createCompleted`: skip de movimiento de inventario cuando `type='carta_porte'`.**
La implementación Prisma (`PrismaWaybillRepository.createCompleted`) hoy mueve inventario incondicionalmente. Se condiciona: `if (data.type === 'simple') { moverInventario(origin, destination) }` — para `carta_porte` (venta→cliente) se omite ese paso por completo. El resto de la transacción (allocate folio, insertar `waybills`+`waybill_items`, invocar `stamp`) no cambia.

**D6 — Branch scoping: `carta_porte` solo valida `originBranchId` (ya no hay `destinationBranchId`).**
`enforceEitherBranchScope` (`WaybillsController.ts:112-130`) se mantiene sin cambios para `simple`. Para `carta_porte`, como ya no existe un `destinationBranchId` que comparar, el check se reduce a `userBranchId === sale.branchId` (equivalente a "origin-only"). Se implementa como una segunda función `enforceOriginBranchScope` reusada también por el nuevo endpoint, o ajustando `enforceEitherBranchScope` para aceptar `destinationBranchId: string | null`.

**D7 — Endpoint: `POST /waybills` se mantiene único, discriminado por `type` en el body (sin endpoint nuevo).**
Alternativa descartada: `POST /sales/:id/waybill`. Rechazada — el resto del CRUD de waybills (`GET /waybills`, `GET /waybills/:id`, cancelación) ya opera sobre el recurso `Waybill` unificado; crear un endpoint paralelo duplicaría lógica de validación/timbrado. El schema Zod `createCartaPorteWaybillSchema` cambia `destinationBranchId` → `saleId`; `originBranchId` se vuelve **opcional/ignorado** en el body para `carta_porte` (se resuelve del `sale`, no se confía en lo que mande el cliente) — se documenta como campo no aceptado (`.strict()` como ya hace `createSimpleWaybillSchema`) para que un `originBranchId` inesperado en el body dispare `400` en vez de ser ignorado silenciosamente.

**D8 — UI: nueva sección `SaleWaybillSection.tsx` en `/sales/[id]`, patrón `SaleReturnsSection`.**
`showCta = sale.status === 'completed' && sale.customerId !== null && can('waybills:write') === true`. CTA navega a una **subruta anidada** `/sales/[id]/waybill/new` (mismo patrón que `/sales/[id]/returns/new`, preferido sobre el patrón de query-param de `billing` porque el formulario resultante es sustancialmente distinto del genérico de `/waybills/new` — no tiene sentido reusar esa página condicionalmente).

**D9 — Nuevo formulario `CreateSaleWaybillPage`: reusa `WaybillItemsForm`/`VehicleDriverForm`/`ScheduleFields` ya existentes, sin `BranchPairSelector`.**
Carga `sale.items` vía el mismo endpoint ya usado por `/sales/[id]` (`GET /api/v1/admin/sales/:id`), los mapea a filas prellenadas de `WaybillItemsForm` (producto+cantidad fijos desde snapshot, SAT/peso en blanco para completar). Origen mostrado como texto fijo (nombre de sucursal de la venta, no editable). Destino mostrado como texto fijo (nombre + código del cliente) — sin selector, a diferencia de `BranchPairSelector`.

**D10 — `/waybills/new` simplificado: se retira `WaybillTypeToggle` y la rama `carta_porte` completa.**
El formulario pasa a ser exclusivamente el de `simple` (fecha + notas + líneas de catálogo). `VehicleDriverForm`/`ScheduleFields` dejan de usarse ahí (se reusan en el nuevo formulario de D9). `useCreateWaybillForm.ts` pierde el estado `type` (ya no hay toggle) y todo el branching asociado.

**D11 — `/waybills` (lista) y `/waybills/[id]` (detalle): columna "Destino" condicional por `type`.**
`type='simple'` → nombre de sucursal (sin cambio). `type='carta_porte'` → nombre + código del cliente (`WaybillSummaryDto`/`WaybillDto` ganan `destinationCustomerName`/`destinationCustomerCode` opcionales, poblados por el mapper cuando `destinationCustomerId` no es null).

## Risks / Trade-offs

- **[Riesgo]** Ventas con `customerId` pero cliente sin domicilio estructurado capturado (dato nuevo, ningún cliente existente lo tiene hoy) → todas las Cartas Porte fallarán con `CustomerAddressIncompleteError` hasta que el catálogo de clientes se actualice. → **Mitigación:** aceptado — mismo patrón que `Branch` tuvo al lanzar Carta Porte originalmente (`add-carta-porte/design.md`); es un catálogo maestro que se captura una vez por cliente relevante, no por venta. El formulario de creación de Carta Porte de venta debe mostrar el error de forma clara (qué campos faltan en qué cliente) para que el operador sepa qué corregir en `/catalogs/customers`.
- **[Riesgo]** `destinationBranchId` nullable rompe cualquier código que asuma no-null (ej. el mapper `toWaybillDto`, reportes, o queries que hagan join directo sin chequear `type`). → **Mitigación:** se audita en `tasks.md` cada lugar que lea `destinationBranchId` (grep exhaustivo) antes de cerrar el change — la mayoría ya está gateada por `type` en la UI actual (`WaybillDetailPage` ya bifurca por tipo para los campos de vehículo/operador), así que el patrón de "chequear `type` antes de leer campos específicos" ya existe y se extiende.
- **[Riesgo]** No hay unicidad `saleId` → una venta podría terminar con múltiples Cartas Porte activas sin que el sistema lo prevenga. → **Mitigación:** documentado como Non-Goal explícito; si el cliente confirma que debe ser 1:1, es un ajuste de constraint + un chequeo adicional en el use case (`findWaybillBySaleId`), no un rediseño — se deja fuera del alcance inicial para no bloquear sobre una decisión de negocio no confirmada.

## Migration Plan

1. Migración Prisma aditiva (`Customer` + `Waybill`) — todas las columnas nuevas nullable, sin backfill requerido, sin downtime.
2. Deploy de backend (use case + repository + controller) — compatible hacia atrás con datos existentes: los `Waybill` `type='simple'` ya en BD no se tocan (`destinationCustomerId`/`saleId` quedan `null`, `destinationBranchId` sigue poblado).
3. Deploy de UI — `/waybills/new` simplificado, nueva sección en `/sales/[id]`.
4. Sin rollback de datos necesario si se revierte el deploy — las columnas nuevas nullable no afectan filas existentes ni el flujo `simple`.
