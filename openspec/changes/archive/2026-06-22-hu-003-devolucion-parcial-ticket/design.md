## Context

El flujo de devolución parcial ya existe: `POST /api/v1/admin/returns` con `items[]`, `ReturnableQuantityCalculator`, `CreateReturnUseCase`, y la ruta UI `/sales/[id]/returns/new` con `ReturnLineRow`. Esta change es principalmente documental y de UX: formaliza restricciones de validación y agrega feedback visual en el formulario.

## Goals / Non-Goals

**Goals:**
- Formalizar en specs las validaciones ya implementadas (cantidad > 0, no exceder remaining, al menos una línea)
- Agregar en UI: columna "Disponible" en `ReturnLineRow`; recálculo en tiempo real de totales; deshabilitar submit cuando suma = 0

**Non-Goals:**
- Nueva migración de BD
- Nuevos endpoints o cambios de lógica de negocio en backend

**Nota de implementación:** Se agregaron tests unitarios de backend (sección 2) y se verificó/confirmó la existencia de `ReturnItemsEmptyError` y `ReturnInvalidQuantityError` en `src/modules/returns/domain/errors/`. Estos errores ya existían; la tarea fue de verificación y cobertura de tests, no de nueva lógica.

## Decisions

### D-1: Cambios solo en frontend

Todos los cambios de código son en `ReturnLineRow` y `CreateReturnFooter`:
- `ReturnLineRow` recibe `maxQuantity` (el `remaining` calculado) y lo muestra como "Disponible: X" junto al input
- `CreateReturnFooter` recalcula subtotal/tax/total en tiempo real con `ReturnTotalsCalculator` (ya existe en dominio)
- Submit deshabilitado cuando `items.every(i => i.quantity === 0 || i.quantity === '')`

### D-2: No se agrega `computeTotalsClient` separado

El frontend ya usa `ReturnTotalsCalculator` (domain service puro sin Prisma). Se puede importar desde `src/modules/returns/domain/services/ReturnTotalsCalculator.ts` en el componente o duplicar la fórmula pura en `_logic/lib/computeReturnTotalsClient.ts` (preferido para no cruzar capas `src/` desde `app/`).

## Risks / Trade-offs

- **[Trade-off] Duplicar fórmula en cliente**: mantener `computeReturnTotalsClient.ts` sincronizado con `ReturnTotalsCalculator`. Mitigation: test de equivalencia en `totals-vectors.ts` ya cubre esto.

## Migration Plan

Sin migración. Solo cambios de UI.

## Open Questions

- ¿`ReturnLineRow` muestra el input deshabilitado cuando `maxQuantity = 0` (línea ya devuelta completamente)? (Recomendado: sí, con indicador "Devuelto" en lugar del input)
