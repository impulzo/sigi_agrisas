# Spec: design-system

## Purpose

Define el sistema de diseño único del panel: `designer.md` como fuente de verdad operativa derivada del design system Material 3 "Agro-Systemic" del proyecto Stitch `5227157529282603342`, los tokens cerrados de tipografía/radio/color, las primitivas normativas (`PageShell`, `Button`, `DataTable`, campos de formulario) y el guardarraíl automatizado (unitario y e2e) que impide que cualquier spec `*-ui` o cualquier `_blocks/` reintroduzca estilo ad-hoc fuera de esos tokens.

---

## Requirements

### Requirement: Fuente de verdad única del sistema de diseño

El repositorio SHALL mantener `designer.md` en la raíz como referencia operativa obligatoria para toda implementación de UI, y esta capability (`design-system`) como su contraparte verificable.

`designer.md` SHALL derivar del design system **Agro-Systemic** del proyecto Stitch `5227157529282603342`, cuyo artefacto autoritativo es `designTheme.designMd` (recuperable con `mcp__stitch__get_project`). Ante discrepancia entre `designer.md` y el `designMd` de Stitch, SHALL prevalecer Stitch, salvo en las desviaciones registradas explícitamente en la sección "Desviaciones" de `designer.md`.

Ningún spec `*-ui` SHALL redefinir tokens de color, tipografía, spacing, radio o elevación. SHALL referenciar `design-system` y limitarse a describir composición y comportamiento propios de su feature.

#### Scenario: Spec de UI nuevo no redefine tokens

- **WHEN** se redacta un spec nuevo con sufijo `-ui`
- **THEN** referencia la capability `design-system` para tokens y primitivas, y no incluye tablas propias de hex, tamaños de fuente ni radios

#### Scenario: designer.md existe y es alcanzable desde CLAUDE.md

- **WHEN** un agente o desarrollador se dispone a modificar cualquier archivo bajo `app/`
- **THEN** `CLAUDE.md` lo dirige a leer `designer.md` antes de tocar código

---

### Requirement: Escala tipográfica completa y cerrada

`tailwind.config.ts` SHALL definir en `theme.extend.fontSize` exactamente los 16 tokens de la escala Material 3, y ninguna clase tipográfica usada en `app/` SHALL quedar fuera de ese conjunto.

| Token | font-size | line-height | letter-spacing | weight |
|---|---|---|---|---|
| `display-lg` | 57px | 64px | -0.25px | 400 |
| `display-md` | 45px | 52px | — | 400 |
| `display-sm` | 36px | 44px | — | 400 |
| `headline-lg` | 32px | 40px | — | 600 |
| `headline-lg-mobile` | 28px | 36px | — | 600 |
| `headline-md` | 28px | 36px | — | 600 |
| `headline-sm` | 24px | 32px | — | 600 |
| `title-lg` | 22px | 28px | — | 500 |
| `title-md` | 16px | 24px | 0.15px | 500 |
| `title-sm` | 14px | 20px | 0.1px | 500 |
| `body-lg` | 16px | 24px | 0.5px | 400 |
| `body-md` | 14px | 20px | 0.25px | 400 |
| `body-sm` | 13px | 18px | 0.25px | 400 |
| `label-lg` | 14px | 20px | 0.1px | 500 |
| `label-md` | 12px | 16px | 0.5px | 500 |
| `label-sm` | 11px | 16px | 0.5px | 500 |

`body-sm` SHALL valer 13px/18px. Es una desviación deliberada de M3 (12px/16px), motivada por la legibilidad de las celdas de tablas de datos, y SHALL constar en la sección "Desviaciones" de `designer.md`.

Está PROHIBIDO usar tamaños de fuente arbitrarios (`text-[20px]` y similares) en `app/`.

#### Scenario: Clase tipográfica de la escala emite CSS

- **WHEN** un componente usa `text-body-sm`, `text-headline-sm`, `text-title-sm` o `text-label-md`
- **THEN** Tailwind emite la regla de `font-size`, `line-height`, `letter-spacing` y `font-weight` correspondiente, y el elemento NO hereda el tamaño del body

#### Scenario: Clase tipográfica fuera de la escala falla el guardarraíl

- **WHEN** se introduce en `app/` una clase con la forma `text-<categoría>-<variante>` que no pertenece a los 16 tokens (por ejemplo `text-label-large` o `text-body-xs`)
- **THEN** `tests/unit/ui/design-system/tokens.test.ts` falla e identifica el archivo y la clase

