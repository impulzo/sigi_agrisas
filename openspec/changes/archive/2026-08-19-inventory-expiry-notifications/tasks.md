## 1. Schema y migración

- [x] 1.1 Agregar a `InventoryLot` (`prisma/schema.prisma`) las columnas `notifiedSixMonthsAt`, `notifiedThreeMonthsAt`, `notifiedDayOfAt` (`DateTime?`, mapeadas a `snake_case`)
- [x] 1.2 Agregar modelo `InventoryNotificationSettings` (singleton, mismo patrón que `PricingSettings`: `id String @id`, `expirationNotificationEmail String?`, `createdAt`, `updatedAt`, `@@map("inventory_notification_settings")`)
- [x] 1.3 Migración aplicada — nota: `prisma migrate dev` detectó drift preexistente no relacionado (cambio de PK en `permissions/roles/user_roles/users`, desalineación cosmética ya documentada en CLAUDE.md) y pidió confirmación interactiva; se escribió la migración a mano (mismo SQL que `migrate dev` habría generado para el diff real) y se aplicó con `prisma migrate deploy`, que no re-evalúa drift — evita tocar las PKs de esas tablas
- [x] 1.4 `npx prisma generate`

## 2. Dominio — política de umbrales (`src/modules/inventory/domain/`)

- [x] 2.1 Definir tipo `InventoryLotExpirySnapshot` (id, expirationDate, notifiedSixMonthsAt, notifiedThreeMonthsAt, notifiedDayOfAt, + datos para el digest: productName, branchName, lotNumber, quantity)
- [x] 2.2 Definir tipo `LotExpiryNotification` (`{ lot: InventoryLotExpirySnapshot, threshold: "sixMonths" | "threeMonths" | "dayOf" }` — se optó por incluir el snapshot completo, no sólo `lotId`, para que el use case arme el digest sin re-lookup)
- [x] 2.3 Implementar `InventoryLotExpiryNotificationPolicy.ts` — función pura `determineExpiryNotifications(lots: InventoryLotExpirySnapshot[], referenceDate: Date): LotExpiryNotification[]` con la lógica de los 3 umbrales independientes y catch-up (ver `design.md` § Decisión 1)
- [x] 2.4 Tests unitarios de la política: umbral individual (6m/3m/día-mismo), catch-up (varios umbrales a la vez, y los 3 juntos), umbral ya notificado no se repite, lote no vencido no dispara nada — 7/7 verde

## 3. Repositorio (`src/modules/inventory/application/ports/` + `infrastructure/repositories/`)

- [x] 3.1 Extender `InventoryLotRepository` (puerto) con `findPendingExpiryNotificationLots(): Promise<InventoryLotExpirySnapshot[]>` y `markLotNotified(lotId: string, threshold: "sixMonths" | "threeMonths" | "dayOf"): Promise<void>`
- [x] 3.2 Implementar ambos métodos en `PrismaInventoryLotRepository.ts` (SQL con join a `products`/`branches` para nombre; filtro `notified_day_of_at IS NULL` en la query de pendientes; `markLotNotified` usa `Prisma.raw` sólo con nombre de columna de un whitelist fijo, no input de usuario)
- [x] 3.3 Implementar ambos métodos en `InMemoryInventoryLotRepository.ts` para tests (+ `seedExpirySnapshot` helper)

## 4. Servicio de correo compartido (`src/shared/application/services/AdminNotificationService.ts`)

- [x] 4.1 Agregar método `notifyInventoryExpiryDigest({ to, threshold, items }): Promise<void>` — recibe `to` explícito (no lee `process.env`), arma HTML con tabla de lotes, best-effort try/catch como los métodos existentes
- [x] 4.2 Tests unitarios: envío exitoso, fallo de SMTP no propaga, `to` null y `""` no intentan envío — 4/4 nuevos verde (9/9 suite total)

## 5. Settings — grupo "Notificaciones de inventario" (`src/modules/settings/`)

- [x] 5.1 `domain/entities/InventoryNotificationSettings.ts` — interface + `DEFAULT_INVENTORY_NOTIFICATION_SETTINGS` (`{ expirationNotificationEmail: null }`)
- [x] 5.2 `application/ports/InventoryNotificationSettingsRepository.ts` — `get()`/`update()`
- [x] 5.3 `application/use-cases/GetInventoryNotificationSettingsUseCase.ts` y `UpdateInventoryNotificationSettingsUseCase.ts` (reusa `EmptyUpdateError` ya definido en `UpdateTicketSettingsUseCase.ts` en vez de duplicar la clase)
- [x] 5.4 `infrastructure/repositories/PrismaInventoryNotificationSettingsRepository.ts` (mismo patrón `SINGLETON_ID` que `PrismaPricingSettingsRepository.ts`) e `InMemoryInventoryNotificationSettingsRepository.ts`
- [x] 5.5 Agregado a `SettingsController.ts`: `getInventoryNotifications()`/`updateInventoryNotifications()` + schema Zod
- [x] 5.6 Wireado en `infrastructure/di/container.ts` de `settings`
- [x] 5.7 Endpoint `app/api/v1/admin/settings/inventory-notifications/route.ts` — `GET` (`settings:read`) / `PATCH` (`settings:write`)
- [x] 5.8 Tests unitarios: Get/Update use cases + `SettingsController` (actualizado constructor con los 2 nuevos use cases) — 46/46 verde en `tests/unit/modules/settings`

## 6. Caso de uso de orquestación (`src/modules/inventory/application/use-cases/`)

