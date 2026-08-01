## 1. Dependencias + configuración

- [x] 1.1 `npm install nodemailer @types/nodemailer`.
- [x] 1.2 `.env.example` — documentar `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `ADMIN_NOTIFICATION_EMAIL` (todas opcionales — su ausencia deshabilita gracefully el envío correspondiente, no rompe el arranque).

## 2. Schema + migración

- [x] 2.1 `prisma/schema.prisma` — `BranchInventory` agrega `lastLowStockNotifiedAt DateTime? @map("last_low_stock_notified_at")`.
- [x] 2.2 Migración generada vía `prisma migrate diff` filtrada a la columna nueva (mismo flujo que el change anterior: `prisma migrate diff --from-url "$DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --script`, filtrar manualmente, escribir carpeta de migración, `prisma migrate deploy` + `prisma generate`).

## 3. Servicio SMTP compartido

- [x] 3.1 `src/shared/application/ports/MailerPort.ts` (nuevo) — interfaz `send({to, subject, html, attachments?: {filename, content: Buffer, contentType}[]}): Promise<void>`.
- [x] 3.2 `src/shared/infrastructure/mail/NodemailerMailer.ts` (nuevo) — implementa `MailerPort` con `nodemailer.createTransport` leyendo `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM`. Si `SMTP_HOST` no está seteado, `send()` lanza un error claro (`SmtpNotConfiguredError`) — el caller decide si lo propaga (billing) o lo traga (notificaciones admin).
- [x] 3.3 `src/shared/infrastructure/di/mailerContainer.ts` (o el patrón DI existente del proyecto) — singleton de `NodemailerMailer`.

## 4. Servicio de notificaciones admin

- [x] 4.1 `src/shared/application/services/AdminNotificationService.ts` (nuevo) — clase con `notifySaleCancelled(sale: {folioCode, total, cancellationReason, branchName, cashierName}): Promise<void>` y `notifyLowStock(item: {productName, productCode, branchName, quantity, reorderPoint}): Promise<void>`. Ambos métodos: construyen `subject`/`html`, llaman `mailer.send(...)` a `process.env.ADMIN_NOTIFICATION_EMAIL`, envueltos en `try/catch` que loguea con `console.error` y NUNCA relanza. Si `ADMIN_NOTIFICATION_EMAIL` no está seteado, retornan inmediatamente sin intentar enviar (no-op silencioso).
- [x] 4.2 `src/shared/domain/services/checkAndNotifyLowStock.ts` (nuevo) — `shouldNotifyLowStock(newQuantity, reorderPoint, lastLowStockNotifiedAt, now?)` pura + `checkAndNotifyLowStock({newQuantity, reorderPoint, lastLowStockNotifiedAt, notify, updateNotifiedAt})` orquestador — si aplica, llama `notify()` y `updateNotifiedAt()` (callbacks inyectados por el caller, que persiste `lastLowStockNotifiedAt = NOW()` vía el repo correspondiente).
- [x] 4.3 Tests unitarios de `checkAndNotifyLowStock`/`shouldNotifyLowStock`: primera vez envía, dentro de 24h no reenvía, después de 24h reenvía, rebote sobre el umbral no resetea el debounce, `quantity >= reorderPoint` nunca evalúa. Más `AdminNotificationService` (envía si hay email, no-op si no, nunca lanza si el mailer falla).

## 5. Integración — pos-api (Cancel sale + decrementos)

- [x] 5.1 `CancelSaleUseCase.ts` — tras el `await this.repo.cancel(...)`, llama `await this.notifier.notifySaleCancelled({...})` (notifier opcional inyectado por constructor).
- [x] 5.2 `recordInventoryMovement` (helper compartido, único punto real de escritura de `branch_inventory.quantity` usado por `pos`/`returns`/`inventory`) — centraliza el chequeo `shouldNotifyLowStock` + el `UPDATE last_low_stock_notified_at` (dentro de la misma transacción, sin I/O de red) para `direction === "OUT"`, retornando `lowStockSignal` al caller. Decisión tomada durante el apply: en vez de duplicar el chequeo en cada repo (5.2/5.3/6.1/7.1 originalmente separadas), se centraliza aquí — cubre `createCompleted`/`createCompletedFromQuote` automáticamente.
- [x] 5.3 `PrismaSaleRepository.replaceItemsAndRecalculate` (edición de venta) — el loop de "apply" (OUT) recolecta `lowStockSignal`; el de "restore" (IN) no genera señal (helper sólo evalúa en OUT). Tras el `$transaction`, dispara `notifier.notifyLowStock(...)` por cada señal.
- [x] 5.4 DI — `CancelSaleUseCase`/`PrismaSaleRepository` ganan parámetro opcional `notifier?: AdminNotificationService`; queda pendiente cablear el DI real del módulo `pos` en la sección de DI global (ver 5.5 nueva).
- [x] 5.5 (añadida) `src/modules/pos/infrastructure/di/container.ts` — instancia `AdminNotificationService` desde `mailerContainer` e inyecta en `PrismaSaleRepository`/`CancelSaleUseCase`.

