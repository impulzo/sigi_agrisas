# Spec: dashboard-ui

## Purpose

Define el comportamiento de la interfaz del Dashboard: página `/dashboard` como Server Component de orquestación, bento grid layout, los 6 bloques de UI (DashboardHeader, SalesCard, InventoryCard, LowStockAlerts, ActivityFeed, LogisticsMap), los services mock con interfaz estable para cuando llegue el backend real, y los tipos de dominio y DTOs HTTP separados.

---

## Requirements

### Requirement: Página /dashboard como Server Component de orquestación
`app/(private)/dashboard/page.tsx` SHALL ser un Server Component que llama a los services del feature (`getDashboardKpis`, `getLowStockAlerts`, `getRecentActivity`) y pasa los datos por props a los bloques. La página exporta `metadata` con `title: "Inicio | Agrisas"`. NO MUST contener `"use client"` ni lógica de fetch inline.

#### Scenario: Página es Server Component
- **WHEN** se inspecciona `app/(private)/dashboard/page.tsx`
- **THEN** no contiene `"use client"` y la función exportada es `async`

#### Scenario: Llama a los services del feature
- **WHEN** se inspecciona `page.tsx`
- **THEN** importa de `./_logic/services/getDashboardKpis`, `./_logic/services/getLowStockAlerts`, `./_logic/services/getRecentActivity` y los invoca con `await Promise.all(...)`

#### Scenario: Composición de bloques con datos
- **WHEN** se renderiza `/dashboard`
- **THEN** el HTML contiene los 6 bloques: `<DashboardHeader />`, `<SalesCard />`, `<InventoryCard />`, `<LowStockAlerts />`, `<ActivityFeed />`, `<LogisticsMap />`, cada uno recibiendo los datos por props desde el padre

#### Scenario: Metadata exportada
- **WHEN** se ejecuta `next build`
- **THEN** la página exporta `export const metadata = { title: "Inicio | Agrisas" }`

---

### Requirement: Bento grid layout del Dashboard
El contenido principal de `/dashboard` SHALL renderizarse dentro de `<main class="pl-[80px] pt-16">` con un contenedor `max-w-7xl mx-auto p-gutter space-y-gutter` y un grid `grid grid-cols-1 md:grid-cols-12 gap-gutter`. Los 6 bloques SHALL ocupar las columnas siguientes en desktop (md+):
- `DashboardHeader`: col-span-12.
- `SalesCard`: col-span-8.
- `InventoryCard`: col-span-4.
- `LowStockAlerts`: col-span-12 lg:col-span-5.
- `ActivityFeed`: col-span-12 lg:col-span-7.
- `LogisticsMap`: col-span-12.

#### Scenario: Grid responsive
- **WHEN** el viewport es <768px
- **THEN** el grid colapsa a `grid-cols-1` y cada bloque ocupa toda la fila

#### Scenario: Distribución desktop
- **WHEN** el viewport es ≥1024px
- **THEN** `SalesCard` ocupa 8/12, `InventoryCard` 4/12, `LowStockAlerts` 5/12, `ActivityFeed` 7/12

---

### Requirement: DashboardHeader bloque con bienvenida y CTA "Nueva venta"
`app/(private)/dashboard/_blocks/DashboardHeader.tsx` SHALL renderizar un `<div>` con: eyebrow "Operational Overview" (`text-label-lg text-primary uppercase tracking-wider`), título `<h2>Welcome back, {userName}</h2>` (`text-headline-lg text-on-surface`), y un botón primario "Nueva venta" (`<Link href="/pos">`) con icono `add`, estilo `bg-primary text-on-primary rounded-xl px-6 py-3 font-title-md`. Acepta `userName: string` como prop.

#### Scenario: Renderiza con userName
- **WHEN** `<DashboardHeader userName="Admin" />`
- **THEN** muestra "Welcome back, Admin"

#### Scenario: Botón "Nueva venta" navega a /pos
- **WHEN** se inspecciona el HTML
- **THEN** el botón es un `<a href="/pos">` con icono `add` y texto "Nueva venta"

---

