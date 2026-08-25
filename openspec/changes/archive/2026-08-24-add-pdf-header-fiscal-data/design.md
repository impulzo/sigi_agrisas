## Context

`src/shared/infrastructure/pdf/pdfIssuer.ts` ya expone `PdfIssuer` (`businessName`,
`businessRfc`, `businessAddress`, `businessPhone`, `logoUrl`, todos `string | null`) y
`toPdfIssuer(settings: TicketSettings): PdfIssuer`, un mapper puro sin I/O. `QuotePdf.tsx`
(quotes) e `InvoiceDocumentPdf.tsx` (billing) ya consumen este tipo completo desde hace
varios changes. Los 11 documentos de `reports` (vía `ReportHeader.tsx`) y los 2 headers
inline de `payments`/`inventory` solo reciben `logoUrl: string | null` — un subconjunto
del mismo `PdfIssuer` — porque los changes de unificación previos (`unify-reports-pdf`,
`unify-payments-inventory-pdf`) limitaron explícitamente su alcance a logo+color. `Get
TicketSettingsUseCase` ya está inyectado en `ReportsController`, `PaymentsController` e
`InventoryMovementsController` desde esos mismos changes — no hace falta añadir ninguna
dependencia nueva a ningún constructor.

## Goals / Non-Goals

**Goals:**
- Extender `ReportHeader.tsx` para aceptar `issuer: PdfIssuer` en vez de `logoUrl`
  suelto, y renderizar `businessName`/`businessAddress`/`businessRfc` con el mismo
  layout ya validado en `QuotePdf.tsx`.
- Aplicar el mismo tratamiento a los 2 headers inline de `payments`/`inventory` que no
  pasan por `ReportHeader`.
- Preservar sin regresión el folio/cliente que `AnticipoReceiptPdf.tsx` y
  `AccountStatementPdf.tsx` (libro mayor) ya muestran hoy.

**Non-Goals:**
- No se agrega ningún campo nuevo a `TicketSettings`/`PdfIssuer` — los 5 campos ya
  existen y ya son editables en `/settings`.
- No se fuerza un folio/cliente en los reportes agregados multi-fila (corte de ventas,
  cobranza, compras, ventas por producto, stock, precios por departamento) — no tienen
  un documento único al que asociarlos.
- No se toca ningún cálculo de totales, agrupación, ni el contrato HTTP (`?format=pdf`,
  `Content-Disposition`, límite de 10,000 filas) de ningún reporte.
- No se promueve `ReportHeader.tsx` a `src/shared/infrastructure/pdf/` en este change
  (evaluado y descartado — ver Decisiones) — queda como posible follow-up, no bloquea
  este alcance.

## Decisions

**`issuer: PdfIssuer` reemplaza `logoUrl` en la firma de `ReportHeader`, no se agrega
como prop adicional.** Alternativa descartada: mantener `logoUrl` y agregar
`businessName`/`businessAddress`/`businessRfc` como props sueltos adicionales — se
descarta porque `PdfIssuer` ya es exactamente ese conjunto de campos con un mapper puro
ya existente (`toPdfIssuer`); pasar 4 props sueltos en vez de un objeto ya tipado
reintroduce la duplicación que `pdf-design-system` existe para evitar. Responde a la
historia 1 de la tabla.

**Los 11 controllers de `ReportsController.ts` cambian de `const { logoUrl } = await
this.getTicketSettingsUseCase.execute()` a `const settings = await
this.getTicketSettingsUseCase.execute(); const issuer = toPdfIssuer(settings);`.** Es
un cambio de una línea por call site (11 veces) — no se refactoriza a una sola
resolución compartida por request en este change (el change `unify-reports-pdf` ya dejó
esa optimización fuera de alcance explícitamente con el mismo patrón de 11 llamadas
independientes a `getTicketSettingsUseCase`; seguir ese precedente evita un refactor no
pedido).

**`PaymentHistoryPdf.tsx`/`KardexReportPdf.tsx` no migran a `ReportHeader` en este
change — cada uno extiende su propio header inline in-place.** Alternativa
considerada: promover `ReportHeader`/`ReportFooter` a
`src/shared/infrastructure/pdf/PdfHeader.tsx` para que los 3 módulos (`reports`,
`payments`, `inventory`) compartan un solo componente, ya anotada como posible en el
plan aprobado. Se descarta para este change específico porque: (a) el gap pedido por
el usuario es únicamente "agregar dirección/RFC", no "unificar la implementación del
header entre módulos"; (b) promover el componente obliga a tocar 3 módulos + sus 13
consumidores en un solo change, aumentando el blast radius sin necesidad; (c)
`payments`/`inventory` ya reciben su propio tratamiento de logo desde
`unify-payments-inventory-pdf` con su propio `pdfStyles.ts` — extender su header inline
es la migración de menor riesgo, simétrica a como esos changes ya trataron cada módulo
por separado. Queda anotado como oportunidad de refactor futura, no bloqueante.