## 6. Integración — returns-api (Cancel return)

- [x] 6.1 `PrismaReturnRepository.markCancelled` — recolecta `lowStockSignal` del loop de `recordInventoryMovement` (OUT), dispara `notifier.notifyLowStock(...)` tras el `$transaction` (con `branchName` resuelto vía `prisma.branch.findUnique`).
- [x] 6.2 DI — `PrismaReturnRepository` gana parámetro opcional `notifier?: AdminNotificationService`; cableado real en `src/modules/returns/infrastructure/di/container.ts`.

## 7. Integración — inventory-api (Adjust stock)

- [x] 7.1 `PrismaBranchInventoryRepository.adjust` — `recordInventoryMovement` ya filtra por `direction` (`delta > 0` → `"IN"`, nunca genera señal); recolecta `lowStockSignal` del resultado y dispara `notifier.notifyLowStock(...)` tras el `$transaction`.
- [x] 7.2 DI — `PrismaBranchInventoryRepository` gana parámetro opcional `notifier?: AdminNotificationService`; cableado real en `src/modules/inventory/infrastructure/di/container.ts`.
- [x] 7.3 `InMemoryBranchInventoryRepository`, `InMemorySaleRepository`, `InMemoryReturnRepository` — sin cambios (no simulan movimientos de inventario real, confirmado sin necesidad de tocarlos; los tests que necesitan verificar el disparo de notificación lo hacen a nivel de `checkAndNotifyLowStock`/`recordInventoryMovement`, no de estos repos in-memory).

## 8. Backend — billing (enviar factura por correo)

- [x] 8.1 `src/modules/billing/application/use-cases/SendInvoiceEmailUseCase.ts` (nuevo) — `execute(id: string, overrideEmail?: string): Promise<{sentTo: string}>`. Reusa `DownloadInvoiceFileUseCase` (ambos formatos), resuelve destinatario vía `BillingLookupService.findCustomer` (interfaz `CustomerForBilling` extendida con `email: string | null`), valida `facturamaCfdiId` no nulo, llama `mailer.send(...)` con ambos adjuntos. Errores de dominio: `InvoiceNoEmailError`, `InvoiceNotStampedError`, `InvoiceEmailSendFailedError` (envuelve el error del mailer). Agregados a `src/modules/billing/domain/errors.ts` (archivo único de errores del módulo, no `errors/` dir).
- [x] 8.2 `src/modules/billing/infrastructure/http/BillingController.ts` — método `sendEmail(req, id)`: valida `billing:read` + branch scope (mismo patrón que `download`), body Zod `{ email: z.string().email().optional() }`, catch mapea `InvoiceNoEmailError`/`InvoiceNotStampedError` → 400, `InvoiceEmailSendFailedError` → 502.
- [x] 8.3 `app/api/v1/admin/invoices/[id]/send-email/route.ts` (nuevo) — delega a `billingController.sendEmail`.
- [x] 8.4 DI (`src/modules/billing/infrastructure/di/container.ts`) — instancia `SendInvoiceEmailUseCase` con `DownloadInvoiceFileUseCase` + `mailer` (de `mailerContainer`) inyectados.

## 9. Frontend — botón "Enviar por correo"

- [x] 9.1 `app/(private)/billing/_logic/services/sendInvoiceEmail.ts` (nuevo) — `POST /api/v1/admin/invoices/:id/send-email` vía `authFetch`, acepta `email?: string` opcional, normaliza errores HTTP a tipos (`InvoiceNoEmailError`, `InvoiceNotStampedError`, `InvoiceEmailSendFailedError`) agregados a `app/(private)/billing/_logic/errors.ts`.
- [x] 9.2 `app/(private)/billing/_blocks/SendInvoiceEmailModal.tsx` (nuevo) — botón "Enviar por correo" en `InvoiceActionsBar.tsx` (siempre visible junto a descarga PDF/XML, mismo gate de página que `billing:read`), abre el modal. Simplificación respecto al plan original: en vez de pre-detectar `customer.email` en el frontend (requeriría exponerlo en el DTO), el modal siempre muestra un campo de correo opcional ("vacío usa el del cliente") — si el backend responde `InvoiceNoEmailError`, el modal lo muestra inline invitando a capturar uno y reintentar, sin cerrar el modal.
- [x] 9.3 Feedback de éxito/error inline dentro del propio modal (`localError`/`success` state) — `useInvoiceMutations.sendEmail` NO traga el error (a diferencia de `cancel`/`download`) para que el modal pueda distinguir `InvoiceNoEmailError` de otros errores.

## 10. Tests

