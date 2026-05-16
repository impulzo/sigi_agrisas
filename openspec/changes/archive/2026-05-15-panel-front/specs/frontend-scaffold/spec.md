## MODIFIED Requirements

### Requirement: Configuración de Tailwind CSS en el proyecto
El proyecto SHALL tener Tailwind CSS v3 instalado y configurado para funcionar con Next.js 14 App Router, con `content` apuntando a `./app/**/*.{ts,tsx}`. El `tailwind.config.ts` SHALL incluir el design system **Material 3 "Agro-Systemic"** generado en Stitch (proyecto `5227157529282603342`) con tokens semánticos de color, escala tipográfica Inter, escala de spacing 8px y border radius rounded; los tokens legacy `agrisas-*` (mint, dark, medium, light) SHALL mantenerse intactos para no romper `/auth/*`.

#### Scenario: Tailwind procesa clases en archivos TSX
- **WHEN** un componente `.tsx` bajo `app/` usa clases de utilidad de Tailwind
- **THEN** el compilador Next.js genera el CSS correspondiente y elimina las clases no utilizadas en producción

#### Scenario: Tokens semánticos Material 3 disponibles
- **WHEN** un componente usa `bg-primary`, `text-on-primary`, `bg-surface-container`, `bg-primary-container`, `text-on-surface-variant`, `border-outline-variant`, `bg-error-container` u otro token semántico M3
- **THEN** Tailwind aplica los valores de la paleta del design system (primary `#0d631b`, primary-container `#2e7d32`, surface `#f9f9f7`, surface-container-lowest `#ffffff`, outline-variant `#bfcaba`, error `#ba1a1a`, etc.)

#### Scenario: Tokens legacy agrisas-* siguen funcionando
- **WHEN** un componente de `app/(public)/auth/*` usa `text-agrisas-dark` o `bg-agrisas-mint`
- **THEN** Tailwind aplica los valores legacy (#1a4d42, #2a6b5f, #d4f1e9, #e8f7f3) sin error

#### Scenario: Escala tipográfica Inter del design system disponible
- **WHEN** un componente usa `text-display-lg`, `text-headline-lg`, `text-title-md`, `text-body-lg`, `text-body-md`, `text-label-lg` o `text-label-sm`
- **THEN** Tailwind aplica `font-size`, `line-height`, `letter-spacing` y `font-weight` definidos en el design system (e.g. `display-lg` = 57px/64px/-0.25px/400, `label-sm` = 11px/16px/0.5px/500)

#### Scenario: Escala de spacing 8px disponible
- **WHEN** un componente usa `p-md`, `gap-gutter`, `p-xs`, `p-sm`, `p-lg`, `p-xl`, `mx-margin-mobile` o `mx-margin-desktop`
- **THEN** Tailwind aplica los valores correspondientes (xs=4px, sm=8px, md=16px, lg=24px, xl=32px, gutter=24px, margin-mobile=16px, margin-desktop=32px)

#### Scenario: Fuente Inter cargada vía next/font
- **WHEN** un componente usa cualquier clase tipográfica del scaffold
- **THEN** Tailwind aplica la familia de fuente `Inter` cargada vía `next/font/google` en `app/layout.tsx` y disponible globalmente

#### Scenario: Border radius del design system disponible
- **WHEN** un componente usa `rounded-lg`, `rounded-xl` o `rounded-full`
- **THEN** Tailwind aplica `0.5rem`, `0.75rem` y `9999px` respectivamente, alineados con el shape language M3 "Rounded"

---

## ADDED Requirements

### Requirement: Material Symbols Outlined como icon set del panel
El panel privado SHALL usar **Material Symbols Outlined** (Google Fonts) como sistema de iconografía. La hoja de estilos `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap` SHALL cargarse desde el layout privado (`app/(private)/layout.tsx`) y NO desde el layout público para no penalizar `/auth/*`. Existe un átomo `app/_components/atoms/Icon/Icon.tsx` que envuelve `<span className="material-symbols-outlined">{name}</span>` con tipado de la prop `name`.

#### Scenario: Iconos renderizan con la fuente correcta en el panel
- **WHEN** un componente bajo `app/(private)/**` renderiza `<Icon name="dashboard" />`
- **THEN** el navegador muestra el glifo `dashboard` de Material Symbols Outlined con `font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24`

#### Scenario: La hoja de estilos no se carga en /auth
- **WHEN** un usuario visita `/auth/login`
- **THEN** el HTML resultante no incluye el `<link>` de Material Symbols (la carga vive solo en `app/(private)/layout.tsx`)

#### Scenario: Tipado de nombres de iconos
- **WHEN** un desarrollador escribe `<Icon name="..." />` con un valor que no está en la lista permitida
- **THEN** TypeScript reporta error de tipo en tiempo de compilación

---

### Requirement: Átomos y moléculas reutilizables del design system Material 3
El scaffold SHALL exponer los siguientes componentes presentational adicionales bajo `app/_components/`, todos sin lógica de fetch ni navigation:

- **Atoms**: `IconButton`, `Avatar`, `Chip`, `Icon`.
- **Molecules**: `Card`, `StatCard`, `SearchInput`.

#### Scenario: IconButton átomo
- **WHEN** se inspecciona `app/_components/atoms/IconButton/IconButton.tsx`
- **THEN** acepta `icon: IconName`, `ariaLabel: string`, `onClick?`, `variant?: "filled" | "tonal" | "ghost"` y NO contiene lógica de red

#### Scenario: Avatar átomo
- **WHEN** se inspecciona `app/_components/atoms/Avatar/Avatar.tsx`
- **THEN** acepta `src?: string`, `alt: string`, `size?: "sm" | "md" | "lg"`, `fallbackInitials?: string` y muestra iniciales cuando `src` falta

#### Scenario: Chip átomo
- **WHEN** se inspecciona `app/_components/atoms/Chip/Chip.tsx`
- **THEN** acepta `label`, `tone?: "primary" | "success" | "warning" | "error"`, `icon?: IconName` y se renderiza con `rounded-full`

#### Scenario: Card molécula
- **WHEN** se inspecciona `app/_components/molecules/Card/Card.tsx`
- **THEN** envuelve `children` con `bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm` y acepta `tone?: "default" | "primary"` (variante con fondo `bg-primary text-on-primary`)

#### Scenario: StatCard molécula
- **WHEN** se inspecciona `app/_components/molecules/StatCard/StatCard.tsx`
- **THEN** acepta `label: string`, `value: string`, `trend?: { delta: string; direction: "up" | "down" }`, `icon?: IconName` y los compone visualmente alineado al diseño de Stitch (`text-display-lg` para el valor, chip con flecha para el trend)

#### Scenario: SearchInput molécula
- **WHEN** se inspecciona `app/_components/molecules/SearchInput/SearchInput.tsx`
- **THEN** muestra `<Icon name="search" />` + `<input>` redondeado `rounded-full` con `bg-surface-container-high`, acepta `placeholder` y `value` controlado, y NO hace submit ni fetch
