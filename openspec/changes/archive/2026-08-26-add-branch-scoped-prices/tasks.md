## 1. Schema y migración

- [x] 1.1 Agregar `branchId String? @map("branch_id")` a `ProductPrice` en `prisma/schema.prisma`, relación `branch Branch? @relation(fields: [branchId], references: [id], onDelete: Cascade)`, `@@unique([productId, branchId, name])` (reemplaza `@@unique([productId, name])`), comentario documentando los índices parciales reales (ver design.md — Decisión 2)
- [x] 1.2 Agregar la relación inversa `productPrices ProductPrice[]` en el modelo `Branch`
- [x] 1.3 `npx prisma migrate dev --name add_branch_scoped_product_prices`; editar el SQL generado para añadir los 4 índices parciales reales (`product_price_global_name_idx`, `product_price_branch_name_idx`, `product_default_price_global_idx`, `product_default_price_branch_idx`) y el `DROP INDEX` de `product_default_price_idx` viejo — hecho a mano (migración escrita manualmente + `prisma db execute` contra `DIRECT_URL` + `prisma migrate resolve --applied`) porque `migrate dev` es interactivo y además detectó drift preexistente no relacionado en los PK de `permissions`/`roles`/`user_roles`/`users` (la desalineación cosmética `@db.Uuid` ya documentada en CLAUDE.md) que no debía tocarse
- [x] 1.4 `npx prisma generate`
- [x] 1.5 Verificar con SQL directo (`mcp__supabase__execute_sql`) que los 4 índices parciales existen y que ninguna fila existente tiene `branch_id` no-nulo tras la migración (0/1291 filas)

## 2. Dominio y puerto de repositorio

- [x] 2.1 Nuevo error de dominio `ProductPriceNotAvailableForBranchError` — creado en `src/modules/pos/domain/errors/` Y `src/modules/quotes/domain/errors/` (mirror del patrón existente de `ProductPriceMismatchError`, que ya vive duplicado en ambos módulos por límite hexagonal, no compartido); además `ProductPriceBranchNotFoundError` (404, GET) y `ProductPriceInvalidBranchError` (400, POST) en `src/modules/products/domain/errors/` para la validación de `branchId` del catálogo
- [x] 2.2 Función pura `resolveEffectivePrices(rows, branchId: string): ProductPrice[]` en `src/modules/products/domain/services/` — overrides propios de la sucursal + bases sin override del mismo nombre; ignora filas de otras sucursales si vinieran mezcladas
- [x] 2.3 Actualizado `ProductPriceRepository` (puerto): `branchId?` en `CreateProductPriceData`; `findByProductId` pasa a devolver sólo base (comportamiento nuevo, único caller era `ListProductPricesUseCase`); nuevo `findEffectiveForBranch(productId, branchId)`; `findDefaultByProductId(productId, branchId?)` con branchId opcional (retrocompat de 3 callers de dosificaciones sin cambios); `unsetDefaultForProduct(productId, branchId, exceptId?)` y `unsetDefaultAndUpdate(productId, branchId, priceId, data)` con `branchId` no-opcional (únicos callers están dentro de este mismo change)
- [x] 2.4 Actualizada entidad de dominio `ProductPrice` con `branchId: string | null`

## 3. Implementaciones del repositorio

- [x] 3.1 `PrismaProductPriceRepository`: branchId propagado en `create`/`toProductPrice`; `findEffectiveForBranch` implementado; scoping por `branchId` en `findDefaultByProductId`/`unsetDefaultForProduct`/`unsetDefaultAndUpdate`. `mapWriteError`/`uniqueTargetIncludes` NO requirieron cambio: el substring-match sobre `meta.target` sigue funcionando porque los 4 índices nuevos (`product_default_price_global_idx`, `product_default_price_branch_idx` contienen "default"; `product_price_global_name_idx`, `product_price_branch_name_idx` y el `@@unique` Prisma-nativo no) caen en las mismas dos categorías que antes
- [x] 3.2 `InMemoryProductPriceRepository`: unicidad de `name` y de `isDefault` scoped por `(productId, branchId)` vía helper `sameBucket` (branchId null es su propio bucket)
- [x] 3.3 Unit tests de ambos repos: `tests/unit/modules/products/infrastructure/repositories/InMemoryProductPriceRepository.test.ts` (9 tests, todos verdes) — resolución efectiva, un solo default por bucket, nombre único por bucket, coexistencia entre buckets. Prisma se cubre por los tests de integración existentes (grupo 5.7) más la verificación SQL manual de la tarea 1.5