#### Scenario: Tamaño de fuente arbitrario falla el guardarraíl

- **WHEN** se introduce en `app/` una clase `text-[<n>px]`
- **THEN** `tests/unit/ui/design-system/tokens.test.ts` falla

---

### Requirement: Escala de radios alineada con Stitch

`tailwind.config.ts` SHALL definir `theme.extend.borderRadius` exactamente como el `designMd` de Stitch:

| Clase | Valor | Uso |
|---|---|---|
| `rounded-sm` | 0.25rem | detalles menores, miniaturas |
| `rounded` | 0.5rem | inputs, selects, botones no-pill, chips cuadrados |
| `rounded-md` | 0.75rem | contenedores internos, celdas destacadas |
| `rounded-lg` | 1rem | tarjetas, paneles de página, diálogos |
| `rounded-xl` | 1.5rem | superficies grandes, hojas laterales |
| `rounded-full` | 9999px | botones pill, avatares, badges, chips |

`rounded-2xl` y `rounded-3xl` SHALL dejar de usarse en `app/`: quedan fuera de la escala y sus valores anteriores están cubiertos por `rounded-lg` y `rounded-xl`.

#### Scenario: Panel de página y tarjeta comparten radio

- **WHEN** se renderiza el panel de una página de listado y una `<Card>`
- **THEN** ambos aplican `border-radius: 1rem`

#### Scenario: Radio fuera de escala falla el guardarraíl

- **WHEN** se introduce `rounded-2xl` o `rounded-3xl` en `app/`
- **THEN** `tests/unit/ui/design-system/tokens.test.ts` falla

---

### Requirement: Color exclusivamente por token semántico

Todo color en `app/(private)/` y en `app/_components/` SHALL expresarse mediante los tokens semánticos M3 de `tailwind.config.ts`. Están PROHIBIDOS: hex crudo en TSX o CSS Modules, valores arbitrarios de color (`bg-[#…]`, `text-[#…]`), y la paleta neutra genérica de Tailwind (`bg-gray-*`, `border-gray-*`, `text-gray-*`).

`app/(public)/auth/*` queda EXENTO y conserva la paleta legacy `agrisas-*`, según `frontend-scaffold`.

Los tokens SHALL estar además disponibles como variables CSS en `:root` con la forma `--md-sys-color-<token>` expresadas como tripletas RGB, para su consumo fuera de Tailwind (estilos de impresión, scrollbars, PDF).

#### Scenario: Scrollbar resuelve su color

- **WHEN** un contenedor usa la utilidad `.scrollbar-thin`
- **THEN** `rgb(var(--md-sys-color-outline-variant))` resuelve a un color definido y el pulgar del scrollbar se pinta con `#bfcaba`, no con el color por defecto del navegador

#### Scenario: Hex crudo o gris genérico falla el guardarraíl

- **WHEN** se introduce un hex crudo, un `bg-[#…]` o un `bg-gray-*` en `app/(private)/` o `app/_components/`
- **THEN** `tests/unit/ui/design-system/tokens.test.ts` falla

---

### Requirement: PageShell como único contenedor de página

`app/_components/organisms/PageShell/` SHALL exportar `PageShell` y `PageHeader`. Toda ruta bajo `app/(private)/` SHALL renderizar su contenido dentro de `PageShell`, que es el ÚNICO responsable del padding, el ancho máximo y el centrado de la página.

```
PageShellProps {
  title: string
  description?: string
  backHref?: string
  actions?: ReactNode
  toolbar?: ReactNode
  width?: "default" | "narrow" | "full"   // default
  children?: ReactNode
}
```

Contrato de clases:

| Región | Clases |
|---|---|
| raíz | `flex flex-col gap-lg px-gutter py-lg mx-auto w-full` |
| `width="default"` | `max-w-screen-2xl` |
| `width="narrow"` | `max-w-4xl` |
| `width="full"` | sin límite de ancho |
| título | `h1` · `text-headline-lg text-on-surface` |
| descripción | `p` · `text-body-md text-on-surface-variant mt-1` |
| fila de header | `flex items-start justify-between gap-md` |
| panel | `bg-surface-container-low rounded-lg border border-outline-variant overflow-hidden` |
| franja de toolbar | `px-md py-md border-b border-outline-variant` |

