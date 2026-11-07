## Context

`src/modules/payments/` (abonos) hoy modela `CustomerPayment` con `saleId`
obligatorio (schema, Zod, use case): todo abono está atado a una venta a
crédito específica. El único entry point de UI es `SaleDetailPage` →
`RegisterPaymentModal`. `/payments` existe como listado de solo lectura.

Esto deja dos huecos (ver `## Historia de Usuario` en `proposal.md`):
cajeros no pueden llegar al flujo de abono desde el cliente (historia 1),
y no existe forma de cobrar deuda sin ticket — `customer.initialBalance`
al dar de alta un cliente no genera ninguna `Sale` (historia 2). El módulo
que iba a cubrir esto (`add-customer-credit`) quedó diferido desde
`add-pos` y nunca se construyó.

Restricción de diseño fijada por el usuario (no negociable, no se
reabre): **sin reparto automático**. El cajero elige explícitamente, por
cada abono, si aplica a una venta puntual o al saldo general del cliente
— nunca el sistema decide a qué ticket(s) aplica un monto.

Spec existente relevante: `openspec/specs/customers-api/spec.md` (~línea
278) declara que `currentBalance` tiene exactamente 3 "owners" de su
mutación: `payments-api` (por venta), la rama de crédito de `POST /sales`,
y `initialBalance` al crear/editar cliente.

## Goals / Non-Goals

**Goals:**
- Permitir registrar un abono "a saldo general" (sin venta), acotado por
  la porción de deuda que genuinamente no corresponde a ningún ticket
  pendiente (historia 2).
- Permitir llegar al flujo de abono por venta desde `/payments`, eligiendo
  primero al cliente, sin tener que localizar el ticket en `/sales`
  (historia 1).
- Permitir cancelar un abono "a saldo general" con el mismo flujo ya
  existente de cancelación (historia 3).
- Mantener intacto el contrato y la lógica del endpoint existente
  `POST /api/v1/admin/payments` (abono por venta) — cero regresión.

**Non-Goals:**
- Reparto automático (FIFO u otro) de un monto entre varias ventas
  pendientes — decisión de producto explícita, descartada.
- "Cancelar grupo" o cualquier agrupación visual de varios abonos como una
  sola operación — cada fila de `CustomerPayment` se cancela individual.
- Tocar `src/modules/pos/` (`GET /sales`) — se evita deliberadamente
  extender ese módulo; el preview de ventas pendientes se resuelve con un
  endpoint propio de `customers`/`payments`.
- Permitir que el abono "a saldo general" page deuda de un ticket — está
  topado estructuralmente, no por convención de UI.

## Decisions

### D1. `CustomerPayment.saleId` pasa a nullable (no entidad separada)

**Decisión**: `saleId String?` en el schema existente, en vez de una
entidad nueva (`CustomerAccountPayment` o similar) para abonos sin ticket.

**Alternativa considerada y descartada**: entidad separada. Se descarta
porque duplicaría ~90% de la lógica ya existente (snapshot de folio,
cancelación, branch scoping, reporte/PDF/XLSX, RBAC) en una segunda
tabla, y forzaría un `UNION` en `findHistory` (ya es raw SQL complejo) para
reportes consolidados. Rompería además el principio de "un solo ledger de
abonos por cliente" que hoy da trazabilidad limpia vía folio secuencial
único.

**Precedente en el propio schema**: `Sale.customerId` ya es `String?`
(venta sin cliente) sin columna discriminadora extra — se sigue el mismo
patrón (nullable FK, derivable de `saleId IS NULL`, sin un `kind`
redundante).

### D2. Tope del abono "a saldo general" = `accountDebt`, no `currentBalance`

**Decisión**: `accountDebt = currentBalance - SUM(total - paidAmount de
ventas a crédito pendientes del cliente)`, calculado con un `UPDATE ...
WHERE current_balance - :amount >= (subquery)` atómico.

