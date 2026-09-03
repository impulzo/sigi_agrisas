## Context

Ver `proposal.md` — Why / Historia de Usuario para la motivación completa. Este documento cubre solo el "cómo": estructura de los cambios, decisiones técnicas y su relación con las reglas de capas de `CLAUDE.md` (dominio puro, use cases con ports, controllers delgados, `_blocks/` presentacional, `_hooks/` global agnóstico de features).

Baseline verificado antes de tocar código: `npx tsc --noEmit` da 21 errores, todos preexistentes en `tests/` (props faltantes en mocks, ninguno en `src/`/`app/`). Ese conteo no debe crecer. `npm test` corre ~540 archivos; se ejecuta antes y después de cada bloque de la Fase de ejecución para aislar regresiones.

## Goals / Non-Goals

**Goals:**
- Cerrar las fugas de datos concretas identificadas (ítems 1–10 de la Historia de Usuario) sin tocar ningún endpoint que hoy funciona correctamente.
- Corregir el bug real de notificaciones de stock bajo (ítem 18) con el cambio mínimo posible.
- Eliminar las violaciones de arquitectura señaladas (ítems 11–17) preservando la API pública de cada pieza tocada.
- Deduplicar donde el ahorro es alto y el riesgo bajo (ítems 19, 20, 22, 23, 25) o donde el usuario pidió explícitamente el alcance acotado (ítem 21: solo 10 controllers CRUD simples).
- Alinear el redondeo de `lineIva`/`lineIeps` en los 3 mappers DTO con la spec ya vigente (ítem 24).

**Non-Goals:**
- No se toca ningún controller de POS, billing, payments o waybills en el ítem de `mapDomainError` (decisión explícita del usuario).
- No se migra la totalidad de los 141 servicios frontend a `requestJson` — solo los que ya se tocan por el ítem 14.
- No se resuelve la divergencia de orden de validación de folio entre `CreateSaleUseCase` y `CreateQuoteUseCase` (bug menor, documentado pero fuera de alcance — no fue parte del pedido original).
- No se descompone `ReportsController` en múltiples clases — solo se extraen los 3 helpers mecánicos repetidos (ítem 25); sigue siendo un único archivo.
- No se toca `sat-codes` (decisión explícita del usuario: catálogos oficiales sin datos de negocio).
- Ningún cambio de este documento introduce una migración de base de datos.

## Decisions

### D1 — Cierre de registro público (ítems 1, 2)
**Decisión:** `POST /api/v1/auth/register` deja de ser público; se gatea con `requirePermission(req, "users:write")` en el route handler, igual patrón que cualquier endpoint admin. El use case (`RegisterUseCase`) **deja de emitir `accessToken`/`refreshToken`** para el usuario recién creado — hoy el controller hace `Set-Cookie: refreshToken=...` en la respuesta, lo cual, aplicado a una llamada hecha por un admin ya autenticado, **sobrescribiría la cookie de sesión del admin en su propio navegador** con la sesión del usuario nuevo. Esto no es un detalle cosmético: gatear el endpoint sin quitar la emisión de tokens introduciría un bug de seguridad nuevo (secuestro de sesión del admin). `RegisterUseCase.execute` pasa a devolver solo `{ id, name, email }`; `AuthController.register` deja de setear la cookie.
**Alternativas consideradas:** (a) dejar la emisión de tokens intacta y solo agregar el guard — descartada por el riesgo de sesión descrito arriba; (b) borrar el endpoint por completo — descartada porque tiene tests de integración propios y mantenerlo protegido cuesta menos que reconstruirlo si se necesita luego.
**Trazabilidad:** Historia #1, #2.

### D2 — Eliminación de UI de registro (ítem 2)
**Decisión:** Se borran `app/(public)/auth/register/page.tsx`, `_blocks/RegisterForm.tsx`, `_logic/hooks/useRegisterForm.ts`, `_logic/schemas/register.schema.ts`, `_logic/services/register.ts`. Se quita el `<Link href="/auth/register">` de `LoginForm.tsx` y se regenera su snapshot. El layout compartido (`layout.tsx`) no se toca en código — sigue sirviendo a `/auth/login` y `/auth/set-password` sin cambios; solo su spec (`auth-ui`) se actualiza para reflejar que ya no sirve a `/auth/register`.
**Trazabilidad:** Historia #2.

