## 1. Migración de base de datos

- [x] 1.1 `prisma/schema.prisma` — `Customer` ganó las 8 columnas de domicilio estructurado.
- [x] 1.2 `prisma/schema.prisma` — `Waybill.destinationBranchId` nullable; agregados `destinationCustomerId`/`saleId` + índices + relaciones (`Customer.waybills`, `Sale.waybills`).
- [x] 1.3 Migración aplicada contra Supabase en vivo (`20260817000001_add_carta_porte_sale_link`). Nota operativa: `_prisma_migrations` no existía en la BD (drift entre estado local del CLI y BD real, detectado y verificado vía Supabase API antes de tocar nada) — se hizo baseline de los 40 migrations previos (`migrate resolve --applied`, solo metadata, sin re-ejecutar DDL) y luego `migrate deploy` para aplicar la migración nueva. `npx prisma generate` corrido.
- [x] 1.4 Verificado vía Supabase directo: tabla `waybills` está vacía (0 filas) — sin riesgo de romper datos existentes, no se requiere backfill.

## 2. Dominio y puertos (`src/modules/waybills/`)

- [x] 2.1 `domain/errors.ts`: agregados los 5 errores nuevos.
- [x] 2.2 `domain/entities/Waybill.ts`: `destinationBranchId` → `string | null`; agregados `destinationCustomerId`/`saleId`.
- [x] 2.3 `application/ports/WaybillLookupService.ts`: agregados `CustomerForWaybill`, `SaleForWaybill`, `SaleItemForWaybill`, métodos `findSale`/`findCustomer`.
- [x] 2.4 Interfaz `AddressSource` extraída (8 campos de domicilio) en el mismo archivo de puertos; `BranchForWaybill`/`CustomerForWaybill` la extienden. Generalización de `toAddressSnapshot`/`validateAddressComplete` pendiente de aplicar en `CreateWaybillUseCase.ts` (grupo 3).

## 3. Backend — casos de uso y repositorio

- [x] 3.1 `WaybillDto.ts`: `CreateCartaPorteWaybillRequest` ahora usa `saleId` (sin `originBranchId`/`destinationBranchId`); `WaybillDto`/`WaybillSummaryDto` ganan `destinationCustomerId`/`destinationCustomerName?`/`destinationCustomerCode?`/`saleId`, `destinationBranchId` → `string | null`.
- [x] 3.2 `WaybillRepository.ts`: `CreateWaybillBaseData.destinationBranchId` → `string | null`; `CartaPorteWaybillData` gana `destinationCustomerId`/`saleId`; `WaybillSummary` gana los mismos 4 campos nuevos; docs de `createCompleted`/`markCancelled` actualizados.
- [x] 3.3 `CreateWaybillUseCase.ts` reescrito: `resolveSaleContext()` nuevo (sale→status→customer→addresses), `executeCartaPorte` recibe `{sale, origin, customer}`, `toAddressSnapshot`/`missingAddressFields` generalizados sobre `AddressSource`.
- [x] 3.4 `PrismaWaybillRepository.createCompleted`: movimiento de inventario condicionado a `type === 'simple'`; `destinationCustomerId`/`saleId` persistidos en la rama `carta_porte`.
- [x] 3.5 `markCancelled`: reversión de inventario condicionada a `type === 'simple'`.
- [x] 3.6 `PrismaWaybillLookupService.ts`: `findCustomer`/`findSale` implementados.
- [x] 3.7 Confirmado sin cambios en `FacturamaRestGateway`/`WaybillFacturamaGateway`.
- [x] 3.8 `toWaybillDto.ts` + entidad `Waybill` + `PrismaWaybillRepository` (`findById`/`list`/`createCompleted`/`markCancelled`): `destinationCustomerName`/`Code` denormalizados vía `include: { destinationCustomer: { select: { name, code } } }` en las 4 queries que devuelven una fila completa.

## 4. Backend — controller y RBAC

- [x] 4.1 `createCartaPorteWaybillSchema`: `saleId` en vez de `destinationBranchId`/`originBranchId`; `.strict()` agregado para rechazar campos inesperados (400).
- [x] 4.2 Mapeo de errores nuevos agregado en `create()` (404/409/409/404/400 respectivamente).
- [x] 4.3 `enforceEitherBranchScope` amplía su tipo a `destinationBranchId: string | null` — `create()` nunca llamó a esta función (solo permisos, sin cambio); `getById`/`cancel`/`download` ya la usaban pasando `waybill.destinationBranchId`, que ahora es `null` para `carta_porte` y reduce el check a solo-origen automáticamente, sin lógica adicional. `list()` no requiere cambio de código — el `OR destinationBranchId = x` en Prisma ya descarta filas con columna `NULL` correctamente.
- [x] 4.4 Confirmado sin cambios de permisos — test de regresión pendiente en grupo 6.

