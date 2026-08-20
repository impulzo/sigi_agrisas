## Context

`InventoryLot.expirationDate` ya existe (`prisma/schema.prisma:971-985`), capturado opcionalmente al completar una compra (`inventory-lots`). `ExpiryStatusCalculator` deriva un semáforo `ok/warning/critical` (30/7 días) sólo para la UI de catálogo — no dispara ningún efecto. No existe mecanismo de cron/scheduler en el repo (sin `vercel.json`, sin `app/api/**cron**`). El proyecto se despliega en Vercel (confirmado por tooling MCP disponible en la sesión), por lo que Vercel Cron es el mecanismo nativo sin infraestructura adicional.

Ya existen 3 patrones a reutilizar tal cual:
- Correo: `MailerPort`/`NodemailerMailer` + `AdminNotificationService` (`src/shared/`), best-effort (try/catch interno, nunca propaga).
- Debounce-por-flag: `BranchInventory.lastLowStockNotifiedAt` + `checkAndNotifyLowStock.ts` (función pura de dominio).
- Settings singleton: `PricingSettings` (`prisma/schema.prisma:895-902`, `src/modules/settings/`) — tabla singleton por convención de código (`SINGLETON_ID` fijo, sin constraint DB), 1 entity + 1 port + 2 use-cases (Get/Update) + repos Prisma/InMemory, expuesto por `SettingsController` compartido.
- Cross-module read: `PrismaPosLookupService.getDosificationSurchargePct()` — un módulo importa el repo Prisma de otro módulo directamente, sin event bus.

Este diseño responde a las 2 historias de `proposal.md` § Historia de Usuario: (1) configurar el correo destino en Settings, (2) recibir digest automático en 3 umbrales con catch-up.

## Goals / Non-Goals

**Goals:**
- Historia 1: nuevo grupo de settings singleton "Notificaciones de inventario" con 1 campo email, mismo patrón que `PricingSettings`.
- Historia 2: job diario que evalúa 3 umbrales por lote (6m/3m/día-mismo), con catch-up si el job se salta un día, agrupado en 1 digest por umbral por corrida, sin duplicar envíos.
- Reusar `MailerPort`/`AdminNotificationService` sin modificar su contrato existente (sólo agregar un método nuevo).
- Disparo vía Vercel Cron + ruta protegida por secreto compartido (`CRON_SECRET`), sin acoplarse al sistema de auth JWT de usuarios.

**Non-Goals:**
- No se toca `ExpiryStatusCalculator`/`ExpiryStatusBadge` (semáforo UI 30/7 días) — sigue siendo un cálculo cosmético independiente, con umbrales y propósito distintos (badge de catálogo vs. aviso proactivo por correo).
- No se toca `ADMIN_NOTIFICATION_EMAIL` ni los flujos existentes de `notifySaleCancelled`/`notifyLowStock` — el nuevo destinatario vive exclusivamente en el setting nuevo.
- No se agrega un event bus ni un scheduler propio (node-cron, etc.) — se apoya en Vercel Cron, ya nativo del stack de despliegue.
- No se particiona `branch_inventory.quantity` por lote ni se altera cómo ventas/devoluciones/ajustes descuentan stock — `InventoryLot` sigue siendo metadata de trazabilidad append-only (ver `inventory-lots`).
- No se agrega un permiso RBAC nuevo — se reutiliza `settings:read`/`settings:write`.

## Decisions

