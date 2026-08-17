## 1. Fix — opción "Todos los clientes"

- [x] 1.1 `app/(private)/reports/_blocks/CustomerFilterCombobox.tsx`: antepuesta a `options` una entrada fija `{ value: "", label: "Todos los clientes" }` cuando `query === ""` (sin búsqueda de texto activa); no se mezcla con los resultados de `useCustomerSearch` cuando `query !== ""`.

## 2. Tests

- [x] 2.1 Creado `tests/unit/ui/(private)/reports/_blocks/CustomerFilterCombobox.test.tsx` (3 tests, todos en verde): primera opción "Todos los clientes" sin búsqueda; `value=""` muestra "Todos los clientes" seleccionado; búsqueda activa no mezcla el sentinel con resultados.

## 3. Verificación

- [x] 3.1 `npm test` — 469/469 suites, 3316/3316 tests en verde.
- [x] 3.2 `npm run build` — sin errores de tipos (Node 20.20.2).
- [x] 3.3 Verificado con Playwright real (`tests/e2e/plan-verification.spec.ts`): dos tests "C3 — filtro de cliente en Cobranza (Por Cliente) muestra 'Todos los clientes' por defecto" y "C3 — ... en Ventas por Producto ..." — ambos navegan autenticados, cambian a la pestaña Por Cliente y confirman `input[placeholder="Buscar cliente…"]` tiene value="Todos los clientes" — PASS en ambos.