## 5. Backend — módulo `customers`

- [x] 5.1 `src/modules/customers/domain/entities/Customer.ts`, `application/ports/CustomerRepository.ts`, `application/dto/{CustomerDto,CreateCustomerRequest,UpdateCustomerRequest}.ts`, `application/mappers/toCustomerDto.ts`, `application/use-cases/CreateCustomerUseCase.ts`: 8 campos de domicilio estructurado agregados en toda la cadena (entidad → puerto → DTOs → mapper → use case). `UpdateCustomerUseCase.ts` no requirió cambio (pasa el DTO directo al repo).
- [x] 5.2 `src/modules/customers/infrastructure/http/CustomersController.ts`: `addressFieldsSchema` reusable (mismo patrón que `BranchesController.ts`) agregado a `createBodySchema`/`updateBodySchema` + `.refine()` de "al menos un campo"; `addressCountry` default `"MEX"` aplicado en el use case (no en Zod, igual que Branch).
- [x] 5.3 `src/modules/customers/infrastructure/repositories/{PrismaCustomerRepository,InMemoryCustomerRepository}.ts`: 8 campos nuevos en `toCustomer()`/select implícito, `create()` y `update()` (Prisma con spread condicional `!== undefined`; InMemory con `"campo" in data`).

## 6. Tests backend

- [x] 6.1 `CreateWaybillUseCase.test.ts` reescrito por completo para el nuevo flujo sale→cliente: éxito sin mover inventario, `WaybillSaleNotFoundError`, `SaleNotCompletedError`, `SaleHasNoCustomerError`, `CustomerNotFoundForWaybillError`, `CustomerAddressIncompleteError`, `BranchAddressIncompleteError` (origen), rollback de Facturama, línea libre sin `productId`.
- [x] 6.2 `CreateSimpleWaybillUseCase.test.ts`: sin cambios de comportamiento, solo agregados los stubs `findSale`/`findCustomer` a `FakeLookupService` (interfaz) y tipado `baseRequest()` a `CreateSimpleWaybillRequest` (fix de inferencia TS en un spread) — 9 tests, todos en verde sin tocar lógica.
- [x] 6.3 `CancelWaybillUseCase.test.ts` reescrito: `carta_porte` ahora verifica que `branch_inventory` NUNCA se toca (creación y cancelación); el escenario "stock negativo al cancelar" se movió al waybill `simple` (el tipo que sí mueve inventario) — 3 tests en verde.
- [x] 6.4 `CreateWaybillSchema.test.ts` (payload `saleId` en vez de `originBranchId`/`destinationBranchId`), `WaybillsController.branchScoping.test.ts` (createBody migrado a `type='simple'` — sigue ejercitando el mismo scoping origen/destino, ahora en el tipo correcto), `WaybillsController.stampPermission.test.ts` (`cartaPorteBody` usa `saleId` + sale/cliente sembrados en `FakeLookupService`) — 91/91 tests del módulo en verde.
- [x] 6.5 `tests/unit/modules/customers/...`: `CustomerCrudUseCases.test.ts` (+4: default `addressCountry="MEX"`, creación con domicilio completo, update parcial de un solo campo, update con campo nulo) y `CustomersController.test.ts` (+6: creación con domicilio + default país, `addressState`/`addressZipCode` con formato inválido en create y update, update de un solo campo, update con `addressStreet: null`) — 57/57 tests del módulo `customers` en verde.

## 7. Frontend — `/waybills/new` simplificado

