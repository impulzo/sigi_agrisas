## ADDED Requirements

### Requirement: CreateButton como único componente para botones de creación de recurso

`app/_components/molecules/CreateButton/CreateButton.tsx` SHALL ser el único componente permitido para renderizar un botón de creación de recurso ("Nuevo/a X", "Crear X", "Agregar X") en cualquier página bajo `app/(private)/`. SHALL envolver al atom `Button` con `variant="filled"` e `icon="add"` fijos (no configurables por el caller), y SHALL exponer las props `label: string` (obligatoria, sin valor default genérico) y, mutuamente excluyentes, `onClick?: () => void` (abre modal) u `href?: string` (navega a una ruta, vía la capacidad de `Button` descrita en el requirement "Button como única fuente de botones").

Está PROHIBIDO instanciar `Button` directamente con `variant="filled"` + `icon="add"` para un botón de creación de recurso en `app/(private)/**/_blocks/` — SHALL usarse `CreateButton`. El gating por permisos (`canWrite`/`can(...)`) sigue siendo responsabilidad exclusiva del componente caller; `CreateButton` no implementa lógica de autorización.

`designer.md`, en su catálogo de primitivas, SHALL documentar `CreateButton` junto al resto de primitivas (`Button`, `DataTable`, etc.), incluyendo su contrato de props y la regla de uso obligatorio para botones de creación.

#### Scenario: Todo botón de creación de recurso usa CreateButton

- **WHEN** se renderiza cualquier botón de creación de recurso en `/catalogs/*`, `/users`, `/roles`, `/quotes` (toolbar y empty state), `/purchases`, `/billing`, `/waybills` o `/inventory`
- **THEN** el elemento es una instancia de `CreateButton`, que internamente renderiza `Button` con `variant="filled"` e `icon="add"` — incluyendo "Nuevo usuario" (`/users`) y "Nuevo rol" (`/roles`)

#### Scenario: CreateButton abre modal vía onClick

- **WHEN** `CreateButton` recibe `onClick` (por ejemplo en un catálogo o en `RolesPage`)
- **THEN** renderiza un `<button>` (vía `Button` sin `href`) que invoca `onClick` al hacer click, sin navegar

#### Scenario: CreateButton navega vía href

- **WHEN** `CreateButton` recibe `href` (por ejemplo `<CreateButton label="Nueva cotización" href="/quotes/new" />`)
- **THEN** renderiza un `<a>` vía `next/link` (delegando en la capacidad `href` de `Button`) apuntando a esa ruta, con el mismo look `filled`/`add` que la variante `onClick`

#### Scenario: label es obligatorio y sin default genérico

- **WHEN** un desarrollador instancia `CreateButton` sin pasar `label`
- **THEN** TypeScript falla en tiempo de compilación (prop requerida, sin valor default) — no existe un fallback tipo "Nuevo" genérico como el que tenía `CatalogToolbar.createButtonLabel`

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

Está PROHIBIDO declarar un `<button>` crudo con clases de estilo en `app/(private)/**/_blocks/`, salvo las entradas de la allowlist de deuda declarada del guardarraíl. Está PROHIBIDO declarar un `<Link>`/`<a>` con clases de estilo copiadas manualmente para reproducir el look de `Button`. Para botones de creación de recurso específicamente, SHALL usarse `CreateButton` (ver requirement "CreateButton como único componente para botones de creación de recurso") en vez de instanciar `Button` directamente.

#### Scenario: CTA primario idéntico en todos los módulos

- **WHEN** se renderiza el CTA primario de cualquier página
- **THEN** su `background-color` es `rgb(13, 99, 27)` y su `border-radius` es `9999px`

#### Scenario: Estado de carga

- **WHEN** un `Button` recibe `loading`
- **THEN** queda deshabilitado, expone `aria-busy="true"` y muestra un `Spinner`

#### Scenario: Button como enlace de navegación

- **WHEN** `Button` recibe la prop `href` (por ejemplo `<Button href="/quotes/new" icon="add">Nueva cotización</Button>`, o indirectamente vía `<CreateButton href="/quotes/new" label="Nueva cotización" />`)
- **THEN** renderiza un `<a>` vía `next/link` apuntando a `href`, con las mismas clases de `variant`/`size` que tendría como `<button>`, y el ícono en la posición indicada por `iconPosition`