### Requirement: SalesCard bloque con KPI total ventas y sparkline
`app/(private)/dashboard/_blocks/SalesCard.tsx` SHALL renderizar una tarjeta `bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm min-h-[320px]` con: label "Total Sales Today" (`text-title-md text-on-surface-variant`), valor formateado como moneda (`text-display-lg text-on-surface`), chip de trend (`bg-primary-fixed/20 text-primary rounded-full px-3 py-1` con icono `trending_up`/`trending_down`) y un sparkline de 8 barras (`<div>` con altura porcentual y `bg-primary/{opacity}`). Acepta `data: SalesKpi` con shape `{ totalToday: number; trend: { delta: string; direction: "up" | "down" }; sparkline: number[] }`.

#### Scenario: Formato monetario
- **WHEN** `data.totalToday = 24850`
- **THEN** el bloque renderiza `$24,850.00` usando `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })`

#### Scenario: Trend up
- **WHEN** `data.trend.direction = "up"`
- **THEN** el chip muestra icono `trending_up` con `text-primary`

#### Scenario: Sparkline con 8 barras
- **WHEN** `data.sparkline.length === 8`
- **THEN** el bloque renderiza 8 `<div>` con altura proporcional al valor relativo y `bg-primary/{opacity}` creciente

---

### Requirement: InventoryCard bloque con KPI inventario y barras de progreso
`app/(private)/dashboard/_blocks/InventoryCard.tsx` SHALL renderizar una tarjeta con fondo `bg-primary text-on-primary rounded-xl p-xl shadow-lg`, conteniendo: icono `agriculture` (`text-4xl mb-4`), label "Inventory Status" (`text-title-md opacity-90`), valor `<p>{totalItems} Items</p>` (`text-headline-lg`), y una lista de categorías con barra de progreso (cada una con label, valor y barra `bg-on-primary/20` + fill `bg-primary-fixed`). Acepta `data: InventorySummary` con `{ totalItems: number; categories: { name: string; quantity: string; percent: number }[] }`.

#### Scenario: Total de items
- **WHEN** `data.totalItems = 1240`
- **THEN** muestra "1,240 Items" con `Intl.NumberFormat`

#### Scenario: Barras de progreso
- **WHEN** `data.categories = [{ name: "Seeds", quantity: "450kg", percent: 75 }, ...]`
- **THEN** cada categoría renderiza un `<div>` con `bg-on-primary/20` y fill interno con `style={{ width: "75%" }}` o `w-3/4`

---

### Requirement: LowStockAlerts bloque con lista de alertas
`app/(private)/dashboard/_blocks/LowStockAlerts.tsx` SHALL renderizar una tarjeta con header "Low Stock Alerts" + icono `warning` (`text-error`), y una lista de items. Cada item es un `<div>` con icono cuadrado (`h-10 w-10 rounded-lg`), nombre del producto (`text-title-md`), descripción (`text-label-sm text-on-surface-variant`) y botón "Restock" (`text-error` si severidad crítica, `text-primary` en caso contrario). Acepta `alerts: LowStockAlert[]` con `{ id: string; productName: string; message: string; severity: "critical" | "warning" | "info"; icon: IconName }`.

#### Scenario: Alerta crítica resaltada
- **WHEN** un alert tiene `severity: "critical"`
- **THEN** el item tiene fondo `bg-error-container/30 border border-error/10` y el botón "Restock" tiene `text-error`

#### Scenario: Alerta warning
- **WHEN** un alert tiene `severity: "warning"`
- **THEN** el item tiene fondo `bg-surface-container` y el botón "Restock" tiene `text-primary`

#### Scenario: Sin alertas
- **WHEN** `alerts = []`
- **THEN** el bloque muestra "Sin alertas activas" centrado con `text-on-surface-variant`

---

### Requirement: ActivityFeed bloque con timeline vertical
`app/(private)/dashboard/_blocks/ActivityFeed.tsx` SHALL renderizar una tarjeta con header "Recent Activity" + botón "View All" (`text-primary`), y una timeline vertical (`relative pl-6 space-y-8`) con punto y línea conectora. Cada item tiene un dot (`bg-primary` o `bg-outline` según `isLatest`), título (`text-title-md`), descripción inline en muted (`text-on-surface-variant`) y metadata (`text-label-sm`: tiempo relativo + invoice/warehouse). Acepta `items: ActivityEvent[]` con `{ id: string; title: string; subject: string; timestamp: string; meta: string; isLatest: boolean }`.

