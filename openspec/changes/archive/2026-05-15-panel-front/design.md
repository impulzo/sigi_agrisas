## Context

El panel privado de Agrisas todavía no existe en el árbol `app/`. Después de iniciar sesión, el usuario aterriza en una ruta inexistente — el middleware lo deja pasar pero no hay layout ni página. Stitch (proyecto `5227157529282603342`, "Agrisas Admin & POS Dashboard") aprobó un design system Material 3 "Agro-Systemic" y cuatro pantallas (Dashboard, POS, Inventario, Facturación). Este change implementa **solo el shell del panel y la página Dashboard**; las otras tres páginas vendrán en changes posteriores que ya podrán reutilizar el shell.

Restricciones que aplican:

- Arquitectura del frontend definida en `CLAUDE.md`: Atomic Design + Route Groups + `_logic` por feature; los `_components/` y `_blocks/` son presentational puros.
- El backend hexagonal en `src/` no se toca (frontend-only).
- Los datos del Dashboard son **mock**: los services del feature devuelven fixtures síncronos. Cuando exista el backend (KPIs, inventario, etc.), solo se reescribe la implementación del service.
- El sistema de auth ya valida JWT y propaga `x-user-id`/`x-user-email` por headers; el shell puede leerlos desde `next/headers`.
- La página `/auth/login` actual usa los tokens legacy `agrisas-*`; el change debe coexistir con ellos sin romper la UI de auth.

## Goals / Non-Goals

**Goals:**
- Servir `/dashboard` como página post-login con el bento grid del diseño Stitch.
- Establecer el shell privado (NavigationRail + TopAppBar) reutilizable por POS, Inventario y Facturación en changes futuros.
- Migrar `tailwind.config.ts` al design system Material 3 "Agro-Systemic" sin romper auth.
- Definir el contrato `services con datos mock → hook → bloque` que servirá de plantilla para los demás módulos.
- Adoptar Material Symbols Outlined como icon set único del panel para mantener fidelidad con Stitch.

**Non-Goals:**
- POS, Inventario, Facturación (cada uno será un change separado).
- Refactor de la UI de `/auth/*` para usar la nueva paleta M3.
- Endpoints reales `/api/v1/dashboard/*` (backend lo entrega después).
- Persistencia de preferencias de UI (tema oscuro/claro, idioma, colapso del rail).
- Real-time updates (websockets / SSE para el feed de actividad).
- Tests E2E con Playwright (la carpeta `tests/e2e/` sigue reservada).
- Internacionalización: el panel usa textos en español hardcodeados.

## Decisions

### Decisión 1 — Route group `(private)` con layout server-component compartido
Todas las páginas autenticadas viven bajo `app/(private)/`. `app/(private)/layout.tsx` es un Server Component que:
1. Lee `cookies()` de `next/headers` para verificar `refreshToken`. Si falta, hace `redirect("/auth/login")` ANTES de renderizar.
2. Renderiza el shell: `<NavigationRail />` + `<TopAppBar />` + `<main>{children}</main>`.
3. Inyecta el `<link>` de Material Symbols en el `<head>` vía `next/font` o directamente.

**Por qué**: el middleware ya redirige a `/auth/login` cuando no hay cookie, pero hacerlo también en el layout es defensa en profundidad — evita un flash de UI privada si el middleware fuera modificado. Además, el layout puede leer `x-user-id`/`x-user-email` que el middleware inyecta y pasarlos como prop al TopAppBar.

**Alternativas descartadas**:
- *Client-side guard con `useEffect`* — produce flash, mala UX y rompe SSR.
- *Layout único en `app/layout.tsx`* — mezcla rutas públicas y privadas, viola la convención de route groups documentada en `CLAUDE.md`.

### Decisión 2 — NavigationRail y TopAppBar como organisms reutilizables en `app/_components/organisms/`
Ambos son **presentational puros** (sin fetch ni navigation). Reciben:
- `NavigationRail` recibe `activeKey: "dashboard" | "pos" | "inventory" | "billing"` y un array de items tipado; el active state se calcula desde el layout leyendo `usePathname()` en un mini wrapper client component (`NavigationRail.tsx` será `"use client"` solo por `usePathname`).
- `TopAppBar` recibe `userName`, `userEmail`, `avatarUrl?` como props.

**Por qué**: separar el componente UI puro del cálculo del active state permite reutilizar el rail en Storybook y en tests sin depender del enrutador. Las rutas se definen como un objeto tipado en `app/_components/organisms/NavigationRail/items.ts`.

**Alternativas descartadas**:
- *NavigationRail como Server Component sin estado activo* — cada destino tendría que computar su propio active y duplicaría lógica.
- *Usar `next-themes` o `usePathname` directamente en el layout server* — `usePathname` solo funciona client-side; mezclarlo en server romper SSR.

