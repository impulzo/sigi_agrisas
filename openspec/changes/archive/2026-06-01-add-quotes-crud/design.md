## Context

El sistema ya posee:

- 10 módulos hexagonales (`auth`, `rbac`, `users`, `payment-methods`, `folios`, `departments`, `branches`, `providers`, `products`, `inventory`) más los recientes `customers` y `pos` (change `add-pos`, 2026-05-30).
- RBAC con caché de 60s, `requirePermission` guard, y el bypass `branches:access_all`.
- JWT con `roles[]` y `branchId`, middleware que propaga `x-user-id`, `x-user-email`, `x-user-roles`, `x-user-branch-id`.
- POS atómico: emisión, cancelación, edición — con snapshot por línea y `SaleTotalsCalculator` puro.
- Catálogo de `folios` con `current_number` atómico y `prefix?` opcional.
- Helper compartido `enforceBranchScope(req, resourceBranchId)` ya probado en `pos-api` e `inventory-api`.

Falta el paso comercial **previo** a la venta: la cotización. Las tres reglas del cliente son claras pero implican decisiones arquitectónicas:

1. **"No afecta inventario"** — descarta cualquier reserva, descuento o creación de `branch_inventory` al emitir; obliga a que la conversión sea la única ruta hacia el stock.
2. **"Si autorizada, se convierte en ticket"** — exige un puente con `pos-api` que NO duplique la lógica del POS (asignación de folio, decremento, snapshot).
3. **"Selección de cliente + producto + precio"** — el modelo de líneas snapshot del POS es trasladable casi 1:1.

El change se construye sobre el patrón ya validado por `add-pos`: módulo hexagonal independiente, repositorio Prisma + InMemory, controller Zod, DI container exportando el controller consumido por los route handlers de `app/api/v1/admin/`.

## Goals / Non-Goals

**Goals:**

- Modelar `Quote` y `QuoteItem` con el mismo esquema relacional (snapshots, FKs `ON DELETE RESTRICT`) que el POS, garantizando trazabilidad y resistencia a renames/borrados del catálogo.
- Ciclo de vida explícito y verificable: `draft → authorized → converted | cancelled | expired`. Cada transición es un endpoint diferente; ninguna transición se infiere implícitamente.
- Operación atómica `crear cotización` que NO toca `branch_inventory` y reserva el folio (incrementa `folios.current_number`) en una transacción.
- Operación atómica `convertir cotización` que reutiliza el contrato de `SaleRepository.createCompleted` (decremento de inventario + emisión de venta con folio fiscal) y enlaza la venta resultante al `quoteId` original; idempotente.
- Mantener intacto el contrato actual de `pos-api` para `POST /sales` directo (sin cotización); `quoteId` es opcional en el body y por defecto `null`.
- Aplicar el patrón de scoping por sucursal vía helper compartido, sin re-implementarlo.
- Cálculo de totales como dominio puro testeable, con equivalencia exacta al cálculo del POS.

**Non-Goals:**

- Revisiones múltiples de una cotización (`quote_revisions`): editar sobreescribe.
- Workflow multi-firmante de autorización.
- Conversión parcial (sólo algunos items).
- Cambiar cliente o sucursal de una cotización después de creada.
- Cron de expiración automática.
- Generación de PDF y envío al cliente.
- Reserva temporal de stock.
- Múltiples métodos de pago en la conversión.

## Decisions

### Decisión 1 — Módulo separado `quotes`, NO sub-recurso de `pos`

`Quote` vive en `src/modules/quotes/`, no como sub-recurso de `pos`. Razones:

- La cotización es un **agregado comercial independiente** con ciclo de vida propio (`draft`/`authorized`/`cancelled`/`expired`). Mezclarla con `sales` (que sólo tiene `completed`/`cancelled`/`edited`) sobrecarga el módulo del POS con una máquina de estados ajena.
- El `Sale` ya está saturado de responsabilidad (folio fiscal, snapshot, decremento, edición en matriz). Añadir flujo de cotización lo vuelve hostil para mantener.
- El test de unidad de `QuoteTotalsCalculator` se diseña como puro y aislado; mantenerlo en otro paquete preserva la fórmula como contrato y permite divergir si la fiscalidad de cotización (futura) lo exige.