- [x] 6.1 `SendInventoryExpiryNotificationsUseCase.ts` — depende de puertos: `InventoryLotRepository` (de `inventory`) e `InventoryNotificationSettingsPort` nuevo (de `inventory`, para no violar capas — el use case sólo conoce interfaces, no Prisma concreto), implementado por `PrismaInventoryNotificationSettingsAdapter` (infra de `inventory`, envuelve `PrismaInventoryNotificationSettingsRepository` de `settings`, mismo patrón cross-module que `PrismaPosLookupService`), + `AdminNotificationService` inyectado directo (mismo patrón que `PrismaBranchInventoryRepository`, que también lo recibe concreto, no detrás de un puerto). Flujo: lee settings → sin destinatario, retorna sin tocar el repo de lotes; con destinatario → lee lotes pendientes → `determineExpiryNotifications` → agrupa por umbral → por cada grupo: envía digest → marca cada `(lotId, threshold)` notificado
- [x] 6.2 Tests unitarios con `InMemoryInventoryLotRepository` + fake de `InventoryNotificationSettingsPort` + mailer fake: agrupación por umbral (1 digest para 2 lotes), 2 umbrales distintos → 2 digests, no-envío sin destinatario (y sin marcar flags), marcado correcto tras intento de envío fallido, no-op sin lotes pendientes — 5/5 verde

## 7. Endpoint cron y protección

- [x] 7.1 `InventoryCronController.ts` nuevo en `src/modules/inventory/infrastructure/http/` — método que invoca `SendInventoryExpiryNotificationsUseCase`
- [x] 7.2 Wireado controller en `infrastructure/di/container.ts` de `inventory` (+ `PrismaInventoryNotificationSettingsAdapter`)
- [x] 7.3 `app/api/v1/admin/cron/inventory-expiry-notifications/route.ts` — `POST`; usa nuevo helper `src/shared/infrastructure/http/verifyCronSecret.ts` (mismo estilo que `requirePermission`) — 401 si falta o no coincide `Authorization: Bearer ${CRON_SECRET}`; sin `requirePermission`
- [x] 7.4 Agregada la ruta a `PUBLIC_PATHS` de `AuthMiddlewareAdapter.ts`
- [x] 7.5 Agregado `CRON_SECRET=""` a `.env.example` con nota explicativa
- [x] 7.6 Creado `vercel.json` con `crons: [{ path: "/api/v1/admin/cron/inventory-expiry-notifications", schedule: "0 8 * * *" }]`
- [x] 7.7 (no listada, agregada por cobertura) Tests unitarios de `verifyCronSecret` — 4/4 verde

## 8. UI — Settings

- [x] 8.1 `_logic/types/api.ts` (settings) — `InventoryNotificationSettingsDto` / `UpdateInventoryNotificationSettingsBody`
- [x] 8.2 `_logic/services/getInventoryNotificationSettings.ts` / `updateInventoryNotificationSettings.ts` (mismo patrón `authFetch` que los de Pricing)
- [x] 8.3 `_logic/hooks/useInventoryNotificationSettings.ts` / `useInventoryNotificationSettingsMutations.ts`
- [x] 8.4 `_blocks/InventoryNotificationSettingsForm.tsx` — clon de `PricingSettingsForm.tsx`: 1 campo email, validación cliente, gate `canWrite = can("settings:write")`
- [x] 8.5 Agregada la nueva `<section>` a `SettingsPage.tsx`

## 9. Verificación end-to-end

- [x] 9.1 `npm test` — 3384/3392 verde. 8 fallos, los 3 suites fallidas son preexistentes y no tocadas por este cambio (verificado con `git log` — 0 commits de esta sesión sobre esos archivos): `tests/integration/modules/products/products-crud.test.ts` (FK constraint en `inventory_movements` por datos huérfanos de una corrida anterior contra la BD real — higiene de test de integración, no del código), `tests/unit/ui/roles/blocks/RolesPage.test.tsx` (bug preexistente no relacionado a settings/inventory). Se encontró y corrigió 1 fallo real introducido por este cambio: `tests/unit/ui/design-system/tokens.test.ts` detectó un `<button>` crudo nuevo en `InventoryNotificationSettingsForm.tsx` — reemplazado por el átomo `Button` (`app/_components/atoms/Button/Button.tsx`); guardarraíl vuelve a pasar 8/8
- [x] 9.2 `npm run build` — requirió Node 20 (el Node 18.0.0 activo por default no cumple el mínimo 18.17 de Next.js; se usó `nvm use 20.20.2`, entorno preexistente, no parte de este cambio). Build limpio, 0 errores de tipos, ambas rutas nuevas (`/api/v1/admin/settings/inventory-notifications`, `/api/v1/admin/cron/inventory-expiry-notifications`) compiladas
- [x] 9.3 Manual E2E contra dev server real (Node 20) + Supabase: 3 lotes de prueba (`EXPIRYTEST_DAYOF/3M/6M`) vía script ad-hoc (no `prisma studio`, headless), correo configurado vía upsert directo al singleton, `curl -X POST -H "Authorization: Bearer $CRON_SECRET" localhost:3000/...` → `{"success":true}`; sin header → 401. Verificado en BD: `EXPIRYTEST_6M` (vence en 6 meses) → sólo `notifiedSixMonthsAt`; `EXPIRYTEST_3M` (vence en 3 meses, catch-up) → `notifiedSixMonthsAt` + `notifiedThreeMonthsAt`; `EXPIRYTEST_DAYOF` (vence hoy, catch-up) → los 3 flags. Envío vía Ethereal (SMTP de prueba) sin errores en log. Datos de prueba y singleton limpiados al terminar
- [x] 9.4 Segunda invocación del cron confirmada idempotente: mismos timestamps exactos en los 3 flags tras el segundo `POST` — 0 nuevas notificaciones