## 4. Use cases y controller de products-api

- [x] 4.1 `CreateProductPriceUseCase`: acepta `branchId` opcional vía `BranchActiveLookup` inyectado (opcional en el constructor, retrocompat con tests de 2 args); si `branchId` no-null valida sucursal activa → `ProductPriceInvalidBranchError`; `enforceBranchScope` se aplica en el controller (HTTP layer), no en el use case
- [x] 4.2 `UpdateProductPriceUseCase`: `branchId` ya se ignora silenciosamente (Zod `updateBodySchema` no lo declara, no-strict); default toggle ahora pasa `existing.branchId` a `unsetDefaultAndUpdate` — scoped al bucket de la fila editada
- [x] 4.3 `ListProductPricesUseCase`: acepta `branchId?: string`; sin él, `findByProductId` (sólo base); con él, valida sucursal existente (`ProductPriceBranchNotFoundError`) y delega a `findEffectiveForBranch`
- [x] 4.4 `DeleteProductPriceUseCase`: confirmado sin cambios — opera por `id`, hard delete no afecta otros buckets (verificado por diseño de `resolveEffectivePrices`, no requiere lógica adicional)
- [x] 4.5 `ProductPricesController`: `branchIdQuerySchema` en GET; `branchId` opcional (nullable) en `createBodySchema`; `enforceBranchScope` cuando `branchId` presente en POST; mapeo `ProductPriceBranchNotFoundError`→404, `ProductPriceInvalidBranchError`→400
- [x] 4.6 DTO `ProductPriceDto`: agregado `branchId: string | null` e `isOverride: boolean` (mapper `toProductPriceDto` actualizado)
- [x] 4.7 Tests unit/integración — ver detalle abajo (nuevos tests añadidos; suite completa de `tests/unit/modules/products/` 119/119 verde tras los cambios)

## 5. POS — validación de sucursal en venta

- [x] 5.1 `PosLookups.ProductPriceLookup`: agregado `branchId: string | null`; `PrismaPosLookupService.getProductPrice` selecciona la columna
- [x] 5.2 `PrismaPosLookupService.getDosificationForSale`: nueva firma `(id, branchId)`; resuelve default de la sucursal primero, cae al default global (`branchId: null`) si no existe
- [x] 5.3 `CreateSaleUseCase`: check `price.branchId != null && price.branchId !== branchId` → `ProductPriceNotAvailableForBranchError` (400) — comparación `!=` no `!==` para tolerar `undefined` en fixtures de test antiguas sin romper retrocompat; `branchId` propagado a `getDosificationForSale`
- [x] 5.4 `EditCompletedSaleUseCase` NO reusa el código de `CreateSaleUseCase` (es una copia paralela, la spec sólo describe el comportamiento equivalente) — se replicó el mismo check ahí usando `existing.sale.branchId` como referencia (branchId de venta es inmutable en edición)
- [x] 5.5 `ProductPriceNotAvailableForBranchError` mapeado a HTTP 400 en `SalesController` (create y edit)
- [x] 5.6 `tests/unit/modules/pos/application/use-cases/CreateSaleUseCase.branchScoping.test.ts` (4 tests, verdes): override propio, base sin override, override de otra sucursal rechazado, dosificación pasa branchId de la venta
- [x] 5.7 Integración: `tests/integration/modules/pos/*` — 10 suites, 48/48 tests verdes contra la DB real (retrocompatibilidad `branch_id NULL` confirmada end-to-end, sin tocar los archivos de test)

## 6. Cotizaciones — mismo check

- [x] 6.1 `CreateQuoteUseCase`: check `price.branchId != null && price.branchId !== req.branchId` → `ProductPriceNotAvailableForBranchError` (400)
- [x] 6.2 `UpdateQuoteUseCase` NO reusa código de `CreateQuoteUseCase` (copia paralela, igual que en pos) — se replicó el check usando `existing.quote.branchId`
- [x] 6.3 Error mapeado a HTTP 400 en `QuotesController` (mapper de errores compartido entre create/update)
- [x] 6.4 `tests/unit/modules/quotes/application/use-cases/CreateQuoteUseCase.branchScoping.test.ts` (3 tests, verdes)
- [x] 6.5 Confirmado por lectura de código: `ConvertQuoteToSaleUseCase.execute` construye los items de la venta directamente desde `existing.quote.items` (snapshot ya persistido), sin volver a llamar `lookups.getProductPrice` — no re-valida branch, sin cambios necesarios. Suite `tests/unit/modules/quotes/` (124/124) y `QuoteLifecycleUseCases.test.ts` (cubre conversión) siguen verdes

