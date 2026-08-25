## ADDED Requirements

### Requirement: PdfDownloadButton como único componente para descarga/exportación de PDF

`app/_components/molecules/PdfDownloadButton.tsx` SHALL ser el único módulo permitido para renderizar un botón de descarga o exportación de un documento PDF en cualquier página bajo `app/(private)/`. SHALL exportar dos componentes, ambos envolviendo el atom `Button` con `icon="picture_as_pdf"` fijo (no configurable por el caller):

- `ExportPdfButton` — `variant="filled"`, leyenda fija "Exportar a PDF" (no aceptable un prop `label` que la sobrescriba), para usarse exclusivamente en las 8 pantallas de `/reports/*`.
- `DownloadPdfButton` — `variant="outlined"` u otra variante consistente con el resto de acciones secundarias del módulo consumidor, leyenda fija "Descargar PDF", para cualquier pantalla fuera de `/reports/*` que ofrezca descargar un documento PDF (facturas, cartas porte, cotizaciones, historial de abonos, kardex).

Ambos SHALL exponer `onClick: () => void` y `loading?: boolean` (mapeado al `isExporting`/`isDownloading` interno de cada consumidor) — ninguno acepta `href`, ya que la acción siempre es una descarga de blob, no una navegación.

Está PROHIBIDO instanciar `Button` directamente con `icon="picture_as_pdf"` (o cualquier otro icono) para un botón de descarga/exportación de PDF en `app/(private)/**/_blocks/`, y está PROHIBIDO declarar un `<button>` crudo para esta acción — SHALL usarse `ExportPdfButton` o `DownloadPdfButton` según corresponda. El gating por permisos (`can(...)`) sigue siendo responsabilidad exclusiva del componente caller.

`designer.md`, en su catálogo de primitivas, SHALL documentar `PdfDownloadButton` (sus dos exports) junto al resto de primitivas (`Button`, `CreateButton`, `DataTable`, etc.), incluyendo su contrato de props y la regla de uso obligatorio para botones de PDF.

#### Scenario: Reportes usan ExportPdfButton

- **WHEN** se renderiza el botón de exportación a PDF en cualquiera de las 8 pantallas de `/reports/*`
- **THEN** el elemento es una instancia de `ExportPdfButton`, que internamente renderiza `Button` con `icon="picture_as_pdf"` y el texto "Exportar a PDF"

#### Scenario: Resto del sistema usa DownloadPdfButton

- **WHEN** se renderiza un botón de descarga de PDF en `/billing/*`, `/waybills/*`, `/quotes/*`, `/payments/history` o `/inventory/kardex`
- **THEN** el elemento es una instancia de `DownloadPdfButton`, que internamente renderiza `Button` con `icon="picture_as_pdf"` y el texto "Descargar PDF"

#### Scenario: Leyenda no configurable

- **WHEN** un desarrollador instancia `ExportPdfButton` o `DownloadPdfButton`
- **THEN** TypeScript no expone ningún prop de tipo `label`/`children` para sobrescribir el texto — el texto es fijo por variante

#### Scenario: Estado de carga deshabilita el botón

- **WHEN** `ExportPdfButton` o `DownloadPdfButton` reciben `loading={true}`
- **THEN** el botón queda deshabilitado, expone `aria-busy="true"` y muestra un `Spinner`, idéntico al comportamiento ya definido para `Button`

## MODIFIED Requirements

### Requirement: Button como única fuente de botones

`app/_components/atoms/Button/Button.tsx` SHALL ofrecer 5 variantes y 3 tamaños, y SHALL estar tokenizado (sin CSS Modules ni hex).

| Variante | Clases |
|---|---|
| `filled` (default) | `bg-primary text-on-primary hover:bg-primary/90` |
| `tonal` | `bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed-dim` |
| `outlined` | `border border-outline text-on-surface hover:bg-surface-container` |
| `text` | `text-primary hover:bg-primary-fixed/20` |
| `destructive` | `bg-error-container text-on-error-container hover:bg-error/10` |

| Tamaño | Clases |
|---|---|
| `sm` | `px-3 py-1.5 text-label-md` |
| `md` (default) | `px-4 py-2 text-label-lg` |
| `lg` | `px-6 py-3 text-title-md` |

Base común: `inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`.

SHALL aceptar `loading?: boolean` (deshabilita, muestra `Spinner`, expone `aria-busy`) e `icon?: IconName` con `iconPosition?: "start" | "end"`.

SHALL aceptar `href?: string`. Cuando `href` está presente, `Button` SHALL renderizar `next/link` (en vez de `<button>`) con exactamente las mismas clases de variante, tamaño e ícono que su renderizado como botón — mismo `background-color`, `border-radius`, tipografía y posición del ícono. `Button` con `href` NO SHALL aceptar `loading` (no aplica a navegación).

Está PROHIBIDO declarar un `<button>` crudo con clases de estilo en `app/(private)/**/_blocks/`, salvo las entradas de la allowlist de deuda declarada del guardarraíl. Está PROHIBIDO declarar un `<Link>`/`<a>` con clases de estilo copiadas manualmente para reproducir el look de `Button`. Para botones de creación de recurso específicamente, SHALL usarse `CreateButton` (ver requirement "CreateButton como único componente para botones de creación de recurso"); para botones de descarga/exportación de PDF, SHALL usarse `ExportPdfButton`/`DownloadPdfButton` (ver requirement "PdfDownloadButton como único componente para descarga/exportación de PDF") — en ambos casos, en vez de instanciar `Button` directamente.

#### Scenario: CTA primario idéntico en todos los módulos

- **WHEN** se renderiza el CTA primario de cualquier página
- **THEN** su `background-color` es `rgb(13, 99, 27)` y su `border-radius` es `9999px`

#### Scenario: Estado de carga

- **WHEN** un `Button` recibe `loading`
- **THEN** queda deshabilitado, expone `aria-busy="true"` y muestra un `Spinner`

#### Scenario: Button como enlace de navegación

- **WHEN** `Button` recibe la prop `href` (por ejemplo `<Button href="/quotes/new" icon="add">Nueva cotización</Button>`, o indirectamente vía `<CreateButton href="/quotes/new" label="Nueva cotización" />`)
- **THEN** renderiza un `<a>` vía `next/link` apuntando a `href`, con las mismas clases de `variant`/`size` que tendría como `<button>`, y el ícono en la posición indicada por `iconPosition`

---
