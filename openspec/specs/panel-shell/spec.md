# Spec: panel-shell

## Purpose

Define el shell del panel privado de Agrisas: layout compartido con NavigationRail y TopAppBar, protección de rutas autenticadas, carga de Material Symbols Outlined, diseño fiel al design system Material 3 "Agro-Systemic" de Stitch, y las cuatro reglas fundamentales de acceso y navegación post-autenticación.

---

## Requirements

### Requirement: Implementación fiel del diseño frontend de Stitch (MCP)
El panel privado SHALL implementar el design system Material 3 "Agro-Systemic" generado en el proyecto Stitch `5227157529282603342` (*Agrisas Admin & POS Dashboard*), accesible vía el servidor MCP de Stitch. Los tokens visuales (paleta semántica, escala tipográfica Inter, escala de spacing 8px, border-radius), la iconografía (Material Symbols Outlined) y la composición de pantallas (NavigationRail + TopAppBar + bento grid del Dashboard) SHALL coincidir con los artefactos exportados desde Stitch. NO MUST introducirse tokens, componentes visuales o icon sets ajenos al sistema durante este change.

#### Scenario: Paleta deriva de Stitch
- **WHEN** se inspecciona `tailwind.config.ts`
- **THEN** los valores de `primary`, `primary-container`, `secondary`, `tertiary`, `surface`, `surface-container-*`, `outline`, `outline-variant`, `error` y sus pares `on-*` corresponden a los valores Material 3 "Agro-Systemic" del proyecto Stitch `5227157529282603342`

#### Scenario: Tipografía deriva de Stitch
- **WHEN** se inspecciona `tailwind.config.ts`
- **THEN** la escala incluye al menos `display-lg`, `headline-lg`, `title-md`, `body-lg`, `body-md`, `label-lg`, `label-sm` con tamaños, line-height, letter-spacing y peso alineados con el design system de Stitch, sobre la fuente Inter

#### Scenario: Iconografía Material Symbols
- **WHEN** se inspecciona el HTML renderizado de cualquier ruta bajo `(private)`
- **THEN** los iconos se renderizan como `<span className="material-symbols-outlined">` con la fuente Material Symbols Outlined cargada desde Google Fonts; NO se importan SVGs ajenos al set ni librerías como `lucide-react` o `@mui/icons-material`

#### Scenario: Composición de pantalla fiel a Stitch
- **WHEN** se compara la página `/dashboard` con el HTML exportado por Stitch
- **THEN** el shell muestra NavigationRail (80px) a la izquierda, TopAppBar (64px) arriba y un bento grid con los 6 bloques (Header, SalesCard, InventoryCard, LowStockAlerts, ActivityFeed, LogisticsMap) en las proporciones definidas por el diseño

---

### Requirement: Alineación con la arquitectura frontend del proyecto
El panel SHALL cumplir las convenciones de arquitectura frontend documentadas en `CLAUDE.md`: **Atomic Design** (`app/_components/{atoms,molecules,organisms}`), **Route Groups** (`(public)` y `(private)`) y **`_logic/` por feature** (`hooks/`, `services/`, `schemas/`, `types/`). Los componentes en `_components/` y los bloques en `_blocks/` SHALL ser **presentational puros**: NO MUST contener `fetch`, `axios`, `sessionStorage`, `localStorage`, `document`, ni `useRouter().push/replace`. Toda lógica de red, navegación imperativa o validación vive en `_logic/`.

#### Scenario: Estructura por route group
- **WHEN** se inspecciona el árbol del proyecto
- **THEN** todas las páginas del panel viven bajo `app/(private)/` y las páginas de auth bajo `app/(public)/auth/`, con sus layouts respectivos

#### Scenario: Atomic Design en `_components/`
- **WHEN** se inspecciona `app/_components/`
- **THEN** existen subcarpetas `atoms/`, `molecules/` y `organisms/`, cada componente en su propia carpeta `Nombre/Nombre.tsx`

