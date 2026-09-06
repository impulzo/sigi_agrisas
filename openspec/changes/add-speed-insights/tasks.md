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

- [ ] 8.1 Abrir PR contra `develop` (nunca contra `master`) y esperar el deploy de preview
- [ ] 8.2 En la URL de preview, confirmar que `<unique-path>/script.js` carga con 200 en el `<head>`
- [ ] 8.3 `curl -s -o /dev/null -w "%{http_code}" -X POST <preview-url>/_vercel/speed-insights/vitals` → confirmar que NO responde 302 (regresión del blindaje de middleware)
- [ ] 8.4 Regresión de auth: `curl -I <preview-url>/dashboard` sin cookie → sigue 302 a `/auth/login`; `curl <preview-url>/api/v1/admin/branches` sin Bearer → sigue 401
- [ ] 8.5 En DevTools → Application → Cache Storage del preview, confirmar que no aparecen entradas bajo `/_vercel/`

## 9. Habilitación en Vercel y cierre

- [ ] 9.1 Habilitar "Speed Insights" en el dashboard del proyecto `sigi-agrisas` (team `kevin-hernandezs-projects`)
- [ ] 9.2 Mergear a `master`, confirmar deploy a producción
- [ ] 9.3 Tras tráfico real, confirmar datos visibles en la pestaña Speed Insights del proyecto
- [ ] 9.4 Correr `opsx:verify` del change — **no archivar** hasta indicación explícita del usuario
