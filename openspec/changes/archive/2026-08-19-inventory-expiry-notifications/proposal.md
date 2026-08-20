## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Administrador | Como Administrador, quiero configurar el correo de destino para avisos de caducidad de inventario en Settings, para que las notificaciones lleguen a la persona/buzón correcto sin depender de una variable de entorno fija | - Campo `expirationNotificationEmail` editable en `/settings`, nueva sección "Notificaciones de inventario"<br>- Guardar valor vacío/null desactiva el envío sin error<br>- Validación de formato email (rechaza formato inválido con mensaje inline)<br>- Cambios persisten y se reflejan al recargar la página | - Sólo usuarios con `settings:write` pueden editar; `settings:read` puede ver<br>- Sin permiso, campo se muestra deshabilitado (gate optimista durante `"loading"`, igual que el resto de `/settings`)<br>- Email no se expone en logs de error del mailer |
| 2 | Administrador (destinatario del correo) | Como Administrador, quiero recibir un correo automático cuando un lote de inventario esté por caducar (6 meses antes, 3 meses antes, y el día mismo), para poder actuar a tiempo (rotar stock, aplicar descuento, dar de baja) antes de perder el producto | - Job diario evalúa todos los lotes con ciclo de notificación pendiente<br>- Cada umbral (6m/3m/día-mismo) dispara como máximo 1 vez por lote, incluso si el job no corrió el día exacto (catch-up)<br>- Si varios lotes cruzan el mismo umbral el mismo día, se agrupan en 1 solo correo digest con tabla (producto, sucursal, lote, cantidad, fecha de caducidad)<br>- Si no hay correo configurado en Settings, el job no envía nada y no falla<br>- Si un lote ya fue notificado en un umbral, no se vuelve a notificar en ese mismo umbral | - Ruta cron protegida con `CRON_SECRET` vía header `Authorization: Bearer`; sin match → 401<br>- Ruta cron excluida del middleware JWT (no requiere sesión de usuario) pero no expone datos si el secreto es inválido<br>- Envío best-effort: fallo de SMTP no rompe la respuesta del cron ni deja los flags de notificado en estado inconsistente (marcar sólo si el intento de envío se ejecutó) |

Nota: se dividió en 2 historias — configuración del destinatario (CRUD Settings) y disparo/envío del digest (cron + dominio) — porque son unidades independientes y testeables por separado (INVEST), aunque comparten el mismo objetivo de negocio.

## Why

`InventoryLot` (`prisma/schema.prisma:971-985`) ya guarda `expirationDate` por lote, capturado opcionalmente al completar una compra (ver `inventory-lots`), y `ExpiryStatusCalculator` ya deriva un semáforo `ok/warning/critical` (30/7 días) para la UI del catálogo de inventario — pero ese semáforo es puramente cosmético: nadie se entera de un vencimiento próximo salvo que abra manualmente la pantalla de inventario. Con caducidades a 6 y 3 meses de anticipación, ese hueco es costoso: mercancía agrícola que caduca sin rotación ni descuento aplicado a tiempo se convierte en merma total. El negocio necesita que el sistema avise proactivamente, sin depender de que alguien revise el catálogo, en los 3 hitos donde todavía hay margen de acción (6 meses, 3 meses) y en el límite (día mismo).

La infraestructura de correo (`MailerPort`/`NodemailerMailer`, `AdminNotificationService`) y el patrón de debounce-por-flag (`BranchInventory.lastLowStockNotifiedAt`) ya existen y se reutilizan directamente — este cambio es, en esencia, aplicar patrones ya probados en el repo a un evento disparado por tiempo (no por una transacción de usuario), lo cual sí requiere infraestructura nueva: un mecanismo de cron (inexistente hoy) y un destinatario configurable (hoy fijo por variable de entorno).

## What Changes

