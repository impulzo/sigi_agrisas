## Context

`AccountLedgerBuilder.build()` (`src/modules/reports/domain/services/AccountLedgerBuilder.ts`) ya produce `AccountMovement[]` cronológico con `runningBalance` calculado — es la única fuente de verdad numérica y no se toca. `GetAccountStatementLedgerUseCase.execute()` (`.../use-cases/GetAccountStatementLedgerUseCase.ts:70-168`) filtra (`history`), reordena para presentación (`applySort`, líneas 57-68) y mapea a `AccountStatementMovementDto[]` plano.

Cada abono (`kind: "payment"`) trae `saleId: string | null` (`AccountMovement.ts:29`) — en BD, `customer_payments.sale_id` es `String` **NOT NULL** (`prisma/schema.prisma:489`), así que en la práctica todo abono referencia una venta real. El repositorio (`PrismaAccountStatementRepository.ts:150-201`) consulta `sales` y `customerPayments` por separado, cada uno filtrado por `customerId` + `branchId` pero **sin filtro de fecha** — el filtro de rango (`from`/`to`) lo aplica el use case después, partiendo `data.movements` en `before` (antes de `from`, folded en `openingBalance`) e `inRange` (visible). Esto significa que una venta puede caer en `before` mientras uno de sus abonos cae en `inRange` — el abono es visible pero su venta padre no. Responde a la Historia de Usuario en `proposal.md`.

## Goals / Non-Goals

**Goals:**
- `groups[]` nuevo en la respuesta: un grupo por venta (con sus abonos anidados) más, si aplica, un grupo final para abonos cuya venta no está en el universo visible.
- `closingBalance`/`totals`/`movements[]` sin cambio numérico ni de comportamiento — el agrupado es puramente derivado, calculado DESPUÉS de que `AccountLedgerBuilder` ya resolvió el saldo.
- `?sort` extendido para ordenar `groups[]` con el mismo criterio que ya usa para `movements[]`.
- UI/PDF/XLSX consumen `groups[]` en vez de `movements[]` para su tabla principal.

**Non-Goals:**
- No se modifica `AccountLedgerBuilder` — sigue calculando `runningBalance` sobre la lista plana; el agrupado es una capa de presentación construida a partir de su salida.
- No se elimina `movements[]` de la respuesta — sigue existiendo, sin cambios, por si algún consumidor externo (o un futuro `?format=json` consumido por integración) depende de la forma plana.
- No se agrupan movimientos que no sean venta/abono — no aplica (el dominio solo tiene esos dos `kind`).
- No se pagina ni se colapsa/expande interactivamente en la UI — todos los grupos se renderizan expandidos, igual que hoy se renderizan todas las filas.

## Decisions

**D1 — Nuevo servicio de dominio puro `LedgerGrouper`, separado de `AccountLedgerBuilder`.**
`AccountLedgerBuilder` tiene una responsabilidad ya documentada y testeada: ordenar cronológicamente + calcular saldo corrido. Agrupar por venta es una responsabilidad distinta (presentación, no aritmética) — mezclarla ahí violaría SRP y arriesgaría el código ya probado que valida contra `customers.current_balance`. `src/modules/reports/domain/services/LedgerGrouper.ts` exporta una función pura `groupLedgerBySale(movements: AccountMovement[], sort: LedgerSort): LedgerGroup[]`, que recibe la salida YA CALCULADA de `AccountLedgerBuilder.build()` (post-filtro `history`, ver D3) y solo reorganiza/reordena — nunca recalcula `debit`/`credit`/`runningBalance`.

```ts
export interface LedgerGroup {
  sale: AccountMovement | null; // null = grupo de abonos sin venta visible en el rango
  payments: AccountMovement[];  // cronológico ascendente, siempre
}
```

**D2 — Agrupación por `saleId`, con bucket único `sale: null` para abonos huérfanos del rango visible.**
Algoritmo: separar `movements` en ventas (`kind==='sale'`) y abonos (`kind==='payment'`); indexar abonos por `saleId` en un `Map`; por cada venta, su grupo son los abonos cuyo `saleId === sale.id`; los abonos cuyo `saleId` no corresponde a ninguna venta presente en `movements` (caso de partición por rango descrito en Context) se acumulan en UN solo grupo final `{ sale: null, payments: [...] }`, ordenado cronológicamente, sin importar de cuántas ventas distintas (fuera de rango) provengan — evita fragmentar en N grupos huérfanos cuando la información de la venta padre ni siquiera está disponible para mostrar un encabezado útil.

Alternativa descartada: un grupo huérfano POR `saleId` distinto (mostrando solo el `saleId` sin datos de folio). Rechazada — sin la venta cargada no hay folio/fecha que mostrar como encabezado de grupo; agregarlos todos bajo un único rótulo ("Abonos sin venta visible en el rango") es más legible y ya cubre el caso real (cobranza de facturas viejas fuera del filtro de fecha).

**D3 — Agrupar sobre `visible` (post `history`), no sobre `built` completo.**
El use case ya calcula `visible = req.history ? built : filterActive(built)` (línea 106). `groupLedgerBySale` se llama con `visible`, igual que `applySort` ya hace — así el filtro "General" (solo deudas activas) oculta del agrupado exactamente las mismas ventas/abonos que hoy oculta de `movements[]`, sin lógica duplicada.