El panel SHALL renderizarse SÓLO cuando se pase `toolbar`: es la señal de que la página es un listado con filtros. Cuando `toolbar` está ausente, `children` SHALL renderizarse directamente bajo el header, sin envoltura de panel — el caso de páginas de grid/hub (tarjetas sin franja de filtros) y de layouts master-detail (que aportan su propio marco, distinto al de un listado). `PageHeader` SHALL además poder usarse por separado, sin `PageShell`, cuando ni panel ni header dan la geometría raíz correcta (por ejemplo, un layout de dos columnas que necesita controlar su propio contenedor).

`app/(private)/layout.tsx` SHALL limitar `<main>` a la geometría del chrome: `pl-20 pt-16 h-full overflow-y-auto` — 80px de rail y 64px de barra superior, sin padding de página ni márgenes asimétricos.

Ninguna página SHALL declarar su propio `px-*`, `py-*`, `mx-auto` ni `max-w-*` a nivel de raíz, ni replicar la estructura de `PageShell` a mano.

#### Scenario: Todas las páginas comparten margen

- **WHEN** se navega entre dos rutas cualesquiera de `(private)` que no usen `width="full"`
- **THEN** el contenedor de página presenta idéntico `padding-left` y `padding-top` en ambas

#### Scenario: Título de listado uniforme

- **WHEN** se renderiza cualquier página de listado
- **THEN** su `h1` mide 32px

#### Scenario: POS conserva su lienzo completo

- **WHEN** se renderiza `/pos` con `width="full"`
- **THEN** el split-pane ocupa el ancho disponible sin límite de ancho máximo, y sin márgenes negativos de compensación

#### Scenario: Página de detalle usa ancho estrecho

- **WHEN** se renderiza una página de detalle (`/sales/[id]`, `/quotes/[id]`, `/payments/[id]`, …)
- **THEN** usa `width="narrow"` (`max-w-4xl`), de modo que todas las páginas de detalle comparten ancho

#### Scenario: Página de grid/hub sin panel envolvente

- **WHEN** se renderiza `/catalogs` (grid de tarjetas, sin filtros) dentro de `PageShell` sin prop `toolbar`
- **THEN** las tarjetas se renderizan directamente bajo el header, sin el fondo tonal ni el borde del panel

---

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

Está PROHIBIDO declarar un `<button>` crudo con clases de estilo en `app/(private)/**/_blocks/`, salvo las entradas de la allowlist de deuda declarada del guardarraíl.

#### Scenario: CTA primario idéntico en todos los módulos

- **WHEN** se renderiza el CTA primario de cualquier página
- **THEN** su `background-color` es `rgb(13, 99, 27)` y su `border-radius` es `9999px`

#### Scenario: Estado de carga

- **WHEN** un `Button` recibe `loading`
- **THEN** queda deshabilitado, expone `aria-busy="true"` y muestra un `Spinner`

---

### Requirement: DataTable como único dialecto de tabla

`app/_components/molecules/DataTable/` SHALL exportar `Table`, `THead`, `TBody`, `Tr`, `Th` y `Td` con un único contrato de clases:

| Elemento | Clases |
|---|---|
| `Table` | `w-full text-body-sm` |
| `THead` | `border-b border-outline-variant bg-surface-container` |
| `Th` | `px-4 py-3 text-left text-label-sm text-on-surface-variant uppercase tracking-wide font-medium` |
| `Td` | `px-4 py-3` |
| `Tr` (cuerpo) | `hover:bg-surface-container-low` |
| `align="right"` | añade `text-right tabular-nums` |

Las columnas numéricas SHALL usar `align="right"`, que aporta cifras tabulares para alinear los decimales verticalmente, según la regla de Stitch para datos numéricos.

El fondo del header es `bg-surface-container`. Es una desviación registrada frente a la lectura literal de Stitch ("Tonal Tertiary background"), motivada por el peso visual de un header oscuro en 50 tablas de un tema claro, y SHALL constar en la sección "Desviaciones" de `designer.md`.

Está PROHIBIDO declarar un `<table>` crudo con clases de estilo en `app/(private)/**/_blocks/`, y PROHIBIDO declarar constantes locales de clases de `th`/`td` por módulo.

#### Scenario: Todas las tablas comparten tipografía

- **WHEN** se renderiza cualquier tabla de datos de la aplicación
- **THEN** sus `th` miden 11px en mayúsculas con `letter-spacing` aumentado, y sus `td` miden 13px

#### Scenario: Columna numérica alineada

- **WHEN** una celda se declara con `align="right"`
- **THEN** aplica `text-align: right` y `font-variant-numeric: tabular-nums`