#### Scenario: Dot del item más reciente
- **WHEN** un item tiene `isLatest: true`
- **THEN** el dot es `bg-primary ring-4 ring-primary/20`

#### Scenario: Tiempo relativo
- **WHEN** `item.timestamp = "2 minutes ago"`
- **THEN** el bloque lo renderiza tal cual en `text-label-sm text-on-surface-variant`

---

### Requirement: LogisticsMap bloque con placeholder visual
`app/(private)/dashboard/_blocks/LogisticsMap.tsx` SHALL renderizar un contenedor `bg-surface-container-high rounded-xl overflow-hidden h-[300px] relative` con un `<Image>` de Next.js (`/public/dashboard/logistics-map.svg`) que cubre todo el área (`object-cover`), y una caja superpuesta en bottom-left con título del hub y status indicator (dot animado `bg-primary animate-pulse` + texto "All systems operational"). Acepta `data: { hubName: string; status: "operational" | "degraded" | "down"; mapImageSrc: string }`.

#### Scenario: Status operational
- **WHEN** `data.status = "operational"`
- **THEN** el dot tiene `bg-primary animate-pulse` y el texto dice "All systems operational"

#### Scenario: Status degraded
- **WHEN** `data.status = "degraded"`
- **THEN** el dot tiene `bg-secondary` y el texto dice "Performance degraded"

#### Scenario: Imagen del mapa
- **WHEN** se inspecciona el HTML
- **THEN** el `<Image>` apunta a `data.mapImageSrc` y tiene `alt` descriptivo

---

### Requirement: Services del feature dashboard con datos mock
`app/(private)/dashboard/_logic/services/` SHALL contener tres funciones async que devuelven fixtures tipados, exportadas para uso desde `page.tsx`:

- `getDashboardKpis(fetchImpl?: typeof fetch): Promise<DashboardKpis>`
- `getLowStockAlerts(fetchImpl?: typeof fetch): Promise<LowStockAlert[]>`
- `getRecentActivity(fetchImpl?: typeof fetch): Promise<ActivityEvent[]>`

Cada función acepta `fetchImpl` como parámetro opcional inyectable para tests. La implementación actual ignora `fetchImpl` y devuelve `Promise.resolve(mockData)`. Cuando llegue el backend, solo se reemplaza el cuerpo por `const res = await fetchImpl("/api/v1/dashboard/...")`.

#### Scenario: getDashboardKpis devuelve datos mock tipados
- **WHEN** se invoca `await getDashboardKpis()`
- **THEN** la promesa resuelve a un objeto `DashboardKpis` con `salesToday: SalesKpi`, `inventory: InventorySummary`

#### Scenario: getLowStockAlerts devuelve al menos 3 alertas mock
- **WHEN** se invoca `await getLowStockAlerts()`
- **THEN** devuelve un array con al menos 3 elementos, cada uno con `id`, `productName`, `message`, `severity` e `icon`

#### Scenario: getRecentActivity devuelve al menos 3 eventos
- **WHEN** se invoca `await getRecentActivity()`
- **THEN** devuelve un array con al menos 3 elementos, el primero con `isLatest: true`

#### Scenario: Tests pueden inyectar fetchImpl
- **WHEN** un test invoca `await getDashboardKpis(jest.fn())`
- **THEN** el service acepta el parámetro sin error de tipo (aunque la implementación mock no lo use)

---

### Requirement: Tipos de dominio y DTOs HTTP separados
`app/(private)/dashboard/_logic/types/` SHALL contener:
- `domain.ts` con los tipos del dominio frontend (`SalesKpi`, `InventorySummary`, `DashboardKpis`, `LowStockAlert`, `ActivityEvent`, `LogisticsHub`).
- `api.ts` reservado para los DTOs HTTP del futuro endpoint `/api/v1/dashboard/*`. Si todavía no hay DTOs reales, `api.ts` SHALL existir con un comentario placeholder y un `export {}` para que sea un módulo válido.

#### Scenario: domain.ts exporta los tipos
- **WHEN** se importa `import type { SalesKpi, InventorySummary, ... } from "./_logic/types/domain"`
- **THEN** TypeScript resuelve todos los tipos sin error

#### Scenario: api.ts existe aunque vacío
- **WHEN** se inspecciona `_logic/types/api.ts`
- **THEN** el archivo existe, contiene `export {};` y un comentario explicativo