### 1. Umbrales como 3 flags independientes por lote, no un único "próximo umbral"
`InventoryLot` gana `notifiedSixMonthsAt`, `notifiedThreeMonthsAt`, `notifiedDayOfAt` (todos `DateTime?`). Cada uno se evalúa y marca de forma independiente:
```
notifiedSixMonthsAt   IS NULL AND expirationDate <= today + 6 meses → dispara "sixMonths"
notifiedThreeMonthsAt IS NULL AND expirationDate <= today + 3 meses → dispara "threeMonths"
notifiedDayOfAt       IS NULL AND expirationDate <= today            → dispara "dayOf"
```
**Por qué**: responde directamente al AC de Historia 2 "cada umbral dispara como máximo 1 vez por lote, incluso si el job no corrió el día exacto (catch-up)". Con 3 flags independientes, un lote que ya vencía en 2 meses al momento de crear el registro (lote cargado tarde) dispara `sixMonths` + `threeMonths` en la misma corrida — comportamiento correcto (catch-up), no un bug.
**Alternativa descartada**: un único campo `nextExpiryNotificationSentAt` con un "umbral actual" calculado — más simple de modelar pero pierde la garantía "cada umbral se notifica exactamente una vez"; una implementación con un solo timestamp no puede distinguir si ya se avisó a 6 meses cuando se evalúa el umbral de 3 meses sin lógica adicional equivalente a 3 flags. Se descarta por no ganar nada en simplicidad real.

### 2. Repositorio: 1 query acotada + política pura en memoria, no 3 queries por umbral
`InventoryLotRepository.findPendingExpiryNotificationLots()` trae SOLO lotes con `notifiedDayOfAt IS NULL` (ciclo no completado) — acota el dataset a lo relevante. La función pura de dominio `determineExpiryNotifications(lots, referenceDate)` decide, en memoria, qué `(lote, umbral)` dispara.
**Por qué**: mantiene la regla de negocio (qué umbral corresponde) 100% en dominio puro y testeable sin I/O — mismo principio que `checkAndNotifyLowStock.ts`. El repositorio sólo filtra por "aún pendiente de completar el ciclo", no decide reglas de umbral.
**Alternativa descartada**: 3 queries SQL separadas (una por umbral) con la comparación de fecha en SQL — más queries, misma lógica duplicada en SQL, y la regla de negocio quedaría fuera del dominio (violación de la regla de capas del repo: "El dominio no importa nada de infraestructura").

### 3. Agrupación en digest por umbral, no por lote
El caso de uso agrupa los resultados de `determineExpiryNotifications` por `threshold` (no por lote) antes de enviar — 1 llamada a `notifyInventoryExpiryDigest` por umbral con lotes activos ese día (0, 1 o N correos por corrida, nunca N-por-lote).
**Por qué**: responde directamente al AC de Historia 2 "si varios lotes cruzan el mismo umbral el mismo día, se agrupan en 1 solo correo digest" — decisión ya validada con el usuario (AskUserQuestion) antes de este proposal.

### 4. Destinatario explícito por parámetro, no vía `process.env`
`AdminNotificationService.notifyInventoryExpiryDigest({ to, threshold, items })` recibe `to` como argumento — a diferencia de `notifySaleCancelled`/`notifyLowStock`, que leen `process.env.ADMIN_NOTIFICATION_EMAIL` internamente.
**Por qué**: responde a Historia 1 (correo configurable en Settings, no en env var) sin romper el contrato de los 2 métodos existentes ni introducir una rama condicional de "¿de dónde saco el destinatario?" dentro del servicio compartido — esa decisión (leer de Settings) vive en el caso de uso de `inventory`, que es quien conoce el nuevo repositorio de settings.
**Alternativa descartada**: agregar un tercer modo a `AdminNotificationService` que lea de settings internamente — acoplaría `src/shared/` (usado por múltiples módulos) a un repositorio Prisma de `settings`, rompiendo la regla de que `shared` no depende de módulos concretos.

