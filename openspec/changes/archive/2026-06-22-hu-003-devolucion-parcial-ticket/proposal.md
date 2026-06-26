## Why

El módulo de devoluciones parciales ya existe en el sistema (`POST /api/v1/admin/returns`, `/sales/[id]/returns/new`). Sin embargo, las HU del cliente formalizan requisitos adicionales de UX y validación que aún no están especificados explícitamente en la spec canónica: cantidad visible de "retornable" por línea, recálculo inmediato del importe a devolver en el formulario cliente, y restricciones de validación más estrictas (no cero, no negativo) documentadas en tests.

## What Changes

- Documentar formalmente en `returns-api` spec las restricciones ya implementadas: `quantity > 0`, cantidades no pueden exceder `ReturnableQuantityCalculator.computeRemaining()`
- Actualizar `returns-ui` spec para incluir: columna "Disponible" en `ReturnLineRow` mostrando cantidad retornable en tiempo real; recálculo del subtotal/total de devolución conforme el usuario modifica cantidades; estado "Crear devolución" deshabilitado si suma de cantidades = 0
- Agregar test vectors para cantidades inválidas (0, negativo, exceso) en `CreateReturnUseCase`

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `returns-api`: formalizar validaciones existentes de cantidad (0, negativo, exceso) + escenarios de test
- `returns-ui`: requisitos de UX explícitos en `CreateReturnPage` — cantidad retornable visible, recálculo en tiempo real, guard de submit vacío

## Impact

- **Backend**: sin cambios de código nuevos; solo formalización de comportamiento existente y nuevos test cases en `tests/unit/modules/returns/`
- **Frontend**: `ReturnLineRow` muestra max disponible; `CreateReturnFooter` muestra totales calculados en tiempo real; submit guard
- **Sin breaking changes**