### D3 — Errores tipados vs. genéricos en endpoints públicos (ítems 1, 4)
**Decisión:** En `AuthController.register`/`completeSetPassword` y en `PaymentsController` (líneas 165, 371), el `catch` genérico deja de hacer `if (err instanceof Error) return { error: err.message }` o `err.message.includes("not found")`. Se reemplaza por: primero los `instanceof` de errores de dominio ya tipados (sin cambios), y al final un catch-all que hace `console.error(...)` + `NextResponse.json({ error: "Internal server error" }, { status: 500 })`. Ningún caso hoy cubierto por un error tipado cambia de status.
**Alternativa considerada:** crear un `PaymentNotFoundError` explícito donde hoy se usa el string-match — se hace solo si al inspeccionar el código el error real ya existe como clase de dominio (muy probable, dado el patrón del resto de los controllers); si no existe, se crea la clase (cambio mínimo, mismo patrón que el resto del módulo).
**Trazabilidad:** Historia #1, #4.

### D4 — Validación de host de imagen (ítem 3)
**Decisión:** `imageUrlSchema` en `ProductsController.ts` cambia el `.refine((u) => u.includes(SUPABASE_BUCKET_HOST))` por `.refine((u) => { try { return new URL(u).host === SUPABASE_BUCKET_HOST; } catch { return false; } })`. Cualquier URL real del bucket sigue pasando; una URL con el host real inyectado en el path/query de otro dominio deja de pasar.
**Trazabilidad:** Historia #3.

### D5 — Middleware: limpieza de headers de identidad en rutas públicas (ítem 8)
**Decisión:** En `AuthMiddlewareAdapter.authMiddleware`, la rama `if (isPublic(pathname)) return NextResponse.next()` cambia a construir una copia de `req.headers` con `x-user-id`, `x-user-email`, `x-user-roles`, `x-user-branch-id` eliminados antes de `NextResponse.next({ request: { headers } })`. Sin esto, un cliente podría enviar esos headers directamente y un futuro handler público que los lea (por descuido) confiaría en ellos sin verificación JWT.
**Trazabilidad:** Historia #8.

### D6 — Fix del bug de notificaciones de stock bajo (ítem 18)
**Decisión:** En `src/modules/quotes/infrastructure/di/container.ts:24` y `src/modules/returns/infrastructure/di/container.ts:15`, cambiar `new PrismaSaleRepository(prisma)` a `new PrismaSaleRepository(prisma, adminNotificationService)`, importando `adminNotificationService` desde `src/shared/infrastructure/di/adminNotificationContainer.ts` (`returns/di` ya lo importa para su propio `PrismaReturnRepository`; `quotes/di` necesita el import nuevo). Cambio de 2-3 líneas por archivo. Se agrega un test de regresión que instancie ambos containers (o los use cases relevantes con un `AdminNotificationService` espía) y confirme que `notifyLowStock` se invoca tras una conversión de cotización a venta que deja stock bajo el punto de reorden, y tras una devolución equivalente.
**Trazabilidad:** Historia #18. Es el ítem de mayor prioridad de ejecución por ser un bug activo con fix de superficie mínima.

### D7 — Port `EmitterFiscalSettingsStore` (ítem 11)
**Decisión:** Nuevo `src/modules/billing/application/ports/EmitterFiscalSettingsStore.ts` con la interfaz mínima que `resolveIssuerFiscalData`, `UploadCsdUseCase` y `GetCsdStatusUseCase` necesitan (`get()`/`upsert(...)`, reflejando las firmas actuales de `getEmitterFiscalSettings`/`upsertEmitterFiscalSettings`). Adaptador `src/modules/billing/infrastructure/services/PrismaEmitterFiscalSettingsStore.ts` que envuelve el store existente de `src/shared/infrastructure/emitter/emitterFiscalSettingsStore.ts` (ese store no se borra ni se mueve — sigue siendo la única implementación real; solo se accede a través del port). Los 3 use cases reciben el port por constructor; `billing/infrastructure/di/container.ts` los cablea con el adaptador real.
**Alternativa considerada:** mover el store completo a `billing/infrastructure/` — descartada porque el store es genuinamente compartido a nivel de `shared/` (no hay evidencia de que solo lo use `billing`); envolver es menos invasivo.
**Trazabilidad:** Historia #11.

