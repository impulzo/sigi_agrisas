## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Usuario administrativo del panel (operador/admin que exporta o descarga PDFs) | Como usuario administrativo del panel, quiero que todo botón de exportar/descargar PDF use el mismo color (`tertiary`, gris-azul técnico) y el mismo componente compartido con icono, para reconocer de un vistazo la acción "PDF" sin confundirla con el CTA principal (verde) ni con una acción destructiva (rojo) | - `ExportPdfButton` (8 pantallas `/reports/*`) deja de usar `variant="filled"` (verde `primary`) y pasa a `variant="tertiary"` (`bg-tertiary`/`text-on-tertiary`)<br>- `DownloadPdfButton` (facturas, cartas porte, cotizaciones, kardex, historial de abonos) mantiene forma `outlined` pero recolorea borde/texto a `tertiary`<br>- El botón "PDF" en `SaleInvoicesSection.tsx` (actualmente `<button>` de texto plano, sin icono, fuera del componente compartido) se reemplaza por `DownloadPdfButton` con `size="sm"`, quedando con icono `picture_as_pdf` y color `tertiary` igual que el resto<br>- El botón "XML" contiguo en `SaleInvoicesSection.tsx` no cambia (no es PDF, fuera de alcance)<br>- Ningún botón PDF queda en verde (`primary`) ni en rojo (`error`) tras el cambio | - No aplica gating de permisos nuevo — el cambio es puramente visual/estructural sobre botones ya protegidos por los `can(...)` existentes de cada pantalla<br>- El guardrail `tests/unit/ui/design-system/tokens.test.ts` (sin `bg-gray-*`, hex crudo, `<button>` crudo nuevo) debe seguir en verde tras el cambio |
| 2 | Usuario administrativo del panel (operador/admin que navega reportes) | Como usuario administrativo del panel, quiero que "Estado de cuenta" (`LedgerPage.tsx`) e "Historial de abonos" (`PaymentsHistoryPage.tsx`) usen el mismo `PageShell` que el resto de pantallas de `/reports/*`, para tener flecha de regreso, padding y ancho máximo consistentes en vez de un contenedor armado a mano | - `LedgerPage.tsx` renderiza dentro de `<PageShell title="Estado de cuenta" backHref="/reports/account-statements">` en vez de su `<div>` raíz manual con `Link`+`Icon` para el back-arrow<br>- `PaymentsHistoryPage.tsx` renderiza dentro de `<PageShell title="Historial de abonos" backHref="/payments">`, reemplazando su contenedor `max-w-7xl px-4 py-6 space-y-4` fuera de tokens<br>- Ambas pantallas quedan con el mismo `max-w-screen-2xl`, `px-gutter`, `py-lg` que `PurchasesReportPage.tsx` y el resto de `/reports/*`<br>- El resto del contenido de cada pantalla (filtros, tabla, paginación, toast de error) se preserva sin cambios funcionales, sólo re-anidado como `children` de `PageShell`<br>- Imports `Link`/`Icon` que quedan sin uso tras quitar el back-arrow manual se eliminan (`Link` se conserva en `PaymentsHistoryPage.tsx` porque se usa también en una celda de tabla) | - No aplica gating de permisos nuevo — `PageShell` no introduce lógica de autorización; los checks `can("reports:account_statements_read")` / `can("payments:report_read")` ya existentes se preservan intactos antes del render |

## Why

Los botones de PDF ya comparten componente (`PdfDownloadButton` → `ExportPdfButton`/`DownloadPdfButton`) e icono (`picture_as_pdf`), pero no comparten color: `ExportPdfButton` usa `variant="filled"` = verde `primary` (`#0d631b`) en las 8 pantallas de `/reports/*`, mientras `DownloadPdfButton` usa `outlined` neutro en el resto de la app. Además `SaleInvoicesSection.tsx` tiene un `<button>` de texto plano sin icono que rompe la regla ya documentada en `designer.md` ("todo botón de descarga de PDF usa uno de estos dos componentes — nunca un `<button>` crudo"). El verde se reserva para el CTA primario de cada pantalla; el rojo (`error`) para acciones destructivas — ninguno es apropiado para una acción neutra de exportación, de ahí homogenizar con `tertiary`, el tono "técnico/documental" ya definido en la paleta M3 del proyecto.

