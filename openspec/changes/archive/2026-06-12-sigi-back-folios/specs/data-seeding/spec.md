## ADDED Requirements

### Requirement: Folios Seed Script Existence

El sistema SHALL proveer un script TypeScript en `prisma/seeds/folios.ts` invocable mediante `npm run seed:folios`, que materializa el catálogo canónico de 8 folios del cliente. El script SHALL ser independiente del seed RBAC (`prisma/seed.ts`) y del seed de inventario (`prisma/seeds/inventory.ts`).

#### Scenario: Script ejecutable con un comando

- **WHEN** el operador ejecuta `npm run seed:folios` desde la raíz del repo
- **THEN** el script abre una conexión Prisma, ejecuta la rutina de upsert/borrado y al finalizar imprime un resumen estructurado con conteos `{ canonicalUpserted, legacyDeleted, abortedReferences? }`

#### Scenario: Sin variables de entorno DB

- **WHEN** `DATABASE_URL` o `DIRECT_URL` no están definidos
- **THEN** el script falla en startup con mensaje claro

---

### Requirement: Canonical Folios List

El script SHALL definir como constante en código el conjunto canónico de 8 folios con los siguientes campos exactos:

| code | name | prefix | scope |
|---|---|---|---|
| TK | Folio de Venta Efectivo | TK- | POS |
| TC | Folio de Venta Crédito | TC- | POS |
| COT | Cotización | COT- | POS |
| TS | Traspaso entre inventarios | TS- | INVENTORY |
| RB | Recibo de Pago - Cobranza | RB- | OPERATIONS |
| AB | Cobranza/Abono | AB- | OPERATIONS |
| DEV | Devolución | DEV- | OPERATIONS |
| CP | Compras | CP- | OPERATIONS |

Cada folio canónico SHALL crearse con `isActive=true`. Modificar la lista requiere editar el script y abrir una nueva propuesta OpenSpec.

#### Scenario: Resultado tras corrida limpia

- **WHEN** `npm run seed:folios` corre sobre una DB sin folios
- **THEN** tras la ejecución existen exactamente 8 filas en `folios`, una por cada code canónico, todas con `isActive=true` y `currentNumber=0`

---

### Requirement: Folios Seed Idempotency

El script SHALL ser idempotente: re-ejecutarlo no SHALL duplicar registros ni resetear `current_number` de folios ya existentes. Para cada folio canónico, el `upsert` SHALL aplicar `create` con `currentNumber: 0` solo cuando el registro NO existía; en el branch `update`, SHALL actualizar `name`, `prefix`, `scope`, `isActive` pero NUNCA `currentNumber`.

#### Scenario: Re-corrida preserva current_number

- **WHEN** el folio `COT` existe con `currentNumber=523` y se ejecuta `npm run seed:folios`
- **THEN** tras la ejecución `COT.currentNumber` sigue siendo `523`

#### Scenario: Re-corrida actualiza metadata

- **WHEN** el folio `RB` existe con `name="Recibo viejo"` y se ejecuta el seed
- **THEN** tras la ejecución `RB.name = "Recibo de Pago - Cobranza"` y `RB.scope='OPERATIONS'`

---

### Requirement: Legacy Folio Deletion Policy

El script SHALL identificar todos los folios cuyo `code` NO está en la lista canónica y aplicar la siguiente política para cada uno:

1. Consultar la cuenta de referencias FK: `_count.sales + _count.quotes + _count.payments`.
2. Si el conteo total es `0`: ejecutar `prisma.folio.delete({ where: { id } })`.
3. Si el conteo total es `> 0`: NO borrar; agregar el folio a una lista `abortedReferences` con `{ code, sales, quotes, payments }`.

Al finalizar el barrido, si `abortedReferences.length > 0`, el script SHALL imprimir cada entrada en stderr junto con el mensaje "Folio <code> tiene N referencias activas; migra manualmente o limpia antes de re-correr" y SHALL salir con `process.exit(1)` SIN haber upserteado los folios canónicos (la fase de upsert solo corre si la fase de borrado fue exitosa).

#### Scenario: Borrar folio legacy sin referencias

- **WHEN** existe un folio `FAC_A` (no canónico) con `_count.sales=0`, `_count.quotes=0`, `_count.payments=0`
- **THEN** el script lo elimina y reporta `legacyDeleted: 1` (entre otros)

#### Scenario: Folio legacy con referencias bloquea el seed

- **WHEN** existe el folio `RECIBO` (no canónico) con `_count.payments=42`
- **THEN** el script imprime "Folio RECIBO tiene 42 referencias activas (sales: 0, quotes: 0, payments: 42); migra manualmente o limpia antes de re-correr"
- **AND** sale con código de salida `1`
- **AND** NO upsertea los folios canónicos en esa corrida (la DB queda en el estado previo)

#### Scenario: Múltiples folios legacy mezclados

- **WHEN** existen 3 folios no canónicos: `FAC_A` (sin refs), `FAC_B` (con 5 quotes), `RECIBO` (con 42 payments)
- **THEN** el script reporta `abortedReferences: [{code:"FAC_B", quotes:5}, {code:"RECIBO", payments:42}]` y NO borra `FAC_A` (porque la fase de borrado se aborta antes del primer `delete` cuando se detecta cualquier `abortedReference`)

---

### Requirement: Folios Seed Reporting

El script SHALL imprimir al finalizar un resumen estructurado con: `{ canonicalUpserted: number, canonicalCreated: number, canonicalUpdated: number, legacyDeleted: number, abortedReferences: Array<{code, sales, quotes, payments}> }`. En caso de éxito SHALL salir con código `0`; en caso de error (FKs activas, fallo Prisma, env vars faltantes) SHALL salir con código `1`.

#### Scenario: Resumen exitoso

- **WHEN** el seed corre y procesa los 8 canónicos sin folios legacy bloqueando
- **THEN** stdout incluye al menos `canonicalUpserted: 8` y `legacyDeleted: 0` (o el conteo real) y `abortedReferences: []`

#### Scenario: Resumen con fallo por referencias

- **WHEN** el seed aborta por `abortedReferences`
- **THEN** stderr incluye cada entrada con su detalle y el código de salida es `1`

---

### Requirement: Folios Seed Independence from RBAC Seed

El seed `prisma/seed.ts` (RBAC) NO SHALL gestionar el folio `RECIBO` ni ningún otro folio. Toda lógica de upsert/delete de folios SHALL vivir exclusivamente en `prisma/seeds/folios.ts`.

#### Scenario: RBAC seed no menciona folios

- **WHEN** se inspecciona `prisma/seed.ts` tras la implementación de este change
- **THEN** el archivo NO contiene llamadas a `prisma.folio.*`

#### Scenario: RBAC seed sigue gestionando paymentMethod CREDITO

- **WHEN** se ejecuta `npm run seed` (RBAC)
- **THEN** el folio `RECIBO` NO se crea ni se modifica; el `paymentMethod CREDITO` sigue siendo gestionado por este seed (sin cambio)

---

### Requirement: Folios Seed Script in package.json

`package.json` SHALL declarar el script `seed:folios` apuntando al ejecutor TypeScript (ts-node o tsx) con `prisma/seeds/folios.ts`.

#### Scenario: Script presente en package.json

- **WHEN** se inspecciona la sección `scripts` de `package.json`
- **THEN** existe la entrada `"seed:folios": "ts-node prisma/seeds/folios.ts"` (o equivalente con `tsx`)