**`AnticipoReceiptPdf.tsx`/`AccountStatementPdf.tsx` (libro mayor) no cambian dónde
muestran folio/cliente — solo ganan el bloque de emisor extendido.** Responde
directamente a la historia 2: el folio ya vive en el título (`Recibo de Anticipo —
{payment.folio}`) y el nombre del cliente ya vive en el cuerpo/título del libro mayor;
extender `ReportHeader` con `issuer` no toca esas líneas, solo agrega
`businessAddress`/`businessRfc` junto al logo. No hay necesidad de mover folio/cliente
al header — ya son visibles, cumpliendo el criterio "si aplica" del pedido original sin
cambio adicional.

**Campos ausentes (`businessAddress`/`businessRfc` en `null`) se omiten, no se
renderiza texto vacío.** Mismo patrón ya usado en `QuotePdf.tsx` (`{issuer.businessRfc
&& <Text>...}`) — se replica textualmente en `ReportHeader.tsx` y en los headers de
`payments`/`inventory`, sin inventar un placeholder nuevo tipo "Sin dirección".

## Risks / Trade-offs

- **[Riesgo] `openspec/specs/reports-api/spec.md`, `cash-cut-api`, `sales-cut-api`,
  `reports-collections-api`, `reports-purchases-api`, `reports-sales-by-product-api`,
  `account-statements-api`, `payments-api`, `inventory-kardex-api` fijan hoy
  explícitamente "el header SHALL incluir el logo... " sin mencionar
  dirección/RFC — varios incluso con escenario "PDF incluye logo del negocio" que no
  cubre estos campos.** → **Mitigación**: cada uno de esos 9 spec deltas de este change
  extiende su requirement de header existente (MODIFIED, contenido completo copiado +
  la nueva oración) en vez de agregar un requirement nuevo aislado — evita que el
  spec quede con dos fuentes de verdad sobre el mismo header.
- **[Riesgo] Cambiar la firma de `ReportHeader` de `logoUrl` a `issuer` es un cambio
  de tipo, no aditivo — los 11 consumidores dejan de compilar hasta que se actualicen
  todos en el mismo PR.** → **Mitigación**: es exactamente el motivo por el que este
  change agrupa los 11 archivos + `ReportHeader.tsx` + `ReportsController.ts` como una
  sola unidad de trabajo (ver `tasks.md`) — no se puede mergear parcialmente sin romper
  el build, igual que ya ocurrió en `unify-reports-pdf` al introducir `logoUrl` en los
  11 call sites simultáneamente.
- **[Riesgo] Layout: agregar 2-3 líneas de texto al bloque de emisor podría desplazar
  contenido en reportes con encabezado ya denso (ej. `SalesCutReportPdf` con filtros +
  generatedBy en 2 líneas de `children`).** → **Mitigación**: el bloque de emisor
  (logo + nombre + address + RFC) se coloca a la izquierda del header (como en
  `QuotePdf.tsx`) y las meta-líneas custom (`children`: filtros, fecha) siguen a la
  derecha o debajo, sin compartir el mismo eje horizontal — verificar visualmente
  (tarea de `tasks.md`) que ningún reporte queda con texto solapado.

## Migration Plan

Sin datos que migrar (no hay cambio de esquema). Orden de implementación: (1)
`ReportHeader.tsx` + `pdfStyles.ts` de reports primero (define el layout de referencia),
(2) los 11 consumidores + `ReportsController.ts` en el mismo commit (no compila si se
separan), (3) `PaymentHistoryPdf.tsx`/`KardexReportPdf.tsx` + sus controllers en un
commit separado (módulos independientes, pueden ir después sin bloquear a reports).
Rollback: revertir el commit correspondiente — sin migración de datos, sin efecto en
`TicketSettings` ya persistido.

## Open Questions

(ninguna — alcance cerrado por el plan aprobado; la promoción de `ReportHeader` a
componente compartido cross-módulo queda anotada como oportunidad futura, no bloquea
este change)