### Decisión 3 — Design tokens Material 3 "Agro-Systemic" en `tailwind.config.ts`, paleta legacy conservada
`tailwind.config.ts` añade ~50 tokens semánticos M3 (primary, on-primary, primary-container, on-primary-container, primary-fixed, secondary, secondary-container, tertiary, surface, surface-container, surface-container-lowest/low/high/highest, outline, outline-variant, error, error-container, …) Y mantiene los tokens legacy `agrisas-dark/medium/light/mint` para que `/auth/*` no se rompa.

Escalas añadidas:
- **Tipografía**: `text-display-lg` (57/64), `text-headline-lg` (32/40), `text-title-md` (16/24), `text-body-lg` (16/24), `text-body-md` (14/20), `text-label-lg` (14/20), `text-label-sm` (11/16) — todas con `font-weight` y `letter-spacing` integrados.
- **Spacing**: `xs=4`, `sm=8`, `md=16`, `lg=24`, `xl=32`, `gutter=24`, `margin-mobile=16`, `margin-desktop=32` — usables como `p-md`, `gap-gutter`, etc.
- **Border radius**: `DEFAULT=0.25rem`, `lg=0.5rem`, `xl=0.75rem`, `full=9999px`.

**Por qué Material 3**: Stitch generó el design system desde el branding Agrisas; M3 ofrece variables semánticas (`on-primary`, `surface-container`) que escalan a tema oscuro sin renombrar clases. Coincide con el rol del panel: data-heavy admin tool.

**Por qué conservar legacy**: refactorizar auth no es objetivo de este change y rompería una UI ya entregada y probada. El sprint posterior puede migrar auth y eliminar los tokens legacy.

**Alternativas descartadas**:
- *Reemplazar legacy ahora* — fuera de alcance, riesgo de regresión en login/register tests.
- *Usar CSS vars en `globals.css` en vez de tokens Tailwind* — pierde IntelliSense y purging eficiente.

### Decisión 4 — Material Symbols Outlined vía Google Fonts, no librería React
El icon set del panel es Material Symbols Outlined cargado por `<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined...">` en `app/(private)/layout.tsx`. Los iconos se usan como `<span className="material-symbols-outlined">dashboard</span>`.

**Por qué**: el diseño de Stitch fue generado con Material Symbols; usar la fuente preserva fidelidad pixel-perfect y evita instalar `@mui/icons-material` (~5MB) o mantener un wrapper SVG por icono. El tradeoff es un request extra a Google Fonts; aceptable porque el panel ya carga Inter del mismo CDN.

**Alternativas descartadas**:
- *`lucide-react`*: API React-friendly pero diferente set visual (rompe fidelidad con Stitch).
- *`@mui/icons-material`*: pesado y trae styled-components implícito.
- *SVGs locales*: mantenimiento alto para ~30 iconos en uso.

Componente atom `<Icon name="dashboard" />` envuelve el `<span>` para centralizar tipado y permitir futura migración sin cambiar callsites.

### Decisión 5 — Mock data en services con interfaz estable
Cada service en `app/(private)/dashboard/_logic/services/` exporta una función `async` que devuelve datos tipados. La implementación actual devuelve fixtures síncronos envueltos en `Promise.resolve(...)`; el día que exista el backend, solo se cambia el cuerpo a `fetch("/api/v1/dashboard/...")`.

```ts
// _logic/services/getDashboardKpis.ts
export async function getDashboardKpis(fetchImpl: typeof fetch = fetch): Promise<DashboardKpis> {
  return Promise.resolve(mockKpis);
}
```

**Por qué**:
- El parámetro `fetchImpl` se mantiene desde el primer día — los tests pueden inyectar fakes sin tocar el módulo.
- Los hooks de `_logic/hooks/` consumen el service sin saber si es mock o real.
- Los bloques nunca tocan los fixtures directamente — toda la pirámide queda intacta.

**Alternativas descartadas**:
- *Fixtures inline en el bloque* — viola la separación presentational; obliga a duplicar para tests.
- *MSW (Mock Service Worker)* — overkill para un change que aún no hace HTTP real.

### Decisión 6 — Sparkline y mini-map como CSS puro / `<img>` placeholder
El sparkline del KPI de ventas se renderiza como 8 `<div>` con altura porcentual (`h-[40%]`, `h-[55%]`, …) y gradiente de opacidad sobre `bg-primary`, igual que el HTML de Stitch. El "mini map" es un `<Image>` de Next.js con `priority={false}` apuntando a `/public/dashboard/logistics-map.jpg` (placeholder local que se commitea con el cambio).

