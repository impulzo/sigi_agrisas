## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Usuario con `billing:read` | Como usuario con `billing:read`, quiero enviar la factura CFDI (PDF+XML) por correo al cliente para no depender de descargar y reenviar manualmente los archivos | Hoy solo existe descarga; el usuario pidió explícitamente poder enviarla por correo | - Given una factura timbrada con `facturamaCfdiId` y `customer.email` no nulo, When se llama `POST /invoices/:id/send-email` sin body, Then se envía un correo a `customer.email` con PDF+XML adjuntos (reusando `DownloadInvoiceFileUseCase`) y responde 200<br>- Given el body incluye `email` override, When se envía, Then el correo va a esa dirección en vez de `customer.email`<br>- Given `customer.email` es `null` y no se envía override, When se llama el endpoint, Then responde 400 con mensaje claro<br>- Given la factura no tiene `facturamaCfdiId` (nunca timbrada), When se llama el endpoint, Then responde 400<br>- Given SMTP falla, When se intenta enviar, Then responde 502 con error claro — este envío es síncrono y su fallo SÍ se reporta al caller | - Requiere `billing:read` (mismo permiso que descargar, sin permiso nuevo)<br>- Branch scoping igual que `download`/`get` de facturas existentes<br>- `email` override validado con Zod `.email()` antes de intentar el envío<br>- Credenciales SMTP nunca expuestas en logs ni en la respuesta HTTP |
| 2 | Sistema/backend | Como sistema, quiero notificar por correo al admin cuando se cancela una venta completada para que el negocio se entere de cancelaciones sin monitorear la UI constantemente | Segundo canal de visibilidad pedido explícitamente por el usuario, confirmado como evento disparador | - Given una venta `completed` se cancela exitosamente, When la transacción de cancelación commitea, Then se dispara un correo a `ADMIN_NOTIFICATION_EMAIL` con folio, monto total, motivo, sucursal, cajero<br>- Given el envío de correo falla, When ocurre el fallo, Then la cancelación YA COMMITEADA no se revierte ni el endpoint retorna error — el fallo se loguea únicamente<br>- Given `ADMIN_NOTIFICATION_EMAIL` no está configurado, When se cancela una venta, Then el sistema omite el envío sin fallar | - El correo no incluye datos de pago sensibles<br>- Envío ocurre DESPUÉS del commit de la transacción de cancelación, nunca dentro de la misma transacción de BD |
| 3 | Sistema/backend | Como sistema, quiero notificar por correo al admin cuando el stock de un producto cae bajo su `reorder_point`, con debounce de 24h por producto+sucursal, para alertar sin saturar la bandeja en productos de alta rotación | Mismo pedido, segundo evento confirmado; el debounce fue decisión explícita del usuario | - Given un decremento de `branch_inventory.quantity` deja `newQuantity < reorderPoint` y `lastLowStockNotifiedAt` es `null` o tiene ≥24h, When el decremento se aplica, Then se envía correo a `ADMIN_NOTIFICATION_EMAIL` y se actualiza `lastLowStockNotifiedAt = NOW()`<br>- Given el mismo producto+sucursal ya notificó hace <24h, When vuelve a cruzar el umbral, Then NO se reenvía ni se actualiza el timestamp<br>- Given `newQuantity >= reorderPoint`, When ocurre el decremento, Then `lastLowStockNotifiedAt` no se toca<br>- Given el correo falla, When ocurre, Then la operación de inventario ya aplicada no se revierte | - Verificación y posible envío ocurren DESPUÉS del commit del decremento<br>- `last_low_stock_notified_at` es de solo-lectura para el cliente HTTP |

Nota: las 3 historias comparten la misma infraestructura base (servicio SMTP genérico vía env vars) pero son independientes — la 1 es un endpoint HTTP síncrono; la 2 y 3 son efectos secundarios best-effort de use cases ya existentes.

## Why

