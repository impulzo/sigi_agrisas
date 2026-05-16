## 1. Design tokens y configuración base

- [x] 1.1 Extender `tailwind.config.ts` con la paleta semántica Material 3 "Agro-Systemic" (primary, primary-container, on-primary, on-primary-container, primary-fixed/dim, secondary y secondary-container, tertiary y tertiary-fixed, surface + surface-container-lowest/low/high/highest, surface-variant, surface-dim, surface-bright, on-surface, on-surface-variant, inverse-surface/on-surface/primary, outline, outline-variant, error, error-container, on-error, on-error-container, background, on-background) preservando los tokens legacy `agrisas-*`
- [x] 1.2 Añadir en `tailwind.config.ts` la escala tipográfica del design system (`display-lg`, `headline-lg`, `headline-lg-mobile`, `title-md`, `body-lg`, `body-md`, `label-lg`, `label-sm`) con `font-size`, `line-height`, `letter-spacing` y `font-weight` integrados, y registrarla en `theme.extend.fontSize`
- [x] 1.3 Añadir la escala de spacing 8px (`xs=4px`, `sm=8px`, `md=16px`, `lg=24px`, `xl=32px`, `gutter=24px`, `margin-mobile=16px`, `margin-desktop=32px`, `base=8px`) en `theme.extend.spacing`
- [x] 1.4 Añadir border radius (`DEFAULT=0.25rem`, `lg=0.5rem`, `xl=0.75rem`, `full=9999px`) en `theme.extend.borderRadius`
- [x] 1.5 Verificar que `app/layout.tsx` carga la fuente Inter vía `next/font/google` y la expone como `--font-inter` global; no añadir Material Symbols aquí (se carga solo en el layout privado)
- [x] 1.6 Smoke test manual: arrancar `npm run dev`, abrir `/auth/login` y confirmar que la paleta legacy sigue funcionando (no hay regresión visual)
- [x] 1.7 Smoke test manual: crear un componente temporal con `bg-primary text-on-primary p-md rounded-xl text-display-lg` y confirmar que renderiza correctamente con los nuevos tokens

## 2. Átomo Icon (Material Symbols Outlined)

- [x] 2.1 Crear el tipo `IconName` (union de string literals) en `app/_components/atoms/Icon/icons.ts` con al menos los iconos usados en este change: `dashboard`, `point_of_sale`, `inventory_2`, `receipt_long`, `contact_support`, `account_circle`, `search`, `notifications`, `help_outline`, `settings`, `add`, `trending_up`, `trending_down`, `agriculture`, `warning`, `grain`, `science`, `energy_savings_leaf`
- [x] 2.2 Crear `app/_components/atoms/Icon/Icon.tsx` que renderice `<span className="material-symbols-outlined">{name}</span>`, acepte `name: IconName`, `size?: number`, `className?: string`
- [x] 2.3 Añadir `export * from "./Icon"` desde `app/_components/atoms/Icon/index.ts`
- [x] 2.4 Test unitario en `tests/unit/ui/_components/atoms/Icon.test.tsx`: render con `name="dashboard"`, snapshot del span con la clase correcta

## 3. Átomos adicionales

- [x] 3.1 Crear `app/_components/atoms/IconButton/IconButton.tsx` con props `{ icon: IconName; ariaLabel: string; onClick?: () => void; variant?: "filled" | "tonal" | "ghost" }`, sin lógica de red
- [x] 3.2 Crear `app/_components/atoms/Avatar/Avatar.tsx` con props `{ src?: string; alt: string; size?: "sm" | "md" | "lg"; fallbackInitials?: string }`, muestra `<img>` cuando hay src, sino círculo con iniciales
- [x] 3.3 Crear `app/_components/atoms/Chip/Chip.tsx` con props `{ label: string; tone?: "primary" | "success" | "warning" | "error"; icon?: IconName }`, `rounded-full px-3 py-1`
- [x] 3.4 Tests unitarios para IconButton, Avatar y Chip (render, variantes, fallback de Avatar) en `tests/unit/ui/_components/atoms/`