- [x] 10.1 `tests/unit/modules/shared/application/services/AdminNotificationService.test.ts` — best-effort: un `MailerPort` que lanza no propaga; `ADMIN_NOTIFICATION_EMAIL` ausente → no intenta enviar.
- [x] 10.2 `tests/unit/modules/shared/domain/services/checkAndNotifyLowStock.test.ts` — los 5 escenarios de `admin-notifications-api` "Notify admin on low stock" (primera vez, dentro de 24h, después de 24h, rebote no resetea, `quantity >= reorderPoint` no evalúa).
- [x] 10.3 `tests/unit/modules/pos/application/use-cases/CancelSaleUseCase.test.ts` — nuevo caso: notificador falla, la cancelación igual retorna éxito. `CancelSaleUseCase.ts` gana try/catch defensivo propio (además del de `AdminNotificationService`) para garantizar esto estructuralmente.
- [x] 10.4 `tests/unit/modules/billing/SendInvoiceEmailUseCase.test.ts` — casos: éxito con `customer.email`, éxito con override, sin email → error, sin `facturamaCfdiId` → error, no encontrada → error, mailer falla → error propagado.
- [x] 10.5 `tests/unit/modules/billing/infrastructure/http/BillingControllerScoping.test.ts` (archivo existente, no `BillingController.test.ts` — ese no existe en el proyecto) — nuevo `describe("sendEmail")`: 400 (email malformado), 400 (sin email), 403 (fuera de sucursal), 404 (no encontrada), 200 (override). 502 cubierto a nivel de use case (10.4) — el controller sólo mapea, ya probado ahí.
- [x] 10.6 `tests/integration/modules/pos/sales-low-stock-notification.test.ts` (nuevo) — venta real contra BD real (Supabase) con `PrismaSaleRepository` + mock de `AdminNotificationService` inyectado: no notifica por encima de reorderPoint, notifica al cruzar por primera vez (con datos correctos), no reenvía dentro de 24h, reenvía tras forzar `last_low_stock_notified_at` a hace 25h. 4/4 verde.
- [x] 10.7 `tests/unit/ui/(private)/billing/SendInvoiceEmailModal.test.tsx` — 5 casos: envío sin override, envío con override, `InvoiceNoEmailError` invita a capturar correo sin cerrar el modal, `InvoiceEmailSendFailedError` muestra mensaje genérico, botón Cerrar invoca `onClose`. También se corrigieron 4 fixtures pre-existentes rotos por el nuevo prop `onSendEmailClick` (`BillingGating.test.tsx`) y el nuevo campo `isSendingEmail`/`sendEmail` del hook (`SaleInvoicesSection.test.tsx`).

## 11. Verificación

- [x] 11.1 `npm run build` OK.
- [x] 11.2 `npx jest` verde — subconjunto scoped (`pos`/`returns`/`inventory`/`billing`/UI `billing`): 54/54 suites, 427/427 tests. Suite completa del proyecto (`--runInBand`, ~13 min): **2702/2702 tests pasaron**; 1 suite (`returns-branch-scoping.test.ts`, no tocada por este change) falló por un drop de conexión del pooler de Supabase durante el cleanup tras la corrida larga en serie — infraestructura, no código. Se confirmó por separado y aparte una race condition preexistente entre `products-crud.test.ts`/`inventory-crud.test.ts` (prefijo `INVTEST_` compartido, sólo colisiona en modo paralelo) — ambos pasan limpio en serie, ninguno de los dos archivos fue tocado por este change.
- [x] 11.3 Smoke real end-to-end (Playwright, SMTP real vía cuenta de prueba Ethereal generada con `nodemailer.createTestAccount()`, credenciales sólo en `.env.local` gitignored, dev server reiniciado tras el build):
  - **Factura por correo**: factura sin cliente vinculado → sin override → modal pide correo (`InvoiceNoEmailError` correcto) → con override `cliente-smoke-test@ejemplo.com` → "Correo enviado a..." → verificado en bandeja Ethereal: remitente `Agrisas <no-reply@agrisas.mx>`, destinatario correcto, asunto `Factura <UUID>`, **2 adjuntos** `.pdf`+`.xml` presentes ✓
  - **Notificación venta cancelada**: venta real (folio TK-000007, $277.00) cancelada desde `/sales/:id` → correo recibido "Venta cancelada — folio TK-000007" con total, motivo ("sin motivo"), sucursal (Matriz), cajero (Admin) correctos ✓
  - **Notificación stock bajo — primera vez**: `branch_inventory` seteado a `quantity=5, reorderPoint=10` (ya bajo el umbral) → venta de 1 unidad (5→4) → correo recibido "Stock bajo — PACKHARD 1 L" con sucursal/existencia/reorderPoint correctos ✓
  - **Debounce 24h**: segunda venta inmediata (4→3, sigue bajo el umbral) → **sin correo nuevo** (bandeja se mantiene en 3 mensajes) ✓; verificado en BD: `quantity=3`, `lastLowStockNotifiedAt` sin cambios desde la primera notificación ✓
  - Los 3 disparadores (`admin-notifications-api`) y el envío síncrono de factura (`billing-api`) quedan confirmados con entrega SMTP real, no sólo mocks.