- [x] 7.1 `NewWaybillPage.tsx` reescrito: sin `WaybillTypeToggle` (componente + test eliminados, único consumidor), sin rama `carta_porte`/`VehicleDriverForm`/`ScheduleFields` — solo `BranchPairSelector` + `WaybillItemsForm type="simple"` + `SimpleTransferFields`.
- [x] 7.2 `useCreateWaybillForm.ts`: quitado `type`/`setType`, `vehicle`/`setVehicleField`, `driver`/`setDriverField`, `distanceKm`/`departureAt`/`arrivalAt` y el branching de payload — solo construye el payload `simple`. Test `useCreateWaybillForm.test.ts` reescrito (sin escenarios `carta_porte`).
- [x] 7.3 `createWaybill.ts` (schemas): quitados `createCartaPorteWaybillSchema`/`createCartaPorteWaybillItemSchema`; `createSimpleWaybillSchema` ahora lleva su propio `superRefine` de origen≠destino; `createWaybillSchema` es alias directo.
- [x] 7.4 (no listada originalmente, necesaria para compilar) `types/api.ts` y `types/domain.ts`: `destinationBranchId` → `string | null` en `WaybillDto`/`WaybillSummaryDto`/`Waybill`/`WaybillSummary`; agregados `destinationCustomerId`/`destinationCustomerName?`/`destinationCustomerCode?`/`saleId`; `CreateCartaPorteWaybillRequest` migrado a `saleId` (sin origin/destinationBranchId). `_mappers.ts` propaga los 4 campos nuevos en `mapWaybillSummaryDto`.
- [x] 7.5 (adelanto de grupo 9, bloqueante para compilar tras 7.4) `WaybillMetaPanel.tsx`/`WaybillsTable.tsx`: columna/sección "Destino" condicional por `type` (cliente+link a `/sales/[saleId]` si `carta_porte`, sucursal si `simple`, `destinationBranchId` null-safe). Fixture de `WaybillDetailPage.test.tsx` actualizado con los 4 campos nuevos. 82/82 tests del módulo `waybills` (backend+frontend) en verde.

## 8. Frontend — nuevo flujo desde la venta

- [x] 8.1 `SaleWaybillSection.tsx` creado en `app/(private)/sales/_blocks/`: `showCta = saleStatus === 'completed' && !!customerId && canWrite === true`; CTA navega a `/sales/${saleId}/waybill/new`. Simplificado respecto al patrón `SaleReturnsSection` (sin listado de Cartas Porte previas — no hay endpoint de "waybills por venta" en el diseño aprobado; agregar uno es fuera de alcance de este change).
- [x] 8.2 `<SaleWaybillSection .../>` montada en `SaleDetailPage.tsx`, junto a `SaleReturnsSection`/`SaleInvoicesSection`.
- [x] 8.3 Ruta `app/(private)/sales/[id]/waybill/new/page.tsx` → `CreateSaleWaybillPage.tsx`, gateada por `waybills:write` y `waybills:stamp` (EmptyState "Sin acceso" si falta cualquiera).
- [x] 8.4 `CreateSaleWaybillPage.tsx`: carga la venta con `useSaleDetail`, muestra origen (`branchName`) y destino (`customerName`) como texto fijo en el header, valida `status='completed'` y `customerId` presente con `EmptyState` bloqueante antes de montar el form. Líneas prellenadas desde `sale.items` (producto+cantidad fijos) vía nuevo hook `useCreateSaleWaybillForm`; `WaybillItemsForm`/`WaybillLineRow` ganaron prop `lockProductAndQuantity` (oculta botones de agregar/quitar línea, deshabilita descripción, muestra cantidad como texto) — reutilizados sin duplicar markup. `VehicleDriverForm`/`ScheduleFields` reusados sin cambios.
- [x] 8.5 Schema Zod `createSaleWaybillSchema` creado en `app/(private)/waybills/_logic/schemas/createSaleWaybill.ts` (no en `sales/_logic/schemas/` — vive junto a `createWaybill.ts` porque el recurso creado sigue siendo un `Waybill`, ownership del módulo `waybills`) — `{ type: "carta_porte", saleId, vehicle, driver, distanceKm, departureAt, arrivalAt, items }`.
- [x] 8.6 Reusado el servicio existente `createWaybill` de `waybills/_logic/services` (mismo `POST /api/v1/admin/waybills`, shape de body coincide) — no se creó servicio nuevo.
- [x] 8.7 Mapeo de errores extendido en `waybills/_logic/services/createWaybill.ts` (compartido, no solo del nuevo form): `SaleNotFound`/`CustomerNotFound` → 404, `SaleNotCompleted`/`SaleHasNoCustomer` → 409, `CustomerAddressIncomplete` → 400 — 5 clases de error nuevas en `waybills/_logic/errors.ts`. `CreateSaleWaybillPage.tsx` renderiza cada una con mensaje + link contextual (`/sales/[id]`, `/catalogs/customers`).

## 9. Frontend — lista y detalle de waybills

- [x] 9.1 `WaybillsTable.tsx`: columna "Destino" condicional — `type='simple'` → nombre de sucursal; `type='carta_porte'` → `destinationCustomerName`. (Hecho como parte de 7.5, adelantado por ser bloqueante de compilación.)
- [x] 9.2 `WaybillMetaPanel.tsx`: sección de destino condicional por tipo — cliente (+código) + domicilio snapshotteado + link a `/sales/[saleId]` para `carta_porte`; sucursal para `simple`. (Hecho como parte de 7.5.)

