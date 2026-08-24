## Context

El atom `Button` (`app/_components/atoms/Button/Button.tsx`) ya soporta `icon: IconName`,
`loading`, `variant`, `size` y renderiza `<Link>` cuando recibe `href`. El atom `Icon`
(`app/_components/atoms/Icon/Icon.tsx`) renderiza cualquier nombre de `ICON_NAMES` como
ligature de Material Symbols sin mapeo adicional — agregar un nombre nuevo es un cambio de
una línea en el array. Hoy existe un componente parcialmente compartido
(`app/(private)/reports/_blocks/ExportPdfButton.tsx`) que reimplementa con un `<button>` a
mano lo que `Button` ya resuelve, y solo lo usan 2 de 8 pantallas de reportes. El resto de
consumidores (6 pantallas de reportes + 6 pantallas fuera de reportes) no comparten ningún
componente.

## Goals / Non-Goals

**Goals:**
- Un único componente fuente de verdad para "botón de PDF", con dos variantes de leyenda
  fija (fila 1 y 2 de la Historia de Usuario).
- Cero `<button>` a mano nuevos para esta acción — todo pasa por el atom `Button`.
- Migración mecánica de los 14 consumidores existentes, sin cambiar su lógica de
  descarga/estado de carga.

**Non-Goals:**
- No se toca el flujo de descarga en sí (`authFetch`, blob, `Content-Disposition`,
  nombre de archivo) de ningún módulo.
- No se unifican los botones "Exportar Excel" — quedan con su propio icono `summarize`
  y su implementación actual, sin tocar.
- No se introduce un prop de label configurable — la leyenda es fija a propósito
  (evita que un futuro consumidor reintroduzca la inconsistencia actual).

## Decisions

**Un solo archivo con dos exports, no dos componentes separados.**
`PdfDownloadButton.tsx` exporta `ExportPdfButton` y `DownloadPdfButton` como dos wrappers
delgados sobre un mismo componente interno no exportado, en vez de duplicar JSX. Ambos
comparten `icon="picture_as_pdf"` y `variant="filled"`; solo difieren en el texto fijo.
Alternativa descartada: un único componente con prop `label`/`context: "report" |
"other"` — se descarta porque un prop de texto libre reabre la puerta a que cada
consumidor escriba su propia variante del texto (el problema que este change resuelve).

**Ubicación: `app/_components/molecules/`, no `app/(private)/reports/_blocks/`.**
Sigue la convención de Atomic Design del repo (`designer.md`/CLAUDE.md): componentes
usados por ≥2 features viven en `_components/`, no en el `_blocks/` de un feature
específico. `reports/_blocks/ExportPdfButton.tsx` (el parcial actual) es exactamente el
antipatrón que se corrige — vivía en el feature equivocado y por eso no lo reutilizó
nadie más.

**`loading` en vez de un prop custom `isExporting`/`isDownloading`.**
El atom `Button` ya expone `loading` (deshabilita + `aria-busy` + `Spinner`). Cada
consumidor mapea su propio estado (`isExporting`, `isDownloading`, `isPrinting` — nombres
que no cambian, son internos a cada hook) al prop `loading` del componente compartido.
No se estandariza el nombre del estado interno de cada módulo — solo la interfaz visible.

**Migración por reemplazo directo, no por alias de compatibilidad.**
`reports/_blocks/ExportPdfButton.tsx`/`ExportXlsxButton.tsx`: el primero se borra tras
migrar sus 2 consumidores (`LedgerPage.tsx`, `StatementToolbar.tsx`); el segundo
(`ExportXlsxButton`) no se toca — el feature pedido es solo sobre botones de PDF. No se
deja un re-export de compatibilidad porque solo hay 2 consumidores a migrar, costo de
grep+reemplazo es trivial y un re-export sin uso real solo agrega un archivo muerto.

**Icono `picture_as_pdf` en vez de reutilizar `receipt_long`/`print`/`summarize`.**
Ninguno de los 3 iconos ya presentes en `ICON_NAMES` es semánticamente "documento PDF"
(`receipt_long` es un recibo, `print` es la acción de imprimir físicamente, `summarize`
ya está tomado por Excel). Material Symbols expone `picture_as_pdf` como ligature
estándar — no requiere ningún asset nuevo, solo agregar el string a `ICON_NAMES`.

## Risks / Trade-offs

- **[Riesgo] Cambio de texto visible en 3 módulos** (`payments`: "Exportar PDF" →
  "Descargar PDF"; `quotes`: "Imprimir PDF" → "Descargar PDF"; `inventory/kardex`:
  "Imprimir" → "Descargar PDF") puede sorprender a usuarios acostumbrados al texto
  anterior. → **Mitigación**: el comportamiento (descarga de blob) no cambia, solo el
  rótulo; es consistente con el resto del sistema y corrige un mislabel real en kardex
  (nunca fue "Imprimir", siempre descargó un PDF).
- **[Riesgo] `openspec/specs/reports-ui/spec.md` ya fija "Exportar PDF" (sin "a") como
  el texto esperado en varios scenarios existentes** (ej. account-statements,
  sales-cut). → **Mitigación**: los spec deltas de este change actualizan esos
  scenarios a "Exportar a PDF" explícitamente — no se puede aplicar el cambio de código
  sin el correspondiente delta de spec, ya cubierto en `specs/`.
- **[Riesgo] `Button` con `href` renderiza `<Link>`, pero todos los consumidores actuales
  disparan descarga vía `onClick`+blob, no navegación.** → **Mitigación**: el componente
  compartido nunca pasa `href` — se usa siempre la variante `onClick`, sin cambio de
  comportamiento respecto a hoy.

## Open Questions

(ninguna — alcance y decisiones ya cerrados con el plan aprobado por el usuario)