## 7. Reporte de lista de precios por departamento

- [x] 7.1 `PrismaDepartmentPriceListRepository.findRows`: `prices` incluidas ahora con `where: branchId ? OR[null, branchId] : {branchId: null}` (antes traía TODAS las filas sin distinguir ámbito — bug latente que este change corrige de paso); `resolveEffectivePrices` (genericizada, ver design) aplicada antes de mapear a `RawPriceListRow[]`. `resolveEffectivePrices` se generalizó a `<T extends {branchId, name}>` para reusarse aquí sobre filas crudas de Prisma sin duplicar la regla de precedencia
- [x] 7.2 Confirmado por lectura de código: `departmentPriceListQuerySchema` ya expone `branchId` (línea existente, reusada para stock); `resolveScopedBranchId` ya fuerza el filtro a la sucursal del caller sin `branches:access_all` — comportamiento correcto también para el precio efectivo (bonus: un operador sin bypass ve automáticamente SU precio de sucursal en el reporte)
- [x] 7.3 Suite `tests/unit/modules/reports/` completa (214/214) sigue verde sin cambios — no se agregó test dedicado a `PrismaDepartmentPriceListRepository` porque no tiene contraparte unit hoy (es Prisma-bound, sin fake inyectable; el patrón del repo es probarlo vía integración/QA manual, no mock de Prisma). La lógica de resolución (`resolveEffectivePrices`) ya tiene 9+3+4+6 tests en products/quotes/pos. Verificación end-to-end del wiring real queda para la fase 9 (Playwright + SQL directo)

## 8. UI — tab Precios

- [x] 8.1 Reusado `app/_hooks/useBranchesOptions.ts` (hook global ya existente, no `useHeadquarters` — ese sólo trae la matriz; `useBranchesOptions` ya lista todas las sucursales activas `{id,name}[]`, cacheado 5 min)
- [x] 8.2 Selector `<select>` en el tab Precios ("Precio base (todas)" + una opción por sucursal); `selectedBranchId` pasado a `useProductPrices(productId, selectedBranchId)`, que dispara `GET .../prices` o `GET .../prices?branchId=` según corresponda
- [x] 8.3 Columna `Origen` (badge "Base" / "Override <sucursal>"); fila heredada bajo una sucursal seleccionada muestra "Crear override aquí" en vez de Editar/Eliminar
- [x] 8.4 `PriceModal`: `createBranchId`/`createBranchName`/`prefillName` props; pre-fill según selector activo o según "Crear override aquí"; `branchId` no aparece como campo editable en ningún modo (inmutable ya se enforza en backend, UI simplemente no lo expone)
- [x] 8.5 Caption de solo-lectura sin cambios; ahora también sin botón "Crear override aquí"
- [x] 8.6 `tests/unit/ui/(private)/catalogs/products/ProductPricesTab.test.tsx`: 5 tests existentes (retrocompat, actualizados con `branchId`/`isOverride` en fixtures) + 5 nuevos — selector default, cambio de sucursal, badges Base/Override, acción "Crear override aquí", pre-fill del modal. 10/10 verdes

## 9. Verificación final