## 10. Frontend — catálogo de clientes

- [x] 10.1 `CustomerEditModal.tsx`: sección "Domicilio estructurado (Carta Porte)" agregada (4ª sección, tras "Contacto y crédito"), calcada 1:1 del patrón visual de `BranchEditModal.tsx` — 8 campos, mismos labels/regex/maxLength, `addressState`/`addressCountry` forzados a mayúsculas.
- [x] 10.2 `customer.schema.ts`: `structuredAddressFields` (objeto reusable, mismo patrón que `branch.schema.ts`) agregado a `createCustomerSchema`/`updateCustomerSchema` + al `.refine()` de "al menos un campo".
- [x] 10.3 `types/api.ts` (`CustomerDto`/`CreateCustomerBody`/`UpdateCustomerBody`) y `types/domain.ts` (`Customer`) del catálogo: 8 campos agregados. `services/listCustomers.ts` (`toCustomer`, mapper compartido por `getCustomer`/`createCustomer`/`updateCustomer`) actualizado para propagarlos.

## 11. Tests frontend

- [x] 11.1 `SaleWaybillSection.test.tsx` (nuevo, patrón `SaleReturnsSection.test.tsx`): 5 tests — CTA visible sólo con `status='completed'` + `customerId` + `waybills:write`; oculta con cualquiera ausente; sección no renderiza nada (`toBeEmptyDOMElement`) cuando la CTA está oculta.
- [x] 11.2 `useCreateWaybillForm.test.ts` reescrito (grupo 7.2) — ya no ejercita `carta_porte`/`WaybillTypeToggle`, solo escenarios `simple`. `WaybillTypeToggle.test.tsx` eliminado (componente eliminado, único consumidor).
- [x] 11.3 `CreateSaleWaybillPage.test.tsx` (nuevo): 8 tests — spinner en carga, "Sin acceso" sin `waybills:write`/`waybills:stamp`, bloqueo si venta no completada o sin cliente, línea prellenada desde `sale.items` (descripción deshabilitada, cantidad como texto), origen/destino fijos en el header, submit exitoso llama `createWaybill({type:"carta_porte", saleId,...})` y redirige a `/waybills/[id]`.
- [x] 11.4 `CustomerEditModal.test.tsx`: +4 tests — 4ª sección de domicilio se renderiza, submit en creación incluye `addressStreet`/`addressZipCode`, pre-fill en edición desde la entidad, diff de un solo campo de dirección. Ajustado además el matcher `/código/i` → `/^código \*/i` en 8 tests preexistentes (quedó ambiguo tras agregar el label "Código postal") — 78/78 tests del módulo en verde.

## 12. Verificación

- [x] 12.1 `npm test` (vía `jest`, node+jsdom, excluyendo `tests/integration/` que requieren DB seedeada en vivo — 8 suites fallan por `"No Role found"`/estado de BD, pre-existentes y no relacionadas a este change, confirmado sin tocar esos archivos): **438/438 suites, 3133/3133 tests en verde**.
- [x] 12.2 `npm run build` — build de producción exitoso, incluye la ruta nueva `/sales/[id]/waybill/new` compilada (5.6 kB). `npx tsc --noEmit -p .` sin errores nuevos; quedan los mismos 9 errores pre-existentes en fixtures de test no relacionados (`UseBranchesOptionsResult.refresh`, `ProductDto.unit`, `CustomerSearchResultDto.rfc`, `TicketSettingsDto`), documentados desde antes de este change.
- [x] 12.3 Grep de `destinationBranchId` en `src/modules/waybills/`, `app/(private)/waybills/`, `app/(private)/sales/`: todas las referencias frontend no gateadas son de archivos exclusivos del flujo `simple` (`BranchPairSelector.tsx`, `createWaybill.ts` schema/hook, `NewWaybillPage.tsx` — ahí es legítimamente no-null); `WaybillMetaPanel.tsx`/`WaybillsTable.tsx` ya null-safe (grupo 7.5/9); backend cubierto por TS strict + 82 tests del módulo en verde. Sin accesos directos asumiendo no-null fuera de esos casos.
- [ ] 12.4 Manual: crear una venta completada con cliente cuyo domicilio estructurado está capturado → generar Carta Porte desde `/sales/[id]` → confirmar timbrado exitoso, `branch_inventory` sin cambios, y que `/waybills/new` ya no ofrece la opción Carta Porte. (Pendiente — requiere sesión de navegador contra Facturama/sandbox; no ejecutado en esta sesión.)