### D8 — Tipo opaco en `QuoteRepository.TxHandle` (ítem 12)
**Decisión:** `TxHandle` pasa de `Prisma.TransactionClient | undefined` a un tipo propio del port, p. ej. `export type TxHandle = unknown` (o un tipo marcador `{ readonly __brand: "QuoteRepositoryTx" } | undefined` si se prefiere algo más estricto que `unknown` para evitar pases accidentales de otro valor). `PrismaQuoteRepository.markConverted` castea internamente (`tx as Prisma.TransactionClient | undefined`) al usarlo contra Prisma. `InMemoryQuoteRepository.markConverted` ya ignora el parámetro (`_tx`), cero cambio ahí.
**Trazabilidad:** Historia #12.

### D9 — Inyección en `PrismaPosLookupService` y `PrismaInventoryNotificationSettingsAdapter` (ítem 13)
**Decisión:** Ambas clases agregan el repositorio concreto (`PrismaPricingSettingsRepository`, `PrismaInventoryNotificationSettingsRepository` respectivamente) como parámetro de constructor en vez de instanciarlo con `new` internamente. Los DI containers que las instancian (`pos/di`, `quotes/di`, `inventory/di`) pasan la instancia ya existente en ese container (varios ya la tienen creada para otro propósito — se reutiliza, no se duplica).
**Trazabilidad:** Historia #13.

### D10 — Servicios para `SalePickerField`/`InventoryAssignModal` (ítem 14)
**Decisión:** Se crea `app/(private)/billing/_logic/services/searchSales.ts` (o se reutiliza uno existente si ya hay una búsqueda de ventas en ese módulo) y `app/(private)/inventory/_logic/services/searchProducts.ts`, ambos con la firma estándar `(params, fetchImpl = authFetch, signal?) => Promise<...>` que ya siguen los 141 servicios existentes. Un hook delgado en `_logic/hooks/` (o el hook ya existente del bloque, ajustado) llama al servicio; el bloque consume el hook. Cero cambio en el endpoint llamado ni en los parámetros de búsqueda.
**Trazabilidad:** Historia #14.

### D11 — `useLogout` a `app/_hooks/` (ítem 15)
**Decisión:** Mover el archivo de `app/(public)/auth/_logic/hooks/useLogout.ts` a `app/_hooks/useLogout.ts` tal cual (mismo contenido, solo cambia la ubicación e imports de sus 2 consumidores: `NavigationRail` y cualquier otro punto de logout dentro de `(public)/auth` que también lo use, si existe). Coherente con que `useCurrentUser`/`useHeadquarters` ya viven ahí.
**Trazabilidad:** Historia #15.

### D12 — `SessionReasonBanner` recibe `onDismiss` (ítem 16)
**Decisión:** La prop `onDismiss: () => void` reemplaza la llamada interna a `router.replace("/auth/login")`. El único caller (la página de login, según `client-session-lifecycle`/`auth-ui`) pasa `() => router.replace("/auth/login")` — mismo destino, ahora explícito en el nivel de página en vez de hardcodeado en la molécula.
**Trazabilidad:** Historia #16.

### D13 — `SessionLifecycleProvider` usa helpers de `_lib/session/` (ítem 17)
**Decisión:** Las 4 líneas que tocan `sessionStorage` directamente se reemplazan por las funciones ya existentes en `app/_lib/session/accessToken.ts` (o el módulo equivalente que `authFetch` ya usa) — se agrega ahí una función `getLastActivityAt`/`setLastActivityAt`/`clearLastActivityAt` si `lastActivityAt` no tiene ya un helper análogo al de `accessToken`.
**Trazabilidad:** Historia #17.

