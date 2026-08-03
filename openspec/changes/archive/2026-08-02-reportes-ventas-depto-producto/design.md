## Context

`PrismaSalesCutRepository.getAggregates` ya ejecuta un `Promise.all` con múltiples queries (aggregate/groupBy/raw) contra `sales`, `sale_items` y tablas relacionadas, todas acotadas por `activeWhere`/`salesConds` (mismo `from`/`to`/branch/cashier/paymentMethod). `SalesCutAssembler` es un servicio de dominio puro que sólo ordena y redondea — no hace I/O. `InMemorySalesCutRepository` replica la misma lógica sobre arrays en memoria para tests de use case. Ver proposal.md - Why para la motivación de negocio.

## Goals / Non-Goals

**Goals:**
- Agregar `byDepartment` y `byProduct` (historias 1 y 2 de la tabla) sin tocar el contrato de los 4 desgloses existentes ni el branch scoping ya probado.
- Reusar `BreakdownRow` para `byDepartment` (mismo shape) y extenderlo mínimamente para `byProduct` (agrega `quantitySold`).

**Non-Goals:**
- No se pagina ni se limita `byProduct` a un top-N — igual que los desgloses existentes, se listan todas las filas con actividad en el periodo (Criterio de Aceptación explícito de la historia 2).
- No se resta inventario devuelto (`returns`) de `quantitySold` — mismo criterio que el resto del corte (ventas activas del periodo, sin netear devoluciones), documentado explícitamente para evitar ambigüedad futura.
- No se agrega paginación de UI a las tablas nuevas — se renderizan completas como las demás (`BreakdownTable` ya no pagina ninguna).

## Decisions

**D1 — Extender `BreakdownRow` con un campo opcional en vez de crear un tipo paralelo**
`ProductBreakdownRow` reutiliza la interfaz `BreakdownRow` agregando `quantitySold: number` (requerido sólo en esa fila, no en las demás). Alternativa descartada: una jerarquía de tipos separada `DepartmentBreakdownRow`/`ProductBreakdownRow` sin relación — más código para el mismo propósito, dado que `byDepartment` es 100% compatible con `BreakdownRow` tal cual.

**D2 — Nombre de departamento/producto resuelto vía join a tablas vivas, no snapshot**
`byDepartment` y `byProduct` resuelven `label` uniendo `sale_items.product_id → products.department_id → departments.name` (departamento) y `products.name`/`code` (producto) en vivo — igual que `byPaymentMethod`/`byCashier`/`byBranch` ya resuelven nombres en vivo (no desde snapshots). Se prefiere esto sobre usar `sale_items.product_name_snapshot` porque el reporte es una vista de negocio "qué se vendió" con la identidad actual del catálogo (si un producto se renombra, el gerente quiere verlo bajo su nombre actual, no fragmentado en dos filas por el rename) — consistente con el patrón ya establecido en este mismo repositorio para los otros desgloses. `productId` tiene `onDelete: Restrict` en el schema, por lo que el join siempre resuelve (un producto referenciado por `sale_items` no puede borrarse).

**D3 — `ticketCount` en `byDepartment`/`byProduct` = tickets distintos, no líneas**
Para mantener el significado de "Tickets" consistente con las otras 4 tablas (que cuentan ventas, no líneas), `ticketCount` en los desgloses nuevos SHALL ser `COUNT(DISTINCT sale_id)`, no `COUNT(*)` de líneas. Se calcula con SQL crudo (mismo patrón que `dayRows`/`taxRows` ya usan `$queryRaw`).

**D4 — Dos queries `$queryRaw` nuevas, agregadas al mismo `Promise.all`**
Se agregan `departmentRows` y `productRows` al `Promise.all` existente en `PrismaSalesCutRepository.getAggregates`, reutilizando `salesConds` para los filtros WHERE (igual patrón que `dayRows`/`taxRows`). No se crean nuevos métodos de repositorio ni un nuevo `Promise.all` — mismo ciclo de vida y mismo costo de una sola llamada a la BD por reporte.

## Risks / Trade-offs

- **[Riesgo] `byProduct` sin límite de filas puede ser una tabla larga en catálogos con cientos de SKUs activos en el periodo.** Mitigado: mismo riesgo ya aceptado por `byPaymentMethod` (aunque ese suele ser corto) — un periodo típico de corte (día/turno) tiene un número acotado de SKUs vendidos; si en el futuro se vuelve un problema de rendimiento/UX, es un change separado (paginación o top-N) que no cambia el contrato base aquí.
- **[Riesgo] Los joins vivos a `products`/`departments` no reflejan el nombre histórico si el producto se renombró después de la venta.** Aceptado (ver D2) — coherente con el resto del corte, que ya resuelve nombres en vivo.