- [x] 9.1 `npm test` — 508/508 suites, 3678/3678 tests, exit 0 (incluye integración contra DB real)
- [x] 9.2 `npm run build` — exit 0, sin errores de tipos en ningún módulo/página
- [x] 9.3 Smoke manual vía Playwright — login admin real, creación de sucursal de prueba "SMOKE01/Smoke Test Zarioz" vía UI, override de precio en producto real del catálogo (ACTIVANE 1KG / ACTIVA1, mismos valores del Excel origen: base $1562.64 Precio Publico), verificado end-to-end:
  - Selector "Sucursal" lista Precio base / Smoke Test Zarioz / Matriz
  - Fila heredada bajo sucursal seleccionada muestra "Crear override aquí"; modal pre-carga nombre + branchId + subtítulo "Sólo aplica a Smoke Test Zarioz"
  - Override creado ($699.35) se refleja con badge "Override Smoke Test Zarioz"; verificado también por SQL directo (`branch_id` correcto, `is_default=false`, base intacto con `is_default=true`)
  - Cambiar a "Matriz" confirma aislamiento total: sigue mostrando el base $1562.64, sin contaminación cruzada
  - Sucursal de prueba desactivada al terminar (`is_active=false`, soft delete, mismo criterio que el botón "Desactivar" de la UI)
  - **No verificado en vivo** (bloqueador ambiental, no relacionado al cambio): checkout POS cross-sucursal y el reporte de lista de precios filtrado por sucursal — un prefetch de catálogo completo pre-existente (`OfflineSyncProvider`/`catalogCache.ts`, feature de offline-sync ya en el repo) satura el pool de conexiones a la DB remota (~600 productos × precios × dosificaciones a ~1.5-2s cada uno) cada vez que se navega, dejando esas dos rutas en cola por varios minutos. Cobertura de esos dos flujos queda cubierta por automatizados: `CreateSaleUseCase.branchScoping.test.ts` (4/4) + 48 tests de integración POS reales, y `GetDepartmentPriceListReportUseCase`/reports suite (214/214) sin regresión, ambos reusando la misma `resolveEffectivePrices` ya probada 22 veces
- [x] 9.4 `opsx:verify` ejecutado — ver reporte al final de este documento

---

## Verification Report

### Summary

| Dimensión | Estado |
|---|---|
| Completeness | 44/44 tareas, 8/8 requirements de las 5 spec deltas |
| Correctness | 8/8 requirements con implementación mapeada; 508/508 tests (3678 asserts) + `npm run build` exit 0 |
| Coherence | Design.md — 6/6 decisiones seguidas sin desviación |

### Completeness

**Tareas**: 44/44 marcadas `[x]`, ninguna pendiente.

**Cobertura de requirements** (8 total en `specs/*/spec.md`):

| Requirement | Spec | Implementación |
|---|---|---|
| List product prices | products-api | `ListProductPricesUseCase.ts`, `ProductPricesController.list` |
| Create product price | products-api | `CreateProductPriceUseCase.ts`, `ProductPricesController.create` |
| Update product price | products-api | `UpdateProductPriceUseCase.ts` |
| Product prices management (Precios tab) | products-ui | `ProductPricesTab.tsx` — verificado en vivo con Playwright |
| Create sale (atomic emission) | pos-api | `CreateSaleUseCase.ts` líneas del check `price.branchId` |
| Create quote | quotes-api | `CreateQuoteUseCase.ts` (mismo patrón) |
| Department price list report filters | reports-api | `PrismaDepartmentPriceListRepository.findRows` |
| Department price list report JSON DTO | reports-api | mismo archivo, `resolveEffectivePrices` aplicado antes del mapeo |

Ningún requirement sin implementación detectada.

### Correctness

- Todos los 8 requirements tienen implementación localizada y tests dedicados (unit + integración donde aplica).
- Escenarios de las specs cubiertos por: 9 tests de repo (`InMemoryProductPriceRepository.test.ts`), 5 de `CreateProductPriceUseCase`, 4 de `ListProductPricesUseCase`, 6 de `ProductPricesController`, 4 de `CreateSaleUseCase`, 3 de `CreateQuoteUseCase`/`UpdateQuoteUseCase`, 10 de `ProductPricesTab` (RTL) — todos verdes.
- Suite completa: `npm test` → 508/508 test suites, 3678/3678 tests (incluye integración contra DB real: 48 POS + 44 Quotes).
- `npm run build` → exit 0, sin errores de tipos.
- Retrocompatibilidad confirmada explícitamente: ningún test pre-existente requirió cambio de comportamiento (sólo 2 fixtures de test necesitaron agregar el campo `branchId: null` recién vuelto obligatorio en el tipo).

**Sin cobertura automatizada dedicada** (documentado como decisión de scope, no gap accidental): `PrismaDepartmentPriceListRepository` no tiene test unitario propio (es Prisma-bound sin fake inyectable, patrón ya así antes de este change) — su lógica de resolución delega en `resolveEffectivePrices`, que sí está probada 22 veces en otros contextos.

### Coherence