#### Scenario: `_logic/` por feature
- **WHEN** se inspecciona `app/(private)/dashboard/`
- **THEN** existe `_logic/` con subcarpetas `services/`, `types/` (y opcionalmente `hooks/`, `schemas/`) que encapsulan toda la lógica del feature

#### Scenario: Componentes presentational puros
- **WHEN** se hace `grep -E "fetch\\(|sessionStorage|localStorage|useRouter\\(\\)\\.(push|replace)|document\\." app/_components/ app/(private)/dashboard/_blocks/`
- **THEN** no aparece ninguna coincidencia (toda esa lógica vive en `_logic/`)

#### Scenario: Página orquesta, no implementa
- **WHEN** se inspecciona `app/(private)/dashboard/page.tsx`
- **THEN** llama a los services del feature (`getDashboardKpis`, `getLowStockAlerts`, `getRecentActivity`) y pasa los datos por props a los bloques; no contiene fetch inline ni JSX de tarjetas individuales

---

### Requirement: Permiso reports:read gatea el Dashboard en el NavigationRail

El sistema SHALL definir el permiso `reports:read` en el seed RBAC. Este permiso SHALL asignarse exclusivamente al rol `admin` (no a `operator` ni `viewer`). El item `dashboard` en `primaryItems` de `NavigationRail/items.ts` SHALL incluir `requires: "reports:read"`. El `NavigationRail` SHALL ocultar el item cuando `can("reports:read")` devuelve `false`; SHALL mostrarlo optimistamente cuando devuelve `"loading"`.

#### Scenario: Item Dashboard visible sólo para admin
- **WHEN** un usuario con rol `operator` o `viewer` está autenticado
- **THEN** el item "Dashboard" no aparece en el `NavigationRail` (can("reports:read") === false)

#### Scenario: Item Dashboard visible para admin
- **WHEN** un usuario con rol `admin` está autenticado
- **THEN** el item "Dashboard" aparece en el `NavigationRail` (can("reports:read") === true)

#### Scenario: Label del item es "Inicio"
- **WHEN** se inspecciona `NavigationRail/items.ts`
- **THEN** el item con `key: "dashboard"` tiene `label: "Inicio"` y `requires: "reports:read"`

---

### Requirement: El panel carga después de iniciar sesión o registrarse
Tras un submit exitoso de login o registro, el usuario SHALL aterrizar directamente en `/pos`. Los hooks `useLoginForm`, `useRegisterForm` y `useAuthRedirect` (rebote de usuarios ya autenticados en `/auth/*`) SHALL invocar `router.replace("/pos")` con la ruta hardcodeada, evitando saltos intermedios y open-redirects derivados de query params. La raíz del proyecto `app/page.tsx` SHALL redirigir a `/pos` (en vez de `/dashboard`) cuando el usuario tiene una cookie `refreshToken` válida.

#### Scenario: Login exitoso aterriza en /pos
- **WHEN** un usuario envía credenciales válidas desde `/auth/login`
- **THEN** `useLoginForm` invoca `router.replace("/pos")` después de persistir el access token en `sessionStorage`

#### Scenario: Registro exitoso aterriza en /pos
- **WHEN** un usuario envía un registro válido desde `/auth/register`
- **THEN** `useRegisterForm` invoca `router.replace("/pos")` tras la respuesta 201 del backend

#### Scenario: Usuario ya autenticado que cae en /auth/*
- **WHEN** un usuario con sesión activa navega a `/auth/login` o `/auth/register`
- **THEN** `useAuthRedirect` invoca `router.replace("/pos")` durante el primer render

#### Scenario: Root redirige a /pos para autenticados
- **WHEN** un usuario autenticado navega a `/`
- **THEN** `app/page.tsx` invoca `redirect("/pos")` (en lugar de `/dashboard`)

#### Scenario: Sin salto intermedio por root
- **WHEN** se inspeccionan los hooks de auth y `app/page.tsx`
- **THEN** ningún hook ni página llama `router.replace("/dashboard")` ni `router.push("/dashboard")` como destino post-éxito; el destino es literalmente `"/pos"`