En paralelo, dos pantallas de reportes (`LedgerPage.tsx`, `PaymentsHistoryPage.tsx`) no pasan por `PageShell`: reconstruyen a mano el contenedor raíz y el link de "volver". Ambas sí tienen arrow-back hoy, pero una de ellas (`PaymentsHistoryPage.tsx`) usa padding/ancho fuera de la escala de tokens (`px-4 py-6 max-w-7xl` en vez de `px-gutter py-lg max-w-screen-2xl`), violando la prohibición explícita de `designer.md` sobre padding/ancho propio fuera de `PageShell`. Ninguna de las dos está documentada como excepción deliberada (a diferencia del dashboard, que sí lo está). Migrarlas a `PageShell` cierra el gap sin reinventar nada: el componente ya resuelve arrow-back + padding + margen + ancho máximo de forma consistente para las otras 6 pantallas de `/reports/*`.

## What Changes

- `Button` (`app/_components/atoms/Button/Button.tsx`): se agrega la variante `tertiary` (`bg-tertiary text-on-tertiary hover:bg-tertiary/90`) al set existente (`filled`/`tonal`/`outlined`/`text`/`destructive`).
- `PdfDownloadButton` (`app/_components/molecules/PdfDownloadButton/PdfDownloadButton.tsx`):
  - `ExportPdfButton` cambia de `variant="filled"` a `variant="tertiary"`.
  - `DownloadPdfButton` mantiene `variant="outlined"` pero recolorea borde/texto/hover a la familia `tertiary` vía `className` override.
  - Se agrega prop opcional `size?: "sm" | "md" | "lg"` (pass-through a `Button`) para permitir uso compacto en filas de tabla.
- `SaleInvoicesSection.tsx`: el `<button>` crudo "PDF" se reemplaza por `<DownloadPdfButton size="sm" .../>`. El botón "XML" no cambia.
- `LedgerPage.tsx`: se elimina el contenedor raíz manual y el back-link hecho a mano; el contenido se anida como `children` de `<PageShell title="Estado de cuenta" backHref="/reports/account-statements">`.
- `PaymentsHistoryPage.tsx`: mismo tratamiento, `<PageShell title="Historial de abonos" backHref="/payments">`; corrige de paso el padding/ancho fuera de tokens.
- `designer.md`: se actualiza la documentación de `PdfDownloadButton` (color `tertiary` en vez de "filled/verde") y se cierra el pendiente que marcaba `ExportPdfButton`/`ExportXlsxButton` como "no auditados".

No hay cambios de **BREAKING**: son ajustes visuales/estructurales sobre componentes y pantallas ya existentes, sin cambio de props obligatorias ni de contrato de datos.

## Capabilities

### New Capabilities

(ninguna — no se introduce una capability de negocio nueva; el cambio es transversal a componentes de UI ya cubiertos por `design-system`)

### Modified Capabilities

- `design-system`: se agrega una regla de color explícita para `PdfDownloadButton` (familia `tertiary`, ni `primary` ni `error`) y se refuerza la regla ya existente de "todo botón de descarga PDF usa el componente compartido" cerrando la excepción de `SaleInvoicesSection.tsx`. También se formaliza que las pantallas de `/reports/*` usan `PageShell` sin excepciones no documentadas (cierra el gap de `LedgerPage.tsx`/`PaymentsHistoryPage.tsx`).

## Impact

- **Código afectado**: `app/_components/atoms/Button/Button.tsx`, `app/_components/molecules/PdfDownloadButton/PdfDownloadButton.tsx`, `app/(private)/billing/_blocks/SaleInvoicesSection.tsx`, `app/(private)/reports/_blocks/LedgerPage.tsx`, `app/(private)/payments/_blocks/PaymentsHistoryPage.tsx`, `designer.md`.
- **Blast radius del componente `Button`**: variante nueva es aditiva (no toca las 5 existentes) — cero riesgo de romper otros consumidores de `Button`.
- **Blast radius de `PdfDownloadButton`**: consumido por 8 pantallas `/reports/*` + `WaybillActionsBar`, `PaymentsHistoryToolbar`, `QuoteActionsBar`, `InvoiceActionsBar`, `InvoicePreviewModal`, `ExportButtons` (kardex) — todos heredan el nuevo color automáticamente, sin cambios de código en esos archivos.
- **Sin cambios de API/backend, sin migraciones, sin cambios de permisos.**
- **Tests**: `tests/unit/ui/design-system/tokens.test.ts` debe seguir pasando (no se agregan `<button>`/`<table>`/`<select>` crudos nuevos; se elimina uno existente en `SaleInvoicesSection.tsx`, aunque el archivo permanece en el allowlist por el botón "XML" que no se toca).
