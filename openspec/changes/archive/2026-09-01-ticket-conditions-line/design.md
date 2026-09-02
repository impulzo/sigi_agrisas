## Context

Ver `proposal.md` - Why. Resumen técnico: la sección "Condiciones" del ticket existe en 3 superficies sin componente compartido (`app/(private)/sales/_blocks/PrintableTicket.tsx`, `app/(private)/sales/[id]/ticket/_blocks/TicketPreviewPage.tsx`, `app/(private)/sales/_logic/lib/buildTicketPrintJob.ts`), y las 3 gatean hoy sobre `sale.customerCreditDays != null` en vez de `sale.isCredit`. `SaleDetail` (`app/(private)/sales/_logic/types/domain.ts`) ya trae ambos campos sin necesidad de tocar backend ni DTOs — `CreateSaleUseCase.ts:76` ya garantiza que una venta a crédito siempre tiene cliente con `creditDays` (default 30 en schema Prisma), así que el caso `isCredit=true && customerCreditDays=null` es defensivo, no de negocio.

## Goals / Non-Goals

**Goals:**
- Corregir el gate de "Condiciones" en las 3 superficies para que responda a `sale.isCredit` (fila 1 de la Historia de Usuario).
- Eliminar la triplicación de esta lógica con un único helper puro, testeable de forma aislada.
- Mantener `computeTicketPageHeightMm` (impresión térmica) alineado con el nuevo render, para no reintroducir el bug de alto mal calculado que motivó el commit `dac12ba` ("recalibrate BASE_HEIGHT_MM").

**Non-Goals:**
- No se toca backend (`src/modules/pos/`) ni DTOs — los datos ya viajan completos.
- No se toca `app/(private)/billing/` (Factura Parcial) — no comparte código con el ticket POS.
- No se implementa aquí ninguna actualización del agente ESC/POS externo (fuera de este repo) — sólo se cambia el contrato del payload que ese agente deberá empezar a consumir.

## Decisions

**1. Helper puro compartido en vez de lógica inline triplicada.**
`resolveTicketConditionsLine(sale: { isCredit: boolean; customerCreditDays?: number | null }): string` en `app/(private)/sales/_logic/lib/resolveTicketConditionsLine.ts`. Recibe un subset tipado (no `SaleDetail` completo) para quedar testeable sin fixture pesado y reutilizable desde las 3 superficies. Alternativa descartada: mantener la lógica duplicada pero corregida en cada archivo — se descarta porque la duplicación es precisamente lo que dejó el bug original sin detectar en una de las 3 copias.

**2. "Condiciones" pasa a renderizarse siempre (crédito o CONTADO), sin importar si hay cliente.**
Confirmado con el usuario vía AskUserQuestion durante Plan Mode: CONTADO se muestra incluso en ventas de mostrador sin cliente asociado (walk-in). La regla es puramente sobre `sale.isCredit`, symmetric y sin excepciones — cubre a la fila 1 completa de la tabla de Historia de Usuario, incluyendo el AC de "la sección se muestra siempre". Alternativa descartada: mostrar CONTADO sólo si hay cliente — se descartó porque dejaría el mismo tipo de bug de omisión que motivó este change (una condición de pago real que no se comunica en el ticket).

**3. `TicketPrintJob.creditDays: number | null` se reemplaza (no se mantiene aditivo) por `conditionsLine: string`.**
Confirmado con el usuario: prioriza un modelo de datos limpio (**BREAKING** para el agente ESC/POS externo, no versionado en este repo) sobre mantener un campo legacy que ya representaba el bug (`creditDays` nunca distinguía crédito de contado). El agente ESC/POS deberá actualizarse para leer `conditionsLine` en vez de `creditDays` — coordinación fuera del alcance de este change, documentada como impacto externo en `proposal.md`.

**4. `computeTicketPageHeightMm` suma la altura de la línea de Condiciones incondicionalmente.**
Antes sumaba `CREDIT_LINE_HEIGHT_MM` sólo si `customerCreditDays != null`. Como la línea ahora siempre se imprime (crédito o CONTADO), la constante se renombra a `CONDITIONS_LINE_HEIGHT_MM` (mismo valor, 8mm) y se suma sin condición. Esto es consistente con el criterio ya usado por el resto de la función: el alto debe reflejar exactamente qué se va a imprimir, sin depender de heurísticas — el mismo principio que motivó la recalibración reciente de `BASE_HEIGHT_MM`.

**5. Fallback defensivo `?? 30` en el helper para `isCredit=true && customerCreditDays=null`.**
No se pregunta al usuario por texto de fallback alternativo porque el caso no debería ocurrir en producción (`CreateSaleUseCase.ts:76` bloquea ventas a crédito sin cliente; `Customer.creditDays` tiene default 30). El fallback sólo evita un render roto (`NaN`/`undefined`) ante datos legacy inconsistentes; usar el mismo default de negocio (30) es la opción menos sorpresiva.

## Risks / Trade-offs

- **[Riesgo] El agente ESC/POS externo queda desincronizado hasta que se actualice para leer `conditionsLine` en vez de `creditDays`.** → Mitigación: cambio explícitamente aprobado por el usuario como breaking; se documenta en `proposal.md` como impacto/dependencia externa a coordinar. No es mitigable dentro de este repo porque el agente no está versionado aquí.
- **[Riesgo] El recálculo de `computeTicketPageHeightMm` desplaza el alto de página para ventas que antes no tenían la línea de Condiciones (walk-in efectivo), pudiendo requerir ajustar el assert de margen exacto en `tests/e2e/sales-ticket-print.spec.ts`.** → Mitigación: correr el spec e2e tras el cambio y ajustar el valor esperado si es necesario; no es una regresión, es la altura reflejando correctamente una línea de contenido nueva.
- **[Riesgo] Tickets ya impresos/históricos no se corrigen retroactivamente** (esto es un cambio de renderizado, no de datos) — un cliente que ya recibió un ticket con "Crédito a N días" incorrecto en una venta de efectivo pasada no lo recibe corregido. → Fuera de alcance: no hay mecanismo de reimpresión retroactiva masiva en el sistema; el usuario no lo pidió.

## Migration Plan

Sin migración de datos — cambio puramente de UI/render sobre datos ya existentes. Despliegue estándar (merge a `develop`, sin flag de feature ni rollout gradual, dado que corrige un bug funcional visible de inmediato). Rollback: revertir el commit: revierte la lógica de render, la constante de altura y el tipo `TicketPrintJob` al estado previo (con el bug conocido) sin dejar estado intermedio inconsistente, ya que no hay cambios de backend/DB involucrados.