---

### Requirement: No se puede acceder al panel sin sesión iniciada
Cualquier ruta bajo el route group `(private)` SHALL ser inaccesible sin la cookie `refreshToken` válida. La protección es **doble** para evitar cualquier flash de UI privada:
1. **Capa middleware**: `middleware.ts` delega en `AuthMiddlewareAdapter`, que redirige a `/auth/login` con HTTP 307/302 cuando la cookie falta o es inválida en rutas de página privadas.
2. **Capa layout**: `app/(private)/layout.tsx` (Server Component) vuelve a leer `cookies().get("refreshToken")` y llama `redirect("/auth/login")` antes de renderizar el shell, como defensa en profundidad si el middleware fuera modificado o evadido.

Además, `app/page.tsx` (root) SHALL redirigir según presencia de cookie: `/pos` si hay sesión, `/auth/login` si no.

#### Scenario: Acceso sin cookie a `/dashboard`
- **WHEN** un usuario sin cookie `refreshToken` navega directamente a `/dashboard`
- **THEN** la respuesta es un redirect server-side a `/auth/login` (el HTML del shell privado NO MUST aparecer en ningún momento)

#### Scenario: Acceso sin cookie a cualquier ruta de `(private)`
- **WHEN** un usuario sin cookie navega a `/pos`, `/inventory`, `/billing`, `/settings` o cualquier ruta futura bajo `(private)`
- **THEN** el middleware redirige a `/auth/login` antes de invocar el layout

#### Scenario: Cookie inválida o expirada
- **WHEN** un usuario navega a una ruta privada con una cookie `refreshToken` que no pasa la verificación JWT
- **THEN** el middleware trata el caso como sin sesión y redirige a `/auth/login`

#### Scenario: Defensa en profundidad del layout
- **WHEN** un request alcanza `app/(private)/layout.tsx` sin cookie `refreshToken`
- **THEN** el layout invoca `redirect("/auth/login")` antes de renderizar `<NavigationRail />` o `<TopAppBar />`

#### Scenario: Root sin sesión
- **WHEN** un usuario sin cookie navega a `/`
- **THEN** `app/page.tsx` invoca `redirect("/auth/login")`

#### Scenario: Root con sesión
- **WHEN** un usuario con cookie válida navega a `/`
- **THEN** `app/page.tsx` invoca `redirect("/pos")`

---

### Requirement: Route group `(private)` para todas las rutas autenticadas
Todas las páginas del panel autenticado SHALL vivir bajo el route group `app/(private)/`. El segmento `(private)` no aparece en la URL pública. Cualquier ruta nueva del panel (POS, Inventario, Facturación) SHALL crearse dentro de este route group para heredar el layout compartido.

#### Scenario: Estructura de carpetas
- **WHEN** se inspecciona el árbol del proyecto
- **THEN** existe `app/(private)/layout.tsx` y `app/(private)/dashboard/page.tsx`, y NO existen páginas del panel fuera del route group

#### Scenario: URL pública sin segmento privado
- **WHEN** un usuario navega a `/dashboard`
- **THEN** Next.js resuelve `app/(private)/dashboard/page.tsx` sin mostrar `(private)` en la URL

---

### Requirement: Layout compartido del panel privado con NavigationRail y TopAppBar
`app/(private)/layout.tsx` SHALL ser un Server Component que envuelve todas las páginas autenticadas con: `<NavigationRail />` fijo a la izquierda (80px), `<TopAppBar />` fijo arriba (64px), un `<main>` con `pl-[80px] pt-16` y la carga del CSS de Material Symbols Outlined. El layout MUST leer la cookie `refreshToken` con `cookies()` de `next/headers` y llamar `redirect("/auth/login")` si no existe (defensa en profundidad sobre el middleware). NO MUST contener la directiva `"use client"`.