### D14 — Helper `isPrismaUniqueError`/`isPrismaNotFoundError` (ítem 19)
**Decisión:** Nuevo `src/shared/infrastructure/prisma/errors.ts` exporta ambas funciones con la firma más completa detectada en la auditoría (incluye `target?: string`). Los 27 archivos que las reimplementaban importan desde ahí y borran su copia local. El uso crudo de `"P2002"` en `rbac/application/use-cases/CreateRoleUseCase.ts` (fuga de Prisma en capa de aplicación) se resuelve exponiendo la detección a través del `RoleRepository` port (el repo Prisma detecta el P2002 y lanza el error de dominio ya existente; el use case deja de tocar el código Prisma directamente) — esto también corrige, de paso, una violación de capas no listada aparte porque es consecuencia directa de este ítem.
**Trazabilidad:** Historia #19.

### D15 — Núcleo compartido de `*TotalsCalculator` (ítem 20)
**Decisión:** `src/shared/domain/services/LineTotalsCalculator.ts` recibe el cuerpo del bucle `for` (idéntico en Sale/Quote/Return, con rename de campo en Purchase) parametrizado por el nombre de campo de precio (`unitPrice` vs `unitCost`) mediante un parámetro `priceField` o normalizando la entrada antes de llamar al núcleo (cada wrapper mapea su input al shape genérico antes de invocar). Los 4 calculadores (`Sale`, `Quote`, `Return`, `Purchase`) quedan como wrappers de <15 líneas que llaman al núcleo y devuelven exactamente el mismo shape de resultado que hoy (tipos exportados sin cambios). `InvoiceTotalsCalculator` no se toca. El test de equivalencia en `tests/fixtures/totals-vectors.ts` se corre antes y después del refactor sin modificarlo.
**Trazabilidad:** Historia #20.

### D16 — `mapDomainError` + 10 controllers CRUD (ítem 21)
**Decisión:** `src/shared/infrastructure/http/mapDomainError.ts` exporta `mapDomainError(err: unknown, table: Array<[new (...a: any[]) => Error, number]>): NextResponse | null` — recorre la tabla con `instanceof`, y devuelve `null` si ningún error de la tabla matchea (dejando que el controller decida el fallback 500). Se adopta reemplazando las cadenas `if (err instanceof X) return ...` en: `departments`, `branches`, `providers`, `customers`, `vehicles`, `drivers`, `folios`, `payment-methods`, `tax-rates`, `products`. Cada controller sigue construyendo su propia tabla `[ErrorClass, status]` (no se centraliza qué error mapea a qué status entre módulos — eso seguiría siendo decisión de cada dominio), solo se centraliza el *mecanismo* de recorrer e invocar `NextResponse.json`.
**Trazabilidad:** Historia #21.

### D17 — `uuidSchema` compartido (ítem 22)
**Decisión:** Se agrega `export const uuidSchema = z.string().uuid(...)` a `src/shared/infrastructure/http/validators.ts`, con un mensaje genérico parametrizable (`uuidSchema(fieldName?: string)` como función, o un valor fijo + `.refine` para mensaje custom donde haga falta). Se adopta solo en los controllers ya tocados por D16 y por el ítem 7 (`DepartmentsController`). `entityCodeSchema` se reutiliza en `DriversController`/`VehiclesController` en vez de su `CODE_REGEX` local.
**Trazabilidad:** Historia #22, #7.

### D18 — `FacturamaHttpClient` compartido (ítem 23)
**Decisión:** `src/shared/infrastructure/facturama/FacturamaHttpClient.ts` extrae `buildBasicAuth`, la lectura de `FACTURAMA_USER`/`FACTURAMA_PASSWORD`/`FACTURAMA_BASE_URL`, y el `request<T>()` genérico (manejo de `res.ok`, mensaje de error, sniffing de `content-type`). Los gateways de `billing` y `waybills` reciben/instancian este cliente y conservan sus payload builders específicos sin cambios. Las clases `FacturamaStampError`, `FacturamaCancelError`, `BranchScopeViolationError` se mueven a un módulo compartido (`src/shared/domain/errors/facturama.ts` o similar) y ambos módulos las re-exportan o importan directamente — sin romper los `instanceof` que ya existen en los controllers.
**Trazabilidad:** Historia #23.

