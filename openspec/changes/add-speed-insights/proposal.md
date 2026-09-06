## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Administrador del sistema | Como Administrador del sistema, quiero que el panel reporte Core Web Vitals reales a Vercel Speed Insights para poder identificar rutas lentas (POS, listados paginados, detalle de venta) en dispositivos reales de sucursal | Hoy no hay telemetría de rendimiento de usuario real; decisiones de optimización se toman a ciegas | - `<SpeedInsights />` montado en `app/layout.tsx` vía import `@vercel/speed-insights/next`<br>- En build de producción el script `<unique-path>/script.js` carga 200 en `<head>`<br>- Tras tráfico real, la pestaña **Speed Insights** del proyecto `sigi-agrisas` muestra datos (Real Experience Score) | - URLs de recursos con identificador (`/sales/<uuid>`, `/catalogs/customers/<uuid>`, etc.) se redactan a `/sales/:id` antes de salir del navegador vía `beforeSend`; ningún UUID real llega a Vercel<br>- Query strings (pueden llevar `?search=<rfc o nombre>`) se descartan completos en `beforeSend`, nunca se envían<br>- Función de redacción (`redactSpeedInsightsUrl`) es pura, sin I/O, y no lanza ante URL inválida — nunca rompe el render si falla |
| 2 | Administrador del sistema | Como Administrador del sistema, quiero que el middleware de autenticación y el service worker ignoren las rutas `/_vercel/*` para que el beacon de métricas nunca sea redirigido a `/auth/login` ni cacheado incorrectamente | El matcher de `middleware.ts` es casi total y `AuthMiddlewareAdapter` redirige todo lo no reconocido; sin excepción explícita, el `POST /_vercel/speed-insights/vitals` (sin extensión, no es `/api/`) se perdería con un 302 | - `middleware.ts`: `_vercel` añadido a la exclusión negativa del matcher<br>- `AuthMiddlewareAdapter.ts`: `"/_vercel/"` añadido a `PUBLIC_PREFIXES`<br>- Test nuevo en `AuthMiddlewareAdapter.test.ts`: `POST /_vercel/speed-insights/vitals` sin cookie → `NextResponse.next()`, no 302/401, sin headers `x-user-*` propagados<br>- `public/sw.js`: bypass explícito de `/_vercel/` antes del cache-first genérico, mismo patrón que el bypass ya existente de `/api/**` | - `stripIdentityHeaders` sigue aplicándose a `/_vercel/*` (defensa en profundidad: cualquier `x-user-*` que llegue del cliente se descarta, igual que en `/_next/`)<br>- No se abre ninguna ruta de negocio nueva: la excepción es exclusiva del prefijo `/_vercel/`, verificado con regresión de que `/dashboard` sin cookie sigue 302 y `/api/v1/admin/branches` sin Bearer sigue 401 |
| 3 | Administrador del sistema | Como Administrador del sistema, quiero que sólo se envíen eventos reales a Vercel cuando el entorno sea producción, para no agotar la cuota gratuita de 10 000 eventos/30 días del plan Hobby (compartida entre preview y producción, con pausa de ingesta de 14 días al excederse) | El plan Hobby no tiene margen para recibir tráfico de cada preview deployment además del de producción; agotar la cuota apagaría la telemetría real durante 2 semanas | - `enabled = process.env.VERCEL_ENV === "production"` leído en el Server Component (`app/layout.tsx`)<br>- `beforeSend` retorna `null` (descarta el evento) cuando `enabled` es `false`<br>- `debug = !enabled`: en local/preview el script corre en modo debug (logs en consola), nunca envía beacon<br>- Verificado manualmente en `npm run dev`: cero requests a `/vitals` en Network tab | - Ninguna: gating es sólo de costo/cuota, no expone ni oculta datos sensibles adicionales a lo ya cubierto en la historia 1 |

