## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Cajero | Como cajero, quiero que el ticket de venta (preview e impresión) muestre una sección "Condiciones" con los días de crédito del cliente cuando la venta es a crédito, o con el texto "CONTADO" cuando es en efectivo, para entregar al cliente un comprobante con el término de pago correcto y evitar disputas por cobros mal interpretados | - Given venta con `paymentMethod.isCredit=true`, When se genera preview o impresión del ticket, Then "Condiciones" muestra "Crédito a N días" usando `customer.creditDays`.<br>- Given venta con `paymentMethod.isCredit=false`, When se genera preview o impresión, Then "Condiciones" muestra "CONTADO".<br>- Given venta en efectivo sin cliente asociado (walk-in), When se genera el ticket, Then igual muestra "CONTADO" (la regla depende de la forma de pago, no de si hay cliente).<br>- Given venta a crédito cuyo cliente no tuviera `creditDays` seteado (caso defensivo, no debería ocurrir por regla de negocio existente), When se genera el ticket, Then usa el default de 30 días sin romper el render.<br>- La sección "Condiciones" se muestra siempre (ya no se omite), reemplazando el comportamiento actual donde sólo aparecía si el cliente tenía `creditDays` seteado, sin importar la forma de pago real de esa venta puntual. | - Ningún permiso nuevo: el ticket ya está protegido por `sales:read` existente; el cambio es sólo de contenido mostrado, no de acceso.<br>- No expone datos sensibles adicionales — `customer.creditDays` ya viaja en `SaleDetail` hoy, sólo se corrige cuándo se renderiza.<br>- Consistencia entre las 3 superficies (preview pantalla, impresión browser, payload agente ESC/POS externo) para que no quede ninguna mostrando el dato de crédito incorrecto tras el fix. |

## Why

La sección "Condiciones" del ticket ya existe, pero su condición de aparición está mal atada: hoy se gatea con `customerCreditDays != null` (un dato del **cliente**) en vez de `sale.isCredit` (dato de la **venta puntual**). Como consecuencia, un cliente con `creditDays` configurado que paga una venta específica en efectivo recibe hoy un ticket que dice "Crédito a N días" — una condición de pago incorrecta impresa en un comprobante que se entrega al cliente. Corregirlo ahora, antes de que se acumulen más tickets emitidos con el dato equivocado, y de paso cubrir el caso simétrico que nunca se implementó: mostrar "CONTADO" explícitamente en ventas de efectivo.

## What Changes

- Se corrige el gate de la sección "Condiciones" en las 3 superficies que la renderizan (`PrintableTicket.tsx`, `TicketPreviewPage.tsx`, `buildTicketPrintJob.ts`) para basarse en `sale.isCredit` en vez de `sale.customerCreditDays != null`.
- La sección "Condiciones" pasa a mostrarse **siempre** (antes se omitía si el cliente no tenía `creditDays`): crédito → `"Crédito a <N> días"`; efectivo → `"CONTADO"` (incluso sin cliente asociado, venta de mostrador).
- Se extrae un helper puro compartido `resolveTicketConditionsLine` para eliminar la triplicación de esta lógica entre las 3 superficies.
- **BREAKING** (payload interno, agente ESC/POS externo no versionado en este repo): el campo `TicketPrintJob.creditDays: number | null` se reemplaza por `conditionsLine: string`, con el texto ya resuelto. El agente ESC/POS externo deberá actualizarse para leer el campo nuevo — decisión explícita del usuario, priorizando un modelo de datos limpio sobre mantener compatibilidad con un campo que ya representaba el bug.
- Se recalibra `computeTicketPageHeightMm` en `PrintableTicket.tsx` para sumar el alto de la línea de Condiciones de forma incondicional (ya que ahora siempre se imprime), evitando que quede desalineado con el nuevo render y reintroduzca el problema de alto mal calculado que motivó la recalibración reciente de `BASE_HEIGHT_MM`.

## Capabilities

### New Capabilities
(ninguna — el cambio corrige comportamiento existente, no introduce una capability nueva)

### Modified Capabilities
- `ticket-print-ui`: el requirement de condiciones de crédito pasa de gatearse por `customerCreditDays != null` a `sale.isCredit`, se agrega la rama "CONTADO", y se documenta que la sección ya no se omite nunca (afecta también el cálculo de `computeTicketPageHeightMm`, que hoy suma altura condicionalmente sobre el mismo campo).
- `sales-ticket-preview-ui`: mismo cambio de condición para la sección "Condiciones" en el preview de pantalla.
- `escpos-ticket-printing`: el payload JSON enviado al agente ESC/POS reemplaza `creditDays: number | null` por `conditionsLine: string`, siempre presente (ya no se omite la línea de condiciones en el JSON).

## Impact

**Código afectado:**
- `app/(private)/sales/_blocks/PrintableTicket.tsx` — render condicional + cálculo de alto.
- `app/(private)/sales/[id]/ticket/_blocks/TicketPreviewPage.tsx` — render condicional.
- `app/(private)/sales/_logic/lib/buildTicketPrintJob.ts` — payload ESC/POS.
- `app/(private)/sales/_logic/types/ticketPrintJob.ts` — tipo `TicketPrintJob` (breaking: `creditDays` → `conditionsLine`).
- Nuevo: `app/(private)/sales/_logic/lib/resolveTicketConditionsLine.ts`.

**Tests afectados:** `PrintableTicket.test.tsx`, `TicketPreviewPage.test.tsx`, `buildTicketPrintJob.test.ts` (fixtures y aserciones corregidas por el bug), + test nuevo del helper. Posible ajuste de `tests/e2e/sales-ticket-print.spec.ts` si el margen calculado se desplaza.

**Sin impacto en backend** (`src/modules/pos/`) ni en DTOs — `sale.isCredit` y `sale.customerCreditDays` ya viajan en `SaleDetail`. Sin impacto en `billing` (Factura Parcial no comparte código con el ticket POS).

**Dependencia externa:** el agente de impresión ESC/POS (fuera de este repo) consume `TicketPrintJob` — requiere coordinación para actualizarse al campo `conditionsLine` tras este cambio.
