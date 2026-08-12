## MODIFIED Requirements

### Requirement: Layout compartido del panel privado con NavigationRail y TopAppBar
`app/(private)/layout.tsx` SHALL ser un Server Component que envuelve todas las páginas autenticadas con: `<NavigationRail />` fijo a la izquierda (80px), `<TopAppBar />` fijo arriba (64px), un `<main>` con `pl-20 pt-16` y la carga del CSS de Material Symbols Outlined. El layout MUST leer la cookie `refreshToken` con `cookies()` de `next/headers` y llamar `redirect("/auth/login")` si no existe (defensa en profundidad sobre el middleware). NO MUST contener la directiva `"use client"`.

El `<main>` SHALL declarar ÚNICAMENTE la geometría del chrome (`pl-20 pt-16`, que compensan exactamente los 80px del rail y los 64px de la barra) más `h-full overflow-y-auto`. NO MUST declarar padding de página, márgenes asimétricos (`pr-2.5` y similares) ni ancho máximo: el espaciado de página es responsabilidad exclusiva de `PageShell`, según la capability `design-system`.

El contenedor root del layout SHALL aplicar `h-screen overflow-hidden` (o equivalente flex/grid) para que el `<aside>` del `NavigationRail` y el `<main>` puedan scrollear de forma independiente. El `<main>` SHALL declarar `overflow-y-auto` para tener su propio scroll vertical, desacoplado del scroll del rail.

Ningún `layout.tsx` de módulo bajo `(private)` SHALL declarar padding, centrado ni ancho máximo (hoy `catalogs`, `roles` y `users` duplican `px-gutter py-lg max-w-screen-2xl mx-auto`). Su única responsabilidad es `metadata` y guards.

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

#### Scenario: El main no aporta padding de página
- **WHEN** se inspecciona la clase del `<main>` del layout privado
- **THEN** contiene `pl-20 pt-16 h-full overflow-y-auto` y no contiene ninguna utilidad de padding horizontal derecho, ni `max-w-*`, ni `mx-auto`

#### Scenario: Layouts de módulo sin espaciado propio
- **WHEN** se inspeccionan los `layout.tsx` bajo `app/(private)/`
- **THEN** ninguno declara `px-*`, `py-*`, `mx-auto` ni `max-w-*`

#### Scenario: Iconos con la familia cargada
- **WHEN** un componente bajo `app/` renderiza un icono con una clase de familia de Material Symbols
- **THEN** usa `material-symbols-outlined`, la única familia que `MaterialSymbolsLoader` carga; no existe ningún uso de `material-symbols-rounded`
