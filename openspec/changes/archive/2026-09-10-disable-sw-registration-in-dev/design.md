## Context

`ServiceWorkerRegistrar.tsx` (`app/_components/organisms/ServiceWorkerRegistrar/ServiceWorkerRegistrar.tsx`) es un client component montado globalmente que registra `public/sw.js` en `useEffect` sin distinguir entorno. `public/sw.js` cachea cache-first todo bajo `/_next/static/` bajo el supuesto de que esos nombres están hasheados por contenido — verdadero en un build de producción, falso en `next dev`, donde chunks de code-splitting dinámico se sirven en rutas estables sin cache-buster por build. El resultado (Historia #1): cualquier restart del dev server deja el browser con chunks cacheados obsoletos, y el runtime de webpack nuevo no encuentra el module factory esperado → `TypeError: Cannot read properties of undefined (reading 'call')`, hydration crash, página en blanco. Reproducido y confirmado en esta sesión (afecta `/auth/login`, previsiblemente cualquier ruta) comparando un browser con el SW ya registrado (falla) contra un browser limpio vía Playwright headless (funciona).

## Goals / Non-Goals

**Goals:**
- (Historia #1) Que el registro del SW sea exclusivo de `NODE_ENV === "production"`, eliminando la clase de bug para todo developer futuro sin tocar la lógica de cacheo en sí.
- Preservar el comportamiento de producción exactamente igual a hoy (mismo registro, mismo `sw.js`).

**Non-Goals:**
- No se limpia el SW ya registrado en browsers existentes — eso requiere acción manual del usuario (DevTools → Application → Service Workers → Unregister), documentada en el proposal, fuera del alcance de lo que un cambio de código puede hacer desde el cliente sin ejecutar lógica adicional de auto-unregister (ver Alternativas descartadas).
- No se modifica la estrategia de cacheo de `public/sw.js` — es correcta para producción.
- No se introduce un mecanismo de "kill switch" remoto para el SW ni versión de cache bump — fuera de alcance de este bug puntual.

## Decisions

**D1 — Guard por `process.env.NODE_ENV === "production"`, no por una env var custom.**
Next.js inyecta `NODE_ENV` en build time y lo reemplaza estáticamente en el bundle del cliente (`production`/`development`/`test`), así que el guard es fiable y no depende de configuración adicional ni de una variable pública (`NEXT_PUBLIC_*`) que un usuario pudiera manipular en runtime. Alternativa descartada: una env var custom (`NEXT_PUBLIC_ENABLE_SW`) — añade superficie de configuración innecesaria para un valor que Next.js ya expone correctamente.

**D2 — No auto-desregistrar el SW viejo desde el propio código.**
Se consideró añadir, en el mismo `useEffect`, una rama que en dev llame a `navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()))` para autolimpiar cualquier registro previo. Se descarta: el propósito de este componente pasa a ser "no interactuar con el SW en absoluto fuera de producción" — añadir lógica de unregister activa en dev reintroduce complejidad y un nuevo camino de código a mantener y testear, por un problema que ya no puede volver a ocurrir hacia adelante una vez el fix está desplegado. El unregister manual documentado en el proposal cubre la migración única de quienes ya tienen el SW viejo.

**D3 — Sin cambios en `public/sw.js`.**
Su lógica es correcta para el contrato que realmente cumple en producción (nombres content-hashed). Tocarlo introduciría riesgo en el comportamiento de producción para resolver un problema que sólo existe en dev.

## Risks / Trade-offs

- **[Riesgo] El guard usa `process.env.NODE_ENV` — si algún entorno de staging/preview corre con `NODE_ENV=production` pero se espera comportamiento de dev (sin SW), el SW se registraría ahí igual.** → Mitigación: es el comportamiento correcto y esperado — cualquier deploy real (incluyendo preview de Vercel) construye con `NODE_ENV=production`, que es exactamente donde SÍ se quiere el SW activo (PWA/offline funcionando). No hay entorno legítimo de este proyecto donde se necesite "build de producción sin SW".
- **[Trade-off] Developers con el SW ya roto de sesiones previas siguen bloqueados hasta hacer el unregister manual una vez.** → Aceptado: no hay forma de que código nuevo alcance un Service Worker ya registrado y potencialmente "atascado" sirviendo una versión vieja del propio código de unregister sin depender de que ese SW viejo eventualmente sirva el bundle actualizado — que es justamente lo que está roto. Se documenta el paso manual en el proposal/reporte al usuario.

## Migration Plan

1. Aplicar el guard en `ServiceWorkerRegistrar.tsx`.
2. Deploy normal (PR → `develop` → merge → deploy). Comportamiento de producción sin cambios.
3. Comunicar a cualquier developer del equipo que ya haya corrido `npm run dev` antes de este fix: desregistrar el SW una vez en su browser (DevTools → Application → Service Workers → Unregister, o "Clear storage").
4. Rollback: revertir el commit — no hay estado persistido que revertir (el guard es puramente condicional).

## Open Questions

Ninguna.
