## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Operador de inventario/almacén | Como operador de inventario, quiero ver el concepto que capturé al ajustar stock manualmente reflejado en el Kardex, para tener trazabilidad de por qué se hizo cada ajuste. | - Given un ajuste manual con `reason: "Recepción factura 123"`<br>- When se consulta `GET /inventory/kardex` para ese producto<br>- Then el movimiento `adjustment_in`/`adjustment_out` correspondiente incluye `notes: "Recepción factura 123"`, y la tabla del Kardex UI lo muestra en una columna "Concepto"<br>- Given un ajuste sin `reason` (campo opcional)<br>- When se consulta el Kardex<br>- Then la columna "Concepto" muestra "—" para ese movimiento | - Sin cambios de permisos: `inventory:write` para ajustar, `inventory:kardex_read` para consultar (ya existentes) |

_Nota: una sola historia — el backend (persistencia del `reason` como `notes` en `inventory_movements`) YA está implementado y committeado (`PrismaBranchInventoryRepository.adjust`); lo único que falta es la superficie de lectura (columna en Kardex UI) y corregir la paridad de `InMemoryBranchInventoryRepository` para que los tests reflejen el comportamiento real. No hay ambigüedad de alcance que justifique dividir en más historias._

## Why

El spec `inventory-api` documenta el campo `reason` del endpoint `POST /inventory/:productId/adjust` como "accepted but not persisted — audit deferred". Esto ya no es cierto: `PrismaBranchInventoryRepository.adjust` (código real, committeado) llama `recordInventoryMovement(tx, { ..., notes: reason ?? null })`, y `inventory-kardex-api` ya expone `notes` por movimiento. El spec y `InMemoryBranchInventoryRepository` (usado en tests) quedaron desactualizados respecto al código real. Falta cerrar el círculo: mostrar ese concepto ya persistido en la UI del Kardex, y alinear specs + fixture de tests con la realidad del código.

## What Changes

- `openspec/specs/inventory-api/spec.md`: corregir el escenario "Reason field is accepted but not persisted" para reflejar que SÍ se persiste (como `notes` del movimiento asociado).
- `InMemoryBranchInventoryRepository.adjust`: dejar de ignorar `_reason` — persistirlo en un ledger en memoria análogo, para que los tests de use cases puedan verificar el comportamiento real.
- `app/(private)/inventory/kardex/_blocks/KardexTable.tsx`: nueva columna "Concepto" mostrando `movement.notes` (o "—" si es null).
- Tests: `AdjustStockUseCase` (nuevo caso verificando persistencia vía InMemory), `KardexTable` (nueva columna).

## Capabilities

### New Capabilities
_(ninguna)_

### Modified Capabilities
- `inventory-api`: corrección del escenario de persistencia de `reason` (ya no es "not persisted").
- `inventory-kardex-ui`: nueva columna "Concepto" en la tabla del Kardex.

## Impact

- Sin migración (la columna `notes` en `inventory_movements` ya existe y ya se puebla).
- Sin cambios de API pública (el campo `notes` ya se devuelve en `GET /inventory/kardex`).
- Cambio puramente aditivo en UI + corrección de fixture de test + corrección de spec.
