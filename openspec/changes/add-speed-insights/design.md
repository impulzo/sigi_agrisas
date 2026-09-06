## Context

El panel es Next.js 14 App Router, desplegado en Vercel (proyecto `sigi-agrisas`, team `kevin-hernandezs-projects`, plan Hobby). Ver `proposal.md` para la motivación completa. Dos piezas existentes del repo interceptan tráfico del mismo origen antes de que llegue a su destino:

- `middleware.ts` (matcher `"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|...)).*)"`) delega en `authMiddleware` (`src/modules/auth/infrastructure/middleware/AuthMiddlewareAdapter.ts`). Cualquier ruta no listada en `PUBLIC_PATHS`/`PUBLIC_PREFIXES` que no sea `/api/` recibe un 302 a `/auth/login` si no hay cookie `refreshToken` válida.
- `public/sw.js`, service worker hecho a mano (sin `next-pwa`): para cualquier `GET` de mismo origen que no sea `/api/**` ni `/_next/static/**`, aplica cache-first (rama final, línea ~91-104).

`@vercel/speed-insights@2.0.0` (v2) sirve su script y su endpoint de ingesta bajo un `<unique-path>` aleatorio asignado por Vercel en build, además de exponer rutas fijas bajo `/_vercel/speed-insights/*`. El beacon de métricas es un `POST` sin extensión de archivo — el matcher actual de `middleware.ts` sólo excluye por extensión o por los tres prefijos fijos, así que **hoy ese POST entraría al middleware** y, al no ser `/api/`, sería tratado como navegación de página y redirigido con 302 a `/auth/login`. Los docs oficiales de Vercel no garantizan que la plataforma resuelva `/_vercel/*` antes de ejecutar el middleware del proyecto, así que no se puede asumir que esto no ocurra.

## Goals / Non-Goals

**Goals:**
- Cubrir historias 1-3 de `proposal.md`: instrumentación con redacción de URL, blindaje de middleware/service worker, gating por entorno.
- Cero cambios de comportamiento observable en rutas de negocio (auth, RBAC, branch scoping) — la única superficie nueva es el prefijo `/_vercel/`.
- Componente y función de redacción testeables de forma aislada (unit, sin red).

**Non-Goals:**
- Speed Insights Plus (desglose completo de Core Web Vitals, Drains) — requiere plan Pro; fuera de alcance, sólo Real Experience Score en Hobby.
- Web Analytics (`@vercel/analytics`) — paquete y cuota distintos, no se toca aquí.
- Cualquier optimización de rendimiento derivada de las métricas — este change sólo instrumenta.

## Decisions

**1. Gating vía `beforeSend` que retorna `null`, no `sampleRate={0}`.**
`sampleRate` es un número de configuración de muestreo pensado para reducir volumen manteniendo representatividad estadística; `0` como "apagado" es una interpretación indirecta y no está documentada como el mecanismo soportado para gating binario por entorno. `beforeSend` es la primitiva explícita del paquete para "filtrar o descartar el evento antes de enviarlo" (retornar `null` lo ignora) — ver Historia 3. Alternativa descartada: no montar `<SpeedInsights />` en absoluto fuera de producción (`if (enabled) return <SpeedInsights />`); se rechaza porque entonces no habría modo `debug` visible en consola durante desarrollo/preview para verificar que la instrumentación está bien cableada antes de llegar a producción.

**2. Redacción de URL en un módulo puro separado (`redactSpeedInsightsUrl.ts`), no inline en `beforeSend`.**
Permite testear los casos límite (múltiples UUIDs, query string, entrada inválida) sin montar React ni mockear el paquete de Vercel. Sigue el patrón ya usado en el repo para lógica de dominio pura sin I/O (ej. `computeTotalsClient`, `DosificationPriceCalculator`).

**3. `enabled`/`debug` como props booleanas calculadas en el Server Component (`app/layout.tsx`), no leídas dentro del client component.**
`process.env.VERCEL_ENV` es una variable de servidor (no tiene prefijo `NEXT_PUBLIC_`), por lo que debe leerse en el árbol de servidor y pasarse como prop serializable al client component `SpeedInsightsTracker`. Alternativa descartada: exponer `NEXT_PUBLIC_VERCEL_ENV` — añade una variable de entorno nueva que hay que configurar en cada entorno (local, preview, producción) cuando `VERCEL_ENV` ya la provee Vercel automáticamente en todo deploy.

