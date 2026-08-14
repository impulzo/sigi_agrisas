## ADDED Requirements

### Requirement: Reports adopta el shell y la tabla estándar del design system

Las 9 rutas del módulo de reportes (`/reports`, `/reports/account-statements`, `/reports/account-statements/[customerId]`, `/reports/sales-cut`, `/reports/cash-cut`, `/reports/purchases`, `/reports/sales-by-product`, `/reports/customer-collections`, `/reports/inventory-by-department`) SHALL renderizar su contenido dentro de `PageShell`, según la capability `design-system`.

Ningún bloque de reportes SHALL declarar espaciado ni ancho propio. Quedan PROHIBIDOS a nivel de raíz de página: `px-4 py-6`, `mx-auto`, `space-y-4` y cualquier `max-w-*` (hoy conviven `max-w-5xl`, `max-w-6xl` y `max-w-7xl` dentro de la misma sección).

El enlace de retorno al hub SHALL expresarse con la prop `backHref="/reports"` de `PageShell`, no con un `<Link>` + `<Icon name="arrow_back">` compuesto a mano en cada página.

Los títulos de las páginas de reporte SHALL usar el mismo nivel que el resto de páginas de la aplicación, provisto por `PageShell` (`text-headline-lg`), y NO `text-headline-sm`.

Todas las tablas de reportes SHALL usar las primitivas `DataTable` (`Table`, `THead`, `TBody`, `Tr`, `Th`, `Td`). Quedan ELIMINADAS las constantes locales de clases de celda (`th`, `td`, `thRight`, `tdRight`) hoy duplicadas en `purchases/_blocks/PurchasesTable.tsx`, `purchases/_blocks/ProviderPaymentsTable.tsx`, `cash-cut/_blocks/CollectionsRowsTable.tsx` y `_blocks/PriceListTable.tsx`, así como el padding de celda divergente `px-3 py-3`.

Las tarjetas de totales/KPI SHALL usar la molécula `Card`. Los botones "Exportar PDF" y "Exportar Excel" SHALL usar el átomo `Button` (`variant="filled"` y `variant="outlined"` respectivamente, con `icon`), no `<button>` crudos con clases inline.

#### Scenario: Un reporte y un listado comparten margen

- **WHEN** se navega de `/sales` a `/reports/purchases`
- **THEN** el contenedor de página presenta el mismo `padding-left` y `padding-top` en ambas rutas

#### Scenario: Título de reporte al mismo nivel que el resto

- **WHEN** se renderiza cualquier ruta de `/reports/*`
- **THEN** su `h1` mide 32px, igual que el de `/sales` o `/inventory`

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
