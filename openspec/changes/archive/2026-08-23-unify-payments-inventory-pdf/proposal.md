## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Desarrollador | Como desarrollador, quiero fusionar `payments/pdfStyles.ts` e `inventory/pdfStyles.ts` (casi idénticos) en `src/shared/infrastructure/pdf/simpleListPdfStyles.ts` componiendo `pdfBaseStyles`/`pdfTheme` | Eliminar duplicación real ya confirmada entre ambos archivos y aplicar la paleta de marca en vez del azul arbitrario `#1565C0` | - Diff literal previo confirma que las claves compartidas (`page`, `title`, `subtitle`, `table`, `tableHeader`, `tableRow`, `tableRowEven`, `headerCol`, `footer`, `emptyMsg`) no tienen diferencia de comportamiento entre ambos módulos, solo anchos de columna que quedan locales a cada `pdfStyles.ts`<br>- `PaymentHistoryPdf` y `KardexReportPdf` compilan y renderizan igual que antes salvo el color de header (ya no `#1565C0`)<br>- Ningún ancho/nombre de columna (`colDate`, `colFecha`, etc., que sí difieren entre módulos) se pierde en la fusión | - Cambio es solo de estilos compartidos; no debe alterar los DTOs ni la lógica de agrupación por venta (`groupBySale`) ni el cálculo de saldos del kardex |
| 2 | Cobrador/administrador (recibe el PDF de historial de abonos) | Como usuario que descarga el historial de abonos en PDF, quiero ver el logo del negocio (chico, en el encabezado) para reconocer que el documento es oficial de la empresa | Consistencia de marca también en reportes internos, sin restar protagonismo al contenido del reporte | - `PaymentHistoryPdf` muestra el logo (tamaño reducido) junto al título "Historial de Abonos"<br>- Si `TicketSettings.logoUrl` es `null`, usa el fallback `public/logo.png` (mismo mecanismo ya construido en el change 1)<br>- El logo no compite visualmente con los filtros aplicados ni con la tabla agrupada por ticket | - `GetTicketSettingsUseCase` se agrega a `PaymentsController` respetando el mismo orden de checks (RBAC `payments:report_read` antes de cualquier lógica de PDF); no se agrega ningún endpoint nuevo |
| 3 | Encargado de inventario (recibe el kardex en PDF) | Como usuario que exporta el kardex de un producto en PDF, quiero ver el logo del negocio (chico, en el encabezado) para tener el mismo estándar visual que el resto de reportes | Consistencia de marca en todos los reportes internos del sistema | - `KardexReportPdf` muestra el logo (tamaño reducido) junto al título "Kardex — código · nombre"<br>- Fallback a `public/logo.png` cuando no hay logo configurado<br>- El logo no afecta el layout de las 4 tarjetas de resumen (existencia total/almacén/saldo anterior/saldo final) | - `GetTicketSettingsUseCase` se agrega a `InventoryMovementsController` después de `enforceBranchScope`/`resolveScopedBranchId` ya existentes; el logo no depende de ni expone información de otra sucursal |
| 4 | Desarrollador | Como desarrollador, quiero que ambos PDFs usen los colores de marca (`pdfTheme`) en vez de `#1565C0`/`#ccc`/`#666`/`#888` | Cerrar la brecha de color detectada en el research inicial y mantener consistencia con el módulo `quotes` ya migrado | - `tableHeader` usa un color de la paleta de marca en ambos PDFs<br>- Bordes/grises mutados (`#ccc`, `#666`, `#888`) reemplazados por `outline`/`outlineVariant`/`onSurfaceVariant` | - Cambio puramente visual, no toca cálculos de totales ni de saldo |

Nota: se separan las historias 2 y 3 (logo en payments vs. inventory) aunque comparten mecanismo, porque cada una toca un controller/DI container distinto con su propio guard RBAC.

## Why

`payments/infrastructure/pdf/pdfStyles.ts` e `inventory/infrastructure/pdf/pdfStyles.ts` son casi idénticos byte a byte (confirmado en el research inicial): mismo `page`, `title`, `subtitle`, `table`, `tableHeader` (con el mismo azul arbitrario `#1565C0` copiado entre ambos), `tableRow`, `tableRowEven`, `headerCol`, `footer`, `emptyMsg` — solo difieren los anchos de columna. Ninguno de los dos PDFs (historial de abonos, kardex de inventario) renderiza logo. Este es el segundo de 4 changes secuenciales del feature de unificación de PDFs: reutiliza la infraestructura compartida creada en `add-pdf-design-system` (ya aprobada e implementada) para fusionar ambos módulos y agregarles logo, tratándolos como reportes internos (logo secundario/chico, sin competir con el contenido del reporte).

## What Changes

- Se crea `src/shared/infrastructure/pdf/simpleListPdfStyles.ts` componiendo `pdfBaseStyles` + `pdfTheme`, con las claves compartidas confirmadas idénticas entre `payments` e `inventory`.
- `payments/infrastructure/pdf/pdfStyles.ts` e `inventory/infrastructure/pdf/pdfStyles.ts` se reconstruyen para importar `simpleListPdfStyles` y solo definir sus anchos de columna propios (`colDate`/`colRecibo`/etc. en payments; `colFecha`/`colMovimiento`/etc. en inventory) y sus extras específicos (`filtersSection`/`chip`/`ticketHeader` en payments; `headerSection`/`headerCard*` en inventory).
- `PaymentHistoryPdf.tsx` y `KardexReportPdf.tsx` renderizan `<PdfLogo size={pequeño}>` junto a su título.
- `PaymentsController.ts` e `InventoryMovementsController.ts` obtienen `logoUrl` vía una nueva instancia de `GetTicketSettingsUseCase` (wireada en sus respectivos DI containers), pasada al PDF como prop adicional.
- El color `#1565C0` (azul arbitrario, copiado entre ambos módulos) se reemplaza por un color de la paleta de marca (`pdfTheme`).

## Capabilities

### New Capabilities
(ninguna — este change extiende `pdf-design-system` ya creada por `add-pdf-design-system`, no agrega una capability nueva)

### Modified Capabilities
- `payments-api`: el endpoint `GET /api/v1/admin/payments/history?format=pdf` ahora incluye el logo del negocio y usa la paleta de colores de marca.
- `inventory-kardex-api`: el endpoint `GET /api/v1/admin/inventory/kardex?format=pdf` ahora incluye el logo del negocio y usa la paleta de colores de marca.

## Impact

- **Archivos nuevos**: `src/shared/infrastructure/pdf/simpleListPdfStyles.ts`.
- **Archivos modificados**: `src/modules/payments/infrastructure/pdf/{pdfStyles.ts, PaymentHistoryPdf.tsx}`, `src/modules/payments/infrastructure/http/PaymentsController.ts`, `src/modules/payments/infrastructure/di/container.ts`, `src/modules/inventory/infrastructure/pdf/{pdfStyles.ts, KardexReportPdf.tsx}`, `src/modules/inventory/infrastructure/http/InventoryMovementsController.ts`, `src/modules/inventory/infrastructure/di/container.ts` (o su equivalente).
- **Sin cambios de esquema de base de datos ni de contrato HTTP** (mismo filename, mismo `Content-Disposition`, mismos query params) — solo cambia el contenido visual del PDF.
