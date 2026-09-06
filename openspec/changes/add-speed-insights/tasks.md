## 1. Dependencia

- [x] 1.1 Instalar `@vercel/speed-insights@^2.0.0` (`npm install @vercel/speed-insights@^2.0.0`)

## 2. Redacción de URL (función pura)

- [x] 2.1 Crear `app/_components/organisms/SpeedInsightsTracker/redactSpeedInsightsUrl.ts`: sustituye cada segmento UUID v4 del path por `:id`, elimina el query string, y devuelve la entrada sin cambios si no hay UUID/query o si la URL no es parseable (nunca lanza)
- [x] 2.2 Crear `tests/unit/ui/_components/SpeedInsightsTracker/redactSpeedInsightsUrl.test.ts` cubriendo: un UUID, múltiples UUIDs en la misma ruta, query descartado, ruta sin UUID intacta, entrada inválida no lanza

## 3. Componente instrumentador

- [x] 3.1 Crear `app/_components/organisms/SpeedInsightsTracker/SpeedInsightsTracker.tsx` (`"use client"`): envuelve `<SpeedInsights />` de `@vercel/speed-insights/next`, recibe props `enabled: boolean` y `debug: boolean`, y usa `beforeSend` para: retornar `null` si `!enabled`, o retornar `{ ...data, url: redactSpeedInsightsUrl(data.url) }` si `enabled`
- [x] 3.2 Crear `tests/unit/ui/_components/SpeedInsightsTracker/SpeedInsightsTracker.test.tsx` con mock de `@vercel/speed-insights/next` que capture las props recibidas: verificar que `beforeSend` devuelve `null` con `enabled=false`, que devuelve el objeto con `url` redactada con `enabled=true`, y que `debug` se propaga sin transformar

## 4. Montaje en el layout raíz

- [x] 4.1 En `app/layout.tsx`, calcular `enabled = process.env.VERCEL_ENV === "production"` y `debug = !enabled` en el Server Component
- [x] 4.2 Montar `<SpeedInsightsTracker enabled={enabled} debug={debug} />` junto a `<ServiceWorkerRegistrar />`

## 5. Blindaje del middleware de autenticación

- [x] 5.1 En `middleware.ts`, añadir `_vercel` a la alternancia negativa del `matcher` junto a `_next/static`, `_next/image`, `favicon.ico`
- [x] 5.2 En `src/modules/auth/infrastructure/middleware/AuthMiddlewareAdapter.ts`, añadir `"/_vercel/"` a `PUBLIC_PREFIXES`
- [x] 5.3 Añadir caso de test en `tests/unit/modules/auth/infrastructure/middleware/AuthMiddlewareAdapter.test.ts`: `POST /_vercel/speed-insights/vitals` sin cookie ni token → `NextResponse.next()` (no 302, no 401), y sin headers `x-user-*` propagados aunque la petición los incluya

## 6. Blindaje del service worker

- [x] 6.1 En `public/sw.js`, añadir un `return` temprano en el handler de `fetch` para `url.pathname.startsWith("/_vercel/")`, antes de las estrategias de caché, con el mismo estilo de comentario que el bypass existente de `/api/**`

## 7. Verificación local

- [x] 7.1 Correr `npm test` — suite completa (node + jsdom) en verde
- [x] 7.2 Correr `npm run build` — confirmar que compila sin errores y que `app/layout.tsx` no pasa a ruta dinámica por el cambio
- [x] 7.3 Correr `npm run dev`, iniciar sesión con `admin@example.com` / `admin1234` vía Playwright (`mcp__playwright__*`), navegar `/pos` y `/sales`, y confirmar en consola logs de modo debug de Speed Insights y **cero** requests de red a `/vitals`

## 8. Verificación en preview (Vercel)

**Nota de ejecución**: este proyecto Vercel NO genera deploys de preview por PR (verificado con `list_deployments`: todo el historial de deploys `target:"production"` viene de pushes/merges a `develop`, ninguno de ramas feature). `develop` es efectivamente la rama de producción configurada en Vercel. Confirmado con el usuario — se mergeó el PR directo a `develop` y se verificó contra el redeploy resultante en `https://sigi-agrisas.vercel.app`.

- [x] 8.1 Abrir PR contra `develop` (nunca contra `master`) y esperar el deploy de preview — [PR #70](https://github.com/impulzo/sigi_agrisas/pull/70), mergeado a `develop` con confirmación del usuario
- [x] 8.2 Confirmar que el script de Speed Insights carga — vía Playwright contra `sigi-agrisas.vercel.app` post-deploy: `<script src="https://sigi-agrisas.vercel.app/9ff039bc37ca9a9f/script.js">` presente en el DOM, `window.si` inicializado, cero errores de página. El `<unique-path>` de v2 no aparece en el HTML estático (se inyecta client-side vía `document.createElement`), confirmado con browser real, no con `curl`
- [x] 8.3 `POST /_vercel/speed-insights/vitals` sin body → **400** (`FST_ERR_VALIDATION`, validación propia de Vercel), NO 302. Confirmado además que esta ruta la intercepta la capa de plataforma de Vercel ANTES del middleware de Next.js — el mismo 400 aparecía incluso en el deploy viejo sin el blindaje del middleware. El blindaje de `middleware.ts`/`AuthMiddlewareAdapter` sigue siendo defensa en profundidad válida, pero no era la única barrera real
- [x] 8.4 Regresión de auth confirmada contra `sigi-agrisas.vercel.app` post-deploy: `/dashboard` sin cookie → 307 a `/auth/login`; `/api/v1/admin/branches` sin Bearer → 401
- [x] 8.5 Cache Storage verificado vía Playwright con sesión real logueada contra `sigi-agrisas.vercel.app`: SW `activated`, cero entradas `/_vercel/` en ninguna de las dos caches (`agrisas-shell-v1`, `agrisas-static-v1`). El script del `<unique-path>` no quedó cacheado en esta corrida (timing: SW aún activando durante el primer load) — incidental, no afecta la garantía pedida

## 9. Habilitación en Vercel y cierre

- [ ] 9.1 Confirmar que "Speed Insights" está habilitado en el dashboard del proyecto `sigi-agrisas` (team `kevin-hernandezs-projects`) — pendiente de confirmación del usuario, quien tiene el dashboard abierto en `https://vercel.com/kevin-hernandezs-projects/sigi-agrisas/speed-insights`
- [x] 9.2 ~~Mergear a `master`~~ — no aplica: `develop` ES la rama de producción real en este proyecto Vercel (hallazgo de la sección 8); el merge a `develop` (PR #70) ya desplegó el cambio a producción
- [ ] 9.3 Tras tráfico real, confirmar datos visibles en la pestaña Speed Insights del proyecto (requiere paso de tiempo, no verificable de inmediato)
- [ ] 9.4 Correr `opsx:verify` del change — **no archivar** hasta indicación explícita del usuario
