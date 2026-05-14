## 1. Configuración de Tailwind CSS y fuentes

- [x] 1.1 Instalar dependencias: `tailwindcss`, `postcss`, `autoprefixer`, `clsx`, `tailwind-merge`, `zod`
- [x] 1.2 Crear `tailwind.config.ts` con `content: ["./app/**/*.{ts,tsx}"]`
- [x] 1.3 Definir tokens de color de Agrisas en `tailwind.config.ts` (`agrisas-dark: #1a4d42`, `agrisas-medium: #2a6b5f`, `agrisas-mint: #d4f1e9`, `agrisas-light: #e8f7f3`)
- [x] 1.4 Crear `postcss.config.js` con plugins `tailwindcss` + `autoprefixer`
- [x] 1.5 Crear `app/globals.css` con directivas `@tailwind base/components/utilities` e importarlo en `app/layout.tsx`
- [x] 1.6 Configurar `next/font/google` en `app/layout.tsx` (Inter + Poppins) con variables CSS (`--font-inter`, `--font-poppins`) y mapearlas en `theme.extend.fontFamily` de Tailwind

## 2. Utilidades globales (`app/_lib/`)

- [x] 2.1 Crear `app/_lib/cn.ts` — helper `cn(...inputs)` que combina `clsx` + `tailwind-merge`
- [x] 2.2 Crear `app/_lib/formatters.ts` — `formatDate`, `formatNumber` (stubs iniciales)
- [x] 2.3 Crear `app/_lib/validators.ts` — `isEmail(value)`, `isPhone(value)`, `isUrl(value)` (regex puras, sin Zod)

## 3. Hooks globales (`app/_hooks/`)

- [x] 3.1 Crear `app/_hooks/useDebounce.ts` — `useDebounce<T>(value: T, delay: number): T`
- [x] 3.2 Crear `app/_hooks/useLocalStorage.ts` — `useLocalStorage<T>(key, initial)` con `SyntheticEvent` SSR-safe
- [x] 3.3 Crear `app/_hooks/useMediaQuery.ts` — `useMediaQuery(query: string): boolean`
- [x] 3.4 Verificar: ninguno de estos hooks importa de `app/(public)/`, `app/(private)/` ni de carpetas `_logic/`

## 4. Componentes atómicos (`app/_components/atoms/`)

- [x] 4.1 Crear `app/_components/atoms/Spinner/Spinner.tsx` — SVG animado, prop `size: "sm" | "md" | "lg"` (presentational puro)
- [x] 4.2 Crear `app/_components/atoms/Input/Input.tsx` + `Input.module.css` — props `error?`, `type`, atributos nativos; Tailwind para layout + module.css para borde rojo en error
- [x] 4.3 Crear `app/_components/atoms/Button/Button.tsx` + `Button.module.css` — variante primaria, props `loading` (renderiza Spinner), `disabled`; nunca contiene lógica de red

## 5. Componentes moleculares (`app/_components/molecules/`)

- [x] 5.1 Crear `app/_components/molecules/FormField/FormField.tsx` + `FormField.module.css` — agrupa `<label>`, `<Input>`, mensaje de error
- [x] 5.2 Crear `app/_components/molecules/SearchBar/SearchBar.tsx` — Input + Button (esqueleto, sin handler real)

## 6. Componentes orgánicos (`app/_components/organisms/`)

- [x] 6.1 Crear `app/_components/organisms/Header/Header.tsx` — esqueleto (logo + slot de navegación)
- [x] 6.2 Crear `app/_components/organisms/Footer/Footer.tsx` — esqueleto (texto de copyright)

## 7. Tipos y schemas del feature auth (`app/(public)/auth/_logic/`)

- [x] 7.1 Crear `app/(public)/auth/_logic/types/api.ts` con `LoginPayload`, `RegisterPayload`, `AuthResponse` (DTOs HTTP del cliente)
- [x] 7.2 Crear `app/(public)/auth/_logic/types/domain.ts` con `User`, `Session`, y la jerarquía `AuthError` / `InvalidCredentialsError` / `EmailAlreadyExistsError` / `NetworkError`
- [x] 7.3 Crear `app/(public)/auth/_logic/schemas/login.schema.ts` con `loginSchema = z.object({ email: z.string().email("Correo inválido"), password: z.string().min(6, "Mínimo 6 caracteres") })`
- [x] 7.4 Crear `app/(public)/auth/_logic/schemas/register.schema.ts` con `registerSchema = z.object({ name: z.string().min(1, "El nombre es requerido"), email: ..., password: ... })`

## 8. Servicios HTTP del feature auth (`app/(public)/auth/_logic/services/`)

- [x] 8.1 Crear `app/(public)/auth/_logic/services/login.ts` con `login(payload: LoginPayload, fetchImpl?: typeof fetch): Promise<AuthResponse>` que llama `POST /api/v1/auth/login`
- [x] 8.2 Crear `app/(public)/auth/_logic/services/register.ts` con `register(payload: RegisterPayload, fetchImpl?: typeof fetch): Promise<AuthResponse>` que llama `POST /api/v1/auth/register`
- [x] 8.3 Normalizar errores: 401 → `InvalidCredentialsError`; 409 → `EmailAlreadyExistsError`; 5xx / red caída → `NetworkError`; nunca devolver `Response` crudo
- [x] 8.4 Verificar: los services NO acceden a `sessionStorage`, `localStorage`, `router` ni a `next/navigation`