## 4. Moléculas

- [x] 4.1 Crear `app/_components/molecules/Card/Card.tsx` con props `{ children; tone?: "default" | "primary"; className? }`, default = `bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm`, primary = `bg-primary text-on-primary rounded-xl p-xl shadow-lg`
- [x] 4.2 Crear `app/_components/molecules/StatCard/StatCard.tsx` con props `{ label: string; value: string; trend?: { delta: string; direction: "up" | "down" }; icon?: IconName }`, valor con `text-display-lg`, label con `text-title-md text-on-surface-variant`, trend como Chip
- [x] 4.3 Crear `app/_components/molecules/SearchInput/SearchInput.tsx` con props `{ placeholder?: string; value?: string; onChange?: (v: string) => void }`, controlled input redondeado pill con icono `search`
- [x] 4.4 Tests unitarios para Card, StatCard y SearchInput en `tests/unit/ui/_components/molecules/`

## 5. NavigationRail organism

- [x] 5.1 Crear `app/_components/organisms/NavigationRail/items.ts` con dos arrays tipados (`primaryItems`, `secondaryItems`) — cada item: `{ key: string; href: string; icon: IconName; label: string }`
- [x] 5.2 Crear `app/_components/organisms/NavigationRail/NavigationRail.tsx` con directiva `"use client"`; usa `usePathname()` para calcular active state; renderiza `<aside class="fixed left-0 top-0 h-screen w-[80px] bg-surface-container-low border-r border-outline-variant flex flex-col items-center py-6 gap-y-6 z-50 shadow-sm">` con logo "A", `<nav>` con primarios, y bloque inferior `mt-auto` con secundarios
- [x] 5.3 Active item: `bg-primary-container text-on-primary-container rounded-xl w-14 h-14 scale-90`; inactive: `text-on-surface-variant w-14 h-14 hover:bg-surface-container-highest hover:text-on-surface rounded-xl`
- [x] 5.4 Test unitario en `tests/unit/ui/_components/organisms/NavigationRail.test.tsx`: mock de `usePathname` con `next/navigation`, asegurar que `/dashboard` renderiza con clase active solo en el destino Dashboard

## 6. TopAppBar organism

- [x] 6.1 Crear `app/_components/organisms/TopAppBar/TopAppBar.tsx` (Server Component) con props `{ userName: string; userEmail: string; avatarUrl?: string }`
- [x] 6.2 Header con `fixed top-0 right-0 z-40 bg-surface/90 backdrop-blur-md border-b border-outline-variant flex items-center justify-between h-16 w-full pl-24 pr-8`
- [x] 6.3 Lado izquierdo: `<h1 class="text-headline-lg font-bold text-primary">Agrisas</h1>` + `<SearchInput placeholder="Search data..." className="hidden md:flex" />`
- [x] 6.4 Lado derecho: 3 `<IconButton>` (notifications, help_outline, settings) + `<Avatar src={avatarUrl} alt={userName} fallbackInitials={userName.charAt(0)} size="md" />`
- [x] 6.5 Test unitario en `tests/unit/ui/_components/organisms/TopAppBar.test.tsx`: render con/sin `avatarUrl`, viewport mobile esconde SearchInput

## 7. Layout privado y redirección de root