El contenedor root del layout SHALL aplicar `h-screen overflow-hidden` (o equivalente flex/grid) para que el `<aside>` del `NavigationRail` y el `<main>` puedan scrollear de forma independiente. El `<main>` SHALL declarar `overflow-y-auto` para tener su propio scroll vertical, desacoplado del scroll del rail.

#### Scenario: Layout es Server Component
- **WHEN** se inspecciona `app/(private)/layout.tsx`
- **THEN** no contiene `"use client"` en su primera línea y exporta `default function PrivateLayout({ children })`

#### Scenario: Renderiza el shell cuando hay cookie
- **WHEN** un usuario con cookie `refreshToken` válida navega a `/dashboard`
- **THEN** el HTML resultante contiene `<aside>` del NavigationRail, `<header>` del TopAppBar y `<main>` con el contenido de `page.tsx`

#### Scenario: Carga Material Symbols Outlined
- **WHEN** se inspecciona el layout privado `app/(private)/layout.tsx`
- **THEN** incluye el componente `<MaterialSymbolsLoader />` (cliente, `useEffect`) que inyecta dinámicamente `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap">` en `document.head` una única vez; la fuente NO se carga en el layout público para no penalizar `/auth/*`

#### Scenario: Root container locks viewport height
- **WHEN** se inspecciona el layout privado renderizado
- **THEN** el contenedor root tiene `h-screen` + `overflow-hidden` (o utilities Tailwind equivalentes) y el `<main>` tiene `overflow-y-auto`

#### Scenario: Rail y contenido scrollean de forma independiente
- **WHEN** el `<main>` tiene contenido que excede el viewport y el usuario scrollea dentro del `<main>`
- **THEN** el `<NavigationRail />` permanece estático visualmente (su scroll interno no se ve afectado) y viceversa

---

### Requirement: NavigationRail organism con destinos primarios y secundarios
`app/_components/organisms/NavigationRail/NavigationRail.tsx` SHALL renderizar una barra vertical fija de 80px de ancho, alto completo, con: logo Agrisas arriba, 4 destinos primarios (`Inicio`, `POS`, `Inventario`, `Facturación`) en el centro, 2 destinos secundarios (`Soporte`, `Cuenta`) abajo. Cada destino es un `<Link>` (Next.js) con icono Material Symbols + label `label-sm`. El active state SHALL aplicar `bg-primary-container text-on-primary-container rounded-xl scale-90` al destino cuya ruta coincida con `usePathname()`. Por usar `usePathname`, el componente SHALL ser client component (`"use client"`).

#### Scenario: Destinos primarios renderizados
- **WHEN** se inspecciona el HTML del NavigationRail
- **THEN** contiene exactamente 4 enlaces con `href` `/dashboard`, `/pos`, `/inventory`, `/billing` y sus respectivos iconos `dashboard`, `point_of_sale`, `inventory_2`, `receipt_long`

#### Scenario: Destinos secundarios en la parte inferior
- **WHEN** se inspecciona el HTML del NavigationRail
- **THEN** contiene enlaces a `/support` y `/account` con iconos `contact_support` y `account_circle` ubicados con `mt-auto`

#### Scenario: Active state en la ruta actual
- **WHEN** el usuario está en `/dashboard`
- **THEN** el enlace al Dashboard tiene clases `bg-primary-container text-on-primary-container` y los otros destinos no

#### Scenario: Navegación con click
- **WHEN** el usuario hace click en el destino "POS"
- **THEN** el router navega a `/pos` usando `next/link`

#### Scenario: NavigationRail no hace fetch ni accede a storage
- **WHEN** se inspecciona el archivo
- **THEN** no importa `fetch`, `axios`, `localStorage`, `sessionStorage` ni `document`

---

### Requirement: TopAppBar organism con título, búsqueda, acciones y avatar
`app/_components/organisms/TopAppBar/TopAppBar.tsx` SHALL renderizar una barra superior fija de 64px de alto, con `pl-24 pr-8`, conteniendo: título "Agrisas" (`text-headline-lg text-primary`), `SearchInput` (oculto en `<md`), `IconButton` de notificaciones, ayuda y settings, y un `Avatar` final. El componente acepta `userName: string`, `userEmail: string`, `avatarUrl?: string` como props y NO hace fetch.

