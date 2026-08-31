## Context

Ver `proposal.md` - `## Why` para la motivación. Resumen técnico: las 4 superficies de render de facturación son 2 componentes/páginas físicos, no 4 independientes — `InvoiceDocumentPdf.tsx` (`src/modules/billing/infrastructure/pdf/`) es el MISMO componente para prefactura PDF (`BillingController.previewPdf`) y factura PDF final (`FakeFacturamaGateway.download`); la web tiene 2 lugares distintos (`InvoicePreviewModal.tsx` para prefactura, `InvoiceItemsTable.tsx`/`InvoiceMetaPanel.tsx` para factura ya timbrada). Ya existen 3 catálogos SAT resueltos con el mismo contrato `{code, description}` vía `search(query, limit)`: `SatTaxRegimeRepository`, `SatCfdiUseRepository`, y el que falta aprovechar, `SatCodeRepository` (clave producto/servicio, `SatProductServiceCode`), ya con endpoint montado `GET /api/v1/admin/sat-codes`. El helper `resolveSatDescription` (server: `src/modules/billing/infrastructure/services/`; client: `app/(private)/billing/_logic/services/`) ya generaliza la resolución "código exacto → `<code> - <description>`, fallback al código crudo" — se reutiliza sin cambios de firma.

## Goals / Non-Goals

**Goals:**
- Historias 1 y 2 (paridad prefactura y paridad factura): un único cambio en `InvoiceDocumentPdf.tsx` resuelve ambas mitades del PDF (prefactura y factura final comparten componente); el modal se actualiza aparte para alcanzar paridad con su propio PDF.
- Historia 3: `businessZipCode` en `TicketSettings`, siguiendo el patrón exacto de `businessPhone` en las 9 capas ya mapeadas en la exploración previa.
- Historia 4: cerrar el 3er nivel de `zipCode` en `resolveIssuerFiscalData.ts` — sin tocar la cascada de los otros 4 campos.
- Historia 5: verificación en vivo obligatoria (servidor dev + datos reales), no sólo `npm test` — criterio de "hecho" explícito, dado el precedente de esta misma sesión.

**Non-Goals:**
- No se toca el ticket térmico impreso (`PrintableTicket.tsx`, capability `ticket-print-ui`) — el CP nuevo es para la cascada de facturación, no para el ticket físico.
- No se elimina el nivel `EmitterFiscalSettings` de la cascada — ya confirmado con el usuario que `/billing/csd` es una sola pantalla que lo captura junto al CSD.
- No se agrega un catálogo SAT nuevo — `SatCodeRepository`/`SatProductServiceCode` ya existen y están poblados (usados hoy por el picker de productos en catálogo).
- No se persiste `branchName` en `Invoice` — se resuelve en lectura (mismo criterio que las descripciones SAT: dato mostrable, no un snapshot fiscal inmutable), evitando una migración adicional.

## Decisions

**`SearchSatCodesUseCase` se instancia localmente en `billing/infrastructure/di/container.ts`, no se importa desde `sat-codes/di/container.ts`.**
Mismo patrón ya usado para `searchSatTaxRegimesUseCase`/`searchSatCfdiUsesUseCase` en ese mismo archivo — evita import circular entre módulos (documentado ya en el proyecto para `PrismaSaleRepository`/`PrismaQuoteRepository` en otros módulos). Responde a la Historia 2 (resolución server-side reutilizable).

**Resolución de `satProductCodeLabel` por línea: batch sobre códigos únicos, no una llamada por línea.**
Una factura puede repetir el mismo `satProductCode` en varias líneas (mismo producto). `Promise.all` sobre el `Set` de códigos únicos evita llamadas redundantes al repositorio — mismo criterio de eficiencia que ya aplica el resto de `resolveSatDescription` (llamada única por campo, no por ocurrencia). Aplica en los 3 puntos server-side: `FakeFacturamaGateway.download`, `BillingController.previewPdf`, `BillingController.getById`.