- [x] 7.1 Crear `app/(private)/layout.tsx` como Server Component que: (a) lee `cookies().get("refreshToken")` y llama `redirect("/auth/login")` si falta; (b) lee `headers().get("x-user-email") ?? ""` y `x-user-id`; (c) renderiza `<link>` de Material Symbols en `<head>` (o usa `next/script` strategy `afterInteractive`); (d) compone `<NavigationRail />` + `<TopAppBar userName=... />` + `<main className="pl-[80px] pt-16 min-h-screen">{children}</main>`
- [x] 7.2 Decidir e implementar la carga de Material Symbols: opción A — añadir el `<link>` dentro de `<head>` vía un `<Head>` segmento (Next.js 14 App Router permite `next/head` sólo en client; usar `metadata` o un layout.tsx que retorne `<>` con un `<link>` directo NO funciona — usar el patrón Tailwind CDN aprobado en el design.md: inyectar la URL como fuente vía `theme.extend.fontFamily` no aplica). **Patrón final**: definir un componente cliente trivial `MaterialSymbolsLoader.tsx` que use `useEffect` para inyectar el `<link>` en `document.head` una sola vez, e incluirlo en el layout privado
- [x] 7.3 Crear `app/page.tsx` (root) como Server Component: lee `cookies().get("refreshToken")`; si existe → `redirect("/dashboard")`; si no → `redirect("/auth/login")`
- [x] 7.4 Test de integración manual: navegar a `/` sin sesión → debe redirigir a `/auth/login`; con sesión activa → `/dashboard`
- [x] 7.5 Smoke test manual: navegar a `/dashboard` sin cookie → debe redirigir a `/auth/login` (defensa en profundidad del layout)
- [x] 7.6 Confirmar que el middleware NO necesita cambios (matcher actual ya cubre `/dashboard`)

## 8. Tipos y services del feature dashboard (mock data)

- [x] 8.1 Crear `app/(private)/dashboard/_logic/types/domain.ts` con: `SalesKpi`, `InventorySummary`, `DashboardKpis = { salesToday: SalesKpi; inventory: InventorySummary }`, `LowStockAlert`, `ActivityEvent`, `LogisticsHub`
- [x] 8.2 Crear `app/(private)/dashboard/_logic/types/api.ts` con `export {}` y comentario placeholder explicando que los DTOs se añaden cuando el backend exista
- [x] 8.3 Crear `app/(private)/dashboard/_logic/services/getDashboardKpis.ts`: función async que devuelve `Promise.resolve(mockKpis)` con un dataset realista (totalToday 24850, trend +12.4% up, sparkline 8 valores, inventory totalItems 1240, categorías Seeds/Fertilizers/Pesticides con percent)
- [x] 8.4 Crear `app/(private)/dashboard/_logic/services/getLowStockAlerts.ts`: devuelve 3 alertas (Wheat Seeds critical, NPK 15-15-15 warning, Bio-Pesticide info)
- [x] 8.5 Crear `app/(private)/dashboard/_logic/services/getRecentActivity.ts`: devuelve 3 eventos (New sale isLatest=true, Inventory restocked, New supplier registered)
- [x] 8.6 Tests unitarios en `tests/unit/ui/(private)/dashboard/_logic/services/`: cada service resuelve con la shape correcta, acepta `fetchImpl` opcional sin error de tipo

## 9. Bloques del Dashboard

- [x] 9.1 Crear `app/(private)/dashboard/_blocks/DashboardHeader.tsx` con prop `userName`, eyebrow + título + botón "Nueva venta" (link a `/pos`)
- [x] 9.2 Crear `app/(private)/dashboard/_blocks/SalesCard.tsx` con prop `data: SalesKpi`, render del valor con `Intl.NumberFormat` USD, chip de trend, sparkline de 8 barras con altura porcentual derivada de `data.sparkline` normalizado
- [x] 9.3 Crear `app/(private)/dashboard/_blocks/InventoryCard.tsx` con prop `data: InventorySummary`, fondo primary, icono `agriculture`, totalItems con `Intl.NumberFormat`, 2-3 categorías con barra de progreso
- [x] 9.4 Crear `app/(private)/dashboard/_blocks/LowStockAlerts.tsx` con prop `alerts: LowStockAlert[]`, render condicional según severity, fallback "Sin alertas activas" cuando array vacío
- [x] 9.5 Crear `app/(private)/dashboard/_blocks/ActivityFeed.tsx` con prop `items: ActivityEvent[]`, timeline vertical con dot + línea conectora, botón "View All" sin handler
- [x] 9.6 Crear `app/(private)/dashboard/_blocks/LogisticsMap.tsx` con prop `data: LogisticsHub`, `<Image>` cubriendo el área, caja overlay con status indicator animado
- [x] 9.7 Añadir imagen placeholder en `public/dashboard/logistics-map.jpg` (cualquier imagen de mapa o gradiente verde de 1280x300 — documentar la fuente en commit)
- [x] 9.8 Tests unitarios para cada bloque en `tests/unit/ui/(private)/dashboard/_blocks/`: render con props mock, formato de números, branching por severity/direction/status