**Alternativa descartada**: añadir `Sale.status = 'quote'` y dejar todo dentro de `pos-api`. Mezcla dos semánticas distintas (movimiento de almacén vs. propuesta comercial) en una sola tabla; los reportes de "ventas reales" tendrían que filtrar permanentemente por `status != 'quote'`.

### Decisión 2 — Estados de `Quote`: `draft → authorized → converted | cancelled | expired`

Cinco estados, transiciones explícitas y restrictivas:

```
            ┌───────────────► cancelled
            │                      ▲
draft ─────►│                      │
            │                      │
            └──► authorized ──────►│
                     │             │
                     ├──► converted (terminal)
                     │
                     └──► expired (terminal; sólo si expiresAt < NOW())
```

- `draft`: editable (items, notas). Sólo en `draft` el `PATCH` está permitido.
- `authorized`: congelada. Sólo desde aquí se permite `convert`.
- `converted`: terminal. Apunta a `convertedSaleId`. Idempotente (re-`convert` devuelve la venta existente).
- `cancelled`: terminal. Desde `draft` o `authorized`. No desde `converted` (cancelar una venta convertida se hace cancelando la **venta** vía `pos-api`).
- `expired`: terminal. Sólo el use case `ConvertQuoteToSaleUseCase` puede transicionar a `expired` cuando verifica `expiresAt < NOW()`. Mientras tanto el filtro `?status=expired` en la lista incluye también las cotizaciones cuyo `expiresAt < NOW()` y `status='authorized'` (UX hint: la UI las marca como "vencidas" sin requerir cron).

**Alternativa descartada**: un único estado `status` con transiciones permitidas codificadas como booleanos (`isAuthorized`, `isCancelled`, `isConverted`). Es opaco y propenso a estados inconsistentes (`isCancelled=true` y `isConverted=true` simultáneos). El enum + tabla de transiciones es más explícito.

### Decisión 3 — Snapshot por línea idéntico al POS

`QuoteItem` snapshotea exactamente los mismos campos que `SaleItem`: `productCodeSnapshot`, `productNameSnapshot`, `priceNameSnapshot`, `unitPrice`, `discountPct`, `ivaRate`, `iepsRate`. Razones:

- Una cotización debe sobrevivir a un rename/eliminación del producto o el precio. Si el cliente "se queda con la cotización impresa" y la trae 3 semanas después, el sistema debe poder reproducir exactamente el precio cotizado.
- La conversión a venta reutiliza directamente esos snapshots sin necesidad de re-resolver `productPrice.price` (lo que evita la condición de carrera "el precio cambió entre la cotización y la conversión").

`productId` y `productPriceId` siguen siendo FK (`Restrict` y `SetNull`) para reportes, igual que en `SaleItem`.

### Decisión 4 — Folio para cotizaciones reutiliza el catálogo `folios`

El catálogo `folios` ya soporta `code` libre y `current_number` atómico. La cotización exige un `folioId` y se persiste `folioCode`/`folioNumber` snapshot. El cliente puede crear un folio "COT" en `/catalogs/folios` (ver migración brownfield).

**Por qué no inventar una tabla `quote_folios` paralela**: duplicaría infraestructura ya construida (admin CRUD, `current_number` atómico, escalado por `prefix`). El catálogo `folios` no acopla las series a un módulo concreto — su única semántica es "serie numerada incremental".

**Por qué exigir `folioId` y no hacerlo opcional**: la cotización debe poder referenciarse por un número legible al cliente ("Cotización COT-0042"). Sin folio, sólo queda el UUID, que es inutilizable para humanos. El admin que olvide crear el folio "COT" recibirá un 400 explícito en el primer POST.

### Decisión 5 — `CreateQuoteUseCase` NO toca `branch_inventory`