**`branchName` se resuelve en lectura, no se snapshotea.**
Alternativa considerada: agregar `issuerBranchName` como columna nueva en `Invoice`, snapshoteada al timbrar (mismo patrón que `issuerRfc`/etc.). Rechazada — el nombre de una sucursal no es un dato fiscal que deba congelarse para "exactitud histórica" (a diferencia del RFC/régimen fiscal del emisor, que si cambian después de timbrar, la factura ya emitida debe conservar el valor de ese momento por ley). Es dato puramente informativo/visual, igual que las descripciones de catálogo SAT (`fiscalRegimeLabel`, etc.), que ya se resuelven en lectura sin persistirse. Evita una migración Prisma adicional y mantiene la respuesta actualizada si la sucursal se renombra.

**`DownloadInvoiceFileUseCase` gana `BillingLookupService` como 3ª dependencia del constructor.**
El puerto ya existe y ya lo usa `StampInvoiceUseCase` — no se crea un puerto nuevo. Alternativa considerada: resolver `branchName` en `BillingController.download()` (que ya tiene `lookupService` inyectado) y pasarlo como parámetro extra a `downloadUseCase.execute()`. Rechazada — el use case ya es responsable de construir el snapshot completo (`toSnapshot()`) que pasa al gateway; partir esa responsabilidad entre controller y use case dispersa la lógica de armado del snapshot en dos lugares. Mantener toda la construcción del snapshot dentro de `DownloadInvoiceFileUseCase` es consistente con cómo ya se diseñó `toSnapshot()` en el fix de esta madrugada.

**`businessZipCode`: mismo patrón que `businessPhone`, sin campo nuevo en `EmitterFiscalSettings`.**
`EmitterFiscalSettings.zipCode` ya existe (nivel 2 de la cascada) — el campo nuevo sólo se agrega en `TicketSettings` (nivel 3), replicando exactamente las 9 capas ya mapeadas para `businessPhone`: Prisma, dominio, puerto, use case, 2 repositorios, controller (zod), tipos de frontend, formulario.

**Modal de prefactura resuelve `satProductCode` client-side con una función nueva en el mismo archivo `resolveSatDescription.ts` (client), no con un hook aparte.**
Sigue el patrón exacto de `resolveFiscalRegimeDescription`/`resolveCfdiUseDescription` (mismo archivo, misma firma `resolve(path, code, fetchImpl)`), apuntando a la ruta base `/api/v1/admin/sat-codes` (sin subpath, a diferencia de `regimen-fiscal`/`uso-cfdi`) — requiere que la función interna `search(path, ...)` construya la URL condicionalmente cuando `path=""` para no dejar un slash duplicado.

## Risks / Trade-offs

- **[Riesgo] Ampliar la tabla de conceptos del PDF (clave SAT + IEPS + subtotal por línea) puede desbordar el ancho de página en facturas con descripciones largas.** Mitigación: revisar visualmente con Playwright contra una factura con descripciones largas antes de dar la historia 2 por cumplida (parte de la verificación en vivo de la historia 5); si hace falta, truncar la descripción SAT igual que ya se trunca en otros lugares del PDF, no reducir columnas.
- **[Riesgo] `businessZipCode` nuevo puede quedar `null` en instalaciones existentes (como la de este entorno) hasta que un admin lo capture.** Mitigación: es el comportamiento esperado y ya cubierto por el criterio "nunca inventar datos" — no requiere backfill ni seed automático más allá de que el admin lo llene manualmente o se agregue al seed `ticketSettings.ts` si el usuario lo pide después (fuera de alcance aquí).
- **[Riesgo] `BillingLookupService.findBranch` podría fallar o devolver `null` si la sucursal fue eliminada.** Mitigación: ya cubierto explícitamente en la spec (`billing-api`, "Get invoice detail", escenario "Branch deleted after invoicing") — `issuerBranchName` queda `null`, no rompe la respuesta.

## Migration Plan

Una migración Prisma nueva y aditiva (`business_zip_code VARCHAR(5) NULL` en `ticket_settings`) — sin backfill, sin romper filas existentes. El resto del cambio es lógica de resolución/render, sin migración de datos. Rollback trivial (revertir el commit; la columna nueva nullable no rompe código anterior si se necesitara revertir parcialmente).
