# Spec: frontend-scaffold

## Purpose

Define la estructura base del frontend bajo `app/`: configuración de Tailwind CSS, organización en Atomic Design + Route Groups + `_logic` por feature, convenciones de Next.js 14 App Router, separación entre componentes presentational y lógica de negocio, infraestructura de tests unitarios de UI, y buenas prácticas globales aplicables a todos los módulos del panel.

---

## Requirements

### Requirement: Configuración de Tailwind CSS en el proyecto
El proyecto SHALL tener Tailwind CSS v3 instalado y configurado para funcionar con Next.js 14 App Router, con `content` apuntando a `./app/**/*.{ts,tsx}`. El `tailwind.config.ts` SHALL incluir el design system **Material 3 "Agro-Systemic"** generado en Stitch (proyecto `5227157529282603342`) con tokens semánticos de color, escala tipográfica Inter, escala de spacing 8px y border radius rounded; los tokens legacy `agrisas-*` (mint, dark, medium, light) SHALL mantenerse intactos para no romper `/auth/*`.

#### Scenario: Tailwind procesa clases en archivos TSX
- **WHEN** un componente `.tsx` bajo `app/` usa clases de utilidad de Tailwind
- **THEN** el compilador Next.js genera el CSS correspondiente y elimina las clases no utilizadas en producción

#### Scenario: Tokens semánticos Material 3 disponibles
- **WHEN** un componente usa `bg-primary`, `text-on-primary`, `bg-surface-container`, `bg-primary-container`, `text-on-surface-variant`, `border-outline-variant`, `bg-error-container` u otro token semántico M3
- **THEN** Tailwind aplica los valores de la paleta del design system (primary `#0d631b`, primary-container `#2e7d32`, surface `#f9f9f7`, surface-container-lowest `#ffffff`, outline-variant `#bfcaba`, error `#ba1a1a`, etc.)