A diferencia de `CreateSaleUseCase`, este use case orquesta una transacción mucho más simple:

```ts
await prisma.$transaction(async (tx) => {
  // 1. Validar customer, branch, folio, items.length >= 1.
  // 2. Para cada item: cargar product + productPrice; verificar consistencia
  //    (price.productId === item.productId, price activo, producto activo, quantity > 0).
  // 3. Snapshotear: code, name, priceName, unitPrice, discountPct, ivaRate, iepsRate.
  // 4. Calcular totales con QuoteTotalsCalculator.
  // 5. Asignar folio: UPDATE folios SET current_number = current_number + 1
  //    WHERE id = ? AND is_active = true RETURNING current_number, code, prefix.
  // 6. INSERT INTO quotes (...) y quote_items (...). status = 'draft'.
});
```

Cero efectos sobre `branch_inventory`. La cotización NO valida stock — el cliente puede cotizar productos sin existencias (cuando se convierta, el inventario podrá quedar negativo, igual que en el POS directo).

**Por qué se reserva folio en `draft`**: numeración consecutiva sin huecos en la serie "COT". Si la cotización se cancela, el folio "se gasta" igual que en ventas (es el comportamiento que el cliente esperaría: "Cotización COT-0042 fue cancelada por X").

### Decisión 6 — `UpdateQuoteUseCase` sólo permite editar en `draft`

`PATCH /api/v1/admin/quotes/:id` acepta `items?: QuoteItemInput[]`, `notes?: string | null`, `expiresAt?: string | null`. Si la cotización tiene `status !== 'draft'` → HTTP 409 `{"error": "Quote cannot be edited in current status", "status": "<actual>"}`.

Al editar items, el flujo es: validar → snapshot nuevo → borrar `quote_items` viejos → insertar nuevos → recalcular totales con `QuoteTotalsCalculator` → `UPDATE quotes SET subtotal=?, tax_total=?, total=?, notes=?, expires_at=?`. NO se cambia `folioId/folioNumber/folioCode/customerId/branchId`.

**Por qué no permitir editar `customerId`/`branchId`**: ambos son la identidad económica de la cotización. Cambiarlos es semánticamente "otra cotización"; mejor cancelar y crear nueva.

**Por qué bloquear edición tras autorizar**: la autorización es el momento en que "el cliente aceptó este precio". Permitir editar después abre la puerta a "te autorizo, luego te cambio el precio sin que te enteres". El enlace con la conversión asegura que lo que se factura es exactamente lo autorizado.

### Decisión 7 — `AuthorizeQuoteUseCase` es transición simple, NO reduce inventario

```ts
// Verifica status === 'draft' (sino → QuoteAlreadyAuthorizedError / inválido)
// Verifica !expiresAt || expiresAt > NOW() (sino → QuoteExpiredError)
// UPDATE quotes SET status='authorized', authorized_at=NOW(), authorized_by=<userId>
```

No hay reserva de stock, no se valida disponibilidad, no se toca el folio (ya está asignado desde la creación).

`authorizedBy` se persiste como `String @db.Uuid` (mismo tipo que `cashierId` en `sales`) para auditoría. `authorizedAt` se persiste como `DateTime?`.

### Decisión 8 — `ConvertQuoteToSaleUseCase` reutiliza la maquinaria del POS

```ts
await prisma.$transaction(async (tx) => {
  // 1. Cargar quote con items; si convertedSaleId !== null → idempotente:
  //    devolver la sale ya existente (carga vía SaleRepository.findByIdWithItems).
  // 2. Verificar status === 'authorized' (sino → QuoteNotAuthorizedError).
  // 3. Verificar !expiresAt || expiresAt > NOW() (sino → QuoteExpiredError).
  // 4. Construir CreateSaleInternalInput a partir de los snapshots de la cotización:
  //    - branchId = quote.branchId
  //    - customerId = quote.customerId
  //    - paymentMethodId = <del body de la conversión>
  //    - folioId = <del body, folio FISCAL, distinto del folio de cotización>
  //    - items: por cada quote_item → { productId, productPriceId, quantity }
  //    - quoteId = quote.id
  //    - cashierId = <userId del header>
  // 5. Invocar SaleRepository.createCompletedFromQuote(input, tx) — método
  //    nuevo en SaleRepository que hace LO MISMO que createCompleted pero
  //    acepta `quoteId` y se ejecuta dentro de la transacción que el use case
  //    ya tiene abierta. Reusa el snapshot, la asignación atómica de folio
  //    fiscal, el decremento de inventario (allow negative) y el INSERT.
  // 6. UPDATE quotes SET status='converted', converted_at=NOW(),
  //    converted_sale_id=<saleId>.
  // 7. Devolver SaleDetailDto.
});
```