**D4 — Orden de grupos reusa los mismos comparadores que `applySort`, extraídos a funciones compartidas.**
Los comparadores `byInvoice`/`bySerie` en `GetAccountStatementLedgerUseCase.ts:59-66` ya encapsulan el criterio de orden por folio. `LedgerGrouper.ts` implementa su propia versión operando sobre `group.sale` (no aplica a movimientos individuales) — mismo criterio (`folioNumber` → `folioCode` → `date`), sin extraer una abstracción compartida entre ambos porque operan sobre tipos distintos (`AccountMovement` vs `LedgerGroup`) y la duplicación es de 3 líneas cada una; introducir una abstracción genérica sería sobre-ingeniería para este tamaño. Con `sort==='date'`, los grupos conservan el orden de aparición en `movements` (ya cronológico por construcción de `AccountLedgerBuilder`). El grupo huérfano (`sale: null`) se añade siempre al final, después de ordenar los demás, sin participar en ningún comparador.

**D5 — `ticketBalance` derivado de `debit`/`credit` ya calculados, no recalculado desde cero.**
`ticketBalance = Decimal(group.sale?.debit ?? 0).minus(sum(group.payments.map(p => p.credit)))`. Reusa exactamente los campos que `AccountLedgerBuilder` ya calculó (que ya respetan cancelaciones: una venta cancelada tiene `debit=0`; un abono cancelado tiene `credit=0`) — cero lógica de negocio nueva sobre qué cuenta y qué no. Para ventas de contado (`sale_cash`), `debit` ya es `0` por diseño existente, así que `ticketBalance` da `"0.0000"` sin caso especial.

**D6 — DTO: `groups[]` aditivo en `AccountStatementLedgerResponseDto`, mapeo compartido con `movements[]`.**
Se extrae el mapeo `AccountMovement → AccountStatementMovementDto` (hoy inline en el `.map()` de `GetAccountStatementLedgerUseCase.ts:112-132`) a una función local `toMovementDto()`, reusada tanto para construir `movements[]` (sin cambio de comportamiento) como para mapear `group.sale` y cada `group.payments[]` dentro de `groups[]`. Evita divergencia entre ambas representaciones del mismo movimiento.

```ts
export interface AccountStatementLedgerGroupDto {
  sale: AccountStatementMovementDto | null;
  payments: AccountStatementMovementDto[];
  ticketBalance: string;
}
```

**D7 — UI: `LedgerTable` cambia su prop de `movements` a `groups`; fila de venta + filas de abono indentadas.**
Fila de venta: estilo actual sin cambios (mismo `<tr>`, mismas columnas). Filas de abono del grupo: mismo componente de fila, con un indicador visual de anidamiento (indentación en la celda "Tipo" o un borde izquierdo sutil) para diferenciarlas de una venta — sin introducir una tabla anidada nueva ni colapsar/expandir (Non-Goal). El grupo huérfano se antecede de una fila de encabezado de sección ("Abonos sin venta visible en el rango") en vez de una fila de venta. El pie de tabla (`totals`/`closingBalance`) no cambia — sigue viniendo de `ledger.totals`/`ledger.closingBalance`, no de los grupos.

**D8 — PDF/XLSX: misma estructura padre-hijo, adaptada a cada formato ya existente.**
PDF (`AccountStatementLedgerPdf`): reemplaza el `data.movements.map(...)` plano por `data.groups.map(...)`, renderizando la fila de venta seguida de sus filas de abono (mismo estilo de celdas ya usado, solo cambia la fuente de datos y se añade una fila de "Saldo ticket" opcional bajo cada grupo, reusando `s.subtotal`). XLSX (`buildAccountStatementLedgerWorkbook.ts`): mismo header de columnas ya existente, con las filas de abono de cada grupo inmediatamente después de la fila de su venta (en vez de intercaladas cronológicamente con otras ventas), y una fila de subtotal `["Saldo ticket", group.ticketBalance]` al cierre de cada grupo.

## Risks / Trade-offs

- **[Riesgo]** Divergencia si `groupLedgerBySale` y el flujo de `movements[]` alguna vez interpretan `history`/`sort` de forma distinta. → **Mitigación:** ambos se calculan a partir del mismo `visible` (D3) y usan comparadores equivalentes (D4); un test de equivalencia (`sum(groups[].payments) + count(groups[].sale?1:0) === movements.length` para el mismo `visible`) se agrega en `tasks.md` para detectar cualquier divergencia futura.
- **[Riesgo]** El bucket huérfano puede confundir si el usuario no entiende por qué esos abonos no tienen venta visible. → **Mitigación:** aceptado — la UI lo rotula explícitamente ("Abonos sin venta visible en el rango"); es un caso ya inherente al filtro de fecha existente (esos abonos ya aparecían sueltos en la lista plana hoy, sin ninguna explicación — este cambio los hace más claros, no menos).
- **[Riesgo]** `LedgerTable`/PDF/XLSX cambian su prop/estructura de entrada — cualquier test existente que renderice con `movements` como prop se rompe. → **Mitigación:** se actualizan explícitamente en `tasks.md`; no hay contrato público externo a este módulo que dependa de la prop interna de un `_block`.

## Migration Plan

No aplica — cambio aditivo en el DTO (`groups[]` nuevo, `movements[]` intacto) y de presentación en 3 consumidores internos (UI/PDF/XLSX). Sin migración de datos ni flag de despliegue.