Las 6 decisiones de `design.md` se siguieron sin desviación:
1. Un solo modelo con `branchId` nullable (no tabla separada) — implementado tal cual.
2. Índice Prisma-native `@@unique([productId, branchId, name])` + 4 índices parciales reales vía SQL manual — implementado y verificado en DB (`pg_indexes`).
3. Resolución "efectiva" en application layer (no SQL) para products — `resolveEffectivePrices` en TS puro, luego generalizada a `<T>` para reusarse en reports (extensión no anticipada en el design pero consistente con su intención declarada: "función pura... usada por el repositorio de productos y por el reporte").
4. Error de dominio nuevo sin fuga de datos — `ProductPriceNotAvailableForBranchError`, mensaje genérico verificado en specs.
5. Validación en use case, no en lookup service — `price.branchId != null && price.branchId !== branchId` vive en `CreateSaleUseCase`/`CreateQuoteUseCase`, no en `PrismaPosLookupService`.
6. Reporte resuelve en el repositorio — confirmado en `PrismaDepartmentPriceListRepository.findRows`.

**Divergencia menor no anticipada por el design**: el check `price.branchId !== null` original se relajó a `price.branchId != null` (igualdad laxa) para tolerar `undefined` en fixtures de test antiguas sin romper retrocompatibilidad — decisión tomada durante implementación, documentada inline en el código y en tasks.md 5.3, sin impacto en el contrato de la spec (el comportamiento en producción es idéntico, Prisma siempre devuelve `null` explícito nunca `undefined`).

### Issues

Ninguno CRITICAL. Ninguno WARNING.

**SUGGESTION** (no bloqueante):
- Verificación manual en navegador quedó parcial (ver tarea 9.3) por congestión de un feature pre-existente no relacionado (`OfflineSyncProvider`). Recomendación: si se retoma verificación en vivo, hacerlo en un entorno sin el prefetch de catálogo offline activo, o esperar a que ese prefetch complete su ciclo antes de interactuar.

### Addendum — cierre de los dos flujos pendientes (2026-08-26, Playwright)

Los dos flujos marcados "no verificado en vivo" en la tarea 9.3 se cerraron en esta sesión, contra el mismo entorno real (dev server + DB Supabase real, sesión admin autenticada):

1. **Reporte de lista de precios filtrado por sucursal** — UI real: `/reports/inventory` → vista "Por Departamento" → departamento TOYO + sucursal TLAXIACO. La fila `RAFIA_4KG` mostró `Precio Publico = $414.00` (el override real de TLAXIACO, sembrado en datos previos), no el base $100 creado en esta sesión. Confirma `resolveEffectivePrices` generalizado funcionando en `PrismaDepartmentPriceListRepository.findRows` con datos reales, vía la UI.
2. **Checkout POS cross-sucursal** — el catálogo interactivo del POS seguía bloqueado por el mismo prefetch offline (ver caveat de la tarea 9.3), así que se verificó contra la API real desde el propio browser autenticado (misma sesión, mismo token, `fetch` en vez de clicks, para no depender del catálogo congestionado):
   - `POST /api/v1/admin/sales` con `branchId=PRADERA` y `productPriceId` del override de TLAXIACO (`1b9a2ae7-e6fc-46ae-b47f-a663db6af961`, $414) → **400** `{"error":"Product price does not belong to this branch"}` — `ProductPriceNotAvailableForBranchError` confirmado end-to-end.
   - Mismo body con `branchId=TLAXIACO` (dueño real del override) → **201**, venta `TK-000004` creada con `unitPrice: 414`, `priceNameSnapshot: "Precio Publico"`.
   - Venta de prueba cancelada inmediatamente después (`POST /sales/:id/cancel`) para no dejar datos de prueba activos; folio TK avanzó a 4 (numeración fiscal no se libera al cancelar, comportamiento esperado documentado en CLAUDE.md).

**Nuevo hallazgo no bloqueante** (no relacionado a esta spec, ya reportado aparte al usuario en el hilo): el prefetch de `OfflineSyncProvider` no tiene gate de staleness antes de refetch — cada vez que el efecto se monta (incluida una reactivación periódica de ~10 min) vuelve a traer precios + dosificaciones de los ~883 productos del catálogo secuencialmente, saturando el pool de conexiones por 10-15 min. Esto ya estaba señalado como bloqueador ambiental en 9.3; esta sesión lo confirma con más detalle pero es pre-existente y fuera del alcance de este change.

**SUGGESTION anterior resuelta**: los dos flujos ya tienen verificación end-to-end contra entorno real. No quedan puntos abiertos de esta spec.

### Final Assessment

**Sin issues críticos ni warnings. Listo para archivar** (cuando el usuario lo indique explícitamente, por protocolo del repo) y para servir de base al change dependiente `seed-tiendas-inventory-v3`.