**Por qué `convertedSaleId` y no `quoteId` como única dirección de enlace**: las dos direcciones son útiles. `Sale.quoteId` permite a la UI del ticket mostrar "esta venta proviene de COT-0042"; `Quote.convertedSaleId` permite que `convert` sea idempotente sin necesidad de SELECT inverso. El doble enlace cuesta una columna por lado y se mantiene consistente por la transacción.

**Por qué NO se reutiliza el folio de cotización como folio de venta**: el folio fiscal tiene reglas SAT distintas (consecutivo sin huecos, no reusable, identifica CFDIs). El folio de cotización es interno. Mezclarlos rompe auditorías. La conversión genera un nuevo folio fiscal.

**Idempotencia**: si el cliente clickea "Convertir" dos veces, la segunda llamada devuelve la venta ya creada sin re-decrementar inventario ni re-incrementar el folio fiscal. Esto requiere que `convertedSaleId` se commitee atómicamente con el resto.

**Alternativa descartada**: que `ConvertQuoteToSaleUseCase` invoque `CreateSaleUseCase.execute()` directamente. Cada use case maneja su propia transacción Prisma — anidarlas vía `prisma.$transaction` puede generar problemas de aislamiento. Mejor exponer un método interno en `SaleRepository` (`createCompletedFromQuote`) que asume la transacción ya está abierta.

### Decisión 9 — `expiresAt` opcional con verificación en conversión y en lista

`quotes.expires_at TIMESTAMP NULL`. Si es `null` la cotización NO expira. Si tiene valor:

- `ConvertQuoteToSaleUseCase` rechaza con `QuoteExpiredError` → 409 si `expiresAt < NOW()`.
- `ListQuotesUseCase` con `?status=expired` devuelve cotizaciones con `(status='authorized' AND expires_at < NOW()) OR status='expired'`. Esto permite a la UI marcar visualmente las "vencidas" sin necesidad de un cron de transición.
- `?from`/`?to` filtran por `created_at` (mismo patrón que `pos-api`); para filtrar por `expires_at` se documenta como mejora futura.

**Por qué no introducir un cron de transición**: añadir infraestructura (BullMQ, pg_cron, etc.) sólo para esto es desproporcionado. La verificación en lectura cubre el caso de uso (rechazar conversión + mostrar como "vencida"). Si más adelante surge la necesidad de "auto-cancelar a los 30 días", se introduce un job dedicado.

### Decisión 10 — `Sale.quoteId String? @map("quote_id")` con FK SET NULL

`SET NULL` y no `RESTRICT`: si por alguna razón se purga una cotización antigua (no contemplado en este change, pero posible vía SQL directo o un módulo futuro), las ventas históricas no rompen. El enlace pierde la referencia pero la venta sigue siendo válida.

`Sale.quoteId` está indexado para acelerar "¿qué ventas vinieron de cotización?" en reportes futuros.

### Decisión 11 — `QuoteTotalsCalculator` puro y equivalente al de POS

Implementación copia 1:1 de `SaleTotalsCalculator` en `src/modules/quotes/domain/services/QuoteTotalsCalculator.ts`. Misma firma, misma fórmula, mismo redondeo half-to-even a 4 decimales.

