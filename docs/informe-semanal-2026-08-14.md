# Informe semanal de avance — Agrisas Panel

**Semana:** 2026-08-09 → 2026-08-14
**Rama:** `feature/fixes`
**Autor:** Kevin Hernández

## Resumen ejecutivo

Semana concentrada en tres frentes: (1) **cierre del ciclo fiscal del ticket de venta** — datos del emisor (razón social, RFC), reordenamiento por secciones, retiro de campos redundantes y fix de descarga/preview de facturas CFDI; (2) **expansión del módulo de reportes** — compras, ventas por producto, inventario por departamento, detalle de tickets en corte de ventas y unificación de los dos reportes de cobranza en una sola pantalla con tabs; (3) **catálogos SAT y trazabilidad de inventario** — clave de unidad de medida oficial en productos, fix crítico de matching de conceptos al importar XML CFDI (colapsaba líneas de compras distintas en una sola), y captura de lote/caducidad con semáforo de vencimiento. Además se cerró una auditoría de estandarización del design system (tipografía, radios, shell de página) que tocó ~330 archivos, y arrancó (aún no archivado) un refactor de deuda técnica para centralizar lógica duplicada (`roundHalfToEven`, paginación, regex, `useBranchesOptions`).

## Commits de la semana

| Hash | Fecha | Mensaje |
|---|---|---|
| `2597072` | 2026-08-09 | feat: enriquecer ticket de venta con cliente, negocio, condiciones y leyenda |
| `926dcdf` | 2026-08-11 | feat: agregar reportes de compras, ventas por producto y cobranza por cliente |
| `943fb63` | 2026-08-12 | feat: estandarizar design system, reporte de inventario y recargo por cantidad fraccionaria |
| `08cf8bc` | 2026-08-12 | refactor: rediseñar reporte de ventas por producto a tabla de detalle paginada |
| `acdd09c` | 2026-08-13 | feat: agregar catálogo SAT de unidad de medida a productos y reportes |
| `5a93bbe` | 2026-08-13 | feat: agregar datos fiscales del emisor al ticket y vista previa de facturación |
| `a29a43a` | 2026-08-14 | feat: agregar trazabilidad de lote y caducidad en compras e inventario |
| `c888b1e` | 2026-08-14 | refactor: unificar reportes de cobranza (cash-cut + customer-collections) en módulo collections |
| `e899e72` | 2026-08-14 | fix: matching de conceptos SAT por nombre en vez de ClaveProdServ |
| `487eae2` | 2026-08-14 | refactor: centralizar lógica duplicada y limpiar deuda de repo/diseño |

## Ticket de venta y facturación

- **Padding uniforme del panel** (`sales-screens-padding`, 08-09): gutter de 10px en `<main>` global del layout privado; se elimina el warning de consola de `next/image` en los logos de marca. Motivo: revisión con cliente detectó contenido pegado a los bordes en todas las pantallas.
- **Rework de impresión del ticket** (`sales-ticket-print-rework`, 08-09): un único punto de entrada "Ver Ticket" (se elimina el botón redundante "Imprimir ticket" del detalle); CSS de impresión aísla el ticket térmico (58/80mm) del resto de la UI. Motivo: dos acciones disparaban la misma impresión y `window.print()` imprimía navigation rail y botones.
- **Contenido y secciones del ticket** (`ticket-contenido-ticket`, 08-10): se agregan sección Cliente (RFC/nombre/dirección) y sección Negocio (dirección/teléfono/régimen fiscal), reetiquetado "Orden"→"Folio", "Cajero"→"Vendedor", "Total"→"Total a pagar", campo de condiciones de crédito y leyenda de revisión de mercancía.
- **Datos fiscales del emisor** (`add-ticket-issuer-fiscal-data`, 08-13): razón social (default "Agrisas") y RFC del emisor configurables en Ajustes y renderizados en el ticket, antes de la dirección.
- **Retiro de "texto de encabezado"** (`remove-ticket-header-text`, 08-13, **breaking**): campo redundante ahora que razón social + RFC cumplen esa función; `DROP COLUMN header_text` en `ticket_settings`.
- **Fix de descarga de factura + preview pre-timbrado** (`fix-invoice-pdf-and-add-preview`, 08-13): descargar PDF/XML de una factura no timbrada devolvía 200 con archivo vacío (0 bytes); ahora lanza `InvoiceNotStampedError` (400) o `InvoiceFileDownloadFailedError` (502). Se agrega `InvoicePreviewModal` (logo, folio "PENDIENTE DE TIMBRAR", badge "BORRADOR") antes de disparar el timbrado real, tanto en venta completa como parcial.

## Reportes

