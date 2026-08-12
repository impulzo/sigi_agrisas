## Context

Ver `proposal.md` — Why. Los dos guards viven en Server Components (`page.tsx`), leen la cookie `refreshToken` con `cookies()` y llaman `redirect()` de `next/navigation` antes de renderizar el formulario. Mismo patrón ya usado en `app/page.tsx` y en `useLoginForm.ts`/`useRegisterForm.ts`, ambos ya apuntando a `/pos`.

## Goals / Non-Goals

**Goals:**
- Alinear el string literal de destino en ambos guards (`/dashboard` → `/pos`), fila 1 de la Historia de Usuario.
- Alinear la spec `auth-ui` con el comportamiento corregido.

**Non-Goals:**
- No se toca `useLoginForm.ts` ni `useRegisterForm.ts` (ya apuntan a `/pos`, ver commit `b90bbda`).
- No se introduce lógica de determinación de "landing page por rol" ni configuración — sigue siendo destino fijo `/pos`, igual que hoy.
- No se corrige el drift adicional detectado en `auth-ui` spec (escenarios "Login exitoso"/"Registro exitoso" documentan `/` en vez de `/pos`) — fuera de alcance de este cambio, que se limita a los dos guards SSR mencionados en la Historia de Usuario.

## Decisions

- **Cambio de un solo string literal por archivo**, sin extraer constante compartida (`"/pos"`). Alternativa considerada: constante en `app/_lib/` reutilizada por los 4 puntos que ya redirigen a `/pos`. Se descarta por ahora — el proyecto no tiene un archivo de rutas centralizado y el cambio real es de 2 líneas; introducir esa abstracción es scope creep para este fix puntual.
- **No se modifica el guard de `AuthMiddlewareAdapter`**: las rutas `/auth/login` y `/auth/register` siguen siendo públicas (`exactPublicPaths`), el guard de redirect vive únicamente en el Server Component de cada página — comportamiento sin cambios, sólo el destino.

## Risks / Trade-offs

- [Ninguno relevante] → cambio de 1 línea por archivo, mismo patrón ya validado en producción por `app/page.tsx` desde `b90bbda`.
