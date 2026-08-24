## Context

Este es el change final (4 de 4) de la secuencia "PDF unificado". Los 3 changes previos ya migraron `quotes`, `payments`/`inventory` y `billing`, estableciendo el patrón: `pdfBaseStyles`/`pdfTheme` compartidos, `<PdfLogo>`, `GetTicketSettingsUseCase` wireado en controller/DI, verificación con render real + `npx jest`/`npx tsc --noEmit`. Este change aplica el mismo patrón al módulo `reports`, el de mayor volumen: 10 documentos PDF en 8 archivos, todos consumiendo un único `reports/pdfStyles.ts` compartido, y 12 call sites de `renderToBuffer` en `ReportsController.ts`.

Investigación de diseño confirmó: los 8 archivos repiten un bloque de header/footer estructuralmente idéntico (solo el contenido de las meta-líneas de filtros difiere por reporte), `CashCutReportPdf.tsx` tiene un `StyleSheet.create` inline adicional (`cols`, solo anchos de columna sin lógica de negocio) y usa "Pág." en vez de "Página" en su footer (inconsistencia sin respaldo de spec — los specs de `reports-api` para stock/payment-history/department-price-list SÍ fijan explícitamente "Página X de Y").

## Goals / Non-Goals

**Goals:**
- Migrar `reports/pdfStyles.ts` a `pdfBaseStyles`/`pdfTheme`.
- Crear `<ReportHeader>`/`<ReportFooter>` compartidos, eliminando la duplicación de header/footer en los 8 archivos.
- Agregar logo chico a los 10 documentos.
- Plegar el `cols` inline de `CashCutReportPdf` en `pdfStyles.ts`.
- Normalizar el footer de `CashCutReportPdf` a "Página X de Y".
- Wireear `GetTicketSettingsUseCase` una sola vez en `ReportsController`, reusado en los 12 call sites.

**Non-Goals:**
- No se cambia ningún cálculo de totales, prorrateo de impuestos, agrupación por cliente/ticket/departamento, ni el límite de 10,000 filas.
- No se cambian filenames, `Content-Disposition`, ni query params de ningún endpoint.
- No se toca `AnticipoReceiptPdf.tsx` más allá de lo ya hecho en `add-pdf-design-system` (change 1) — no está en el alcance de "reportes internos" definido para este change (ya se trató como documento cara-a-cliente en change 1... nota: verificar en implementación si `AnticipoReceiptPdf` ya tiene logo del change 1; si no, es un gap a señalar, no a resolver aquí sin re-abrir ese change).
- No se cambia la lógica de exportación XLSX (`buildCashCutWorkbook`, `buildSalesCutWorkbook`, etc.) — solo PDF.

## Decisions

**1. `<ReportHeader>` acepta `title`, `logoUrl`, y `children` para las meta-líneas custom.** — Dado que cada uno de los 8 reportes tiene contenido de filtros/período distinto en su segunda y tercera línea de header (confirmado en research: unos muestran período primero luego generado, otros al revés; `AccountStatementLedgerPdf` muestra saldo inicial/actual en vez de filtros), forzar un prop API rígido (`filters: {...}`) no cubriría todos los casos sin lógica condicional interna compleja. La API `<ReportHeader title={...} logoUrl={...}>{...meta lines...}</ReportHeader>` deja que cada archivo siga controlando su contenido de meta-línea exacto (mismo texto, mismo orden que hoy), mientras centraliza el wrapper `<View style={s.header} fixed>`, el título, y el logo. **Alternativa descartada**: un componente con prop `filters: Record<string,string>` genérico — se descartó porque `AccountStatementLedgerPdf` no tiene "filtros" en el sentido de los otros 9 documentos (muestra saldos), forzando ese shape habría requerido un caso especial de todas formas.

**2. `<ReportFooter>` acepta `generatedByEmail: string`, sin prop de texto de página — siempre renderiza "Página X de Y".** — Elimina la variante "Pág." de `CashCutReportPdf` sin excepción, ya que no hay spec que la respalde y sí hay 3 specs que fijan "Página X de Y" como formato — normalizar es consistente con el objetivo de "estandarizar diseño" del feature. **Riesgo aceptado**: cambio de copy visible en un reporte que no tiene ese texto pinneado por spec; documentado explícitamente aquí para que sea revisable.

**3. El `cols` de `CashCutReportPdf` se pliega en `reports/pdfStyles.ts` con nombres prefijados (`cashCutCte`, `cashCutDocto`, etc.), no genéricos.** — Confirmado en el research que son anchos de columna específicos de esa tabla (12 columnas: Cte/Docto/Factura/Cliente/Fec-Fact/Días/Importe/Fp/Referencia/F.Cobro/IVA/Tasa), sin equivalente reusable en otros reportes — plegar significa moverlos al archivo compartido para que dejen de vivir en un `StyleSheet.create` separado dentro del componente, no fusionarlos con columnas de otros reportes (esas anchuras son específicas de este layout).