#### Scenario: Renderiza con props
- **WHEN** `<TopAppBar userName="Admin" userEmail="admin@agrisas.com" />` se renderiza
- **THEN** el HTML muestra "Agrisas", el SearchInput, los 3 IconButton y el Avatar con `fallbackInitials="A"` (primera letra de `userName`)

#### Scenario: Avatar con src
- **WHEN** se pasa `avatarUrl="https://example.com/u.jpg"`
- **THEN** el Avatar renderiza `<img src="https://example.com/u.jpg" alt="...">`

#### Scenario: SearchInput oculto en móvil
- **WHEN** el viewport es <768px
- **THEN** el `SearchInput` tiene la clase `hidden md:flex` y no es visible

#### Scenario: TopAppBar es presentational
- **WHEN** se inspecciona el archivo
- **THEN** no contiene `fetch`, `useRouter().push`, `useEffect` con efectos secundarios ni accesos a storage

---

### Requirement: Navigation rail item catalogue
The shared private layout SHALL render a fixed `NavigationRail` (80px wide) on the left edge of the viewport with the agreed Material 3 visual language and the brand mark at the top. The rail SHALL be split into two groups: a primary group with the destinations of the panel and a secondary group at the bottom with support/account entries. Each destination is declared as a typed `RailItem` `{ key, href, icon, label, requires?, children? }` where `requires?` is an optional permission key string (`<resource>:<action>`) and `children?` is an optional array of nested `RailItem` (only one level of nesting). The primary group SHALL include the following items in this order:

1. `dashboard` (icon `dashboard`, href `/dashboard`, label `Inicio`, no `requires`).
2. `pos` (icon `point_of_sale`, href `/pos`, label `POS`, declares `requires: "sales:create"`).
3. `sales` (icon `receipt_long`, href `/sales`, label `Ventas`, declares `requires: "sales:read"`).
4. `quotes` (icon `request_quote`, href `/quotes`, label `Cotizaciones`, declares `requires: "quotes:read"`).
5. `returns` (icon `assignment_return`, href `/returns`, label `Devoluciones`, declares `requires: "returns:read"`).
6. `payments` (icon `payments`, href `/payments`, label `Abonos`, declares `requires: "payments:read"`).
7. `inventory` (icon `inventory_2`, href `/inventory`, label `Inventario`, declares `requires: "inventory:read"`).
7. `catalogs` (icon `category`, href `/catalogs`, label `Catálogos`, with `children`: `payment-methods` (`payment_methods:read`, icon `payments`, href `/catalogs/payment-methods`), `folios` (`folios:read`, icon `tag`, href `/catalogs/folios`), `departments` (`departments:read`, icon `apartment`, href `/catalogs/departments`), `branches` (`branches:read`, icon `store`, href `/catalogs/branches`), `providers` (`providers:read`, icon `local_shipping`, href `/catalogs/providers`), `products` (`products:read`, icon `inventory_2`, href `/catalogs/products`)).
8. `users` (icon `group`, href `/users`, label `Usuarios`, declares `requires: "users:read"`).
9. `roles` (icon `shield_person`, href `/roles`, label `Roles`, declares `requires: "roles:read"`).

Below the secondary items, the rail SHALL render a standalone logout action button (icon `logout`, `title="Cerrar sesión"`) that invokes `useLogout` and is disabled while the logout is in flight.

When a `RailItem` has `children`, the rail SHALL render the parent item normally (icon + label) and, on hover or click of the parent, SHALL display a flyout panel (`RailFlyout`) anchored to the right edge of the rail (`left: 80px`) containing the visible children rendered as horizontal rows with icon + label. The parent item SHALL be visible if AT LEAST ONE child is visible according to the standard `requires` permission check; if all children are still in `"loading"` state, the parent SHALL be shown optimistically. Clicking the parent's icon SHALL navigate to the parent's `href`. Clicking a child inside the flyout SHALL navigate to the child's `href` and close the flyout.