### D19 — Redondeo de mappers DTO (ítem 24)
**Decisión:** Ya cubierto en detalle en las specs `pos-api`/`quotes-api`/`returns-api` de este change. Implementación: `toSaleDto.ts`, `toQuoteDto.ts`, `toReturnDto.ts` importan `roundHalfToEven` de `@/shared/domain/services/roundHalfToEven` y lo usan en vez de `Math.round(...*10_000)/10_000`. Se agrega un test de caracterización con el vector `lineSubtotal=100.0002, iepsRate=0.25` antes de tocar el código, confirmando el valor esperado post-cambio.
**Trazabilidad:** Historia #24.

### D20 — Helpers en `ReportsController` (ítem 25)
**Decisión:** Tres funciones privadas (o un módulo `src/modules/reports/infrastructure/http/responseHelpers.ts`): `pdfResponse(buffer, filename)`, `xlsxResponse(buffer, filename)`, `reportErrorResponse(handlerName, err)`. Los 12 handlers reemplazan su bloque final por llamadas a estos helpers, sin cambiar ningún header ni el body devuelto.
**Trazabilidad:** Historia #25.

### D21 — `requestJson` opcional (ítem 26)
**Decisión:** `app/_lib/http/requestJson.ts` centraliza el patrón `try { fetchImpl(...) } catch { re-throw }` ya usado por los 141 servicios. Se adopta únicamente en los servicios nuevos creados por D10 (`searchSales.ts`, `searchProducts.ts`) — no se toca ningún servicio existente.
**Trazabilidad:** Historia #26.

## Risks / Trade-offs

- **[Riesgo] D1 cambia el contrato de respuesta de `POST /api/v1/auth/register`** (deja de devolver `accessToken`/set-cookie) → **Mitigación:** es un endpoint que hoy solo consume la UI pública eliminada en D2; se verifica con `grep` que ningún otro consumidor interno dependa del token emitido antes de tocar el use case, y se actualizan sus tests de integración existentes en el mismo commit.
- **[Riesgo] D6 (fix del bug de notificaciones) podría revelar que el test suite actual pasa "por accidente" sin cubrir esta rama** → **Mitigación:** el test de regresión se escribe primero, confirmando que falla contra el código actual (demuestra el bug) antes de aplicar el fix de 2 líneas.
- **[Riesgo] D15 (núcleo compartido de totales) toca lógica fiscal sensible** → **Mitigación:** el test de equivalencia ya existente (`totals-vectors.ts`) es la red de seguridad; se corre inmediatamente después del refactor sin haberlo modificado, y cualquier fallo revierte el cambio antes de continuar.
- **[Riesgo] D16/D17 tocan 10+ controllers simultáneamente** → **Mitigación:** se hace controller por controller con `npm test` entre cada uno (no en un solo commit masivo), y el helper devuelve `null` (no lanza) cuando no hay match, preservando el fallback 500 exacto de cada controller.
- **[Trade-off] D7/D8 son cambios de tipos puros sin beneficio funcional inmediato** → aceptado porque desbloquean testabilidad futura sin ningún riesgo de regresión de comportamiento (verificable en compilación).

## Migration Plan

Sin migración de base de datos. Orden de aplicación (ver también `tasks.md`):
1. D6 (fix del bug, aislado, más alto impacto/riesgo).
2. Fase de seguridad: D1–D5 (D2 depende de D1 completado).
3. Extracciones puras sin riesgo de comportamiento: D14, D15, D17.
4. Fase de arquitectura: D7–D13.
5. Resto de deduplicación: D16, D18, D19, D20, D21.

Cada paso cierra con `npm test` y, al final de todo, `npx tsc --noEmit` (debe seguir en 21 errores, todos en `tests/`) y `npm run build`. Rollback: cada commit es independiente por ítem: revertir el commit puntual basta, no hay dependencias de datos que deshacer.