**4. `GetTicketSettingsUseCase` se obtiene UNA vez por request, no 12 veces.** — A diferencia de `payments`/`inventory` (1 call site cada uno) o `billing` (2 call sites con contextos distintos), `ReportsController` tiene 12 métodos, todos generando PDFs para el mismo tenant (no hay branch-scoping de logo — el logo es a nivel tenant, no a nivel sucursal, según `TicketSettings` que no tiene columna de sucursal). Cada método individual llama `await this.getTicketSettingsUseCase.execute()` dentro de su propia rama `format=pdf` (no se comparte estado entre requests HTTP distintos — cada método es independiente), pero dentro de un mismo método solo se llama una vez, igual que ya hacían `payments`/`inventory`/`billing`. La "reutilización" real es de patrón de código (mismo use case, mismo constructor), no de una sola llamada compartida entre los 12 métodos de un mismo request (un request HTTP solo invoca UNO de los 12 métodos, nunca los 12 a la vez).

**5. `AnticipoReceiptPdf.tsx` SÍ entra en el alcance de este change.** — `add-pdf-design-system` (change 1) solo migró su formateador de moneda (tarea mecánica de bajo riesgo), sin agregarle logo ni migrar sus colores — quedó pendiente. Verificado en código: hoy no tiene ningún uso de `PdfLogo`/`logoUrl`. Dado que el archivo vive físicamente en `reports/infrastructure/pdf/` (mismo módulo que este change) y el plan original lo clasificó como documento cara-a-cliente (recibo de anticipo, logo normal — no chico como los reportes internos), cerrar este gap aquí completa la cobertura de "logo en todos los PDFs" prometida por el feature sin abrir un change adicional. Se agrega como una historia/tarea explícita, con capability `account-statements-api` (requerimiento "Print anticipo receipt endpoint").

## Risks / Trade-offs

- **[Riesgo] `<ReportHeader>`/`<ReportFooter>` mal diseñados podrían perder alguna meta-línea de algún reporte durante la migración (10 documentos con contenido ligeramente distinto).** → Mitigación: migrar archivo por archivo, verificando con grep/diff que el texto de cada meta-línea sobrevive exactamente igual antes/después.
- **[Riesgo] Cambio de "Pág." a "Página" en `CashCutReportPdf` es un cambio de copy visible, aunque de bajo riesgo de negocio.** → Mitigación: documentado explícitamente aquí como decisión deliberada, respaldada por consistencia con 3 specs que sí fijan el formato correcto.
- **[Riesgo] 10,000-row perf en reportes grandes (`SalesCutReportPdf` con `salesList`, `AccountStatementLedgerPdf`) con logo agregado por página vía `fixed`.** → Mitigación: mismo patrón ya usado en changes anteriores — el logo se resuelve a `Buffer` una vez (via `resolvePdfLogoSource`/`PdfLogo` ya existente), reutilizado por el renderer en cada instancia `fixed`, sin refetch por página.
- **[Trade-off] Plegar `cols` en `pdfStyles.ts` aumenta el tamaño de ese archivo compartido con columnas de un solo reporte.** → Aceptado: es preferible a mantener un segundo `StyleSheet.create` inline en un componente, y los nombres prefijados (`cashCutCte`, etc.) evitan colisión de nombres con otras tablas.

## Migration Plan

1. Migrar `reports/pdfStyles.ts` a `pdfBaseStyles`/`pdfTheme`, plegar `cols` de `CashCutReportPdf` con nombres prefijados.
2. Crear `ReportHeader.tsx`/`ReportFooter.tsx`.
3. Migrar los 8 archivos uno por uno (orden sugerido: los 6 más simples primero — `PaymentHistoryReportPdf`, `ProviderPaymentsReportPdf`, `PurchasesReportPdf`, `SalesByProductReportPdf`, `CollectionsReportPdf`, `InventoryStockReportPdf` — luego `DepartmentPriceListReportPdf`, `AccountStatementPdf` [2 documentos], y `CashCutReportPdf`/`SalesCutReportPdf` al final por ser los de mayor complejidad interna).
4. `ReportsController.ts` + DI container: agregar `GetTicketSettingsUseCase`, wireear en los 12 call sites.
5. Verificación manual (render real de al menos 3 documentos representativos) + `npm test`/`npx tsc --noEmit` completos.

**Rollback**: revertir el commit — sin migración de datos, reversible sin efectos secundarios.

## Open Questions

Ninguna pendiente. El estado de `AnticipoReceiptPdf.tsx` (¿tiene logo de change 1?) se verifica en implementación, no bloquea el diseño de este change.