---

### Requirement: Campos de formulario tokenizados

`Input`, `Select`, `FormField`, `Combobox` y `SatCatalogCombobox` SHALL compartir un contrato visual único, outlined y con label persistente, según la regla de Stitch para inputs:

| Estado | Clases |
|---|---|
| base | `w-full rounded border border-outline bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface` |
| foco | `focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary` |
| error | `border-error` + mensaje `text-label-md text-error` |
| deshabilitado | `disabled:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60` |
| label (`FormField`) | `text-label-lg text-on-surface-variant` |

`app/_components/atoms/Select/Select.tsx` SHALL existir y cubrir el caso de `<select>` nativo con chevron de Material Symbols.

Está PROHIBIDO declarar un `<input>` o `<select>` crudo con clases de estilo en `app/(private)/**/_blocks/`, salvo las entradas de la allowlist de deuda declarada.

#### Scenario: Input y Select se ven igual

- **WHEN** un formulario coloca un `Input` y un `Select` adyacentes
- **THEN** comparten altura, radio, borde, tipografía y tratamiento de foco

#### Scenario: Estado de error

- **WHEN** un `Input` recibe `error`
- **THEN** su borde usa el token `error`, expone `aria-invalid="true"` y muestra el mensaje en `text-label-md text-error`

---

### Requirement: Guardarraíl automatizado de tokens

`tests/unit/ui/design-system/tokens.test.ts` SHALL escanear `app/**/*.tsx` y fallar ante cualquiera de estas infracciones:

1. clase `text-(display|headline|title|body|label)-*` fuera de la escala declarada en `tailwind.config.ts`;
2. tamaño de fuente arbitrario `text-[<n>px]`;
3. hex crudo o valor arbitrario de color (`bg-[#…]`, `text-[#…]`, `border-[#…]`);
4. `bg-gray-*`, `border-gray-*` o `text-gray-*`;
5. `rounded-2xl` o `rounded-3xl`;
6. `<button`, `<table` o `<select` crudos en `app/(private)/**/_blocks/`.

El test SHALL leer la escala tipográfica desde `tailwind.config.ts` en lugar de duplicarla, de modo que añadir un token no requiera modificar el test.

Las reglas 4 y 6 SHALL admitir una allowlist explícita de archivos, que representa deuda declarada pendiente de migrar. La allowlist SHALL poder encoger pero NO crecer: añadir una entrada requiere justificación en el change correspondiente.

`app/(public)/auth/*` queda excluido de las reglas 3 y 4 por la exención de la paleta legacy.

#### Scenario: Regresión de token detectada en CI

- **WHEN** un cambio introduce `text-body-xs`, `bg-gray-100` o `rounded-2xl` en `app/`
- **THEN** `npm test` falla e informa archivo y clase infractora

#### Scenario: Deuda declarada no rompe la suite

- **WHEN** un archivo de la allowlist conserva un `<button>` crudo pendiente de migrar
- **THEN** el test pasa para ese archivo y sigue fallando para cualquier archivo fuera de la lista

---

### Requirement: Verificación end-to-end de homogeneidad visual

`tests/e2e/design-system.spec.ts` SHALL verificar por estilo computado, sobre al menos 10 rutas representativas de `(private)`, que:

1. el contenedor de página presenta el mismo `padding-left` y `padding-top` en todas las rutas que no usen `width="full"`;
2. el `h1` de las páginas de listado mide 32px;
3. todo `th` visible mide 11px y aplica `text-transform: uppercase`; todo `td` visible mide 13px;
4. el CTA primario de cada ruta tiene `background-color: rgb(13, 99, 27)` y `border-radius: 9999px`;
5. ningún elemento con clase `text-body-sm` renderiza a 16px.

`package.json` SHALL exponer el script `test:e2e`, y `playwright.config.ts` SHALL arrancar el servidor mediante un comando portable, sin rutas absolutas dependientes de la máquina.

#### Scenario: La suite e2e es ejecutable en cualquier máquina

- **WHEN** se ejecuta `npm run test:e2e` en un clon limpio con las variables de entorno configuradas
- **THEN** Playwright levanta el servidor de desarrollo sin depender de una ruta de nvm concreta

#### Scenario: Margen heterogéneo detectado

- **WHEN** una página deja de usar `PageShell` y declara su propio padding
- **THEN** la aserción de igualdad de `padding-left` falla e identifica la ruta divergente