**Por qué**: implementar charts reales (Recharts, Victory) excede el alcance "mock data". El sparkline CSS comunica la idea visual sin dependencias; cuando exista data real, se sustituye por un componente Chart.

**Alternativas descartadas**:
- *Recharts ya*: ~70KB gzip y data shape rígido sin backend.
- *SVG inline con coordenadas*: más correcto pero más código por algo desechable.

### Decisión 7 — `app/page.tsx` como redirector según cookie
`app/page.tsx` (root) sigue siendo Server Component. Lee `cookies()`:
- Si hay `refreshToken` válido → `redirect("/dashboard")`.
- Si no → `redirect("/auth/login")`.

**Por qué**: hoy no hay home pública; el root es una puerta de entrada. Validar la cookie en este punto permite que el middleware no tenga que hacer match especial para `/`.

### Decisión 8 — Bloques del Dashboard alineados 1-a-1 con secciones del bento
El layout del Dashboard es un `<div class="grid grid-cols-12 gap-gutter">` que contiene 6 bloques:
1. `<DashboardHeader />` — bienvenida + botón "Nueva venta" (col-span-12).
2. `<SalesCard />` — KPI total ventas + sparkline (col-span-8).
3. `<InventoryCard />` — KPI inventario fondo primary (col-span-4).
4. `<LowStockAlerts />` — lista de alertas (col-span-5).
5. `<ActivityFeed />` — timeline de actividad reciente (col-span-7).
6. `<LogisticsMap />` — placeholder de mapa (col-span-12).

Cada bloque recibe sus datos por props desde `dashboard/page.tsx`, que es el único punto que llama a los services.

**Por qué**: facilita testear cada bloque aisladamente con datos sintéticos en RTL; mantiene la página como orquestador puro.

## Risks / Trade-offs

- **Riesgo de divergencia visual entre Stitch y el implementado** → Mitigación: durante implementación, comparar lado-a-lado screenshot del bloque vs. el HTML descargado de Stitch en `/tmp/dashboard.html` y `/tmp/dashboard-pos.html`. Aceptar variaciones menores de spacing pero respetar paleta y tipografía exactas.
- **Riesgo de que el shell privado quede acoplado al Dashboard** → Mitigación: NavigationRail y TopAppBar viven en `_components/organisms/`, no en `_blocks/`; cualquier cambio a estos requiere pensar en POS/Inventario/Facturación también.
- **Riesgo de mock-data drift cuando llegue el backend** → Mitigación: los tipos en `_logic/types/domain.ts` y los DTOs en `_logic/types/api.ts` están separados desde el día uno; cuando llegue el backend, los DTOs cambian y el mapper traduce.
- **Riesgo de iconos Material Symbols cargando lento** → Mitigación: `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />` y `display=swap` en la URL de la fuente; aceptamos un FOIT mínimo en favor de fidelidad.
- **Riesgo de explosión de tokens en `tailwind.config.ts`** → Mitigación: los tokens M3 se agrupan visualmente con comentarios `// --- M3 colors ---`, `// --- M3 typography ---`; cuando se elimine la paleta legacy, queda solo el bloque M3.
- **Riesgo de que el redirect en `app/page.tsx` colisione con la home pública futura** → Mitigación: si en el futuro hay una landing pública, se mueve `app/page.tsx` a `app/(public)/landing/page.tsx` y el root pasa a redirigir condicionalmente. Cambio trivial.

## Migration Plan

No hay datos en producción que migrar (cambio puramente frontend). Pasos de despliegue:
1. Merge del change → `tailwind.config.ts` se rebuilt automáticamente.
2. Smoke test manual en local: login → debe aterrizar en `/dashboard`, ver shell + bento grid con mock data.
3. Verificar que `/auth/login` y `/auth/register` siguen renderizando con la paleta legacy intacta.

Rollback: revertir el commit; no hay efectos persistentes.

## Open Questions

- ¿El botón "Nueva venta" del DashboardHeader debe navegar a `/pos` (que aún no existe) o a un modal? Decisión provisional: `<Link href="/pos">` que mostrará 404 mientras POS no exista. Documentado para revisar cuando se proponga `panel-pos`.
- ¿La búsqueda del TopAppBar debe ser global o por módulo? Decisión provisional: input visual sin lógica (no submit handler todavía). Marcar como TODO.
- ¿El layout del panel debe ser responsive a móvil con BottomNavigationBar? El design.md de Stitch lo menciona pero las 4 pantallas son desktop-only. Decisión provisional: NavigationRail se oculta `<768px` y se muestra como drawer hamburguesa básico; no implementamos BottomNavigationBar hasta tener flujo móvil real.
