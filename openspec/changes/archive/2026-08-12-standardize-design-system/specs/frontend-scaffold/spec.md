## MODIFIED Requirements

### Requirement: Configuración de Tailwind CSS en el proyecto
El proyecto SHALL tener Tailwind CSS v3 instalado y configurado para funcionar con Next.js 14 App Router, con `content` apuntando a `./app/**/*.{ts,tsx}`. El `tailwind.config.ts` SHALL incluir el design system **Material 3 "Agro-Systemic"** generado en Stitch (proyecto `5227157529282603342`) con tokens semánticos de color, escala tipográfica Inter completa, escala de spacing 8px, border radius alineado con Stitch y escala de elevación tonal; los tokens legacy `agrisas-*` (mint, dark, medium, light) SHALL mantenerse intactos para no romper `/auth/*`.

La definición normativa de los tokens vive en la capability `design-system` y en `designer.md`. Este requirement SHALL limitarse a garantizar que Tailwind los expone correctamente; NO MUST duplicar sus valores como fuente de verdad.

#### Scenario: Tailwind procesa clases en archivos TSX
- **WHEN** un componente `.tsx` bajo `app/` usa clases de utilidad de Tailwind
- **THEN** el compilador Next.js genera el CSS correspondiente y elimina las clases no utilizadas en producción

#### Scenario: Tokens semánticos Material 3 disponibles
- **WHEN** un componente usa `bg-primary`, `text-on-primary`, `bg-surface-container`, `bg-primary-container`, `text-on-surface-variant`, `border-outline-variant`, `bg-error-container` u otro token semántico M3
- **THEN** Tailwind aplica los valores de la paleta del design system (primary `#0d631b`, primary-container `#2e7d32`, surface `#f9f9f7`, surface-container-lowest `#ffffff`, outline-variant `#bfcaba`, error `#ba1a1a`, etc.)

