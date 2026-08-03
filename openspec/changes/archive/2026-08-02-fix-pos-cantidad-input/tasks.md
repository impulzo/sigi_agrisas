## 1. CartLine.tsx

- [x] 1.1 Input de cantidad reemplazado por `type="text"` + `inputMode="decimal"` con estado de borrador (`quantityDraft`), filtrado por `/^\d*\.?\d{0,3}$/` en `onChange`, revert en `onBlur` si inválido.
- [x] 1.2 Sincronización con `line.quantity` externo vía `useEffect` + `quantityFocusedRef` (no pisa mientras el cajero edita activamente).

## 2. PriceTierPicker.tsx

- [x] 2.1 Mismo patrón aplicado — `quantityDraft` + regex + revert en blur.

## 3. Tests

- [x] 3.1 `tests/unit/ui/(private)/pos/_blocks/CartLine.test.tsx` (nuevo, no existía) — 5 casos: borrar sin revertir, reescribir decimal, rechazo 4º decimal, revert en blur, `onUpdateQuantity` llamado con el valor correcto.
- [x] 3.2 `tests/unit/ui/(private)/pos/_blocks/PriceTierPicker.test.tsx` — 5 casos nuevos agregados a los 7 existentes (los 7 originales siguen pasando sin cambios, confirmando no regresión).

## 4. Verificación

- [x] 4.1 `npm run build` OK.
- [x] 4.2 `npx jest` verde: `CartLine.test.tsx` (5/5), `PriceTierPicker.test.tsx` ambos archivos (11/11 + 12/12 legacy).
- [x] 4.3 Smoke real en `/pos`: verificado en browser real — se agregó producto al carrito, se borró la cantidad con Backspace repetido (input quedó vacío sin reversión instantánea en cada tecla) y se reescribió un valor decimal; el total recalculó correctamente.