**Por qué no el `currentBalance` completo**: si el tope fuera el balance
completo, el cajero podría abonar vía "saldo general" dinero que en
realidad corresponde a un ticket pendiente, dejando esa venta marcada
`pending`/`partial` para siempre aunque el cliente ya pagó —
inconsistencia contable permanente, ya que no hay reparto automático que
lo corrija después. El subquery lo previene a nivel de base de datos, no
solo de UI (criterio de seguridad de la historia 2: "nunca confiar en el
monto validado en cliente").

**Alternativa descartada**: topar solo contra `currentBalance` y confiar
en que el cajero elija bien. Rechazada por el mismo motivo — es
exactamente el escenario que el Non-Goal de reparto automático buscaba
evitar, solo que manual.

### D3. Endpoint anidado bajo `customers`, no `customerId` opcional en `/payments`

**Decisión**: `POST`/`GET /api/v1/admin/customers/[id]/payments`, endpoint
nuevo y separado de `POST /api/v1/admin/payments`.

**Alternativa descartada**: agregar `customerId` opcional al body
existente de `/payments` con `saleId` opcional (XOR). Rechazada porque
obligaría a un Zod discriminated-union frágil y tocaría el contrato de un
endpoint que hoy funciona y no necesita cambiar — viola el Goal de cero
regresión en el camino por venta. El precedente de `/branches/[id]/inventory`
(rutas anidadas bajo el recurso padre cuando Next.js no permite slugs
hermanos distintos) se extiende aquí por consistencia, aunque la razón
técnica sea distinta (aquí es para no ensuciar un contrato existente).

### D4. El camino "abonar a venta" desde `/payments` no agrega backend nuevo

**Decisión**: el nuevo selector de cliente en `/payments` (historia 1)
solo necesita datos de lectura (`GET .../payments` del punto D3: ventas
pendientes del cliente) y, al elegir una, abre el `RegisterPaymentModal`
ya existente con ese `saleId`. Cero cambios a `RegisterPaymentUseCase` ni
al endpoint `POST /payments`.

**Por qué**: minimiza blast radius; el riesgo de este change se concentra
en el camino nuevo (D1/D2), no en reimplementar algo que ya funciona.

### D5. `markCancelled` gana una rama para `saleId=null`

**Decisión**: si `payment.saleId === null`, la cancelación solo restaura
`customer.currentBalance`, sin tocar ninguna `sales`. Reusa
`CancelPaymentUseCase` sin cambios de firma.

**Alternativa descartada**: nuevo use case de cancelación para abonos sin
venta. Rechazada por ser una rama de 3 líneas dentro del método existente
— una clase nueva sería sobre-ingeniería para la variación real.

## Risks / Trade-offs

- **[Riesgo] Null-safety incompleta en lectura existente** → `findById`
  (`row.sale!`), `list()` (defaults `""`/`0`/`"pending"` en vez de `null`),
  `findHistory` (`INNER JOIN sales` debe volverse `LEFT JOIN`), PDF/XLSX
  (agrupador por `saleId` colapsaría abonos "a cuenta" de distintos
  clientes en un grupo falso si no se corrige la key a `saleId ?? "account:"+id`).
  **Mitigación**: lista exhaustiva de archivos a tocar en `tasks.md`;
  cobertura de tests existente (`PaymentsController.test.ts`, etc.) se
  extiende con casos `saleId=null` antes de mergear.
- **[Riesgo] Concurrencia — dos abonos "a saldo general" simultáneos al
  mismo cliente** → mitigado por el guard atómico de D2 (el `UPDATE` con
  subquery falla con 0 filas si el segundo abono ya no cabe en
  `accountDebt` recalculado).
- **[Trade-off] Asimetría de concurrencia con el flujo existente** —
  `createCompleted` (abono por venta) NO tiene un guard atómico
  equivalente sobre `sales.paid_amount` (hace pre-check en JS y luego
  `UPDATE` incondicional). Es una laguna preexistente, fuera de alcance de
  este change — se documenta para no asumir que todo el módulo ya es
  concurrency-safe por simetría con el camino nuevo.
- **[Riesgo] Reportes muestran varias filas por "un solo abono global"
  percibido por el cajero** → en este diseño ya no aplica: cada registro
  es una operación independiente y explícita (D4/Non-Goals), no hay un
  abono lógico que se reparta en N filas. Se documenta solo para
  claridad, no es un riesgo real bajo este diseño.
- **[Trade-off] `branchId` de la fila "a saldo general" cuando el caller
  tiene `branches:access_all` y no especifica sucursal** → ver Open
  Questions.

## Migration Plan

1. Migración Prisma `make_payment_sale_id_optional` (`ALTER COLUMN
   sale_id DROP NOT NULL`) — sin backfill, todas las filas existentes ya
   son no-nulas. Reversible (`ALTER COLUMN sale_id SET NOT NULL` solo
   falla si ya existen filas `saleId=null`, lo cual es esperado tras el
   deploy).
2. Backend (domain → application → infrastructure Prisma/InMemory → HTTP)
   antes que frontend, siguiendo el orden de capas hexagonales — permite
   correr la suite de tests de backend como gate antes de tocar UI.
3. Frontend: nuevo modal + servicios + hook, luego wiring en
   `PaymentsToolbar`/`PaymentsListPage`.
4. Specs (`payments-api`, `customers-api`) se sincronizan en el mismo
   change — no se archivan hasta `opsx:verify` + instrucción explícita del
   usuario de archivar.
5. Rollback: revertir el PR revierte código; la migración de schema
   (`DROP NOT NULL`) es segura de dejar aplicada aunque se revierta el
   código (no rompe el flujo por venta, que sigue validando `saleId` vía
   Zod en su propio endpoint).

## Open Questions

- **Resuelta durante `apply`**: `branchId` de la fila "a saldo general"
  cuando el caller tiene `branches:access_all` y no envía `branchId`
  explícito → se exige obligatorio en el body (HTTP 400 si se omite); sin
  bypass, se reutiliza `resolveScopedBranchId` ya existente en el módulo
  (no una resolución propia): un `branchId` ausente se fuerza a
  `x-user-branch-id`, uno explícito que no coincida se RECHAZA con 403
  (no se "ignora" silenciosamente — más estricto que el texto original de
  esta sección, consistente con el resto de endpoints de `payments`/`sales`
  que ya usan ese helper). Simplificación adicional: el puerto
  (`CreateAccountPaymentInput`/`getAccountDebt`) recibe directamente un
  `branchId: string | null` ya resuelto por el controller, en vez del
  `AccountBranchScope{callerBranchId, branchId}` originalmente propuesto en
  este documento — menos lógica duplicada entre controller y repo.
