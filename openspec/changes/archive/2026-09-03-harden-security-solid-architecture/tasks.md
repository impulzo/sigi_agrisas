## 1. Baseline

- [x] 1.1 Correr `npm test` completo y guardar el resultado (fallos preexistentes, si los hay) antes de tocar código
- [x] 1.2 Correr `npx tsc --noEmit` y confirmar el baseline conocido: 21 errores, todos en `tests/`, ninguno en `src/`/`app/`

## 2. Fix del bug de notificaciones de stock bajo (D6, Historia #18)

- [x] 2.1 Escribir el test de regresión (conversión de cotización a venta y registro de devolución que dejan stock bajo el punto de reorden deben invocar `notifyLowStock`) y confirmar que FALLA contra el código actual
- [x] 2.2 `src/modules/quotes/infrastructure/di/container.ts`: importar `adminNotificationService` desde `src/shared/infrastructure/di/adminNotificationContainer.ts` y pasarlo como segundo argumento a `new PrismaSaleRepository(prisma, adminNotificationService)`
- [x] 2.3 `src/modules/returns/infrastructure/di/container.ts`: pasar `adminNotificationService` (ya importado en ese archivo) como segundo argumento a `new PrismaSaleRepository(prisma, adminNotificationService)`
- [x] 2.4 Confirmar que el test de 2.1 pasa; correr `npm test` en `quotes` y `returns`

## 3. Seguridad — manejo de errores en endpoints públicos (D3, Historias #1, #4)

- [x] 3.1 `src/modules/auth/infrastructure/http/AuthController.ts`: en `register`, quitar el `if (err instanceof Error) return { error: err.message }`; dejar solo `EmailAlreadyInUseError`→409 y catch-all `console.error` + 500 genérico
- [x] 3.2 `src/modules/auth/infrastructure/http/AuthController.ts`: en `completeSetPassword`, quitar el `if (err instanceof Error) return { error: err.message }`; dejar solo los errores `PasswordSetupToken*` tipados y el catch-all ya existente
- [x] 3.3 `src/modules/payments/infrastructure/http/PaymentsController.ts` (líneas ~165, ~371): sustituir `err.message.includes("not found")` por `instanceof` del error de dominio correcto (crear la clase de error si no existe ya una equivalente en `payments/domain/errors/`)
- [x] 3.4 Actualizar/agregar tests de integración de `AuthController` y `PaymentsController` que verifiquen que un error no tipado nunca refleja `err.message` en el body de la respuesta
- [x] 3.5 `npm test` sobre `auth` y `payments`

## 4. Seguridad — cierre de registro público (D1, D2, Historias #1, #2)

- [x] 4.1 `src/modules/auth/application/use-cases/RegisterUseCase.ts`: dejar de generar/devolver `accessToken`/`refreshToken`; devolver solo `{ id, name, email }`
- [x] 4.2 `src/modules/auth/infrastructure/http/AuthController.ts` (`register`): quitar el `Set-Cookie` de `refreshToken`; devolver `NextResponse.json(result, { status: 201 })`
- [x] 4.3 `app/api/v1/auth/register/route.ts`: agregar `requirePermission(req, "users:write")` antes de delegar al controller
- [x] 4.4 `src/modules/auth/infrastructure/middleware/AuthMiddlewareAdapter.ts`: quitar `/api/v1/auth/register` y `/auth/register` de `PUBLIC_PATHS`
- [x] 4.5 Actualizar los tests de integración existentes de `register` (ahora requieren token + `users:write`; verificar 401 sin token, 403 sin permiso, 201 con permiso y sin cookie/token en la respuesta)
- [x] 4.6 Eliminar `app/(public)/auth/register/page.tsx`, `app/(public)/auth/_blocks/RegisterForm.tsx`, `app/(public)/auth/_logic/hooks/useRegisterForm.ts`, `app/(public)/auth/_logic/schemas/register.schema.ts`, `app/(public)/auth/_logic/services/register.ts` y sus tests dedicados
- [x] 4.7 `app/(public)/auth/_blocks/LoginForm.tsx`: quitar el `<Link href="/auth/register">`; regenerar `tests/unit/ui/(public)/auth/_blocks/__snapshots__/LoginForm.test.tsx.snap`
- [x] 4.8 `npm test` sobre `auth` (backend e integración) y sobre `(public)/auth` (frontend)