**Test de equivalencia**: en `tests/unit/modules/quotes/domain/services/QuoteTotalsCalculator.test.ts` se incluye un bloque que itera sobre los mismos 10 vectores de entrada que el test de `SaleTotalsCalculator` y verifica que los resultados sean **exactamente** iguales. Si en el futuro alguien cambia uno y olvida el otro, el test rompe.

**Por qué no extraer a un servicio compartido en `src/shared/`**: la regla "dominio no importa de otro módulo de dominio" se relajaría. Mantenemos la copia con guardrail (test de equivalencia) hasta que aparezca una **tercera** entidad que use la misma fórmula — entonces se promueve al shared, sin acoplamiento prematuro.

### Decisión 12 — Permisos RBAC (6 nuevos)

| Permiso | admin | operator | viewer |
|---|---|---|---|
| `quotes:read` | ✅ | ✅ | ✅ |
| `quotes:create` | ✅ | ✅ | ❌ |
| `quotes:write` | ✅ | ✅ | ❌ |
| `quotes:cancel` | ✅ | ✅ | ❌ |
| `quotes:authorize` | ✅ | ✅ | ❌ |
| `quotes:convert` | ✅ | ✅ | ❌ |

`operator` recibe los 6 operativos (excepto `quotes:read` que es para todos): es el vendedor de campo que cotiza, autoriza con el cliente al teléfono y convierte cuando llega el pago. Si una empresa quiere segregar autorización (ej. "sólo el supervisor autoriza"), el admin puede revocar `quotes:authorize` del rol `operator` y crear un rol custom `sales_supervisor` con sólo ese permiso.

**Por qué no `quotes:edit_authorized`** (análogo a `sales:edit_completed`): la decisión 6 lo descarta — editar tras autorizar rompe el compromiso comercial. Si en el futuro se requiere, se introduce el permiso entonces.

### Decisión 13 — Branch scoping reutilizando `enforceBranchScope`

El controller `QuotesController` aplica el patrón:

```ts
const bypass = await authz.userCan(userId, "branches:access_all");
if (!bypass && quote.branchId !== req.headers.get("x-user-branch-id")) return 403;
```

Mismo patrón que `SalesController`. Para `GET /api/v1/admin/quotes` sin `?branchId=`, el comportamiento es idéntico al de `GET /sales`: usuario sin bypass → filtro implícito por `x-user-branch-id`; sin sucursal asignada → 403.

Para `POST /api/v1/admin/quotes`, el `branchId` del body se valida contra el del header (mismatch → 403 sin bypass).

### Decisión 14 — Listado: filtros básicos + búsqueda

`GET /api/v1/admin/quotes` acepta:

- `branchId` (sometido a scoping).
- `customerId` (opcional).
- `status` (opcional, comma-separated entre `draft`/`authorized`/`converted`/`cancelled`/`expired`). `expired` matchea también `authorized` con `expires_at < NOW()`.
- `from`/`to` (ISO date, filtra por `created_at`).
- `search` (opcional, min 2 chars; matchea `folio_code`, `folio_number::text`, o `customer.name`/`customer.rfc`).
- `page`/`pageSize` (igual que el resto).

Ordenado por `created_at DESC`.

### Decisión 15 — Conversión: el body acepta `paymentMethodId` y `folioId`

`POST /api/v1/admin/quotes/:id/convert` body:

```json
{
  "paymentMethodId": "<uuid>",
  "folioId": "<uuid>"           // folio FISCAL para la venta (no el de cotización)
}
```

Ambos son **obligatorios**: no hay un "método de pago default" ni un "folio fiscal default" en el sistema; el cliente debe elegir. Notas opcionales `notes: string | null` pasan también a la venta.

`branchId`, `customerId` y los items se toman de la cotización — no son alterables en la conversión. Si el cliente quiere cambiarlos, debe cancelar la cotización y emitir una venta directa con `POST /sales`.

### Decisión 16 — Cancelación

