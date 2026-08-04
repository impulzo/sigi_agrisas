## MODIFIED Requirements

### Requirement: Canonical Folios List

El script SHALL definir como constante en código el conjunto canónico de 9 folios con los siguientes campos exactos:

| code | name | prefix | scope |
|---|---|---|---|
| TK | Folio de Venta Efectivo | TK- | POS |
| TC | Folio de Venta Crédito | TC- | POS |
| COT | Cotización | COT- | POS |
| TS | Traspaso entre inventarios | TS- | INVENTORY |
| TRI | Traspaso interno (sin Carta Porte) | TRI- | INVENTORY |
| RB | Recibo de Pago - Cobranza | RB- | OPERATIONS |
| AB | Cobranza/Abono | AB- | OPERATIONS |
| DEV | Devolución | DEV- | OPERATIONS |
| CP | Compras | CP- | OPERATIONS |

Cada folio canónico SHALL crearse con `isActive=true`. Modificar la lista requiere editar el script y abrir una nueva propuesta OpenSpec.

#### Scenario: Resultado tras corrida limpia
- **WHEN** `npm run seed:folios` corre sobre una DB sin folios
- **THEN** tras la ejecución existen exactamente 9 filas en `folios`, una por cada code canónico, todas con `isActive=true` y `currentNumber=0`

#### Scenario: TRI se agrega sin afectar TS
- **WHEN** el folio `TS` ya existe con `currentNumber=32` y se ejecuta el seed tras agregar `TRI` a la lista canónica
- **THEN** `TS.currentNumber` sigue siendo `32` y se crea `TRI` nuevo con `currentNumber=0`

---

### Requirement: Legacy Folio Deletion Policy

El script SHALL identificar todos los folios cuyo `code` NO está en la lista canónica y aplicar la siguiente política para cada uno:

1. Consultar la cuenta de referencias FK: `_count.sales + _count.quotes + _count.payments + _count.waybills`.
2. Si el conteo total es `0`: ejecutar `prisma.folio.delete({ where: { id } })`.
3. Si el conteo total es `> 0`: NO borrar; agregar el folio a una lista `abortedReferences` con `{ code, sales, quotes, payments, waybills }`.

Al finalizar el barrido, si `abortedReferences.length > 0`, el script SHALL imprimir cada entrada en stderr junto con el mensaje "Folio <code> tiene N referencias activas; migra manualmente o limpia antes de re-correr" y SHALL salir con `process.exit(1)` SIN haber upserteado los folios canónicos (la fase de upsert solo corre si la fase de borrado fue exitosa).

#### Scenario: Borrar folio legacy sin referencias
- **WHEN** existe un folio `FAC_A` (no canónico) con `_count.sales=0`, `_count.quotes=0`, `_count.payments=0`, `_count.waybills=0`
- **THEN** el script lo elimina y reporta `legacyDeleted: 1` (entre otros)

#### Scenario: Folio legacy referenciado solo por waybills bloquea el seed
- **WHEN** existe un folio no canónico con `_count.waybills=3` y `_count.sales=0`, `_count.quotes=0`, `_count.payments=0`
- **THEN** el script lo agrega a `abortedReferences` con `waybills: 3`, imprime el mensaje de error, y sale con código `1` SIN intentar el `delete` (que de otro modo fallaría contra el FK `ON DELETE RESTRICT` de `waybills.folio_id`)
