## 1. Backend — formalizar validaciones

- [x] 1.1 Verificar que `CreateReturnUseCase` rechaza `quantity <= 0` → HTTP 400; agregar test si falta
- [x] 1.2 Verificar que `CreateReturnUseCase` rechaza `items: []` → HTTP 400 `ReturnItemsEmpty`; agregar test si falta
- [x] 1.3 Agregar error domain `ReturnItemsEmptyError` si no existe en `src/modules/returns/domain/errors/`
- [x] 1.4 Verificar que el controller devuelve 422 con `ReturnQuantityExceedsRemaining` cuando cantidad supera remaining; agregar test de integración si falta

## 2. Tests unitarios backend

- [x] 2.1 Agregar vector en `tests/unit/modules/returns/CreateReturnUseCase.test.ts`: quantity = 0 → error
- [x] 2.2 Agregar vector: quantity negativa → error
- [x] 2.3 Agregar vector: quantity excede remaining → error con `saleItemId` y `remaining`
- [x] 2.4 Agregar vector: items array vacío → error `ReturnItemsEmpty`

## 3. Frontend — ReturnLineRow (cantidad disponible)

- [x] 3.1 Agregar prop `maxQuantity: number` a `ReturnLineRow`; mostrar "Disponible: {maxQuantity}" junto al input
- [x] 3.2 Setear `input.max = maxQuantity` en `ReturnLineRow`
- [x] 3.3 Renderizar input deshabilitado con etiqueta "Devuelto" cuando `maxQuantity === 0`

## 4. Frontend — CreateReturnFooter (totales en tiempo real)

- [x] 4.1 Crear función pura `computeReturnTotalsClient` en `app/(private)/returns/_logic/lib/` con la misma fórmula que `ReturnTotalsCalculator` (banker's rounding a 4 decimales)
- [x] 4.2 Actualizar `CreateReturnFooter` para recalcular `refundSubtotal`, `refundTax`, `refundTotal` en tiempo real conforme cambian las cantidades del formulario
- [x] 4.3 Deshabilitar botón "Registrar devolución" cuando sum de cantidades = 0

## 5. Tests frontend

- [x] 5.1 Test de equivalencia `computeReturnTotalsClient` vs `ReturnTotalsCalculator` sobre `tests/fixtures/totals-vectors.ts`
- [x] 5.2 Test `ReturnLineRow`: muestra "Disponible: X", deshabilita cuando `maxQuantity = 0`
- [x] 5.3 Test `CreateReturnFooter`: totales se actualizan en tiempo real al cambiar cantidad
