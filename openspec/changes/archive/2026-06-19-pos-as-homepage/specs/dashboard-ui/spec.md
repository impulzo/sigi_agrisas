## MODIFIED Requirements

### Requirement: Página /dashboard como Server Component de orquestación

`app/(private)/dashboard/page.tsx` SHALL ser un Server Component que llama a los services del feature (`getDashboardKpis`, `getLowStockAlerts`, `getRecentActivity`) y pasa los datos por props a los bloques. La página exporta `metadata` con `title: "Dashboard | Agrisas"`. NO MUST contener `"use client"` ni lógica de fetch inline. Adicionalmente, la página SHALL leer el header `x-user-roles` y, si el string no contiene `"admin"`, SHALL invocar `redirect("/pos")` antes de renderizar cualquier contenido.

#### Scenario: Página es Server Component

- **WHEN** se inspecciona `app/(private)/dashboard/page.tsx`
- **THEN** no contiene `"use client"` y la función exportada es `async`

#### Scenario: Llama a los services del feature

- **WHEN** se inspecciona `page.tsx`
- **THEN** importa de `./_logic/services/getDashboardKpis`, `./_logic/services/getLowStockAlerts`, `./_logic/services/getRecentActivity` y los invoca con `await Promise.all(...)`

#### Scenario: Composición de bloques con datos

- **WHEN** se renderiza `/dashboard` con un usuario admin
- **THEN** el HTML contiene los 6 bloques: `<DashboardHeader />`, `<SalesCard />`, `<InventoryCard />`, `<LowStockAlerts />`, `<ActivityFeed />`, `<LogisticsMap />`, cada uno recibiendo los datos por props desde el padre

#### Scenario: Metadata exportada con nuevo título

- **WHEN** se ejecuta `next build`
- **THEN** la página exporta `export const metadata = { title: "Dashboard | Agrisas" }`

#### Scenario: No-admin es redirigido a /pos

- **WHEN** un usuario con rol `operator` o `viewer` navega directamente a `/dashboard`
- **THEN** el Server Component lee `x-user-roles` del header, detecta la ausencia de `"admin"` e invoca `redirect("/pos")`

#### Scenario: Admin accede normalmente

- **WHEN** un usuario con rol `admin` navega a `/dashboard`
- **THEN** el header `x-user-roles` contiene `"admin"`, no se invoca redirect y la página renderiza el contenido completo del dashboard
