## Context

No existe infraestructura de correo saliente en el proyecto (confirmado: cero coincidencias de `nodemailer`/SMTP/queue en `src/` y `package.json`). `billing` ya genera PDF/XML de CFDI vía `DownloadInvoiceFileUseCase`/`FacturamaGateway.download()` — este change los reusa sin duplicar lógica. `branch_inventory` (`prisma/schema.prisma`) ya tiene `reorderPoint` y se decrementa en 4 puntos distintos de 2 módulos (`pos`, `returns`) más el endpoint manual `/inventory/adjust`. Las decisiones de alcance (SMTP por env var, 2 eventos disparadores, debounce 24h) ya fueron confirmadas por el usuario — ver proposal.md Historia de Usuario.

## Goals / Non-Goals

**Goals:**
- Enviar factura CFDI por correo (historia 1) reusando el pipeline de descarga existente.
- Notificar al admin ante venta cancelada y stock bajo `reorder_point`, sin bloquear ni revertir la operación que dispara la notificación (historias 2 y 3).
- Debounce de 24h por producto+sucursal para el evento de stock bajo.

**Non-Goals:**
- Sin UI de configuración SMTP ni tabla en BD para credenciales — 100% env vars.
- Sin cola de reintentos ni infraestructura de jobs — un correo que falla se pierde (documentado, aceptado por el usuario).
- Sin plantillas HTML sofisticadas — correos en texto plano/HTML simple inline, sin motor de templates nuevo.
- Sin validación de formato en `Customer.email` a nivel de dominio (fuera de scope; se usa tal cual existe hoy).
- Sin notificación para otros eventos (creación de venta, autorización de cotización, etc.) — sólo los 2 confirmados.

## Decisions

**D1 — `nodemailer` como cliente SMTP.** Librería estándar de Node, sin dependencias de infraestructura externa, corre en el runtime Node de las route handlers (no Edge). Alternativa considerada: servicio transaccional (Resend/SendGrid API) — descartada porque el usuario pidió explícitamente SMTP genérico por env vars, no un proveedor con API key propia.

**D2 — Puerto `MailerPort` en `src/shared/application/ports/` + adaptador `SmtpMailer` en `src/shared/infrastructure/mail/`.** Sigue el patrón hexagonal ya establecido (ports en application, implementación en infrastructure) usado en `PosLookupService`, `FacturamaGateway`, etc. `MailerPort.send({to, subject, html, attachments?})` — firma mínima genérica, reusable por las 3 historias.

**D3 — `AdminNotificationService` como servicio de aplicación compartido, no un use case por evento.** Un solo servicio con dos métodos (`notifySaleCancelled(sale)`, `notifyLowStock(item)`) inyectado donde se necesita, en vez de EventEmitter/bus de eventos (que no existe en el proyecto y sería sobre-ingeniería para 2 disparadores). Cada método construye el `html`/`subject` y llama `MailerPort.send`, capturando cualquier excepción internamente (`try/catch` + `console.error`) — nunca propaga. Esto satisface el criterio de seguridad "envío ocurre después del commit, nunca bloquea" de forma estructural: el servicio en sí no puede lanzar.

**D4 — Notificaciones se disparan DESPUÉS de que el use case retorna (fuera de la transacción Prisma), no dentro de ella.** `CancelSaleUseCase.execute()` y los use cases de inventario llaman `await this.notifier.notifySaleCancelled(result)` como última línea, después de que el repositorio ya confirmó. Alternativa considerada: disparar dentro del `$transaction` de Prisma — descartada porque un SMTP lento/caído añadiría latencia o fallos a la transacción de BD, violando el criterio "nunca bloquea/revierte".

**D5 — Debounce vía columna `last_low_stock_notified_at` en `branch_inventory`, chequeada en el mismo punto que ya lee `reorderPoint`.** No se crea tabla nueva — encaja como columna adicional nullable en el modelo existente, igual patrón que `numPartsSnapshot` en el change anterior. El chequeo (`newQuantity < reorderPoint && (lastLowStockNotifiedAt === null || now - lastLowStockNotifiedAt >= 24h)`) y el `UPDATE ... SET last_low_stock_notified_at = NOW()` ocurren en una query separada INMEDIATAMENTE después del decremento (no en la misma transacción del decremento, para no bloquearla — ver D4), pero antes de retornar al caller del use case, de modo que sea determinístico en tests.

**D6 — 4 puntos de decremento comparten un solo helper `checkAndNotifyLowStock(branchId, productId, newQuantity, reorderPoint, notifier)`.** Mismo patrón que `inventoryQuantityOf` del change anterior (helper puro reusado en múltiples repositorios) — evita duplicar la lógica de umbral+debounce en `PrismaSaleRepository`, `PrismaReturnRepository`, `PrismaBranchInventoryRepository` (ajuste manual).

**D7 — `POST /invoices/:id/send-email` es síncrono y SÍ propaga error de SMTP (a diferencia de D3/D4).** A diferencia de las notificaciones admin (efecto secundario de una operación YA completada), aquí el correo ES la operación completa que el usuario solicitó — no hay nada previo que proteger de un rollback. Si SMTP falla, el caller debe saberlo (HTTP 502) para reintentar manualmente.

## Risks / Trade-offs

- **[Riesgo] Un correo de notificación admin perdido (SMTP caído) no se reintenta ni se loguea en un lugar visible para el usuario de negocio** → Mitigación: aceptado explícitamente por el usuario para v1; `console.error` queda en los logs del servidor para diagnóstico técnico. Documentado como limitación conocida en tasks.md.
- **[Riesgo] El helper `checkAndNotifyLowStock` debe llamarse en los 4 puntos correctos; olvidar uno deja ese flujo sin notificar silenciosamente** → Mitigación: mismo patrón de verificación que `inventoryQuantityOf` — checklist explícito en tasks.md por cada repositorio tocado, más un test de integración por flujo.
- **[Riesgo] `nodemailer` en un route handler de Next.js requiere runtime Node (no Edge)** → Mitigación: las rutas de `app/api/v1/admin/**` ya corren en runtime Node por defecto (no se ha configurado `export const runtime = "edge"` en ninguna); no se requiere cambio.
- **[Riesgo] `Customer.email` no tiene validación de formato hoy** → Mitigación: fuera de scope arreglar el dominio de `Customer`; el endpoint de envío valida el override con Zod `.email()`, pero si `customer.email` ya tiene un valor mal formado en BD, el envío fallará en `nodemailer` con un error claro (HTTP 502), no silenciosamente.

## Migration Plan

1. `npm install nodemailer @types/nodemailer`.
2. Migración Prisma: `branch_inventory` +1 columna nullable (`ALTER TABLE ... ADD COLUMN`, mismo patrón que la migración anterior).
3. Sin cambios de configuración obligatorios para desplegar — si `SMTP_HOST`/`ADMIN_NOTIFICATION_EMAIL` no están seteados, los efectos secundarios son no-op (no rompen nada existente) y el endpoint de envío de factura responde 500 con mensaje claro si se invoca sin SMTP configurado. Rollback: revertir el deploy: la columna nueva es nullable y no la usa ningún flujo previo, sin necesidad de down-migration urgente.