## 9. Hooks de orquestación del feature auth (`app/(public)/auth/_logic/hooks/`)

- [x] 9.1 Crear `app/(public)/auth/_logic/hooks/useLoginForm.ts` que expone `{ values, errors, isSubmitting, formError, handleChange, handleBlur, handleSubmit }`; valida con `loginSchema.safeParse` en `handleBlur`
- [x] 9.2 En `useLoginForm.handleSubmit`: llamar a `login(payload)`; en éxito guardar `sessionStorage['accessToken']` y `router.replace("/")`; mapear `InvalidCredentialsError` → "Credenciales inválidas" y `NetworkError` → "Error al iniciar sesión. Intenta de nuevo."
- [x] 9.3 Crear `app/(public)/auth/_logic/hooks/useRegisterForm.ts` con la misma forma de API, sumando `name`, mapeando `EmailAlreadyExistsError` → "Este correo ya está registrado" y `NetworkError` → "Error al crear la cuenta. Intenta de nuevo."
- [x] 9.4 Crear `app/(public)/auth/_logic/hooks/useAuthRedirect.ts` (respaldo cliente): si hay `accessToken` en `sessionStorage`, redirige a `/`
- [x] 9.5 Los hooks usan `useRouter` de `next/navigation` (no `next/router`)
- [x] 9.6 Verificar: los hooks viven en `_logic/hooks/`, no en `app/_hooks/` (acoplados a `_logic/services/`)

## 10. AuthLayout compartido (`app/(public)/auth/layout.tsx`)

- [x] 10.1 Crear `app/(public)/auth/layout.tsx` como **Server Component** — split-panel con slot `children` para el formulario
- [x] 10.2 Importar y aplicar tokens Tailwind (`bg-agrisas-dark`, `text-agrisas-mint`, etc.)
- [x] 10.3 Añadir ilustración SVG agrícola en el panel izquierdo
- [x] 10.4 Definir keyframes/animación de fondo en un `.module.css` colocado junto al layout si no se puede expresar con utilidades Tailwind

## 11. Bloques específicos del feature (`app/(public)/auth/_blocks/`)

- [x] 11.1 Crear `app/(public)/auth/_blocks/LoginForm.tsx` como Client Component (`"use client"`) que consume `useLoginForm()` y renderiza `FormField` + `Button` + mensaje de error
- [x] 11.2 Verificar que `LoginForm.tsx` **no** contiene `fetch(`, `sessionStorage`, `useRouter`, ni validación inline
- [x] 11.3 Añadir enlace "¿No tienes cuenta? Regístrate aquí" con `next/link` y `href="/auth/register"`
- [x] 11.4 Crear `app/(public)/auth/_blocks/RegisterForm.tsx` como Client Component que consume `useRegisterForm()` y renderiza name + email + password + botón
- [x] 11.5 Verificar que `RegisterForm.tsx` **no** contiene `fetch(`, `sessionStorage`, `useRouter`, ni validación inline
- [x] 11.6 Añadir enlace "¿Ya tienes cuenta? Inicia sesión" con `next/link` y `href="/auth/login"`

## 12. Páginas (Server Components)

- [x] 12.1 Crear `app/(public)/auth/login/page.tsx` como Server Component — exporta `metadata`, lee cookie `refreshToken` con `cookies()`, llama `redirect("/")` si hay sesión, e importa `<LoginForm />`
- [x] 12.2 Crear `app/(public)/auth/register/page.tsx` con la misma estructura (metadata + redirect server-side + `<RegisterForm />`)
- [x] 12.3 Verificar que ninguna `page.tsx` contiene `"use client"`

## 13. Placeholder de feature privado

- [x] 13.1 Crear `app/(private)/dashboard/layout.tsx` esqueleto
- [x] 13.2 Crear `app/(private)/dashboard/page.tsx` con texto "Dashboard placeholder"
- [x] 13.3 Crear estructura vacía `app/(private)/dashboard/_logic/{hooks,services,types}/` y `app/(private)/dashboard/_blocks/` con archivos `.gitkeep`
- [x] 13.4 Crear `app/(private)/settings/page.tsx` placeholder

## 14. Migración de API a `app/api/v1/`

- [x] 14.1 Mover `app/api/auth/login/route.ts` → `app/api/v1/auth/login/route.ts`
- [x] 14.2 Mover `app/api/auth/register/route.ts` → `app/api/v1/auth/register/route.ts`
- [x] 14.3 Mover `app/api/auth/refresh/route.ts` → `app/api/v1/auth/refresh/route.ts`
- [x] 14.4 Mover `app/api/auth/logout/route.ts` → `app/api/v1/auth/logout/route.ts`
- [x] 14.5 Crear `app/api/v1/health/route.ts` que devuelve `200 { status: "ok", timestamp: new Date().toISOString() }`
- [x] 14.6 Eliminar la carpeta `app/api/auth/` vacía
- [x] 14.7 Verificar que los route handlers siguen delegando a `AuthController` desde `src/modules/auth/infrastructure/http/` sin cambios en la lógica