Nota: el feature se dividió en 3 historias independientes (INVEST) — instrumentación+redacción, blindaje de interceptores, gating por entorno — cada una verificable y desplegable por separado.

## Why

El panel está en producción (hasta PR#69) sin ninguna telemetría de rendimiento de usuario real. No hay forma de saber si el POS, los listados paginados server-side (`sales`, `quotes`, `providers`, `products`) o el detalle de venta son lentos en los dispositivos reales de sucursal — sólo se puede especular. Vercel Speed Insights captura Core Web Vitals desde el navegador del usuario final sin backend propio, y el proyecto ya corre sobre Vercel (`sigi-agrisas`, plan Hobby), así que activarlo es de bajo costo. El repo tiene dos piezas que interceptan tráfico del mismo origen y que el quickstart oficial no contempla — el middleware de auth (matcher casi total, redirige a `/auth/login` lo que no reconoce) y un service worker hecho a mano que cachea GETs — por lo que la instrumentación no es un simple "pegar el componente": requiere blindar ambos puntos para no perder beacons ni cachear el script de terceros, y gatear el envío por entorno para no agotar la cuota gratuita compartida entre preview y producción.

## What Changes

- Instalar dependencia `@vercel/speed-insights@^2.0.0` (peer-compatible con `next@14.2.35` + `react@^18`).
- Nuevo componente `app/_components/organisms/SpeedInsightsTracker/SpeedInsightsTracker.tsx` (client component) que envuelve `<SpeedInsights />` de `@vercel/speed-insights/next` con `beforeSend` para redactar URLs y gatear el envío por entorno.
- Nueva función pura `app/_components/organisms/SpeedInsightsTracker/redactSpeedInsightsUrl.ts`: sustituye segmentos UUID v4 de la URL por `:id` y elimina el query string.
- `app/layout.tsx`: monta `<SpeedInsightsTracker enabled={...} debug={...} />` junto a `<ServiceWorkerRegistrar />`, leyendo `process.env.VERCEL_ENV` en el Server Component.
- `middleware.ts`: excluir `_vercel` en el matcher (mismo patrón que `_next/static`, `_next/image`, `favicon.ico`).
- `src/modules/auth/infrastructure/middleware/AuthMiddlewareAdapter.ts`: añadir `"/_vercel/"` a `PUBLIC_PREFIXES` (defensa en profundidad, igual que `/_next/`).
- `public/sw.js`: bypass explícito de `/_vercel/` antes del cache-first genérico, mismo patrón que el bypass ya existente de `/api/**`.
- Tests nuevos: `redactSpeedInsightsUrl.test.ts`, `SpeedInsightsTracker.test.tsx`, y un caso nuevo en `AuthMiddlewareAdapter.test.ts` para `POST /_vercel/speed-insights/vitals`.

## Capabilities

### New Capabilities
- `observability`: telemetría de rendimiento de usuario real (Core Web Vitals) vía Vercel Speed Insights — instrumentación, redacción de URLs con identificadores, y gating por entorno.

### Modified Capabilities
(ninguna — no cambia el comportamiento de negocio de auth/branch-scoping; sólo se añade una excepción de infraestructura al middleware y al service worker para no interferir con el tráfico de telemetría de un tercero)

## Impact

- **Código nuevo**: `app/_components/organisms/SpeedInsightsTracker/` (componente + función pura + tests).
- **Código modificado**: `app/layout.tsx`, `middleware.ts`, `src/modules/auth/infrastructure/middleware/AuthMiddlewareAdapter.ts`, `public/sw.js`.
- **Dependencias**: `+@vercel/speed-insights@^2.0.0` en `package.json`.
- **Infraestructura externa**: requiere habilitar "Speed Insights" en el dashboard del proyecto `sigi-agrisas` (Vercel, team `kevin-hernandezs-projects`, plan Hobby) tras el deploy.
- **Sin impacto en**: rutas de negocio, RBAC, branch scoping, esquema de base de datos, APIs `/api/v1/**`.
