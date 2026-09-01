## 1. Helper compartido

- [x] 1.1 Crear `app/(private)/sales/_logic/lib/resolveTicketConditionsLine.ts` con la interfaz `TicketConditionsInput { isCredit: boolean; customerCreditDays?: number | null }` y la función `resolveTicketConditionsLine(sale): string` — retorna `` `Crédito a ${sale.customerCreditDays ?? 30} días` `` si `isCredit` es `true`, o `"CONTADO"` si es `false`.
- [x] 1.2 Crear `tests/unit/ui/(private)/sales/_logic/lib/resolveTicketConditionsLine.test.ts` con 4 casos: crédito con `customerCreditDays` numérico, crédito con `customerCreditDays: null` (fallback a 30), efectivo con cliente, efectivo sin cliente (walk-in).

## 2. Impresión térmica (`PrintableTicket.tsx`)

- [x] 2.1 Renombrar la constante `CREDIT_LINE_HEIGHT_MM` a `CONDITIONS_LINE_HEIGHT_MM` (mismo valor, 8mm).
- [x] 2.2 En `computeTicketPageHeightMm`, sumar `CONDITIONS_LINE_HEIGHT_MM` de forma incondicional (quitar el chequeo `sale.customerCreditDays != null`).
- [x] 2.3 Importar `resolveTicketConditionsLine` y reemplazar el bloque condicional de "Condiciones" (actualmente gateado por `sale.customerCreditDays != null`) por un render incondicional que use el helper.
- [x] 2.4 Confirmar que el bloque de datos del Cliente (gateado por `sale.customerId`) queda sin cambios — es independiente de "Condiciones".

## 3. Preview en pantalla (`TicketPreviewPage.tsx`)

- [x] 3.1 Importar `resolveTicketConditionsLine` y reemplazar el bloque condicional de "Condiciones" por un render incondicional que use el helper.

## 4. Payload ESC/POS

- [x] 4.1 En `app/(private)/sales/_logic/types/ticketPrintJob.ts`, quitar `creditDays: number | null` y agregar `conditionsLine: string` a la interfaz `TicketPrintJob`.
- [x] 4.2 En `app/(private)/sales/_logic/lib/buildTicketPrintJob.ts`, importar `resolveTicketConditionsLine` y reemplazar `creditDays: sale.customerCreditDays ?? null` por `conditionsLine: resolveTicketConditionsLine(sale)`.

## 5. Actualizar tests existentes

- [x] 5.1 `tests/unit/ui/(private)/sales/PrintableTicket.test.tsx`: corregir la fixture base inconsistente (`isCredit: false` + `customerCreditDays: 30` simultáneos) usando escenarios coherentes por test.
- [x] 5.2 Reescribir el test "shows credit conditions from customer creditDays" en dos tests: crédito muestra "Crédito a N días"; efectivo muestra "CONTADO".
- [x] 5.3 Invertir el test "omits customer section and credit conditions when sale has no customer": sólo la sección Cliente se omite; "Condiciones"/CONTADO sigue apareciendo.
- [x] 5.4 Recalcular el test de altura de página (`declares @page height...`): correr el test tras 2.1-2.3 y ajustar el valor esperado al resultado real (la altura ahora siempre incluye `CONDITIONS_LINE_HEIGHT_MM`).
- [x] 5.5 `tests/unit/ui/(private)/sales/_logic/lib/buildTicketPrintJob.test.ts`: quitar/reemplazar el test de `creditDays` por tests de `conditionsLine` (crédito, efectivo con cliente, efectivo walk-in).
- [x] 5.6 `tests/unit/ui/(private)/sales/[id]/ticket/_blocks/TicketPreviewPage.test.tsx`: corregir la aserción que hoy espera "Crédito a 30 días" con `isCredit` falso/no seteado → debe esperar "CONTADO". Agregar tests: crédito con días, efectivo walk-in sin cliente.
- [x] 5.7 Correr `tests/e2e/sales-ticket-print.spec.ts`: T1-T3 pasan sin cambios. T4 falla, pero verificado con `git stash` que falla igual en `master` (valor recibido idéntico, "12mm 3mm 4mm") — bug preexistente no relacionado a este change (el assert espera el shorthand de 2 valores "4mm 3mm" pero el CSS real ya declaraba 4 valores desde antes). Fuera de alcance, no se toca.

## 6. Verificación

- [x] 6.1 Correr `npm test` — 3899/3919 tests, 531/532 suites en verde. Único fallo: `tests/integration/modules/products/products-crud.test.ts` (contra DB real, `inventory_movements_product_id_fkey` — contaminación de datos preexistente de otra suite de integración, sin relación al módulo de ventas/tickets tocado en este change).
- [x] 6.2 Correr `npx playwright test tests/e2e/sales-ticket-print.spec.ts` — 3/4 (T4 preexistente, ver 5.7).
- [x] 6.3 Verificación manual con Playwright (script temporal descartado tras uso) en `/sales/[id]/ticket` contra 3 ventas reales de la DB seedeada: (a) venta a crédito con cliente → muestra "Crédito a N días", NO "CONTADO"; (b) venta en efectivo con cliente → muestra "CONTADO", NO "Crédito a"; (c) venta en efectivo sin cliente (walk-in) → muestra "CONTADO" sin sección "Cliente" — confirma que "Condiciones" ya no depende de si hay cliente asociado.
