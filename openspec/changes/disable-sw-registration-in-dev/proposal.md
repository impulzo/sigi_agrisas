## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Desarrollador corriendo `npm run dev` localmente | Como desarrollador, quiero que `ServiceWorkerRegistrar` sólo registre `public/sw.js` cuando `process.env.NODE_ENV === "production"` para que reiniciar el dev server nunca deje mi browser sirviendo chunks de webpack cacheados y obsoletos | Hoy el registro ocurre en cualquier entorno; el SW asume (correcto sólo en build de producción) que todo bajo `/_next/static/` es content-hashed y cacheable indefinidamente, pero en dev los chunks dinámicos se piden sin el query `?v=` que distingue builds, así que un reinicio del server deja al SW sirviendo factories de módulo obsoletos → `TypeError: Cannot read properties of undefined (reading 'call')`, hydration crash y pantalla en blanco en cualquier ruta | - Given `NODE_ENV !== "production"` (dev o test), When `ServiceWorkerRegistrar` monta, Then `navigator.serviceWorker.register` NUNCA se invoca<br>- Given `NODE_ENV === "production"`, When `ServiceWorkerRegistrar` monta y `"serviceWorker" in navigator`, Then se invoca `navigator.serviceWorker.register("/sw.js")` exactamente igual que hoy (sin regresión)<br>- Given un browser que YA tiene el SW registrado de una sesión de dev anterior a este fix, When visita el panel de nuevo en dev tras el fix, Then el componente no intenta re-registrar, pero el SW viejo sigue activo hasta que el usuario lo desregistre manualmente (el fix no puede limpiar registros previos desde el cliente sin acción del usuario) | - El guard debe leer `process.env.NODE_ENV` (inyectado en build time por Next.js), nunca una variable de entorno pública custom que un atacante pudiera manipular en runtime del cliente<br>- No se modifica `public/sw.js` — su estrategia cache-first para `/_next/static/` sigue vigente y correcta en producción, este fix no debe debilitar el cacheo real de producción |

Nota: una sola historia — el fix es atómico (un guard de entorno en un componente), no amerita partirse. `public/sw.js` queda fuera de alcance a propósito (ya es correcto para prod).

## Why

`ServiceWorkerRegistrar` (`app/_components/organisms/ServiceWorkerRegistrar/ServiceWorkerRegistrar.tsx`) registra `public/sw.js` incondicionalmente, sin distinguir `next dev` de un build de producción. El propio `sw.js` documenta la suposición que lo hace seguro sólo en producción: `isNextStaticAsset()` cachea cache-first todo bajo `/_next/static/` con el comentario "Content-hashed by Next.js build — safe to cache indefinitely, a new deploy simply produces new URLs that were never in this cache". Esa premisa es cierta cuando Next.js genera nombres de archivo con hash de contenido (`build`), pero en modo dev los chunks servidos por code-splitting dinámico se piden por su ruta estable (sin el query `?v=<buildId>` que sí llevan los `<script>` iniciales del documento), así que el Service Worker los cachea igual. Cada `next dev` restart produce module ids/factories nuevos para esas mismas rutas de chunk, y el browser sigue sirviendo la copia cacheada vieja del SW — mismatch entre runtime de webpack y factory cacheado, produciendo `TypeError: Cannot read properties of undefined (reading 'call')` y un hydration crash que deja cualquier ruta en blanco (reproducido en `/auth/login` durante la verificación manual de `fix-self-permissions-guard`; confirmado ausente en un browser limpio sin el SW registrado, vía Playwright headless).

Es un bug transversal a todo el desarrollo local del proyecto, no a una feature puntual: cualquier desarrollador que visite el panel en dev queda con un SW que le rompe la app en el próximo restart del servidor, con un error que no da ninguna pista de su causa real.

## What Changes

- `ServiceWorkerRegistrar.tsx`: envolver la llamada a `navigator.serviceWorker.register("/sw.js")` en un guard `process.env.NODE_ENV === "production"` — en cualquier otro entorno (`development`, `test`), el componente monta pero no registra nada.
- Sin cambios en `public/sw.js` — su lógica de cacheo sigue siendo la correcta para producción.
- Sin cambios de esquema/DB/API.

## Capabilities

### New Capabilities

- `dev-service-worker`: comportamiento de registro condicional del Service Worker (`public/sw.js`) según entorno — sólo se registra en producción, nunca en dev/test.

### Modified Capabilities

(ninguna)

## Impact

- **Código afectado**: `app/_components/organisms/ServiceWorkerRegistrar/ServiceWorkerRegistrar.tsx` (único archivo tocado).
- **Sistemas**: experiencia de desarrollo local (`npm run dev`) para cualquier developer del proyecto. Sin impacto en producción (el guard preserva el comportamiento actual quand `NODE_ENV === "production"`).
- **Remediación fuera de alcance del código**: quien ya tiene el SW viejo registrado en su browser (de sesiones de dev previas a este fix) debe desregistrarlo manualmente una vez — DevTools → Application → Service Workers → Unregister (o "Clear storage"). El fix sólo previene registros futuros, no limpia registros existentes desde el cliente.
- **Tests**: requiere test unitario nuevo/ajustado para `ServiceWorkerRegistrar` cubriendo ambos casos de `NODE_ENV`.