#### Scenario: Tokens legacy agrisas-* siguen funcionando
- **WHEN** un componente de `app/(public)/auth/*` usa `text-agrisas-dark` o `bg-agrisas-mint`
- **THEN** Tailwind aplica los valores legacy (#1a4d42, #2a6b5f, #d4f1e9, #e8f7f3) sin error

#### Scenario: Escala tipográfica completa disponible
- **WHEN** un componente usa cualquiera de los 16 tokens de la escala (`text-display-lg`, `text-display-md`, `text-display-sm`, `text-headline-lg`, `text-headline-lg-mobile`, `text-headline-md`, `text-headline-sm`, `text-title-lg`, `text-title-md`, `text-title-sm`, `text-body-lg`, `text-body-md`, `text-body-sm`, `text-label-lg`, `text-label-md`, `text-label-sm`)
- **THEN** Tailwind emite `font-size`, `line-height`, `letter-spacing` y `font-weight` para todos ellos, y ninguno queda sin regla heredando el tamaño del body

#### Scenario: Escala de spacing 8px disponible
- **WHEN** un componente usa `p-md`, `gap-gutter`, `p-xs`, `p-sm`, `p-lg`, `p-xl`, `mx-margin-mobile` o `mx-margin-desktop`
- **THEN** Tailwind aplica los valores correspondientes (xs=4px, sm=8px, md=16px, lg=24px, xl=32px, gutter=24px, margin-mobile=16px, margin-desktop=32px)

#### Scenario: Fuente Inter cargada vía next/font
- **WHEN** un componente usa cualquier clase tipográfica del scaffold
- **THEN** Tailwind aplica la familia de fuente `Inter` cargada vía `next/font/google` en `app/layout.tsx` y disponible globalmente

#### Scenario: Border radius alineado con Stitch
- **WHEN** un componente usa `rounded-sm`, `rounded`, `rounded-md`, `rounded-lg`, `rounded-xl` o `rounded-full`
- **THEN** Tailwind aplica `0.25rem`, `0.5rem`, `0.75rem`, `1rem`, `1.5rem` y `9999px` respectivamente, exactamente como los declara el `designMd` de Stitch

#### Scenario: Escala de elevación tonal disponible
- **WHEN** un componente usa `shadow-elevation-1`, `shadow-elevation-2` o `shadow-elevation-3`
- **THEN** Tailwind aplica sombras ambientales suaves de baja opacidad, según la regla de elevación tonal del design system

#### Scenario: Tokens M3 disponibles como variables CSS
- **WHEN** una regla CSS fuera de Tailwind referencia `rgb(var(--md-sys-color-outline-variant))` o cualquier otro `--md-sys-color-*`
- **THEN** la variable está definida en `:root` de `app/globals.css` como tripleta RGB y la regla resuelve a un color válido

---

### Requirement: Átomos y moléculas reutilizables del design system Material 3
El scaffold SHALL exponer los siguientes componentes presentational bajo `app/_components/`, todos sin lógica de fetch ni navigation:

- **Atoms**: `Button`, `IconButton`, `Input`, `Select`, `Avatar`, `Chip`, `Icon`, `Badge`, `Spinner`, `Skeleton`, `Switch`, `ProductImage`.
- **Molecules**: `Card`, `StatCard`, `SearchInput`, `DataTable`, `FormField`, `PageLoading`, `Combobox`, `ConfirmDialog`, `EmptyState`, `SegmentedButton`.
- **Organisms**: `PageShell` (con `PageHeader`), `NavigationRail`, `TopAppBar`, `MaterialSymbolsLoader`.

Ningún componente de `app/_components/` SHALL usar CSS Modules para color, tipografía o radio: todo estilo SHALL expresarse con tokens de Tailwind. El contrato de clases de `Button`, `DataTable`, `Input`, `Select`, `FormField` y `PageShell` es normativo y vive en la capability `design-system`.

#### Scenario: IconButton átomo
- **WHEN** se inspecciona `app/_components/atoms/IconButton/IconButton.tsx`
- **THEN** acepta `icon: IconName`, `ariaLabel: string`, `onClick?`, `variant?: "filled" | "tonal" | "ghost"` y NO contiene lógica de red

#### Scenario: Avatar átomo
- **WHEN** se inspecciona `app/_components/atoms/Avatar/Avatar.tsx`
- **THEN** acepta `src?: string`, `alt: string`, `size?: "sm" | "md" | "lg"`, `fallbackInitials?: string` y muestra iniciales cuando `src` falta

#### Scenario: Chip átomo
- **WHEN** se inspecciona `app/_components/atoms/Chip/Chip.tsx`
- **THEN** acepta `label`, `tone?: "primary" | "success" | "warning" | "error"`, `icon?: IconName`, se renderiza con `rounded-full`, y ningún `tone` comparte par de tokens con una variante de `Badge`

#### Scenario: Card molécula
- **WHEN** se inspecciona `app/_components/molecules/Card/Card.tsx`
- **THEN** envuelve `children` con `bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-elevation-1` y acepta `tone?: "default" | "primary"` (variante con fondo `bg-primary text-on-primary`)

#### Scenario: StatCard molécula
- **WHEN** se inspecciona `app/_components/molecules/StatCard/StatCard.tsx`
- **THEN** acepta `label: string`, `value: string`, `trend?: { delta: string; direction: "up" | "down" }`, `icon?: IconName` y los compone visualmente alineado al diseño de Stitch (`text-display-lg` para el valor, chip con flecha para el trend)

#### Scenario: SearchInput molécula
- **WHEN** se inspecciona `app/_components/molecules/SearchInput/SearchInput.tsx`
- **THEN** muestra `<Icon name="search" />` + `<input>` redondeado `rounded-full` con `bg-surface-container-high`, acepta `placeholder` y `value` controlado, y NO hace submit ni fetch

#### Scenario: PageLoading molécula
- **WHEN** una página está resolviendo sus permisos o su primera carga de datos
- **THEN** renderiza `<PageLoading />`, que centra un `Spinner` en una altura consistente, en lugar de repetir `h-[60vh]` por módulo

#### Scenario: Sin CSS Modules de estilo en los componentes compartidos
- **WHEN** se inspecciona `app/_components/`
- **THEN** no existen `Button.module.css`, `Input.module.css` ni `FormField.module.css`, y ningún componente compartido declara colores en un archivo `.module.css`
