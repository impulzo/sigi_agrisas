## Context

El proyecto ya cuenta con un backend de autenticación completo (JWT access token 15min + refresh token 7d en cookie HttpOnly) y los endpoints `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/refresh`, `POST /api/auth/logout`. El middleware redirige a `/login` cuando no hay token válido, pero ninguna ruta de autenticación tiene UI.

El CLAUDE.md original prohibía Tailwind "sin decisión explícita" — esta propuesta es esa decisión explícita. Se adopta **Tailwind v3** como solución única de estilos. No se usan estilos inline ni `<style>` globales. Cada componente puede tener su propio `.module.css` para overrides puntuales (animaciones, keyframes) que no se expresan con utilidades Tailwind.

La guía visual proviene del bundle de Claude Design (`agrisas-login`): layout split-panel, paleta verde menta (#1a4d42, #2a6b5f, #d4f1e9), tipografías Inter + Poppins.

**Restricción dura:** no se toca la arquitectura hexagonal de backend en `src/`. El único cambio incidental permitido en `src/` es la lista `exactPublicPaths` del `AuthMiddlewareAdapter` (configuración, no arquitectura) y el destino del redirect.

## Goals / Non-Goals

**Goals:**
- Configurar Tailwind CSS + PostCSS en Next.js 14 App Router.
- Establecer el scaffold de frontend bajo `app/` con Atomic Design, route groups y `_logic`/`_blocks` por feature.
- Distinguir formalmente `_hooks/` global vs `_logic/hooks/` de módulo (regla escrita y verificable).
- Mover los route handlers de `app/api/auth/*` a `app/api/v1/auth/*` (versionado) y añadir `app/api/v1/health`.
- Página `/auth/login` (RSC shell + `LoginForm` Client) con diseño split-panel.
- Página `/auth/register` (RSC shell + `RegisterForm` Client) con el mismo layout.
- Validación en tiempo real con Zod schemas en `_logic/schemas/`.
- Integración con `POST /api/v1/auth/login` y `POST /api/v1/auth/register`.
- Actualizar `exactPublicPaths` del middleware (única edición en `src/`).
- Configuración Jest con `projects` (node + jsdom) y tests RTL.

**Non-Goals:**
- Flujo "Olvidaste tu contraseña" — enlace decorativo sin funcionalidad.
- Verificación de email tras registro.
- Refactor del backend hexagonal — `src/modules/` permanece intacto salvo la lista de rutas públicas.
- Implementación funcional del dashboard `(private)/` — sólo se crea el placeholder de árbol.
- Internacionalización (i18n) — textos en español hardcoded por ahora.

## Decisions

**1. Tailwind CSS v3 como framework de estilos**

Se introduce Tailwind v3 compatible con Next.js 14 App Router. Las clases de utilidad cubren ~95% de los estilos; los `.module.css` por componente quedan para casos excepcionales (animaciones complejas, keyframes). El helper `cn()` en `app/_lib/cn.ts` merge clases tailwind (`clsx` + `tailwind-merge`). Alternativas descartadas: CSS puro por componente (verbose, difícil consistencia de tokens); CSS-in-JS (runtime overhead, dependencias no aprobadas).

**2. Scaffold de frontend bajo `app/` con Atomic Design + Route Groups + `_logic` por feature**

Toda la UI vive en `app/`. `src/` queda exclusivo del backend hexagonal. La organización combina cuatro principios:

- **Atomic Design** en `app/_components/{atoms,molecules,organisms}/`: UI genérica reutilizable, 0 lógica de negocio.
- **Route Groups** `(public)/` y `(private)/`: separan visualmente rutas que requieren auth de las que no, sin afectar la URL.
- **`_logic/` y `_blocks/` por feature**: dentro de cada subcarpeta de página, `_logic/` agrupa hooks/services/schemas/types del feature, y `_blocks/` contiene los componentes específicos del feature (no reutilizables fuera).
- **Hooks globales** en `app/_hooks/` y **utilidades puras** en `app/_lib/`.

Árbol completo:

```
app/
├── api/v1/                       # Route Handlers versionados
│   ├── auth/
│   │   ├── login/route.ts        # POST → delega a AuthController.login
│   │   ├── register/route.ts     # POST → delega a AuthController.register
│   │   ├── refresh/route.ts      # POST → delega a AuthController.refresh
│   │   └── logout/route.ts       # POST → delega a AuthController.logout
│   └── health/route.ts           # GET → 200 { status: "ok" }
│
├── _components/                  # ATOMIC DESIGN: solo UI, 0 lógica de negocio
│   ├── atoms/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   └── Button.module.css
│   │   ├── Input/
│   │   │   ├── Input.tsx
│   │   │   └── Input.module.css
│   │   └── Spinner/
│   │       └── Spinner.tsx
│   ├── molecules/
│   │   ├── FormField/            # Label + Input + ErrorMessage
│   │   │   ├── FormField.tsx
│   │   │   └── FormField.module.css
│   │   └── SearchBar/
│   │       └── SearchBar.tsx
│   └── organisms/
│       ├── Header/
│       │   └── Header.tsx
│       └── Footer/
│           └── Footer.tsx
│
├── _hooks/                       # HOOKS GLOBALES (reutilizables ≥2 módulos)
│   ├── useDebounce.ts
│   ├── useLocalStorage.ts
│   └── useMediaQuery.ts
│
├── _lib/                         # UTILIDADES PURAS (sin React, sin fetch)
│   ├── cn.ts                     # merge de clases tailwind
│   ├── formatters.ts             # formato de fechas, números, etc.
│   └── validators.ts             # email(), phone(), url() genéricos
│
├── (public)/                     # Route group: páginas que NO requieren auth
│   └── auth/
│       ├── layout.tsx            # AuthLayout split-panel (Server Component)
│       │
│       ├── _logic/               # LÓGICA del feature auth
│       │   ├── hooks/
│       │   │   ├── useLoginForm.ts
│       │   │   ├── useRegisterForm.ts
│       │   │   └── useAuthRedirect.ts
│       │   ├── services/
│       │   │   ├── login.ts      # POST /api/v1/auth/login
│       │   │   └── register.ts   # POST /api/v1/auth/register
│       │   ├── schemas/          # Zod schemas (cliente)
│       │   │   ├── login.schema.ts
│       │   │   └── register.schema.ts
│       │   └── types/
│       │       ├── api.ts        # DTOs HTTP (LoginPayload, AuthResponse)
│       │       └── domain.ts     # User, Session, AuthError tipados
│       │
│       ├── _blocks/              # COMPONENTES específicos del feature
│       │   ├── LoginForm.tsx
│       │   └── RegisterForm.tsx
│       │
│       ├── login/page.tsx        # Server Component — orquestación
│       └── register/page.tsx     # Server Component — orquestación
│
├── (private)/                    # Route group: páginas que requieren auth
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── _logic/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── types/
│   │   ├── _blocks/
│   │   └── page.tsx
│   └── settings/
│       └── page.tsx
│
└── layout.tsx                    # Root layout (providers, fuentes, metadata)
```

Alternativas descartadas:
- Colocar componentes en `src/ui/` (mezcla con backend hexagonal, viola la separación `src/` = backend / `app/` = frontend).
- Mezclar `fetch` y estado dentro del componente (imposible probar lógica sin DOM, acopla diseño con red).
- Carpeta plana sin Atomic Design (no escala — sin distinción atómico/molecular se pierden las garantías de reuso).

**3. `_components/` y `_blocks/` son presentational — regla dura**

Los componentes `.tsx` bajo `app/_components/**` y `app/(**)/**/_blocks/**` son presentational. Pueden tener `useState` para inputs controlados, pero **no** pueden contener:

- llamadas a `fetch` o cualquier cliente HTTP,
- accesos a `sessionStorage`, `localStorage`, `document` o `window`,
- llamadas a `useRouter().push/replace` u otra redirección imperativa,
- lógica de validación que no sea trivial (regex, longitud mínima inline).

Toda esa lógica se mueve a `_logic/hooks/` (estado + orquestación) y `_logic/services/` (HTTP). Validación a `_logic/schemas/` (Zod).

Beneficios:
- El componente se prueba con snapshot trivial.
- El hook se prueba con `renderHook` sin DOM.
- El service se prueba como función pura con `fetch` mockeado.

Alternativa descartada: store global (Zustand/Redux) — sobreingeniería para dos formularios; el estado vive en el hook que lo necesita.

**4. `_hooks/` global vs `_logic/hooks/` de módulo — regla escrita**

La distinción es crítica para evitar que la carpeta global se llene de hooks acoplados:

| Va en `app/_hooks/` (global)                       | Va en `_logic/hooks/` (módulo)              |
| -------------------------------------------------- | ------------------------------------------- |
| No importa nada de `app/`                          | Importa de `_logic/services/`               |
| Reutilizable en ≥2 módulos                         | Usado solo en este módulo                   |
| Framework-agnostic (portable a Vue/Svelte)         | Acoplado a React/Next.js                    |
| Ej: `useDebounce`, `useLocalStorage`, `useMediaQuery` | Ej: `useLoginForm`, `useDashboardStats` |

Si un hook empieza en `_logic/hooks/` y crece para ser usado por ≥2 features sin acoplarse a `_logic/services/`, se promueve a `app/_hooks/`. La promoción se hace en un PR explícito.

**5. Atomic Design en `_components/`**

- **`atoms/`**: piezas indivisibles. `Button`, `Input`, `Spinner`, `Label`. Aceptan props simples y son ciegas al contexto.
- **`molecules/`**: composiciones cohesivas de átomos. `FormField` (Label + Input + ErrorMessage), `SearchBar` (Input + Button).
- **`organisms/`**: secciones reutilizables sin lógica de negocio. `Header`, `Footer`. Pueden usar molecules y atoms.
- **No hay `templates/` ni `pages/`** en `_components/`: las páginas viven en `app/(public|private)/.../page.tsx` y los "templates" específicos de un feature se llaman `_blocks/` (mejor nombre para Next.js, que ya tiene `template.tsx` como concepto reservado).

Cada componente: una carpeta `Nombre/` con `Nombre.tsx` y opcionalmente `Nombre.module.css`. Sin barrel exports (`index.ts`) para mantener imports explícitos.

**6. Versionado de API con `app/api/v1/`**

Se mueven los handlers actuales de `app/api/auth/*` a `app/api/v1/auth/*` y se añade `app/api/v1/health/route.ts`. Justificación:

- Versionar la API pública desde el inicio evita rupturas de contrato cuando aparezcan apps móviles o integraciones externas.
- El versionado vive en la URL (no en headers) por simplicidad y debuggability.
- Cambio incidental: la lista `exactPublicPaths` del `AuthMiddlewareAdapter` debe reflejar los nuevos paths. Esta es la única edición permitida en `src/`.

Alternativa descartada: mantener `/api/auth/*` sin versión (decisión postergada, más caro reescribir clientes después).

**7. AuthLayout compartido entre login y registro**

El split-panel (ilustración izquierda + slot de formulario derecha) vive en `app/(public)/auth/layout.tsx`. Es un Server Component que recibe `children`. `LoginForm` y `RegisterForm` se inyectan desde las páginas `login/page.tsx` y `register/page.tsx`. Esto garantiza que cambiar el diseño no requiera editar dos páginas.

Alternativa descartada: duplicar el layout en cada página (fragilidad).

**8. Almacenamiento del access token**

El access token se almacena en `sessionStorage['accessToken']`. El refresh token viaja en cookie HttpOnly gestionada por el servidor. Sigue el patrón documentado en CLAUDE.md. No se añaden cookies adicionales. El acceso a `sessionStorage` ocurre **solo** dentro de los hooks (`useLoginForm`, `useRegisterForm`), nunca en `_blocks/`.

**9. Registro: redirección post-éxito**

Tras registro exitoso se redirige directamente a `/` (el endpoint devuelve access token). No se implementa verificación de email en esta iteración.

**10. Rutas públicas del middleware**

Se actualiza `exactPublicPaths` en `AuthMiddlewareAdapter`:

```ts
const exactPublicPaths = new Set([
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/refresh",
  "/api/v1/auth/logout",
  "/auth/login",
  "/auth/register",
  "/favicon.ico",
]);
```

Y el destino del redirect 302 cambia de `/login` a `/auth/login`. Estas son ediciones de configuración, no de arquitectura.

**11. Validación con Zod en el cliente**

Las reglas de validación viven en `_logic/schemas/login.schema.ts` y `register.schema.ts` como objetos `z.object({...})`. Los hooks consumen `safeParse()` en `handleChange` y `handleBlur` para validación en tiempo real, y en `handleSubmit` antes de llamar al service. Los mensajes de error se centralizan en el schema (no en el componente).

Backend tiene sus propios schemas Zod en `src/modules/auth/infrastructure/http/` — son independientes (defensa en profundidad). Si divergen, el backend gana (es la fuente de verdad).

**12. Servicios HTTP de feature**

`_logic/services/login.ts` exporta `login(payload, fetchImpl?): Promise<AuthResponse>`:
- Llama `POST /api/v1/auth/login`.
- 200 → devuelve `{ accessToken, user }` parseado.
- 401 → lanza `InvalidCredentialsError`.
- 409 (sólo register) → lanza `EmailAlreadyExistsError`.
- 5xx o red caída → lanza `NetworkError`.
- Nunca devuelve `Response` crudo.
- Acepta `fetchImpl` inyectado para tests.

**13. Buenas prácticas de Next.js 14 (App Router)**

- **Server Components por defecto**: `app/(public)/auth/login/page.tsx`, `register/page.tsx`, `layout.tsx` son RSC. Sólo `_blocks/` lleva `"use client"`.
- **Redirección server-side cuando hay sesión**: la página lee la cookie `refreshToken` con `cookies()` de `next/headers` y llama `redirect("/")` antes de renderizar — evita flash del formulario al usuario ya autenticado. `useAuthRedirect` (en `_logic/hooks/`) queda como respaldo cliente.
- **`next/font/google`** para Inter y Poppins en `app/layout.tsx`, exponiendo variables CSS (`--font-inter`, `--font-poppins`) mapeadas en `theme.extend.fontFamily` de Tailwind. Sin `<link>` ni `@import`.
- **`next/link`** para toda navegación interna. Nunca `<a href="/...">`.
- **`useRouter` de `next/navigation`** (no `next/router`) para redirecciones imperativas. Usar `router.replace("/")` tras login.
- **`Metadata` por ruta**: cada `page.tsx` exporta `export const metadata: Metadata`.
- **Variables públicas** sólo con prefijo `NEXT_PUBLIC_`. Los `fetch` usan rutas relativas (`/api/v1/auth/login`).
- **Carpetas privadas con `_`**: `_components`, `_hooks`, `_lib`, `_logic`, `_blocks` no son enrutables (convención de Next.js).

**14. Estrategia de tests unitarios de UI**

Tres niveles, todos en `tests/unit/ui/**`, con jsdom:

- **Snapshot tests de presentational** (`_components/atoms/*`, `_components/molecules/*`, `_blocks/*`). Renderizan con props representativas (default, error, loading, disabled) y serializan con `toMatchSnapshot()`. Para `LoginForm`/`RegisterForm` se mockea el hook (`useLoginForm`, `useRegisterForm`) e inyecta estado controlado.
- **Tests de hooks** (`useLoginForm`, `useRegisterForm`) con `renderHook` y `act` de `@testing-library/react`. Cubren: validación al cambiar/blur, transición `isSubmitting`, llamada al service con payload correcto, manejo de `InvalidCredentialsError` / `EmailAlreadyExistsError` / `NetworkError`, redirección con `router.replace` mockeado.
- **Tests de services** (`login`, `register`) con `fetch` inyectado. Cubren: 200/201 → devuelve `AuthResponse`; 401 → `InvalidCredentialsError`; 409 → `EmailAlreadyExistsError`; 5xx/red → `NetworkError`.

Configuración Jest:

```ts
// jest.config.ts
export default {
  projects: [
    {
      displayName: "backend",
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/unit/modules/**/*.test.ts", "<rootDir>/tests/integration/**/*.test.ts"],
      moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
    },
    {
      displayName: "ui",
      testEnvironment: "jsdom",
      testMatch: ["<rootDir>/tests/unit/ui/**/*.test.{ts,tsx}"],
      moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
      setupFilesAfterEach: ["<rootDir>/jest.setup.ts"],
    },
  ],
};
```

Alternativa descartada: Vitest (no se introduce un segundo runner cuando Jest ya está adoptado).

## Risks / Trade-offs

- **[Tailwind aumenta bundle CSS en desarrollo]** → Mitigation: purge en producción elimina clases no usadas.
- **[Inter + Poppins requieren Google Fonts]** → Mitigation: `next/font/google` cachea y elimina FOUT; fallback `sans-serif`.
- **[`sessionStorage` se borra al cerrar pestaña]** → Mitigation: refresh token en cookie HttpOnly permite reautenticar silenciosamente.
- **[Scaffold puede proliferar sin convención escrita]** → Mitigation: este design.md + sección "Arquitectura Frontend" del CLAUDE.md son la convención escrita; cualquier nuevo feature sigue `_logic/` + `_blocks/`.
- **[Snapshots frágiles ante cambios estéticos legítimos]** → Mitigation: snapshots se limitan a estructura semántica (roles, labels, clases relevantes); cambios visuales viven en `.module.css`/Tailwind y no afectan estructura. Actualizaciones intencionales con `jest -u` justificadas en el PR.
- **[Dos `testEnvironment` complican Jest config]** → Mitigation: `projects` separa entornos sin duplicar pipelines; los tests existentes no cambian.
- **[Hooks acoplados a `next/navigation` dificultan tests]** → Mitigation: mockear `next/navigation` con `jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }))`.
- **[Migrar `/api/auth/*` → `/api/v1/auth/*` rompe clientes externos]** → Mitigation: no existen clientes externos aún; este es el momento adecuado para versionar.
- **[Confundir `_hooks/` global con `_logic/hooks/`]** → Mitigation: tabla decisional en CLAUDE.md + revisión en PR; si un hook nuevo importa de `_logic/services/`, no puede vivir en `_hooks/`.
- **[Tocar `src/` (lista de rutas del middleware)]** → Mitigation: limitar la edición a `exactPublicPaths` y al string del redirect — no se tocan ports, use cases, ni clases. Documentado como excepción única en proposal.md.