- **Inventario por departamento** (`reporte-inventario-departamento`, 08-10): nuevo endpoint + pantalla que lista precios por producto agrupados por departamento (catálogo comercial, distinto del stock por sucursal existente).
- **Abonos: desglose agrupado + badge correcto** (`abonos-desglose-agrupado-badge`, 08-11): `/payments` y `/payments/history` ganan monto total/saldo pendiente por venta, vista agrupada por ticket (plana ↔ agrupada, export siempre agrupado), y el badge "Completado" ya no aparece en cada abono parcial sino solo cuando la venta queda liquidada. Incluye fix de `$NaN` en el pie de totales del historial.
- **Compras, ventas por producto y cobranza por cliente** (`expand-reports-purchases-collections-sales-by-product`, 08-11): tres reportes nuevos (`/reports/purchases`, `/reports/sales-by-product`, `/reports/customer-collections`) más extensión de Corte de Ventas con detalle ticket-por-ticket y export a Excel en Estados de Cuenta.
- **Rediseño del reporte de ventas por producto** (08-12, `08cf8bc`): de vista agregada a tabla de detalle paginada.
- **Unificación de cobranza** (`merge-collections-reports`, 08-14, **breaking**): `/reports/cash-cut` y `/reports/customer-collections` se fusionan en `/reports/collections` con tabs Global/Por Cliente, gateadas por permiso independiente cada una; rutas viejas eliminadas sin redirect.

## Catálogo SAT, compras e inventario

- **Catálogo SAT de unidad de medida** (`add-sat-unit-of-measure`, 08-13, **breaking**): `Product.unit` deja de ser texto libre — combobox de búsqueda contra las 2418 claves oficiales `c_ClaveUnidad` (CFDI 4.0); productos existentes conservan su valor sin backfill.
- **Fix de matching SAT en importación de XML** (`fix-sat-invoice-product-matching`, 08-14): el uploader de XML CFDI agrupaba conceptos por `ClaveProdServ` — como el 100% del catálogo comparte el mismo código genérico, facturas con ≥2 productos distintos colapsaban en una sola línea (probado con caso real: total generado $263,124.23 vs. subtotal real $202,862.01). Ahora cada concepto se resuelve por nombre, con `ClaveUnidad` como desempate.
- **Trazabilidad de lote y caducidad** (`add-inventory-lot-expiry`, 08-14): captura opcional de lote+caducidad por línea de compra (par completo o ninguno); nueva tabla `inventory_lots`; semáforo verde/amarillo/rojo en inventario según vencimiento más próximo (umbrales >30 / 8-30 / ≤7 días).

## Reglas de negocio — ventas y cotizaciones

- **Recargo por cantidad fraccionaria** (`fractional-quantity-surcharge`, 08-12): el `dosificationSurchargePct` configurado en Pricing Settings, antes limitado a productos con Dosificación precatalogada, ahora aplica también a cualquier producto vendido con precio normal y cantidad no entera (0.5, 2.25...) — en creación de venta, edición de venta completada y cotizaciones, sin doble cobro en líneas ya dosificadas.

## Plataforma y calidad

- **Estandarización del design system** (`standardize-design-system`, 08-12): auditoría encontró ~582 clases tipográficas inexistentes (emitían 0 CSS, cayendo a 16px heredado en 152 archivos), escala de radios corrida respecto a Stitch, ausencia de shell de página unificado y cuatro recetas distintas de CTA primario. Se corrige contra `designer.md`/`tailwind.config.ts` y se agrega guardarraíl automatizado (`tests/unit/ui/design-system/tokens.test.ts`).
- **Fix de guard de redirect en login/registro** (`fix-login-redirect-guard-target`, 08-11): usuario ya autenticado que visita `/auth/login` o `/auth/register` redirigía a `/dashboard` en vez de `/pos`, inconsistente con el resto del flujo post-login.
- **Cleanup de lógica duplicada** (`cleanup-shared-logic-and-design`, 08-14, **en curso, no archivado**): ver sección Pendiente.

## Breaking changes de la semana

- `Product.unit` ya no acepta texto libre — debe ser una clave SAT válida (`^[A-Za-z0-9]{2,3}$`).
- `TicketSettings.headerText` eliminado (`DROP COLUMN header_text`, irreversible sin restore).
- `/reports/cash-cut` y `/reports/customer-collections` eliminadas sin redirect — reemplazadas por `/reports/collections`.
- Descarga de factura no timbrada: antes 200 con archivo vacío, ahora 400 `{"error":"Invoice has not been stamped"}`.

## Cifras de la semana

- **10 commits**, todos en `feature/fixes`.
- **730 archivos** tocados en total, **+25,742 / -2,798** líneas (acumulado desde el 09-ago).
- Mayor volumen concentrado en dos commits: `943fb63` (estandarización de design system, 328 archivos) y `926dcdf` (expansión de reportes, 229 archivos, +9,478/-472).

## Pendiente / en curso

**`cleanup-shared-logic-and-design`** — change activo (`openspec/changes/cleanup-shared-logic-and-design/`), aún no archivado. Alcance: eliminar archivos basura commiteados (`.scratch-check.ts`, YAMLs sueltos, componente `StatCard` sin uso), centralizar `roundHalfToEven` (duplicado en 6 calculadores de totales), migrar 13 controllers a `parseListQuery`, extraer regex compartidos de `code`/`rfc`/`taxRegime` (8 controllers), centralizar `money()` (6 use-cases de reportes) y `formatDate`/`formatDateTime` (13+ archivos de PDF), reemplazar `<span class="material-symbols-outlined">` crudo por el átomo `Icon`, y unificar los 2 hooks divergentes `useBranchesOptions` (TTL y filtrado distintos, 20 pantallas dependientes). Riesgo declarado: medio, por volumen de archivos tocados en la migración de `parseListQuery` y `useBranchesOptions`. Sin cambio de comportamiento observable — refactor puro.