### 5. Cron protegido por secreto compartido, ruta pública en el middleware
Nueva ruta `POST /api/v1/admin/cron/inventory-expiry-notifications` se agrega a la allowlist exacta de `AuthMiddlewareAdapter` (bypassa el JWT de usuario) y valida `Authorization: Bearer ${process.env.CRON_SECRET}` dentro del propio handler — 401 si no coincide o falta.
**Por qué**: Vercel Cron no tiene sesión de usuario ni puede generar un JWT válido; el secreto compartido es el mecanismo estándar recomendado por Vercel para proteger cron endpoints (inyecta automáticamente ese header cuando `CRON_SECRET` está configurado como env var del proyecto). Responde al Criterio de Seguridad de Historia 2 ("ruta cron protegida con `CRON_SECRET`... sin match → 401").
**Alternativa descartada**: `requirePermission` normal — inaplicable, no hay usuario autenticado disparando el cron.

### 6. Nuevo controller de cron separado del CRUD existente
`InventoryCronController.ts` nuevo en `infrastructure/http/` de `inventory`, en vez de agregar el método al `BranchInventoryController` existente.
**Por qué**: separa responsabilidades — el controller CRUD gestiona recursos vía RBAC de usuario; el controller de cron gestiona un trigger de sistema vía secreto. Mezclar ambos en una sola clase confunde el modelo de autorización de cada endpoint.

## Risks / Trade-offs

- **[Riesgo] Backlog al desplegar**: si hay lotes ya vencidos o dentro de los umbrales al momento de desplegar esta feature, la primera corrida del cron notificará "de golpe" varios umbrales para el mismo lote (catch-up esperado por diseño, sección 1) → **Mitigación**: es comportamiento intencional (no perder avisos), documentado en el AC de Historia 2; se puede correr el cron manualmente antes de anunciar la feature para "vaciar" el backlog inicial de forma controlada.
- **[Riesgo] Cálculo "6 meses"/"3 meses" con meses calendario variables (28-31 días)**: usar `addMonths` en vez de días fijos evita drift acumulado, pero un lote que vence el 31 de un mes puede comportarse distinto en meses de 30 días → **Mitigación**: aceptable para un aviso de negocio (no es cálculo fiscal); documentar en la spec el comportamiento exacto de la librería de fechas usada.
- **[Riesgo] SMTP no configurado en un ambiente**: el envío falla silenciosamente (best-effort) pero el flag de "notificado" sólo debe marcarse si el intento de envío se ejecutó (no si se saltó por falta de destinatario) → **Mitigación**: el caso de uso marca `notified*At` únicamente tras invocar el método del mailer (aunque éste falle internamente vía SMTP), pero NO marca nada si no hay `expirationNotificationEmail` configurado — así, configurar el correo después sigue disparando los umbrales pendientes en la siguiente corrida.
- **[Riesgo] Cron ausente en desarrollo local**: sin Vercel, nadie dispara el endpoint automáticamente → **Mitigación**: la ruta es un `POST` normal, invocable manualmente con `curl` (ver plan de verificación) para pruebas locales.

## Migration Plan

1. `npx prisma migrate dev --name add_inventory_lot_expiry_notifications` (3 columnas en `inventory_lots` + tabla `inventory_notification_settings`) — aditivo, sin downtime, sin backfill necesario (columnas nullable, tabla nueva).
2. Deploy de código (use case, repos, endpoints, UI) — sin dependencias de orden con el paso 1 más allá de requerir el schema ya migrado.
3. Configurar `CRON_SECRET` como env var del proyecto en Vercel + agregar `vercel.json` con el cron diario.
4. Un administrador configura `expirationNotificationEmail` vía `/settings` — antes de esto, el cron corre pero no envía nada (no-op seguro, ver Risks).
5. **Rollback**: revertir el deploy de código es seguro en cualquier momento (las columnas nuevas quedan sin uso, no rompen queries existentes de `inventory-lots`/`inventory-api`). Si se necesita revertir el schema, `prisma migrate` con una migración inversa que elimine las 3 columnas y la tabla nueva — sin pérdida de datos de negocio (sólo se pierde el estado de debounce, aceptable).

## Open Questions

Ninguna — decisiones ya validadas con el usuario vía `AskUserQuestion` antes de este proposal (digest diario, correo en Settings, Vercel Cron).
