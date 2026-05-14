## Why

El panel de administración de Agrisas carece de UI de autenticación: la capa backend (JWT + Prisma + AuthController) ya existe en `src/modules/auth/`, pero el usuario no tiene pantallas para iniciar sesión ni registrarse. Además, el proyecto carece de una **arquitectura frontend** escalable: los componentes y la lógica de UI estarían dispersos sin convención, y el contrato entre componentes presentational, hooks de estado y servicios HTTP no está formalizado.

Este cambio establece el **scaffold definitivo del frontend en `app/`** — Atomic Design para UI genérica, route groups `(public)` / `(private)`, separación dura `_components` / `_hooks` / `_lib` / `_logic` / `_blocks`, y API versionada `app/api/v1/` — y completa el primer flujo visual del producto (login + register) sobre ese scaffold.

La restricción es explícita: **no se toca la arquitectura hexagonal de backend en `src/`**. Todo el código nuevo de UI vive bajo `app/`. El único cambio incidental en `src/` es la lista `exactPublicPaths` del `AuthMiddlewareAdapter`, que debe reconocer los nuevos paths `/auth/login`, `/auth/register` y `/api/v1/auth/*`.

## What Changes

- **Introducir Tailwind CSS v3** como framework de estilos para toda la capa UI (decisión explícita que reemplaza la restricción del CLAUDE.md original).
- **Scaffold de frontend bajo `app/` con Atomic Design + Route Groups + `_logic` por feature**:
  - `app/_components/{atoms,molecules,organisms}/` — UI genérica reutilizable, 0 lógica de negocio.
  - `app/_hooks/` — hooks globales framework-agnostic (`useDebounce`, `useLocalStorage`, `useMediaQuery`).
  - `app/_lib/` — utilidades puras (`cn`, `formatters`, `validators` genéricos).
  - `app/(public)/auth/` — feature de autenticación con `_logic/{hooks,services,schemas,types}/` y `_blocks/{LoginForm,RegisterForm}.tsx`.
  - `app/(private)/dashboard/` — esqueleto vacío del primer feature autenticado.
- **API versionada**: mover los route handlers de `app/api/auth/*` a `app/api/v1/auth/*` y añadir `app/api/v1/health/route.ts`.
- **Separación dura presentational / lógica**: los `.tsx` bajo `_components/` y `_blocks/` **no** contienen `fetch`, `sessionStorage`, `localStorage`, `useRouter().push/replace` ni validación inline.
- **Distinción `_hooks/` global vs `_logic/hooks/` de módulo**:
  - `_hooks/` → no importa de `app/`, reutilizable en ≥2 módulos, framework-agnostic.
  - `_logic/hooks/` → importa de `_logic/services/`, acoplado a un feature, orquesta estado + HTTP + navegación.
- **Página `/auth/login`** y **`/auth/register`**: layout split-panel compartido (`(public)/auth/layout.tsx`), formularios con validación en tiempo real basada en Zod.
- **Servicios HTTP del feature auth**: `_logic/services/login.ts` y `register.ts` encapsulan `fetch` a `/api/v1/auth/*`, normalizan errores HTTP a clases tipadas y aceptan `fetchImpl` inyectado.
- **Hooks de orquestación**: `useLoginForm`, `useRegisterForm` componen estado, validación Zod, llamada al service y `router.replace("/")` en éxito.
- **Buenas prácticas de Next.js 14**: páginas como Server Components por defecto, `"use client"` sólo en `_blocks/`, `next/font/google` para Inter + Poppins, `next/link` para navegación interna, `useRouter` de `next/navigation`, `Metadata` por ruta, `redirect()` server-side cuando hay sesión.
- **Tests unitarios de UI con Jest + React Testing Library**: snapshots para todos los componentes presentational (atoms, molecules, blocks); tests de hooks con `renderHook`; tests de services con `fetch` mockeado.
- **Middleware**: actualizar `exactPublicPaths` del `AuthMiddlewareAdapter` para añadir `/auth/login`, `/auth/register` y los paths versionados `/api/v1/auth/*`.

## Capabilities

### New Capabilities