`DELETE /api/v1/admin/quotes/:id` con body opcional `{ reason?: string | null }`. Marca `status='cancelled'`, `cancelledAt=NOW()`, `cancellationReason=<reason>`. Acepta cotizaciones en `draft` o `authorized`. Rechaza con 409 las que están en `converted` (cancelar la venta es la acción correcta) o ya `cancelled` (no aplica idempotencia silenciosa: devolver 409 explícito porque cancelar dos veces probablemente sea un click duplicado del operador y conviene avisar).

**Por qué `DELETE` y no `POST /:id/cancel`**: el equipo ya usó `DELETE` para `soft delete` en `customers`, `products`, catálogos. Mantener consistencia. La acción es "retirar del flujo activo", no "borrar". `POST /:id/cancel` se reserva para si en el futuro `cancelar` evoluciona a algo más complejo (ej. notificar al cliente).

## Risks / Trade-offs

- **Duplicación de `QuoteTotalsCalculator` ↔ `SaleTotalsCalculator`** — Mitigación: test de equivalencia obligatorio sobre vectores compartidos. Si la fórmula evoluciona, se actualizan ambos en el mismo commit y el test detecta cualquier omisión.
- **`SaleRepository.createCompletedFromQuote` añade superficie al repo del POS** — Mitigación: el método nuevo es un puente fino (reutiliza `createCompleted` internamente pero acepta `tx` externa y `quoteId`). Documentado en `pos-api`. Si se vuelve complejo, se considera mover la orquestación a un servicio de dominio compartido.
- **El folio de cotización se "gasta" al cancelar** — Aceptado y documentado (igual que en ventas).
- **Sin reserva de stock al cotizar** — Decisión explícita del cliente. Riesgo: el producto cotizado puede no estar disponible al convertir. El sistema permite stock negativo en la conversión (igual que POS), por lo que técnicamente nunca falla — pero genera deuda de inventario. Se documenta en `quotes-api`.
- **Conversión idempotente sólo si `convertedSaleId` se commitea atómicamente** — Riesgo: si la transacción de conversión falla justo entre el INSERT de la venta y el UPDATE de la cotización, podríamos quedar con venta huérfana sin enlace. Mitigación: ambas operaciones están dentro de la misma `prisma.$transaction`; si el UPDATE final falla, la transacción revierte el INSERT de la venta también.
- **Expiración sin cron** — Mitigación: documentado como diferido. Mientras tanto el listado filtra correctamente y la conversión rechaza vencidas.
- **`operator` puede autorizar sus propias cotizaciones** — Trade-off: el flujo simple del cliente lo prefiere. Si se requiere segregación, el admin reasigna permisos a roles custom (`sales_supervisor`).
- **`Sale.quoteId` aparece en el body de `POST /sales`** — Riesgo bajo: un operador podría enviar manualmente un `quoteId` que apunte a una cotización sin convertir y crear "ventas falsamente enlazadas". Mitigación: el `POST /sales` valida que si se envía `quoteId`, la cotización existe y su `convertedSaleId === null`; si no, 400. Documentado en `pos-api`. La ruta normal (UI) usa `POST /quotes/:id/convert`, no envía `quoteId` manualmente.
- **`status='expired'` en lista NO escribe en BD** — Trade-off: la consulta es un OR (`status='authorized' AND expires_at < NOW() OR status='expired'`); si más adelante se requiere "cuántas cotizaciones expiraron este mes" como reporte, el cron de transición se vuelve necesario. Por ahora se difiere.

## Migration Plan

1. `npm run build` — verifica tipos.
2. Editar `prisma/schema.prisma`: añadir modelos `Quote` y `QuoteItem`; añadir `quoteId` y relación inversa a `Sale`.
3. Crear migración: `npx prisma migrate dev --name add_quotes_tables_and_link_to_sale`.
4. Editar manualmente el SQL generado si Prisma no expresa nativamente:
   - Verificar índices: `quotes(branch_id)`, `quotes(customer_id)`, `quotes(status)`, `quotes(expires_at)`, `quotes(created_at)`, único en `quotes(folio_id, folio_number)`.
   - Verificar CHECK constraints opcionales: `CHECK (subtotal >= 0)`, `CHECK (tax_total >= 0)`, `CHECK (total >= 0)` en `quotes`; `CHECK (quantity > 0)` en `quote_items`.