## 10. Página /dashboard

- [x] 10.1 Crear `app/(private)/dashboard/page.tsx` (Server Component) que:
  - `export const metadata = { title: "Dashboard | Agrisas" }`
  - lee `headers().get("x-user-email") ?? "Admin"` (o un fallback razonable)
  - llama `const [kpis, alerts, activity] = await Promise.all([getDashboardKpis(), getLowStockAlerts(), getRecentActivity()])`
  - renderiza `<DashboardHeader userName={userEmail.split("@")[0]} />`, luego el grid `grid grid-cols-1 md:grid-cols-12 gap-gutter` con los 5 bloques restantes y sus props
- [x] 10.2 Verificar visualmente que el bento grid se compone igual que el HTML descargado (`/tmp/dashboard.html`) — comparar lado a lado
- [x] 10.3 Smoke test manual con `npm run dev`: login → debe aterrizar en /dashboard, ver el shell + bento grid con mock data

## 11. Redirect post-login directo a `/dashboard`

- [x] 11.1 Cambiar `router.replace("/")` por `router.replace("/dashboard")` en `app/(public)/auth/_logic/hooks/useLoginForm.ts` (después del `sessionStorage.setItem` del access token)
- [x] 11.2 Mismo cambio en `app/(public)/auth/_logic/hooks/useRegisterForm.ts`
- [x] 11.3 Mismo cambio en `app/(public)/auth/_logic/hooks/useAuthRedirect.ts` (rebote server-aware de usuarios ya autenticados que aterrizan en `/auth/*`)
- [x] 11.4 Actualizar `tests/unit/ui/(public)/auth/_logic/hooks/useLoginForm.test.ts` y `useRegisterForm.test.ts`: el mock de `router.replace` SHALL ser invocado con `"/dashboard"` tras un submit exitoso (no con `"/"`)
- [x] 11.5 Smoke manual: login exitoso desde `/auth/login` aterriza directo en `/dashboard` sin pasar visiblemente por `/`

## 12. Verificación final

- [x] 12.1 `npm run build` pasa sin errores de tipo ni warnings de Next.js
- [x] 12.2 `npm test` pasa todos los unit tests nuevos y los existentes (auth, etc.)
- [x] 12.3 Smoke manual: `/auth/login` sigue mostrándose con la paleta legacy correcta (sin regresión)
- [x] 12.4 Smoke manual: `/dashboard` se ve fiel al diseño de Stitch (NavigationRail activo, TopAppBar con avatar, los 6 bloques en su lugar, colores M3)
- [x] 12.5 Smoke manual: redirecciones (`/` → `/dashboard` con sesión; `/` → `/auth/login` sin; `/dashboard` sin sesión → `/auth/login`)
- [x] 12.6 Lighthouse rápido en /dashboard: no perder más de 5 puntos en Performance comparado con /auth/login (Material Symbols como fuente bloqueante es el único costo aceptado)
- [x] 12.7 Confirmar que ningún componente bajo `_components/` o `_blocks/` importa `fetch`, `axios`, `localStorage`, `sessionStorage`, `document` ni `useRouter().push/replace` (grep en `app/`)
