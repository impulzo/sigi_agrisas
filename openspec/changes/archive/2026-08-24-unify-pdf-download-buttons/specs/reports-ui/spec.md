## MODIFIED Requirements

### Requirement: Reports adopta el shell y la tabla estándar del design system

Las 8 rutas del módulo de reportes (`/reports`, `/reports/account-statements`, `/reports/account-statements/[customerId]`, `/reports/sales-cut`, `/reports/collections`, `/reports/purchases`, `/reports/sales-by-product`, `/reports/inventory-by-department`) SHALL renderizar su contenido dentro de `PageShell`, según la capability `design-system`.

Ningún bloque de reportes SHALL declarar espaciado ni ancho propio. Quedan PROHIBIDOS a nivel de raíz de página: `px-4 py-6`, `mx-auto`, `space-y-4` y cualquier `max-w-*` (hoy conviven `max-w-5xl`, `max-w-6xl` y `max-w-7xl` dentro de la misma sección).

El enlace de retorno al hub SHALL expresarse con la prop `backHref="/reports"` de `PageShell`, no con un `<Link>` + `<Icon name="arrow_back">` compuesto a mano en cada página.

Los títulos de las páginas de reporte SHALL usar el mismo nivel que el resto de páginas de la aplicación, provisto por `PageShell` (`text-headline-lg`), y NO `text-headline-sm`.

Todas las tablas de reportes SHALL usar las primitivas `DataTable` (`Table`, `THead`, `TBody`, `Tr`, `Th`, `Td`). Quedan ELIMINADAS las constantes locales de clases de celda (`th`, `td`, `thRight`, `tdRight`) hoy duplicadas en `purchases/_blocks/PurchasesTable.tsx`, `purchases/_blocks/ProviderPaymentsTable.tsx`, `collections/_blocks/global/CollectionsRowsTable.tsx` y `_blocks/PriceListTable.tsx`, así como el padding de celda divergente `px-3 py-3`.

Las tarjetas de totales/KPI SHALL usar la molécula `Card`. Los botones "Exportar Excel" SHALL usar el átomo `Button` (`variant="outlined"`, con `icon="summarize"`), no `<button>` crudos con clases inline. El botón de exportación a PDF de las 8 pantallas SHALL usar el molecule compartido `ExportPdfButton` (`app/_components/molecules/PdfDownloadButton.tsx`), con leyenda fija "Exportar a PDF" e icono `picture_as_pdf` — ninguna pantalla de reportes SHALL implementar su propio botón de exportación a PDF con `Button` inline ni con `<button>` crudo.

#### Scenario: Un reporte y un listado comparten margen

- **WHEN** se navega de `/sales` a `/reports/purchases`
- **THEN** el contenedor de página presenta el mismo `padding-left` y `padding-top` en ambas rutas

#### Scenario: Título de reporte al mismo nivel que el resto

- **WHEN** se renderiza cualquier ruta de `/reports/*`
- **THEN** el título usa `text-headline-lg` provisto por `PageShell`

#### Scenario: Tabla de reporte con el dialecto estándar

- **WHEN** se renderiza la tabla de cualquier reporte
- **THEN** sus `th` miden 11px en mayúsculas sobre `bg-surface-container` y sus `td` usan `px-4 py-3` y miden 13px, idénticos a los de `/sales`

#### Scenario: Columnas numéricas alineadas

- **WHEN** una tabla de reporte muestra importes o cantidades
- **THEN** esas celdas usan `align="right"` de `DataTable`, con `text-right` y `tabular-nums`

#### Scenario: Retorno al hub uniforme

- **WHEN** se renderiza una ruta de detalle de reporte
- **THEN** el control de retorno lo provee `PageShell` mediante `backHref`, con el mismo icono, posición y área de click en las 8 rutas

#### Scenario: Sin ancho divergente dentro de la sección

- **WHEN** se navega entre `/reports`, `/reports/account-statements/[customerId]` y `/reports/purchases`
- **THEN** las tres comparten el mismo ancho máximo de contenido, provisto por `PageShell`

#### Scenario: Botón de exportar PDF uniforme en las 8 pantallas

- **WHEN** se renderiza el botón de exportación a PDF en cualquiera de las 8 pantallas de `/reports/*`
- **THEN** muestra el icono `picture_as_pdf` y el texto exacto "Exportar a PDF", provisto por el molecule compartido `ExportPdfButton`

#### Scenario: Exportación PDF en curso deshabilita el botón

- **WHEN** una exportación a PDF está en curso en cualquier pantalla de reportes
- **THEN** el botón "Exportar a PDF" se muestra deshabilitado con indicador de carga hasta que la descarga termina (éxito o error)
