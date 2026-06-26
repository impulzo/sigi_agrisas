## MODIFIED Requirements

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

## ADDED Requirements

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
