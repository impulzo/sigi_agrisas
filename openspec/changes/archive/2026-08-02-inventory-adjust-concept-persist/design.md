## Context

`PrismaBranchInventoryRepository.adjust` ya persiste `reason` como `notes` en `InventoryMovement` (código real, committeado en "Version 1.4") — ver `proposal.md - Why`. `InMemoryBranchInventoryRepository.adjust` no replica esto (`_reason` sin usar), y `openspec/specs/inventory-api/spec.md` documenta el comportamiento viejo ("not persisted"). El Kardex UI ya recibe `notes` por movimiento en la respuesta de `GET /inventory/kardex` pero no lo renderiza.

## Goals / Non-Goals

**Goals:**
- Cerrar la brecha entre código real (ya persiste) y specs/tests (documentan/verifican lo contrario).
- Mostrar el concepto capturado en el Kardex UI.

**Non-Goals:**
- No se toca el flujo de captura en `StockAdjustModal.tsx` (ya envía `reason` correctamente).
- No se agrega validación nueva al campo `reason` (ya limitado a 200 chars en el controller).

## Decisions

**D1 — Fix en `InMemoryBranchInventoryRepository`, no en Prisma**
El repositorio Prisma ya es correcto. Se agrega un ledger en memoria simple (`Array<{branchId, productId, notes}>`) para que `AdjustStockUseCase` pueda testearse con la persistencia real del `reason`, sin acoplar el repositorio in-memory a la entidad completa `InventoryMovement` (que trae folio/tipo/dirección — fuera de alcance para este fix puntual).

**D2 — Columna "Concepto" al final de la tabla del Kardex**
Sigue el orden de columnas ya usado en el spec (`Fecha, Movimiento, Folio, Entrada, Salida, Saldo, Costo, Venta, Status`), agregando "Concepto" al final para no reordenar columnas existentes ni romper el layout responsive ya validado.

## Risks / Trade-offs

- **[Riesgo] Ninguno** — cambio aditivo puro (columna nueva, fixture de test corregido, spec corregido). Sin migración, sin cambio de contrato de API.

## Migration Plan

Ninguna — no hay cambios de schema ni de API pública.

## Open Questions

_Ninguna._
