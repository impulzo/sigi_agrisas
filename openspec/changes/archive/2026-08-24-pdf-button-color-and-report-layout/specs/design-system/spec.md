## ADDED Requirements

### Requirement: PdfDownloadButton como único componente para descarga/exportación de PDF

`app/_components/molecules/PdfDownloadButton/PdfDownloadButton.tsx` SHALL ser el único componente permitido para renderizar un botón de descarga o exportación de PDF en cualquier página bajo `app/(private)/`. SHALL exportar `ExportPdfButton` y `DownloadPdfButton`, ambos envolviendo al atom `Button` con `icon="picture_as_pdf"` fijo (no configurable por el caller) y exponiendo únicamente `onClick`, `loading?`, `disabled?` y `size?: "sm" | "md" | "lg"` — sin `label`/`children` (el texto es fijo).

Ninguna de las dos variantes SHALL usar el token `primary` (verde, reservado para el CTA principal de cada página) ni el token `error` (rojo, reservado para acciones destructivas):

| Componente | Uso | Variante de `Button` | Color |
|---|---|---|---|
| `ExportPdfButton` | Exclusivo de las 8 pantallas de `/reports/*` | `tertiary` | `bg-tertiary text-on-tertiary hover:bg-tertiary/90` |
| `DownloadPdfButton` | Cualquier otra pantalla que descargue un PDF (facturas, cartas porte, cotizaciones, historial de abonos, kardex) | `outlined` con `className` override | borde y texto `tertiary` (`border-tertiary text-tertiary hover:bg-tertiary/10`) |

Está PROHIBIDO instanciar `Button` directamente con `icon="picture_as_pdf"`, o declarar un `<button>`/`<Link>` crudo con estilos propios, para una acción de descarga/exportación de PDF en `app/(private)/**/_blocks/`.

#### Scenario: Botón de exportar PDF en pantallas de reporte usa tertiary

- **WHEN** se renderiza `ExportPdfButton` en cualquiera de las 8 pantallas de `/reports/*`
- **THEN** su `background-color` corresponde al token `tertiary` (`rgb(68, 89, 99)`), no al token `primary` (verde) ni `error` (rojo)

#### Scenario: Botón de descargar PDF fuera de reportes usa la misma familia de color

- **WHEN** se renderiza `DownloadPdfButton` en una pantalla que no pertenece a `/reports/*` (por ejemplo detalle de factura, carta porte, cotización, kardex o historial de abonos)
- **THEN** su borde y su texto usan el token `tertiary`, no la variante neutra `outlined` por defecto de `Button` ni ningún tono verde o rojo

#### Scenario: Descarga de PDF en la sección de facturas de una venta usa el componente compartido

- **WHEN** se renderiza la lista de facturas CFDI de una venta (`SaleInvoicesSection`)
- **THEN** la acción de descargar el PDF de una factura es una instancia de `DownloadPdfButton` (con icono `picture_as_pdf` y color `tertiary`), no un `<button>` de texto plano sin icono

#### Scenario: El botón de XML contiguo no se ve afectado

- **WHEN** se renderiza la lista de facturas CFDI de una venta (`SaleInvoicesSection`)
- **THEN** la acción de descargar el XML de una factura permanece como estaba (no es una acción de PDF y queda fuera de este requirement)

## MODIFIED Requirements

### Requirement: Button como única fuente de botones

`app/_components/atoms/Button/Button.tsx` SHALL ofrecer 6 variantes y 3 tamaños, y SHALL estar tokenizado (sin CSS Modules ni hex).

| Variante | Clases |
|---|---|
| `filled` (default) | `bg-primary text-on-primary hover:bg-primary/90` |
| `tonal` | `bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed-dim` |
| `outlined` | `border border-outline text-on-surface hover:bg-surface-container` |
| `text` | `text-primary hover:bg-primary-fixed/20` |
| `destructive` | `bg-error-container text-on-error-container hover:bg-error/10` |
| `tertiary` | `bg-tertiary text-on-tertiary hover:bg-tertiary/90` |

| Tamaño | Clases |
|---|---|
| `sm` | `px-3 py-1.5 text-label-md` |
| `md` (default) | `px-4 py-2 text-label-lg` |
| `lg` | `px-6 py-3 text-title-md` |

Base común: `inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`.

SHALL aceptar `loading?: boolean` (deshabilita, muestra `Spinner`, expone `aria-busy`) e `icon?: IconName` con `iconPosition?: "start" | "end"`.

SHALL aceptar `href?: string`. Cuando `href` está presente, `Button` SHALL renderizar `next/link` (en vez de `<button>`) con exactamente las mismas clases de variante, tamaño e ícono que su renderizado como botón — mismo `background-color`, `border-radius`, tipografía y posición del ícono. `Button` con `href` NO SHALL aceptar `loading` (no aplica a navegación).

Está PROHIBIDO declarar un `<button>` crudo con clases de estilo en `app/(private)/**/_blocks/`, salvo las entradas de la allowlist de deuda declarada del guardarraíl. Está PROHIBIDO declarar un `<Link>`/`<a>` con clases de estilo copiadas manualmente para reproducir el look de `Button`. Para botones de creación de recurso específicamente, SHALL usarse `CreateButton`; para botones de descarga/exportación de PDF, SHALL usarse `PdfDownloadButton` (ver requirement "PdfDownloadButton como único componente para descarga/exportación de PDF") en vez de instanciar `Button` directamente.

#### Scenario: CTA primario idéntico en todos los módulos

- **WHEN** se renderiza el CTA primario de cualquier página
- **THEN** su `background-color` es `rgb(13, 99, 27)` y su `border-radius` es `9999px`

#### Scenario: Estado de carga

- **WHEN** un `Button` recibe `loading`
- **THEN** queda deshabilitado, expone `aria-busy="true"` y muestra un `Spinner`

#### Scenario: Button como enlace de navegación

- **WHEN** `Button` recibe la prop `href` (por ejemplo `<Button href="/quotes/new" icon="add">Nueva cotización</Button>`, o indirectamente vía `<CreateButton href="/quotes/new" label="Nueva cotización" />`)
- **THEN** renderiza un `<a>` vía `next/link` apuntando a `href`, con las mismas clases de `variant`/`size` que tendría como `<button>`, y el ícono en la posición indicada por `iconPosition`

#### Scenario: Variante tertiary disponible para acciones documentales

- **WHEN** un `Button` recibe `variant="tertiary"` (directamente o vía `ExportPdfButton`)
- **THEN** su `background-color` es `rgb(68, 89, 99)` (token `tertiary`) y su texto usa el token `on-tertiary`, distinto del `filled` verde y del `destructive` rojo