5. Deploy: `npx prisma migrate deploy` (usa `DIRECT_URL`).
6. `npm run seed` — añade los 6 permisos nuevos y los asigna idempotentemente.
7. Crear (vía `POST /api/v1/admin/folios`) un folio "COT" con `prefix: "COT"` y `currentNumber: 0` para que las primeras cotizaciones queden numeradas COT-1, COT-2, … (esto es responsabilidad del admin tras el deploy; no se hace por migración para no asumir el prefijo).
8. Validación manual con `curl` desde un admin:
   - `POST /api/v1/admin/quotes` con cliente + items → 201, folio COT-1 asignado.
   - `PATCH /api/v1/admin/quotes/:id` agregando item → 200.
   - `POST /api/v1/admin/quotes/:id/authorize` → 200, status='authorized'.
   - `PATCH /api/v1/admin/quotes/:id` → 409 ("Quote cannot be edited in current status").
   - `POST /api/v1/admin/quotes/:id/convert` con `paymentMethodId` + `folioId` (fiscal) → 200 con `SaleDetailDto`, status='converted', `quote.convertedSaleId` poblado, `branch_inventory.quantity` decrementado.
   - `POST /api/v1/admin/quotes/:id/convert` segunda vez → 200 idempotente con misma `SaleDetailDto`, sin doble decremento.
   - Login como `operator` de otra sucursal → `GET /api/v1/admin/quotes/:id` → 403.

Rollback:

1. Revertir el commit del código.
2. `ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_quote_id_fkey;`
3. `ALTER TABLE sales DROP COLUMN IF EXISTS quote_id;`
4. `DROP TABLE quote_items CASCADE;`
5. `DROP TABLE quotes CASCADE;`
6. Eliminar los 6 permisos nuevos (`DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE key LIKE 'quotes:%');` luego `DELETE FROM permissions WHERE key LIKE 'quotes:%';`).

## Open Questions

- **¿`expiresAt` debe tener un default (ej. NOW() + 30 días) si el body no lo envía?** → No por defecto en este change: `null` significa "no expira". El admin puede configurarlo manualmente en cada POST. Si en el futuro se quiere un default global, se introduce `system_settings.default_quote_validity_days` y el use case lo aplica.
- **¿La autorización debe registrar una "razón" o comentario?** → No en v1. Si se requiere, se añade `authorization_notes` en una versión posterior sin romper compat.
- **¿La cotización debe poder enviarse por email al cliente desde el backend?** → No en este change. Está en la lista de no-goals. Cuando se aborde, se hace en un módulo `quote-delivery` separado.
- **¿La conversión puede aplicar un nuevo `discountPct` global "porque cerramos el trato"?** → No en v1. La conversión es un mapeo 1:1 de los snapshots. Si el cliente quiere otro descuento, edita la cotización (vuelve a `draft`) — pero eso requiere primero "des-autorizar", funcionalidad que no existe. Decisión final: cancelar y crear otra cotización.
- **¿`operator` debe poder autorizar cotizaciones de otros operadores de la misma sucursal?** → Sí (no se restringe por identidad del creador). El scoping de sucursal es la única barrera; identidad fina (sólo quien la creó) se difiere.
- **¿Qué pasa si el `paymentMethodId` enviado en `convert` está inactivo?** → HTTP 400, mismo trato que el `POST /sales` directo.
- **¿La idempotencia de `convert` debe ser por algún token externo (`Idempotency-Key` header) además del `convertedSaleId`?** → No en v1. El doble-click se cubre con el chequeo de `convertedSaleId`. Si se requiere semántica HTTP estándar de idempotencia, se añade después.
- **¿`quote.notes` se copia al `sale.notes` automáticamente en la conversión?** → Sí. La conversión copia `quote.notes` a `sale.notes` salvo que el body de `convert` envíe `notes` explícitamente (que pisa el valor copiado).