Feedback de producción #34 ("factura enviar por correo") y #35 ("correo admin del sistema") — ninguno de los dos existe hoy: `billing` sólo permite descargar PDF/XML (`GET /invoices/:id/download`), y no hay ninguna infraestructura SMTP en el proyecto (`nodemailer`/SMTP/queue: cero coincidencias en `src/` y `package.json`). El usuario confirmó, vía preguntas de aclaración, 4 decisiones que acotan el alcance: SMTP configurado 100% por variables de entorno (sin UI ni tabla en BD — más simple y evita persistir credenciales), "correo admin" interpretado como notificaciones a un email fijo ante eventos importantes, los 2 eventos disparadores (venta cancelada, stock bajo `reorder_point`), y debounce de 24h para el evento de stock (evita spam en productos de alta rotación oscilando en el umbral). El envío de factura reusa integralmente `DownloadInvoiceFileUseCase`/`FacturamaGateway.download()` ya existentes — no se duplica lógica de generación de PDF/XML.

## What Changes

- Nuevo servicio de dominio compartido `SmtpMailer` (puerto + adaptador `nodemailer`) en `src/shared/infrastructure/mail/`, configurado vía `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM`. Falla en startup si las env vars requeridas faltan Y algún caller intenta usarlo (no falla el arranque del servidor si SMTP nunca se usa — mismo patrón laxo que otras integraciones opcionales).
- `billing-api`: nuevo endpoint `POST /api/v1/admin/invoices/:id/send-email`. Requiere `billing:read`. Body opcional `{ email?: string }`. Reusa `DownloadInvoiceFileUseCase` para obtener PDF+XML, los adjunta a un correo enviado a `customer.email` (o al override). Envío síncrono — fallo de SMTP se reporta al caller (HTTP 502).
- Nuevo servicio de dominio `AdminNotificationService` (best-effort, nunca lanza) en `src/shared/infrastructure/notifications/`, consumido por:
  - `pos-api` — `CancelSaleUseCase`: tras commitear la cancelación, dispara notificación de "venta cancelada" a `ADMIN_NOTIFICATION_EMAIL`.
  - `inventory-api`: los 4 puntos que decrementan `branch_inventory.quantity` (creación de venta, ajuste manual `/inventory/adjust` con delta negativo, edición de venta, cancelación de devolución) evalúan tras el decremento si `newQuantity < reorderPoint`; si aplica el debounce de 24h, disparan notificación de "stock bajo" y actualizan `lastLowStockNotifiedAt`.
- **Migración**: `branch_inventory` agrega columna `last_low_stock_notified_at TIMESTAMP(3) NULL`.
- Ambos tipos de notificación (cancelación, stock bajo) son best-effort: un fallo de SMTP se loguea (`console.error`) y NUNCA revierte ni falla la operación de negocio que lo disparó.
- Sin UI nueva: SMTP/`ADMIN_NOTIFICATION_EMAIL` son variables de entorno, no hay pantalla de configuración. El botón "Enviar por correo" en `/billing/[id]` es la única superficie de UI de este change.

## Capabilities

### New Capabilities
- `admin-notifications-api`: servicio compartido de notificación por correo al admin (best-effort, con debounce para stock bajo), consumido por `pos-api` e `inventory-api`.

### Modified Capabilities
- `billing-api`: se agrega el endpoint `POST /invoices/:id/send-email`.
- `pos-api`: `Cancel sale` gana el efecto secundario best-effort de notificación admin.
- `inventory-api`: los flujos que decrementan `branch_inventory.quantity` ganan el efecto secundario best-effort de notificación de stock bajo, y el modelo gana la columna `lastLowStockNotifiedAt`.

## Impact

- `prisma/schema.prisma` + migración nueva — `branch_inventory` +1 columna
- `src/shared/infrastructure/mail/SmtpMailer.ts` (nuevo) + puerto `MailerPort`
- `src/shared/infrastructure/notifications/AdminNotificationService.ts` (nuevo)
- `src/modules/billing/application/use-cases/SendInvoiceEmailUseCase.ts` (nuevo), `infrastructure/http/BillingController.ts` (+endpoint)
- `src/modules/pos/application/use-cases/CancelSaleUseCase.ts` (+efecto secundario)
- `src/modules/inventory/infrastructure/repositories/PrismaBranchInventoryRepository.ts` y los repositorios de `pos`/`returns` que decrementan inventario (+chequeo de umbral tras cada decremento)
- `app/(private)/billing/[id]/_blocks/` — botón "Enviar por correo" (nuevo)
- `package.json` — nueva dependencia `nodemailer` (+`@types/nodemailer`)
- Tests: unit de `AdminNotificationService` (debounce), `SendInvoiceEmailUseCase`, `CancelSaleUseCase` (efecto secundario no bloqueante), puntos de decremento de inventario (umbral+debounce)