## 5. Seguridad — resto de fugas de datos puntuales (D4, D5, Historias #3, #5, #6, #7, #8, #9, #10)

- [x] 5.1 `src/modules/products/infrastructure/http/ProductsController.ts`: cambiar `imageUrlSchema` de `.includes(SUPABASE_BUCKET_HOST)` a validación de `new URL(u).host === SUPABASE_BUCKET_HOST`; agregar test con el bypass conocido
- [x] 5.2 `src/modules/reports/infrastructure/repositories/PrismaPaymentReportRepository.ts`: cambiar `include: { user: true }` por `select` acotado (`id`, `email`, `name`); confirmar que `registeredByEmail` no cambia
- [x] 5.3 `src/shared/infrastructure/http/verifyCronSecret.ts`: reemplazar `!==` por `crypto.timingSafeEqual` con chequeo de longitud previo; agregar test de 401/autorización
- [x] 5.4 `src/modules/departments/infrastructure/http/DepartmentsController.ts`: validar `providerId` de query con `z.string().uuid().optional()` antes del use case; test de 400 ante UUID malformado
- [x] 5.5 `src/modules/auth/infrastructure/middleware/AuthMiddlewareAdapter.ts`: en la rama de rutas públicas, eliminar `x-user-id`, `x-user-email`, `x-user-roles`, `x-user-branch-id` de los headers antes de `NextResponse.next()`
- [x] 5.6 `src/shared/application/services/AdminNotificationService.ts`: escapar `sale.cancellationReason` antes de interpolarlo en el HTML del correo
- [x] 5.7 Nuevo `tests/unit/security/rawSql.test.ts`: guardarraíl que falla ante `$queryRawUnsafe`/`$executeRawUnsafe` con interpolación de template literal, o `Prisma.raw()` con argumento no literal/no constante de módulo; confirmar que pasa contra el estado actual del repo
- [x] 5.8 `npm test`

## 6. Extracciones puras sin riesgo de comportamiento (D14, D17, Historias #22, #7, #19)

- [x] 6.1 `src/shared/infrastructure/prisma/errors.ts` (nuevo): `isPrismaUniqueError`/`isPrismaNotFoundError` con la firma más completa (incluye `target?`)
- [x] 6.2 Reemplazar las 27 reimplementaciones detectadas por el import compartido, archivo por archivo, corriendo `npm test` del módulo tocado en cada uno
- [x] 6.3 `src/modules/rbac/application/use-cases/CreateRoleUseCase.ts`: quitar el uso crudo de `"P2002"`; mover la detección al `RolePrismaRepository`, que lanza el error de dominio ya existente
- [x] 6.4 `src/shared/infrastructure/http/validators.ts`: agregar `uuidSchema` compartido
- [x] 6.5 Adoptar `uuidSchema` en `DepartmentsController` (junto con 5.4) y en los controllers que se toquen en la sección 8; reemplazar `CODE_REGEX` local de `DriversController`/`VehiclesController` por `entityCodeSchema` compartido
- [x] 6.6 `npm test`

## 7. Núcleo compartido de calculadoras de totales (D15, Historia #20)

