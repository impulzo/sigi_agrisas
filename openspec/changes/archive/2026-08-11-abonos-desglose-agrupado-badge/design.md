## Context

Ver `proposal.md` — Why. Este change toca 2 capas (backend `src/modules/payments/` y frontend `app/(private)/payments/` + `SalePaymentsSection`) y agrega una dependencia de formato nueva (Excel) reusando la librería `xlsx` ya presente en el proyecto (usada hoy por `src/modules/reports/infrastructure/xlsx/buildCashCutWorkbook.ts`). El join a `sales` necesario para exponer `saleTotal`/`salePaidAmount`/`salePaymentStatus` **ya existe** en las 3 rutas de datos backend (`list`, `findById`, `findHistory`) — no se agregan joins nuevos, solo se exponen campos ya consultados.

## Goals / Non-Goals

**Goals:**
- Exponer el desglose Monto total / Saldo de la venta en cada abono de `/payments` y `/payments/history` (Historia #1).
- Ofrecer una vista agrupada por ticket, alternable en pantalla y fija en exports (Historia #2).
- Sustituir la semántica ambigua de "Completado" por un estado de 3 valores derivado de datos ya autorizados (Historia #3).
- Corregir el bug de `$NaN` en el pie de `/payments/history` (Historia #4, bonus fix aprobado).

**Non-Goals:**
- No se toca `src/modules/reports/**PaymentHistory**` (endpoint paralelo sin UI) — fuera de alcance explícito.
- No se agrega agrupación server-side ni un nuevo endpoint paginado-por-ticket — la agrupación en pantalla es puramente client-side sobre la página ya cargada (trade-off aceptado, ver Riesgos).
- No se cambia el enum `PaymentStatus` (`completed`|`cancelled`) del dominio backend — sigue representando el ciclo de vida del registro de abono; la semántica de "100% cobrado" vive exclusivamente en `salePaymentStatus`, ya existente.
- No se agrega RBAC nuevo — los 3 features aplican por igual a los 3 roles que ya tienen `payments:read`/`payments:report_read` (admin, operator, viewer), confirmado con el usuario.

## Decisions

**1. Exponer `saleTotal`/`salePaidAmount`/`salePaymentStatus`/`saleDueAmount` en `PaymentDto` y `PaymentHistoryRowDto` (no crear un DTO nuevo).**
Alternativa considerada: crear un `PaymentWithSaleSummaryDto` separado para no "inflar" el DTO base. Se descarta porque `PaymentDto` ya se usa uniformemente en `list`, `getById`, `register`, `cancel` y dentro de `listBySale`; mantener un único shape evita que el frontend tenga que distinguir "qué variante de abono" está recibiendo según el endpoint. El costo es leve redundancia en `PaymentDetailDto` (que ya tenía un bloque `sale{...}` separado) — aceptado y documentado en la spec, no se elimina el bloque `sale` existente por si algo más depende de su forma completa.

**2. Agrupación por ticket en pantalla: client-side sobre la página cargada, no un endpoint nuevo.**
Alternativa considerada: nuevo endpoint `GET /payments/grouped` con `GROUP BY sale_id` server-side y su propia paginación por ticket. Se descarta por complejidad desproporcionada al pedido — el usuario pidió un toggle de vista, no una re-arquitectura de paginación. Trade-off aceptado y documentado en la spec: un ticket con abonos en 2 páginas se agrupa por separado en cada página. Esto es consistente con que la tabla plana ya pagina así hoy.

**3. Agrupación en exports (PDF/Excel): sobre el dataset completo no paginado, hecha en los builders (no en la query SQL).**
El endpoint de historial ya des-pagina para `format=pdf` (flag `forPdf`, límite 10,000 filas) — se reutiliza el mismo flag (`isExport = format === "pdf" || format === "xlsx"`) para ambos formatos nuevos. La agrupación por `saleId` ocurre en JS dentro de `PaymentHistoryPdf.tsx` y `buildPaymentsHistoryWorkbook.ts` sobre el array plano `items` ya devuelto — evita tocar la query raw SQL de `findHistory` para agrupar, que sería más riesgoso (raw SQL con `GROUP BY` + agregados por fila es más propenso a errores que un `.reduce()` en TS).

**4. Excel reusa el patrón de `xlsx` ya existente (`buildCashCutWorkbook.ts`), no una librería nueva.**
`xlsx` ya es dependencia del proyecto y tiene precedente de uso idéntico (`aoa_to_sheet` → `book_new` → `book_append_sheet` → `XLSX.write(..., {type:"buffer", bookType:"xlsx"})`) en `src/modules/reports/infrastructure/xlsx/`. Se crea `buildPaymentsHistoryWorkbook.ts` calcado de ese patrón dentro de `src/modules/payments/infrastructure/xlsx/` (mismo módulo que el resto de infraestructura de payments, no en `reports/`, para no acoplar módulos).

**5. Badge de 3 estados como componente único con 2 props, no 2 badges separados.**
Alternativa considerada (explorada y descartada con el usuario vía AskUserQuestion): mantener `PaymentStatusBadge` (ciclo de vida) y `SalePaymentStatusBadge` (cobro) como 2 badges independientes mostrados uno al lado del otro. El usuario prefirió un único badge de 3 estados combinados ("Activo/Cancelado/Completado") por fila de abono — más compacto en tablas densas. `SalePaymentStatusBadge` (a nivel de venta, en `SaleDetailPage`/`SalesTable`) no se toca, sigue existiendo para su propio contexto.

**6. No se migra `PaymentsController.list()`/`getById()` al mapper `toPaymentDto()`.**
Ambos construyen su JSON inline hoy (no usan el mapper). Migrarlos sería una limpieza deseable pero cambiaría el comportamiento de `items` (el mapper sí serializa `items` de desglose por línea; el inline actual no los incluye en `list()`) — efecto colateral fuera de lo pedido. Se mantiene el mapeo inline, solo se le agregan los 4 campos nuevos manualmente en cada punto, documentado explícitamente para que quien revise el diff entienda que es una decisión, no un olvido.

**7. Bonus fix del bug de `totals` se resuelve solo en el tipo/consumo frontend.**
El backend ya serializa correctamente `{ items, totals: {...}, page, pageSize, total }` — el bug es exclusivamente que el tipo TS `PaymentHistoryReportDto` (frontend) y `PaymentsHistoryPage.tsx` asumían campos planos. No se toca el backend para esto.

## Risks / Trade-offs

- **[Riesgo] Agrupación en pantalla no cruza páginas** → Mitigación: documentado explícitamente en la spec (`payments-ui`) y en el propio componente/función de agrupación como comentario breve; comportamiento aceptado por el usuario implícitamente al aprobar el toggle simple sobre re-arquitectura de paginación.
- **[Riesgo] `PaymentDisplayJoins`/`PaymentHistoryItem` pasan a requerir 3 campos nuevos no opcionales** → si se olvida alguno de los ~11 puntos de construcción (`PrismaPaymentRepository` + `InMemoryPaymentRepository`), la compilación de TypeScript falla — mitigación: el fallo es en tiempo de compilación (no en runtime silencioso), y `PaymentsUseCases.test.ts` (que usa `InMemoryPaymentRepository`) actúa como red de seguridad adicional.
- **[Riesgo] `format=xlsx` comparte el límite de 10,000 filas de `forPdf`** → mismo trade-off ya aceptado para PDF; no se introduce un límite nuevo ni distinto, documentado en la spec.
- **[Riesgo] Redundancia entre `PaymentDetailDto.sale.paymentStatus` (bloque anidado existente) y el nuevo `salePaymentStatus` plano heredado de `PaymentDto`** → aceptado, ambos deben coincidir siempre porque se derivan del mismo `sale` en el mismo query; no se elimina el bloque `sale` por compatibilidad con otros consumidores del detalle.
- **[Riesgo] Bonus fix cambia un tipo TS "ya roto en producción"** → riesgo real es cercano a cero (hoy ya muestra `NaN`), pero se declara explícitamente en `proposal.md` como decisión consciente, no como efecto colateral oculto de los 3 features pedidos.

## Migration Plan

No aplica migración de base de datos (no hay cambios de schema Prisma) ni migración de datos — son campos derivados en tiempo de lectura desde `sales.total`/`sales.paid_amount`/`sales.payment_status`, columnas ya existentes desde `add_customer_payments`. Deploy estándar: mergear, `npm run build`, deploy. Sin rollback especial — los cambios son aditivos en la API (nuevos campos, nuevo valor de `format`) y el badge de 3 estados es un cambio de UI puro sin persistencia.