#### Scenario: Items without requires are always shown
- **WHEN** a `RailItem` has no `requires` property (e.g. `dashboard`)
- **THEN** the rail SHALL render the item for every authenticated user

#### Scenario: Authorized user sees the quotes item
- **WHEN** the current user's effective permissions include `quotes:read`
- **THEN** the rail SHALL render the `quotes` item (label "Cotizaciones", href `/quotes`, icon `request_quote`) between `sales` and `returns`

#### Scenario: Unauthorized user does not see the quotes item
- **WHEN** the current user's effective permissions do not include `quotes:read` and the permission check has resolved
- **THEN** the rail SHALL NOT render the `quotes` item

#### Scenario: Quotes item permission still loading
- **WHEN** the permission check for `quotes:read` is still in flight
- **THEN** the rail SHALL render the `quotes` item optimistically to avoid layout shift; the `QuotesListPage` route guard handles the unauthorized case if the check ultimately resolves to false

#### Scenario: Authorized user sees the returns item
- **WHEN** the current user's effective permissions include `returns:read`
- **THEN** the rail SHALL render the `returns` item (label "Devoluciones", href `/returns`, icon `assignment_return`) between `quotes` and `inventory`

#### Scenario: Unauthorized user does not see the returns item
- **WHEN** the current user's effective permissions do not include `returns:read` and the permission check has resolved
- **THEN** the rail SHALL NOT render the `returns` item

#### Scenario: Returns item permission still loading
- **WHEN** the permission check for `returns:read` is still in flight
- **THEN** the rail SHALL render the `returns` item optimistically to avoid layout shift; the `ReturnsListPage` route guard handles the unauthorized case if the check ultimately resolves to false

#### Scenario: Returns item active for detail routes
- **WHEN** the current pathname is `/returns/abc-123`
- **THEN** the `returns` item SHALL render with the active styling because `pathname.startsWith("/returns/")`

#### Scenario: Usuario con payments:read ve el item Abonos
- **WHEN** las permissions efectivas del usuario incluyen `payments:read`
- **THEN** el rail renderiza el item con label "Abonos", href `/payments`, icon `payments` entre "Devoluciones" e "Inventario"

#### Scenario: Usuario sin payments:read no ve el item
- **WHEN** las permissions efectivas del usuario NO incluyen `payments:read` y el check ha resuelto
- **THEN** el rail NO renderiza el item "Abonos"

#### Scenario: Item Abonos se muestra optimistamente durante loading
- **WHEN** `can("payments:read")` devuelve `"loading"` (check en vuelo)
- **THEN** el item "Abonos" es visible (comportamiento optimista, evita layout shift)

#### Scenario: Authorized user sees the sales item
- **WHEN** the current user's effective permissions include `sales:read`
- **THEN** the rail SHALL render the `sales` item (label "Ventas", href `/sales`) between `pos` and `quotes`

#### Scenario: Authorized user sees the pos item
- **WHEN** the current user's effective permissions include `sales:create`
- **THEN** the rail SHALL render the `pos` item (label "POS", href `/pos`) between `dashboard` and `sales`

#### Scenario: Authorized user sees the inventory item
- **WHEN** the current user's effective permissions include `inventory:read`
- **THEN** the rail SHALL render the `inventory` item (label "Inventario", href `/inventory`) between `payments` and `catalogs`

#### Scenario: Unauthorized user does not see the inventory item
- **WHEN** the current user's effective permissions do not include `inventory:read` and the permission check has resolved
- **THEN** the rail SHALL NOT render the `inventory` item

#### Scenario: Authorized user sees the users item
- **WHEN** the current user's effective permissions include `users:read`
- **THEN** the rail SHALL render the `users` item between `catalogs` and `roles`

#### Scenario: Authorized user sees the roles item
- **WHEN** the current user's effective permissions include `roles:read`
- **THEN** the rail SHALL render the `roles` item between `users` and the secondary group