## 15. Actualización mínima del middleware (única edición en `src/`)

- [x] 15.1 Actualizar `exactPublicPaths` en `src/modules/auth/infrastructure/middleware/AuthMiddlewareAdapter.ts`: reemplazar `/api/auth/*` por `/api/v1/auth/*`; reemplazar `/login` por `/auth/login`; añadir `/auth/register`
- [x] 15.2 Actualizar el destino del redirect 302 de `/login` a `/auth/login`
- [x] 15.3 Verificar: ningún otro archivo bajo `src/` se modifica (ports, use cases, mappers, repositorios, AuthController quedan intactos)

## 16. Configuración de tests unitarios de UI

- [x] 16.1 Instalar dependencias: `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jest-environment-jsdom`
- [x] 16.2 Crear `jest.setup.ts` con `import "@testing-library/jest-dom"`
- [x] 16.3 Modificar `jest.config.ts` para usar `projects`: uno `node` para `tests/unit/modules/**` + `tests/integration/**`, otro `jsdom` para `tests/unit/ui/**` con `setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"]`
- [x] 16.4 Mantener el alias `@/*` → `src/*` en ambos `projects`
- [x] 16.5 Verificar que `npm test` corre ambos `projects` sin colisiones

## 17. Snapshot tests de componentes presentational

- [x] 17.1 `tests/unit/ui/_components/atoms/Button.test.tsx` — snapshots para variante primaria, `loading=true`, `disabled=true`
- [x] 17.2 `tests/unit/ui/_components/atoms/Input.test.tsx` — snapshots default, con `error`
- [x] 17.3 `tests/unit/ui/_components/atoms/Spinner.test.tsx` — snapshots con `size="sm"`, `size="md"`, `size="lg"`
- [x] 17.4 `tests/unit/ui/_components/molecules/FormField.test.tsx` — snapshot agrupando label + input + error
- [x] 17.5 `tests/unit/ui/(public)/auth/_blocks/LoginForm.test.tsx` — snapshot del estado inicial y con `formError` (mockear `useLoginForm` para inyectar estado controlado)
- [x] 17.6 `tests/unit/ui/(public)/auth/_blocks/RegisterForm.test.tsx` — análogo, con `useRegisterForm` mockeado

## 18. Tests de hooks

- [x] 18.1 `tests/unit/ui/(public)/auth/_logic/hooks/useLoginForm.test.ts` — `renderHook` cubre: validación en `handleBlur` (email vacío, formato inválido, password corta), transición `isSubmitting`, llamada a `login` con payload correcto, `router.replace("/")` en éxito, `formError = "Credenciales inválidas"` en 401
- [x] 18.2 `tests/unit/ui/(public)/auth/_logic/hooks/useRegisterForm.test.ts` — cobertura análoga + `formError = "Este correo ya está registrado"` en 409
- [x] 18.3 Mockear `next/navigation` con `useRouter` devolviendo `push` y `replace` como `jest.fn()`

## 19. Tests de services

- [x] 19.1 `tests/unit/ui/(public)/auth/_logic/services/login.test.ts` — 200 devuelve `AuthResponse`; 401 lanza `InvalidCredentialsError`; 5xx lanza `NetworkError`
- [x] 19.2 `tests/unit/ui/(public)/auth/_logic/services/register.test.ts` — 201 devuelve `AuthResponse`; 409 lanza `EmailAlreadyExistsError`; error de red lanza `NetworkError`
- [x] 19.3 Usar el parámetro `fetchImpl` inyectado del service en lugar de tocar `global.fetch`

## 20. Verificación end-to-end

- [x] 20.1 Navegar a `/auth/login` sin token — muestra split-panel con LoginForm
- [x] 20.2 Navegar a `/auth/register` sin token — muestra split-panel con RegisterForm (mismo layout)
- [x] 20.3 Enviar login con credenciales válidas — redirige al dashboard `/`
- [x] 20.4 Enviar login con credenciales inválidas — muestra "Credenciales inválidas" inline sin recargar
- [x] 20.5 Enviar registro con datos válidos — crea cuenta y redirige a `/`
- [x] 20.6 Enviar registro con email duplicado — muestra "Este correo ya está registrado"
- [x] 20.7 Verificar responsive: layout apilado en viewport <1024px en ambas páginas
- [x] 20.8 Verificar que `GET /api/v1/health` responde 200
- [x] 20.9 Verificar que `npm run build` pasa sin errores de TypeScript ni de Tailwind
- [x] 20.10 Verificar que `npm test` pasa todos los tests (backend existentes + nuevos de UI)
- [x] 20.11 Verificar grep: ningún archivo bajo `app/_components/**` ni `app/(**)/**/_blocks/**` contiene `fetch(`, `sessionStorage`, `useRouter` ni rutas `/api/`
- [x] 20.12 Verificar grep: ningún archivo bajo `app/_hooks/**` importa desde `app/(public)/` ni `app/(private)/`