- [x] 7.1 Confirmar que `tests/fixtures/totals-vectors.ts` y el test de equivalencia existente pasan en verde ANTES del refactor (snapshot de referencia)
- [x] 7.2 Crear `src/shared/domain/services/LineTotalsCalculator.ts` con el núcleo de cálculo (fórmula de extracción de impuesto + banker's rounding) parametrizado para admitir el rename `unitPrice`/`unitCost`
- [x] 7.3 Convertir `SaleTotalsCalculator`, `QuoteTotalsCalculator`, `ReturnTotalsCalculator`, `PurchaseTotalsCalculator` en wrappers delgados sobre el núcleo, preservando tipos exportados, nombres de métodos y mensajes de error exactos
- [x] 7.4 Correr el test de equivalencia y `totals-vectors.ts` de nuevo — deben pasar sin modificarlos
- [x] 7.5 `npm test` completo de `pos`, `quotes`, `returns`, `purchases`

## 8. Corrección de redondeo en mappers DTO (D19, Historia #24)

- [x] 8.1 Escribir el test de caracterización con `lineSubtotal=100.0002, iepsRate=0.25` sobre el código actual (`Math.round`), confirmando el valor hoy devuelto (`25.0001`)
- [x] 8.2 `src/modules/pos/application/mappers/toSaleDto.ts`: reemplazar `Math.round(...*10_000)/10_000` por `roundHalfToEven(lineSubtotal * rate, 4)`
- [x] 8.3 Aplicar el mismo cambio en `src/modules/quotes/application/mappers/toQuoteDto.ts` y `src/modules/returns/application/mappers/toReturnDto.ts`
- [x] 8.4 Actualizar el test de caracterización para confirmar el nuevo valor (`25.0000`) y que `lineIva + lineIeps === lineTax` persistido
- [x] 8.5 `npm test` de `pos`, `quotes`, `returns`

## 9. Arquitectura — port del emisor fiscal en billing (D7, Historia #11)

- [x] 9.1 Crear `src/modules/billing/application/ports/EmitterFiscalSettingsStore.ts` con la interfaz mínima (`get`, `upsert`) reflejando las firmas actuales
- [x] 9.2 Crear `src/modules/billing/infrastructure/services/PrismaEmitterFiscalSettingsStore.ts` que envuelve `src/shared/infrastructure/emitter/emitterFiscalSettingsStore.ts` sin moverlo ni duplicarlo
- [x] 9.3 `resolveIssuerFiscalData.ts`, `UploadCsdUseCase.ts`, `GetCsdStatusUseCase.ts`: recibir el port por constructor en vez de importar el store directo
- [x] 9.4 `src/modules/billing/infrastructure/di/container.ts`: cablear el adaptador real en los 3 use cases
- [x] 9.5 `npm test` de `billing` (unit + integración de CSD/timbrado)

## 10. Arquitectura — tipo opaco en QuoteRepository (D8, Historia #12)

- [x] 10.1 `src/modules/quotes/application/ports/QuoteRepository.ts`: quitar `import type { Prisma } from "@prisma/client"`; declarar `TxHandle` como tipo propio del port
- [x] 10.2 `src/modules/quotes/infrastructure/repositories/PrismaQuoteRepository.ts`: castear `tx` al tipo real de Prisma en el punto de uso interno
- [x] 10.3 Confirmar que `InMemoryQuoteRepository.markConverted` (ya ignora `_tx`) no requiere cambios
- [x] 10.4 `npx tsc --noEmit` sobre el módulo `quotes` y `npm test`

## 11. Arquitectura — inyección en servicios de infraestructura (D9, Historia #13)

- [x] 11.1 `PrismaPosLookupService.ts`: recibir `PrismaPricingSettingsRepository` por constructor en vez de instanciarlo con `new`
- [x] 11.2 `PrismaInventoryNotificationSettingsAdapter.ts`: recibir `PrismaInventoryNotificationSettingsRepository` por constructor
- [x] 11.3 Actualizar los DI containers (`pos/di`, `quotes/di`, `inventory/di`) para pasar la instancia ya existente en cada container
- [x] 11.4 `npm test`

## 12. Arquitectura — frontend presentacional (D10, D11, D12, D13, Historias #14, #15, #16, #17)

- [x] 12.1 Crear servicio `_logic/services/` para la búsqueda de `SalePickerField` (billing) con `fetchImpl?`; mover el `authFetch` inline del bloque a un hook `_logic/hooks/`
- [x] 12.2 Crear servicio `_logic/services/` para la búsqueda de productos de `InventoryAssignModal` (inventory) con `fetchImpl?`; mover el `authFetch` inline a un hook
- [x] 12.3 Verificar comportamiento idéntico de ambos bloques (mismos resultados, mismo debounce) con sus tests de UI existentes
- [x] 12.4 Mover `app/(public)/auth/_logic/hooks/useLogout.ts` a `app/_hooks/useLogout.ts`; actualizar imports en `NavigationRail` y cualquier otro consumidor
- [x] 12.5 `SessionReasonBanner.tsx`: agregar prop `onDismiss`; quitar `router.replace` interno; actualizar el caller (página de login) para pasar `() => router.replace("/auth/login")`
- [x] 12.6 `SessionLifecycleProvider.tsx`: reemplazar accesos directos a `sessionStorage` por los helpers de `app/_lib/session/` (agregar helper de `lastActivityAt` si no existe uno análogo al de `accessToken`)
- [x] 12.7 `npm test` de UI (`(private)/_blocks`, `_components/organisms/NavigationRail`, `_components/molecules/SessionReasonBanner`)

## 13. Deduplicación — mapDomainError en controllers CRUD simples (D16, Historia #21)

- [x] 13.1 Crear `src/shared/infrastructure/http/mapDomainError.ts`
- [x] 13.2 Adoptar en `DepartmentsController` (junto con la validación de 5.4) — correr sus tests
- [x] 13.3 Adoptar en `BranchesController` — correr sus tests
- [x] 13.4 Adoptar en `ProviderController` — correr sus tests
- [x] 13.5 Adoptar en `CustomersController` — correr sus tests
- [x] 13.6 Adoptar en `VehiclesController` — correr sus tests
- [x] 13.7 Adoptar en `DriversController` — correr sus tests
- [x] 13.8 Adoptar en `FoliosController` — correr sus tests
- [x] 13.9 Adoptar en `PaymentMethodsController` — correr sus tests
- [x] 13.10 Adoptar en `TaxRatesController` — correr sus tests
- [x] 13.11 Adoptar en `ProductsController` — correr sus tests
- [x] 13.12 `npm test` completo de los 10 módulos tocados

## 14. Deduplicación — Facturama y ReportsController (D18, D20, Historias #23, #25)

- [x] 14.1 Crear `src/shared/infrastructure/facturama/FacturamaHttpClient.ts` (auth + `request<T>` genérico)
- [x] 14.2 Mover `FacturamaStampError`/`FacturamaCancelError`/`BranchScopeViolationError` a un módulo compartido; re-exportar desde `billing/domain/errors.ts` y `waybills/domain/errors.ts`
- [x] 14.3 `billing/infrastructure/services/FacturamaRestGateway.ts` y `waybills/infrastructure/services/FacturamaRestGateway.ts`: usar el cliente compartido, conservando sus payload builders específicos
- [x] 14.4 `npm test` de `billing` y `waybills` (incluye `FakeFacturamaGateway` de ambos)
- [x] 14.5 Extraer `pdfResponse()`, `xlsxResponse()`, `reportErrorResponse()` en `ReportsController.ts`; adoptar en los 12 handlers sin cambiar headers ni body
- [x] 14.6 `npm test` de `reports` (json/pdf/xlsx de cada reporte)

## 15. Deduplicación — requestJson opcional (D21, Historia #26)

- [x] 15.1 Crear `app/_lib/http/requestJson.ts`
- [x] 15.2 Adoptar únicamente en los 2 servicios nuevos creados en la sección 12 (`searchSales`, `searchProducts`) — no tocar servicios existentes
- [x] 15.3 `npm test` de UI de billing/inventory

## 16. Verificación final

- [x] 16.1 `npm test` completo — comparar contra el baseline de 1.1, cero regresiones nuevas
- [x] 16.2 `npx tsc --noEmit` — debe seguir en 21 errores, todos en `tests/`, ninguno nuevo en `src/`/`app/`
- [x] 16.3 `npm run build`
- [x] 16.4 Verificación manual con Playwright (`mcp__playwright__*`, nunca Claude-in-Chrome): `/auth/login` sin link de registro; `/auth/register` ya no accesible; alta de usuario desde `/users` funcional; conversión de cotización a venta con stock bajo dispara notificación; `/billing/new` e `/inventory` con los buscadores movidos siguen respondiendo; un reporte en los 3 formatos (json/pdf/xlsx)
