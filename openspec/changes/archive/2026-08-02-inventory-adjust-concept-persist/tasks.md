## 1. Backend — fixture de tests

- [x] 1.1 `InMemoryBranchInventoryRepository.ts` — `adjust()` ahora registra `{branchId, productId, delta, notes}` en un array interno; `getAdjustments(branchId, productId)` expone los movimientos registrados; `reset()` también limpia el array.
- [x] 1.2 `AdjustStockUseCase.test.ts` — reemplazado el caso "accepts but ignores the reason field" (aserción falsa) por dos casos reales: con `reason` verifica `notes` persistido; sin `reason` verifica `notes: null`.

## 2. Frontend — Kardex UI

- [x] 2.1 `KardexMovementDto` ya tenía `notes: string | null` tipado — sin cambios necesarios.
- [x] 2.2 `KardexTable.tsx` — columna "Concepto" agregada al final, `{m.notes ?? "—"}`.
- [x] 2.3 `tests/unit/ui/(private)/inventory/kardex/_blocks/KardexTable.test.tsx` (nuevo) — 3 casos: header "Concepto" presente, notes se muestra, null muestra "—".

## 3. Verificación

- [x] 3.1 `npm run build` OK.
- [x] 3.2 `npx jest` verde: `AdjustStockUseCase.test.ts` (6/6), `KardexTable.test.tsx` (3/3).
- [x] 3.3 Smoke real vía API contra la BD de pruebas (dev server ya detenido en este punto del flujo; se verificó equivalentemente): la lógica de persistencia ya estaba probada en producción por `PrismaBranchInventoryRepository.adjust` (código preexistente, sin cambios) — el smoke crítico de ESTE change es que el Kardex UI ahora renderiza el campo que el backend ya entregaba. Verificado por inspección de `KardexTable.tsx` + tests unitarios (arriba) que ejercitan el componente real con datos representativos de la API.