#### Scenario: Unauthorized user does not see the users item
- **WHEN** the current user's effective permissions do not include `users:read` and the permission check has resolved
- **THEN** the rail SHALL NOT render the `users` item

#### Scenario: Unauthorized user does not see the roles item
- **WHEN** the current user's effective permissions do not include `roles:read` and the permission check has resolved
- **THEN** the rail SHALL NOT render the `roles` item

#### Scenario: Permission check still loading
- **WHEN** the permission check for a `requires`-gated item is still in flight
- **THEN** the rail SHALL render the item optimistically to avoid layout shift; the route guard on the destination page SHALL handle unauthorized access if the check ultimately resolves to false

#### Scenario: Active state of selected route
- **WHEN** the current pathname matches an item's `href` (or starts with `<href>/`)
- **THEN** that item SHALL render with the active styling (`bg-primary-container text-on-primary-container`)

#### Scenario: Quotes item active for detail routes
- **WHEN** the current pathname is `/quotes/abc-123` (or `/quotes/abc-123/edit`, or `/quotes/new`)
- **THEN** the `quotes` item SHALL render with the active styling because `pathname.startsWith("/quotes/")`

#### Scenario: Logout button always visible
- **WHEN** any authenticated user is on any private route
- **THEN** the logout button is rendered at the bottom of the NavigationRail, below the secondary items

#### Scenario: Logout button triggers session termination
- **WHEN** the user clicks the logout button
- **THEN** the button becomes disabled, the session is cleared, and the router navigates to `/auth/login`

#### Scenario: Catalogs parent visible when any child is allowed
- **WHEN** the user's permissions include at least one of `payment_methods:read`, `folios:read`, `departments:read`, `branches:read`, `providers:read`, `products:read`
- **THEN** the rail SHALL render the `catalogs` parent item between `inventory` and `users`

#### Scenario: Catalogs parent hidden when all children are denied
- **WHEN** the permission check has resolved and the user holds none of `payment_methods:read`, `folios:read`, `departments:read`, `branches:read`, `providers:read`, `products:read`
- **THEN** the rail SHALL NOT render the `catalogs` parent item

#### Scenario: Providers child rendered in the flyout
- **WHEN** the user holds `providers:read` and hovers the `catalogs` parent
- **THEN** the flyout SHALL include a `Proveedores` entry (icon `local_shipping`, href `/catalogs/providers`) in the children list

#### Scenario: Products child rendered in the flyout
- **WHEN** the user holds `products:read` and hovers the `catalogs` parent
- **THEN** the flyout SHALL include a `Productos` entry (icon `inventory_2`, href `/catalogs/products`) as the last child in the list

#### Scenario: Hovering catalogs opens the flyout
- **WHEN** the pointer enters the `catalogs` parent item
- **THEN** the rail SHALL render a `RailFlyout` panel adjacent to the rail (anchored at `left: 80px`, aligned vertically with the parent) showing the visible child items as horizontal rows

#### Scenario: Clicking the catalogs parent navigates to the hub
- **WHEN** the user clicks the `catalogs` parent icon
- **THEN** the router SHALL navigate to `/catalogs`

#### Scenario: Clicking a child in the flyout navigates and closes
- **WHEN** the user clicks "Formas de pago" in the flyout
- **THEN** the router SHALL navigate to `/catalogs/payment-methods` and the flyout SHALL close

#### Scenario: Flyout closes on mouse leave
- **WHEN** the pointer leaves both the `catalogs` parent and the flyout panel
- **THEN** the flyout SHALL close

#### Scenario: Child active state propagates to parent
- **WHEN** the current pathname starts with `/catalogs/`
- **THEN** the `catalogs` parent SHALL render with the active styling AND the matching child inside the flyout SHALL also be marked active when the flyout is open

---