- Agregar 3 columnas de debounce a `InventoryLot` (`notifiedSixMonthsAt`, `notifiedThreeMonthsAt`, `notifiedDayOfAt`) para no re-notificar el mismo umbral dos veces por lote.
- Nueva lógica de dominio pura que evalúa, por lote, qué umbrales corresponde disparar en una fecha de referencia, con soporte de catch-up (si el job se saltó un día, el umbral se dispara en la siguiente corrida en vez de perderse).
- Extender `InventoryLotRepository` (puerto + implementaciones Prisma/InMemory) con métodos para listar lotes con ciclo de notificación pendiente y marcar un umbral como notificado.
- Nuevo caso de uso `SendInventoryExpiryNotificationsUseCase` que orquesta: leer lotes pendientes → determinar umbrales a notificar → agrupar por umbral → enviar 1 digest por umbral con lotes afectados → marcar cada `(lote, umbral)` como notificado.
- Nuevo método `AdminNotificationService.notifyInventoryExpiryDigest` — mismo patrón best-effort que los métodos existentes, pero recibe el destinatario por parámetro en vez de leerlo de `process.env.ADMIN_NOTIFICATION_EMAIL`.
- Nuevo grupo de configuración "Notificaciones de inventario" en `settings-api` (tabla singleton `inventory_notification_settings`, mismo patrón que `pricing_settings`): endpoint `GET/PATCH /api/v1/admin/settings/inventory-notifications` con el campo `expirationNotificationEmail`.
- Nueva sección en la UI de `/settings` para editar ese campo, siguiendo el patrón de `PricingSettingsForm`.
- Nueva ruta `POST /api/v1/admin/cron/inventory-expiry-notifications`, protegida con `CRON_SECRET` (sin JWT de usuario), agregada a la lista de rutas públicas del middleware, que dispara el caso de uso.
- Nuevo `vercel.json` con un cron diario apuntando a esa ruta.
- Nueva variable de entorno `CRON_SECRET`.

## Capabilities

### New Capabilities
- `inventory-expiry-notifications`: lógica de umbrales (6m/3m/día-mismo) con catch-up, agrupación en digest por umbral, orquestación del envío y marcado de notificado, y el endpoint cron que la dispara.

### Modified Capabilities
- `inventory-lots`: `InventoryLot` gana 3 columnas de debounce de notificación (`notifiedSixMonthsAt`, `notifiedThreeMonthsAt`, `notifiedDayOfAt`) y el repositorio gana los métodos de consulta/marcado que `inventory-expiry-notifications` consume.
- `admin-notifications-api`: nuevo método de notificación (`notifyInventoryExpiryDigest`) que, a diferencia de los dos existentes, recibe el destinatario por parámetro (viene de Settings) en vez de leer `ADMIN_NOTIFICATION_EMAIL`.
- `settings-api`: nuevo grupo de configuración singleton "Notificaciones de inventario" con su propio endpoint `GET/PATCH`.
- `settings-ui`: nueva sección de formulario en `/settings` para el campo de correo de notificación de caducidad.

## Impact

- **Schema**: migración nueva (`InventoryLot` +3 columnas, nuevo modelo `InventoryNotificationSettings`).
- **Backend**: `src/modules/inventory/{domain,application,infrastructure}/*`, `src/modules/settings/{domain,application,infrastructure}/*`, `src/shared/application/services/AdminNotificationService.ts`.
- **API**: 2 rutas nuevas (`app/api/v1/admin/settings/inventory-notifications/route.ts`, `app/api/v1/admin/cron/inventory-expiry-notifications/route.ts`), `middleware.ts`/`AuthMiddlewareAdapter` (nueva ruta pública exacta).
- **Frontend**: `app/(private)/settings/_blocks/InventoryNotificationSettingsForm.tsx`, `SettingsPage.tsx`, `_logic/{types,services,hooks}` correspondientes.
- **Infraestructura**: `vercel.json` (cron nuevo), `.env.example` (`CRON_SECRET`).
- **Sin impacto** en `ExpiryStatusCalculator`/`ExpiryStatusBadge` (badge UI 30/7 días) ni en `ADMIN_NOTIFICATION_EMAIL` (low-stock/venta cancelada siguen igual).