- `frontend-scaffold`: Estructura de directorios de UI bajo `app/` que combina **Atomic Design** (`_components/{atoms,molecules,organisms}`), **hooks globales** (`_hooks/`), **utilidades puras** (`_lib/`), **route groups** (`(public)/`, `(private)/`) y **separación `_logic` + `_blocks` por feature**. Incluye configuración de Tailwind CSS (`tailwind.config.ts` + PostCSS) y la convención dura **componentes presentational sin lógica de red ni efectos secundarios**. Define la diferencia entre `_hooks/` (global, framework-agnostic) y `_logic/hooks/` (módulo, acoplado a `_logic/services/`).
- `auth-ui`: Páginas y bloques de autenticación bajo `app/(public)/auth/` — layout split-panel compartido, `LoginForm` y `RegisterForm` como Client Components delgados que consumen `useLoginForm` / `useRegisterForm`; los hooks delegan en `services/login.ts` y `services/register.ts`; validación Zod en `schemas/login.schema.ts`; redirección server-side con `redirect()` cuando hay sesión.
- `ui-testing`: Infraestructura de tests unitarios de UI — Jest configurado con `projects` (`testEnvironment: "node"` para backend, `testEnvironment: "jsdom"` para `tests/unit/ui/**`), React Testing Library, `@testing-library/jest-dom`, snapshots de presentational components, tests de hooks con `renderHook`, tests de services con `fetch` mockeado.

### Modified Capabilities

- `auth-middleware`: Actualizar la lista `exactPublicPaths` del `AuthMiddlewareAdapter` para reflejar los nuevos paths del scaffold (`/auth/login`, `/auth/register`, `/api/v1/auth/*`) y cambiar el destino del redirect 302 de `/login` a `/auth/login`. Único cambio en `src/` permitido por esta propuesta.

## Impact

- **Nuevos archivos de configuración**: `tailwind.config.ts`, `postcss.config.js`, `app/globals.css` con directivas Tailwind, `jest.setup.ts` (`import "@testing-library/jest-dom"`), `jest.config.ts` ajustado con `projects` (node + jsdom).
- **Nuevo árbol de UI bajo `app/`**:
  - `app/_components/atoms/{Button,Input,Spinner}/` — átomos reutilizables presentational puros.
  - `app/_components/molecules/{FormField,SearchBar}/` — composiciones de átomos.
  - `app/_components/organisms/{Header,Footer}/` — esqueleto inicial.
  - `app/_hooks/{useDebounce,useLocalStorage,useMediaQuery}.ts` — hooks globales.
  - `app/_lib/{cn,formatters,validators}.ts` — utilidades puras.
  - `app/(public)/auth/layout.tsx` — AuthLayout split-panel.
  - `app/(public)/auth/_logic/hooks/{useLoginForm,useRegisterForm,useAuthRedirect}.ts`.
  - `app/(public)/auth/_logic/services/{login,register}.ts`.
  - `app/(public)/auth/_logic/schemas/{login,register}.schema.ts`.
  - `app/(public)/auth/_logic/types/{api,domain}.ts`.
  - `app/(public)/auth/_blocks/{LoginForm,RegisterForm}.tsx` (Client Components delgados).
  - `app/(public)/auth/login/page.tsx` y `app/(public)/auth/register/page.tsx` (Server Components).
  - `app/(private)/dashboard/{layout,page}.tsx` y `_logic/`, `_blocks/` vacíos (placeholder).
- **API versionada**: mover `app/api/auth/{login,register,refresh,logout}/route.ts` → `app/api/v1/auth/...`. Añadir `app/api/v1/health/route.ts`.
- **Middleware**: en `src/modules/auth/infrastructure/middleware/AuthMiddlewareAdapter.ts`, actualizar `exactPublicPaths` para usar los paths versionados y añadir `/auth/login` + `/auth/register`. Cambiar destino del redirect a `/auth/login`.
- **Nuevos tests bajo `tests/unit/ui/`**:
  - `_components/atoms/{Button,Input,Spinner}.test.tsx` — snapshots.
  - `_components/molecules/FormField.test.tsx` — snapshot.
  - `(public)/auth/_blocks/{LoginForm,RegisterForm}.test.tsx` — snapshots con hooks mockeados.
  - `(public)/auth/_logic/hooks/{useLoginForm,useRegisterForm}.test.ts` — `renderHook`.
  - `(public)/auth/_logic/services/{login,register}.test.ts` — `fetch` mockeado.
- **Dependencias nuevas**: `tailwindcss`, `postcss`, `autoprefixer`, `zod` (cliente), `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jest-environment-jsdom`.
- **Sin cambios** en dominio, puertos, casos de uso, mappers, Prisma, repositorios ni servicios JWT/Bcrypt. La única edición en `src/` es la lista de rutas públicas y el destino del redirect en el middleware.