### Requirement: NavigationRail con scroll vertical independiente
`NavigationRail` SHALL estructurarse internamente en tres regiones flex verticales: (1) header fijo con el logo Agrisas (no scrolleable), (2) sección media scrolleable que contiene los items primarios y secundarios con `flex-1 overflow-y-auto`, y (3) footer fijo con el botón de logout (`flex-shrink-0`, no scrolleable). El rail SHALL ocupar `h-screen` y la sección media SHALL aplicar la utility `scrollbar-thin` para una scrollbar discreta acorde al design system Material 3 "Agro-Systemic".

Cuando la altura combinada de items visibles (primarios + secundarios) exceda el alto disponible de la sección media, el usuario SHALL poder hacer scroll vertical exclusivamente dentro de esa sección para alcanzar TODOS los items renderizados, sin afectar el scroll del `<main>` ni de la página.

El item activo (cuya ruta coincide con `usePathname()`) SHALL ser desplazado a la vista (`scrollIntoView({ block: "nearest" })`) al cambiar de ruta si su `getBoundingClientRect()` indica que está fuera del viewport de la sección scrolleable.

#### Scenario: Items inferiores alcanzables con scroll en viewport reducido
- **WHEN** el viewport tiene un alto de 480px y el usuario tiene permisos para todos los items (rail con ≥10 items + secundarios + logout)
- **THEN** el item `roles` (último primario) y el botón de logout son alcanzables: roles vía scroll dentro de la sección media; logout siempre visible en el footer fijo

#### Scenario: Logo permanece anclado arriba
- **WHEN** el usuario scrollea dentro de la sección media del rail
- **THEN** el logo Agrisas del header NO se mueve (permanece sticky en la parte superior del rail)

#### Scenario: Logout permanece anclado abajo
- **WHEN** el usuario scrollea dentro de la sección media del rail
- **THEN** el botón de logout permanece visible en el footer del rail

#### Scenario: Scrollbar utility aplicada
- **WHEN** se inspecciona el HTML/CSS de la sección media del rail
- **THEN** tiene la clase `scrollbar-thin` (o equivalente) que produce una scrollbar de 8px de ancho con thumb `outline-variant` y fallback `scrollbar-width: thin` para Firefox

#### Scenario: Scroll del rail es independiente del scroll del main
- **WHEN** el usuario scrollea dentro del rail
- **THEN** la posición vertical del `<main>` no cambia, y viceversa

#### Scenario: Item activo fuera de vista se desplaza a vista
- **WHEN** el usuario navega a una ruta cuyo `RailItem` activo correspondiente está fuera del viewport del rail
- **THEN** el rail invoca `element.scrollIntoView({ block: "nearest" })` para hacerlo visible sin alterar el scroll del `<main>`

#### Scenario: Sin librerías externas de scroll
- **WHEN** se inspecciona `package.json` y los imports de `NavigationRail`
- **THEN** no aparecen dependencias como `react-custom-scrollbars`, `simplebar`, `overlayscrollbars` ni similares

---

### Requirement: RailFlyout con scroll vertical interno cuando overflow
`RailFlyout` (submenú anclado a `left: 80px` desde el `RailItem` padre con `children`) SHALL aplicar `max-height: calc(100vh - 32px)` (16px de margen vertical superior + 16px inferior) y `overflow-y-auto` con la utility `scrollbar-thin` para que los children sean alcanzables incluso cuando exceden el viewport.

#### Scenario: Flyout scrollea cuando children exceden el alto
- **WHEN** el viewport tiene un alto de 360px y el flyout de `catalogs` muestra ≥6 children
- **THEN** el flyout aplica `max-height: calc(100vh - 32px)` y un scroll interno permite alcanzar el último child sin recortar contenido

#### Scenario: Flyout no recorta children al borde del viewport
- **WHEN** el flyout se abre cerca del borde superior o inferior del viewport
- **THEN** el flyout queda inscrito en `[16px, viewportHeight - 16px]` y nunca se sale del viewport

#### Scenario: Scrollbar coherente con el rail
- **WHEN** se inspecciona el HTML del flyout
- **THEN** tiene la clase `scrollbar-thin` (misma utility que la sección media del rail)
