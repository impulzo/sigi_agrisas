# Spec: admin-notifications-api

## Purpose

Servicio compartido de notificación por correo al administrador ante eventos importantes del sistema (venta cancelada, stock bajo el punto de reorden), consumido como efecto secundario best-effort por `pos-api`, `returns-api` e `inventory-api` — nunca bloquea ni revierte la operación que lo dispara.

---

## Requirements

### Requirement: SMTP configuration via environment variables
The system SHALL read SMTP connection settings exclusively from environment variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (the "From" address for all outgoing mail), and `ADMIN_NOTIFICATION_EMAIL` (the recipient for both notification types below). There is NO UI screen and NO database table for these settings. If `SMTP_HOST` is unset, any attempt to send mail (invoice email or admin notification) SHALL fail gracefully per the specific requirement's rules below — the application SHALL NOT fail to start due to missing SMTP configuration.

#### Scenario: Missing SMTP config does not crash the app
- **WHEN** the application starts without `SMTP_HOST` set
- **THEN** the server starts normally; only requests that actually attempt to send mail are affected

#### Scenario: Missing ADMIN_NOTIFICATION_EMAIL disables admin notifications silently
- **WHEN** `ADMIN_NOTIFICATION_EMAIL` is unset and a sale cancellation or low-stock event occurs
- **THEN** the system skips the notification attempt entirely (no error logged, no send attempted) — this is a valid "notifications disabled" configuration, not a failure state

### Requirement: Notify admin on sale cancellation
The system SHALL send an email to `ADMIN_NOTIFICATION_EMAIL` whenever a `completed` or `edited` sale transitions to `cancelled` via `POST /api/v1/admin/sales/:id/cancel` (see `pos-api` "Cancel sale"). The email SHALL include: `folioCode`, `total`, `cancellationReason` (or "sin motivo" if null), `branchId`/branch name, and the cashier who originally created the sale. The send SHALL occur strictly AFTER the cancellation's database transaction has committed, and SHALL be best-effort: any error thrown by the mail transport SHALL be caught and logged (`console.error`) internally by this service — it SHALL NEVER propagate to the caller of `CancelSaleUseCase`, and SHALL NEVER cause the cancellation to be retried, rolled back, or reported as failed.

#### Scenario: Successful notification
- **WHEN** a `completed` sale with `folioCode="TK-000042"`, `total=1500`, `cancellationReason="Cliente cambió de opinión"` is cancelled
- **THEN** an email is sent to `ADMIN_NOTIFICATION_EMAIL` containing that folio, total, and reason

#### Scenario: SMTP failure does not affect the cancellation
- **WHEN** the SMTP server is unreachable at the moment of sending this notification
- **THEN** the sale remains `cancelled` (already committed), the original `POST /sales/:id/cancel` caller still receives HTTP 200, and the mail error is only visible in server logs

#### Scenario: Idempotent double-cancel does not re-notify
- **WHEN** a sale is cancelled twice (second call is idempotent per `pos-api` "Cancel sale")
- **THEN** the second call does NOT trigger a second notification (no new transition occurred)

### Requirement: Notify admin on low stock (debounced)
The system SHALL send an email to `ADMIN_NOTIFICATION_EMAIL` when any operation decrements `branch_inventory.quantity` (sale creation, sale edit's re-apply step, inventory manual adjustment with negative delta, return cancellation — see the respective MODIFIED requirements in `pos-api`, `inventory-api`, `returns-api`) and the resulting `quantity < reorder_point` for that `(branchId, productId)` pair.

To prevent repeated notifications for the same pair oscillating around the threshold, the system SHALL persist `branch_inventory.lastLowStockNotifiedAt` (nullable `TIMESTAMP(3)`) and apply this rule: send (and update `lastLowStockNotifiedAt = NOW()`) ONLY IF `lastLowStockNotifiedAt IS NULL` OR `NOW() - lastLowStockNotifiedAt >= 24 hours`. If the resulting `quantity >= reorder_point` after any decrement, `lastLowStockNotifiedAt` SHALL NOT be reset or modified (a rebound above the threshold does not shorten the debounce window for the next drop).

The email SHALL include: product name/code, branch name, current `quantity`, `reorder_point`. Same best-effort semantics as "Notify admin on sale cancellation": failures are logged, never propagated, never block or revert the triggering operation. The check and any resulting send SHALL occur after the triggering decrement has been committed (or, for multi-step flows sharing one transaction, after that transaction commits) — never inside the transaction that performs the decrement.

#### Scenario: First crossing sends and stamps the debounce
- **WHEN** a product's `quantity` drops from `15` to `8` with `reorder_point=10`, and `lastLowStockNotifiedAt` is `null`
- **THEN** an email is sent and `lastLowStockNotifiedAt` is set to the current time

#### Scenario: Second crossing within 24h is suppressed
- **WHEN** the same product drops further (e.g. `8 → 5`) 2 hours after the first notification
- **THEN** no email is sent and `lastLowStockNotifiedAt` is unchanged

#### Scenario: Crossing after 24h sends again
- **WHEN** the same product drops again 25 hours after the last notification
- **THEN** a new email is sent and `lastLowStockNotifiedAt` is updated to the current time

#### Scenario: Rebound above threshold does not reset debounce
- **WHEN** a product's quantity rises back above `reorder_point` (e.g. via a return or a positive adjustment) 1 hour after a notification, and then drops below the threshold again 2 hours later (3 hours after the original notification)
- **THEN** the second drop does NOT trigger a new email (still within the 24h window from the original notification)

#### Scenario: Positive adjustments never trigger this check
- **WHEN** an operation only increases `branch_inventory.quantity` (return creation, sale cancellation restoring stock, positive manual adjustment)
- **THEN** the low-stock check is not evaluated for that operation

#### Scenario: SMTP failure does not affect the triggering operation
- **WHEN** the SMTP server is unreachable at the moment of sending a low-stock notification
- **THEN** the triggering sale/adjustment/return-cancellation remains fully applied, its HTTP response is unaffected, and the mail error is only visible in server logs