**4. Blindaje en dos capas independientes (matcher + `PUBLIC_PREFIXES`), no sólo una.**
El matcher de `middleware.ts` decide si la función de middleware se ejecuta; `PUBLIC_PREFIXES` decide, dentro de la función, si la petición se trata como pública. Sólo tocar el matcher sería suficiente para el caso feliz, pero `AuthMiddlewareAdapter` ya tiene un mecanismo idéntico para `/_next/` — usarlo para `/_vercel/` mantiene consistencia y añade `stripIdentityHeaders` de regalo (ver Historia 2, criterio de seguridad de headers de identidad), que el matcher solo no proveería si algún día el matcher cambia de forma independiente al adapter.

**5. Bypass de `/_vercel/` en `public/sw.js` mediante un `return` temprano, mismo patrón que `isApiRequest`.**
El service worker ya tiene la función `isApiRequest(url)` con un `return` temprano en el handler de `fetch` (línea ~50) antes de aplicar cualquier estrategia de caché. Replicar el patrón para `/_vercel/` es la mínima intervención consistente con el estilo existente del archivo — no se introduce abstracción nueva (helper genérico de "prefijos excluidos") porque sólo hay dos casos y el archivo es explícitamente comentado caso por caso.

## Risks / Trade-offs

- **[Riesgo] El script de Speed Insights usa un `<unique-path>` aleatorio por deployment; el service worker no puede excluirlo por nombre exacto.** → Mitigación: se deja en la rama de cache-first genérica (última, línea ~91-104), lo cual es inocuo — el path cambia en cada deploy, así que una entrada de caché vieja simplemente nunca se vuelve a pedir; no hay riesgo de servir un script obsoleto de un deploy anterior porque la URL ya no existe.
- **[Riesgo] `VERCEL_ENV` es `undefined` en `npm run dev` local.** → Mitigación explícita en el diseño: `enabled = VERCEL_ENV === "production"` es `false` por defecto (no requiere un valor especial para "desarrollo"), y `debug = !enabled` cubre local igual que preview.
- **[Trade-off] No se usa `sampleRate` para reducir aún más el volumen en producción.** → Aceptado: el panel es de uso interno (pocas sucursales), lejos de los 10 000 eventos/30 días del plan Hobby; se puede añadir `sampleRate` después si el volumen real lo justifica, sin cambiar la spec.
- **[Riesgo] Habilitar "Speed Insights" en el dashboard de Vercel es un paso manual fuera del repo.** → Mitigación: documentado explícitamente en el plan de verificación (`tasks.md`); sin ese paso el script carga pero Vercel no factura ni muestra datos (comportamiento documentado por Vercel, no es un bug de esta implementación).

## Migration Plan

**Corrección post-ejecución**: el plan original asumía un deploy de preview por PR seguido de una promoción separada a producción vía `master`. La ejecución real reveló (vía `mcp__vercel__list_deployments`) que el proyecto Vercel no genera deploys de preview por PR — `develop` es la rama de producción configurada en Vercel (coincide con "PR#69 es la versión productiva" del contexto inicial del usuario). Pasos 1 y 3 de abajo reflejan lo que realmente se ejecutó, no la suposición original.

1. Mergear PR a `develop` (con confirmación explícita del usuario, dado que no hay entorno de preview intermedio donde probar primero) → Vercel redeploya automáticamente y promueve a `target:"production"`. Verificar con `curl` contra el dominio público del proyecto (`sigi-agrisas.vercel.app` — **no** el alias `sigi-agrisas-git-develop-*.vercel.app`, que tiene Vercel Deployment Protection/SSO delante y nunca llega a la app) que `POST /_vercel/speed-insights/vitals` ya no devuelve 302 y que las rutas de negocio (`/dashboard`, `/api/v1/admin/branches`) mantienen su comportamiento de auth sin cambios.
2. Habilitar "Speed Insights" manualmente en el dashboard del proyecto `sigi-agrisas`.
3. No aplica un paso adicional de "mergear a `master`" — el merge a `develop` del paso 1 YA es el deploy a producción en este proyecto. Confirmar `enabled=true` inspeccionando en un browser real (no `curl`, el script se inyecta client-side) que `window.si` está definido y el `<script src=".../<unique-path>/script.js">` carga sin errores.
4. **Rollback**: si algo falla, revertir el commit en `develop` (que redeploya automáticamente) — no hay migración de datos ni estado persistente involucrado; `@vercel/speed-insights` no escribe nada en la base de datos del proyecto.

## Open Questions

Ninguna — todas las decisiones necesarias para implementar quedaron resueltas arriba o ya fueron confirmadas por el usuario en `proposal.md`.