#### Scenario: Tokens legacy agrisas-* siguen funcionando
- **WHEN** un componente de `app/(public)/auth/*` usa `text-agrisas-dark` o `bg-agrisas-mint`
- **THEN** Tailwind aplica los valores legacy (#1a4d42, #2a6b5f, #d4f1e9, #e8f7f3) sin error

#### Scenario: Escala tipográfica Inter del design system disponible
- **WHEN** un componente usa `text-display-lg`, `text-headline-lg`, `text-title-md`, `text-body-lg`, `text-body-md`, `text-label-lg` o `text-label-sm`
- **THEN** Tailwind aplica `font-size`, `line-height`, `letter-spacing` y `font-weight` definidos en el design system (e.g. `display-lg` = 57px/64px/-0.25px/400, `label-sm` = 11px/16px/0.5px/500)

#### Scenario: Escala de spacing 8px disponible
- **WHEN** un componente usa `p-md`, `gap-gutter`, `p-xs`, `p-sm`, `p-lg`, `p-xl`, `mx-margin-mobile` o `mx-margin-desktop`
- **THEN** Tailwind aplica los valores correspondientes (xs=4px, sm=8px, md=16px, lg=24px, xl=32px, gutter=24px, margin-mobile=16px, margin-desktop=32px)

#### Scenario: Fuente Inter cargada vía next/font
- **WHEN** un componente usa cualquier clase tipográfica del scaffold
- **THEN** Tailwind aplica la familia de fuente `Inter` cargada vía `next/font/google` en `app/layout.tsx` y disponible globalmente

#### Scenario: Border radius del design system disponible
- **WHEN** un componente usa `rounded-lg`, `rounded-xl` o `rounded-full`
- **THEN** Tailwind aplica `0.5rem`, `0.75rem` y `9999px` respectivamente, alineados con el shape language M3 "Rounded"

---

### Requirement: Estructura de frontend bajo `app/` con Atomic Design, Route Groups y `_logic` por feature
El proyecto SHALL organizar todo el código de UI bajo `app/` (no `src/`) siguiendo la convención:

- `app/_components/{atoms,molecules,organisms}/` — UI genérica reutilizable, presentational pura.
- `app/_hooks/` — hooks globales framework-agnostic, reutilizables en ≥2 módulos.
- `app/_lib/` — utilidades puras sin React ni fetch.
- `app/(public)/` y `app/(private)/` — route groups que segregan rutas por requisito de autenticación.
- Dentro de cada feature: `_logic/{hooks,services,schemas,types}/` y `_blocks/` para los componentes específicos del feature.
- `app/api/v1/` — Route Handlers versionados.

#### Scenario: Componente atómico creado correctamente
- **WHEN** se crea un componente atómico (e.g., Button)
- **THEN** existe `app/_components/atoms/Button/Button.tsx` y opcionalmente `app/_components/atoms/Button/Button.module.css`

#### Scenario: Componente molecular creado correctamente
- **WHEN** se crea un componente molecular (e.g., FormField)
- **THEN** existe `app/_components/molecules/FormField/FormField.tsx` y compone átomos (Label + Input + ErrorMessage)

#### Scenario: Componente orgánico creado correctamente
- **WHEN** se crea un componente orgánico (e.g., Header)
- **THEN** existe `app/_components/organisms/Header/Header.tsx` y no contiene lógica de negocio

#### Scenario: Bloque específico de feature creado correctamente
- **WHEN** se crea un componente específico de un feature (e.g., LoginForm del feature auth)
- **THEN** existe `app/(public)/auth/_blocks/LoginForm.tsx` y NO existe en `_components/` (es específico del feature, no reutilizable)

#### Scenario: Hook específico de feature creado correctamente
- **WHEN** se crea un hook que orquesta lógica de un feature (e.g., useLoginForm)
- **THEN** existe `app/(public)/auth/_logic/hooks/useLoginForm.ts` y se importa desde el bloque como una ruta relativa

#### Scenario: Service HTTP del feature creado correctamente
- **WHEN** se crea un service que habla con la API del feature (e.g., login)
- **THEN** existe `app/(public)/auth/_logic/services/login.ts` y expone una función tipada que devuelve `Promise<AuthResponse>` y lanza errores del módulo

#### Scenario: Schema Zod del feature creado correctamente
- **WHEN** se crea un schema de validación del feature
- **THEN** existe `app/(public)/auth/_logic/schemas/login.schema.ts` con un `z.object` exportado y los mensajes de error centralizados

#### Scenario: Tipos HTTP y de dominio separados
- **WHEN** el feature define tipos para HTTP y para dominio
- **THEN** los DTOs HTTP viven en `_logic/types/api.ts` y los tipos de dominio (`User`, `Session`, errores) en `_logic/types/domain.ts`

#### Scenario: Importación de componente reutilizable desde bloque
- **WHEN** `LoginForm.tsx` necesita usar el componente `FormField`
- **THEN** lo importa desde `app/_components/molecules/FormField/FormField` sin acceder a rutas de `src/` ni a otros features

---

### Requirement: Diferenciación dura entre `_hooks/` global y `_logic/hooks/` de feature
Los hooks SHALL ubicarse según las siguientes reglas:

- `app/_hooks/` MUST contener únicamente hooks que (a) no importen nada de `app/(public)/` o `app/(private)/`, (b) sean reutilizables en ≥2 módulos, y (c) sean conceptualmente framework-agnostic (no dependan de servicios específicos del feature).
- `_logic/hooks/` SHALL contener hooks acoplados a un feature, que importen de `_logic/services/` o usen tipos del feature.

#### Scenario: useDebounce vive en `_hooks/` global
- **WHEN** se inspecciona `app/_hooks/useDebounce.ts`
- **THEN** el archivo no importa de `app/(public)/` ni `app/(private)/` y puede ser usado por cualquier feature

#### Scenario: useLoginForm vive en `_logic/hooks/`
- **WHEN** se inspecciona `app/(public)/auth/_logic/hooks/useLoginForm.ts`
- **THEN** importa de `app/(public)/auth/_logic/services/login` y NO está bajo `app/_hooks/`

#### Scenario: Hook nuevo que importa de un service de feature
- **WHEN** un hook necesita llamar a un service de `_logic/services/`
- **THEN** SHALL colocarse en `_logic/hooks/` del mismo feature, NO en `app/_hooks/`

---

### Requirement: Componentes presentational sin lógica de red ni efectos secundarios
Los componentes `.tsx` bajo `app/_components/**` y `app/(public|private)/**/_blocks/**` SHALL ser presentational: NO MUST contener:

- llamadas a `fetch(`, `axios`, o cualquier cliente HTTP,
- accesos a `sessionStorage`, `localStorage`, `document`, `window`,
- llamadas a `useRouter().push()` o `useRouter().replace()`,
- lógica de validación más allá de inputs controlados con `useState`.

Esa lógica MUST vivir en `_logic/hooks/` o `_logic/services/` del feature, o en `_lib/` si es utilidad pura genérica.

#### Scenario: Bloque delega la red a un hook
- **WHEN** `LoginForm.tsx` necesita enviar credenciales al backend
- **THEN** el componente llama a `useLoginForm()` y delega el `fetch` al hook/service, sin invocar `fetch` directamente

#### Scenario: Bloque delega la navegación a un hook
- **WHEN** un bloque necesita redirigir tras una acción exitosa
- **THEN** la llamada a `router.replace()` ocurre dentro del hook que orquesta la acción, no en el componente

#### Scenario: Bloque delega el almacenamiento de tokens
- **WHEN** una acción requiere persistir el access token
- **THEN** el componente nunca lee/escribe `sessionStorage`; el hook lo hace tras recibir la respuesta del service

#### Scenario: Átomo no contiene `fetch` ni efectos secundarios
- **WHEN** se inspecciona cualquier archivo bajo `app/_components/atoms/**`
- **THEN** no aparece `fetch(`, `sessionStorage`, `localStorage`, `useRouter`, ni `useEffect` con efectos de red

---

### Requirement: Servicios HTTP por feature
Cada feature de UI que se comunique con la API SHALL tener archivos en `_logic/services/` que encapsulen las llamadas `fetch`, normalicen errores HTTP a clases tipadas del feature y sean testeables como funciones puras.

#### Scenario: Service expone funciones tipadas
- **WHEN** un hook llama a `login({ email, password })`
- **THEN** recibe `Promise<AuthResponse>` y nunca un objeto `Response` crudo de `fetch`

#### Scenario: Service traduce errores HTTP a errores tipados
- **WHEN** el endpoint responde 401
- **THEN** el service lanza `InvalidCredentialsError` (no devuelve un código numérico ni un string)

#### Scenario: Service permite inyección de fetch para testing
- **WHEN** un test llama al service pasando un `fetchImpl` mock
- **THEN** el service usa ese `fetchImpl` en lugar del global, sin tocar la red

#### Scenario: Service llama a la API versionada
- **WHEN** `login.ts` o `register.ts` envía una petición
- **THEN** el endpoint destino es `/api/v1/auth/login` o `/api/v1/auth/register`, no `/api/auth/...`

---

### Requirement: Hooks de orquestación por feature
Cada flujo interactivo del feature SHALL tener un hook en `_logic/hooks/` que componga estado, validación Zod, llamada al service y navegación, y exponga un API estable al componente.

#### Scenario: Hook expone un API consistente para formularios
- **WHEN** un componente consume `useLoginForm()` o `useRegisterForm()`
- **THEN** recibe al menos `{ values, errors, isSubmitting, formError, handleChange, handleBlur, handleSubmit }`

#### Scenario: Hook traduce errores del service a mensajes de UI
- **WHEN** el service lanza `InvalidCredentialsError`
- **THEN** el hook actualiza `formError` con "Credenciales inválidas" sin que el componente conozca la clase de error

#### Scenario: Hook usa Zod para validación en tiempo real
- **WHEN** el usuario abandona un campo (`handleBlur`)
- **THEN** el hook ejecuta `schema.safeParse(values)` y actualiza `errors[field]` con el mensaje del schema

---

### Requirement: API versionada bajo `app/api/v1/`
Los Route Handlers de Next.js SHALL vivir bajo `app/api/v1/`. El path `/api/auth/*` SHALL eliminarse en favor de `/api/v1/auth/*`. Cada feature backend visible SHALL tener su subcarpeta dentro de `v1/`. Incluye un endpoint `app/api/v1/health/route.ts` para health checks.

#### Scenario: Endpoint de login responde en v1
- **WHEN** un cliente envía `POST /api/v1/auth/login`
- **THEN** el route handler delega a `AuthController.login` desde `src/modules/auth/infrastructure/http/`

#### Scenario: Endpoint legacy /api/auth/* no existe
- **WHEN** un cliente envía cualquier petición a `/api/auth/*`
- **THEN** Next.js devuelve 404 (la carpeta `app/api/auth/` se eliminó)

#### Scenario: Endpoint de health responde
- **WHEN** un cliente envía `GET /api/v1/health`
- **THEN** la respuesta es 200 con `{ "status": "ok", "timestamp": "<ISO date>" }`

---

### Requirement: Utilidades globales en `app/_lib/`
El proyecto SHALL incluir un directorio `app/_lib/` con utilidades puras (sin React, sin fetch). Inicialmente: `cn.ts` (merge de clases tailwind con `clsx + tailwind-merge`), `formatters.ts` (formato de fechas y números), `validators.ts` (validadores genéricos `isEmail`, `isPhone`, `isUrl`).

#### Scenario: cn combina clases tailwind sin colisión
- **WHEN** se invoca `cn("px-2 px-4", condition && "bg-red-500")`
- **THEN** devuelve un string donde `px-4` sobrescribe a `px-2` (gracias a `tailwind-merge`)

#### Scenario: validators son funciones puras
- **WHEN** se invoca `isEmail("foo@bar.com")`
- **THEN** devuelve un booleano sin tocar `fetch` ni el DOM

---

### Requirement: Buenas prácticas de Next.js 14 App Router
Las páginas y componentes SHALL aplicar las convenciones de Next.js 14 App Router: Server Components por defecto, `"use client"` sólo en `_blocks/`, `next/font/google` para tipografías, `next/link` para navegación interna, `useRouter` de `next/navigation` para redirección imperativa, `Metadata` exportada por ruta y carpetas privadas con prefijo `_`.

#### Scenario: Páginas son Server Components
- **WHEN** se inspecciona cualquier `app/(public|private)/**/page.tsx`
- **THEN** no contiene la directiva `"use client"` en la cabecera

#### Scenario: Bloques son Client Components
- **WHEN** se inspecciona cualquier `app/(public|private)/**/_blocks/*.tsx`
- **THEN** contiene `"use client"` en la cabecera

#### Scenario: Redirección de usuario autenticado ocurre en el servidor
- **WHEN** un usuario con sesión válida solicita `/auth/login` o `/auth/register`
- **THEN** la página lee la cookie `refreshToken` con `cookies()` y llama `redirect("/")` desde el Server Component

#### Scenario: Navegación interna usa next/link
- **WHEN** un componente enlaza a otra ruta del panel (e.g., `/auth/register` desde el login)
- **THEN** usa `<Link href="/auth/register">` de `next/link`, nunca `<a href="/auth/register">`

#### Scenario: Redirección imperativa usa next/navigation
- **WHEN** un hook necesita redirigir tras un submit exitoso
- **THEN** importa `useRouter` desde `next/navigation` (no desde `next/router`) y llama `router.replace("/")`

#### Scenario: Cada página exporta su metadata
- **WHEN** se inspecciona una `page.tsx`
- **THEN** exporta `export const metadata: Metadata = { title: "..." }` propio de la ruta

#### Scenario: Fuentes cargadas con next/font
- **WHEN** se cargan las tipografías Inter y Poppins
- **THEN** se importan desde `next/font/google` y se exponen como variables CSS, sin `<link>` ni `@import` manuales

#### Scenario: Carpetas privadas usan prefijo `_`
- **WHEN** se inspecciona `app/`
- **THEN** las carpetas `_components`, `_hooks`, `_lib`, `_logic`, `_blocks` empiezan con `_` para que Next.js las trate como no enrutables

---

### Requirement: Infraestructura de tests unitarios de UI
El proyecto SHALL tener Jest configurado con la opción `projects`: un proyecto `backend` con `testEnvironment: "node"` para `tests/unit/modules/**` y `tests/integration/**`, y un proyecto `ui` con `testEnvironment: "jsdom"` para `tests/unit/ui/**`. SHALL incluir React Testing Library, `@testing-library/jest-dom` y `@testing-library/user-event` como devDependencies.

#### Scenario: Tests de UI corren con jsdom
- **WHEN** se ejecuta `npm test`
- **THEN** los tests bajo `tests/unit/ui/**` corren con `testEnvironment: "jsdom"` y los tests existentes en `tests/unit/modules/**` siguen corriendo con `testEnvironment: "node"`

#### Scenario: Matchers de jest-dom disponibles
- **WHEN** un test de UI usa `expect(element).toBeInTheDocument()`
- **THEN** el matcher está disponible porque `jest.setup.ts` importa `@testing-library/jest-dom`

#### Scenario: Alias `@/*` resuelve en ambos projects
- **WHEN** un test importa `@/modules/auth/...`
- **THEN** resuelve a `src/modules/auth/...` tanto en el proyecto `backend` como en `ui`

---

### Requirement: Snapshot tests para componentes presentational
Cada componente presentational en `app/_components/**` y `app/(public|private)/**/_blocks/**` SHALL tener al menos un snapshot test que cubra su estado por defecto y sus estados visuales relevantes (error, loading, disabled).

#### Scenario: Cambio no intencional en estructura del componente
- **WHEN** un desarrollador modifica el JSX de `Button.tsx` sin actualizar el snapshot
- **THEN** `npm test` falla y exige actualizar el snapshot con `jest -u` y justificar el cambio en el PR

#### Scenario: Componente con prop loading tiene snapshot dedicado
- **WHEN** existe `tests/unit/ui/_components/atoms/Button.test.tsx`
- **THEN** incluye snapshots separados para el estado por defecto y para `loading={true}`

#### Scenario: Bloques se snapshotean con hooks mockeados
- **WHEN** existe `tests/unit/ui/(public)/auth/_blocks/LoginForm.test.tsx`
- **THEN** mockea `useLoginForm` para inyectar estado controlado y genera snapshots para el estado inicial y para `formError = "Credenciales inválidas"`

---

### Requirement: Material Symbols Outlined como icon set del panel
El panel privado SHALL usar **Material Symbols Outlined** (Google Fonts) como sistema de iconografía. La hoja de estilos `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap` SHALL cargarse desde el layout privado (`app/(private)/layout.tsx`) vía el componente cliente `<MaterialSymbolsLoader />` (inyección dinámica con `useEffect`) y NO desde el layout público para no penalizar `/auth/*`. Existe un átomo `app/_components/atoms/Icon/Icon.tsx` que envuelve `<span className="material-symbols-outlined">{name}</span>` con tipado de la prop `name`.

#### Scenario: Iconos renderizan con la fuente correcta en el panel
- **WHEN** un componente bajo `app/(private)/**` renderiza `<Icon name="dashboard" />`
- **THEN** el navegador muestra el glifo `dashboard` de Material Symbols Outlined con `font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24`

#### Scenario: La hoja de estilos no se carga en /auth
- **WHEN** un usuario visita `/auth/login`
- **THEN** el HTML resultante no incluye el `<link>` de Material Symbols (la carga vive solo en `app/(private)/layout.tsx`)

#### Scenario: Tipado de nombres de iconos
- **WHEN** un desarrollador escribe `<Icon name="..." />` con un valor que no está en la lista permitida
- **THEN** TypeScript reporta error de tipo en tiempo de compilación

---

### Requirement: Átomos y moléculas reutilizables del design system Material 3
El scaffold SHALL exponer los siguientes componentes presentational adicionales bajo `app/_components/`, todos sin lógica de fetch ni navigation:

- **Atoms**: `IconButton`, `Avatar`, `Chip`, `Icon`.
- **Molecules**: `Card`, `StatCard`, `SearchInput`.

#### Scenario: IconButton átomo
- **WHEN** se inspecciona `app/_components/atoms/IconButton/IconButton.tsx`
- **THEN** acepta `icon: IconName`, `ariaLabel: string`, `onClick?`, `variant?: "filled" | "tonal" | "ghost"` y NO contiene lógica de red

#### Scenario: Avatar átomo
- **WHEN** se inspecciona `app/_components/atoms/Avatar/Avatar.tsx`
- **THEN** acepta `src?: string`, `alt: string`, `size?: "sm" | "md" | "lg"`, `fallbackInitials?: string` y muestra iniciales cuando `src` falta

#### Scenario: Chip átomo
- **WHEN** se inspecciona `app/_components/atoms/Chip/Chip.tsx`
- **THEN** acepta `label`, `tone?: "primary" | "success" | "warning" | "error"`, `icon?: IconName` y se renderiza con `rounded-full`

#### Scenario: Card molécula
- **WHEN** se inspecciona `app/_components/molecules/Card/Card.tsx`
- **THEN** envuelve `children` con `bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm` y acepta `tone?: "default" | "primary"` (variante con fondo `bg-primary text-on-primary`)

#### Scenario: StatCard molécula
- **WHEN** se inspecciona `app/_components/molecules/StatCard/StatCard.tsx`
- **THEN** acepta `label: string`, `value: string`, `trend?: { delta: string; direction: "up" | "down" }`, `icon?: IconName` y los compone visualmente alineado al diseño de Stitch (`text-display-lg` para el valor, chip con flecha para el trend)

#### Scenario: SearchInput molécula
- **WHEN** se inspecciona `app/_components/molecules/SearchInput/SearchInput.tsx`
- **THEN** muestra `<Icon name="search" />` + `<input>` redondeado `rounded-full` con `bg-surface-container-high`, acepta `placeholder` y `value` controlado, y NO hace submit ni fetch
